# Data Model: 视频播放器"上一句"按钮

**Feature**: `007-previous-sentence-button`

本功能**不涉及**数据库、API payload 或持久化结构的改动。下面只描述它读写的客户端状态。

## 实体与状态

### 当前句（Current Sentence）—— `page.tsx` 中的 `currentSentenceIndex: number`

| 属性 | 说明 |
|---|---|
| 取值范围 | `0 … subtitles.length - 1`（有效句子序列的下标；API 已重新编号，所以 `subtitles[i].index === i`） |
| 初值 | `GET /api/practice/[id]` → `userProgress.currentSentenceIndex`（缺省为 0） |
| "上一句" | `i → i - 1`，前提是 `i > 0` 且未处于锁定状态（见下文） |
| "下一句"/提交 | 不变：`saveProgress` 成功后 `i → sentenceIndex + 1` |

### 每句临时状态（随当前句切换一起重置）

| 字段 | 位置 | "上一句"时 |
|---|---|---|
| `userInput: string` | page | 置为 `''` |
| `currentFeedback: CheckResponse \| null` | page | 置为 `null` |
| `playbackRate` | VideoPlayer（006） | **保持**不变 |

### 导航锁（派生值，不新增 state）

```text
isPreviousLocked = isSavingProgress || isCheckingAccuracy
```

为 true 时，"上一句"不可用（见 research R3）。

### 已保存进度（Saved Progress）—— 服务器端 `UserExerciseProgress` / `UserDictationAttempt`

- "上一句"操作**只读不写**：不新增 attempt，不修改 `currentSentenceIndex`、`overallAccuracy`、`isCompleted`。
- 回退后提交时沿用现有的 `POST save-progress`：追加一条 attempt，并把 `currentSentenceIndex` 设为 `sentenceIndex + 1`（见 research R7-1 的已知限制）。

## 状态转换

```text
                  Previous (i>0, !locked)
   ┌──────────────── i ──────────────────► i-1 ─┐
   │   clear input/feedback; play(i-1) from start; │
   │   auto-pause at end(i-1); NO server write     │
   │                                               │
   │  Next/Skip/Submit (existing): saveProgress(i-1) ─► i
   └───────────────────────────────────────────────┘

   i == 0            → Previous disabled
   locked == true    → Previous disabled
```
