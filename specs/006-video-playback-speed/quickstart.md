# Quickstart: 验证视频播放器倍速播放

**Feature**: `006-video-playback-speed`

## 前置条件

- 已按 `DATABASE-SETUP.md` 准备好数据库和种子数据，并且有一个可登录的学习者账号，至少一个练习的视频可以正常播放。
- 使用桌面浏览器（Chrome 或 Edge 最新版），窗口宽度 ≥ 1280px。
- 控件规格见 [contracts/video-player-playback-speed.md](./contracts/video-player-playback-speed.md)，状态规则见 [data-model.md](./data-model.md)。

## 1. 静态检查与单元测试

```bash
npm run type-check
npm run lint
npx jest tests/unit/video-player-playback-rate.test.tsx
```

**期望**：全部通过。组件测试覆盖默认 1x、选择后 `playbackRate`/`defaultPlaybackRate` 更新、换源后速度保持。

## 2. 手动验证（`npm run dev`，打开 `/dashboard/<exerciseId>/practice`）

| # | 步骤 | 期望结果 | 对应 |
|---|---|---|---|
| 1 | 进入练习页 | 控制区出现速度控件，显示 `1x` | FR-002/003, SC-004 |
| 2 | 打开控件 | 依次列出 `0.25x 0.5x 1x 1.25x 1.5x`，`1x` 有勾选标记 | FR-001 |
| 3 | 播放中选择 `0.5x` | 不暂停、不跳回句首，立即变慢 | FR-004 |
| 4 | 在 DevTools Console 执行 `document.querySelector('video').playbackRate` | 返回 `0.5` | FR-004 |
| 5 | 记下当前句时长 T（播放器显示的 "Duration"），点 Replay 并计时 | 用时约 2T（误差 ≤10%）；句尾自动停止 | SC-002, FR-006 |
| 6 | 分别用 `0.25x`、`1.25x`、`1.5x` 重复第 5 步 | 用时约 T÷倍速；都在句尾停止，没有明显播入下一句 | SC-002, FR-006 |
| 7 | 在 `0.25x` 下听一句 | 音调自然，没有明显变低沉 | FR-007 |
| 8 | 保持 `0.5x`，依次执行 Skip、提交答案进入下一句、拖动进度条，共完成约 10 句 | 控件一直显示 `0.5x`，第 4 步的命令始终返回 `0.5` | FR-005, SC-003 |
| 9 | 暂停状态下选择 `1.25x` 再点 Play | 以 1.25x 播放 | Story 1 场景 4 |
| 10 | 刷新页面 | 恢复为 `1x` | FR-010 |

## 3. 键盘与读屏（Story 2）

| # | 步骤 | 期望结果 |
|---|---|---|
| 1 | 只用 Tab 移动到速度控件 | 有可见焦点环 |
| 2 | Enter 打开 → ↓ 选 `1.5x` → Enter | 速度变为 1.5x，弹层关闭，焦点回到控件 |
| 3 | 再次打开后按 Esc | 弹层关闭，速度不变，焦点回到控件 |
| 4 | macOS VoiceOver（⌘F5）聚焦控件 | 读出 "Playback speed"、combobox 以及当前值（如 "1.5x"） |
| 5 | Chrome DevTools → Lighthouse → Accessibility（或 axe 扩展） | 速度控件没有报错项（WCAG 2.1 AA，SC-005） |
