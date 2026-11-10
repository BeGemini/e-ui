# Research: US5 Change Password & US6 Account Deletion

**Date**: 2026-11-09 | **Feature**: 010-user-profile

All Technical Context items were known from the existing codebase; the following
design decisions were resolved during planning.

## R1: Password strength rules for change-password

- **Decision**: Reuse the registration password rules (min 8 chars, ≥1 uppercase,
  ≥1 number, ≥1 special character `!@#$%^&*`) via a new `ChangePasswordSchema` in
  `lib/validation.ts` that copies the `RegisterSchema.password` field.
- **Rationale**: FR-013 requires "the same strength rules as registration". The
  registration rules live in the zod `RegisterSchema`, which is stricter than
  `lib/auth.ts`'s `validatePasswordStrength` (no special-char rule). Matching
  registration avoids two diverging password policies.
- **Alternatives considered**: `validatePasswordStrength()` from `lib/auth.ts` —
  rejected because it is weaker than the registration policy.

## R2: Account deletion semantics

- **Decision**: Soft deactivation — `UPDATE User SET isActive = 0`, confirmed by
  re-entering the current password. Existing JWTs remain technically valid until
  expiry, but every meaningful flow (login, /api/auth/me re-check on page load)
  blocks the account; the client discards its token immediately on success.
- **Rationale**: The schema documents `isActive` as "false = deleted/suspended",
  and spec Assumptions rule out hard erasure for this iteration. Soft delete keeps
  practice history restorable/auditable and needs no migration.
- **Alternatives considered**: Hard `DELETE FROM User` — rejected (data loss,
  FK cascade surprises, contradicts spec Assumptions). Token revocation list —
  rejected as over-engineering (constitution VI; tokens expire in ≤7 days and the
  client clears its own token).

## R3: Blocking deactivated accounts at login

- **Decision**: In `app/api/auth/login/route.ts`, after fetching the user row,
  treat `isActive = 0` identically to "user not found": return
  `401 { error: 'Invalid email or password' }`.
- **Rationale**: FR-016 — deactivated accounts must be indistinguishable from
  non-existent ones; the current code does not check `isActive` at all (bug).
- **Alternatives considered**: A distinct "account disabled" 403 — rejected
  (account-existence enumeration).

## R4: Confirmation UX for destructive action

- **Decision**: "Danger zone" card on the profile page with a destructive-styled
  button that opens the existing shadcn `alert-dialog`; the dialog contains a
  password input and the confirm action stays disabled until a password is entered.
- **Rationale**: FR-015 requires password confirmation; `components/ui/alert-dialog`
  already exists (constitution I: shadcn-only).
- **Alternatives considered**: Typed-confirmation ("type DELETE") — rejected as
  unnecessary friction when password confirmation already proves identity.
