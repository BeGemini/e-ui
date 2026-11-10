---

description: "Task list for 007 — video player Previous sentence button"
---

# Tasks: 视频播放器"上一句"按钮 (Previous Sentence Button)

**Input**: Design documents from `/specs/007-previous-sentence-button/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/video-player-previous-sentence.md, quickstart.md

**Tests**: Included. plan.md (Testing, step 3) and research R6 require one new RTL component test: `tests/unit/video-player-previous-sentence.test.tsx`. Page-level behavior is verified manually with quickstart.md. No e2e tests.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested on its own.

> ⚠️ **Dependency on uncommitted 006 work**: 007 builds on the **uncommitted** 006 (playback speed) changes in `app/components/video-player/VideoPlayer.tsx`. The current git branch is still `006-video-playback-speed`. Land or commit the 006 changes before you merge 007. Do **not** switch or create branches as part of these tasks, and do **not** modify anything under `specs/006-video-playback-speed/`. Both features edit the same file, so a 007 diff made on a tree without 006 will conflict at the imports and the controls row.

**Accepted plan decisions** (do not reopen):

- "Previous" never saves anything: no `saveProgress`, no `fetch`, no `onSentenceEnd`.
- "Previous" is locked while `isSavingProgress || isCheckingAccuracy`.
- No API, database, or persistence changes. Nothing under `app/api/**` changes.
- No global keyboard shortcuts and no per-sentence drafts.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: The user story the task belongs to (US1, US2, US3)

## Path Conventions

This is a single Next.js App Router project, and all paths are relative to the repo root (`/Users/mike/Development/e-ui`). Only these files are touched:

- `app/components/video-player/VideoPlayer.tsx` (modify)
- `app/dashboard/[exerciseId]/practice/page.tsx` (modify)
- `tests/unit/video-player-previous-sentence.test.tsx` (new)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the 006 baseline that 007 builds on. No dependencies or tooling are added.

- [X] T001 Verify the 006 playback-speed changes are present in `app/components/video-player/VideoPlayer.tsx`. Check for a `playbackRate` state, the Speed `Select` in the controls row (`<div className="flex items-center justify-center gap-2">`), and the `defaultPlaybackRate`/`playbackRate` handling. Then check that the baseline is green:
  - `npm run type-check`
  - `npm run lint`
  - `npx jest tests/unit/video-player-playback-rate.test.tsx`

  If any of these are missing or failing, STOP: 007 cannot proceed until the 006 work has landed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend the public props contract that all three stories use (contract §1).

**⚠️ CRITICAL**: All user-story work depends on this phase being complete.

- [X] T002 In `app/components/video-player/VideoPlayer.tsx`, add two optional props to `interface VideoPlayerProps` (around line 18), with JSDoc as written in contract §1:
  - `onPreviousSentence?: () => void;`
  - `isPreviousDisabled?: boolean;`

  Destructure both in the `VideoPlayer` function parameters, with `isPreviousDisabled = false` as the default. Do NOT change the `onSentenceEnd` signature or `VideoPlayerRef.playSentenceAtIndex`. Do NOT use `any`.

**Checkpoint**: `npm run type-check` passes. The props exist but are not used yet.

---

## Phase 3: User Story 1 - 回到上一句并收听 / Navigate back & play (Priority: P1) 🎯 MVP

**Goal**: The controls row shows a "Previous sentence" button (lucide `SkipBack`) in first position. Clicking it moves the page to sentence N−1, clears the input and feedback, and plays N−1 from its start. Playback auto-pauses at the end of N−1 and keeps the current speed. The button is disabled on sentence 1.

**Independent Test**:
- Run `npx jest tests/unit/video-player-previous-sentence.test.tsx`: the US1 cases pass.
- Manually: go to sentence 3 and click Previous. Sentence 2 plays from its start and auto-pauses. The player shows "Sentence 2 / Y" and the page header shows "Sentence 2 of Y" (quickstart rows 1–6 and 11).

### Tests for User Story 1 (write first; they must FAIL before T004)

- [X] T003 [P] [US1] Create `tests/unit/video-player-previous-sentence.test.tsx`:
  - **Setup**:
    - Copy the jsdom shims from `tests/unit/video-player-playback-rate.test.tsx`: the `Element.prototype.matches` top-layer override and the `PointerEvent` polyfill in `beforeAll`/`afterAll`.
    - Call `localStorage.setItem('token', 'test-token')` in `beforeEach` and `localStorage.clear()` in `afterEach`.
    - Use a fixture of 3 subtitles (`index` 0..2, with `startSeconds`/`endSeconds`/`startTime`/`endTime`).
    - Add a `renderPlayer(overrides)` helper that renders `<VideoPlayer videoUrl="/v.mp4" subtitles={...} currentSentenceIndex={...} onSentenceEnd={jest.fn()} ... />`.
  - **Cases** (locate the button with `screen.getByRole('button', { name: 'Previous sentence' })`):
    - (a) `currentSentenceIndex={0}` with `onPreviousSentence` provided → the button is disabled. Clicking it does not call the callback.
    - (b) `currentSentenceIndex={1}` → the button is enabled. `fireEvent.click` calls `onPreviousSentence` exactly once, and the `onSentenceEnd` mock is NOT called.
    - (c) No `onPreviousSentence` passed, `currentSentenceIndex={1}` → the button is disabled.
    - (d) The Previous button is the first button in the controls row (it comes before the Play/Pause button in DOM order).
  - Use `fireEvent` only, because `@testing-library/user-event` is not installed.

### Implementation for User Story 1

- [X] T004 [P] [US1] In `app/components/video-player/VideoPlayer.tsx` (depends on T002):
  - Change the import on line 4 to `import { Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-react';`.
  - In the controls row `<div className="flex items-center justify-center gap-2">` (around line 348), insert a shadcn `Button` as the **first** child, before Play/Pause:
    - `variant="outline" size="sm"`
    - `className`: the exact same as the existing Next/`SkipForward` button
    - `onClick={onPreviousSentence}`
    - `disabled={!onPreviousSentence || !currentSubtitle || currentSentenceIndex <= 0}`
    - `aria-label="Previous sentence"`
    - Child: `<SkipBack size={16} />`
  - The player itself must NOT seek, play, or call `onSentenceEnd` for this action (contract §4).
- [X] T005 [P] [US1] In `app/dashboard/[exerciseId]/practice/page.tsx` (depends on T002 only; different file from T004), add `handlePreviousSentence` next to `advanceToNextSentence` (around line 190):
  - If `currentSentenceIndex <= 0`, return.
  - `const prev = currentSentenceIndex - 1;`
  - `setCurrentSentenceIndex(prev); setUserInput(''); setCurrentFeedback(null);`
  - `setTimeout(() => videoPlayerRef.current?.playSentenceAtIndex(prev), 0);` (the same pattern as `advanceToNextSentence`, so auto-pause, speed retention, and pending play while not ready all carry over).
  - Do NOT call `saveProgress`, `fetch`, or `handleSentenceEnd`.
- [X] T006 [US1] In `app/dashboard/[exerciseId]/practice/page.tsx`, pass `onPreviousSentence={handlePreviousSentence}` to `<VideoPlayer ref={videoPlayerRef} ...>` (around line 330). Depends on T005, which edits the same file.
- [X] T007 [US1] Run `npx jest tests/unit/video-player-previous-sentence.test.tsx`; cases (a)–(d) must pass. Then use `npm run dev` to manually verify quickstart.md rows 1–6 and 11 (disabled on sentence 1, N→N−1 with auto-pause, mid-play jump goes to the start of N−1, input/feedback cleared, 0.5x speed kept, repeated Previous down to sentence 1, click while "Loading video..."). _(Automated jest a–d passed; manual browser quickstart rows not run in this session — pending user review.)_

**Checkpoint**: US1 is fully functional and demoable as the MVP.

---

## Phase 4: User Story 2 - 回退不影响已保存的学习进度 / Progress untouched (Priority: P1)

**Goal**: Going back never writes to the server (no skip/attempt record; `currentSentenceIndex`, accuracy, and `isCompleted` unchanged). It also cannot cause a misplaced sentence or misattributed feedback while a save or accuracy check is in flight (FR-007, FR-008, FR-011, research R2/R3).

**Independent Test**:
- The jest lock case passes.
- On sentence 3, clicking Previous sends no `save-progress` request (DevTools Network). Refreshing without submitting resumes at sentence 3.
- While a Check or "Saving..." request is in flight, Previous is disabled (quickstart rows 7–10).

### Tests for User Story 2

- [X] T008 [US2] Add case (e) to `tests/unit/video-player-previous-sentence.test.tsx`: with `currentSentenceIndex={1}`, `onPreviousSentence` provided, and `isPreviousDisabled={true}`, the button is disabled, and `fireEvent.click` calls neither `onPreviousSentence` nor `onSentenceEnd`. Also strengthen case (b): assert `onSentenceEnd` has 0 calls after the click, which proves that Previous never triggers the save path. Depends on T003, which creates the same file.

### Implementation for User Story 2

- [X] T009 [P] [US2] In `app/components/video-player/VideoPlayer.tsx`, extend the Previous button's `disabled` expression from T004 to `!onPreviousSentence || !currentSubtitle || currentSentenceIndex <= 0 || isPreviousDisabled` (contract §3). Depends on T004.
- [X] T010 [P] [US2] In `app/dashboard/[exerciseId]/practice/page.tsx`, extend the guard in `handlePreviousSentence` to `if (currentSentenceIndex <= 0 || isSavingProgress || isCheckingAccuracy) return;` (contract §6.1). Add a one-line comment stating that Previous is client-only navigation and intentionally does not call `saveProgress` (FR-007). Depends on T005 and T006. It can run in parallel with T009 because it edits a different file.
- [X] T011 [US2] In `app/dashboard/[exerciseId]/practice/page.tsx`, pass `isPreviousDisabled={isSavingProgress || isCheckingAccuracy}` to `<VideoPlayer>`, next to the existing `isLoading`/`isDisabled` props (around lines 351–352). Depends on T010, which edits the same file.
- [X] T012 [US2] Run `npx jest tests/unit/video-player-previous-sentence.test.tsx`; cases (a)–(e) must pass. Then manually verify quickstart.md rows 7–10: _(Automated jest a–e passed; manual rows 7–10 not run — pending user review.)_
  - no `save-progress` request on Previous;
  - refresh resumes at the pre-back position;
  - resubmitting sentence 2 sends one `save-progress` with `sentenceIndex=1` and advances to sentence 3;
  - Previous is disabled during Check and during "Saving..." (use Slow 3G throttling).

**Checkpoint**: US1 and US2 both work. Learning data is never altered by going back.

---

## Phase 5: User Story 3 - 键盘与读屏可访问 / Keyboard & a11y (Priority: P2)

**Goal**: The button can be operated with the keyboard only (Tab, Enter, Space). It shows a visible focus ring and a hover tooltip, and screen readers announce its name and its disabled state (FR-012, contract §5, research R5).

**Independent Test**:
- The jest a11y case passes.
- Manually: use Tab to reach the button, then press Enter or Space; the result matches a click. Hovering shows "Previous sentence". VoiceOver reads "Previous sentence" and reads "dimmed" on sentence 1 (quickstart rows 12–13).

### Tests for User Story 3

- [X] T013 [US3] Add case (f) to `tests/unit/video-player-previous-sentence.test.tsx`. The button found by `getByRole('button', { name: 'Previous sentence' })` must meet all of these:
  - it is a native `BUTTON` element (`tagName === 'BUTTON'`);
  - it has `title="Previous sentence"`;
  - when disabled (`currentSentenceIndex={0}`), it has the native `disabled` attribute (`toHaveAttribute('disabled')`);
  - when enabled, it is focusable (`button.focus()` makes it `document.activeElement`).

  Depends on T008, which edits the same file.

### Implementation for User Story 3

- [X] T014 [P] [US3] In `app/components/video-player/VideoPlayer.tsx`, add `title="Previous sentence"` to the Previous button, next to the existing `aria-label`. Confirm that the button does not override shadcn's `focus-visible:ring` classes in its `className`, and that it does not set `focusableWhenDisabled`, so that it matches the Next button (research R5). Depends on T009.
- [X] T015 [US3] Run `npx jest tests/unit/video-player-previous-sentence.test.tsx`; cases (a)–(f) must pass. Then manually verify quickstart.md rows 12–13 with keyboard only and with VoiceOver on macOS. _(Automated jest a–f passed; manual keyboard/VoiceOver rows 12–13 not run — pending user review.)_

**Checkpoint**: All three user stories are complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates, regression (FR-013), and scope checks.

- [X] T016 [P] Run `npm run type-check` (TypeScript strict). It must pass with no `any` introduced in `app/components/video-player/VideoPlayer.tsx` or `app/dashboard/[exerciseId]/practice/page.tsx`.
- [X] T017 [P] Run `npm run lint`. It must pass for `app/components/video-player/VideoPlayer.tsx`, `app/dashboard/[exerciseId]/practice/page.tsx`, and `tests/unit/video-player-previous-sentence.test.tsx`.
- [X] T018 Run `npx jest tests/unit/video-player-previous-sentence.test.tsx tests/unit/video-player-playback-rate.test.tsx`. Both must pass, so the 006 speed behavior is unaffected (FR-013).
- [X] T019 Manually run the regression in quickstart.md row 14: Play/Pause, Replay, Next (Skip & Continue), Speed, and the progress bar must behave as before in `/dashboard/<exerciseId>/practice`. _(Not run: requires browser — pending user review.)_
- [X] T020 Run `git --no-pager status --short` and `git --no-pager diff --stat` and confirm the scope. The 007 changes must be limited to:
  - `app/components/video-player/VideoPlayer.tsx`
  - `app/dashboard/[exerciseId]/practice/page.tsx`
  - `tests/unit/video-player-previous-sentence.test.tsx`
  - `specs/007-previous-sentence-button/`

  There must be no changes under `app/api/**`, `components/ui/`, `migrations/`, `package.json`, or `specs/006-video-playback-speed/`, and the branch must still be `006-video-playback-speed` (no branch switch).

---

## Dependencies & Execution Order

### Phase Dependencies

- **External prerequisite**: The uncommitted 006 changes to `app/components/video-player/VideoPlayer.tsx` must be present (T001). Land or commit 006 before merging 007.
- **Setup (Phase 1, T001)**: This is the first step and has no dependencies within this task list.
- **Foundational (Phase 2, T002)**: Depends on T001. BLOCKS all stories.
- **US1 (Phase 3)**: Depends on T002.
- **US2 (Phase 4)**: Depends on US1, because it extends the button (T004), the handler (T005), and the test file (T003) that US1 creates. US2 is P1 like US1, so ship it together with US1.
- **US3 (Phase 5)**: Depends on US1 (the button exists) and, in practice, on T009 because both edit the same JSX element. It does not need US2's page changes.
- **Polish (Phase 6)**: Depends on all stories.

### Task Dependency Graph

```text
T001 → T002 ─┬─► T003 ───────────────► T008 ─► T013
             ├─► T004 ───────────────► T009 ─► T014
             └─► T005 ─► T006 ───────► T010 ─► T011
   US1 verify:  T007 ⇐ {T003, T004, T006}
   US2 verify:  T012 ⇐ {T007, T008, T009, T011}
   US3 verify:  T015 ⇐ {T012, T013, T014}
   Polish:      T016 ∥ T017 ⇐ T015;  T018 ⇐ T015;  T019 ⇐ T018;  T020 ⇐ T019
```

### Same-file sequencing (cannot be parallel)

- `VideoPlayer.tsx`: T002 → T004 → T009 → T014
- `page.tsx`: T005 → T006 → T010 → T011
- `video-player-previous-sentence.test.tsx`: T003 → T008 → T013

### Within Each User Story

- Write the test cases first and confirm they fail, then implement, then run the jest and manual verification.

---

## Parallel Opportunities

There are three independent file tracks. Tasks marked [P] are T003, T004, T005, T009, T010, T014, T016, and T017.

### User Story 1

```text
# After T002, launch together (3 different files):
Task T003: Create tests/unit/video-player-previous-sentence.test.tsx (cases a–d)
Task T004: Render SkipBack Previous button in app/components/video-player/VideoPlayer.tsx
Task T005: Add handlePreviousSentence in app/dashboard/[exerciseId]/practice/page.tsx
```

### User Story 2

```text
# After US1, launch together:
Task T008: Add lock case (e) in tests/unit/video-player-previous-sentence.test.tsx
Task T009: Add isPreviousDisabled to disabled expr in VideoPlayer.tsx
Task T010: Add saving/checking guard in page.tsx handlePreviousSentence
```

### User Story 3

```text
# T013 (test file) and T014 (VideoPlayer.tsx) touch different files and can run together.
```

### Polish

```text
Task T016: npm run type-check
Task T017: npm run lint
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. T001 (verify the 006 baseline) → T002 (props).
2. T003–T007: Previous button, page handler, and test cases a–d.
3. **STOP and VALIDATE**: jest plus quickstart rows 1–6 and 11. You can demo at this point.

Note: the MVP already performs no server writes, because the US1 handler never calls `saveProgress`. However, it is not yet protected against in-flight save or accuracy-check races. Treat **US1 + US2 together as the minimum shippable increment**, since both are P1.

### Incremental Delivery

1. Setup + Foundational → baseline confirmed and props added.
2. US1 → navigation and playback (MVP demo).
3. US2 → lock while saving/checking, verified no-write (ship point: both P1 stories done).
4. US3 → tooltip and a11y assertions plus manual keyboard/VoiceOver pass.
5. Polish → type-check, lint, both jest suites, regression, scope check.

### Out of Scope (accepted decisions / open questions from plan.md)

- No `GREATEST(currentSentenceIndex, ?)` change in `save-progress` for multi-step back-then-submit (research R7-1).
- No request sequencing or `AbortController`. The existing loading flags are used as the lock (research R3).
- No global shortcuts, no per-sentence drafts, no e2e tests.
