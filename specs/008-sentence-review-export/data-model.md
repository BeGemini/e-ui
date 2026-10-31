# Data Model: 练习句子记录、回顾页与导出

**Feature**: `008-sentence-review-export` | **Date**: 2026-10-31

本功能**不新增表**，复用现有的 `UserDictationAttempt` 作为“我的句子”记录，只增加一个唯一约束，并清理一次历史重复数据。其余都是接口和前端使用的视图模型，以及一次性生成、不落库的导出文档。

## 1. UserDictationAttempt（作答记录 / 我的句子）—— 已有表，新增约束

| 字段 | 类型 | 说明 | 本功能中的语义 |
|---|---|---|---|
| `attemptId` | CHAR(36) PK | UUID | 首次插入时生成；之后被覆盖时**保持不变** |
| `progressId` | CHAR(36) FK → `UserExerciseProgress.progressId`（CASCADE） | 所属学习者的练习进度 | 用于确定学习者和练习 |
| `sentenceIndex` | INT | 有效句子下标（从 0 开始，即套用合并/跳过配置后的下标） | 页面显示为 `Sentence {sentenceIndex + 1}` |
| `userInput` | TEXT | 学习者内容 | 原样保存：Check 保存 `trim()` 后的内容，与现有 save-progress 一致；Skip 时可以是空串 |
| `correctAnswer` | TEXT | 原文 | **保存时的原文快照**，回顾页和导出都显示它 |
| `accuracy` | DECIMAL(5,2) | 0–100 | Check 时为评分结果；Skip 时为 0 |
| `wordFeedback` | JSON | 逐词反馈 | 随每次保存覆盖 |
| `attemptDate` | TIMESTAMP | 保存时间 | **每次 upsert 都更新为 `NOW()`**，接口中对外字段名为 `savedAt` |

**新增约束**（`migrations/005_unique_dictation_attempt.sql`）：

- `UNIQUE INDEX uq_progress_sentence (progressId, sentenceIndex)`。保留原有的 `idx_progress`，它被 FK 使用，删除它没有收益。

**迁移前去重规则**（FR-004b）：每个 `(progressId, sentenceIndex)` 只保留 `attemptDate` 最新的一行；时间相同时保留 `attemptId` 较大的一行，其余行删除。SQL 见 research R1。

**写入规则**（FR-002、FR-003）：所有写入都走 `upsertAttempt`，SQL 为：

```text
INSERT (新 attemptId, progressId, sentenceIndex, userInput, correctAnswer, accuracy, wordFeedback, NOW())
ON DUPLICATE KEY UPDATE userInput, correctAnswer, accuracy, wordFeedback ← 新值; attemptDate ← NOW()
```

**写入来源**：

| 来源 | 触发 | 是否改变进度 |
|---|---|---|
| `POST save-attempt` | Check（或 Ctrl+Enter）评分成功后 | **否**：不改 `currentSentenceIndex`、`isCompleted`、`overallAccuracy` |
| `POST save-progress` | Next Sentence、Skip、播放器“下一句” | 是（现有逻辑不变）：`currentSentenceIndex = sentenceIndex + 1`，最后一句时标记完成 |

**生命周期**：没有记录 → 首次保存后**存在** → 后续每次保存都覆盖内容并更新时间。没有删除操作；只会随进度或练习删除被级联删除。重做练习时不清空记录。

## 2. UserExerciseProgress（练习进度）—— 已有表，不改结构

- 已有 `UNIQUE(userId, exerciseId)`。
- 新增共享函数 `getOrCreateProgress(userId, exerciseId)`：执行 `INSERT ... (currentSentenceIndex=0, isCompleted=0) ON DUPLICATE KEY UPDATE progressId = progressId` 后再 SELECT。save-attempt 和 save-progress 都使用它（FR-001 要求：没有进度时也能保存）。
- `overallAccuracy` 的计算代码不变；因为现在每句只有一条记录，平均值天然满足“每句只计一次”（FR-004a）。

## 3. Exercise（练习）—— 已有表，只读

- 回顾页和导出只用到 `exerciseId` 和 `title`。练习不存在时，sentences 接口返回 404（spec 中“练习被删除”的边界情况）。

## 4. 视图模型（TypeScript，加入 `lib/types.ts`）

```ts
// POST /api/practice/[exerciseId]/save-attempt 请求体
interface SaveAttemptRequest {
  sentenceIndex: number;        // 整数，>= 0
  userInput: string;            // trim 后非空
  correctText: string;          // 原文快照，非空
  accuracy: number;             // 0–100
  wordFeedback?: WordFeedback[];
}

// “我的句子”中的一条记录
interface MySentence {
  sentenceIndex: number;        // 从 0 开始
  userInput: string;            // 空串表示被跳过
  correctAnswer: string;        // 原文快照
  savedAt: string;              // ISO 8601
}

// GET /api/practice/[exerciseId]/sentences 响应
interface MySentencesResponse {
  success: true;
  exercise: { exerciseId: string; title: string };
  sentences: MySentence[];      // 按 sentenceIndex 升序，每个下标最多一条
}
```

**校验规则**（save-attempt，对应 FR-001、FR-004）：

- `sentenceIndex` 必须是 `Number.isInteger` 且 `>= 0`；
- `userInput.trim()` 不能为空（与 Check 的前置条件一致）；
- `correctText` 必须是非空字符串；
- `accuracy` 必须是 `0..100` 之间的有限数字；
- `wordFeedback` 如果提供，必须是数组。

校验失败返回 400，不写库。

## 5. 页面状态（`app/dashboard/[exerciseId]/sentences/page.tsx`）

| 状态 | 类型 | 初值 | 说明 |
|---|---|---|---|
| `data` | `MySentencesResponse \| null` | `null` | 进入页面时请求一次 |
| `status` | `'loading' \| 'ready' \| 'not-found' \| 'error'` | `'loading'` | 401 时跳转到 `/` |
| `showOriginal` | `boolean` | `false` | FR-008：只在当前会话有效，不持久化 |
| `exporting` | `'docx' \| 'pdf' \| null` | `null` | FR-015：非 null 时禁用导出触发器 |

派生值：`canExport = status === 'ready' && sentences.length > 0`（FR-011）。

## 6. 导出文档（一次性生成，不落库）

```ts
interface SentenceExportInput {
  title: string;                // 练习标题
  exportedAt: Date;             // 用于显示日期和生成文件名（本地时区）
  includeOriginal: boolean;     // = 导出时的 showOriginal（所见即所导）
  sentences: MySentence[];      // 与页面顺序一致
}
```

| 输出 | 生成函数 | MIME | 文件名 |
|---|---|---|---|
| DOCX | `buildDocx(input): Promise<Blob>` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `buildExportFilename(title, 'docx', exportedAt)` |
| PDF | `buildPdf(input): Promise<Blob>` | `application/pdf` | `buildExportFilename(title, 'pdf', exportedAt)` |

文档结构和样式见 [contracts/sentences-page-and-export.md](./contracts/sentences-page-and-export.md)。

## 7. 状态迁移：某一句的记录

```text
(无记录) --Check 成功--> [记录 v1]（进度不变）
(无记录) --Next/Skip--> [记录 v1]（进度 +1）
[记录 vN] --Check 成功--> [记录 vN+1]（覆盖，进度不变）
[记录 vN] --Next/Skip--> [记录 vN+1]（覆盖，进度 = 该句 + 1）
[记录 vN] --Check 失败 / 保存请求失败--> [记录 vN]（不变）
```
