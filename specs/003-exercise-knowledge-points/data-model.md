# Data Model: Exercise Knowledge Points

**Feature**: Exercise Knowledge Points  
**Created**: 2026-09-13  
**Status**: Design Complete - Ready for Implementation

## Purpose

Define the database entities, relationships, and schemas needed to let learners capture, categorize, highlight, and manage knowledge points derived from dictation Correct Text.

## Entity Relationship Diagram

```text
User
  ├──→ KnowledgePoint
  │       └──→ Exercise
  │       └──→ Subtitle (via sourceSentenceIndex)
  ├──→ UserExerciseProgress
  └──→ UserSubtitleConfig

Exercise
  ├──→ KnowledgePoint (via exerciseId)
  └──→ UserExerciseProgress
```

## Core Entities

### 1. KnowledgePoint (知识点 - Learning Note)

**Purpose**: Represents a learning note captured by a user from a subtitle sentence.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| knowledgePointId | CHAR(36) | PRIMARY KEY | Unique identifier |
| userId | CHAR(36) | NOT NULL, FOREIGN KEY → User(userId), ON DELETE CASCADE | Learner who created the point |
| exerciseId | CHAR(36) | NOT NULL, FOREIGN KEY → Exercise(exerciseId), ON DELETE CASCADE | Exercise the point belongs to |
| sourceSentenceIndex | INT | NOT NULL | 0-based index of the source subtitle sentence within the exercise (effective sentence index) |
| capturedText | VARCHAR(500) | NOT NULL | Exact substring of the Correct Text captured as the knowledge point, after whole-word normalization |
| category | ENUM('word', 'phrase', 'sentence') | NOT NULL | Classification of the captured text |
| description | TEXT | NOT NULL | User's personal note about the knowledge point |
| createdDate | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When the knowledge point was created |
| updatedDate | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last modification |

**Indexes**:

- PRIMARY KEY (knowledgePointId)
- FOREIGN KEY (userId) → User(userId) ON DELETE CASCADE
- FOREIGN KEY (exerciseId) → Exercise(exerciseId) ON DELETE CASCADE
- UNIQUE INDEX idx_user_exercise_text (userId, exerciseId, capturedText) — prevents duplicate knowledge points
- INDEX idx_user_exercise (userId, exerciseId) — list page and dashboard count queries
- INDEX idx_source_sentence (exerciseId, sourceSentenceIndex) — optional, for future per-sentence lookups

**SQL Schema**:

```sql
CREATE TABLE IF NOT EXISTS KnowledgePoint (
  knowledgePointId CHAR(36) PRIMARY KEY COMMENT 'UUID',
  userId CHAR(36) NOT NULL COMMENT 'Reference to User',
  exerciseId CHAR(36) NOT NULL COMMENT 'Reference to Exercise',
  sourceSentenceIndex INT NOT NULL COMMENT '0-based effective sentence index within the exercise',
  capturedText VARCHAR(500) NOT NULL COMMENT 'Captured substring after whole-word normalization',
  category ENUM('word', 'phrase', 'sentence') NOT NULL COMMENT 'Knowledge point category',
  description TEXT NOT NULL COMMENT 'User note',
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
  updatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update',
  FOREIGN KEY (userId) REFERENCES User(userId) ON DELETE CASCADE,
  FOREIGN KEY (exerciseId) REFERENCES Exercise(exerciseId) ON DELETE CASCADE,
  UNIQUE INDEX idx_user_exercise_text (userId, exerciseId, capturedText),
  INDEX idx_user_exercise (userId, exerciseId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Validation Rules**:

- `capturedText` must be a non-empty substring of the current subtitle sentence after whole-word normalization.
- `category` is one of `word`, `phrase`, `sentence`.
- `description` must be non-empty and should have a reasonable maximum length (e.g., 2000 characters).
- Duplicate `(userId, exerciseId, capturedText)` combinations are not allowed.

---

### 2. KnowledgePointCategory (知识点分类 - Classification)

**Purpose**: Defines the three knowledge point categories and their visual colors.

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| category | ENUM('word', 'phrase', 'sentence') | Classification identifier |
| label | VARCHAR(50) | Human-readable label |
| colorClass | VARCHAR(100) | Tailwind CSS class for highlights and badges |
| fallbackColor | VARCHAR(7) | Hex color for non-CSS contexts (e.g., inline styles) |

**Defined Values**:

| category | label | suggested colorClass | suggested fallbackColor |
|----------|-------|----------------------|-------------------------|
| word | Word | `bg-blue-200 text-blue-900` | `#bfdbfe` |
| phrase | Phrase | `bg-green-200 text-green-900` | `#bbf7d0` |
| sentence | Sentence | `bg-purple-200 text-purple-900` | `#e9d5ff` |

**Notes**:

- Category colors are application constants, not database rows.
- The exact Tailwind classes should be chosen to satisfy WCAG 2.1 AA contrast when overlapping.

---

## Derived Views / API Output Shapes

### ExerciseWithKnowledgePointCount

Returned by the extended `/api/exercises` endpoint.

```ts
interface ExerciseInHierarchy extends Exercise {
  completed?: boolean;
  currentProgress?: number;
  knowledgePointCount?: number;
}
```

### PracticeDataWithKnowledgePoints

Returned by the extended `/api/practice/[exerciseId]` GET endpoint.

```ts
interface PracticeData {
  exerciseId: string;
  videoUrl: string;
  subtitleFormat: string;
  totalSentences: number;
  durationSeconds: number;
  subtitles: Subtitle[];
  userProgress: { ... };
  knowledgePoints: KnowledgePoint[]; // user's knowledge points for this exercise
}
```

## State Transitions

### Create Knowledge Point

1. Learner selects text in the Correct Text area.
2. Frontend normalizes selection to whole word boundaries within the current sentence.
3. Floating action menu appears; learner chooses "Create knowledge point".
4. Dialog opens; learner selects category and enters description.
5. `POST /api/knowledge-points/[exerciseId]` is called with `capturedText`, `category`, `description`, `sourceSentenceIndex`.
6. Server validates data and inserts a new `KnowledgePoint` row.
7. On success, the Correct Text re-renders to highlight the new segment.

### Update Knowledge Point

1. Learner opens the knowledge point list page.
2. Chooses "Edit" on an existing knowledge point.
3. Changes category and/or description.
4. `PATCH /api/knowledge-points/[exerciseId]/[knowledgePointId]` is called.
5. Server validates and updates the row.
6. `updatedDate` changes automatically.

### Delete Knowledge Point

1. Learner chooses "Delete" on an existing knowledge point and confirms.
2. `DELETE /api/knowledge-points/[exerciseId]/[knowledgePointId]` is called.
3. Server removes the row.
4. Dashboard count and Correct Text highlights update accordingly.

## Relationships

```text
User 1--* KnowledgePoint
Exercise 1--* KnowledgePoint
KnowledgePoint *--1 Subtitle (logical reference via sourceSentenceIndex)
```

## Migration

See [migrations/003_add_knowledge_points.sql](../migrations/003_add_knowledge_points.sql) for the full SQL.

## Notes

- The `capturedText` is stored exactly as it appears in the normalized Correct Text. It is used for substring matching during rendering.
- If a knowledge point's `capturedText` no longer appears in the current Correct Text (due to subtitle edits), the row is preserved but not highlighted.
- `sourceSentenceIndex` refers to the **effective** sentence index after merge/skip configuration is applied, aligning with the practice endpoint's subtitle list.
