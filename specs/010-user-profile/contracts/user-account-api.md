# API Contracts: US5 Change Password & US6 Account Deletion

**Date**: 2026-11-09 | **Feature**: 010-user-profile

All endpoints require `Authorization: Bearer <token>` (existing JWT auth).
Unauthenticated requests return `401 { "error": "Unauthorized: Authentication required" }`.

## POST /api/user/password

Change the signed-in user's password.

**Request**

```json
{
  "currentPassword": "OldPass1!",
  "newPassword": "NewPass2@"
}
```

**Responses**

| Status | Body | Condition |
|--------|------|-----------|
| 200 | `{ "success": true, "message": "Password updated" }` | Password changed |
| 400 | `{ "error": "<first validation message>" }` | Missing fields or `newPassword` fails strength rules |
| 401 | `{ "error": "Current password is incorrect" }` | `currentPassword` does not match |
| 401 | `{ "error": "Unauthorized: Authentication required" }` | No/invalid token |

Notes:
- `currentPassword` and `newPassword` must differ from each other is NOT enforced
  (changing to the same password is harmless and allowed).
- Existing tokens are NOT revoked (spec Assumptions).

## DELETE /api/user/account

Soft-deactivate the signed-in user's account.

**Request**

```json
{ "password": "OldPass1!" }
```

**Responses**

| Status | Body | Condition |
|--------|------|-----------|
| 200 | `{ "success": true }` | `User.isActive` set to 0; client must discard token and redirect to login |
| 400 | `{ "error": "Password is required" }` | Missing password |
| 401 | `{ "error": "Password is incorrect" }` | Wrong password; account NOT deactivated |
| 401 | `{ "error": "Unauthorized: Authentication required" }` | No/invalid token |

## POST /api/auth/login (behavior change)

Existing endpoint; one added rule:

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "Invalid email or password" }` | **NEW**: account exists but `isActive = 0` — identical response to unknown email / wrong password |
