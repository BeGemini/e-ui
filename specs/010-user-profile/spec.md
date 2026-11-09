# Feature Specification: User Profile & Dashboard Navigation

**Feature Branch**: `010-user-profile`

**Created**: 2026-11-09

**Status**: US1–US4 implemented; US5–US6 added 2026-11-09 as new scope (not yet built)

**Input**: User description: "User profile feature: avatar upload/remove (COS storage, private bucket served via authenticated proxy), display name editing, email display, user menu in the sticky dashboard navbar (profile, content management for admins, logout), site logo in navbar, and a 'Jump back in' banner linking to the most recently practiced exercise (includes fixing lastAttemptDate never being written)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Profile Details (Priority: P1)

A signed-in learner opens their profile page to personalize their account: they see
their current avatar (or a letter placeholder), their display name, and their email.
They can upload a new avatar image, replace it, remove it entirely (falling back to
the letter placeholder), and edit their display name. The email address is visible
but not editable.

**Why this priority**: A recognizable identity (avatar + name) is the core of the
feature; every other story depends on the profile data existing and being editable.

**Independent Test**: Sign in, open the profile page, upload an avatar, change the
display name, remove the avatar — each change is reflected immediately on both the
profile page and the navbar.

**Acceptance Scenarios**:

1. **Given** a signed-in user with no avatar, **When** they open the profile page, **Then** they see a circular placeholder showing the first letter of their display name (or email if no name is set).
2. **Given** a signed-in user on the profile page, **When** they select a valid image file (JPG, PNG, WebP or GIF, up to 5MB), **Then** the image is uploaded, stored, and displayed as their avatar everywhere avatars appear.
3. **Given** a user who already has an avatar, **When** they upload a new one, **Then** the new avatar replaces the old one and the previous stored image is deleted.
4. **Given** a user who has an avatar, **When** they choose "Remove avatar", **Then** the stored image is deleted and the letter placeholder is shown again.
5. **Given** a user on the profile page, **When** they edit the display name and save, **Then** the new name is persisted and shown in the navbar greeting, avatar menu, and avatar placeholder letter.
6. **Given** any signed-in user, **When** they view the profile page, **Then** their email address is displayed read-only.

---

### User Story 2 - Account Menu in the Navbar (Priority: P2)

A signed-in learner sees their avatar (or letter placeholder) at the right end of the
dashboard navbar. Clicking it opens a menu showing their name and email, with actions
to open the profile page and to log out. Administrators additionally see a "Content
management" entry that takes them to the admin area.

**Why this priority**: This is the primary entry point to the profile and replaces
scattered one-off buttons (logout, admin settings) with a single consistent menu.

**Independent Test**: Click the avatar in the navbar; verify the menu shows identity
info, navigates to the profile page, logs out, and that the admin entry only appears
for admin accounts.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they click the navbar avatar, **Then** a menu opens showing their display name (if set) and email.
2. **Given** the avatar menu is open, **When** the user chooses "Profile", **Then** they are taken to the profile page.
3. **Given** the avatar menu is open, **When** the user chooses "Logout", **Then** their session is ended and they are returned to the login page.
4. **Given** a user with the admin role, **When** they open the avatar menu, **Then** a "Content management" entry is shown that navigates to the admin area; non-admin users never see it.

---

### User Story 3 - Branded, Always-Visible Navbar (Priority: P3)

The dashboard navbar shows the site logo next to the user greeting, and stays fixed
at the top of the viewport while the learner scrolls through exercises and stats.

**Why this priority**: Branding and navigation persistence improve orientation but
deliver no functional capability on their own.

**Independent Test**: Load the dashboard and scroll: the logo and navbar remain
visible at the top at all times.

**Acceptance Scenarios**:

1. **Given** the dashboard page, **When** it loads, **Then** the site logo is displayed at the left of the navbar next to the welcome message.
2. **Given** a long dashboard page, **When** the user scrolls down, **Then** the navbar (logo, greeting, avatar menu) remains pinned to the top of the viewport.

---

### User Story 4 - Jump Back Into the Last Exercise (Priority: P3)

A returning learner sees a prominent banner at the top of the dashboard naming the
exercise they practiced most recently, with their progress, and a single tap takes
them directly into the practice page to continue.

**Why this priority**: Reduces the friction of resuming practice, but the exercise
list already provides full navigation as a fallback.

**Independent Test**: Practice any exercise, return to the dashboard, and use the
banner to land directly on the practice page of the exercise just practiced.

**Acceptance Scenarios**:

1. **Given** a user who has practiced at least one exercise, **When** the dashboard loads, **Then** a banner shows the most recently practiced exercise with series, episode, and sentence progress.
2. **Given** the banner is visible, **When** the user activates it, **Then** they land directly on the practice page for that exercise (not an intermediate detail page).
3. **Given** the banner is shown for an exercise, **When** the "Continue practicing" list is rendered, **Then** that same exercise is not duplicated in the list.
4. **Given** a brand-new user with no practice history, **When** the dashboard loads, **Then** no banner is shown.

---

### User Story 5 - Change Password (Priority: P2)

A signed-in learner changes their password from the profile page. They must enter
their current password to prove identity, then a new password that meets the same
strength rules as registration. After a successful change they stay signed in.

**Why this priority**: Credential self-service is a baseline account-management
capability; without it users depend on an admin to recover or rotate passwords.

**Independent Test**: On the profile page, submit a wrong current password (rejected),
then a weak new password (rejected), then a valid combination (succeeds); verify the
old password no longer works and the new one does at next login.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they submit the change-password form with an incorrect current password, **Then** the change is rejected with a clear error and the password is unchanged.
2. **Given** a signed-in user, **When** they submit a new password that fails the strength rules, **Then** the change is rejected with the unmet rules explained.
3. **Given** a signed-in user, **When** they submit the correct current password and a valid new password, **Then** the new password is stored (hashed) and a confirmation is shown.
4. **Given** a user who just changed their password, **When** they log in later, **Then** only the new password is accepted.

---

### User Story 6 - Delete Account (Priority: P3)

A signed-in learner can permanently deactivate their account from a clearly marked
danger zone on the profile page. To prevent accidents, they must confirm with their
password. Once deactivated, they are signed out immediately and can no longer log
in with that account.

**Why this priority**: Required for user data control and trust, but used rarely;
everything else in account management works without it.

**Independent Test**: Deactivate a test account, then verify the session is dead and
login with the same credentials is rejected.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the profile page, **When** they initiate account deletion, **Then** they are asked to confirm with their password before anything happens.
2. **Given** the deletion confirmation, **When** the user enters a wrong password, **Then** the account is NOT deactivated and an error is shown.
3. **Given** the deletion confirmation, **When** the user enters the correct password, **Then** the account is deactivated, all active sessions are ended, and the user is returned to the login page.
4. **Given** a deactivated account, **When** anyone attempts to log in with its credentials, **Then** login is rejected as if the credentials were invalid.

---

### Edge Cases

- Uploading a file that is not a supported image type, or larger than 5MB, is rejected with a clear error message and the current avatar is unchanged.
- Avatar images are stored in a private bucket: direct object URLs are not publicly accessible, and avatars are only served to authenticated users through an authorized channel.
- The most-recently-practiced exercise may already be completed; the banner still appears and links into its practice page.
- Progress records created before this feature had no recorded "last practiced" time; historical practice activity is backfilled so the banner works for existing users.
- If the user has no display name, the email address is used for the greeting and the avatar placeholder letter.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to upload an avatar image from the profile page; accepted types are JPG, PNG, WebP and GIF, with a maximum size of 5MB.
- **FR-002**: The system MUST persist the avatar reference on the user's account and display the avatar in the navbar and profile page.
- **FR-003**: Users MUST be able to remove their avatar; the stored image MUST be deleted and the display MUST fall back to a placeholder showing the first letter of the display name (or email).
- **FR-004**: Replacing an avatar MUST delete the previously stored image.
- **FR-005**: Avatar images MUST NOT be publicly accessible; viewing an avatar MUST require an authenticated session.
- **FR-006**: Users MUST be able to edit a display name of 1-100 characters; the name MUST persist and be reflected in the navbar greeting, avatar menu, and placeholder letter.
- **FR-007**: The profile page MUST display the user's email address as read-only.
- **FR-008**: The navbar MUST show the user's avatar (or letter placeholder) and open a menu with identity info plus "Profile" and "Logout" actions; admin users MUST additionally see "Content management".
- **FR-009**: The navbar MUST display the site logo and MUST remain visible at the top of the viewport while scrolling.
- **FR-010**: The dashboard MUST show a banner identifying the user's most recently practiced exercise (title, series, episode, sentence progress) regardless of whether that exercise is completed, linking directly to its practice page.
- **FR-011**: Every saved practice attempt MUST update the exercise's last-practiced timestamp so "most recent" ordering is correct.
- **FR-012**: Historical progress records missing a last-practiced timestamp MUST be backfilled from recorded attempt history.
- **FR-013**: Signed-in users MUST be able to change their password by providing their current password and a new password that meets the same strength rules as registration.
- **FR-014**: The system MUST reject password changes when the current password is wrong or the new password fails strength validation, without revealing which check failed beyond the relevant rule.
- **FR-015**: Signed-in users MUST be able to deactivate their own account, confirmed by re-entering their password; deactivation MUST immediately end their session and block all future logins for that account.
- **FR-016**: Deactivated accounts MUST be indistinguishable from non-existent accounts at login (same generic "invalid credentials" error).

### Key Entities

- **User**: account identity; extended with an optional display name and an optional avatar reference. Email remains the immutable login identifier.
- **Avatar image**: a binary image stored in private cloud object storage; referenced from the user record and served only through an authenticated channel.
- **Exercise progress**: per-user, per-exercise practice state; gains a reliable last-practiced timestamp used to determine the most recently practiced exercise.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can upload or change an avatar and see it reflected in the navbar within 5 seconds of selecting the image.
- **SC-002**: 100% of avatar images are inaccessible via their direct storage URL without authentication (verified by unauthenticated requests being rejected).
- **SC-003**: Users can resume their most recent exercise from the dashboard in a single click, reaching the practice page without intermediate navigation.
- **SC-004**: The last-practiced timestamp is recorded for 100% of practice attempts (new and historical), so the dashboard banner always reflects actual most recent activity.
- **SC-005**: The navbar remains visible at the top during 100% of dashboard scrolling.
- **SC-006**: Users can complete a password change in under 1 minute; 0% of attempts with a wrong current password succeed.
- **SC-007**: A deactivated account is locked out within the same request that deactivates it — no subsequent authenticated action or login succeeds.

## Assumptions

- The existing token-based authentication (Bearer token held by the client) is reused; media served to `<img>` tags carries the token as a query parameter, consistent with the existing video-serving pattern.
- The cloud object storage bucket stays private-read; the site logo is stored as a single public-read object while user-generated content (avatars, videos) remains private.
- Avatar storage keys are persisted on the user record rather than full URLs, so the serving mechanism can change without data migration.
- Display name is optional; email is the fallback for greeting and placeholder letter.
- Desktop web only, per the project constitution; mobile layouts are out of scope.
- Account deletion is a soft deactivation (the account is disabled, not erased); practice history is retained so an admin can restore or audit the account later. Hard erasure of user data is out of scope for this iteration.
- Changing a password does not invalidate other existing sessions/tokens in this iteration (tokens are stateless and expire naturally).
