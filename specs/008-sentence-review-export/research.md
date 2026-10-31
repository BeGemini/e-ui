# Research: 练习句子记录、回顾页与导出

**Feature**: `008-sentence-review-export` | **Date**: 2026-10-31

Technical Context 中没有遗留 NEEDS CLARIFICATION。下面的结论基于对现有代码的阅读和对候选库的调研：

- 代码：`app/api/practice/[exerciseId]/save-progress/route.ts`、`app/api/practice/[exerciseId]/check/route.ts`、`app/api/practice/[exerciseId]/route.ts`、`app/api/exercises/[exerciseId]/progress/route.ts`、`app/dashboard/[exerciseId]/practice/page.tsx`、`app/dashboard/[exerciseId]/page.tsx`、`lib/db.ts`、`lib/summary.ts`、`lib/types.ts`、`migrations/001_initial_schema.sql`、`scripts/migrate.ts`、`scripts/deploy.sh`、`components.json`、`components/ui/*`
- 文档：`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`、`page.md`，`02-guides/lazy-loading.md`

## 现状梳理（代码事实）

- **作答表** `UserDictationAttempt`：`attemptId` 是 PK，`progressId` 是 FK（`ON DELETE CASCADE`），另有 `sentenceIndex`、`userInput`、`correctAnswer`、`accuracy`、`wordFeedback JSON` 和 `attemptDate`。表上只有 `INDEX idx_progress (progressId)`，**没有唯一约束**。
- **进度表** `UserExerciseProgress`：已有 `UNIQUE INDEX idx_user_exercise (userId, exerciseId)`，`exerciseId` FK 也是 `ON DELETE CASCADE`。所以删除练习时，进度和作答会级联删除。
- **save-progress**：找不到进度时会创建进度行。之后**每次都 `INSERT`** 一条作答，把 `currentSentenceIndex` 设为 `sentenceIndex + 1`；如果 `isCompleted`，还会用该进度下的**全部**作答计算平均准确率（排除 `skippedSentences`）。同一句多次提交会产生重复行，平均值也会被重复行带偏。`lib/summary.ts#calculateExerciseSummary` 的计算方式相同。
- **check**：服务端从 COS 拉取字幕，套用用户的合并/跳过配置（`omitSkipped: true`），再用 `checkAccuracy` 计算准确率。代码里明确写着"NOT saving to database here"。返回值包含 `correctText`、`accuracy`、`wordFeedback`。
- **句序号**：`GET /api/practice/[id]` 返回的 `subtitles[i].index === i`，是“有效句子”的下标。check 和 save-progress 用的 `sentenceIndex` 也是这个下标。
- **练习页**：`handleCheckAccuracy` 只 POST `/check`，然后 `setCurrentFeedback`。`saveProgress(sentenceIndex, accuracy)` 会 POST `/save-progress`，提交 `userInput.trim()`、`currentSubtitle.text` 和 `currentFeedback?.wordFeedback`，成功后调用 `advanceToNextSentence`。`handleSkip` 和播放器的“下一句”（`handleSentenceEnd(..., 'skip')`）都走 `saveProgress(index, 0)`。
- **迁移机制**：`npm run db:migrate`（`scripts/migrate.ts`）按文件名顺序执行 `migrations/*.sql`，使用 `multipleStatements: true`，并在 `__migrations` 表里记录已执行文件。它会忽略 `ER_DUP_KEYNAME` 等“已执行过”的错误。`scripts/deploy.sh` 第 39 行在部署时会自动执行 `npm run db:migrate`。`initializeDatabase()` 只负责建立连接池，**不建表、不迁移**。
- **UI 组件**：`components.json` 中 style 为 `base-nova`，组件基于 `@base-ui/react`。`components/ui/` 下目前**没有** `switch`、`dropdown-menu`，但 `node_modules/@base-ui/react` 已提供 `switch` 和 `menu` 原语，可以用 `npx shadcn@latest add switch dropdown-menu` 生成。
- **Next.js 16.3 约定**：Route Handler 的第二个参数是 `{ params: Promise<{...}> }`，需要 `await params`（现有路由已经这样写）。客户端页面继续用 `useParams()`，与现有 dashboard 页面一致。按需加载外部库时用动态 `import()`（lazy-loading 指南）。
- **认证方式**：客户端页面从 `localStorage.token` 读取 token，请求时带 `Authorization: Bearer`。服务端用 `verifySessionFromRequest`。没有 token 时 `router.push('/')`。

## R1. 每句唯一：数据库唯一约束 + upsert

- **Decision**：
  1. 新增迁移 `migrations/005_unique_dictation_attempt.sql`：先做一次去重，每个 `(progressId, sentenceIndex)` 只保留 `attemptDate` 最新的一行；如果时间相同，保留 `attemptId` 较大的一行。然后加 `UNIQUE INDEX uq_progress_sentence (progressId, sentenceIndex)`。
  2. 所有写作答的地方（save-progress 和新的 save-attempt）统一调用 `lib/dictation-attempts.ts#upsertAttempt`，SQL 为 `INSERT ... ON DUPLICATE KEY UPDATE userInput=VALUES(userInput), correctAnswer=VALUES(correctAnswer), accuracy=VALUES(accuracy), wordFeedback=VALUES(wordFeedback), attemptDate=NOW()`。更新时保留原有 `attemptId`。
- **Rationale**：唯一约束由数据库保证 FR-002，并发请求也不会产生重复。upsert 只需要一条语句，不用先查再写，也就没有竞态。去重后，现有的平均准确率计算（save-progress 中的 `calculateOverallAccuracy` 和 `lib/summary.ts`）**不改代码**就能自动满足 FR-004a。`VALUES()` 在 MySQL 5.7 和 8.x 中都能用；8.0.20+ 只会给出弃用警告，不影响执行。这里不用 8.0.19+ 才支持的行别名写法，避免依赖未知的线上版本。
- **去重 SQL（自连接多表 DELETE，MySQL 允许对同一张表这样写，不会触发 1093 错误）**：

  ```sql
  DELETE older FROM UserDictationAttempt older
  JOIN UserDictationAttempt newer
    ON older.progressId = newer.progressId
   AND older.sentenceIndex = newer.sentenceIndex
   AND (older.attemptDate < newer.attemptDate
        OR (older.attemptDate = newer.attemptDate AND older.attemptId < newer.attemptId));
  ```

- **可重复执行**：迁移只会执行一次（有 `__migrations` 记录）。即使重跑，DELETE 也是幂等的，`ADD UNIQUE INDEX` 遇到 `ER_DUP_KEYNAME` 会被迁移脚本忽略。
- **部署顺序容错**：如果新代码先上线、迁移后执行，upsert 在没有唯一键时会退化成普通 INSERT，不会报错，只是暂时还会产生重复，等迁移执行后会被清理。正常部署流程（`deploy.sh` 先 migrate）不会出现这种情况。
- **Alternatives considered**：
  - 应用层“先 SELECT 再 UPDATE/INSERT”：存在并发竞态，需要两次往返。拒绝。
  - 用 `REPLACE INTO`：它会先删除再插入，`attemptId` 会变化；遇到其他外键时还可能级联删除。拒绝。
  - 保留历史、读取时取最新：不符合“每句只存一份”的用户要求，平均值计算也要全部改写。拒绝。
  - 把去重放进 `initializeDatabase()`：这个函数只负责连接，项目的惯例是 SQL 迁移文件。拒绝。

## R2. “Check”保存：新增独立接口 `save-attempt`，客户端在评分成功后串行调用

- **Decision**：新增 `POST /api/practice/[exerciseId]/save-attempt`，只做两件事：如果没有进度就创建进度，然后 upsert 该句作答。它**不修改** `currentSentenceIndex`、`isCompleted`、`overallAccuracy`。练习页在 `/check` 返回 ok 后发起这个请求（请求体就是 check 的返回值加上 `userInput`）。这个请求**不阻塞**反馈显示；失败时只显示一条轻量 toast。
- **串行化**：练习页用 `saveChainRef: useRef<Promise<void>>` 把每次保存串起来（`ref.current = ref.current.then(doSave)`）。`saveProgress` 在发请求前先 `await saveChainRef.current`。这样多次快速点击 Check，或者 Check 后马上点 Next Sentence 时，服务端的写入顺序与用户操作顺序一致，“以最后一次为准”。
- **Rationale**：
  - 用户的更新原话是“只是给检查加一个保存的接口”，这里直接对应。
  - check 接口保持“只评分”的职责，不改动它的契约，现有调用方和测试都不受影响。
  - 只有评分成功后才会调用，所以天然满足 FR-004。保存失败也不影响反馈显示，符合边界情况“记录保存失败但评分成功”。
  - 反馈先显示，保存在后台进行，所以 Check 的感知延迟不变（SC-002）。
  - 请求体的可信度与现有 save-progress 相同（客户端回传 `correctText` 和 `accuracy`）。这是个人学习数据，不需要额外的防篡改设计（章程 VI）。
- **Alternatives considered**：
  - 给 `/check` 加 `save: true` 参数，在服务端评分后直接写入：只需一次往返，数据也更可信。但会让 check 同时承担读和写的职责，check 的错误处理也要区分“评分失败”和“保存失败”。另外，这不符合用户“加一个保存的接口”的表述。备选方案，不采用。
  - 复用 save-progress 并加 `advance: false`：save-progress 已经有“前进”和“完成”两个分支，再加开关会更难读。拒绝。
  - 等保存成功后再显示反馈：会增加 Check 的延迟，违反 SC-002。拒绝。

## R3. Next Sentence / Skip 覆盖：save-progress 只把 INSERT 换成 upsert

- **Decision**：save-progress 的请求、响应和前进/完成逻辑都**保持不变**，只把写作答的语句换成 `upsertAttempt`，同时把“获取或创建进度”提取到 `getOrCreateProgress`。`getOrCreateProgress` 使用 `INSERT ... ON DUPLICATE KEY UPDATE progressId = progressId` 后再 SELECT，借助已有的 `UNIQUE(userId, exerciseId)` 避免并发首存时创建两行进度。
- **Rationale**：这是满足 FR-003 的最小改动。“以点 Next Sentence 时的内容覆盖”与现有行为一致：仍然提交当前的 `userInput`。
- **已知现状（不在本期修改）**：如果 Check 后又修改了输入再点 Next Sentence，提交的 `accuracy` 和 `wordFeedback` 仍是上一次 Check 的结果。spec 只要求内容以 Next Sentence 时为准，回顾页和导出也不显示准确率，所以本期不改。已记录在 plan 的风险中。

## R4. “我的句子”数据接口：`GET /api/practice/[exerciseId]/sentences`

- **Decision**：新增只读接口，返回 `{ exercise: { exerciseId, title }, sentences: MySentence[] }`。`sentences` 按 `sentenceIndex ASC` 排序，每条包含 `sentenceIndex`、`userInput`、`correctAnswer`（原文快照）和 `savedAt`。练习不存在时返回 404；没有进度时返回空数组。查询条件是 `progress.userId = session.userId`，满足 FR-007。
- **Rationale**：一次请求就能拿到标题和全部句子，满足 SC-003（200 句 < 2s，数据量约几十 KB）。原文快照随数据一起返回，开关只在客户端切换，满足 SC-004。用作答表中的 `correctAnswer` 作为原文快照，可以应对字幕配置或字幕文件后来被修改的情况。
- **Alternatives considered**：
  - 复用 `GET /api/exercises/[id]/progress`：它只返回最近 10 条，而且按时间倒序。改它会影响现有调用方。拒绝。
  - 页面实时拉取字幕作为原文：字幕配置一变就会对不上，与 spec 的“原文快照”假设相违背。拒绝。
  - 分页：200 句以内一次返回已经足够，分页会增加复杂度（章程 VI）。拒绝。

## R5. 页面与组件：shadcn Switch + DropdownMenu

- **Decision**：
  - 新页面 `app/dashboard/[exerciseId]/sentences/page.tsx`，写法与其他 dashboard 页一致：`'use client'`、`useParams`，用 `localStorage` 中的 token 发起请求。
  - 用 `npx shadcn@latest add switch dropdown-menu` 生成 `components/ui/switch.tsx` 和 `components/ui/dropdown-menu.tsx`（base-nova / `@base-ui/react`）。
  - 业务组件放在 `app/components/sentences/`：`SentenceList.tsx` 和 `ExportMenu.tsx`。
  - 原文块背景色固定为 **`#E8F5E9`**（很浅的绿色），文字用 `text-gray-800`（#1F2937），对比度约 13:1，满足 WCAG AA。页面通过 Tailwind 任意值 `bg-[#E8F5E9]` 使用这个颜色；导出时引用 `lib/sentence-export` 中的常量 `ORIGINAL_BG_HEX = 'E8F5E9'`。两处需要保持一致，代码里加注释说明。
  - 开关使用 `<Switch id="show-original">` 和 `<Label htmlFor="show-original">Show original</Label>`。Base UI Switch 输出 `role="switch"` 和 `aria-checked`，读屏会读出名称和开/关状态（FR-017）。
  - 导出使用 `DropdownMenu`，触发按钮文字为 `Export`，菜单项为 `Word (.docx)` 和 `PDF`。Base UI Menu 内置方向键、回车和 Esc 的键盘支持。导出进行中时触发按钮显示 `disabled`、`aria-busy` 和 “Exporting…”。
- **入口**：练习详情页 `app/dashboard/[exerciseId]/page.tsx` 在现有按钮组中新增 “My Sentences” 按钮；练习页头部 “Back” 按钮旁新增 “My Sentences” 按钮（`variant="outline"`）。两个入口都用 `router.push('/dashboard/{id}/sentences')`，详情页到目标页只需 1 次点击（SC-003）。
- **Rationale**：符合章程 I（只用 shadcn），开关和菜单的可访问性由 Base UI 原语提供。
- **Alternatives considered**：用 `Checkbox` 代替 Switch，与用户明确要求的 switch 不符；用两个并排按钮代替下拉菜单，与 spec 中“点击导出 → 出现两个选项”不符。均拒绝。

## R6. DOCX 生成：`docx`（v9）在浏览器端生成

- **Decision**：新增依赖 `docx@^9.15.0`。在 `lib/sentence-export/build-docx.ts` 中构建 `Document`：
  - 标题使用 `HeadingLevel.TITLE`；
  - 导出日期单独一段；
  - 每句由两部分组成：句号标签 `Sentence N` 加粗，后面是学习者内容；内容为空时显示斜体 `(Skipped)`；
  - 开关打开时，在学习者内容下方追加原文段落，设置 `shading: { type: ShadingType.CLEAR, fill: 'E8F5E9', color: 'auto' }`。
  - 字体设置为 `font: { ascii: 'Calibri', hAnsi: 'Calibri', eastAsia: 'Microsoft YaHei' }`，保证 Word、WPS 和 LibreOffice 中的中英文都能正常显示。
  - 最后用 `Packer.toBlob(doc)` 得到文件。

  导出时通过 `await import('docx')` 按需加载。
- **Rationale**：`docx` 是 TS 原生库，浏览器和 Node 都能用，零运行时依赖。段落底纹（shading）就是 Word 中的“段落背景色”，可以准确实现 FR-013 的浅绿色背景。DOCX 只保存 Unicode 文本，字体由阅读软件渲染，标点和中文不会出现乱码（FR-016），分页由 Word 自动处理。
- **Alternatives considered**：
  - `html-docx-js` 和 altChunk 方案：生成的是 MHT 包装，部分阅读器打不开，库也已停止维护。拒绝。
  - 服务端生成：没有必要，而且会增加服务器负载。拒绝。

## R7. PDF 生成：`@react-pdf/renderer`（v4）在浏览器端生成 + 打包 Noto 字体

- **Decision**：新增依赖 `@react-pdf/renderer@^4.9.0`（peer 依赖支持 React 19）。在 `lib/sentence-export/build-pdf.tsx` 中用 `<Document><Page size="A4" wrap>` 描述文档：
  - 原文块是 `<View style={{ backgroundColor: '#E8F5E9', padding }}>`；
  - 长文本由 `<Text>` 自动换行，页面自动分页（FR-016、spec 中“数百句”的边界情况）；
  - 句块设置 `wrap={false}`，避免同一句的“我的句子”和原文被拆到两页。听写句子通常只有一两行；如果实际出现单句超过一页的极端情况，实现时对该句改回可拆分（即不设 `wrap={false}`）；
  - 最后用 `pdf(<Doc/>).toBlob()` 得到文件，整个模块通过 `await import(...)` 按需加载。
- **字体策略（关键）**：
  - PDF 内置的 Helvetica 只支持 WinAnsi 字符集，中文和许多 Unicode 标点会缺字，所以必须嵌入 TTF。react-pdf v4 **不支持 fontFamily 数组自动回退**（上游 issue #933 仍未解决）。
  - 采用“整份文档选一个字体”的策略：
    - 默认使用 **Noto Sans**（Regular/Bold，约 0.5 MB/个）。它覆盖拉丁扩展、希腊文、西里尔文和常用标点（弯引号 ’ “ ”、破折号 – —、省略号 …）。
    - 如果标题或任意句子中包含 CJK 字符或全角标点（正则 `/[\u3000-\u303F\u3400-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/`），整份文档改用 **Noto Sans SC**（Regular/Bold，单个约 10 MB）。它同样覆盖拉丁字母和标点。
  - 字体文件放在 `public/fonts/`（SIL OFL 1.1，可以随项目分发，许可证文件 `OFL.txt` 一并放入），由浏览器按 URL 拉取并缓存。react-pdf 只会把实际用到的字形子集嵌入 PDF，所以文件体积很小。
  - 调用 `Font.registerHyphenationCallback((word) => [word])`，禁止英文单词被自动断字加连字符，保证输出与原文一致。
- **Rationale**：
  - 声明式布局可以直接实现背景块、自动换行和分页，不需要手写坐标计算。
  - 纯客户端生成，不新增服务端进程，符合章程 III 和 VI。
  - 听写内容以英文为主，大多数导出只加载 0.5 MB 字体，10 秒内完成（SC-005）。只有含中文时才需要首次加载约 10 MB 的字体，之后会被缓存。
- **Alternatives considered**：
  - `jspdf`：可以嵌入 TTF，但 CJK 需要整字体 base64，不支持子集；还要手动处理换行（`splitTextToSize`）、分页和背景矩形，代码量大，对中文的折行支持也差。拒绝。
  - `pdf-lib` + `@pdf-lib/fontkit`：支持子集嵌入，但没有排版引擎，换行、分页和背景都要手写。拒绝。
  - 服务端 Puppeteer/Chromium 把 HTML 转成 PDF：渲染效果最好，但部署（PM2 单机）要额外安装 Chromium，内存占用高，冷启动慢，违反章程 VI。拒绝。
  - 调用 `window.print()` 让用户“另存为 PDF”：无法“直接下载文件”（FR-012），而且依赖用户的操作。拒绝。
  - 一律使用 Noto Sans SC：每次首次导出都要下载约 10 MB 字体，英文场景没有必要。拒绝。

## R8. 文件名、日期与下载

- **Decision**：`lib/sentence-export/filename.ts#buildExportFilename(title, ext, now)` 生成 `<标题>-我的句子-YYYY-MM-DD.<ext>`，与 spec FR-014 的示例完全一致，日期取用户本地时区。标题会经过清洗：去掉 `\ / : * ? " < > |` 和控制字符，合并空白，去掉首尾的点和空格，截断到 80 个字符；如果清洗后为空，回退为 `exercise`。下载通过 `URL.createObjectURL(blob)` 加上临时 `<a download>` 触发，之后 `revokeObjectURL`。这个 `<a>` 只用于触发下载，不是页面 UI 元素。
- **Rationale**：只用浏览器原生 API 即可，不需要引入 `file-saver`（章程 VI）。文件名清洗逻辑是纯函数，方便单元测试。
- **导出文档文案**：与界面一致使用英文，包括 `My Sentences`、`Exported on YYYY-MM-DD`、`Sentence N`、`(Skipped)`、`Original`。只有文件名按 spec 示例使用“我的句子”。

## R9. 测试策略

- **Decision**：
  - **单元测试（Jest）**：
    - `tests/unit/sentence-export.test.ts`：
      - 覆盖文件名清洗和日期格式；
      - 覆盖 CJK 检测（决定使用哪种字体）；
      - 在 jsdom 环境下验证 `buildDocx` 返回非空 Blob；需要解压验证内容的用例使用 `Packer.toBuffer`，并在文件内用 `@jest-environment node` 切换环境。
  - **集成测试**：新增 `tests/integration/sentence-records.test.ts`，沿用现有写法，对 `TEST_BASE_URL` 发起 fetch：
    - 连续两次调用 save-attempt，再调用一次 save-progress 后，GET sentences 返回该句**仅 1 条**，内容为最后一次保存的值；
    - save-attempt 不改变 `currentSentenceIndex`；
    - 其他用户看不到这些记录。
  - **手动测试**：按 `quickstart.md` 验证页面、开关、导出文件的打开效果，以及键盘和读屏操作。
  - 不新增 e2e 测试（章程 VI）。
- **Rationale**：只覆盖关键业务逻辑（唯一性、不前进、隔离）和纯函数，与 001–007 的测试力度保持一致。
