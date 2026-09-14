# API Contract: Knowledge Points

**Feature**: Exercise Knowledge Points  
**Endpoint Base**: `/api/knowledge-points/[exerciseId]`  
**Methods**: GET, POST, PATCH, DELETE

## Authentication

All endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

## GET /api/knowledge-points/[exerciseId]

Return all knowledge points created by the authenticated user for the given exercise.

### Response 200

```json
{
  "success": true,
  "data": [
    {
      "knowledgePointId": "uuid",
      "userId": "uuid",
      "exerciseId": "uuid",
      "sourceSentenceIndex": 3,
      "capturedText": "look forward to",
      "category": "phrase",
      "description": "表示期待某事",
      "createdDate": "2026-09-13T10:00:00.000Z",
      "updatedDate": "2026-09-13T10:00:00.000Z"
    }
  ]
}
```

---

## POST /api/knowledge-points/[exerciseId]

Create a new knowledge point for the authenticated user and exercise.

### Request

- Headers:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- Body:

```json
{
  "sourceSentenceIndex": 3,
  "capturedText": "look forward to",
  "category": "phrase",
  "description": "表示期待某事"
}
```

### Validation Rules

- `sourceSentenceIndex` must be a non-negative integer that corresponds to a valid effective sentence index in the exercise.
- `capturedText` must be non-empty and, after whole-word normalization, a substring of the effective subtitle text at `sourceSentenceIndex`.
- `category` must be one of `word`, `phrase`, `sentence`.
- `description` must be non-empty and no longer than 2000 characters.
- `(userId, exerciseId, capturedText)` must be unique; duplicate requests are ignored and the existing knowledge point may be returned.

### Response 201

```json
{
  "success": true,
  "data": {
    "knowledgePointId": "uuid",
    "userId": "uuid",
    "exerciseId": "uuid",
    "sourceSentenceIndex": 3,
    "capturedText": "look forward to",
    "category": "phrase",
    "description": "表示期待某事",
    "createdDate": "2026-09-13T10:00:00.000Z",
    "updatedDate": "2026-09-13T10:00:00.000Z"
  }
}
```

### Response 409 (duplicate)

```json
{
  "success": true,
  "data": {
    "knowledgePointId": "existing-uuid",
    "capturedText": "look forward to",
    "description": "Existing description"
  }
}
```

> Note: Returning the existing record keeps the client experience smooth; HTTP status may remain 200 or 409 depending on implementation choice, but the response must make it clear the duplicate was not created.

---

## PATCH /api/knowledge-points/[exerciseId]/[knowledgePointId]

Update the category and/or description of an existing knowledge point.

### Request

- Headers:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- Body (all fields optional, at least one required):

```json
{
  "category": "word",
  "description": "Updated note"
}
```

### Validation Rules

- `category`, if provided, must be one of `word`, `phrase`, `sentence`.
- `description`, if provided, must be non-empty and no longer than 2000 characters.
- The knowledge point must belong to the authenticated user and the given exercise.

### Response 200

```json
{
  "success": true,
  "data": {
    "knowledgePointId": "uuid",
    "category": "word",
    "description": "Updated note",
    "updatedDate": "2026-09-13T11:00:00.000Z"
  }
}
```

### Response 404

```json
{
  "error": "Knowledge point not found"
}
```

---

## DELETE /api/knowledge-points/[exerciseId]/[knowledgePointId]

Delete a knowledge point owned by the authenticated user.

### Request

- Headers:
  - `Authorization: Bearer <token>`

### Response 200

```json
{
  "success": true,
  "message": "Knowledge point deleted"
}
```

### Response 404

```json
{
  "error": "Knowledge point not found"
}
```

---

## Extended Practice Endpoint

### GET /api/practice/[exerciseId]

The existing practice endpoint should include the user's knowledge points so the client can render highlights without an extra round trip.

#### Additional Response Field

```json
{
  "success": true,
  "data": {
    "exerciseId": "uuid",
    "videoUrl": "/api/video/<cosPath>",
    "subtitles": [...],
    "userProgress": { ... },
    "knowledgePoints": [
      {
        "knowledgePointId": "uuid",
        "sourceSentenceIndex": 3,
        "capturedText": "look forward to",
        "category": "phrase",
        "description": "表示期待某事"
      }
    ]
  }
}
```

## Extended Exercises Endpoint

### GET /api/exercises

The existing exercises endpoint should include the count of knowledge points per exercise for the authenticated user.

#### Additional Response Field

```json
{
  "seriesId": "uuid",
  "title": "...",
  "seasons": [
    {
      "seasonId": "uuid",
      "episodes": [
        {
          "episodeId": "uuid",
          "exercises": [
            {
              "exerciseId": "uuid",
              "title": "...",
              "completed": false,
              "currentProgress": 2,
              "knowledgePointCount": 5
            }
          ]
        }
      ]
    }
  ]
}
```

## Notes

- All sentence indices are 0-based effective sentence indices (after merge/skip configuration).
- `capturedText` matching is exact substring matching against the current effective subtitle text.
- Knowledge points are private; endpoints must verify that the authenticated user owns the requested resource.
