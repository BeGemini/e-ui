# Quickstart: Validate Exercise Knowledge Points

**Feature**: Exercise Knowledge Points  
**Created**: 2026-09-13  
**Purpose**: Step-by-step validation scenarios to prove the feature works end-to-end.

## Prerequisites

1. Application is running locally (`npm run dev`).
2. Database is migrated (including `migrations/003_add_knowledge_points.sql`).
3. You have a registered user account and a valid JWT token.
4. At least one exercise with parsed subtitles exists and has been started or completed at least one sentence so that the feedback area can appear.

## Scenario 1: Create a Word Knowledge Point from Correct Text

### Steps

1. Log in and navigate to an exercise.
2. Start practice and complete at least one dictation sentence so the feedback area shows **Correct Text**.
3. Select a single word in the Correct Text (for example, select "apple").
4. Verify that a floating action menu appears near the selection.
5. Click the create action.
6. In the dialog, choose **Word** as the category, enter a description, and save.

### Expected Result

- The dialog closes without error.
- The selected word is highlighted with the word category color (e.g., blue).
- Refreshing the page and viewing the same sentence still shows the highlight.

---

## Scenario 2: Create a Phrase Knowledge Point

### Steps

1. With the feedback area still open, select two or more contiguous words.
2. Click the create action in the floating menu.
3. Choose **Phrase** as the category, enter a description, and save.

### Expected Result

- The phrase is highlighted with the phrase category color (e.g., green).
- A separate word inside the same phrase, if already saved as a word knowledge point, remains highlighted with its own color; the overlapping region shows a combined color.

---

## Scenario 3: Save a Sentence Knowledge Point

### Steps

1. Select the entire Correct Text sentence.
2. Click the create action.
3. Choose **Sentence** as the category, enter a description, and save.

### Expected Result

- The entire sentence is highlighted with the sentence category color (e.g., purple).

---

## Scenario 4: Partial Word Selection Is Normalized

### Steps

1. Intentionally start the selection in the middle of a word and end in the middle of another word.
2. Click the create action.

### Expected Result

- The dialog shows the normalized text expanded to complete word boundaries.
- Saving stores the whole words, not the partial selection.

---

## Scenario 5: Duplicate Knowledge Point Is Ignored

### Steps

1. Select a word or phrase that has already been saved as a knowledge point.
2. Click the create action and attempt to save again.

### Expected Result

- No duplicate knowledge point is created.
- The UI may show the existing knowledge point description to confirm it is already captured.

---

## Scenario 6: Dashboard Shows Knowledge Point Count

### Steps

1. Return to the dashboard after creating some knowledge points.
2. Locate the exercise card for the exercise used above.

### Expected Result

- The exercise card shows the number of knowledge points created for that exercise.
- Exercises with no knowledge points show a zero or empty state.

---

## Scenario 7: Navigate to Knowledge Point List Page

### Steps

1. On the dashboard, click the knowledge point indicator on the exercise card.

### Expected Result

- The browser navigates to `/dashboard/[exerciseId]/knowledge-points`.
- The page lists all knowledge points for that exercise created by the current user, grouped or labeled by category.

---

## Scenario 8: Edit and Delete a Knowledge Point

### Steps

1. On the knowledge point list page, click **Edit** on a knowledge point.
2. Change the category and description, then save.
3. Return to practice and view the same Correct Text.

### Expected Result

- The highlight color reflects the new category.

### Steps (Delete)

1. On the knowledge point list page, click **Delete** on a knowledge point and confirm.

### Expected Result

- The knowledge point disappears from the list.
- The highlight no longer appears in the Correct Text.
- The dashboard count decreases by one.

---

## Test Commands

Run unit tests after implementation:

```bash
npm run test:unit knowledge-point
npm run type-check
npm run lint
```

Run integration tests:

```bash
npm run test:integration knowledge-points
```

Run E2E tests (after Playwright tests are added):

```bash
npm run test:e2e knowledge-points
```

## Success Checklist

- [ ] Text selection in Correct Text opens a floating action menu.
- [ ] Creating a knowledge point highlights the captured text with the correct category color.
- [ ] Word, phrase, and sentence categories each have distinct colors.
- [ ] Partial word selections are normalized to whole words.
- [ ] Duplicate knowledge points are ignored.
- [ ] Dashboard shows the correct knowledge point count per exercise.
- [ ] Clicking the dashboard indicator navigates to the knowledge point list page.
- [ ] Knowledge points can be edited and deleted.
- [ ] Highlights update immediately after edit/delete.
- [ ] `tsc --noEmit` passes.
- [ ] `npm run lint` passes.
