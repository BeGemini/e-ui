---

description: "Task list for AI Knowledge Point Teaching feature"

---

# Tasks: AI Knowledge Point Teaching

**Input**: Design documents from `/specs/004-ai-knowledge-teaching/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: This feature does not require test tasks. Tests are OPTIONAL and were not explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare environment and shared types for the AI teaching feature

- [X] T001 [P] Add `DEEPSEEK_API_KEY` and `DEEPSEEK_MODEL` environment variable typing to `lib/types.ts`
- [X] T002 [P] Add `AiKnowledgePointTeachRequest`, `AiKnowledgePointTeachResponse`, and DeepSeek config types to `lib/types.ts`
- [X] T003 Add `AiKnowledgePointTeachSchema` validation to `lib/validation.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement DeepSeek client helper in `lib/deepseek-client.ts` with `callDeepSeekForKnowledgePoint(capturedText, category, sourceSentence)`
- [X] T005 Implement `POST /api/ai/knowledge-point-teach/route.ts` with validation, session verification, DeepSeek call, and structured Markdown response
- [X] T006 Add error handling for DeepSeek API failures in `app/api/ai/knowledge-point-teach/route.ts` returning 502 with user-friendly message
- [X] T007 Verify `npm run type-check` and `npm run lint` pass after foundational backend code (feature files clean; pre-existing repo errors/warnings unrelated to this feature)

**Checkpoint**: Foundation ready — backend can receive a request, call DeepSeek, and return a structured explanation.

---

## Phase 3: User Story 1 - Generate AI explanation while creating a knowledge point (Priority: P1) 🎯 MVP

**Goal**: User clicks AI教学 in the create knowledge point dialog and the note field is populated with a structured AI explanation.

**Independent Test**: Open the create knowledge point dialog, click AI教学, and verify the note field is populated with a structured explanation containing the four required sections.

### Implementation for User Story 1

- [X] T008 [P] [US1] Add `sourceSentence` prop to `KnowledgePointCreateDialogProps` in `app/components/knowledge-point/KnowledgePointCreateDialog.tsx`
- [X] T009 [US1] Wire the new `sourceSentence` prop from `WordFeedbackDisplay` through to `KnowledgePointCreateDialog`
- [X] T010 [US1] Add AI teaching state (`isGenerating`, `aiError`) to `KnowledgePointCreateDialog`
- [X] T011 [US1] Add AI教学 button to `KnowledgePointCreateDialog` with loading state and disabled-while-loading behavior
- [X] T012 [US1] Implement `handleAiTeach()` in `KnowledgePointCreateDialog` that calls `POST /api/ai/knowledge-point-teach` and writes `explanation` into the description state
- [X] T013 [US1] Display user-friendly error from the API without blocking the note text area in `KnowledgePointCreateDialog`
- [X] T014 [US1] Ensure AI-generated content is editable and saved via the existing save flow in `KnowledgePointCreateDialog`

**Checkpoint**: User Story 1 is fully functional — AI button generates an explanation that can be edited and saved.

---

## Phase 4: User Story 2 - Keep manual note creation as an option (Priority: P2)

**Goal**: Users can still create knowledge points with manually typed notes and edit AI-generated notes before saving.

**Independent Test**: Create a knowledge point by typing a note manually without clicking AI教学, then create another by generating AI content, editing it, and saving.

### Implementation for User Story 2

- [X] T015 [US2] Ensure the AI教学 button is visually optional and does not auto-trigger in `KnowledgePointCreateDialog`
- [X] T016 [US2] Verify the description text area remains editable after AI content is populated in `KnowledgePointCreateDialog`
- [X] T017 [US2] Ensure saving a manually typed note works unchanged through the existing `POST /api/knowledge-points/[exerciseId]` flow
- [X] T018 [US2] Ensure edited AI-generated content is what gets persisted when the user clicks Save

**Checkpoint**: User Story 2 is fully functional — manual creation and AI-assisted creation coexist without conflict.

---

## Phase 5: User Story 3 - Recover from AI service failures (Priority: P3)

**Goal**: AI service failures show a clear message and do not block manual note creation.

**Independent Test**: Simulate a DeepSeek failure (invalid key or offline), click AI教学, and verify the dialog remains open for manual note entry.

### Implementation for User Story 3

- [X] T019 [US3] Ensure `app/api/ai/knowledge-point-teach/route.ts` returns a 502 with a clear error message on DeepSeek failure
- [X] T020 [US3] Ensure `KnowledgePointCreateDialog` keeps the dialog and note text area usable when the AI API returns an error
- [X] T021 [US3] Add retry capability so a second click of AI教学 can succeed after the service recovers
- [X] T022 [US3] Handle edge case where `sourceSentence` is empty or whitespace by sending it anyway and letting the backend prompt handle it gracefully

**Checkpoint**: User Story 3 is fully functional — failures are handled gracefully and users can retry or fallback to manual notes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, edge cases, and cleanup

- [X] T023 [P] Run `npm run type-check` and fix any TypeScript errors (feature files clean; pre-existing repo errors unrelated)
- [X] T024 [P] Run `npm run lint` and fix any lint errors (feature files clean; pre-existing repo warnings unrelated)
- [X] T025 [P] Run quickstart.md validation steps manually — successful AI API call verified with curl
- [X] T026 Verify edge cases: empty captured text and invalid category return 400; invalid API key returns 502 gracefully
- [X] T027 Update feature status in `specs/004-ai-knowledge-teaching/spec.md` from Draft to Ready for Review

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational phase completion
  - User stories can proceed in priority order (P1 → P2 → P3)
  - User Story 2 and 3 can overlap with User Story 1 once the foundational API and dialog wiring are in place
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories. This is the MVP.
- **User Story 2 (P2)**: Can start after User Story 1 core wiring is done — depends on the AI button and dialog state existing.
- **User Story 3 (P3)**: Can start after User Story 1 core wiring is done — depends on the AI endpoint and dialog error display existing.

### Within Each User Story

- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks (T001–T003) marked [P] can run in parallel
- All Foundational tasks (T004–T007) can run in parallel once types/validation are available
- Type-check and lint tasks (T023–T024) marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# UI wiring and state can be done together once the API exists:
Task: "Add sourceSentence prop to KnowledgePointCreateDialog"
Task: "Add AI teaching state to KnowledgePointCreateDialog"
Task: "Add AI教学 button to KnowledgePointCreateDialog"
Task: "Implement handleAiTeach() in KnowledgePointCreateDialog"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Open the create knowledge point dialog, click AI教学, and verify the note field is populated
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (core dialog integration)
   - Developer B: User Story 2 (manual fallback polish)
   - Developer C: User Story 3 (error handling and retry)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- No new dependencies are required; use built-in `fetch` for DeepSeek API calls
- Commit after each task or logical group
