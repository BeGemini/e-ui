# UI Contract: VideoPlayer"上一句"按钮

**Feature**: `007-previous-sentence-button` | **Component**: `app/components/video-player/VideoPlayer.tsx`

## 1. 组件对外接口（新增两个可选 prop）

```ts
interface VideoPlayerProps {
  // ...existing props unchanged...
  /** Called when the user activates "Previous sentence". The parent owns the
   *  sentence index and is responsible for switching + playback. */
  onPreviousSentence?: () => void;
  /** Extra lock from the parent (e.g. save/check in flight). Defaults to false. */
  isPreviousDisabled?: boolean;
}
```

- `VideoPlayerRef.playSentenceAtIndex` **保持不变**。父组件回退后调用它来播放目标句。
- `onSentenceEnd` 的签名和语义**不变**。"上一句"**绝不**触发 `onSentenceEnd`。
- 两个 prop 都是可选的。不传 `onPreviousSentence` 时按钮为禁用状态，现有调用方行为不变。

## 2. 渲染与位置

- 放在控制区 `<div className="flex items-center justify-center gap-2">` 的**第一个**位置。完整顺序：Previous、Play/Pause、Replay、Next（Skip & Continue）、Speed。
- 使用 shadcn `Button`，`variant="outline" size="sm"`，`className` 与 Next 按钮完全相同（含 `disabled:text-gray-500`）。
- 图标：lucide `SkipBack`，`size={16}`。

## 3. 状态

| 条件 | 按钮 |
|---|---|
| `!onPreviousSentence` | disabled |
| `!currentSubtitle` | disabled |
| `currentSentenceIndex <= 0` | disabled |
| `isPreviousDisabled === true` | disabled |
| 其他 | enabled |

## 4. 行为

- 点击、Enter 或 Space（按钮 enabled 时）→ 调用一次 `onPreviousSentence()`。播放器本身**不**修改 `<video>` 的时间或播放状态。
- disabled 时不调用任何回调。

## 5. 可访问性

- `aria-label="Previous sentence"`，`title="Previous sentence"`（悬停提示）。
- 原生 `<button>` 语义（Base UI Button）。disabled 时输出原生 `disabled` 属性；焦点环沿用 shadcn `focus-visible:ring`。

## 6. 父组件（练习页）义务

`page.tsx` 中的 `handlePreviousSentence`：

1. 如果 `currentSentenceIndex <= 0 || isSavingProgress || isCheckingAccuracy`，直接 return。
2. `prev = currentSentenceIndex - 1`；`setCurrentSentenceIndex(prev)`；`setUserInput('')`；`setCurrentFeedback(null)`。
3. `setTimeout(() => videoPlayerRef.current?.playSentenceAtIndex(prev), 0)`（与 `advanceToNextSentence` 相同的模式）。
4. **不**调用 `saveProgress`、`fetch` 或 `onSentenceEnd`。

传参：`onPreviousSentence={handlePreviousSentence}`，`isPreviousDisabled={isSavingProgress || isCheckingAccuracy}`。
