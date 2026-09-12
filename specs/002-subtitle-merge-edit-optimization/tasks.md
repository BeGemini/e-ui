# Tasks: Subtitle Merge & Edit Optimization

**Input**: Design documents from `/specs/002-subtitle-merge-edit-optimization/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Test tasks are included because this feature modifies critical user-facing behavior and core data transformation logic.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared utilities and type updates that all user stories depend on.

- [x] T001 Add `customText` to `MergeGroup` type in `lib/types.ts`
- [x] T002 Update `MergeGroupSchema` in `lib/validation.ts` to allow optional `customText`
- [x] T003 Create `normalizeSubtitleText()` utility in `lib/subtitle-parser.ts`
- [x] T004 Apply `normalizeSubtitleText()` in `lib/parsers/srt.ts`, `lib/parsers/vtt.ts`, and `lib/parsers/ssa-ass.ts`
- [x] T005 Create `applySubtitleConfig()` helper in `lib/utils.ts` to derive effective subtitles from raw subtitles and user config

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data transformation and API consistency that MUST be complete before any user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 [P] Update `/api/practice/[exerciseId]` GET handler to use `applySubtitleConfig()` and return 0-based `index`
- [x] T007 Update `/api/practice/[exerciseId]/check` POST handler to compute effective subtitles and use edited merged text as answer key
- [x] T008 Update `/api/subtitles/[exerciseId]/config` PUT handler to accept and persist `customText` in merge groups
- [x] T009 Add unit tests for `normalizeSubtitleText()` in `tests/unit/lib/subtitle-parser.test.ts`
- [x] T010 Add unit tests for `applySubtitleConfig()` in `tests/unit/lib/utils.test.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Correct Subtitle Numbering in Merge Interface (Priority: P1) 🎯 MVP

**Goal**: The Subtitle Management list displays sequence numbers starting from 1, with continuous numbering after merges/skips.

**Independent Test**: Open the subtitle editor for any exercise and verify the first visible row is labeled "Sentence 1" and numbering is continuous.

### Implementation for User Story 1

- [x] T011 [US1] Fix `SubtitleList.tsx` to display `subtitle.index + 1` once, removing the current double-increment so the first row shows "Sentence 1"
- [x] T012 [US1] Update `/dashboard/[exerciseId]/subtitles/page.tsx` to pass effective subtitles (after `applySubtitleConfig`) into `SubtitleList`
- [x] T013 [US1] Ensure `/api/practice/[exerciseId]` returns `index` as 0-based logical position so all clients render numbering consistently

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Clean Subtitle Text Without Formatting Artifacts (Priority: P1)

**Goal**: No visible `\N` line-break markers in the Subtitle Management UI or during dictation.

**Independent Test**: Upload a subtitle file containing `\N`, open the subtitle editor, and confirm markers are replaced with normal whitespace.

### Implementation for User Story 2

- [x] T014 [US2] Apply `normalizeSubtitleText()` in `lib/parsers/ssa-ass.ts` before creating `ParsedSubtitle` objects
- [x] T015 [US2] Apply `normalizeSubtitleText()` in `lib/parsers/srt.ts` and `lib/parsers/vtt.ts` to normalize multi-line cues into single-space-separated text
- [x] T016 [US2] Verify practice feedback and correct-answer display use normalized text by confirming `/api/practice/[exerciseId]` returns cleaned text

**Checkpoint**: User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - Subtitle Management Reflects Merged Lines as Single Units (Priority: P1)

**Goal**: After merging lines, the Subtitle Management list shows one combined row instead of the original separate rows.

**Independent Test**: Select three adjacent subtitles, press Merge, and confirm the list collapses to one row with an Unmerge option.

### Implementation for User Story 3

- [x] T017 [US3] Update `/dashboard/[exerciseId]/subtitles/page.tsx` to compute effective subtitles using `applySubtitleConfig()` and render them in `SubtitleList`
- [x] T018 [US3] Update `SubtitleList.tsx` to render merged rows as single entries with combined time range and original-line count
- [x] T019 [US3] Add Unmerge action to merged rows in `SubtitleList.tsx` that removes the corresponding `MergeGroup` from state
- [x] T020 [US3] Update `MergeGroupEditor.tsx` to sync with effective rows and remove the separate merge-group list (or keep it as read-only summary)
- [x] T021 [US3] Ensure skip toggles on merged rows affect all original indices in `skippedSentences`

**Checkpoint**: User Stories 1, 2, AND 3 should all work independently.

---

## Phase 6: User Story 4 - Edit Merged Subtitle Text and Use It During Dictation (Priority: P1)

**Goal**: Users can edit the text of a merged row; the edited text becomes the correct answer key during future practice.

**Independent Test**: Merge lines, edit the merged text, save, start practice, submit dictation, and verify the correct answer is the edited merged text.

### Implementation for User Story 4

- [x] T022 [US4] Add inline edit mode to merged rows in `SubtitleList.tsx` using shadcn `Input` and `Button`
- [x] T023 [US4] Persist edited merged text as `customText` on the corresponding `MergeGroup` when saving config in `/dashboard/[exerciseId]/subtitles/page.tsx`
- [x] T024 [US4] Update `applySubtitleConfig()` to use `customText` as the effective text when present
- [x] T025 [US4] Update `/api/practice/[exerciseId]/check` to compute effective subtitles and compare user input against `customText`
- [x] T026 [US4] Ensure unmerging a group discards `customText` and restores original line texts

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality, consistency, and validation across all user stories.

- [x] T027 [P] Update `WordFeedbackDisplay.tsx` if needed to render normalized/merged correct text cleanly
- [ ] T028 [P] Add integration tests for subtitle config API in `tests/integration/api/subtitles-config.test.ts`
- [ ] T029 [P] Add integration tests for practice/check API using merged and edited subtitles in `tests/integration/api/practice-check.test.ts`
- [x] T030 Run `npm run type-check` and fix any TypeScript errors in feature scope
- [x] T031 Run `npm run lint` and fix any linting errors in feature scope
- [x] T032 Update feature documentation and quickstart.md if any validation steps changed during implementation
- [ ] T033 Run quickstart.md validation scenarios end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Stories (Phase 3–6)**: All depend on Foundational phase completion.
  - Can proceed in priority order (US1 → US2 → US3 → US4) or in parallel if team capacity allows.
- **Polish (Final Phase)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2). No dependencies on other stories.
- **User Story 2 (P1)**: Can start after Foundational (Phase 2). No dependencies on other stories.
- **User Story 3 (P1)**: Can start after Foundational (Phase 2). Builds on the effective-subtitle infrastructure shared with US1.
- **User Story 4 (P1)**: Can start after US3 (merged rows must exist before they can be edited), or after Foundational if US3 is done first.

### Within Each User Story

- Core data transformation/helpers before UI changes.
- UI changes before API integration updates.
- Each story complete before moving to next priority.

### Parallel Opportunities

- All Setup tasks (T001–T005) can run in parallel.
- All Foundational API updates (T006–T008) can run in parallel after Setup.
- Unit tests (T009–T010) can run in parallel with implementation.
- US1, US2, and US3 can be worked on in parallel once Foundational is complete.
- US4 depends on US3's merged-row UI but can start immediately after T018/T019.
- Polish tasks (T027–T033) can run in parallel after all stories are complete.

---

## Parallel Example: User Story 1

```bash
# Backend and frontend tasks can be started together:
Task: "Update /api/practice/[exerciseId] to return 0-based index"
Task: "Update SubtitleList.tsx to render index + 1 correctly"
Task: "Update subtitles editor page to pass effective subtitles"
```

---

## Implementation Strategy

### MVP First (User Story 1 + Foundational only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Open the subtitle editor and confirm numbering starts at 1.
5. Deploy/demo if ready.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready.
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!).
3. Add User Story 2 → Test independently → Deploy/Demo.
4. Add User Story 3 → Test independently → Deploy/Demo.
5. Add User Story 4 → Test independently → Deploy/Demo.
6. Complete Polish phase.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together.
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Developer D starts User Story 4 as soon as merged-row UI is available.
4. Finalize with Polish phase.

---

## Notes

- `[P]` tasks = different files, no dependencies.
- `[Story]` label maps task to specific user story for traceability.
- Each user story should be independently completable and testable.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- Avoid vague tasks, same-file conflicts, and cross-story dependencies that break independence.
