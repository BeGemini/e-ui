# Contract: Fetch TED Talks

## Endpoint

`POST /api/admin/exercises/fetch-ted`

采集一个公开 TED Talk 的视频与英文字幕，上传至本项目 COS 并验证。该请求可能持续最多 300 秒，不创建 Exercise。

### Authentication

与现有管理端点一致：`Authorization: Bearer <token>`。未认证返回 `401`，非管理员返回 `403`。

### Request

Headers: `Content-Type: application/json`

```json
{
  "url": "https://www.ted.com/talks/surya_ganguli_can_ai_match_the_human_brain"
}
```

| Field | Required | Validation |
|---|---|---|
| `url` | yes | trim 后 1–2000 字符；HTTPS；hostname 精确为 `www.ted.com`；路径仅匹配 `/talks/<slug>` |

Unknown fields are ignored. Empty, malformed, non-TED, playlist, search and other non-talk URLs return `400` without contacting TED.

### Success Response

`200 OK`

```json
{
  "videoUrl": "TED/145110-surya_ganguli_can_ai_match_the_human_brain/7f0d35d5-2d7f-4f4f-a1c1-d87a87bd0f33.mp4",
  "subtitleUrl": "TED/145110-surya_ganguli_can_ai_match_the_human_brain/7f0d35d5-2d7f-4f4f-a1c1-d87a87bd0f33.vtt",
  "probe": {
    "ok": true,
    "video": {
      "key": "TED/145110-surya_ganguli_can_ai_match_the_human_brain/7f0d35d5-2d7f-4f4f-a1c1-d87a87bd0f33.mp4",
      "ok": true,
      "durationSeconds": 1030
    },
    "subtitle": {
      "key": "TED/145110-surya_ganguli_can_ai_match_the_human_brain/7f0d35d5-2d7f-4f4f-a1c1-d87a87bd0f33.vtt",
      "ok": true,
      "subtitleFormat": "vtt",
      "totalSentences": 325,
      "lastCueEndSeconds": 1025.5
    },
    "warnings": []
  }
}
```

- `videoUrl` and `subtitleUrl` are COS object keys, not external TED URLs; names match the existing exercise form and create contract.
- Numeric values above are illustrative; clients must use actual probe values.
- A success response always includes both resources and `probe.ok === true`.
- The client assigns these paths and the returned probe together; the administrator confirms with the existing Save exercise action and may run Validate resources again if desired.

### Error Responses

Validation errors keep the existing admin shape:

`400 Bad Request`

```json
{
  "error": "Validation failed",
  "fieldErrors": {
    "url": ["Enter a valid TED Talk URL"]
  }
}
```

Processing failures use:

```json
{
  "error": "English subtitles are not available for this talk",
  "code": "ENGLISH_SUBTITLES_UNAVAILABLE",
  "field": "url"
}
```

| Status | Code | Meaning |
|---|---|---|
| `400` | `INVALID_URL` (or `fieldErrors`) | Input is not a supported TED Talk page |
| `401` | existing auth response | Missing or invalid token |
| `403` | existing auth response | Authenticated user is not an administrator |
| `404` | `TALK_NOT_FOUND` | TED reports that the talk page does not exist |
| `422` | `VIDEO_UNAVAILABLE` | No supported HLS video resource |
| `422` | `ENGLISH_SUBTITLES_UNAVAILABLE` | No complete English WebVTT resource |
| `422` | `RESOURCE_VALIDATION_FAILED` | Uploaded media does not pass the existing probe |
| `500` | `FFMPEG_UNAVAILABLE` | Server prerequisite is missing; retry only after installation |
| `500` | `STORAGE_UPLOAD_FAILED` | COS is not configured or upload failed |
| `502` | `UPSTREAM_FETCH_FAILED` | TED page, metadata or subtitle fetch failed |
| `502` | `MEDIA_CONVERSION_FAILED` | HLS could not be converted to a valid MP4 |
| `504` | `TIMEOUT` | The 300-second operation deadline was reached |

All error responses contain a human-readable `error`; logs may contain diagnostic detail but responses never include secrets, stack traces or temporary server paths. Client disconnect/cancellation has no success response and must not update a later draft.

### Compatibility

No change to `POST /api/admin/exercises/probe` or `POST /api/admin/exercises`. Their existing request and response contracts remain authoritative for manual and TED-assisted creation.
