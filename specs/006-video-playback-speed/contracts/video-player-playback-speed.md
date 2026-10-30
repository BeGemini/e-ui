# UI Contract: VideoPlayer 播放速度控件

**Feature**: `006-video-playback-speed` | **Component**: `app/components/video-player/VideoPlayer.tsx`

## 1. 组件对外接口（不变）

- `VideoPlayerProps` 和 `VideoPlayerRef`（`playSentenceAtIndex`）**不新增、不修改**任何字段。速度完全由组件内部管理。
- `app/dashboard/[exerciseId]/practice/page.tsx` **不需要改动**。
- 允许新增导出（供测试和类型使用，不是必须）：`PLAYBACK_RATES`、`type PlaybackRate`。

## 2. 渲染与位置

- 放在现有控制区 `<div className="flex items-center justify-center gap-2">` 中，位于 Play/Pause、Replay、Skip 三个按钮之后。
- 使用 shadcn `Select` / `SelectTrigger`（`size="sm"`）/ `SelectValue` / `SelectContent` / `SelectItem`。
- 触发器的视觉风格与相邻按钮保持一致（FR-009）：深色背景下用 `bg-transparent border-0 text-gray-300 hover:bg-gray-700 hover:text-white rounded`，并保留 `SelectTrigger` 自带的 `focus-visible:ring` 焦点样式。

## 3. 选项

| 顺序 | value (`number`) | 显示 |
|---|---|---|
| 1 | 0.25 | `0.25x` |
| 2 | 0.5 | `0.5x` |
| 3 | 1 | `1x`（默认） |
| 4 | 1.25 | `1.25x` |
| 5 | 1.5 | `1.5x` |

- 恰好 5 项。当前项显示勾选标记（`SelectItem` 自带 `ItemIndicator`，并带 `aria-selected="true"`）。
- 触发器始终显示当前值（FR-003）。

## 4. 行为

| 输入 | 期望 |
|---|---|
| 初次挂载 | 显示 `1x`；`video.playbackRate === 1` |
| 选择值 v（播放中） | `video.playbackRate === v`；继续播放；`currentTime` 不跳动 |
| 选择值 v（暂停中） | 保持暂停；之后点击播放按 v 倍速 |
| 重播 / 跳句 / 进入下一句 / 拖动进度条 | 速度不变 |
| `videoUrl` 变化，视频重新加载 | 在 `loadedmetadata` 后 `video.playbackRate === v` |
| `<video>` 尚未挂载时选择 v | 元素挂载后 `video.playbackRate === v` |
| 任意速度下播放到句尾 | 与 1x 一致：暂停，并调用 `onSentenceEnd(index, 'auto')` 一次 |

## 5. 可访问性

| 项 | 要求 |
|---|---|
| 角色 | 触发器 `role="combobox"`，`aria-haspopup="listbox"`（Base UI 自动提供） |
| 名称 | `aria-label="Playback speed"`（同时设置 `title`，与相邻按钮的 tooltip 风格一致） |
| 值 | 触发器文本即当前值（如 `1x`） |
| 键盘 | Tab 聚焦 → Enter/Space/↓ 打开 → ↑/↓ 移动 → Enter 选择 → Esc 关闭；关闭后焦点回到触发器 |
| 快捷键 | 不注册任何全局快捷键 |
