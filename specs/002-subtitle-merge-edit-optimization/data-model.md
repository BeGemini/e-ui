# Data Model: Subtitle Merge & Edit Optimization

**Feature**: Subtitle Merge & Edit Optimization  
**Created**: 2026-09-12

---

## Entities

### Subtitle

Represents a single parsed line from the original subtitle file.

| Field | Type | Description |
|-------|------|-------------|
| `index` | number | 0-based logical position within the exercise after applying merge/skip config |
| `text` | string | Normalized display text (no `\N` or other formatting artifacts) |
| `startSeconds` | number | Start time in seconds |
| `endSeconds` | number | End time in seconds |
| `startTime` | string | Formatted start time string |
| `endTime` | string | Formatted end time string |

**Notes**:
- The `index` field is **0-based** and represents the user's view position.
- Client UI displays this as `index + 1` so the first visible row is numbered 1.
- Text is normalized at parse time; raw file contents are not stored.

---

### MergeGroup

Represents a user-defined merge of adjacent original subtitle lines.

| Field | Type | Description |
|-------|------|-------------|
| `startIndex` | number | 0-based index of the first original subtitle in the group |
| `endIndex` | number | 0-based index of the last original subtitle in the group |
| `label` | string (optional) | Display label for the merged group |
| `customText` | string (optional) | User-edited text for the merged group; used as the answer key |

**Validation Rules**:
- `startIndex <= endIndex`
- Group must not overlap with any other merge group.
- Group must not include any sentence before `currentProgress` (read-only constraint).
- If `customText` is omitted, the effective text is the joined original texts separated by single spaces.
- If `customText` is present and non-empty, it becomes the effective text and the answer key.

---

### UserSubtitleConfig

User-specific subtitle customization for an exercise.

| Field | Type | Description |
|-------|------|-------------|
| `configId` | string | UUID primary key |
| `userId` | string | Reference to User |
| `exerciseId` | string | Reference to Exercise |
| `mergedGroups` | MergeGroup[] | Merge groups (stored as JSON) |
| `skippedSentences` | number[] | 0-based indices of skipped original subtitles (stored as JSON) |
| `createdDate` | Date | Creation timestamp |
| `updatedDate` | Date | Last update timestamp |

**Storage Notes**:
- `mergedGroups` and `skippedSentences` are JSON columns in MySQL.
- The schema already exists in [migrations/001_initial_schema.sql](migrations/001_initial_schema.sql); no migration is required because `customText` is an optional field inside the JSON object.

---

### EffectiveSubtitle

Derived view used by the Subtitle Management list and the practice player.

| Field | Type | Description |
|-------|------|-------------|
| `index` | number | 0-based logical position in the effective list |
| `text` | string | Display/answer text (uses `customText` when available) |
| `startSeconds` | number | Start time of first original line in the group |
| `endSeconds` | number | End time of last original line in the group |
| `startTime` | string | Formatted start time |
| `endTime` | string | Formatted end time |
| `originalIndices` | number[] | 0-based indices of the original subtitle lines that form this effective sentence |
| `isMerged` | boolean | True if this row represents a merge group |
| `isSkipped` | boolean | True if this row is skipped (not shown in practice) |

---

## State Transitions

### Merge Action

1. User selects adjacent original subtitles `startIndex..endIndex` (all editable).
2. System creates a `MergeGroup` with default joined text.
3. Effective list is regenerated; the selected range collapses into one row.
4. User may edit `customText` on the merged row.
5. Save persists `MergeGroup` to `UserSubtitleConfig.mergedGroups`.

### Unmerge Action

1. User chooses to unmerge a merged group.
2. System removes the `MergeGroup` from config.
3. `customText`, if any, is discarded.
4. Effective list regenerates with the original separate rows restored.

### Skip Action

1. User toggles skip on an effective row.
2. If the row is merged, all `originalIndices` are added to/removed from `skippedSentences`.
3. If the row is a single original line, its index is added/removed.
4. Effective list regenerates; skipped rows may still appear in management UI with visual indicator but are omitted from practice.

---

## Relationships

```text
User 1--* UserSubtitleConfig
Exercise 1--* UserSubtitleConfig
UserSubtitleConfig 1--* MergeGroup (JSON)
UserSubtitleConfig 1--* skippedSentences (JSON)
Exercise 1--* Subtitle (parsed on demand from subtitle file)
MergeGroup *--* Subtitle (via startIndex/endIndex references)
```

---

## Validation Summary

- Sequence numbers must start from 1 and be continuous.
- No visible `\N` in any displayed text.
- Merged groups render as a single row in management UI.
- Only merged rows are editable.
- Read-only constraint: operations only allowed on rows where `effectiveIndex >= currentProgress`.
- Edited merged text is used as the answer key in future practice sessions only.
