# Implementation Plan: Exercise Knowledge Points

**Branch**: `003-exercise-knowledge-points` | **Date**: 2026-09-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-exercise-knowledge-points/spec.md`

## Summary

Add a per-user knowledge-point feature that lets learners capture words, phrases, or sentences from the Correct Text shown after a dictation check. Knowledge points are categorized, color-highlighted in the feedback area, counted on the dashboard, and managed on a dedicated list page. The implementation extends the existing Next.js App Router application, MySQL schema, and shadcn/Tailwind UI.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16.3.4 (App Router), React 19.2.8, Node.js runtime

**Primary Dependencies**: Next.js API routes (`app/api/*`), shadcn/ui components, Tailwind CSS 4, mysql2, jsonwebtoken, bcryptjs

**Storage**: MySQL 8.0+ via `lib/db.ts` connection pool

**Testing**: Jest + React Testing Library for unit/integration, Playwright for E2E, `tsc --noEmit` for type checking, ESLint for linting

**Target Platform**: Desktop web browsers

**Project Type**: full-stack web application

**Performance Goals**: Dashboard and practice data load within 2 seconds; knowledge point create/update/delete operations complete within 500 ms

**Constraints**: All UI elements must use shadcn/ui components; strict TypeScript mode; backend logic must live in Next.js API routes; no external microservices

**Scale/Scope**: Current user base fits a single Next.js + MySQL deployment; knowledge points are private to each user per exercise

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. shadcn-first UI | Pass | New dashboard indicator, floating menu, dialog, and list page will use shadcn/ui components (`Badge`, `Button`, `Card`, `Dialog`, `Input`, `Table`) |
| II. TypeScript strict | Pass | `tsconfig.json` has `strict: true`; all new API payloads and component props will be typed in `lib/types.ts` |
| III. Next.js full-stack | Pass | New endpoints will be added under `app/api/*`; database access remains in `lib/db.ts` and API routes |
| IV. Desktop web & accessible | Pass | Desktop layout using Tailwind; mouse-driven text selection and floating menu |
| V. Quality & testing | Pass | Integration tests for API routes and unit tests for text normalization/highlighting logic recommended |

**Re-check after Phase 1**: No constitution violations introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/003-exercise-knowledge-points/
├── plan.md              # This file
├── research.md          # Phase 0 output (none needed; all unknowns resolved by clarify)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
app/
├── api/
│   └── knowledge-points/
│       └── [exerciseId]/
│           └── route.ts          # CRUD for knowledge points
│   └── exercises/
│       └── route.ts              # extend to include knowledgePointCount
│   └── practice/
│       └── [exerciseId]/
│           └── route.ts          # include user's knowledge points in practice data
├── components/
│   ├── knowledge-point/
│   │   ├── KnowledgePointTextSelector.tsx  # text selection + floating menu in Correct Text
│   │   ├── KnowledgePointCreateDialog.tsx  # create/edit dialog for a knowledge point
│   │   └── HighlightedCorrectText.tsx      # render Correct Text with category highlights
│   ├── dictation/
│   │   └── WordFeedbackDisplay.tsx         # extend to support highlight integration
│   ├── exercise-list/
│   │   └── SeriesCard.tsx / SeasonExpander.tsx / ExerciseItem.tsx  # add knowledge point indicator
│   └── knowledge-point-list/
│       └── KnowledgePointList.tsx          # list page component
├── dashboard/
│   └── [exerciseId]/
│       └── knowledge-points/
│           └── page.tsx            # knowledge point list page
├── globals.css
├── layout.tsx
└── ...
components/ui/                      # existing shadcn components
lib/
├── types.ts                        # extend with KnowledgePoint types
├── validation.ts                   # add KnowledgePoint schemas
├── db.ts                           # existing MySQL pool
├── utils.ts                        # shared helpers
└── ...
migrations/
└── 003_add_knowledge_points.sql    # new migration for KnowledgePoint table
tests/
├── integration/
│   └── api/
│       └── knowledge-points.test.ts
├── unit/
│   └── lib/
│       └── knowledge-point-utils.test.ts
└── e2e/
    └── knowledge-points.spec.ts
```

**Structure Decision**: Extend the existing Next.js monolithic app structure. New components live in `app/components/` grouped by feature. New API routes are nested under `app/api/`. The database migration is numbered sequentially after the previous migrations.

## Complexity Tracking

> **No constitution violations or unjustified complexity introduced.**
