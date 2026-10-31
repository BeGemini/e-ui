---
description: "Task list for 008 — 练习句子记录、回顾页与导出"
---

# Tasks: 练习句子记录、回顾页与导出（Sentence Review & Export）

**Input**: Design documents from `/specs/008-sentence-review-export/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/practice-attempt-api.md, contracts/sentences-api.md, contracts/sentences-page-and-export.md, quickstart.md

**Tests**: spec 没有要求 TDD。只保留 plan.md（Testing）和 research R9 列出的两项测试：

- 单元测试 `tests/unit/sentence-export.test.ts`：文件名生成、CJK 检测、DOCX 生成；
- 集成测试 `tests/integration/sentence-records.test.ts`：对 `TEST_BASE_URL` 发 fetch，覆盖每句唯一、Check 不前进、用户隔离。

其余按 quickstart.md 手动验证。不新增 e2e 测试（章程 VI）。

**Organization**: 按用户故事分组。US1、US2 都是 P1，US1 是数据来源，排在前面；US3 是 P2；US4 是 P3。

**已接受的 plan 决策**（实现时不要再改）：

- 不新建表，复用 `UserDictationAttempt`；迁移 005 先去重再加 `UNIQUE(progressId, sentenceIndex)`。
- 所有写作答统一走 `lib/dictation-attempts.ts#upsertAttempt`（`INSERT ... ON DUPLICATE KEY UPDATE`，用 `VALUES()` 写法，更新时保留原 `attemptId`、刷新 `attemptDate = NOW()`）。
- `/check` 接口**不改**；Check 保存走新接口 `save-attempt`，在后台串行执行，不阻塞反馈显示。
- `save-progress` 的请求、响应、状态码（201）、前进/完成逻辑全部不变，只把 INSERT 换成 upsert。
- 导出完全在浏览器端完成，`docx` 和 `@react-pdf/renderer` 只在点击导出时动态 `import()`。
- 不做分页、删除/编辑记录、开关状态持久化、服务端 PDF、`file-saver`。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（文件不同，且不依赖未完成的任务）
- **[Story]**: 所属用户故事（US1–US4）

## Path Conventions

单一 Next.js App Router 项目，所有路径相对仓库根目录（`/Users/mike/Development/e-ui`）。本功能涉及的文件：

- 新增：`migrations/005_unique_dictation_attempt.sql`、`lib/dictation-attempts.ts`、`lib/sentence-export/index.ts`、`lib/sentence-export/build-docx.ts`、`lib/sentence-export/build-pdf.tsx`、`app/api/practice/[exerciseId]/save-attempt/route.ts`、`app/api/practice/[exerciseId]/sentences/route.ts`、`app/dashboard/[exerciseId]/sentences/page.tsx`、`app/components/sentences/SentenceList.tsx`、`app/components/sentences/ExportMenu.tsx`、`components/ui/switch.tsx`、`components/ui/dropdown-menu.tsx`、`public/fonts/*`、`tests/unit/sentence-export.test.ts`、`tests/integration/sentence-records.test.ts`
- 修改：`app/api/practice/[exerciseId]/save-progress/route.ts`、`app/dashboard/[exerciseId]/practice/page.tsx`、`app/dashboard/[exerciseId]/page.tsx`、`lib/types.ts`、`package.json`（及 `package-lock.json`）；仅在构建验证失败时修改 `next.config.ts`

---

## Phase 1: Setup（共享基础设施）

**Purpose**: 安装依赖、生成 shadcn 组件、放置字体，并**尽早**验证 `@react-pdf/renderer` 能在 Next 16（Turbopack）下通过 `next build`（plan 风险 4）

- [X] T001 运行 `npm install docx@^9.15.0 @react-pdf/renderer@^4.9.0`，确认两者写入 package.json 的 `dependencies`（不是 devDependencies）并更新 package-lock.json；确认安装时没有 React 19 peer 依赖报错，然后 `npm run type-check` 通过
- [X] T002 [P] 运行 `npx shadcn@latest add switch dropdown-menu`，生成 components/ui/switch.tsx 与 components/ui/dropdown-menu.tsx（components.json 的 style 为 `base-nova`，应基于 `@base-ui/react` 的 `switch` / `menu` 原语）。不要手改生成的代码；确认 `npm run type-check` 与 `npm run lint` 通过，且没有覆盖已有 components/ui/* 文件
- [X] T003 （部分完成：只有 NotoSans-Regular/Bold；NotoSansSC 与 OFL.txt 下载失败，暂不支持 PDF 中文）[P] 在 public/fonts/ 下放入 SIL OFL 1.1 字体：`NotoSans-Regular.ttf`、`NotoSans-Bold.ttf`、`NotoSansSC-Regular.ttf`、`NotoSansSC-Bold.ttf`，以及许可证文件 `OFL.txt`（来源：Google Fonts / notofonts 官方发布的静态 TTF，不要用可变字体 `*[wght].ttf`）。记录各文件大小；若 NotoSansSC 单文件 > 10 MB，在本任务备注中说明并与维护者确认是否接受入库（或改用 Git LFS），见 plan 风险 3
- [X] T004 新建 lib/sentence-export/build-pdf.tsx 的**最小骨架**（依赖 T001）：这是普通模块，不加 `'use client'`，只会被客户端组件动态 import；`import { Document, Page, Text, pdf } from '@react-pdf/renderer'`，导出 `export async function build(input: { title: string }): Promise<Blob>`，渲染一页 A4、只含标题文字的文档并 `return pdf(<Doc />).toBlob()`。完整实现留给 T029
- [X] T005 验证 react-pdf 打包（依赖 T004）：
  - 新建**临时** spike 页面 app/dev-react-pdf-spike/page.tsx（`'use client'`），放一个 shadcn `Button`，点击时执行 `const mod = await import('@/lib/sentence-export/build-pdf'); const blob = await mod.build({ title: 'Spike' });` 并 `console.log(blob.size)`。
  - 运行 `npm run build`，必须成功；再 `npm run dev` 打开 `/dev-react-pdf-spike` 点击按钮，确认浏览器控制台打印出非 0 的 size。
  - 若 build 失败：先在 next.config.ts 加 `transpilePackages: ['@react-pdf/renderer']` 重试；仍失败则查阅 `node_modules/next/dist/docs/` 中关于 Turbopack / `serverExternalPackages` 的说明调整，直到通过。把最终采用的配置写进本任务备注。
  - 验证通过后**删除** app/dev-react-pdf-spike/ 整个目录，并再次 `npm run build` 确认通过。若 react-pdf 无法打包，STOP，回到 plan 重新评估 PDF 方案（research R7）

**Checkpoint**: 依赖、shadcn 组件、字体到位；`next build` 已被证明能打包 `@react-pdf/renderer`（动态 import）

---

## Phase 2: Foundational（阻塞所有用户故事）

**Purpose**: 数据库唯一约束与历史去重、共享类型、统一的作答写入函数

**⚠️ CRITICAL**: 本阶段完成前，不要开始任何用户故事

- [X] T006 [P] 新建 migrations/005_unique_dictation_attempt.sql，按顺序包含两条语句（contracts/practice-attempt-api.md §3、research R1）：
  1. 自连接去重：

     ```sql
     DELETE older FROM UserDictationAttempt older
     JOIN UserDictationAttempt newer
       ON older.progressId = newer.progressId
      AND older.sentenceIndex = newer.sentenceIndex
      AND (older.attemptDate < newer.attemptDate
           OR (older.attemptDate = newer.attemptDate AND older.attemptId < newer.attemptId));
     ```

  2. `ALTER TABLE UserDictationAttempt ADD UNIQUE INDEX uq_progress_sentence (progressId, sentenceIndex);`

  文件顶部加注释：本迁移会**不可逆地删除**历史重复作答，上线前先 `mysqldump` 备份 `UserDictationAttempt`。**不要**删除原有的 `idx_progress` 索引（被 FK 使用）。格式参照 migrations/004_add_progress_completion_fields.sql
- [X] T007 [P] 在 lib/types.ts 新增并导出 data-model.md §4 的三个类型：`SaveAttemptRequest`（`sentenceIndex`、`userInput`、`correctText`、`accuracy`、`wordFeedback?: WordFeedback[]`）、`MySentence`（`sentenceIndex`、`userInput`、`correctAnswer`、`savedAt: string`）、`MySentencesResponse`（`success: true`、`exercise: { exerciseId: string; title: string }`、`sentences: MySentence[]`）。复用文件中已有的 `WordFeedback`，不要用 `any`
- [X] T008 新建 lib/dictation-attempts.ts（依赖 T007），导出两个函数，只使用 `@/lib/db` 的 `execute`/`queryOne` 与 `uuid`：
  - `getOrCreateProgress(userId: string, exerciseId: string): Promise<UserExerciseProgress>`：执行 `INSERT INTO UserExerciseProgress (progressId, userId, exerciseId, currentSentenceIndex, isCompleted) VALUES (?, ?, ?, 0, 0) ON DUPLICATE KEY UPDATE progressId = progressId`（新 progressId 用 `uuidv4()`），再 `SELECT * ... WHERE userId = ? AND exerciseId = ?` 返回；查不到时抛出 Error。借助已有的 `UNIQUE(userId, exerciseId)` 保证并发首存只建一行（research R3）。
  - `upsertAttempt(params: { progressId: string; sentenceIndex: number; userInput: string; correctAnswer: string; accuracy: number; wordFeedback: WordFeedback[] }): Promise<void>`：执行

    ```sql
    INSERT INTO UserDictationAttempt (attemptId, progressId, sentenceIndex, userInput, correctAnswer, accuracy, wordFeedback, attemptDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE userInput = VALUES(userInput), correctAnswer = VALUES(correctAnswer),
      accuracy = VALUES(accuracy), wordFeedback = VALUES(wordFeedback), attemptDate = NOW()
    ```

    `wordFeedback` 用 `JSON.stringify`。`attemptId` 不出现在 UPDATE 子句中（覆盖时保持不变）。加注释说明 MySQL 8.0.20+ 对 `VALUES()` 只给弃用警告（plan 风险 7）。
- [ ] T009 （未执行：.env.local 指向远程数据库，需维护者备份后自行迁移）本地执行迁移并验证（依赖 T006）：先用 quickstart.md §0 的 `GROUP BY ... HAVING c > 1` 查询记录现有重复；运行 `npm run db:migrate`；再次执行同一查询应返回 0 行；`SHOW INDEX FROM UserDictationAttempt` 应看到 `uq_progress_sentence`；保留下来的应是每组 `attemptDate` 最新的一行。确认 `__migrations` 中已记录 `005_unique_dictation_attempt.sql`

**Checkpoint**: 数据库中每个 `(progressId, sentenceIndex)` 最多一行；`getOrCreateProgress` / `upsertAttempt` 可被路由调用；`npm run type-check` 通过

---

## Phase 3: User Story 1 - 每句只存一份作答，Check 与 Next Sentence 都会保存并覆盖 (Priority: P1) 🎯 MVP

**Goal**: Check 评分成功后在后台保存/覆盖该句作答，不前进；Next Sentence / Skip 覆盖已有记录、不报错、不新增；所有保存按用户操作顺序串行落库，以最后一次为准（FR-001 ~ FR-004b）

**Independent Test**: 在第 2 句输入 `hello world` → Check，改成 `hello word` → Ctrl+Enter，点 Next Sentence；用“上一句”回到第 2 句改成 `hello words` → Check → Next Sentence。数据库中该句只有 1 行，`userInput = 'hello words'`，全程无报错（quickstart.md §1）。集成测试 US1 部分通过

### Tests for User Story 1

- [X] T010 [P] [US1] 新建 tests/integration/sentence-records.test.ts，写法参照 tests/integration/practice-flow.test.ts（`@jest/globals`、`TEST_BASE_URL`、`fetch`）：
  - **beforeAll**：注册/登录两个账号 A、B（邮箱带 `Date.now()` 后缀避免冲突，邀请码沿用现有集成测试的方式），从 `GET /api/exercises` 取第一个练习的 `exerciseId`。
  - **US1 用例**（`describe('save-attempt & save-progress upsert')`）：
    - (a) A 对 `sentenceIndex: 1` 连续调用两次 `POST /api/practice/{id}/save-attempt`（userInput 分别为 `hello world`、`hello word`），再调用一次 `POST /save-progress`（userInput `hello words`）；然后 `GET /api/exercises/{id}/progress`，`attempts` 中 `sentenceIndex === 1` 的记录**恰好 1 条**，`userInput === 'hello words'`；save-progress 返回 201 且没有错误。
    - (b) save-attempt 不前进：先读取 `progress.currentSentenceIndex`，对一个更大的 `sentenceIndex`（如 5）调用 save-attempt，返回 200 且 body 含 `success: true`、`sentenceIndex: 5`、`savedAt`；再读取进度，`currentSentenceIndex` 与 `isCompleted` 不变。
    - (c) 校验：`userInput: '   '`、`sentenceIndex: -1`、`sentenceIndex: 1.5`、`accuracy: 101`、`correctText: ''`、`wordFeedback: 'x'` 都返回 400。
    - (d) 不存在的 exerciseId 返回 404；不带 Authorization 返回 401。

### Implementation for User Story 1

- [X] T011 [P] [US1] 新建 app/api/practice/[exerciseId]/save-attempt/route.ts（依赖 T008），按 contracts/practice-attempt-api.md §1 实现 `export async function POST(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> })`：
  1. `await initializeDatabase()`；`verifySessionFromRequest(request)` 失败返回 401 `{ error: 'Unauthorized: Authentication required' }`；
  2. `const { exerciseId } = await params`；解析 body 为 `SaveAttemptRequest`，按 data-model.md §4 校验（`Number.isInteger(sentenceIndex) && sentenceIndex >= 0`；`userInput` 是字符串且 `trim()` 非空；`correctText` 非空字符串；`accuracy` 是 0–100 的有限数字；`wordFeedback` 若提供必须是数组），失败返回 400 `{ error: 'Invalid request: <field>' }`，不写库；
  3. `SELECT exerciseId FROM Exercise WHERE exerciseId = ?`，查不到返回 404 `{ error: 'Exercise not found' }`；
  4. `getOrCreateProgress(session.userId, exerciseId)` → `upsertAttempt({ progressId, sentenceIndex, userInput: userInput.trim(), correctAnswer: correctText, accuracy, wordFeedback: wordFeedback ?? [] })`；
  5. **不执行**任何 `UPDATE UserExerciseProgress`；
  6. 返回 200 `{ success: true, sentenceIndex, savedAt: new Date().toISOString() }`；异常时 `console.error` 并返回 500 `{ error: 'Internal server error' }`
- [X] T012 [P] [US1] 修改 app/api/practice/[exerciseId]/save-progress/route.ts（依赖 T008；与 T011 不同文件）：
  - 把“查询进度 → 不存在则内联 INSERT → 再查询”的整段替换为 `let progress = await getOrCreateProgress(session.userId, exerciseId);`；
  - 把 “Create dictation attempt record” 的 `INSERT INTO UserDictationAttempt ...` 替换为 `await upsertAttempt({ progressId: progress.progressId, sentenceIndex, userInput: userInput ?? '', correctAnswer: correctText ?? '', accuracy, wordFeedback: wordFeedback ?? [] })`；
  - 把 `SaveProgressRequest.wordFeedback?: any[]` 改为 `WordFeedback[]`；删除不再使用的 `uuidv4` 等 import；
  - 请求体、响应体、201 状态码、`currentSentenceIndex = sentenceIndex + 1`、`isCompleted` 分支与 `calculateOverallAccuracy` **一律不改**（FR-003、FR-004a）
- [X] T013 [US1] 修改 app/dashboard/[exerciseId]/practice/page.tsx 的 Check 保存逻辑（依赖 T011）：
  - 新增 `const saveChainRef = useRef<Promise<void>>(Promise.resolve());`；
  - 新增 `enqueueSaveAttempt(payload: SaveAttemptRequest)`：`saveChainRef.current = saveChainRef.current.then(async () => { ... })`，内部 `fetch('/api/practice/${exerciseId}/save-attempt', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: Bearer <localStorage.token> }, body })`；`!response.ok` 或抛错时 `toast({ title: "Couldn't save your sentence", description: 'Your feedback is still shown. You can keep practicing.' })`（**非** destructive），并吞掉错误，保证链不会 reject；
  - 在 `handleCheckAccuracy` 中，`setCurrentFeedback(feedback)` **之后**调用 `enqueueSaveAttempt({ sentenceIndex: currentSubtitle.index, userInput: userInput.trim(), correctText: feedback.correctText ?? currentSubtitle.text, accuracy: feedback.accuracy, wordFeedback: feedback.wordFeedback })`，**不 await**（不阻塞反馈，SC-002）；`/check` 失败的 catch 分支里不调用保存（FR-004）；
  - 不改变 `currentSentenceIndex`、不调用 `advanceToNextSentence`（FR-001）
- [X] T014 [US1] 在 app/dashboard/[exerciseId]/practice/page.tsx 的 `saveProgress` 中（依赖 T013，同一文件），在 `setIsSavingProgress(true)` 之后、`fetch('/save-progress')` 之前加入 `await saveChainRef.current;`，并加一行注释：确保之前 Check 触发的保存已落库，Next/Skip 的写入一定是最后一次（contracts/practice-attempt-api.md §2、research R2）。不改动 save-progress 的请求体
- [ ] T015 [US1] 验证 US1：`npm run dev` 后运行 `TEST_BASE_URL=http://localhost:3000 npm run test:integration -- sentence-records`，US1 用例 (a)–(d) 通过；再手动走 quickstart.md §1 第 1–8 步（含：Check 后句子位置不变、Next 无报错 toast、没有进度行的练习首句直接 Check 后刷新仍在第 1 句、Offline 时 Check 失败不写库）

**Checkpoint**: 每句只有一条作答记录，Check / Next / Skip 都能覆盖保存；MVP 可演示（数据层完成）

---

## Phase 4: User Story 2 - 在“我的句子”页面回看全部句子并切换原文 (Priority: P1)

**Goal**: 新增 `/dashboard/{id}/sentences` 页面，按句序号升序列出当前用户的记录；“Show original” 开关默认关闭，打开后在每句正下方显示浅绿色（#E8F5E9）背景的原文快照；练习详情页与练习页都有入口（FR-005 ~ FR-011）

**Independent Test**: 对第 1、3、5 句保存过作答后，从练习详情页 1 次点击进入 “My Sentences”：按 Sentence 1、3、5 顺序显示；打开开关立即出现浅绿底原文，且 Network 面板无新请求；关闭后全部隐藏；账号 B 看到空状态（quickstart.md §2）

### Tests for User Story 2

- [X] T016 [US2] 在 tests/integration/sentence-records.test.ts 中新增 `describe('GET sentences')`（依赖 T010，同一文件）：
  - (e) A 对 `sentenceIndex` 4、0、2 依次调用 save-attempt，`GET /api/practice/{id}/sentences` 返回 200，`exercise.title` 非空，`sentences` 的 `sentenceIndex` 严格升序且无重复，每条都有 `correctAnswer` 与可被 `Date.parse` 解析的 `savedAt`；
  - (f) 用户隔离：B 调用同一接口返回 200 且 `sentences` 中没有 A 写入的内容（B 无记录时为 `[]`）；
  - (g) 不存在的 exerciseId 返回 404 `{ error: 'Exercise not found' }`；无 token 返回 401

### Implementation for User Story 2

- [X] T017 [US2] 在 lib/dictation-attempts.ts 新增 `listMySentences(userId: string, exerciseId: string): Promise<MySentence[]>`（依赖 T008，同一文件）：执行 contracts/sentences-api.md 第 3 步的 JOIN 查询（`WHERE p.userId = ? AND p.exerciseId = ? ORDER BY a.sentenceIndex ASC`），把 `attemptDate` 转成 ISO 字符串映射为 `savedAt`，`userInput`/`correctAnswer` 为 null 时回退为 `''`
- [X] T018 [US2] 新建 app/api/practice/[exerciseId]/sentences/route.ts（依赖 T017），实现 `GET(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> })`：`initializeDatabase()` → 认证失败 401 → `SELECT exerciseId, title FROM Exercise WHERE exerciseId = ?`，查不到 404 → `listMySentences(session.userId, exerciseId)` → 返回 200 `MySentencesResponse`（没有进度/记录时 `sentences: []`）；只用 `session.userId` 过滤，不接受任何 userId 参数（FR-007）；异常 500 `{ error: 'Internal server error' }`
- [X] T019 [P] [US2] 新建 app/components/sentences/SentenceList.tsx（依赖 T007，可与 T017/T018 并行）：props `{ sentences: MySentence[]; showOriginal: boolean }`；用 shadcn `Card`/`CardContent` 渲染列表，每条包含：
  - 标签 `Sentence {sentenceIndex + 1}`（`text-sm font-semibold text-gray-500`）；
  - 学习者内容（`whitespace-pre-wrap break-words`）；`userInput` 为空时显示斜体灰色 `(Skipped)`；
  - 仅当 `showOriginal` 为 true 时，在学习者内容**正下方**渲染 `<div className="mt-2 rounded-md bg-[#E8F5E9] px-3 py-2 text-gray-800 whitespace-pre-wrap break-words">Original: {correctAnswer}</div>`，并加注释：颜色必须与 `lib/sentence-export` 的 `ORIGINAL_BG_HEX` 保持一致（research R5）。
  - 用 `<ol>`/`<li>` 语义列表，`key` 用 `sentenceIndex`
- [X] T020 [US2] 新建 app/dashboard/[exerciseId]/sentences/page.tsx（依赖 T002、T018、T019）：`'use client'`，写法参照 app/dashboard/[exerciseId]/page.tsx：
  - `useParams()` 取 `exerciseId`；没有 `localStorage.token` 时 `router.push('/')`；
  - 状态：`data: MySentencesResponse | null`、`status: 'loading' | 'ready' | 'not-found' | 'error'`、`showOriginal`（默认 `false`，不持久化）（data-model.md §5）；
  - 进入时 `GET /api/practice/{id}/sentences` 一次：401 → `router.push('/')`；404 → 显示 “Exercise not found” + `Go Back` 按钮；其他错误 → 错误提示；
  - 头部：`<h1>{exercise.title}</h1>`、副标题 `My Sentences · {n} sentences`、右侧 `Button variant="outline"` **Back to exercise** → `router.push('/dashboard/{id}')`；
  - 工具栏：`<Switch id="show-original" checked={showOriginal} onCheckedChange={setShowOriginal} />` + `<Label htmlFor="show-original">Show original</Label>`；右侧为 US3 的导出按钮预留位置（本阶段不渲染）；
  - 有记录时渲染 `<SentenceList sentences={...} showOriginal={showOriginal} />`；无记录时渲染空状态 `Card`：`No sentences yet. Practice this exercise and your sentences will appear here.` 与 `Button` **Start practicing** → `/dashboard/{id}/practice`（FR-011）；
  - 只用 shadcn 组件（Card、Button、Switch、Label、Badge），桌面布局
- [X] T021 [P] [US2] 修改 app/dashboard/[exerciseId]/page.tsx：在 “Action Buttons” 按钮组（约第 210 行）中新增 `<Button variant="outline" onClick={() => router.push(\`/dashboard/${exerciseId}/sentences\`)}>`，内容为 lucide `NotebookText` 图标 + **My Sentences**（FR-010、SC-003）
- [X] T022 [P] [US2] 修改 app/dashboard/[exerciseId]/practice/page.tsx（依赖 T014，同一文件；与 T021 不同文件可并行）：在头部 “Back” 按钮（约第 336 行）**左侧**新增 `<Button variant="outline">` **My Sentences**（lucide `NotebookText`），`onClick` 为 `router.push(\`/dashboard/${exerciseId}/sentences\`)`
- [ ] T023 [US2] 验证 US2：运行 `TEST_BASE_URL=http://localhost:3000 npm run test:integration -- sentence-records`，(a)–(g) 全部通过；手动走 quickstart.md §2 第 1–6 步（入口 1 次点击、升序、`(Skipped)` 占位、开关默认关闭、切换无网络请求、B 账号隔离与空状态、不存在的 id、清除 token 跳转）

**Checkpoint**: US1 + US2 完成，两个 P1 故事可一起发布（回顾页可用，尚无导出）

---

## Phase 5: User Story 3 - 导出为 Word（.docx）或 PDF (Priority: P2)

**Goal**: 回顾页 “Export” 下拉菜单提供 `Word (.docx)` 与 `PDF`，按“所见即所导”在浏览器端生成并下载文件；导出中防重复点击，失败给出友好提示（FR-012 ~ FR-016）

**Independent Test**: 在有 ≥10 条记录的页面，开关关/开各导出一次 .docx 与 .pdf：文件名为 `<标题>-我的句子-YYYY-MM-DD.<ext>`，能被 Word/WPS/LibreOffice 与 Chrome/Preview 正常打开，内容与页面顺序一致，开关打开时原文带浅绿背景、关闭时不含原文（quickstart.md §3）。单元测试通过

### Tests for User Story 3

- [X] T024 [P] [US3] 新建 tests/unit/sentence-export.test.ts，文件顶部加 `/** @jest-environment node */`（docx 打包与 Blob 在 Node 环境下更可靠，research R9）：
  - `buildExportFilename`：`('S01E01 – Pilot', 'docx', new Date(2026, 9, 31))` → `'S01E01 – Pilot-我的句子-2026-10-31.docx'`；含 `\ / : * ? " < > |` 和控制字符的标题被清除；多余空白合并；首尾的点和空格被去掉；超过 80 字符被截断；清洗后为空时回退为 `exercise`；月/日补零；
  - `containsCjk`：`'hello'`、`"don't “quoted” – —…"` 为 false；`'你好'`、`'全角，'`（U+FF0C）、`'。'`（U+3002）为 true；
  - DOCX：调用 `createDocument(input)` 后 `Packer.toBuffer(doc)`，用 `jszip`（docx 的依赖）读取 `word/document.xml`：包含标题、`Sentence 1`、学习者内容、`(Skipped)`（空 userInput）；`includeOriginal: true` 时包含 `Original:` 与 `E8F5E9`，`false` 时都不包含；再调用 `build(input)` 断言返回 `Blob` 且 `size > 0`、`type` 为 docx MIME。
  - 若 `jszip` 不能直接 import，改为断言 `Packer.toBuffer` 结果以 `PK` 开头并跳过 XML 断言，在任务备注中说明

### Implementation for User Story 3

- [X] T025 [US3] 新建 lib/sentence-export/index.ts（轻量模块，**不得** import `docx` 或 `@react-pdf/renderer`），导出：
  - `export const ORIGINAL_BG_HEX = 'E8F5E9';`（注释：必须与 SentenceList.tsx 的 `bg-[#E8F5E9]` 一致）、`export const ORIGINAL_TEXT_HEX = '1F2937';`
  - `export interface SentenceExportInput { title: string; exportedAt: Date; includeOriginal: boolean; sentences: MySentence[] }`
  - `export type ExportFormat = 'docx' | 'pdf';` 以及 `EXPORT_MIME: Record<ExportFormat, string>`（docx：`application/vnd.openxmlformats-officedocument.wordprocessingml.document`；pdf：`application/pdf`）
  - `formatLocalDate(date: Date): string` → `YYYY-MM-DD`（本地时区）
  - `buildExportFilename(title: string, ext: ExportFormat, date: Date): string`：清洗规则见 research R8（去掉 `\ / : * ? " < > |` 和控制字符 → 合并空白 → 去首尾点和空格 → 截断到 80 字符 → 空则 `exercise`），输出 `<标题>-我的句子-YYYY-MM-DD.<ext>`
  - `containsCjk(text: string): boolean`，正则 `/[\u3000-\u303F\u3400-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/`
  - `downloadBlob(blob: Blob, filename: string): void`：`URL.createObjectURL` → 创建不挂 UI 的临时 `<a download>` → `click()` → 移除 → `URL.revokeObjectURL`
- [X] T026 [P] [US3] 新建 lib/sentence-export/build-docx.ts（依赖 T025；与 T027 不同文件可并行），按 contracts/sentences-page-and-export.md §4 与 research R6：
  - `export function createDocument(input: SentenceExportInput): Document`：标题段 `HeadingLevel.TITLE`；副标题 `My Sentences · Exported on {formatLocalDate(exportedAt)}`（灰色小字）；每句：`Sentence N` 加粗 10pt 灰色、学习者内容 12pt（空则斜体 `(Skipped)`）；`includeOriginal` 时追加 `Original: {correctAnswer}` 段落，`shading: { type: ShadingType.CLEAR, fill: ORIGINAL_BG_HEX, color: 'auto' }`、文字色 `ORIGINAL_TEXT_HEX`、左右缩进约 6pt；每块后段后间距 10pt；全局字体 `{ ascii: 'Calibri', hAnsi: 'Calibri', eastAsia: 'Microsoft YaHei' }`；
  - `export async function build(input: SentenceExportInput): Promise<Blob>`：`Packer.toBlob(createDocument(input))`；
  - 不包含准确率、逐词反馈、保存时间
- [X] T027 （部分完成：只注册 NotoSans，未做 CJK 字体切换，等 T003 补齐中文字体）[P] [US3] 用完整实现替换 lib/sentence-export/build-pdf.tsx 的骨架（依赖 T003、T025；保留 T005 验证过的 import 方式），按 contracts/sentences-page-and-export.md §4 与 research R7：
  - 模块级、只执行一次：`Font.register` 两个家族——`NotoSans`（`/fonts/NotoSans-Regular.ttf`、`/fonts/NotoSans-Bold.ttf` fontWeight 700）与 `NotoSansSC`（`/fonts/NotoSansSC-Regular.ttf`、`/fonts/NotoSansSC-Bold.ttf`）；`Font.registerHyphenationCallback((word) => [word])` 禁止断字；
  - 字体选择：标题或任一句 `userInput`/（`includeOriginal` 时的）`correctAnswer` 满足 `containsCjk` → 整份文档用 `NotoSansSC`，否则 `NotoSans`（不使用 fontFamily 数组）；
  - `<Document title={title}><Page size="A4" wrap style={{ padding: 40, fontFamily }}>`：标题 18pt 加粗；副标题 `My Sentences · Exported on YYYY-MM-DD` 灰色小字；每句 `<View wrap={false} style={{ marginBottom: 10 }}>`：`Sentence N`（10pt 加粗灰色）、内容 12pt（空则斜体灰色 `(Skipped)`——注意 Noto Sans 未注册 italic 时改用灰色常规体，避免字体缺失报错）、`includeOriginal` 时 `<View style={{ backgroundColor: '#' + ORIGINAL_BG_HEX, paddingHorizontal: 6, paddingVertical: 4 }}><Text style={{ color: '#' + ORIGINAL_TEXT_HEX }}>Original: …</Text></View>`；
  - `export async function build(input: SentenceExportInput): Promise<Blob>` → `pdf(<SentencesPdf {...input} />).toBlob()`；
  - 使用 react-pdf 的 `StyleSheet`/内联样式只作用于 PDF，不影响应用样式（章程说明）
- [X] T028 [US3] 新建 app/components/sentences/ExportMenu.tsx（依赖 T002、T025）：`'use client'`；props `{ title: string; sentences: MySentence[]; includeOriginal: boolean; disabled: boolean }`；内部状态 `exporting: ExportFormat | null`：
  - `DropdownMenu` → `DropdownMenuTrigger` 渲染为 shadcn `Button`（lucide `Download` 图标 + **Export**；`exporting` 时文字 **Exporting…**，并设 `disabled` 与 `aria-busy="true"`；`disabled || exporting !== null` 时禁用）；
  - `DropdownMenuContent` 中两个 `DropdownMenuItem`：`Word (.docx)`、`PDF`；
  - 选择后：`setExporting(fmt)` → `const mod = fmt === 'docx' ? await import('@/lib/sentence-export/build-docx') : await import('@/lib/sentence-export/build-pdf')`（**字面量路径**，便于分块）→ `const exportedAt = new Date()` → `const blob = await mod.build({ title, exportedAt, includeOriginal, sentences })` → `downloadBlob(blob, buildExportFilename(title, fmt, exportedAt))`；`catch` 时 `toast({ title: 'Export failed. Please try again.', variant: 'destructive' })`；`finally` `setExporting(null)`（FR-015）；
  - 顶层只 import `@/lib/sentence-export`（index.ts），不得静态 import docx / react-pdf
- [X] T029 [US3] 在 app/dashboard/[exerciseId]/sentences/page.tsx 中接入导出（依赖 T020、T028）：在工具栏右侧（T020 预留位置）渲染 `<ExportMenu title={data.exercise.title} sentences={data.sentences} includeOriginal={showOriginal} disabled={!canExport} />`，其中 `const canExport = status === 'ready' && (data?.sentences.length ?? 0) > 0`（FR-011）；空状态与 not-found/error 状态下导出不可用
- [ ] T030 [US3] 验证 US3：`npm run test:unit -- sentence-export` 通过；`npm run build` 通过，并确认 sentences 页面的首屏 chunk 不包含 docx / react-pdf（它们应在单独的异步 chunk 中）；手动走 quickstart.md §3 全部检查：开/关 × docx/pdf 四种组合、Exporting… 防重复、阻止 `/fonts/*` 时出现 “Export failed” toast、`don't` / `“quoted”` / `well-known` / `… — –` 正确显示且无断字、中文标题/句子切换 Noto Sans SC、200 句（脚本批量插入测试 progress）两种格式均 < 10 秒且 PDF 正确分页、同一句不跨页（SC-005）

**Checkpoint**: US1–US3 完成，回顾页可导出 Word 与 PDF

---

## Phase 6: User Story 4 - 键盘与读屏可访问 (Priority: P3)

**Goal**: 开关与导出菜单可只用键盘操作，焦点可见；读屏能读出 “Show original, switch, on/off” 和菜单项名称（FR-017、plan 章程 IV）

**Independent Test**: 只用 Tab / Shift+Tab / Space / Enter / 方向键 / Esc 完成“打开原文 → 导出 PDF”；VoiceOver 正确读出开关名称与状态、菜单项名称（quickstart.md §4）

### Implementation for User Story 4

- [X] T031 [US4] 审查并补齐 app/dashboard/[exerciseId]/sentences/page.tsx 的可访问性（依赖 T020、T029）：确认 `Switch` 的 `id="show-original"` 与 `Label htmlFor` 关联、渲染结果含 `role="switch"` 与 `aria-checked`；页面只有一个 `<h1>`；加载中区域设 `aria-busy`；Tab 顺序为 Back to exercise → Show original → Export → 列表；如 shadcn 生成的 Switch 缺少可见焦点环，在**使用处**通过 `className` 补 `focus-visible:ring-2 focus-visible:ring-ring`，不修改 components/ui/switch.tsx
- [X] T032 [P] [US4] 审查并补齐 app/components/sentences/ExportMenu.tsx 的可访问性（依赖 T028；与 T031 不同文件）：触发按钮在导出中保持 `aria-busy="true"` 且可读文字为 “Exporting…”；菜单打开后焦点进入第一项，↑/↓ 移动、Enter 触发、Esc 关闭并把焦点还给触发按钮（Base UI Menu 内置，确认未被自定义 `onKeyDown` 破坏）；菜单项可读名称为 `Word (.docx)` 与 `PDF`
- [ ] T033 [US4] 手动验证 quickstart.md §4：仅键盘完成 Tab 到开关 → Space 切换 → Tab 到 Export → Enter 打开 → ↓ 选 PDF → Enter 下载，全程焦点环可见；macOS VoiceOver 读出 “Show original, switch, off/on” 与两个菜单项名称；另用浏览器 DevTools 对比度检查确认原文块 #1F2937 on #E8F5E9 ≥ 4.5:1（FR-009）

**Checkpoint**: 全部用户故事完成

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 质量门禁、回归与上线准备

- [ ] T034 [P] 运行 `npm run type-check`，0 错误；确认新代码中没有 `any`（`grep -rn ": any" lib/dictation-attempts.ts lib/sentence-export app/api/practice/[exerciseId]/save-attempt app/api/practice/[exerciseId]/sentences app/components/sentences app/dashboard/[exerciseId]/sentences` 无结果）
- [X] T035 [P] 运行 `npm run lint`，0 错误
- [ ] T036 回归测试：`npm run test:unit` 全部通过（包括已有的 accuracy、video-player 测试）；`npm run dev` 后 `TEST_BASE_URL=http://localhost:3000 npm run test:integration` 全部通过，尤其 tests/integration/practice-flow.test.ts 中 save-progress 的 201 与完成逻辑未受影响
- [ ] T037 最终 `npm run build` 通过；确认 app/dev-react-pdf-spike/ 已删除；若 T005 修改了 next.config.ts，确认改动最小并带注释说明原因
- [X] T038 [P] 在 DEPLOYMENT.md 的数据库迁移相关小节追加一段说明：部署 008 前先执行 `mysqldump <db> UserDictationAttempt > backup-UserDictationAttempt-<date>.sql` 备份；迁移 005 会不可逆地删除同句的历史重复作答，只保留最新一条；`scripts/deploy.sh` 会先 `npm run db:migrate` 再启动新代码（plan 风险 1、2）
- [X] T039 范围检查：`git --no-pager status` 与 `git --no-pager diff --stat` 中只出现本文件 “Path Conventions” 列出的文件（外加 package-lock.json、DEPLOYMENT.md、可能的 next.config.ts）；没有修改 `/check` 路由、`lib/summary.ts`、`specs/001–007/**`；把 tasks.md 中已完成任务勾选为 `[X]`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**：无依赖。T001 → T004 → T005 必须顺序执行；T002、T003 可与 T001 并行。
- **Foundational (Phase 2)**：依赖 Setup 完成（主要是 T001 的 type-check 基线）。T006 ∥ T007 → T008；T009 依赖 T006。**阻塞所有用户故事**。
- **US1 (Phase 3)**：依赖 Foundational（T008、T009）。
- **US2 (Phase 4)**：依赖 Foundational；数据上依赖 US1 产生的记录才能演示，但代码上**只**与 US1 共享 practice/page.tsx（T022 需在 T014 之后，避免同文件冲突）。T019（组件）可在 Foundational 后立即开始。
- **US3 (Phase 5)**：依赖 US2 的页面（T020）作为挂载点；T024–T028 可在 Foundational 后先行开发，只有 T029 必须等 T020。
- **US4 (Phase 6)**：依赖 US2（开关）与 US3（导出菜单）。
- **Polish (Phase 7)**：依赖所有目标故事完成。

### User Story Dependencies

```text
Setup ─► Foundational ─┬─► US1 (P1) ──────────────┐
                       ├─► US2 (P1) ─► [T022 after T014]
                       │        │
                       │        └─► US3 (P2, T029 after T020) ─► US4 (P3) ─► Polish
                       └─► US3 lib modules (T024–T028) may start early
```

### Within Each User Story

- 测试任务先写（可与实现并行，因为文件不同），实现完成后运行验证任务。
- lib → API route → 组件 → 页面 → 入口 → 验证。
- 同一文件的任务按 ID 顺序执行：
  - `lib/dictation-attempts.ts`：T008 → T017
  - `app/dashboard/[exerciseId]/practice/page.tsx`：T013 → T014 → T022
  - `app/dashboard/[exerciseId]/sentences/page.tsx`：T020 → T029 → T031
  - `tests/integration/sentence-records.test.ts`：T010 → T016
  - `lib/sentence-export/build-pdf.tsx`：T004 → T027

---

## Parallel Opportunities

带 [P] 的任务：T002、T003、T006、T007、T010、T011、T012、T019、T021、T022、T024、T026、T027、T032、T034、T035、T038（共 17 个）。

### Setup

```text
# 与 T001 同时启动：
Task T002: npx shadcn@latest add switch dropdown-menu → components/ui/switch.tsx, dropdown-menu.tsx
Task T003: 放置 public/fonts/*.ttf 与 OFL.txt
```

### Foundational

```text
Task T006: migrations/005_unique_dictation_attempt.sql
Task T007: lib/types.ts 新增 SaveAttemptRequest / MySentence / MySentencesResponse
```

### User Story 1

```text
# T008 完成后同时启动（3 个不同文件）：
Task T010: tests/integration/sentence-records.test.ts（US1 用例 a–d）
Task T011: app/api/practice/[exerciseId]/save-attempt/route.ts
Task T012: app/api/practice/[exerciseId]/save-progress/route.ts（INSERT → upsert）
```

### User Story 2

```text
# 同时启动（不同文件）：
Task T019: app/components/sentences/SentenceList.tsx
Task T021: app/dashboard/[exerciseId]/page.tsx 入口按钮
Task T022: app/dashboard/[exerciseId]/practice/page.tsx 入口按钮（T014 之后）
# 同时 T016 → 集成测试（与 T017/T018 文件不同）
```

### User Story 3

```text
# T024 可立即开始；T025 完成后：
Task T026: lib/sentence-export/build-docx.ts
Task T027: lib/sentence-export/build-pdf.tsx
# T028 ExportMenu 与 T026/T027 文件不同，T025 后也可同时开发
```

### User Story 4 / Polish

```text
Task T031 (page.tsx) ∥ Task T032 (ExportMenu.tsx)
Task T034 (type-check) ∥ Task T035 (lint) ∥ Task T038 (DEPLOYMENT.md)
```

---

## Implementation Strategy

### MVP First（仅 User Story 1）

1. Phase 1：T001–T005（依赖、组件、字体，**尽早**证明 react-pdf 能通过 `next build`）。
2. Phase 2：T006–T009（迁移去重 + UNIQUE、类型、upsert 函数）。
3. Phase 3：T010–T015（save-attempt、save-progress upsert、练习页串行保存）。
4. **STOP and VALIDATE**：集成测试 US1 用例 + quickstart §1。此时“每句一份、以最后一次为准”已生效，历史重复已清理；数据已为回顾页准备好。

> 注：US1 单独交付对学习者不可见（没有回顾页），建议 **US1 + US2 作为最小可发布增量**（两者都是 P1）。

### Incremental Delivery

1. Setup + Foundational → 数据层就绪。
2. US1 → 保存/覆盖语义（MVP，可在数据库验证）。
3. US2 → “我的句子”页面 + 原文开关 + 入口（**首个对用户可见的发布点**）。
4. US3 → Word / PDF 导出。
5. US4 → 键盘与读屏审查。
6. Polish → type-check、lint、回归、构建、部署说明、范围检查。

### Parallel Team Strategy

Foundational 完成后：

- 开发者 A：US1（T010–T015）→ T022
- 开发者 B：US2（T016–T021、T023）
- 开发者 C：US3 的 lib 与测试（T024–T028），等 T020 完成后做 T029–T030

### Out of Scope（plan 已接受的决策）

- 不修正“Check 后修改输入再点 Next 时 accuracy/wordFeedback 沿用上次 Check 结果”的现有行为（plan 风险 5、research R3）。
- 不给 `/check` 加保存参数；不对客户端回传的 accuracy 做防篡改。
- 不做分页、删除/编辑记录、开关持久化、服务端 PDF、e2e 测试。
- 不把 `VALUES()` 改成 MySQL 8.0.19+ 行别名写法（plan 风险 7）。
