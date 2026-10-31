# Contract: 作答保存接口（save-attempt 新增 / save-progress 行为变更）

**Feature**: `008-sentence-review-export`

两个接口都要求 `Authorization: Bearer <token>`，并使用 Next.js 16 的 Route Handler 签名：`(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> })`，在处理函数中 `await params`。

---

## 1. `POST /api/practice/[exerciseId]/save-attempt`（新增）

**用途**：Check 评分成功后，保存或覆盖该句的作答记录（FR-001、FR-002）。**不前进**、**不改变完成状态**。

**Request body**（`SaveAttemptRequest`，见 [data-model.md §4](../data-model.md)）：

```json
{
  "sentenceIndex": 1,
  "userInput": "Hello, world!",
  "correctText": "Hello world.",
  "accuracy": 92,
  "wordFeedback": [{ "correctWord": "hello", "userWord": "hello", "status": "correct" }]
}
```

**处理流程**：

1. `initializeDatabase()`，然后调用 `verifySessionFromRequest`。认证失败返回 401。
2. 校验请求体（规则见 data-model §4）。不通过返回 400。
3. 确认 `Exercise` 存在，否则返回 404。
4. `getOrCreateProgress(session.userId, exerciseId)`。
5. `upsertAttempt({ progressId, sentenceIndex, userInput: userInput.trim(), correctAnswer: correctText, accuracy, wordFeedback ?? [] })`。
6. **不执行**任何 `UPDATE UserExerciseProgress`。

**Responses**：

| Status | Body |
|---|---|
| 200 | `{ "success": true, "sentenceIndex": 1, "savedAt": "2026-10-31T12:34:56.000Z" }` |
| 400 | `{ "error": "Invalid request: <field>" }` |
| 401 | `{ "error": "Unauthorized: Authentication required" }` |
| 404 | `{ "error": "Exercise not found" }` |
| 500 | `{ "error": "Internal server error" }` |

**幂等性**：同一请求重复发送，结果都是同一条记录，只有 `savedAt` 会刷新。

**客户端约定**（练习页 `handleCheckAccuracy`）：

- 只在 `/check` 返回 `ok` 后调用（FR-004）；
- 先 `setCurrentFeedback` 显示反馈，再把保存请求追加到 `saveChainRef` 的串行队列中，不阻塞 UI；
- 请求失败时显示非 destructive 的 toast，例如 `Couldn't save your sentence`，不清除反馈，也不阻止继续练习。

---

## 2. `POST /api/practice/[exerciseId]/save-progress`（已有，仅变更写入语义）

**请求体、响应体、状态码（201）全部不变。**

| 项 | 变更前 | 变更后 |
|---|---|---|
| 写作答 | `INSERT`，同一句会产生重复行 | `upsertAttempt`：已有记录就覆盖，并更新 `attemptDate` |
| 已有记录时 | 新增一行 | 覆盖原行，**不报错、不新增**（FR-003） |
| 进度行不存在 | 内联 INSERT | `getOrCreateProgress`（可安全处理并发） |
| 前进 / 完成 / 计算 overallAccuracy | — | 不变；因为每句只有一条记录，平均值自然按每句计算一次（FR-004a） |

**客户端约定**（练习页 `saveProgress`）：发起请求前先 `await saveChainRef.current`，确保之前 Check 触发的保存请求已经落库，Next/Skip 的写入一定是最后一次写入。

---

## 3. 数据库迁移 `migrations/005_unique_dictation_attempt.sql`

按顺序执行：

1. 自连接 DELETE，去掉同一句的旧行（SQL 见 [research.md R1](../research.md)）。
2. `ALTER TABLE UserDictationAttempt ADD UNIQUE INDEX uq_progress_sentence (progressId, sentenceIndex);`

部署时由 `scripts/deploy.sh` 中的 `npm run db:migrate` 自动执行；本地开发需手动运行 `npm run db:migrate`。
