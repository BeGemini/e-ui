# Quickstart / 验证指南：视频播放器"上一句"按钮

**Feature**: `007-previous-sentence-button`

接口和行为定义见 [contracts/video-player-previous-sentence.md](./contracts/video-player-previous-sentence.md)，状态说明见 [data-model.md](./data-model.md)。

## 前置条件

- 006（倍速）的改动已经在 `VideoPlayer.tsx` 中（本功能基于它实现）。
- 本地数据库和 `.env` 已就绪（见 `DATABASE-SETUP.md`），并且至少有一个包含 ≥ 3 句的练习和一个可登录的学习者账号。

## 自动化检查

```bash
npm run type-check
npm run lint
npx jest tests/unit/video-player-previous-sentence.test.tsx tests/unit/video-player-playback-rate.test.tsx
```

预期：全部通过。新测试覆盖 contract §3/§4/§5，包括第 1 句禁用、锁定时禁用、无回调时禁用、点击只调用 `onPreviousSentence` 而不调用 `onSentenceEnd`、可访问名称。006 的测试也应保持通过（FR-013）。

## 手动验证（`npm run dev`，桌面浏览器 ≥ 1280px）

打开 `/dashboard/<exerciseId>/practice`。

| # | 步骤 | 预期 | 对应 |
|---|---|---|---|
| 1 | 第 1 句时查看控制区 | 最左侧的"上一句"（⏮）为灰色禁用，点击无反应 | FR-005, SC-003 |
| 2 | 用"下一句"或提交前进到第 3 句，然后点"上一句" | 视频从第 2 句开头开始播放，并在句尾自动暂停；播放器显示 "Sentence 2 / Y"，页面顶部显示 "Sentence 2 of Y (…)" | US1-AS1/2, SC-002 |
| 3 | 在第 3 句播放到一半时点"上一句" | 跳到第 2 句开头，而不是第 3 句开头 | FR-004 |
| 4 | 在第 3 句输入文本并 Check 出反馈后，点"上一句" | 输入框和反馈都被清空 | FR-006 |
| 5 | 选择 0.5x 后点"上一句" | 第 2 句以 0.5x 播放 | FR-003 |
| 6 | 连续点"上一句"直到第 1 句 | 每次后退一句；到第 1 句后按钮变为禁用 | US1-AS8 |
| 7 | DevTools Network：在第 3 句点"上一句" | **没有** `save-progress` 请求 | FR-007, SC-004 |
| 8 | 接着（停在第 2 句，未提交）刷新页面 | 从第 3 句继续 | FR-008, SC-005 |
| 9 | 回到第 2 句，完成听写并点 "Next Sentence" | 出现一次 `save-progress`（sentenceIndex=1），前进到第 3 句 | FR-009, US2-AS3 |
| 10 | 点 Check 后在请求返回前（可用 DevTools 节流到 Slow 3G）观察，以及点 "Next Sentence"（Saving...）期间观察 | "上一句"处于禁用状态；请求结束后恢复 | FR-011 |
| 11 | 刷新后立刻（Loading video... 时）点"上一句" | 句序号立即切换，视频就绪后从上一句开头播放 | FR-010 |
| 12 | 只用 Tab 聚焦到"上一句"，按 Enter 或 Space | 有可见焦点环，效果同点击；悬停显示 "Previous sentence" | FR-012, SC-006 |
| 13 | 用读屏软件（VoiceOver）在第 1 句和第 3 句分别读该按钮 | 读出 "Previous sentence"；第 1 句时读出 dimmed/unavailable | FR-012 |
| 14 | 回归：Play/Pause、Replay、Next、Speed、进度条 | 行为与改动前一致 | FR-013 |
