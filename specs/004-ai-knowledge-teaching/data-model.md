# Data Model: AI Knowledge Point Teaching

**Feature**: AI Knowledge Point Teaching
**Date**: 2026-09-14

## Entities

### Knowledge Point (existing)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| knowledgePointId | string (UUID) | yes | Primary key |
| userId | string (UUID) | yes | Owner |
| exerciseId | string (UUID) | yes | Parent exercise |
| sourceSentenceIndex | integer | yes | 0-based index of the source sentence |
| capturedText | string | yes | Text selected by the user |
| category | enum('word', 'phrase', 'sentence') | yes | Type of knowledge point |
| description | string (≤ 2000 chars) | yes | Note text, which may now contain AI-generated content |
| createdDate | timestamp | yes | Creation time |
| updatedDate | timestamp | yes | Last update time |

**No schema changes are required** for this feature. The AI-generated explanation is stored as plain Markdown text in the existing `description` field.

### AI Teaching Request

A transient request payload sent from the client to the backend.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| capturedText | string | yes | The text the user wants explained |
| category | enum('word', 'phrase', 'sentence') | yes | Knowledge point category |
| sourceSentence | string | yes | The full sentence where the captured text appears |

### AI Teaching Response

A transient response returned by the backend.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| explanation | string | yes | Markdown explanation with four required sections |

## Validation Rules

- `capturedText` must be non-empty and no longer than 500 characters.
- `category` must be one of `word`, `phrase`, or `sentence`.
- `sourceSentence` must be provided (may be empty string if unavailable, but should be avoided).
- AI-generated `explanation` must be truncated or rejected if it exceeds 2000 characters to fit the `description` column limit.

## State Transitions

This feature is stateless from a persistence perspective:

1. User opens the create knowledge point dialog.
2. User optionally clicks "AI教学".
3. Backend requests an explanation from DeepSeek.
4. Client populates the note field with the returned Markdown.
5. User edits the explanation or types a manual note.
6. User clicks Save, which persists the final `description` value using the existing knowledge point creation API.

No new lifecycle states are introduced for the `KnowledgePoint` entity.

## Relationships

- AI Teaching Request → references `KnowledgePoint.capturedText` and `KnowledgePoint.category`.
- AI Teaching Response → becomes the `KnowledgePoint.description` after user review and save.
- Source sentence context → maps to the subtitle text associated with `sourceSentenceIndex`.
