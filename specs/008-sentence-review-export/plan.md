# Implementation Plan: 练习句子记录、回顾页与导出

**Branch**: `008-sentence-review-export` | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-sentence-review-export/spec.md`

## Summary

让每个学习者在每个练习中的每一句只保留**一份**作答记录，并新增“我的句子”回顾页，支持导出 DOCX 和 PDF。

- **数据层**：复用 `UserDictationAttempt` 表，不新建表。
  - 新增迁移 `005`：先清理历史重复数据（每句保留最新一条），再加 `UNIQUE(progressId, sentenceIndex)`。
  - 所有写入统一改为 `INSERT ... ON DUPLICATE KEY UPDATE`，由 `lib/dictation-attempts.ts` 提供 `upsertAttempt` 和 `getOrCreateProgress`（research R1、R3）。
- **Check 保存**：新增 `POST /api/practice/[exerciseId]/save-attempt`，只做 upsert，不前进句子，也不改变完成状态。
  - 练习页在 `/check` 成功、显示反馈后，在后台发起保存，不阻塞界面。
  - 用一个 promise 链串行化所有保存请求；`saveProgress` 会先等待这个链完成，保证“以最后一次为准”（research R2）。
- **Next/Skip**：`save-progress` 的契约不变，只把 INSERT 换成 upsert，这样已有记录会被覆盖，不再报错或新增重复行。平均准确率的计算代码不用改，结果会自动变成每句只计一次。
- **回顾页**：
  - 新增 `GET /api/practice/[exerciseId]/sentences`，按 `sentenceIndex` 升序返回记录，同时返回原文快照。
  - 新增页面 `app/dashboard/[exerciseId]/sentences/page.tsx`，使用 shadcn 的 `Switch`（默认关闭，切换只在客户端完成）。原文块背景色为 `#E8F5E9`。
  - 在练习详情页和练习页各加一个 “My Sentences” 入口。
- **导出**：使用 shadcn `DropdownMenu`，提供 Word 和 PDF 两个选项，都在浏览器端按需动态 import 生成文件。
  - Word 使用 `docx`，原文用段落底纹实现浅绿背景。
  - PDF 使用 `@react-pdf/renderer`，打包 Noto Sans 字体；内容含 CJK 时整份文档改用 Noto Sans SC。
  - 导出遵循“所见即所导”：开关打开时才包含原文（research R6–R8）。

## Technical Context

**Language/Version**: TypeScript 5（strict）、React 19.2、Next.js 16.3（App Router；Route Handler 的 `params` 是 `Promise`，需要 `await`）

**Primary Dependencies**:

- 已有：`mysql2`、`uuid`、`@base-ui/react`（shadcn base-nova）、`lucide-react`
- **新增运行时依赖**：
  - `docx@^9.15.0`
  - `@react-pdf/renderer@^4.9.0`（peer 依赖支持 React 19）
- **新增 shadcn 组件**：`switch`、`dropdown-menu`（`npx shadcn@latest add switch dropdown-menu`）
- **新增静态资源**：`public/fonts/` 下的 NotoSans-Regular/Bold.ttf、NotoSansSC-Regular/Bold.ttf，以及 `OFL.txt`

**Storage**: MySQL（`lib/db`）。

- 表 `UserDictationAttempt`：新增唯一索引，迁移时一次性去重。
- 表 `UserExerciseProgress`：结构不变。
- 新迁移文件为 `migrations/005_unique_dictation_attempt.sql`，由 `npm run db:migrate` 执行（`deploy.sh` 会自动运行）。

**Testing**: Jest 29。

- 单元测试 `tests/unit/sentence-export.test.ts`：覆盖文件名生成、CJK 检测和 DOCX 生成。
- 集成测试 `tests/integration/sentence-records.test.ts`：沿用现有写法，对 `TEST_BASE_URL` 发 fetch，覆盖唯一性、“Check 不前进”和用户隔离。
- 其余按 `quickstart.md` 手动验证。

**Target Platform**: 桌面浏览器（Chrome、Edge、Firefox、Safari 最新版），视口 ≥ 1280px；服务端为 Node 上的 Next.js（PM2 部署）。

**Project Type**: Next.js 全栈 Web 应用（API routes + 客户端页面）。

**Performance Goals**:

- Check 的感知延迟不变，因为保存在后台进行，不阻塞反馈（SC-002）；
- 200 句时回顾页在 2 秒内显示（SC-003）；
- 开关切换即时生效（SC-004）；
- 200 句时两种格式的导出都在 10 秒内完成（SC-005）。

**Constraints**:

- 每个 `(progressId, sentenceIndex)` 最多一条记录；
- save-attempt 不修改进度；
- save-progress 的请求和响应契约不变；
- 导出全部在客户端完成，不在服务端生成或保存文件；
- docx 和 react-pdf 只在点击导出时动态加载，不进入页面首屏包。

**Scale/Scope**:

- 新增约 10 个文件：1 个迁移、1 个 lib、2 个 API、1 个页面、2 个业务组件、3 个导出模块；另有 2 个 shadcn 组件、字体资源和 2 个测试文件。
- 修改 5 个文件：`save-progress/route.ts`、练习页、练习详情页、`lib/types.ts`、`package.json`。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 结论 | 说明 |
|---|---|---|
| I. shadcn-First | ✅ | 页面只用 shadcn 的 `Card`、`Button`、`Switch`、`Label`、`DropdownMenu`、`Badge`。缺少的 `switch` 和 `dropdown-menu` 通过 shadcn CLI 生成（base-nova/Base UI）。react-pdf 的 `<View>/<Text>` 是 PDF 文档原语，不是页面 UI。触发下载用的临时 `<a>` 不渲染到界面上 |
| II. Type Safety | ✅ | `SaveAttemptRequest`、`MySentence`、`MySentencesResponse`、`SentenceExportInput` 都有显式类型；新代码不用 `any`（现有 save-progress 中的 `wordFeedback?: any[]` 顺手改成 `WordFeedback[]`）；docx 和 react-pdf 自带 TS 类型 |
| III. Full-Stack Next.js Only | ✅ | 新接口放在 `app/api/practice/[exerciseId]/*`；导出在浏览器端完成，不引入外部服务或独立后端 |
| IV. Desktop Web & Accessible | ✅ | 只做桌面布局。Switch 输出 `role="switch"` 和 `aria-checked`，并关联 Label；菜单支持键盘（方向键、Enter、Esc）；导出中设置 `aria-busy`；原文 #1F2937 配 #E8F5E9 的对比度约 13:1，满足 WCAG AA |
| V. Code Quality & Testing | ✅ | 新增单元测试和集成测试；必须通过 `npm run lint` 和 `npm run type-check`；共享写入逻辑抽到 `lib/dictation-attempts.ts`，避免在两个路由里重复 |
| VI. Avoid Over-Engineering | ✅ | 不新建表；不做分页、删除或编辑记录，也不持久化开关状态；不使用服务端 Puppeteer；不引入 file-saver；不加 e2e；check 接口保持不变；对客户端回传的 accuracy 不额外防篡改（与现状一致） |
| 技术栈约束（新增依赖） | ✅ | `docx` 和 `@react-pdf/renderer` 是文档生成库，不是 UI 组件库，也不是 CSS 框架。react-pdf 的 `StyleSheet` 只作用于 PDF 输出，不用于应用样式，所以不违反“禁止 CSS-in-JS”的规定 |

**Post-Design Re-check**: ✅ Phase 1 设计（data-model、contracts、quickstart）完成后复查，结论不变，没有违规项，Complexity Tracking 为空。

## Project Structure

### Documentation (this feature)

```text
specs/008-sentence-review-export/
├── plan.md              # 本文件
├── research.md          # Phase 0：R1–R9 决策
├── data-model.md        # Phase 1：UserDictationAttempt 约束、视图模型、导出输入
├── quickstart.md        # Phase 1：验证指南
├── contracts/
│   ├── practice-attempt-api.md       # save-attempt（新增）+ save-progress（变更）+ 迁移
│   ├── sentences-api.md              # GET sentences（新增）
│   └── sentences-page-and-export.md  # 页面 UI、入口、导出文档格式
├── checklists/
└── tasks.md             # Phase 2（/speckit.tasks 生成，本命令不创建）
```

### Source Code (repository root)

```text
migrations/
└── 005_unique_dictation_attempt.sql         # 新增：去重 + UNIQUE(progressId, sentenceIndex)

lib/
├── dictation-attempts.ts                    # 新增：getOrCreateProgress、upsertAttempt、listMySentences
├── types.ts                                 # 修改：+SaveAttemptRequest、MySentence、MySentencesResponse
└── sentence-export/
    ├── index.ts                             # 新增：ORIGINAL_BG_HEX、SentenceExportInput、buildExportFilename、containsCjk、downloadBlob
    ├── build-docx.ts                        # 新增：docx → Blob（动态加载）
    └── build-pdf.tsx                        # 新增：@react-pdf/renderer → Blob（动态加载，注册字体）

app/api/practice/[exerciseId]/
├── save-attempt/route.ts                    # 新增：POST，只做 upsert，不前进
├── sentences/route.ts                       # 新增：GET，返回当前用户的记录和练习标题
└── save-progress/route.ts                   # 修改：INSERT → upsertAttempt；进度行改用 getOrCreateProgress

app/dashboard/[exerciseId]/
├── sentences/page.tsx                       # 新增：我的句子页面
├── practice/page.tsx                        # 修改：Check 成功后串行保存；saveProgress 先等待保存链；头部加 My Sentences 入口
└── page.tsx                                 # 修改：按钮组加 My Sentences 入口

app/components/sentences/
├── SentenceList.tsx                         # 新增：句子卡片列表 + 原文块
└── ExportMenu.tsx                           # 新增：DropdownMenu + 导出流程

components/ui/
├── switch.tsx                               # 新增（shadcn CLI 生成）
└── dropdown-menu.tsx                        # 新增（shadcn CLI 生成）

public/fonts/
├── NotoSans-Regular.ttf, NotoSans-Bold.ttf
├── NotoSansSC-Regular.ttf, NotoSansSC-Bold.ttf
└── OFL.txt

tests/
├── unit/sentence-export.test.ts             # 新增
└── integration/sentence-records.test.ts     # 新增
```

**Structure Decision**: 沿用现有的单一 Next.js 全栈结构。API 放在 `app/api/practice/[exerciseId]/` 下，与 check、save-progress 同级。页面放在 `app/dashboard/[exerciseId]/` 下，与 practice、subtitles、knowledge-points 同级。业务组件放在 `app/components/<领域>/`，共享逻辑放在 `lib/`，与章程中的 Code Structure Standards 和 001–007 的惯例一致。

## 风险与注意事项

1. **迁移会删除数据（不可逆）**：历史重复作答会被删除，只保留每句最新一条。这符合 FR-004b，但上线前应先备份 `UserDictationAttempt`（例如执行 `mysqldump` 只导出该表）。
2. **部署顺序**：如果代码先于迁移上线，upsert 会退化成 INSERT，不会报错，但会暂时产生重复，迁移执行后会被清理。`deploy.sh` 是先 migrate，正常情况下不会出现这个问题。
3. **CJK 字体体积**：Noto Sans SC 单个文件约 10 MB，含中文的 PDF 首次导出要下载它；网络较慢时可能接近 SC-005 的 10 秒上限。英文内容只加载约 0.5 MB 的 Noto Sans。另外，字体文件会增加仓库体积，需确认 Git 能接受（必要时改用 Git LFS 或 CDN）。
4. **react-pdf 打包与 SSR**：`@react-pdf/renderer` 只能在浏览器端动态 import，不能在 Server Component 中引用。需要在 Next 16（Turbopack）下实际验证 `next build` 能否打包；如果出问题，可以把它加入 `transpilePackages` 或调整 import 方式。
5. **Check 后修改输入再点 Next 的准确率**：save-progress 仍然提交上次 Check 的 `accuracy` 和 `wordFeedback`，配上新的输入（这是现有行为）。回顾页和导出不显示准确率，所以不影响本功能；总体准确率可能略有偏差。本期不修改。
6. **保存链阻塞 Next**：如果 Check 触发的保存请求很慢或超时，Next Sentence 会等它结束（无论成功还是失败）。正常情况下只有几十毫秒；保存失败时链会继续往下走，不会卡死。
7. **MySQL `VALUES()` 弃用警告**：在 8.0.20+ 上只是警告，不影响执行。以后升级到不再支持 `VALUES()` 的版本时，需要改成行别名写法。
8. **DOCX 中文字体**：DOCX 不嵌入字体，指定的 `Microsoft YaHei` 在 macOS 上可能不存在，由 Word 自动替换为其他字体，不会出现乱码，但外观会有差异。

## Complexity Tracking

> 无违规项，不需要填写。
