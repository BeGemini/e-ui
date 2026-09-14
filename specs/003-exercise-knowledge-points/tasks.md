# Tasks: Exercise Knowledge Points

**Input**: Design documents from `/specs/003-exercise-knowledge-points/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test tasks are included because the feature requires reliable API behavior and text highlighting logic.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the database schema and shared types/validation needed by all user stories.

- [x] T001 Create migration `migrations/003_add_knowledge_points.sql` defining the `KnowledgePoint` table with indexes
- [x] T002 Add `KnowledgePoint` types and API request/response types to `lib/types.ts`
- [x] T003 Add knowledge point validation schemas to `lib/validation.ts`
- [x] T004 Add category color constants (word/phrase/sentence) to `lib/types.ts` or a new `lib/knowledge-point-config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core server-side infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Implement `app/api/knowledge-points/[exerciseId]/route.ts` with full CRUD (GET, POST, PATCH, DELETE) and ownership checks
- [x] T006 [P] Implement text normalization helper `lib/knowledge-point-utils.ts` for whole-word boundary expansion
- [x] T007 [P] Implement highlight segmentation helper `lib/knowledge-point-utils.ts` that splits a sentence into highlighted/non-highlighted spans for overlapping knowledge points
- [x] T008 Update `app/api/practice/[exerciseId]/route.ts` to include `knowledgePoints` for the current user in the response
- [x] T009 Update `app/api/exercises/route.ts` to include `knowledgePointCount` per exercise for the current user

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Create Knowledge Point from Practice Feedback (Priority: P1) 🎯 MVP

**Goal**: Learners can select text from the Correct Text, open a floating menu, create a categorized knowledge point with a note, and see it highlighted immediately.

**Independent Test**: Complete one dictation sentence, select text in Correct Text, create a knowledge point, and verify the highlight appears.

### Implementation for User Story 1

- [x] T010 [US1] Create `app/components/knowledge-point/KnowledgePointTextSelector.tsx` to detect text selection within the Correct Text area
- [x] T011 [US1] Create `app/components/knowledge-point/KnowledgePointCreateDialog.tsx` using shadcn `Dialog`, `Input`, and category selection
- [x] T012 [US1] Create `app/components/knowledge-point/HighlightedCorrectText.tsx` to render Correct Text with category-colored highlights
- [x] T013 [US1] Extend `app/components/dictation/WordFeedbackDisplay.tsx` to render the Correct Text through `HighlightedCorrectText` and wire up the create flow
- [x] T014 [US1] Wire the floating action menu in `WordFeedbackDisplay.tsx` to call `POST /api/knowledge-points/[exerciseId]` and re-render highlights

**Checkpoint**: User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Dashboard Shows Knowledge Point Count and Navigation (Priority: P1)

**Goal**: The dashboard displays a knowledge point count for each exercise, and clicking it navigates to the knowledge point list page.

**Independent Test**: Create knowledge points for an exercise, open the dashboard, verify the count, click it, and land on the list page.

### Implementation for User Story 2

- [x] T015 [US2] Add a knowledge point indicator (count + icon) to `app/components/exercise-list/ExerciseItem.tsx` or the inner exercise card component
- [x] T016 [US2] Wire the indicator to navigate to `/dashboard/[exerciseId]/knowledge-points`
- [x] T017 [US2] Create the knowledge point list page route `app/dashboard/[exerciseId]/knowledge-points/page.tsx`
- [x] T018 [US2] Create `app/components/knowledge-point-list/KnowledgePointList.tsx` to fetch and display knowledge points grouped by category

**Checkpoint**: User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - Manage Knowledge Points in List Page (Priority: P2)

**Goal**: Learners can edit and delete knowledge points from the list page; changes are reflected in the dashboard count and Correct Text highlights.

**Independent Test**: Open the list page, edit a knowledge point's category/description, delete another, and verify updates persist.

### Implementation for User Story 3

- [x] T019 [US3] Add edit/delete actions to `app/components/knowledge-point-list/KnowledgePointList.tsx` using shadcn `Button` and `Dialog`
- [x] T020 [US3] Reuse `KnowledgePointCreateDialog.tsx` as an edit dialog or create a dedicated edit variant in `app/components/knowledge-point/KnowledgePointEditDialog.tsx`
- [x] T021 [US3] Wire edit action to call `PATCH /api/knowledge-points/[exerciseId]/[knowledgePointId]`
- [x] T022 [US3] Wire delete action with confirmation to call `DELETE /api/knowledge-points/[exerciseId]/[knowledgePointId]`
- [x] T023 [US3] Invalidate client state after edit/delete so dashboard count and Correct Text highlights update

**Checkpoint**: User Stories 1, 2, and 3 should all work independently.

---

## Phase 6: User Story 4 - Visual Highlighting of Saved Knowledge Points in Correct Text (Priority: P2)

**Goal**: Any saved knowledge point text is rendered with its category color in the Correct Text; overlapping segments show combined colors.

**Independent Test**: View Correct Text containing word, phrase, and sentence knowledge points, including overlapping ones, and verify expected colors.

### Implementation for User Story 4

- [x] T024 [US4] Ensure `HighlightedCorrectText.tsx` correctly handles all three categories and overlapping spans using `lib/knowledge-point-utils.ts`
- [x] T025 [US4] Update `WordFeedbackDisplay.tsx` to pass the current sentence's knowledge points to `HighlightedCorrectText.tsx`
- [x] T026 [US4] Add visual regression / unit tests for `lib/knowledge-point-utils.ts` covering overlap and non-overlap cases

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates and documentation that affect multiple user stories.

- [x] T027 [P] Write integration tests `tests/integration/knowledge-points.test.ts` for CRUD and ownership
- [x] T028 [P] Write unit tests `tests/unit/knowledge-point-utils.test.ts` for text normalization and highlight segmentation
- [x] T029 [P] Write E2E test `tests/e2e/knowledge-points.spec.ts` covering dashboard count, list page, and highlight rendering
- [x] T030 Run `npm run type-check` and fix TypeScript errors introduced by the feature
- [x] T031 Run `npm run lint` and fix linting errors introduced by the feature
- [x] T032 Apply `migrations/003_add_knowledge_points.sql` to the local database and verify with `npm run db:check`
- [x] T033 Run through `quickstart.md` validation scenarios manually and verify dashboard navigation
- [x] T034 Update `README.md` or feature docs with knowledge point usage notes if needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion.
  - User stories can proceed in parallel (if staffed).
  - Or sequentially in priority order: US1 (P1) → US2 (P1) → US3 (P2) → US4 (P2).
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational phase. No dependencies on other stories. This is the MVP scope.
- **User Story 2 (P1)**: Can start after Foundational phase. Depends on the API count field from T009.
- **User Story 3 (P2)**: Can start after Foundational phase. Depends on the list page route from T017 and the CRUD API from T005.
- **User Story 4 (P2)**: Can start after Foundational phase and is closely tied to User Story 1's `HighlightedCorrectText.tsx` component.

### Within Each User Story

- Models/types already completed in Phase 1.
- Services/helpers completed in Phase 2.
- UI components before page integration.
- Client-side data fetching and mutation wiring last.

### Parallel Opportunities

- T001, T002, T003, T004 can run in parallel within Phase 1.
- T006 and T007 can run in parallel within Phase 2.
- T015, T016, T017, and T018 can run in parallel within User Story 2 once T009 is done.
- T019 through T023 can run in parallel within User Story 3 once the list page exists.
- T027, T028, T029 can run in parallel in the Polish phase.

---

## Parallel Example: User Story 1

Two developers could split User Story 1 like this:

| Developer | Tasks | Deliverable |
|-----------|-------|-------------|
| A | T010, T011, T012 | Selection detection, dialog, and highlight renderer components |
| B | T013, T014 | Integrate components into `WordFeedbackDisplay.tsx` and wire the API |

Both developers depend on Phase 2 completion, but can work in parallel on US1 once unblocked.

---

## Suggested MVP Scope

Implement **User Story 1** (create knowledge point from practice feedback) as the MVP. It delivers the core value of capturing learning material during practice and can be shipped independently.

## Implementation Strategy

1. **MVP First**: Complete Phase 1, Phase 2, and User Story 1 first. This gives users the core knowledge point creation feature.
2. **Incremental Delivery**: Add dashboard count/navigation (US2), list page management (US3), and polished highlighting (US4) in subsequent increments.
3. **Quality Gates**: Run `type-check` and `lint` after each phase; keep tests green.
