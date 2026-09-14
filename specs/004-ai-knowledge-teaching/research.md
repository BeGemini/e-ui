# Research: AI Knowledge Point Teaching

**Feature**: AI Knowledge Point Teaching
**Date**: 2026-09-14

## Decisions

### AI Provider & Model

- **Decision**: Use DeepSeek API with the `deepseek-flash` model.
- **Rationale**:
  - User explicitly chose `deepseek-flash`.
  - `deepseek-flash` is positioned as a fast, cost-efficient model from DeepSeek, well suited for simple explanatory generation tasks.
  - The project already stores `DEEPSEEK_API_KEY` in `.env.local`, so no new credential store is needed.
- **Alternatives considered**: Other DeepSeek models such as `deepseek-chat` or `deepseek-reasoner`. Rejected because the user explicitly wants `deepseek-flash`, and the task does not require deep reasoning—just a fast, structured explanation.

### API Calling Method

- **Decision**: Use the standard DeepSeek Chat Completions HTTP API (`https://api.deepseek.com/chat/completions`) with a JSON request body and a strict system prompt.
- **Rationale**:
  - DeepSeek follows the OpenAI-compatible chat completions format, making integration straightforward without a dedicated SDK.
  - Using `fetch` (built into Next.js/Node.js) keeps the dependency surface minimal and aligns with the project's existing HTTP call patterns.
  - A system prompt that constrains the response format ensures the explanation consistently includes the four required sections: meaning, usage scenarios, example sentences, and similar expressions.
- **Alternatives considered**: Using a DeepSeek SDK or Vercel AI SDK. Rejected to avoid adding a new dependency when `fetch` is sufficient and the response format is simple and deterministic.

### Request Context

- **Decision**: Send `capturedText`, `category`, and the full source sentence (`correctText`) to the AI service.
- **Rationale**:
  - The user requested that the "correct text" be passed as context. In the practice UI, the source sentence is available as `currentSubtitle.text`.
  - Including the source sentence gives the model contextual disambiguation (e.g., whether a word is being used as a noun or verb, idiomatic usage, register).
  - Including `category` (word/phrase/sentence) lets the model tailor the depth and format of the explanation.
- **Alternatives considered**: Sending only `capturedText`. Rejected because context improves explanation quality, and the user explicitly wants context included.

### Backend Endpoint Design

- **Decision**: Add a new Next.js API route at `POST /api/ai/knowledge-point-teach` that accepts `{ capturedText, category, sourceSentence }` and returns `{ explanation: string }`.
- **Rationale**:
  - Centralizes AI logic on the backend so the API key stays server-side and prompts can be versioned.
  - Matches the project constitution's "Full-Stack Integration (Next.js Only)" principle.
  - Provides a reusable endpoint for future features (e.g., editing a knowledge point, AI teaching from other screens).
- **Alternatives considered**: Calling DeepSeek directly from the browser. Rejected because it would expose the API key and make prompt management harder.

### Frontend Integration

- **Decision**: Add an "AI教学" button to the existing `KnowledgePointCreateDialog`, invoke the new API route, and populate the note `Textarea` with the returned explanation.
- **Rationale**:
  - The create dialog is the exact place the user specified for the button.
  - Populating the existing note text area keeps the existing save flow unchanged and lets users edit before saving.
- **Alternatives considered**: Showing AI output in a separate panel or pre-filling a read-only field. Rejected because they add UI complexity or reduce user control; the existing editable text area is the simplest path.

### Response Format

- **Decision**: Return the AI explanation as plain Markdown text that explicitly contains four sections: 1) Meaning, 2) Usage Scenarios, 3) Example Sentences, and 4) Similar/Alternative Expressions.
- **Rationale**:
  - Markdown renders naturally in a `Textarea` as readable plain text.
  - Explicit section headings make the output predictable and easy to validate in tests.
  - Keeping the response as a single string matches the current `description` column type in the database.
- **Alternatives considered**: Returning a structured JSON object and formatting it in the client. Rejected to avoid changing the database schema or adding parsing complexity; the current `description` field is a string.

### Error Handling Strategy

- **Decision**: On AI failure, return a 502/500 error with a clear message, and let the client show a toast/error while keeping the dialog and note field usable for manual entry.
- **Rationale**:
  - AI availability is external and may be transient; manual fallback must always work.
  - The user story for recovery from AI failures requires the dialog to remain open and editable.

## Open Questions Resolved

- **Model**: `deepseek-flash`
- **API key location**: `DEEPSEEK_API_KEY` in `.env.local`
- **Context passed**: `capturedText`, `category`, and the full source sentence (`sourceSentence` / `correctText`)
- **Output format**: Markdown explanation with four required sections
- **No new database tables needed**: The existing `KnowledgePoint.description` field stores the AI-generated note.

## Constraints Captured from Constitution

- shadcn/ui components only.
- TypeScript strict mode.
- Backend logic in Next.js API routes.
- No custom HTML elements for user-facing UI.
- Existing lint (`npm run lint`) and type-check (`tsc --noEmit`) must pass.
