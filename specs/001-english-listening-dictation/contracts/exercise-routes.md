# API Route Contracts: Exercise Management

**Feature**: English Listening Dictation Practice App  
**Version**: 1.0.0  
**Last Updated**: 2026-09-09

---

## GET /api/exercises

**Purpose**: List all exercises organized by Series → Seasons → Episodes hierarchy

**Authentication**: Required (Bearer token)

**Query Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| difficulty | string | No | Filter by difficulty: "beginner", "intermediate", "advanced" |
| search | string | No | Search by series/season/episode title |
| page | number | No | Page number (default: 1, 20 results per page) |
| limit | number | No | Results per page (default: 20, max: 100) |

**Response (200 OK)**:
```typescript
{
  series: Array<{
    seriesId: string;
    title: string;
    description?: string;
    genre?: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    coverImageUrl?: string;
    totalEpisodes: number;
    seasons: Array<{
      seasonId: string;
      seriesId: string;
      seasonNumber: number;
      description?: string;
      totalEpisodes: number;
      episodes: Array<{
        episodeId: string;
        seasonId: string;
        episodeNumber: number;
        title: string;
        description?: string;
        totalExercises: number;
      }>;
    }>;
  }>;
  total: number;              // Total number of series (before pagination)
  page: number;               // Current page
  limit: number;              // Results per page
  hasMore: boolean;           // Whether more pages exist
}
```

**Errors**:

| Code | Condition | Response |
|------|-----------|----------|
| 401 | Unauthorized | `{ error: "Unauthorized" }` |
| 400 | Invalid query params | `{ error: "Invalid difficulty value" }` |
| 500 | Database error | `{ error: "Internal server error" }` |

**Business Logic**:
1. Verify authentication token
2. Parse query parameters (validate difficulty, page, limit)
3. Build SQL query:
   - SELECT Series WHERE difficulty matches filter
   - JOINs with Season (1:N)
   - JOINs with Episode (1:N)
   - Optionally filter by search text (LIKE on title)
   - Apply pagination (LIMIT, OFFSET)
4. For each series, include only seasons, and for each season include episodes
5. Do NOT include Exercise details (too deep in hierarchy)
6. Return with pagination metadata

**Example Usage**:
```bash
curl -X GET "http://localhost:3000/api/exercises?difficulty=beginner&page=1" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## GET /api/exercises/[exerciseId]

**Purpose**: Get a single exercise's metadata (does not include raw subtitles)

**Authentication**: Required (Bearer token)

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| exerciseId | string | Yes | UUID of exercise |

**Query Parameters**: None

**Response (200 OK)**:
```typescript
{
  exerciseId: string;
  episodeId: string;
  episode: {
    episodeId: string;
    seasonId: string;
    episodeNumber: number;
    title: string;
    season: {
      seasonId: string;
      seriesId: string;
      seasonNumber: number;
      series: {
        seriesId: string;
        title: string;
        difficulty: "beginner" | "intermediate" | "advanced";
      };
    };
  };
  videoUrl: string;           // Full COS URL to video
  subtitleFormat: "srt" | "vtt" | "ssa" | "ass";
  totalSentences: number;
  durationSeconds: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
  createdDate: string;        // ISO 8601 timestamp
  updatedDate: string;        // ISO 8601 timestamp
  userProgress?: {            // Only included if user has started exercise
    progressId: string;
    currentSentenceIndex: number;
    isCompleted: boolean;
    overallAccuracy?: number;
    lastAccessDate: string;
  };
}
```

**Errors**:

| Code | Condition | Response |
|------|-----------|----------|
| 401 | Unauthorized | `{ error: "Unauthorized" }` |
| 404 | Exercise not found | `{ error: "Exercise not found" }` |
| 500 | Database error | `{ error: "Internal server error" }` |

**Business Logic**:
1. Verify authentication
2. Query Exercise by exerciseId with JOINs to Episode, Season, Series
3. Query UserExerciseProgress for current user + exerciseId (if exists, include userProgress)
4. Return metadata (do NOT return raw subtitle file content)

**Example Usage**:
```bash
curl -X GET "http://localhost:3000/api/exercises/abc123" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## GET /api/exercises/[exerciseId]/progress

**Purpose**: Get user's progress record for an exercise (for resuming)

**Authentication**: Required (Bearer token)

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| exerciseId | string | Yes | UUID of exercise |

**Response (200 OK)**:
```typescript
{
  progressId: string;
  userId: string;
  exerciseId: string;
  currentSentenceIndex: number;  // Last completed sentence (0-based)
  isCompleted: boolean;
  overallAccuracy?: number;      // Only if isCompleted = true
  completionDate?: string;       // ISO 8601 timestamp, only if completed
  lastAccessDate: string;        // ISO 8601 timestamp
  createdDate: string;           // ISO 8601 timestamp
  attempts: Array<{              // Recent 10 attempts
    attemptId: string;
    sentenceIndex: number;
    userInput: string;
    correctAnswer: string;
    accuracy: number;
    timestamp: string;
  }>;
}
```

**Errors**:

| Code | Condition | Response |
|------|-----------|----------|
| 401 | Unauthorized | `{ error: "Unauthorized" }` |
| 404 | Exercise not found | `{ error: "Exercise not found" }` |
| 404 | No progress | `{ error: "No progress found - start from sentence 0" }` |
| 500 | Database error | `{ error: "Internal server error" }` |

**Business Logic**:
1. Verify authentication
2. Verify Exercise exists
3. Query UserExerciseProgress for userId + exerciseId
4. If not found, return 404 (user should start from beginning)
5. Query last 10 UserDictationAttempts for this progress record
6. Return progress with attempts

**Example Usage**:
```bash
curl -X GET "http://localhost:3000/api/exercises/abc123/progress" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## POST /api/exercises/[exerciseId]/start

**Purpose**: Initialize a new practice session (create UserExerciseProgress if not exists)

**Authentication**: Required (Bearer token)

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| exerciseId | string | Yes | UUID of exercise |

**Request**:
```typescript
{}  // Empty body
```

**Response (201 Created or 200 OK)**:
```typescript
{
  progressId: string;
  userId: string;
  exerciseId: string;
  currentSentenceIndex: number;  // 0 if new, or last saved index if resuming
  isCompleted: boolean;
  overallAccuracy?: number;
  message: string;               // "Practice session started" or "Resuming from sentence X"
}
```

**Errors**:

| Code | Condition | Response |
|------|-----------|----------|
| 401 | Unauthorized | `{ error: "Unauthorized" }` |
| 404 | Exercise not found | `{ error: "Exercise not found" }` |
| 500 | Database error | `{ error: "Internal server error" }` |

**Business Logic**:
1. Verify authentication
2. Verify Exercise exists
3. Check if UserExerciseProgress exists for user + exercise
4. If exists, return 200 with existing progress (resume case)
5. If not exists, create new UserExerciseProgress (currentSentenceIndex=0)
6. Return 201 with new progress

**Example Usage**:
```bash
curl -X POST "http://localhost:3000/api/exercises/abc123/start" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## TypeScript Types (for reference)

```typescript
interface SeriesInfo {
  seriesId: string;
  title: string;
  description?: string;
  genre?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  coverImageUrl?: string;
  totalEpisodes: number;
}

interface SeasonInfo {
  seasonId: string;
  seriesId: string;
  seasonNumber: number;
  description?: string;
  totalEpisodes: number;
}

interface EpisodeInfo {
  episodeId: string;
  seasonId: string;
  episodeNumber: number;
  title: string;
  description?: string;
  totalExercises: number;
}

interface ExerciseMetadata {
  exerciseId: string;
  episodeId: string;
  videoUrl: string;
  subtitleFormat: "srt" | "vtt" | "ssa" | "ass";
  totalSentences: number;
  durationSeconds: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
  createdDate: string;
  updatedDate: string;
  userProgress?: UserProgressSummary;
}

interface UserProgressSummary {
  progressId: string;
  currentSentenceIndex: number;
  isCompleted: boolean;
  overallAccuracy?: number;
  lastAccessDate: string;
}

interface UserExerciseProgressDetail {
  progressId: string;
  userId: string;
  exerciseId: string;
  currentSentenceIndex: number;
  isCompleted: boolean;
  overallAccuracy?: number;
  completionDate?: string;
  lastAccessDate: string;
  createdDate: string;
  attempts: DictationAttemptSummary[];
}

interface DictationAttemptSummary {
  attemptId: string;
  sentenceIndex: number;
  userInput: string;
  correctAnswer: string;
  accuracy: number;
  timestamp: string;
}
```
