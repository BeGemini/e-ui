# Data Model: English Listening Dictation Practice App

**Date**: 2026-09-09 | **Status**: Design Complete - Ready for Implementation

**Purpose**: Define all database entities, relationships, and schemas for the feature

## Entity Relationship Diagram

```
Series
  ├──→ Season
         ├──→ Episode
                ├──→ Exercise
                       ├──→ UserExerciseProgress
                       │      └──→ UserDictationAttempt
                       └──→ UserSubtitleConfig

User
  ├──→ InvitationCode
  ├──→ UserExerciseProgress (via User.userId)
  ├──→ UserSubtitleConfig (via User.userId)
  └──→ UserDictationAttempt (via UserExerciseProgress)
```

## Core Entities

### 1. Series (电视剧 - Show)

**Purpose**: Top-level content grouping (e.g., "Desperate Housewives", "Breaking Bad")

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| seriesId | UUID | PRIMARY KEY | Unique identifier |
| title | VARCHAR(255) | NOT NULL, UNIQUE | Series title |
| description | TEXT | NULL | Long-form description |
| genre | VARCHAR(100) | NULL | e.g., "Drama", "Comedy" |
| difficulty | ENUM('beginner', 'intermediate', 'advanced') | NOT NULL | English level |
| coverImageUrl | VARCHAR(500) | NULL | COS URL to cover image |
| totalEpisodes | INT | DEFAULT 0 | Computed from Episode count |
| createdDate | TIMESTAMP | DEFAULT NOW() | When series was added |
| updatedDate | TIMESTAMP | DEFAULT NOW() ON UPDATE | Last modification |

**Indexes**:
- PRIMARY KEY (seriesId)
- UNIQUE INDEX (title)
- INDEX (difficulty)

**SQL Schema**:
```sql
CREATE TABLE Series (
  seriesId CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  genre VARCHAR(100),
  difficulty ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
  coverImageUrl VARCHAR(500),
  totalEpisodes INT DEFAULT 0,
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_difficulty (difficulty)
);
```

---

### 2. Season (季 - Season)

**Purpose**: Group episodes within a series

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| seasonId | UUID | PRIMARY KEY | Unique identifier |
| seriesId | UUID | FOREIGN KEY | Reference to Series |
| seasonNumber | INT | NOT NULL | Season number (1, 2, 3, ...) |
| description | TEXT | NULL | Season description |
| totalEpisodes | INT | DEFAULT 0 | Computed from Episode count |
| createdDate | TIMESTAMP | DEFAULT NOW() | When season was added |

**Indexes**:
- PRIMARY KEY (seasonId)
- FOREIGN KEY (seriesId) → Series(seriesId)
- UNIQUE INDEX (seriesId, seasonNumber)

**SQL Schema**:
```sql
CREATE TABLE Season (
  seasonId CHAR(36) PRIMARY KEY,
  seriesId CHAR(36) NOT NULL,
  seasonNumber INT NOT NULL,
  description TEXT,
  totalEpisodes INT DEFAULT 0,
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seriesId) REFERENCES Series(seriesId) ON DELETE CASCADE,
  UNIQUE INDEX idx_series_season (seriesId, seasonNumber)
);
```

---

### 3. Episode (集 - Episode)

**Purpose**: Individual episode within a season

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| episodeId | UUID | PRIMARY KEY | Unique identifier |
| seasonId | UUID | FOREIGN KEY | Reference to Season |
| episodeNumber | INT | NOT NULL | Episode number within season (1, 2, 3, ...) |
| title | VARCHAR(255) | NOT NULL | Episode title |
| description | TEXT | NULL | Episode description |
| totalExercises | INT | DEFAULT 0 | Computed from Exercise count |
| createdDate | TIMESTAMP | DEFAULT NOW() | When episode was added |

**Indexes**:
- PRIMARY KEY (episodeId)
- FOREIGN KEY (seasonId) → Season(seasonId)
- UNIQUE INDEX (seasonId, episodeNumber)

**SQL Schema**:
```sql
CREATE TABLE Episode (
  episodeId CHAR(36) PRIMARY KEY,
  seasonId CHAR(36) NOT NULL,
  episodeNumber INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  totalExercises INT DEFAULT 0,
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seasonId) REFERENCES Season(seasonId) ON DELETE CASCADE,
  UNIQUE INDEX idx_season_episode (seasonId, episodeNumber)
);
```

---

### 4. Exercise (练习 - Practice Exercise)

**Purpose**: Individual dictation exercise (video + subtitles)

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| exerciseId | UUID | PRIMARY KEY | Unique identifier |
| episodeId | UUID | FOREIGN KEY | Reference to Episode |
| videoUrl | VARCHAR(500) | NOT NULL | Full URL to video on Tencent COS |
| subtitleUrl | VARCHAR(500) | NOT NULL | Full URL to subtitle file on Tencent COS |
| subtitleFormat | ENUM('srt', 'vtt', 'ssa', 'ass') | NOT NULL | Subtitle file format |
| totalSentences | INT | NOT NULL | Total subtitle sentences (computed at creation) |
| durationSeconds | INT | NOT NULL | Video duration in seconds |
| difficulty | ENUM('beginner', 'intermediate', 'advanced') | NULL | Override series difficulty |
| createdDate | TIMESTAMP | DEFAULT NOW() | When exercise was added |
| updatedDate | TIMESTAMP | DEFAULT NOW() ON UPDATE | Last modification |

**Indexes**:
- PRIMARY KEY (exerciseId)
- FOREIGN KEY (episodeId) → Episode(episodeId)
- INDEX (episodeId) - for listing exercises per episode

**SQL Schema**:
```sql
CREATE TABLE Exercise (
  exerciseId CHAR(36) PRIMARY KEY,
  episodeId CHAR(36) NOT NULL,
  videoUrl VARCHAR(500) NOT NULL,
  subtitleUrl VARCHAR(500) NOT NULL,
  subtitleFormat ENUM('srt', 'vtt', 'ssa', 'ass') NOT NULL,
  totalSentences INT NOT NULL,
  durationSeconds INT NOT NULL,
  difficulty ENUM('beginner', 'intermediate', 'advanced'),
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (episodeId) REFERENCES Episode(episodeId) ON DELETE CASCADE,
  INDEX idx_episode (episodeId)
);
```

---

### 5. User (用户 - User Account)

**Purpose**: User account and authentication

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| userId | UUID | PRIMARY KEY | Unique identifier |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Email address (login credential) |
| passwordHash | VARCHAR(255) | NOT NULL | Hashed password (bcrypt or scrypt) |
| role | ENUM('admin', 'user') | NOT NULL, DEFAULT 'user' | User role (admin creates exercises, user practices) |
| registrationDate | TIMESTAMP | DEFAULT NOW() | When account was created |
| lastLoginDate | TIMESTAMP | NULL | Last login timestamp |
| isActive | BOOLEAN | DEFAULT TRUE | Account status (false = deleted/suspended) |

**Indexes**:
- PRIMARY KEY (userId)
- UNIQUE INDEX (email)
- INDEX (role) - for filtering admin users

**SQL Schema**:
```sql
CREATE TABLE User (
  userId CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  registrationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lastLoginDate TIMESTAMP NULL,
  isActive BOOLEAN DEFAULT TRUE,
  INDEX idx_role (role)
);
```

---

### 6. InvitationCode (邀请码)

**Purpose**: One-time registration tokens for user acquisition/monetization

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| codeId | UUID | PRIMARY KEY | Unique identifier |
| code | VARCHAR(50) | NOT NULL, UNIQUE | The actual code (e.g., "ABC123XYZ") |
| expiryDate | TIMESTAMP | NOT NULL | When code expires (cannot register after) |
| isUsed | BOOLEAN | DEFAULT FALSE | Whether code has been used |
| usedByUserId | UUID | FOREIGN KEY NULL | Which user registered with this code |
| createdDate | TIMESTAMP | DEFAULT NOW() | When code was generated |

**Indexes**:
- PRIMARY KEY (codeId)
- UNIQUE INDEX (code)
- INDEX (expiryDate) - for cleanup queries
- INDEX (isUsed) - for finding available codes
- FOREIGN KEY (usedByUserId) → User(userId)

**SQL Schema**:
```sql
CREATE TABLE InvitationCode (
  codeId CHAR(36) PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  expiryDate TIMESTAMP NOT NULL,
  isUsed BOOLEAN DEFAULT FALSE,
  usedByUserId CHAR(36) NULL,
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usedByUserId) REFERENCES User(userId) ON DELETE SET NULL,
  INDEX idx_expiry (expiryDate),
  INDEX idx_used (isUsed)
);
```

---

### 7. UserExerciseProgress (用户练习进度)

**Purpose**: Track user's progress through an exercise

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| progressId | UUID | PRIMARY KEY | Unique identifier |
| userId | UUID | FOREIGN KEY | Reference to User |
| exerciseId | UUID | FOREIGN KEY | Reference to Exercise |
| currentSentenceIndex | INT | NOT NULL, DEFAULT 0 | Last completed sentence (0-based) |
| isCompleted | BOOLEAN | DEFAULT FALSE | Whether user finished exercise |
| overallAccuracy | DECIMAL(5,2) | NULL | Average accuracy (0-100) when completed |
| completionDate | TIMESTAMP | NULL | When user finished (if completed) |
| lastAccessDate | TIMESTAMP | DEFAULT NOW() ON UPDATE | Last time accessed |
| createdDate | TIMESTAMP | DEFAULT NOW() | When progress record created |

**Indexes**:
- PRIMARY KEY (progressId)
- FOREIGN KEY (userId) → User(userId)
- FOREIGN KEY (exerciseId) → Exercise(exerciseId)
- UNIQUE INDEX (userId, exerciseId) - one progress record per user per exercise
- INDEX (isCompleted) - for filtering completed exercises

**SQL Schema**:
```sql
CREATE TABLE UserExerciseProgress (
  progressId CHAR(36) PRIMARY KEY,
  userId CHAR(36) NOT NULL,
  exerciseId CHAR(36) NOT NULL,
  currentSentenceIndex INT NOT NULL DEFAULT 0,
  isCompleted BOOLEAN DEFAULT FALSE,
  overallAccuracy DECIMAL(5,2),
  completionDate TIMESTAMP NULL,
  lastAccessDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(userId) ON DELETE CASCADE,
  FOREIGN KEY (exerciseId) REFERENCES Exercise(exerciseId) ON DELETE CASCADE,
  UNIQUE INDEX idx_user_exercise (userId, exerciseId),
  INDEX idx_completed (isCompleted)
);
```

---

### 8. UserDictationAttempt (用户录音尝试)

**Purpose**: Record of each user's dictation attempt for a sentence (for review/analytics)

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| attemptId | UUID | PRIMARY KEY | Unique identifier |
| progressId | UUID | FOREIGN KEY | Reference to UserExerciseProgress |
| sentenceIndex | INT | NOT NULL | Which sentence in the exercise (0-based) |
| userInput | TEXT | NOT NULL | What the user typed |
| correctAnswer | TEXT | NOT NULL | The correct subtitle text |
| accuracy | DECIMAL(5,2) | NOT NULL | Accuracy percentage (0-100) |
| wordFeedback | JSON | NOT NULL | Array of word-level feedback (see below) |
| timestamp | TIMESTAMP | DEFAULT NOW() | When attempt was made |

**WordFeedback JSON Structure**:
```json
[
  {
    "word": "hello",
    "userWord": "helo",
    "status": "acceptable"  // "correct" | "acceptable" | "wrong"
  },
  {
    "word": "world",
    "userWord": "world",
    "status": "correct"
  }
]
```

**Indexes**:
- PRIMARY KEY (attemptId)
- FOREIGN KEY (progressId) → UserExerciseProgress(progressId)
- INDEX (progressId) - for retrieving all attempts for a user's exercise

**SQL Schema**:
```sql
CREATE TABLE UserDictationAttempt (
  attemptId CHAR(36) PRIMARY KEY,
  progressId CHAR(36) NOT NULL,
  sentenceIndex INT NOT NULL,
  userInput TEXT NOT NULL,
  correctAnswer TEXT NOT NULL,
  accuracy DECIMAL(5,2) NOT NULL,
  wordFeedback JSON NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (progressId) REFERENCES UserExerciseProgress(progressId) ON DELETE CASCADE,
  INDEX idx_progress (progressId)
);
```

---

### 9. UserSubtitleConfig (用户字幕配置)

**Purpose**: Per-user subtitle customization (merge/skip) for each exercise

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| configId | UUID | PRIMARY KEY | Unique identifier |
| userId | UUID | FOREIGN KEY | Reference to User |
| exerciseId | UUID | FOREIGN KEY | Reference to Exercise |
| mergedGroups | JSON | NOT NULL, DEFAULT '[]' | Array of merged sentence ranges |
| skippedSentences | JSON | NOT NULL, DEFAULT '[]' | Array of sentence indices to skip |
| createdDate | TIMESTAMP | DEFAULT NOW() | When config was created |
| modifiedDate | TIMESTAMP | DEFAULT NOW() ON UPDATE | Last modification |

**MergedGroups JSON Structure**:
```json
[
  {
    "startIndex": 0,
    "endIndex": 2,
    "label": "Introduction"
  },
  {
    "startIndex": 3,
    "endIndex": 5,
    "label": "Main scene"
  }
]
```

**SkippedSentences JSON Structure**:
```json
[1, 4, 7]  // Indices of sentences to skip
```

**Indexes**:
- PRIMARY KEY (configId)
- FOREIGN KEY (userId) → User(userId)
- FOREIGN KEY (exerciseId) → Exercise(exerciseId)
- UNIQUE INDEX (userId, exerciseId) - one config per user per exercise

**SQL Schema**:
```sql
CREATE TABLE UserSubtitleConfig (
  configId CHAR(36) PRIMARY KEY,
  userId CHAR(36) NOT NULL,
  exerciseId CHAR(36) NOT NULL,
  mergedGroups JSON NOT NULL DEFAULT '[]',
  skippedSentences JSON NOT NULL DEFAULT '[]',
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modifiedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(userId) ON DELETE CASCADE,
  FOREIGN KEY (exerciseId) REFERENCES Exercise(exerciseId) ON DELETE CASCADE,
  UNIQUE INDEX idx_user_exercise_config (userId, exerciseId)
);
```

---

## Key Design Decisions

### 1. Series/Season/Episode Hierarchy

**Rationale**: Organizes content like real TV shows with multiple seasons and episodes
- Enables browsing by series, then season, then episode
- Supports future admin UI for managing content hierarchy
- Familiar UX pattern for learners

**Trade-off**: One extra table (Season) vs. simpler flat structure
- Justified by content organization value and potential admin features

### 2. Separate UserSubtitleConfig Entity

**Rationale**: Independent subtitle customization per user
- Each user can customize the same exercise differently
- Settings isolated from other users
- Enables future "copy admin settings" feature (by copying JSON)

**Alternative Considered**: Store config in UserExerciseProgress
- Rejected: Coupling would require migrations if progress is reset

### 3. JSON Columns for Feedback and Config

**Rationale**: Flexibility for evolving feedback formats and merge/skip definitions
- WordFeedback can expand with additional fields (e.g., phonetic suggestion)
- MergedGroups can include labels, notes, difficulty overrides
- Avoids schema migrations for new properties

**Performance**: JSON queries are indexed in MySQL 5.7+; acceptable for this scale

### 4. One-to-One User → InvitationCode Relationship

**Rationale**: Support monetization model
- Each invitation code registers exactly one user (isUsed + usedByUserId)
- Enables tracking code usage, expiration, and potential refunds

**Alternative Considered**: Multiple users per code
- Rejected: Contradicts one-time-use monetization model

### 5. Soft Delete for Users (isActive Flag)

**Rationale**: Preserve data integrity and historical records
- User deletion supported (per requirements)
- Historical practice data remains (for analytics)
- Can restore deleted accounts if needed

**Implementation**: Queries should filter WHERE isActive = TRUE

### 6. Auto-Updated Counters (totalEpisodes, totalSentences)

**Rationale**: Denormalization for query performance
- Avoids COUNT queries on join tables
- Trigger-based updates maintain accuracy

**Trade-off**: Slightly stale data if triggers fail
- Acceptable for this use case; batch reconciliation can fix

---

## Validation Rules & Constraints

### User Entity
- `email`: Valid email format, unique, case-insensitive comparison
- `passwordHash`: Minimum 60 characters (bcrypt output)
- `role`: Only 'admin' or 'user'

### InvitationCode Entity
- `code`: Alphanumeric, minimum 8 characters
- `expiryDate`: Cannot be in the past at creation time
- `isUsed`: True only if usedByUserId is NOT NULL

### Exercise Entity
- `totalSentences`: Must match parsed subtitle line count
- `durationSeconds`: Must be positive
- `videoUrl` and `subtitleUrl`: Valid HTTPS URLs to COS

### UserExerciseProgress Entity
- `currentSentenceIndex`: Must be < Exercise.totalSentences
- `overallAccuracy`: 0-100 when isCompleted = true
- `completionDate`: Can only be set if isCompleted = true

### UserDictationAttempt Entity
- `accuracy`: 0-100
- `wordFeedback`: Must be valid JSON array
- `sentenceIndex`: Must be < Exercise.totalSentences

### UserSubtitleConfig Entity
- `mergedGroups`: No overlapping ranges
- `skippedSentences`: All indices must be < Exercise.totalSentences
- `skippedSentences`: Cannot include indices < UserExerciseProgress.currentSentenceIndex (read-only constraint with inclusive boundary: users can only modify sentences at index >= currentSentenceIndex)

---

## Indexes Summary

**Performance-Critical Indexes**:
1. `UserExerciseProgress(userId, exerciseId)` - Resume exercise flow
2. `UserDictationAttempt(progressId)` - Retrieve attempt history
3. `UserSubtitleConfig(userId, exerciseId)` - Load subtitle config
4. `InvitationCode(code)` - Validate registration code
5. `User(email)` - Login lookup
6. `Exercise(episodeId)` - List exercises for episode
7. `Episode(seasonId)` - List episodes for season
8. `Season(seriesId)` - List seasons for series

---

## Data Migration Strategy

**Initial Setup**:
1. Create tables in dependency order (Series → Season → Episode → Exercise → User → InvitationCode → UserExerciseProgress → UserDictationAttempt → UserSubtitleConfig)
2. Create indexes after table creation
3. Create database triggers for auto-incrementing counters (optional; can use application logic)

**Seed Data**:
1. Seed Series/Season/Episode/Exercise hierarchy
2. Seed sample InvitationCodes with future expiry dates
3. Seed test User accounts (admin + learner)
4. Seed sample UserExerciseProgress for testing resume flow

**Rollback**:
- Drop tables in reverse order (with CASCADE for foreign keys)
