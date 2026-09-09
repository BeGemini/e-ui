# API Route Contracts: Subtitle Configuration

**Feature**: English Listening Dictation Practice App  
**Version**: 1.0.0  
**Last Updated**: 2026-09-09

---

## GET /api/subtitles/[exerciseId]/config

**Purpose**: Get user's subtitle customization configuration (merge/skip settings)

**Authentication**: Required (Bearer token)

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| exerciseId | string | Yes | UUID of exercise |

**Response (200 OK)**:
```typescript
{
  configId: string;
  userId: string;
  exerciseId: string;
  mergedGroups: Array<{
    startIndex: number;    // First sentence in group (0-based)
    endIndex: number;      // Last sentence in group (inclusive)
    label?: string;        // Optional label for the group
  }>;
  skippedSentences: number[]; // Array of sentence indices marked as skip (0-based)
  currentProgress: number;    // Current sentence index from UserExerciseProgress (read-only barrier)
  createdDate: string;        // ISO 8601 timestamp
  modifiedDate: string;       // ISO 8601 timestamp
}
```

**Errors**:

| Code | Condition | Response |
|------|-----------|----------|
| 401 | Unauthorized | `{ error: "Unauthorized" }` |
| 404 | Exercise not found | `{ error: "Exercise not found" }` |
| 404 | No config found | Returns default config with empty merge/skip arrays |
| 500 | Database error | `{ error: "Internal server error" }` |

**Business Logic**:
1. Verify authentication
2. Verify Exercise exists
3. Query UserSubtitleConfig for userId + exerciseId
4. If not found, create default config (empty mergedGroups, empty skippedSentences)
5. Query UserExerciseProgress for currentProgress (read-only barrier)
6. Return config with currentProgress included

**Default Config** (if not exists):
```json
{
  "mergedGroups": [],
  "skippedSentences": [],
  "currentProgress": 0
}
```

**Example Usage**:
```bash
curl -X GET "http://localhost:3000/api/subtitles/abc123/config" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Example Response**:
```json
{
  "configId": "config-uuid",
  "userId": "user-uuid",
  "exerciseId": "abc123",
  "mergedGroups": [
    { "startIndex": 0, "endIndex": 2, "label": "Introduction" },
    { "startIndex": 10, "endIndex": 12, "label": "Main scene" }
  ],
  "skippedSentences": [8, 9, 20],
  "currentProgress": 3,
  "createdDate": "2026-09-09T10:00:00Z",
  "modifiedDate": "2026-09-09T12:30:00Z"
}
```

---

## PUT /api/subtitles/[exerciseId]/config

**Purpose**: Update user's subtitle merge and skip configuration

**Authentication**: Required (Bearer token)

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| exerciseId | string | Yes | UUID of exercise |

**Request**:
```typescript
{
  mergedGroups: Array<{
    startIndex: number;    // First sentence in group (0-based)
    endIndex: number;      // Last sentence in group (inclusive, >= startIndex)
    label?: string;        // Optional label
  }>;
  skippedSentences: number[]; // Array of sentence indices (0-based, all < totalSentences)
}
```

**Response (200 OK)**:
```typescript
{
  configId: string;
  userId: string;
  exerciseId: string;
  mergedGroups: Array<{
    startIndex: number;
    endIndex: number;
    label?: string;
  }>;
  skippedSentences: number[];
  updatedAt: string;          // ISO 8601 timestamp
  appliesNextPlayback: boolean; // Always true (changes apply immediately)
  message: string;            // "Configuration updated successfully"
}
```

**Errors**:

| Code | Condition | Response |
|------|-----------|----------|
| 400 | Missing required fields | `{ error: "Missing required fields: [field names]" }` |
| 400 | Invalid indices | `{ error: "Sentence indices out of range (0-126)" }` |
| 400 | Overlapping groups | `{ error: "Merged groups cannot overlap" }` |
| 400 | Editing locked sentences | `{ error: "Cannot modify sentences before current progress (3)" }` |
| 401 | Unauthorized | `{ error: "Unauthorized" }` |
| 404 | Exercise not found | `{ error: "Exercise not found" }` |
| 500 | Database error | `{ error: "Internal server error" }` |

**Business Logic**:

1. Verify authentication
2. Verify Exercise exists and get totalSentences
3. Query UserExerciseProgress for currentProgress
4. **VALIDATION - Read-Only Constraint**:
   - For each index in mergedGroups (startIndex, endIndex) and skippedSentences:
     - If index < currentProgress, reject with error
     - Rationale: Cannot modify already-completed sentences
5. **VALIDATION - Range Check**:
   - All indices must be: 0 <= index < totalSentences
   - startIndex <= endIndex for each merge group
6. **VALIDATION - Overlap Check**:
   - No merge groups can overlap (e.g., [0-2] and [2-4] overlap at index 2)
7. If validation fails, return 400 with specific error
8. Query or create UserSubtitleConfig for userId + exerciseId
9. Update fields:
   - mergedGroups (as JSON)
   - skippedSentences (as JSON array)
   - modifiedDate = NOW()
10. Return updated config

**Important Security Note**: The read-only constraint prevents users from changing their answers retroactively. If a user has completed sentences 0-3, they cannot merge or skip sentences 0-3. They can only modify sentences 4 onwards.

**Example Usage**:
```bash
curl -X PUT "http://localhost:3000/api/subtitles/abc123/config" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "mergedGroups": [
      { "startIndex": 3, "endIndex": 5, "label": "First scene" },
      { "startIndex": 10, "endIndex": 12, "label": "Second scene" }
    ],
    "skippedSentences": [8, 9, 20]
  }'
```

**Example Error Response** (read-only violation):
```json
{
  "error": "Cannot modify sentences before current progress (3)",
  "code": "LOCKED_SENTENCES",
  "details": {
    "currentProgress": 3,
    "attemptedIndices": [0, 1, 2],
    "lockedIndices": [0, 1, 2]
  }
}
```

---

## DELETE /api/subtitles/[exerciseId]/config

**Purpose**: Reset user's subtitle configuration to defaults (clear all merge/skip)

**Authentication**: Required (Bearer token)

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| exerciseId | string | Yes | UUID of exercise |

**Request**:
```typescript
{}  // No body
```

**Response (200 OK)**:
```typescript
{
  configId: string;
  exerciseId: string;
  message: string;  // "Configuration reset to defaults"
  resetTo: {
    mergedGroups: [];
    skippedSentences: [];
  };
}
```

**Errors**:

| Code | Condition | Response |
|------|-----------|----------|
| 401 | Unauthorized | `{ error: "Unauthorized" }` |
| 404 | Exercise not found | `{ error: "Exercise not found" }` |
| 404 | No config found | `{ error: "No configuration to reset" }` |
| 500 | Database error | `{ error: "Internal server error" }` |

**Business Logic**:
1. Verify authentication
2. Verify Exercise exists
3. Query UserSubtitleConfig for userId + exerciseId
4. If not found, return 404
5. Set mergedGroups = [] and skippedSentences = []
6. Update modifiedDate = NOW()
7. Return success

**Example Usage**:
```bash
curl -X DELETE "http://localhost:3000/api/subtitles/abc123/config" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## Subtitle Format Support

All formats must be parsed into a normalized sentence array with timing:

### SRT Format
```
1
00:00:00,000 --> 00:00:02,500
Hello everyone.

2
00:00:02,600 --> 00:00:05,200
Welcome to our show.
```

### VTT Format
```
WEBVTT

00:00:00.000 --> 00:00:02.500
Hello everyone.

00:00:02.600 --> 00:00:05.200
Welcome to our show.
```

### SSA/ASS Format
```
[V4+ Styles]
Format: Name, ...
Style: Default,...

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:02.50,Default,,0,0,0,,Hello everyone.
Dialogue: 0,0:00:02.60,0:00:05.20,Default,,0,0,0,,Welcome to our show.
```

### Normalized Output (for all formats)
```typescript
[
  {
    index: 0,
    start: 0.0,      // seconds
    end: 2.5,        // seconds
    text: "Hello everyone."
  },
  {
    index: 1,
    start: 2.6,
    end: 5.2,
    text: "Welcome to our show."
  }
]
```

---

## TypeScript Types (for reference)

```typescript
interface SubtitleConfig {
  configId: string;
  userId: string;
  exerciseId: string;
  mergedGroups: MergedGroup[];
  skippedSentences: number[];
  currentProgress: number;
  createdDate: string;
  modifiedDate: string;
}

interface MergedGroup {
  startIndex: number;
  endIndex: number;
  label?: string;
}

interface UpdateSubtitleConfigRequest {
  mergedGroups: MergedGroup[];
  skippedSentences: number[];
}

interface SubtitleConfigResponse {
  configId: string;
  userId: string;
  exerciseId: string;
  mergedGroups: MergedGroup[];
  skippedSentences: number[];
  updatedAt: string;
  appliesNextPlayback: boolean;
  message: string;
}

interface ResetConfigResponse {
  configId: string;
  exerciseId: string;
  message: string;
  resetTo: {
    mergedGroups: [];
    skippedSentences: [];
  };
}

interface SubtitleValidationError {
  error: string;
  code: string;
  details?: {
    currentProgress?: number;
    attemptedIndices?: number[];
    lockedIndices?: number[];
    reason?: string;
  };
}
```

---

## Merge/Skip Logic (Frontend Implementation)

### Playback with User Config

1. **Fetch exercise with config**: GET /api/practice/[exerciseId]
2. **Filter for playback**:
   ```typescript
   const playableSubtitles = subtitles
     .filter(s => !s.userConfigured.isSkipped)
     .map(s => ({
       ...s,
       text: s.userConfigured.isMerged 
         ? mergedGroup.text  // Combined text for merged sentences
         : s.text
     }))
   ```
3. **Auto-pause logic**:
   - When current time >= subtitle.end, pause video
   - Only count non-skipped subtitles for progress
4. **Accuracy calculation** (backend):
   - Compare userInput with correctAnswer
   - When calculating overallAccuracy, exclude only this user's skipped sentences
   - Formula: (sum of accuracies for non-skipped) / (count of non-skipped)

### Merge Group Text Rendering

When displaying merged subtitles:
```
Merged group [3-5]:
  "This is sentence three. This is sentence four. This is sentence five."
  
Display timing: Start of sentence 3, End of sentence 5
Video auto-pause: After sentence 5 ends
```

---

## Read-Only Constraint Explanation

**Why Read-Only Before Current Progress?**

User completes sentences 0-3 with specific accuracy scores. If they were allowed to retroactively:
- Merge sentences 0-2 together
- Skip sentence 1

Their historical accuracy records would become invalid. The constraint prevents this:
- Sentences 0-3 are "locked" once completed
- User can only configure sentences 4+ (not yet completed)
- This maintains historical data integrity

**Implementation**:
```typescript
// In PUT endpoint:
if (Math.min(...editedIndices) < currentProgress) {
  return 400 error: "Cannot modify sentences before current progress"
}
```

This prevents accidental or intentional data manipulation of completed work.
