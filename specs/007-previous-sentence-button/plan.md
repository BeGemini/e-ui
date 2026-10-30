# Implementation Plan: 视频播放器"上一句"按钮

**Branch**: `007-previous-sentence-button` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-previous-sentence-button/spec.md`

> 注：当前 git 分支仍为 `006-video-playback-speed`（含未提交的 006 改动）。本计划通过 `.specify/feature.json` 定位到 007 目录。实现时应基于已包含 006 倍速改动的 `VideoPlayer.tsx` 进行。

## Summary

在 `VideoPlayer` 控制区最左侧新增一个与"下一句"对称的"上一句"按钮（lucide `SkipBack`）。

- **播放器**只负责发出意图：新增可选 prop `onPreviousSentence` 和 `isPreviousDisabled`。在第 1 句、锁定或未传回调时，按钮为禁用状态。
- **练习页**实现 `handlePreviousSentence`：
  - 把下标减 1，清空输入和反馈；
  - 复用现有的 `playSentenceAtIndex` 路径，从上一句开头播放。这样句尾自动暂停、倍速保持、未就绪时的 pending play 都能直接沿用；
  - **不调用** `saveProgress` 或任何 API，因此不会记"跳过"，服务器进度也不变。
- **并发保护**：保存或评分请求进行中时禁用按钮，避免过期响应把句子或反馈错位（research R3）。
- 不涉及服务端、数据库或持久化变更。

## Technical Context

**Language/Version**: TypeScript 5（strict）、React 19.2、Next.js 16.3（App Router）

**Primary Dependencies**: 已有的 shadcn `Button`（`@base-ui/react/button`）和 lucide-react 的 `SkipBack`（已确认存在）。**不新增依赖，也不新增 shadcn 组件。**

**Storage**: N/A。服务器端 `UserExerciseProgress`/`UserDictationAttempt` 只读不写。

**Testing**: Jest 29 + jsdom + @testing-library/react，新增 1 个组件测试；页面流程按 `quickstart.md` 手动验证。

**Target Platform**: 桌面浏览器（Chrome、Edge、Firefox、Safari 最新版），视口 ≥ 1280px。

**Project Type**: Next.js 全栈 Web 应用（本功能只涉及前端）。

**Performance Goals**: 点击后同步切换句子，下一个 tick 开始播放（视频已加载时 < 1s，SC-001）。

**Constraints**:

- 回退时不写服务器；
- 不改变 Next/Replay/Play/Speed/进度条行为（FR-013）；
- 不加全局快捷键；
- 不保留每句草稿。

**Scale/Scope**: 修改 2 个文件，`VideoPlayer.tsx` 约 +15 行、`page.tsx` 约 +15 行；新增 1 个测试文件。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 结论 | 说明 |
|---|---|---|
| I. shadcn-First | ✅ | 按钮使用 shadcn `Button`，不写原生 `<button>` |
| II. Type Safety | ✅ | 新 prop 在 `VideoPlayerProps` 中有显式类型（`() => void`、`boolean`）；没有 `any` |
| III. Full-Stack Next.js Only | ✅ | 纯前端改动；不新增或修改 API |
| IV. Desktop Web & Accessible | ✅ | 只按桌面布局设计。原生按钮语义支持 Tab、Enter 和 Space；有 `aria-label`、`title` 和 `focus-visible` 焦点环；禁用时输出原生 `disabled`，读屏会读出不可用状态；禁用色与 Next 一致 |
| V. Code Quality & Testing | ✅ | 新增 RTL 组件测试；需要通过 `npm run lint` 和 `npm run type-check` |
| VI. Avoid Over-Engineering | ✅ | 不加快捷键，不保留草稿，不改服务端；不为过期响应引入请求序号或 AbortController，改为复用现有 loading 标志来禁用；不新增 e2e |

**Post-Design Re-check**: ✅ Phase 1 设计完成后复查，结论不变，没有违规项，Complexity Tracking 为空。

## Project Structure

### Documentation (this feature)

```text
specs/007-previous-sentence-button/
├── spec.md
├── plan.md              # 本文件
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── video-player-previous-sentence.md   # Phase 1：组件 props/UI/a11y 契约
├── checklists/
└── tasks.md             # Phase 2（/speckit.tasks 生成，本命令不创建）
```

### Source Code (repository root)

```text
app/components/video-player/
└── VideoPlayer.tsx        # 修改：新增 props onPreviousSentence / isPreviousDisabled；
                           #   引入 SkipBack；在控制区首位渲染"上一句"按钮

app/dashboard/[exerciseId]/practice/
└── page.tsx               # 修改：新增 handlePreviousSentence；
                           #   向 <VideoPlayer> 传入两个新 prop

app/api/practice/**        # 不修改
components/ui/button.tsx   # 复用，不修改

tests/unit/
└── video-player-previous-sentence.test.tsx   # 新增：RTL 组件测试
```

**Structure Decision**: 沿用现有 Next.js 单项目结构。props 类型与组件放在一起（章程 Code Structure Standards："Colocate types with their usage"）。

## 实现要点（供 /speckit.tasks 拆分）

1. **`VideoPlayer.tsx`**（见 contract §1–§5）：
   - 在 `VideoPlayerProps` 中新增 `onPreviousSentence?: () => void` 和 `isPreviousDisabled?: boolean`，并在函数参数中解构；
   - 从 `lucide-react` 引入 `SkipBack`；
   - 在控制区 Play/Pause 之前新增 `Button`：
     - `onClick={onPreviousSentence}`；
     - `disabled={!onPreviousSentence || !currentSubtitle || currentSentenceIndex <= 0 || isPreviousDisabled}`；
     - `className` 与 Next 按钮相同；
     - `aria-label` 和 `title` 都设为 "Previous sentence"。
2. **`page.tsx`**（见 contract §6）：
   - 新增 `handlePreviousSentence`：守卫 → 设置 `prev` 下标 → 清空 `userInput` 和 `currentFeedback` → `setTimeout(() => videoPlayerRef.current?.playSentenceAtIndex(prev), 0)`；
   - 在 `<VideoPlayer>` 上传 `onPreviousSentence={handlePreviousSentence}` 和 `isPreviousDisabled={isSavingProgress || isCheckingAccuracy}`。
3. **`tests/unit/video-player-previous-sentence.test.tsx`**：
   - 渲染前设置 `localStorage` token；
   - 断言以下情况：
     - 下标为 0 时禁用；
     - 下标为 1 时可用，点击后调用 `onPreviousSentence` 一次，且 `onSentenceEnd` 未被调用；
     - `isPreviousDisabled` 为 true 时禁用；
     - 未传回调时禁用；
   - 通过 `getByRole('button', { name: 'Previous sentence' })` 定位按钮。
4. **验证**：运行 `npm run type-check`、`npm run lint` 和 jest，然后按 `quickstart.md` 手动验证。

## Open Questions（不阻塞，计划已按默认处理）

1. **多步回退后提交会让服务器进度后退**：`save-progress` 无条件写入 `sentenceIndex + 1`。例如从第 5 句回退到第 2 句后提交，进度会变成第 3 句。规格只覆盖 N−1 的情况，并假设"不涉及服务端变更"，所以本期保持现状。如需保护，可另行把 SQL 改为 `GREATEST(currentSentenceIndex, ?)`（research R7-1）。
2. **评分中禁用"上一句"**：这是在规格（只提到保存中）基础上的保守扩展，用于防止旧句反馈被错误地保存到上一句（research R3）。如不需要，可以只用 `isSavingProgress`。

## Complexity Tracking

无违规项。
