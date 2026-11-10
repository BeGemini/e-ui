# Data Model: 视频播放器倍速播放

**Feature**: `006-video-playback-speed` | **Date**: 2026-10-30

本功能**没有持久化数据**：不改数据库 schema，不改 API，不写 `localStorage`。下面只描述客户端内存中的模型。

## PlaybackRate（播放速度）

| 项 | 说明 |
|---|---|
| 类型 | `type PlaybackRate = (typeof PLAYBACK_RATES)[number]`，即 `0.25 \| 0.5 \| 1 \| 1.25 \| 1.5` |
| 常量 | `const PLAYBACK_RATES = [0.25, 0.5, 1, 1.25, 1.5] as const`（从慢到快，同时决定选项顺序） |
| 默认值 | `1`（`DEFAULT_PLAYBACK_RATE`） |
| 显示格式 | `` `${rate}x` `` → `0.25x` / `0.5x` / `1x` / `1.25x` / `1.5x` |
| 位置 | `VideoPlayer` 组件内部 `useState<PlaybackRate>(1)`；常量和类型就放在 `app/components/video-player/VideoPlayer.tsx` 中 |
| 生命周期 | 随 `VideoPlayer` 挂载创建，卸载销毁。页面刷新、离开后再进入、切换 `exerciseId` 都会重置为 1 |

### 校验规则

- 只接受 `PLAYBACK_RATES` 中的值（FR-001）。`onValueChange` 收到 `null` 或不在列表中的值时直接忽略，保持当前值。
- 不提供自定义输入。

### 同步规则（state → `<video>`）

| 时机 | 动作 |
|---|---|
| `playbackRate` 变化 | `video.defaultPlaybackRate = video.playbackRate = rate` |
| `<video>` 首次挂载（`videoUrlWithToken` 变为非空） | 同上 |
| `loadedmetadata`（包括换源后重新加载） | 同上 |
| 重播、跳句、`playSentenceAtIndex`、拖动进度条、句尾自动停止 | 不动速度（这些操作只改 `currentTime` 或调用 `play()`/`pause()`） |

### 状态转换

```text
[挂载] --> rate = 1
rate = a --(用户选择 b ∈ PLAYBACK_RATES)--> rate = b   （播放/暂停状态与 currentTime 不变）
rate = a --(换句/重播/拖动/换源)--> rate = a
[卸载/刷新] --> 状态丢弃；下次挂载回到 1
```
