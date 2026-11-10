# Research: Exercise Knowledge Points

**Feature**: Exercise Knowledge Points  
**Created**: 2026-09-13  
**Purpose**: Resolve unknowns and document best-practice decisions before Phase 1 design.

## Research Topics

All significant unknowns were resolved during the `/speckit.clarify` session:

1. **Interaction for creating knowledge points**: Replaced the original right-click requirement with a floating action menu that appears after any text selection. The design target is desktop only.
2. **Duplicate knowledge points**: Identical text saved twice is ignored; the existing knowledge point description may be surfaced.
3. **Partial word selection**: Selection is normalized to whole word boundaries within the current subtitle sentence.
4. **Cross-sentence selection**: Knowledge points can only be created from the current subtitle sentence; cross-sentence selections do not trigger the create action.
5. **Stale knowledge points after subtitle edits**: The knowledge point is preserved in the list page but is no longer highlighted in the Correct Text if its captured text no longer matches.

## Findings from Codebase Inspection

- **Practice feedback component**: `app/components/dictation/WordFeedbackDisplay.tsx` renders the Correct Text. It is the natural place to integrate selectable text and category highlights.
- **Practice data endpoint**: `app/api/practice/[exerciseId]/route.ts` already returns effective subtitles and user progress. It can be extended to include the user's knowledge points for the exercise so the client can highlight them immediately.
- **Dashboard endpoint**: `app/api/exercises/route.ts` builds a series/season/episode/exercise hierarchy and includes `completed` and `currentProgress` per exercise. It can be extended to include `knowledgePointCount` per exercise.
- **Database layer**: `lib/db.ts` uses `mysql2/promise` with a connection pool. The existing schema is defined in `migrations/001_initial_schema.sql` and updated in `migrations/002_add_effective_sentence_count.sql`.
- **Validation**: `lib/validation.ts` uses `zod`. New schemas for knowledge point create/update can follow the existing patterns.
- **Type definitions**: `lib/types.ts` contains domain interfaces. `KnowledgePoint` and related request/response types should be added there.
- **shadcn components**: `components/ui/` already includes `Badge`, `Button`, `Card`, `Dialog`, `Input`, `Table`, which covers all new UI needs.

## Decisions Summary

| Topic | Decision |
|-------|----------|
| Create interaction | Floating action menu on text selection (all devices) |
| Duplicate handling | Ignore duplicate save, optionally surface existing description |
| Partial selection | Normalize to whole word boundaries within current sentence |
| Cross-sentence selection | Not allowed; create action disabled for cross-sentence selections |
| Stale text after subtitle edits | Preserve knowledge point, stop highlighting in Correct Text |
| Category colors | Fixed visual colors (word, phrase, sentence) defined in UI theme/config |
| Highlight rendering | Render overlapping segments independently with combined colors in overlap regions |
| API design | RESTful CRUD under `/api/knowledge-points/[exerciseId]`; include counts in `/api/exercises`; include points in `/api/practice/[exerciseId]` |
| Storage | New `KnowledgePoint` table in MySQL with composite unique index on `(userId, exerciseId, capturedText)` |

## Alternatives Considered

- **Separate floating menu vs. inline toolbar**: Floating menu was chosen because it is contextually tied to the text selection.
- **Fuzzy matching for stale highlights**: Rejected because exact matching is simpler and the requirement is to highlight captured text; fuzzy matching could highlight unintended text.
- **Delete knowledge points when text no longer matches**: Rejected to avoid data loss; the user's notes may still be valuable.

## Risks

- Rendering overlapping highlights with combined colors may produce accessibility contrast issues; color combinations should be tested against WCAG 2.1 AA.
- Text selection across sentence boundaries must be detected reliably; the implementation needs to compare selection offsets against the current sentence's DOM range.
