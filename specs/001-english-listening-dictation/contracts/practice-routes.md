# API Route Contracts: Practice & Dictation

**Feature**: English Listening Dictation Practice App  
**Version**: 1.0.0  
**Last Updated**: 2026-09-09

---

## GET /api/practice/[exerciseId]

**Purpose**: Get exercise content ready for playback (parsed subtitles with user's config applied)

**Authentication**: Required (Bearer token)

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| exerciseId | string | Yes | UUID of exercise |

**Response (200 OK)**:
```typescript
{
  exerciseId: string;
  videoUrl: string;              // Direct URL to video on Tencent COS (MP4/WebM)
  subtitleFormat: "srt" | "vtt" | "ssa" | "ass";
  totalSentences: number;
  durationSeconds: number;
  subtitles: Array<{
    index: number;               // 0-based sentence index
    start: number;               // Start time in seconds
    end: number;                 // End time in seconds
    text: string;                // Subtitle text
    userConfigured: {
      isMerged: boolean;         // True if part of merged group
      isSkipped: boolean;        // True if user marked as skip
      mergedLabel?: string;      // Label for merged group (if applicable)
    };
  }>;
  userProgress: {
    currentSentenceIndex: number;
    isCompleted: boolean;
    overallAccuracy?: number;
  };
}
```

**Errors**:

| Code | Condition | Response |
|------|-----------|----------|
| 401 | Unauthorized | `{ error: "Unauthorized" }` |
| 404 | Exercise not found | `{ error: "Exercise not found" }` |
| 500 | Subtitle parsing error | `{ error: "Failed to parse subtitle file" }` |
| 500 | Database error | `{ error: "Internal server error" }` |

**Business Logic**:
1. Verify authentication
2. Query Exercise by exerciseId
3. Verify Exercise.subtitleUrl is accessible on COS
4. Download and parse subtitle file based on subtitleFormat (SRT/VTT/SSA/ASS)
5. Query UserSubtitleConfig for userId + exerciseId
6. Apply user's merge and skip configuration:
   - Mark sentences as isMerged=true if in mergedGroups
   - Mark sentences as isSkipped=true if in skippedSentences
7. Query UserExerciseProgress for progress status
8. Return all sentences (including skipped ones, but marked as skipped)
9. **Important**: Return ALL sentences; frontend applies filtering for playback

**Performance Note**: Subtitle parsing should be <100ms for typical 50-200 sentence exercise

**Example Usage**:
```bash
curl -X GET "http://localhost:3000/api/practice/abc123" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Example Response**:
```json
{
  "exerciseId": "abc123",
  "videoUrl": "https://bucket.cos.ap-beijing.myqcloud.com/video1.mp4",
  "subtitleFormat": "srt",
  "totalSentences": 127,
  "durationSeconds": 3456,
  "subtitles": [
    {
      "index": 0,
      "start": 0,
      "end": 2.5,
      "text": "Hello everyone.",
      "userConfigured": { "isMerged": false, "isSkipped": false }
    },
    {
      "index": 1,
      "start": 2.6,
      "end": 5.2,
      "text": "Welcome to our show.",
      "userConfigured": { "isMerged": true, "isSkipped": false, "mergedLabel": "Intro" }
    }
  ],
  "userProgress": { "currentSentenceIndex": 0, "isCompleted": false }
}
```

---

## POST /api/practice/[exerciseId]/check

**Purpose**: Check user's dictation input and return word-level accuracy feedback

**Authentication**: Required (Bearer token)

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| exerciseId | string | Yes | UUID of exercise |

**Request**:
```typescript
{
  sentenceIndex: number;   // 0-based index of the sentence being checked
  userInput: string;       // User's dictated text
}
```

**Response (200 OK)**:
```typescript
{
  sentenceIndex: number;
  userInput: string;
  correctAnswer: string;
  accuracy: number;        // 0-100, calculated as (correct + acceptable) / total_words * 100
  wordFeedback: Array<{
    word: string;          // Correct word from subtitle
    userWord: string;      // User's input word (or empty if missing)
    status: "correct" | "acceptable" | "wrong";
    // "correct": exact match (case-insensitive)
    // "acceptable": Levenshtein distance <= 2 characters
    // "wrong": completely wrong or missing word
  }>;
}
```

**Errors**:

| Code | Condition | Response |
|------|-----------|----------|
| 400 | Missing required fields | `{ error: "Missing required fields: [field names]" }` |
| 401 | Unauthorized | `{ error: "Unauthorized" }` |
| 404 | Exercise not found | `{ error: "Exercise not found" }` |
| 400 | Invalid sentence index | `{ error: "Sentence index out of range (0-126)" }` |
| 500 | Database error | `{ error: "Internal server error" }` |

**Business Logic**:
1. Verify authentication
2. Validate sentenceIndex (0 <= index < totalSentences)
3. Get correct answer from parsed subtitles
4. Tokenize user input and correct answer (split by spaces, lowercase)
5. Compare word-by-word using Levenshtein distance:
   - If distance = 0 → "correct"
   - If 0 < distance <= 2 → "acceptable"
   - If distance > 2 → "wrong"
   - If user word is empty (missing word) → "wrong"
6. Calculate accuracy: (count of correct + count of acceptable) / total_words * 100
7. Do NOT persist data yet (frontend will call save-progress)
8. Return feedback

**Word Tokenization**:
- Split by spaces and punctuation
- Remove leading/trailing whitespace
- Lowercase for comparison
- Preserve original casing in response

**Levenshtein Distance Calculation**:
```
Example: "hello" vs "helo" → distance = 1 (one character deletion)
Example: "hello" vs "hallo" → distance = 1 (one character substitution)
Example: "hello" vs "xyz" → distance = 5 (completely different)
```

**Example Usage**:
```bash
curl -X POST "http://localhost:3000/api/practice/abc123/check" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "sentenceIndex": 0,
    "userInput": "Helo everyone"
  }'
```

**Example Response**:
```json
{
  "sentenceIndex": 0,
  "userInput": "Helo everyone",
  "correctAnswer": "Hello everyone",
  "accuracy": 50.0,
  "wordFeedback": [
    {
      "word": "hello",
      "userWord": "helo",
      "status": "acceptable"
    },
    {
      "word": "everyone",
      "userWord": "everyone",
      "status": "correct"
    }
  ]
}
```

---

## POST /api/practice/[exerciseId]/save-progress

**Purpose**: Save user's dictation attempt and update progress

**Authentication**: Required (Bearer token)

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| exerciseId | string | Yes | UUID of exercise |

**Request**:
```typescript
{
  sentenceIndex: number;   // Which sentence was attempted
  userInput: string;       // What user typed
  accuracy: number;        // Accuracy percentage (0-100)
  wordFeedback: Array<{    // From /check endpoint
    word: string;
    userWord: string;
    status: "correct" | "acceptable" | "wrong";
  }>;
  isCompleted: boolean;    // Whether exercise is finished
  overallAccuracy?: number; // When isCompleted=true, overall accuracy for entire exercise
}
```

**Response (200 OK)**:
```typescript
{
  attemptId: string;
  progressId: string;
  sentenceIndex: number;
  savedAt: string;         // ISO 8601 timestamp
  userProgress: {
    currentSentenceIndex: number; // Updated to sentenceIndex
    isCompleted: boolean;
    overallAccuracy?: number;
  };
  message: string;         // "Progress saved" or "Exercise completed"
}
```

**Errors**:

| Code | Condition | Response |
|------|-----------|----------|
| 400 | Missing required fields | `{ error: "Missing required fields: [field names]" }` |
| 401 | Unauthorized | `{ error: "Unauthorized" }` |
| 404 | Exercise not found | `{ error: "Exercise not found" }` |
| 400 | Invalid sentence index | `{ error: "Sentence index out of range" }` |
| 500 | Database error | `{ error: "Internal server error" }` |

**Business Logic**:
1. Verify authentication
2. Verify Exercise and UserExerciseProgress exist
3. Create UserDictationAttempt with:
   - progressId (from UserExerciseProgress)
   - sentenceIndex
   - userInput
   - correctAnswer (from parsed subtitles)
   - accuracy
   - wordFeedback (as JSON)
   - timestamp = NOW()
4. Update UserExerciseProgress:
   - currentSentenceIndex = sentenceIndex
   - If isCompleted=true:
     - Set isCompleted=true
     - Set overallAccuracy from request
     - Set completionDate=NOW()
   - Update lastAccessDate=NOW()
5. Return success with updated progress

**Called On**: After user clicks "Next" on each sentence; also called on page close/unload

**Example Usage**:
```bash
curl -X POST "http://localhost:3000/api/practice/abc123/save-progress" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "sentenceIndex": 0,
    "userInput": "Helo everyone",
    "accuracy": 50.0,
    "wordFeedback": [
      { "word": "hello", "userWord": "helo", "status": "acceptable" },
      { "word": "everyone", "userWord": "everyone", "status": "correct" }
    ],
    "isCompleted": false
  }'
```

---

## TypeScript Types (for reference)

```typescript
interface PracticeSessionResponse {
  exerciseId: string;
  videoUrl: string;
  subtitleFormat: "srt" | "vtt" | "ssa" | "ass";
  totalSentences: number;
  durationSeconds: number;
  subtitles: SubtitleLine[];
  userProgress: ProgressStatus;
}

interface SubtitleLine {
  index: number;
  start: number;
  end: number;
  text: string;
  userConfigured: {
    isMerged: boolean;
    isSkipped: boolean;
    mergedLabel?: string;
  };
}

interface CheckRequest {
  sentenceIndex: number;
  userInput: string;
}

interface CheckResponse {
  sentenceIndex: number;
  userInput: string;
  correctAnswer: string;
  accuracy: number;
  wordFeedback: WordFeedback[];
}

interface WordFeedback {
  word: string;
  userWord: string;
  status: "correct" | "acceptable" | "wrong";
}

interface SaveProgressRequest {
  sentenceIndex: number;
  userInput: string;
  accuracy: number;
  wordFeedback: WordFeedback[];
  isCompleted: boolean;
  overallAccuracy?: number;
}

interface SaveProgressResponse {
  attemptId: string;
  progressId: string;
  sentenceIndex: number;
  savedAt: string;
  userProgress: ProgressStatus;
  message: string;
}

interface ProgressStatus {
  currentSentenceIndex: number;
  isCompleted: boolean;
  overallAccuracy?: number;
}
```
