# Data Model: US5 Change Password & US6 Account Deletion

**Date**: 2026-11-09 | **Feature**: 010-user-profile

No schema migration is required — both capabilities reuse existing `User` columns.

## User (existing table)

| Field | Type | Notes for this scope |
|-------|------|----------------------|
| `userId` | CHAR(36) PK | Identity for session lookups |
| `email` | VARCHAR(255) | Login identifier; unchanged |
| `passwordHash` | VARCHAR(255) | Rewritten by change-password (bcrypt, cost 10, via `hashPassword`) |
| `isActive` | BOOLEAN DEFAULT TRUE | Set to 0 by account deletion; login rejects `isActive = 0` |
| `role`, `name`, `avatarUrl`, `registrationDate`, `lastLoginDate` | — | Unchanged by this scope |

## State Transitions

```text
           register                delete account (password confirmed)
[no account] ────────► [active] ───────────────────────────► [deactivated]
                            │                                        │
                            │ change password (current pw verified)  │ login: 401
                            ▼                                        ▼
                       [active, new passwordHash]              [no access]
```

- **active → active** (change password): requires correct `currentPassword`;
  `newPassword` must pass registration strength rules.
- **active → deactivated**: requires correct `password`; sets `isActive = 0`;
  one-way in this iteration (no self-service restore).
- **deactivated**: login returns the same generic `401 Invalid email or password`
  as unknown accounts.

## Validation Rules

| Input | Rule | Source |
|-------|------|--------|
| `currentPassword` | required, non-empty; must match stored `passwordHash` | spec FR-013/014 |
| `newPassword` | ≥8 chars, ≥1 uppercase, ≥1 number, ≥1 special char (`!@#$%^&*`) | `RegisterSchema.password` parity (research R1) |
| `password` (delete) | required, non-empty; must match stored `passwordHash` | spec FR-015 |
