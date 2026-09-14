# Contract: AI Knowledge Point Teaching API

**Endpoint**: `POST /api/ai/knowledge-point-teach`

**Authentication**: Required via `Authorization: Bearer <token>` header or session cookie.

## Request

### Headers

| Header | Value | Required |
|--------|-------|----------|
| Content-Type | application/json | yes |
| Authorization | Bearer <jwt_token> | yes (or valid session cookie) |

### Body

```json
{
  "capturedText": "desperate",
  "category": "word",
  "sourceSentence": "I've never been more desperate in my life."
}
```

### Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| capturedText | string | yes | 1–500 characters |
| category | string | yes | One of: `word`, `phrase`, `sentence` |
| sourceSentence | string | yes | Non-null string providing context |

## Response

### Success — 200 OK

```json
{
  "success": true,
  "data": {
    "explanation": "## Meaning\nDesperate means feeling or showing a hopeless sense that a situation is so bad as to be impossible to deal with.\n\n## Usage Scenarios\n- Describing someone who has run out of options\n- Expressing extreme need or urgency\n\n## Example Sentences\n1. I've never been more desperate in my life.\n2. The team made a desperate attempt to score in the final minute.\n\n## Similar / Alternative Expressions\n- hopeless\n- frantic\n- distraught\n- at one's wits' end"
  }
}
```

### Field

| Field | Type | Description |
|-------|------|-------------|
| data.explanation | string | Markdown explanation with four required sections |

### Validation Error — 400 Bad Request

```json
{
  "error": "Validation error: Captured text is required"
}
```

### Authentication Error — 401 Unauthorized

```json
{
  "error": "Unauthorized: Authentication required"
}
```

### AI Service Error — 502 Bad Gateway

```json
{
  "error": "AI service unavailable. Please try again later or enter a note manually."
}
```

## Required Explanation Sections

A successful response MUST contain the following Markdown sections:

1. `## Meaning` — definition or core explanation of `capturedText`.
2. `## Usage Scenarios` — common contexts where the expression is used.
3. `## Example Sentences` — at least one example; prefer examples related to the source sentence when appropriate.
4. `## Similar / Alternative Expressions` — synonyms, near-equivalents, or related phrases.

## Consumer

The `KnowledgePointCreateDialog` component calls this endpoint when the user clicks the "AI教学" button and writes `data.explanation` into the note `Textarea`.
