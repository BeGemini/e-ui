# Quickstart: Validate Subtitle Merge & Edit Optimization

**Feature**: Subtitle Merge & Edit Optimization  
**Created**: 2026-09-12  
**Purpose**: Step-by-step validation scenarios to prove the feature works end-to-end.

---

## Prerequisites

1. Application is running locally (`npm run dev`).
2. Database is migrated and at least one exercise with an SSA/ASS subtitle file exists.
3. You have a registered user account and a valid JWT token.
4. The exercise subtitle file contains at least one `\N` marker for the cleanup test.

---

## Scenario 1: Verify Subtitle Numbering Starts at 1

### Steps

1. Log in and navigate to an exercise detail page.
2. Click **Customize Subtitles**.
3. Observe the Subtitle Management list.

### Expected Result

- The first visible subtitle row shows **Sentence 1** (not Sentence 2).
- Each subsequent row increments by exactly 1 with no gaps.

---

## Scenario 2: Verify `\N` Markers Are Cleaned

### Steps

1. Ensure the exercise subtitle file contains a line like:
   ```
   Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,First part\NSecond part
   ```
2. Open the Subtitle Management page for that exercise.
3. Locate the row that originally contained `\N`.

### Expected Result

- The row text displays as `First part Second part` without any `\N` characters.
- During practice, the correct answer also shows the cleaned text.

---

## Scenario 3: Merge Lines and See a Single Row

### Steps

1. Open the Subtitle Management page.
2. Select rows 3, 4, and 5 using their checkboxes.
3. Click **Create Group** (or equivalent merge action).
4. Observe the list.

### Expected Result

- Rows 3, 4, and 5 collapse into a single merged row.
- The merged row displays the combined time range.
- An **Unmerge** action is available on the merged row.

---

## Scenario 4: Edit Merged Text and Use It as Answer Key

### Steps

1. Create a merge group from rows 3, 4, and 5.
2. Click into the merged row to edit its text.
3. Change the text to a refined version, e.g.:
   - Before: `This is the third sentence. This is the fourth sentence. This is the fifth sentence.`
   - After: `This is a refined combined sentence.`
4. Save the configuration.
5. Start practice for the same exercise.
6. Play the merged sentence and submit any dictation input.

### Expected Result

- The **Correct Text** shown after checking uses the edited merged text.
- Accuracy is calculated against the edited text, not the original joined text.

---

## Scenario 5: Verify Unmerge Restores Original Rows

### Steps

1. Open an exercise with a saved merge group that has `customText`.
2. Click **Unmerge** on the merged row.
3. Confirm the action if prompted.

### Expected Result

- The merged row splits back into the original separate rows.
- The edited `customText` is discarded.
- Original line texts are restored.

---

## Scenario 6: Read-Only Constraint Still Enforces

### Steps

1. Start an exercise and complete at least one sentence.
2. Open the Subtitle Management page.
3. Try to merge, unmerge, skip, or edit a sentence before your current progress.

### Expected Result

- Locked sentences cannot be modified.
- The UI shows a clear "Locked" indicator.

---

## Test Commands

Run unit tests after implementation:

```bash
npm run test:unit subtitle
npm run type-check
npm run lint
```

Run E2E tests (after Playwright tests are added):

```bash
npm run test:e2e subtitle-customization
```

---

## Success Checklist

- [ ] Subtitle numbering starts at 1 across all screens.
- [ ] No `\N` visible in management UI or practice feedback.
- [ ] Merged groups display as single rows.
- [ ] Merged rows are editable and the edited text is persisted.
- [ ] Practice answer key uses edited merged text.
- [ ] Unmerge restores original rows and discards edits.
- [ ] Read-only constraint continues to work.
- [ ] `tsc --noEmit` passes.
- [ ] `npm run lint` passes.
