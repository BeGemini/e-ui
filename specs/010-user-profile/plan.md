# Implementation Plan: User Profile & Dashboard Navigation

**Branch**: `010-user-profile` | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-user-profile/spec.md`

## Summary

US1–US4 (profile page, avatar management, navbar menu, logo, jump-back-in banner) are
already implemented. This plan covers the remaining scope: **US5 change password** and
**US6 account deletion**.

Technical approach: two new authenticated API routes under `app/api/user/` reusing the
existing session (`verifySessionFromRequest`), bcrypt helpers (`verifyPassword`,
`hashPassword`) and zod validation. Account deletion is a soft deactivation
(`User.isActive = 0`) gated by password confirmation; the login route is fixed to
reject deactivated accounts with the generic invalid-credentials error. The profile
page gains a "Change password" card and a "Danger zone" card with a password-confirmed
alert dialog.

## Technical Context

**Language/Version**: TypeScript (strict mode), Node.js via Next.js

**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui (alert-dialog, card, input, label, button), Tailwind CSS, bcryptjs, zod, mysql2, lucide-react

**Storage**: MySQL (`User` table — existing `passwordHash` and `isActive` columns; no schema migration needed)

**Testing**: ESLint + `tsc --noEmit` (project standard); existing jest suite is broken pre-feature (out of scope)

**Target Platform**: Desktop web browsers (1280px+), per constitution IV

**Project Type**: Web application (Next.js full-stack)

**Performance Goals**: Standard interactive web (<1s API responses); no special targets

**Constraints**: Stateless JWT auth — no server-side session invalidation on password change (documented in spec Assumptions)

**Scale/Scope**: Single-user account self-service; 2 new API routes, 1 API behavior fix, 2 new profile page sections

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. shadcn-first UI | PASS | New UI uses existing `components/ui/alert-dialog`, `card`, `input`, `label`, `button` only |
| II. TypeScript strict | PASS | New routes/pages in TS; zod schemas in `lib/validation.ts`; types in `lib/types.ts` |
| III. Next.js-only backend | PASS | Endpoints in `app/api/user/*`; no external services |
| IV. Desktop + a11y | PASS | Desktop layout; dialog has labels/aria, destructive action clearly marked |
| V. Code quality | PASS | Follows existing route/page patterns; lint + type-check required |
| VI. Avoid over-engineering | PASS | Minimal scope: reuse existing auth/bcrypt/zod helpers; no new tables, no token revocation machinery |

No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/010-user-profile/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality checklist (from /skill:speckit-specify)
```

### Source Code (repository root)

```text
app/
├── api/
│   ├── auth/login/route.ts            # MODIFIED: reject deactivated accounts
│   └── user/
│       ├── password/route.ts          # NEW: POST change password
│       └── account/route.ts           # NEW: DELETE soft-deactivate account
├── profile/page.tsx                   # MODIFIED: add Change password + Danger zone cards
lib/
└── validation.ts                      # MODIFIED: add ChangePasswordSchema, DeleteAccountSchema
```

**Structure Decision**: Single Next.js project; API routes in `app/api/user/`
(following the existing profile/avatar routes from US1), page changes colocated in
`app/profile/page.tsx`, validation schemas in `lib/validation.ts` alongside existing
auth schemas.

## Phase 0 Summary (research.md)

All decisions resolved without open questions — see [research.md](research.md):

1. Password strength rules for change-password reuse the registration zod rules.
2. Account deletion is soft (`isActive = 0`), confirmed by current password.
3. Login rejects `isActive = 0` accounts with the generic invalid-credentials error.
4. Confirmation UX uses the existing shadcn `alert-dialog` with a password input.

## Phase 1 Summary

- Data model (no schema change): [data-model.md](data-model.md)
- API contracts: [contracts/user-account-api.md](contracts/user-account-api.md)
- Validation guide: [quickstart.md](quickstart.md)

**Post-design Constitution re-check**: PASS (no new violations introduced).
