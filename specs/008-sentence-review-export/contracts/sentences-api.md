# Contract: `GET /api/practice/[exerciseId]/sentences`（新增）

**Feature**: `008-sentence-review-export`

**用途**：为“我的句子”页面提供当前学习者在某个练习中的全部作答记录和练习标题（FR-006、FR-007）。

**Auth**：`Authorization: Bearer <token>`，服务端用 `verifySessionFromRequest` 校验。

**Handler 签名**：`GET(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> })`

## 处理流程

1. 认证失败时返回 401。
2. `SELECT exerciseId, title FROM Exercise WHERE exerciseId = ?`，查不到时返回 404。
3. 查询记录：

   ```sql
   SELECT a.sentenceIndex, a.userInput, a.correctAnswer, a.attemptDate
   FROM UserDictationAttempt a
   JOIN UserExerciseProgress p ON p.progressId = a.progressId
   WHERE p.userId = ? AND p.exerciseId = ?
   ORDER BY a.sentenceIndex ASC
   ```

   只按当前用户的 `session.userId` 过滤，不接受任何 userId 参数（FR-007）。
4. 把 `attemptDate` 转成 ISO 字符串，作为 `savedAt` 返回。没有进度或没有记录时，返回 `sentences: []`（状态码仍为 200）。

## Responses

**200**（`MySentencesResponse`）：

```json
{
  "success": true,
  "exercise": { "exerciseId": "…", "title": "S01E01 – Pilot" },
  "sentences": [
    { "sentenceIndex": 0, "userInput": "Hi, I'm Mary Alice.", "correctAnswer": "Hi. I'm Mary Alice Young.", "savedAt": "2026-10-31T12:00:00.000Z" },
    { "sentenceIndex": 2, "userInput": "", "correctAnswer": "It was a beautiful day.", "savedAt": "2026-10-31T12:01:00.000Z" }
  ]
}
```

| Status | Body | 页面行为 |
|---|---|---|
| 200 | 如上 | 渲染列表；`sentences` 为空时显示空状态 |
| 401 | `{ "error": "Unauthorized: Authentication required" }` | `router.push('/')` |
| 404 | `{ "error": "Exercise not found" }` | 显示 “Exercise not found” 和返回按钮 |
| 500 | `{ "error": "Internal server error" }` | 显示错误提示 |

**保证**：

- `sentences` 按 `sentenceIndex` 严格升序排列，每个下标最多出现一次（由唯一约束保证）。
- 总是返回 `correctAnswer`；是否显示由客户端开关决定（SC-004）。
