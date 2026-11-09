# Quickstart: Validate US5 & US6

**Feature**: 010-user-profile | **Date**: 2026-11-09

## Prerequisites

- Dev server running (`npm run dev`), database migrated (`npm run db:migrate`).
- A test account (email + password) you can sign in with at `/`.
- Its JWT: sign in once, then read `localStorage.getItem('token')` in devtools, or
  capture the `token` field from the `POST /api/auth/login` response.

## Scenario 1 — Change password (US5)

1. Open `/profile` → "Change password" card.
2. Wrong current password → error toast, password unchanged.
3. Weak new password (e.g. `short`) → error listing the unmet rule.
4. Correct current + valid new password → "Password updated" toast.
5. Verify via API: `POST /api/auth/login` with the **old** password → 401;
   with the **new** password → 200.
6. UI parity check: the same four outcomes via curl against
   `POST /api/user/password` (see contracts/user-account-api.md).

Expected: only the new password authenticates afterwards.

## Scenario 2 — Deactivated account cannot log in (US6 + login fix)

1. On a **throwaway** account, open `/profile` → "Danger zone" → "Delete account".
2. Dialog: confirm button is disabled until a password is typed; wrong password →
   error toast, account still active (verify: reload dashboard works).
3. Correct password → success; client clears token and lands on `/`.
4. `POST /api/auth/login` with that account's credentials →
   `401 { "error": "Invalid email or password" }` (same as unknown account).
5. Database check: `SELECT isActive FROM User WHERE email = '<email>'` → `0`.

Expected: deactivated account is fully locked out and indistinguishable from a
non-existent account at login.

## Scenario 3 — Regression

- `npm run lint` passes.
- `npx tsc --noEmit` reports no errors in `app/api/user/`, `app/api/auth/login/`,
  `app/profile/`, `lib/validation.ts` (pre-existing failures in `tests/unit/` are
  out of scope).
- Existing flows still work: login (active account), avatar upload/remove,
  name edit, dashboard banner.
