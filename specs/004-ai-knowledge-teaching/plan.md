# Implementation Plan: AI Knowledge Point Teaching

**Branch**: `004-ai-knowledge-teaching` | **Date**: 2026-09-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-ai-knowledge-teaching/spec.md`

## Summary

Add an optional "AI教学" button to the existing knowledge point creation dialog. When clicked, the backend calls the DeepSeek `deepseek-flash` model with the captured text, selected category, and full source sentence as context, then returns a structured Markdown explanation. The explanation is placed into the existing note text area so the user can review, edit, and save it as a normal knowledge point description.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode (ES2017 target)

**Primary Dependencies**: Next.js 16.3.4 App Router, React 19.2.8, shadcn/ui, Tailwind CSS v4, mysql2

**Storage**: MySQL (no schema changes required; `KnowledgePoint.description` stores the AI-generated Markdown)

**Testing**: Jest (unit/integration), Playwright (e2e), ESLint, `tsc --noEmit`

**Target Platform**: Desktop web browsers

**Project Type**: Full-stack Next.js web application

**Performance Goals**: AI explanation returned within 5 seconds under normal network conditions

**Constraints**: API key must remain server-side; no new dependencies unless absolutely necessary; UI must use shadcn/ui only

**Scale/Scope**: Single user action per request; stateless AI feature; no background jobs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. UI Component Library (shadcn-First) | ✅ Pass | New button, loader, and toast use existing shadcn/ui components |
| II. Type Safety (Mandatory TypeScript) | ✅ Pass | New request/response types added to `lib/types.ts`; strict mode enabled |
| III. Full-Stack Integration (Next.js Only) | ✅ Pass | AI call is wrapped in `app/api/ai/knowledge-point-teach/route.ts` |
| IV. Desktop Web & Accessible Design | ✅ Pass | Desktop-only; reuses the existing dialog layout |
| V. Code Quality & Testing Discipline | ✅ Pass | Lint and type-check required; integration test for API route recommended |

No constitution violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/004-ai-knowledge-teaching/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── ai-teach-api.md
├── spec.md              # Feature specification
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
app/
├── api/
│   └── ai/
│       └── knowledge-point-teach/
│           └── route.ts        # POST endpoint calling DeepSeek
└── components/
    └── knowledge-point/
        ├── KnowledgePointCreateDialog.tsx   # adds AI教学 button
        └── KnowledgePointTextSelector.tsx   # unchanged
lib/
├── types.ts                     # adds AI request/response types
└── validation.ts                # adds AiKnowledgePointTeachSchema
```

**Structure Decision**: Follow the existing Next.js App Router and shadcn/ui conventions already established in the codebase. Keep the AI feature colocated with knowledge points under `app/components/knowledge-point` and expose a single REST endpoint under `app/api/ai/knowledge-point-teach`.

## Complexity Tracking

No constitution violations to justify.
