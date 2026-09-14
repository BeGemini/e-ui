# Quickstart: AI Knowledge Point Teaching

**Feature**: AI Knowledge Point Teaching
**Date**: 2026-09-14

## Prerequisites

- The local Next.js development server is running (`npm run dev`).
- A valid `DEEPSEEK_API_KEY` is set in `.env.local`.
- You are logged into the application.
- You have access to an exercise with subtitles and at least one sentence.

## End-to-End Validation Scenario

### 1. Open a practice exercise

1. Navigate to the dashboard.
2. Select an exercise and click **Practice**.
3. Type a dictation and click **Check** so the feedback panel appears.

### 2. Trigger AI teaching

1. In the feedback panel, highlight or click a word/phrase from the correct text.
2. Click **Create Knowledge Point** in the popover.
3. In the dialog that opens, click the **AI教学** button.

**Expected outcome**: The note `Textarea` is populated with a Markdown explanation that contains `## Meaning`, `## Usage Scenarios`, `## Example Sentences`, and `## Similar / Alternative Expressions`.

### 3. Edit and save

1. Review the generated explanation.
2. Optionally edit the content.
3. Click **Save**.

**Expected outcome**: The dialog closes, the knowledge point is saved, and the highlighted text in the feedback panel is marked as having a knowledge point.

### 4. Verify persistence

1. Navigate to **Knowledge Points** for the same exercise.
2. Find the newly created knowledge point.

**Expected outcome**: The saved description matches the AI-generated (and possibly edited) content.

## Manual-Note Fallback Validation

1. Repeat the steps above, but instead of clicking **AI教学**, type a note manually.
2. Click **Save**.

**Expected outcome**: The knowledge point is saved with the manually entered text and no AI content.

## AI Failure Recovery Validation

1. Temporarily invalidate `DEEPSEEK_API_KEY` in `.env.local` (or disconnect from the network).
2. Restart the dev server.
3. Open the create knowledge point dialog and click **AI教学**.

**Expected outcome**: A clear error message is shown, but the dialog remains open and you can still type a manual note and save it.

## API-Only Validation (optional)

Send a curl request to the backend endpoint:

```bash
curl -X POST http://localhost:3000/api/ai/knowledge-point-teach \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "capturedText": "desperate",
    "category": "word",
    "sourceSentence": "I have never been more desperate in my life."
  }'
```

**Expected outcome**: A JSON response with `success: true` and a Markdown explanation containing the four required sections.

## Commands Summary

```bash
# Start the dev server
npm run dev

# Run type checks
npm run type-check

# Run lint
npm run lint

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration
```

All checks must pass before the feature branch is merged.
