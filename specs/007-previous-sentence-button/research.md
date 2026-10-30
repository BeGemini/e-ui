# Research: 视频播放器"上一句"按钮

**Feature**: `007-previous-sentence-button` | **Date**: 2026-10-30

Technical Context 中没有遗留 NEEDS CLARIFICATION。下面的结论都基于对现有代码的阅读：`app/components/video-player/VideoPlayer.tsx`（含 006 未提交的倍速改动）、`app/dashboard/[exerciseId]/practice/page.tsx`、`app/api/practice/[exerciseId]/route.ts`、`app/api/practice/[exerciseId]/save-progress/route.ts`、`lib/utils.ts#applySubtitleConfig`。

## 现状梳理（代码事实）

- **当前句归属**：`currentSentenceIndex` 是练习页 `page.tsx` 的 `useState`，初值来自 `GET /api/practice/[id]` 的 `userProgress.currentSentenceIndex`。`VideoPlayer` 只接收这个值作为 prop。
- **句子序列**：API 用 `applySubtitleConfig(..., { omitSkipped: true })` 生成有效句子，最后会 `map((sub, idx) => ({ ...sub, index: idx }))` 重新编号。所以 `subtitles[i].index === i`，"上一句"就是数组下标减 1，被跳过的字幕不会出现在序列里（满足 Edge Case "合并/跳过"）。
- **"下一句"（播放器 `SkipForward`，`handleSkipReplay`）**：播放器先把 `<video>` 跳到下一句开头并播放，然后调用 `onSentenceEnd(index, 'skip')`。页面在 `handleSentenceEnd` 里调用 `saveProgress(index, 0)`，它会 POST `save-progress`（写一条 accuracy=0 的 `UserDictationAttempt`，并把 `currentSentenceIndex` 设为 `sentenceIndex + 1`）。成功后 `advanceToNextSentence` 设置新下标、清空 `userInput` 和 `currentFeedback`，再用 `setTimeout(0)` 调用 `videoPlayerRef.current.playSentenceAtIndex(next)`。
- **按句播放和自动暂停**：`handleTimeUpdate` 在 `time ∈ [end, end+0.5)` 时暂停，并回调 `onSentenceEnd(index, 'auto')`。页面收到 `'auto'` 时什么都不做。
- **未就绪时播放**：`playSentenceAtIndex` 在 `!isReady` 时设置 `pendingPlayRef`，由 `handleCanPlay` 补播。下标变化后，`seekTo` effect 会在未就绪时记下 `pendingSeekRef`，就绪后再应用。
- **倍速（006）**：速度是播放器内部 state，通过 `defaultPlaybackRate` 和 `playbackRate` 应用，换句不会重置速度。

## R1. 状态切换放在哪里：页面负责，播放器只发出意图

- **Decision**：`VideoPlayer` 新增可选回调 `onPreviousSentence?: () => void`。播放器的"上一句"按钮只调用这个回调，不自己操作 `<video>`。页面实现 `handlePreviousSentence`：把下标减 1、清空输入和反馈，再走现有的 `setTimeout(() => videoPlayerRef.current?.playSentenceAtIndex(prev), 0)`。
- **Rationale**：当前句、输入框和反馈都属于页面。复用 `advanceToNextSentence` 已经验证过的"设下标 → 清空 → `playSentenceAtIndex`"路径，可以自动满足 FR-003（句尾暂停、倍速保持）和 FR-010（未就绪时的 pending play/seek）。播放器不需要知道"不保存"这条业务规则。
- **Alternatives considered**：
  - 照搬 `handleSkipReplay`，由播放器先 seek/play 再通知页面：这样会有两条播放路径，播放器还要知道目标下标；而且 `!isReady` 时 `video.play()` 没有走 pending 逻辑，FR-010 会更脆弱。拒绝。
  - 复用 `onSentenceEnd`，新增 `reason: 'previous'`：会让"句子结束"回调承担导航语义，页面 `handleSentenceEnd` 也会混入不相关的分支。拒绝。
  - 让播放器内部维护当前句：需要把状态提升或反向同步，改动大，违反章程 VI。拒绝。

## R2. 不写服务端：纯客户端导航

- **Decision**：`handlePreviousSentence` 不调用任何 API，不调用 `saveProgress`，也不调用 `onSentenceEnd`。
- **Rationale**：满足 FR-007 和 FR-008。服务器上的 `currentSentenceIndex` 保持回退前的值，刷新后从原位置继续（SC-005）。回退后提交时，现有 `saveProgress(currentSubtitle.index, …)` 会写入回退句的作答，并把服务器进度设为 `回退句 + 1`。回退 1 句时，这正好等于回退前的位置（US2-AS3）。
- **Alternatives considered**：回退时把服务器进度改成 N−1：违反 FR-007 和 FR-008。拒绝。

## R3. 并发保护（FR-011）：保存或评分进行中时禁用按钮

- **Decision**：页面传入 `isPreviousDisabled={isSavingProgress || isCheckingAccuracy}`；`handlePreviousSentence` 内部也做同样的守卫，防止重复触发。
- **Rationale**：
  - **保存中**：`saveProgress` 成功后会执行 `advanceToNextSentence(sentenceIndex)`，把下标设为"被保存句 + 1"。如果用户在保存过程中回退，最终会被推回错误的句子，所以要禁用。
  - **评分中**：`handleCheckAccuracy` 返回后，会把**旧句子**的反馈写入 `currentFeedback`。如果用户在这期间回退，反馈会显示在上一句下面；接着点 "Next Sentence" 时，会用旧句的 accuracy 保存上一句，导致数据错误。同样要禁用。
  - 两个标志已经存在于页面 state，改动成本几乎为零。
- **Alternatives considered**：用请求序号或 AbortController 丢弃过期响应：更通用，但改动现有保存和评分流程，超出范围（FR-013、章程 VI）。拒绝。

## R4. 按钮禁用条件、位置和图标

- **Decision**：
  - 禁用条件：`!onPreviousSentence || !currentSubtitle || currentSentenceIndex <= 0 || isPreviousDisabled`。
  - 位置：控制区第一个，顺序为 `[Previous] [Play/Pause] [Replay] [Next] [Speed]`，与 Next 对称。
  - 图标：lucide `SkipBack`，`size={16}`，已确认 `lucide-react` 中有 `skip-back` 图标。
  - 样式：与 Next 按钮使用相同的 `className`，包括 `disabled:text-gray-500`。
- **Rationale**：满足 FR-001 和 FR-005；只有 1 句时下标恒为 0，按钮天然不可用。没有传回调时按钮也禁用，保证 `VideoPlayer` 其他用法不受影响（目前只有练习页使用）。

## R5. 可访问性（FR-012）

- **Decision**：使用 shadcn `Button`（Base UI `Button`），同时设置 `aria-label="Previous sentence"` 和 `title="Previous sentence"`，后者用作悬停提示。
- **Rationale**：Base UI `Button` 渲染原生 `<button>`，天然支持 Tab、Enter 和 Space，并自带 `focus-visible:ring` 焦点样式。`disabled` 会输出原生 `disabled` 属性，读屏软件会读出"不可用"。这与现有 Next 按钮的禁用表现一致：禁用后会退出 Tab 序列，但在浏览模式下仍能被读出。
- **Alternatives considered**：`focusableWhenDisabled` 让禁用按钮仍可聚焦：会与 Next 按钮不一致，规格也没有要求。拒绝。

## R6. 测试策略

- **Decision**：新增 RTL 组件测试 `tests/unit/video-player-previous-sentence.test.tsx`，覆盖：
  - 在第 1 句时禁用；
  - `isPreviousDisabled` 为 true 时禁用；
  - 未传回调时禁用；
  - 点击时调用 `onPreviousSentence`，且**不**调用 `onSentenceEnd`；
  - 按钮的可访问名称为 "Previous sentence"。

  页面级行为（清空、不保存、刷新后恢复、句尾暂停）按 `quickstart.md` 手动验证。
- **Rationale**：`page.tsx` 被 jest coverage 排除，也没有现成的页面单测基建。006 已有同类组件测试可以参考（localStorage token、jsdom shim）。不新增 e2e（章程 VI）。

## R7. 已知限制（不在本期处理，作为 Open Questions 报告）

1. **多步回退后重新提交会使服务器进度后退**：`save-progress` 无条件执行 `currentSentenceIndex = sentenceIndex + 1`。例如从第 5 句回退到第 2 句后提交，服务器进度会变成第 3 句。规格只要求"沿用现有提交流程"，并假设"不涉及服务端变更"，所以本期不改；如需保护，可以改成 `GREATEST(currentSentenceIndex, ?)`。
2. **最后一句回退后重新提交**：只要提交的不是最后一句，`isCompleted` 就为 false，行为正确，不需要处理。
3. **同一句多次作答如何计入准确率**：沿用 `calculateOverallAccuracy` 的现有规则（规格 Assumptions 已说明），不调整。
4. **`<video>` 尚未挂载**（token effect 还没执行，`videoRef.current === null`）：`playSentenceAtIndex` 会直接 return，但下标已经切换；挂载后 `seekTo` effect 会定位到上一句开头，只是不会自动播放。这个窗口只在首帧出现，用户此时实际上还无法操作播放器，所以忽略。
