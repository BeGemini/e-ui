# API Contract: Practice & Check Accuracy

**Feature**: Subtitle Merge & Edit Optimization  
**Endpoint Base**: `/api/practice/[exerciseId]`  
**Methods**: GET, POST (check), POST (save-progress)

---

## GET /api/practice/[exerciseId]

Return exercise metadata, video URL, and the **effective** subtitle list for practice.

### Request

- Headers:
  - `Authorization: Bearer <token>`

### Response 200

```json
{
  "success": true,
  "data": {
    "exerciseId": "uuid",
    "videoUrl": "/api/video/<cosPath>",
    "subtitleFormat": "ass",
    "totalSentences": 12,
    "durationSeconds": 300,
    "subtitles": [
      {
        "index": 0,
        "text": "Clean normalized sentence one",
        "startSeconds": 0.0,
        "endSeconds": 5.2,
        "startTime": "0:00:00.00",
        "endTime": "0:00:05.20"
      }
    ],
    "userProgress": {
      "currentSentenceIndex": 0,
      "isCompleted": false
    }
  }
}
```

### Effective Subtitle Properties

- `index` is 0-based logical position after applying merge/skip config.
- `text` is the normalized display text; for merged groups, it uses `customText` if set, otherwise joins original texts with single spaces.
- Skipped sentences are **omitted** from this list.

---

## POST /api/practice/[exerciseId]/check

Compare user input against the correct text for the requested sentence.

### Request

- Headers:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- Body:

```json
{
  "sentenceIndex": 0,
  "userInput": "User typed dictation",
  "correctText": "Clean normalized sentence one"
}
```

### Validation Rules

- `sentenceIndex` must be a valid 0-based index in the **effective** subtitle list.
- `correctText` must match the effective subtitle text at `sentenceIndex` (server recomputes effective list; client value is used for comparison but verified).

### Response 200

```json
{
  "success": true,
  "sentenceIndex": 0,
  "userInput": "User typed dictation",
  "correctText": "Clean normalized sentence one",
  "accuracy": 80,
  "wordFeedback": [
    { "index": 0, "userWord": "User", "correctWord": "Clean", "status": "wrong" },
    { "index": 1, "userWord": "typed", "correctWord": "normalized", "status": "wrong" },
    { "index": 2, "userWord": "dictation", "correctWord": "sentence", "status": "wrong" },
    { "index": 3, "userWord": "", "correctWord": "one", "status": "wrong" }
  ],
  "summary": {
    "correct": 0,
    "acceptable": 0,
    "wrong": 4,
    "total": 4
  }
}
```

### Response 400

```json
{
  "error": "Correct text mismatch at sentence index 0"
}
```

---

## POST /api/practice/[exerciseId]/save-progress

Save user's dictation attempt and advance progress.

### Request

- Headers:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- Body:

```json
{
  "sentenceIndex": 0,
  "userInput": "User typed dictation",
  "accuracy": 80,
  "wordFeedback": [
    { "index": 0, "userWord": "User", "correctWord": "Clean", "status": "wrong" }
  ],
  "isCompleted": false
}
```

### Response 201

```json
{
  "success": true,
  "message": "Progress saved",
  "progress": {
    "progressId": "uuid",
    "userId": "uuid",
    "exerciseId": "uuid",
    "currentSentenceIndex": 1,
    "isCompleted": false
  }
}
```

---

## Notes

- All sentence indices in these endpoints are 0-based logical positions in the **effective** subtitle list.
- Client components should display `index + 1` to users for consistency with the Subtitle Management UI.
- Practice endpoints must apply `UserSubtitleConfig` server-side to ensure the answer key and player timing are consistent.
