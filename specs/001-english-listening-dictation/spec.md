# Feature Specification: English Listening Dictation Practice App

**Feature Branch**: `001-english-listening-dictation`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "Build an English listening practice app where users transcribe what they hear from video content with subtitle-guided playback. Monetize via invitation code registration system."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register with Invitation Code (Priority: P1)

New users register for the platform using an invitation code they have purchased. This is the entry point for all users and must be functional before any learning activity can occur.

**Why this priority**: Without user registration and access control via invitation codes, the entire monetization model fails and no content can be accessed. This is a hard blocker.

**Independent Test**: Can be fully tested by attempting registration with valid/invalid invitation codes and verifying that only valid codes grant account access.

**Acceptance Scenarios**:

1. **Given** a user has a valid invitation code, **When** they enter code + email + password during registration, **Then** account is created and they can log in
2. **Given** a user enters an invalid/already-used invitation code, **When** they attempt registration, **Then** they receive error message "Invalid or expired invitation code"
3. **Given** a user enters duplicate email, **When** they attempt registration, **Then** they receive error message "Email already registered"
4. **Given** a user completes registration, **When** they log in, **Then** they can access the main app interface

---

### User Story 2 - Browse and Select Exercises (Priority: P1)

Learners browse available dictation exercises that have been set up by the admin. They can view exercise details (title, difficulty, description) and select one to start practicing.

**Why this priority**: Users need to be able to find and access exercises. Without this, they cannot begin learning activities.

**Independent Test**: Can be fully tested by verifying that admin exercises appear in learner's exercise list and can be selected to start.

**Acceptance Scenarios**:

1. **Given** an admin has prepared exercises in the system database, **When** a learner logs in, **Then** they see a list of available exercises
2. **Given** learner views exercises, **When** they see exercise details, **Then** they can see title, difficulty level, description, and video duration
3. **Given** learner selects an exercise, **When** they click "Start Practice", **Then** the exercise loads and playback interface appears
4. **Given** learner completes an exercise, **When** they return to exercise list, **Then** completed exercise shows progress status (e.g., "Completed - 87% accuracy")
5. **Given** learner reopens a previously started exercise, **When** they click "Resume", **Then** playback resumes from last completed sentence

---

### User Story 3 - Practice Dictation with Auto-Stop Playback (Priority: P1)

Learners watch video content that plays one subtitle sentence at a time, automatically pausing after each sentence. They type what they hear into an input field. This is the core learning activity.

**Why this priority**: This is the primary value proposition of the app. Without this working correctly, the app has no purpose.

**Independent Test**: Can be fully tested by starting a dictation exercise and verifying that video stops after each subtitle sentence and accepts user input.

**Acceptance Scenarios**:

1. **Given** a learner opens a dictation exercise, **When** they press Play, **Then** video starts and plays the first subtitle sentence
2. **Given** video is playing, **When** the current subtitle sentence duration elapses, **Then** video automatically pauses
3. **Given** video is paused after a sentence, **When** learner types in the input box, **Then** text is captured without playing
4. **Given** learner has typed the dictation, **When** they press "Check", **Then** system displays original subtitle and their input side-by-side with word-level color-coding (green/orange/red)
5. **Given** color-coded feedback is displayed, **When** learner reviews, **Then** they can see exactly which words were correct, nearly correct, or wrong
6. **Given** learner reviews feedback, **When** they press "Next", **Then** they advance to the next sentence and input clears for next attempt
7. **Given** learner replays a sentence, **When** they press "Replay" button, **Then** video plays the same sentence again and previous feedback is cleared
8. **Given** learner reaches end of video, **When** last sentence completes, **Then** app shows summary with overall accuracy and all attempt history

---

### User Story 4 - Verify Dictation and Display Accuracy (Priority: P1)

After users type their dictation for each sentence, the system compares their text with the correct subtitle text, highlighting differences and calculating accuracy. This provides immediate feedback on listening comprehension.

**Why this priority**: Feedback is essential for learning. Without comparing their attempts to correct answers, users cannot learn from mistakes.

**Independent Test**: Can be fully tested by submitting dictation text and verifying accuracy calculation and visual comparison display.

**Acceptance Scenarios**:

1. **Given** a learner submits their dictation, **When** system compares to subtitle, **Then** exact matches show as correct (100%)
2. **Given** minor differences (typo, case), **When** system evaluates, **Then** accuracy shows as high percentage with visual highlighting
3. **Given** learner skips words, **When** system compares, **Then** missing words are highlighted in red and accuracy reflects the gaps
4. **Given** learner adds extra words, **When** system compares, **Then** extra words are marked and accuracy is reduced
5. **Given** all sentences completed, **When** exercise ends, **Then** system shows overall accuracy percentage and sentence-by-sentence breakdown

---

### User Story 5 - View Learning Progress (Priority: P2)

Learners can view their history of completed dictation exercises, accuracy scores, and progress over time. This helps them track improvement and identify areas needing more practice.

**Why this priority**: Progress tracking is important for motivation and helps learners focus on weak areas, but the app is still usable without this initially.

**Independent Test**: Can be fully tested by completing multiple exercises and verifying that history and aggregate metrics are displayed correctly.

**Acceptance Scenarios**:

1. **Given** learner completes an exercise, **When** they visit progress page, **Then** new exercise appears in history with date, accuracy %, and video name
2. **Given** learner has completed multiple exercises, **When** they view progress dashboard, **Then** they see average accuracy and trend graph
3. **Given** learner taps on a previous exercise, **When** they view details, **Then** they can see sentence-by-sentence performance

---

### User Story 6 - Customize Subtitle Settings per Exercise (Priority: P2)

Both regular learners and admins can customize how subtitles appear for a specific exercise by merging truncated sentences and marking sentences to skip. Each user has their own independent subtitle settings per exercise.

**Why this priority**: Subtitle customization improves user experience by allowing individuals to tailor content to their learning preferences. Admins can create optimized defaults; learners can personalize further. Critical for engagement.

**Independent Test**: Can be fully tested by uploading subtitles, merging/skipping for a user account, starting the exercise, and verifying that playback respects user-specific settings.

**Acceptance Scenarios**:

1. **Given** a user (admin or learner) opens subtitle settings for an exercise, **When** they view the subtitle list, **Then** they see all original subtitles with merge/skip options
2. **Given** user has current progress at sentence 5, **When** they view subtitle list, **Then** sentences 1-4 are locked (cannot edit), sentences 5+ are editable
3. **Given** user selects multiple adjacent subtitle lines (within editable range), **When** they press "Merge", **Then** lines combine into single subtitle (start of first, end of last)
4. **Given** merged subtitles, **When** user views settings, **Then** merged lines show as single unit with unmerge option available
5. **Given** user reviews subtitles, **When** they mark a line as "Skip" (within editable range), **Then** visual indicator shows it's skipped for this user
6. **Given** user starts dictation exercise, **When** playback begins, **Then** only shows sentences NOT marked as skipped by this user, with merged sentences playing as single units
7. **Given** exercise has skipped sentences for this user, **When** exercise completes, **Then** accuracy calculation excludes only the sentences this user marked as skipped
8. **Given** user completes more sentences, **When** they open settings again, **Then** new sentences become editable (permissions update as progress advances)
9. **Given** user modifies subtitle settings (merge/skip), **When** they press Save, **Then** changes apply immediately to next playback

---

### User Story 7 - Copy Admin Subtitle Settings [FUTURE v2.0] (Priority: P3 - Premium Feature)

**Status**: Deferred to v2.0 - Monetization enhancement for future release

Learners with premium subscription (future feature) can instantly copy an exercise's subtitle configuration from an admin user, avoiding the need to manually merge and skip sentences themselves.

**Why this priority**: Premium feature for convenience. Learners without time for manual customization can use admin's pre-optimized settings. Monetization opportunity for future releases.

**Independent Test**: Can be fully tested by selecting "Copy from admin" option and verifying that all merge/skip settings are copied to learner's account for that exercise.

**Acceptance Scenarios**:

1. **Given** a learner with premium subscription (future feature) views subtitle settings, **When** they see a "Copy from admin" button, **Then** it displays available admin subtitle configurations for this exercise
2. **Given** learner selects to copy admin settings, **When** they confirm, **Then** system copies all merge groups and skip marks from admin to learner's settings
3. **Given** settings are copied, **When** learner starts exercise, **Then** playback uses the copied configuration (admin's merged/skipped sentences)
4. **Given** learner has copied admin settings, **When** they modify them (merge/skip differently), **Then** their changes do not affect admin's original settings
5. **Given** learner without premium tries to copy settings, **When** they click "Copy from admin", **Then** system shows premium upgrade prompt

---

### Edge Cases

- What happens when a subtitle timing is invalid or missing for a sentence?
- How does system handle when video file becomes corrupted or unavailable?
- What occurs if user's network connection drops during playback?
- How is accuracy calculated when subtitle contains punctuation and user's input doesn't (or vice versa)?
- What if user tries to access an exercise before uploading required files?
- What happens if user attempts to merge subtitles that result in duration > expected sentence length?
- How does system handle if all subtitles in an exercise are marked as skipped by a user?
- What if admin modifies merged/skipped subtitles after learner has already copied them? (learner's copy remains independent)
- How does system handle multiple users' independent subtitle customizations for the same exercise?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST validate invitation codes during user registration; only valid, unused codes grant account creation
- **FR-002**: System MUST retrieve video and subtitle file information from database (videos are pre-uploaded to Tencent COS by admin, subtitle files are maintained in DB)
- **FR-003**: System MUST parse subtitle files (SRT, VTT, SSA, ASS formats) and extract timing information for each sentence
- **FR-004**: Video playback MUST automatically pause when each subtitle sentence duration elapses
- **FR-005**: System MUST allow users to input their dictation text during paused states
- **FR-006**: System MUST compare user-entered text with correct subtitle text and display differences (correct, missing, extra, wrong words)
- **FR-007**: System MUST calculate accuracy percentage for each sentence (0-100%) using word-level comparison with fuzzy matching (Levenshtein distance ≤ 2 characters per word considered acceptable). Accuracy formula: (correct_words + acceptable_typo_words) / total_correct_words × 100%. Missing words are treated as 0% accuracy for that word position; extra words are marked as errors.
- **FR-007a**: System MUST provide word-by-word visual feedback displaying: correct words (green), words within acceptable typo range (orange), completely wrong or missing words (red). Missing words display as empty slot with red highlight as visual cue to learner.
- **FR-008**: System MUST display side-by-side comparison: original subtitle text vs. user's dictation, with color-coded word-level feedback
- **FR-009**: System MUST store complete dictation exercise history including: user ID, exercise ID, timestamp, sentence-by-sentence accuracy, word-by-word correctness status, user input text, correct answer text
- **FR-010**: Users MUST be able to replay individual sentences without advancing to the next
- **FR-011**: System MUST display overall exercise accuracy and sentence-by-sentence breakdown after completion
- **FR-012**: System MUST support admin role with permissions to manage exercises (maintain exercise list, update metadata)
- **FR-013**: System MUST persist user progress for each exercise (current sentence position, completion status) and allow users to resume from last completed sentence
- **FR-014**: System MUST automatically save user's dictation text for each sentence in real-time to prevent data loss on interruption
- **FR-015**: Both admin and regular users MUST be able to customize subtitle settings for each exercise independently (merge adjacent lines, skip sentences)
- **FR-016**: System MUST enforce subtitle editing permission: users can only modify subtitle configurations for sentences at index >= their current progress position (inclusive boundary). If currentSentenceIndex=5, users can edit sentence 5 onwards, allowing them to preview/customize the next sentence before playing it.
- **FR-017**: System MUST store user-specific subtitle configurations per exercise (merge groups and skip marks) separately for each user
- **FR-018**: When user starts an exercise, system MUST apply that user's personalized subtitle settings during playback (merged lines play together, skipped sentences are omitted)
- **FR-019**: When calculating overall exercise accuracy, system MUST exclude only the sentences that specific user marked as skipped
- **FR-020** [FUTURE - P3]: System MUST provide "Copy from Admin" option for regular users to instantly copy admin's subtitle configuration for an exercise
- **FR-021** [FUTURE - P3]: Premium users MUST be able to copy admin subtitle settings; non-premium users see upgrade prompt when attempting to copy
- **FR-022** [FUTURE - P3]: When user copies admin settings, system MUST create independent copy in user's account - future admin changes do not affect copied settings

### Key Entities

- **User**: Represents a learner with email, password (hashed), invitationCode (used), createdDate, subscription status, isPremium (boolean)
- **InvitationCode**: Represents a purchasable access token with code string, isUsed boolean, expiryDate, purchaseDate
- **Exercise**: Represents a dictation lesson with title, videoFile, subtitleFile, createdBy (admin), createdDate, difficulty level
- **Subtitle**: Represents original parsed subtitle line with id, exerciseId, text content, startTime, endTime, language, displayOrder
- **UserSubtitleConfig**: NEW - Represents user-specific subtitle customization with userId, exerciseId, mergeGroups (array of merged subtitle IDs), skippedSubtitleIds (array), createdDate, lastModified
- **DictationAttempt**: Represents user's practice attempt with userId, exerciseId, completionDate, overallAccuracy, status (in-progress, completed), totalActiveSentences (excluding user's skipped sentences)
- **SentenceAttempt**: Represents user's answer for single sentence with dictationAttemptId, subtitleId, userText, correctText, accuracy, timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete account registration with invitation code in under 1 minute
- **SC-002**: Video playback starts within 2 seconds of user pressing Play button
- **SC-003**: Video automatically pauses within 500ms of subtitle sentence end time (accuracy of timing sync)
- **SC-004**: Dictation comparison and accuracy calculation displays within 1 second of user submission
- **SC-005**: Users can access exercises without errors 99% of the time (system uptime)
- **SC-006**: 90% of users successfully complete at least one full dictation exercise without technical issues on first attempt
- **SC-007**: Video file storage and retrieval supports lessons up to 1 hour duration without memory issues
- **SC-008**: All user dictation data persists correctly and can be retrieved for review

## Assumptions

- Users have modern browsers supporting HTML5 video (Chrome, Firefox, Safari, Edge)
- Users have stable internet connectivity sufficient for video streaming
- Videos are pre-uploaded by admin to Tencent COS; subtitle files are maintained in application database
- Subtitle files follow standard formats (SRT, VTT, SSA, ASS) with proper timing information
- User email addresses are valid and verified during registration
- Mobile app version is out of scope for initial v1 release (web only)
- Invitation codes are generated and maintained by admin in database; application verifies validity and one-time use
- Invitation code validity/expiration is stored in database; application reads and enforces it
- System uses existing Next.js auth/session management for user authentication
- Two user roles exist: admin (manages exercises) and user (learners/students)
- Each user has independent subtitle configurations per exercise
- Subtitle merge operations preserve timing (start of first line, end of last line)
- Users can only modify subtitle configurations for sentences AFTER their current progress position
- Users can unmerge or reset their subtitle settings at any time
- Subtitle configuration changes apply immediately to next playback
- All user data (practice history, accuracy, settings) is retained permanently
- Account deletion is supported; historical data may be retained for analytics compliance
- No file size or sentence count limits on exercises
- Premium subscription feature (copy admin settings) is deferred to v2.0; not implemented in v1
- User agreement required; GDPR compliance not needed (Chinese user base)

## Clarifications - Resolved Q1-Q7 (2026-09-09)

### Q1: User Roles and Permissions ✅
**Decision**: System has two roles only: Admin and User (Learner)
- Admin: Can manage exercises (view/update metadata; videos uploaded externally to Tencent COS)
- User: Learners who practice dictation and customize subtitle settings
- Rationale: Simplified role model; video management handled outside the app

### Q2: Invitation Code Management ✅
**Decision**: Invitation codes generated and maintained by admin in database
- Admin generates codes and stores in DB with expiration dates
- App reads codes from DB and validates on registration
- One-time use: each code can only register one account
- Rationale: Admin manages sales/distribution externally; app only validates

### Q3: Premium Feature Roadmap ✅
**Decision**: Premium "Copy Admin Settings" feature deferred to v2.0
- V1 (current): Users manually merge/skip subtitles; no paid premium features
- V2 (future): Premium subscription to copy admin's pre-configured settings
- Rationale: Start simple; monetization can be added later
- Impact: FR-020, FR-021, FR-022, User Story 7 marked [FUTURE v2.0]

### Q4: Subtitle Editing Permissions ✅
**Decision**: Users can only edit subtitle settings for sentences AFTER their current progress
- Locked: Sentences 1 through current completed position (cannot edit)
- Editable: Current position + 1 onwards
- Rationale: Prevents changing already-completed/graded content; maintains historical consistency
- Benefit: Eliminates the need to track configuration versions for past attempts

### Q5: Subtitle Configuration Real-Time Updates ✅
**Decision**: Subtitle changes take effect in real-time after saving
- Users modify merge/skip settings and click Save
- Changes apply immediately to next playback session
- No need to restart exercise or confirm
- Rationale: Provides immediate feedback and flexibility

### Q6: Data Retention and Compliance ✅
**Decision**: Permanent data retention; user agreement required; no GDPR
- All practice history, accuracy scores, settings retained permanently
- User agreement/Terms of Service required
- GDPR compliance not needed (Chinese users only)
- Account deletion supported (may retain anonymized historical data)
- Rationale: Supports learning analytics; simplifies compliance

### Q7: Subtitle Format Support ✅
**Decision**: Support all common formats with no size/count limits
- Formats: SRT, VTT, SSA, ASS (all required)
- No file size limits (Tencent COS handles storage)
- No sentence count limits per exercise
- Rationale: Maximum flexibility for content creators

### Q8: Word-Level Accuracy Handling for Missing/Extra Words ✅
**Decision**: Missing words display as empty slot with red highlight; extra words marked as red errors
- **Missing words** (user didn't say a word from correct text):
  - Display: Empty slot with red background (visual cue)
  - Accuracy: 0% for that word position
  - Rationale: Helps learners notice what they missed; provides visual prompt
- **Extra words** (user said words not in correct text):
  - Display: Word highlighted in red
  - Accuracy: 0% for those extra word positions
  - Rationale: Clear error indication
- **Accuracy formula**: (correct_words + acceptable_typo_words) / total_correct_words × 100%
- **Example**:
  - Correct: "Hello everyone how are you" (5 words)
  - User input: "Hello how are you" (4 words, missing "everyone")
  - Feedback: Hello(🟢) [EMPTY-🔴] how(🟢) are(🟢) you(🟢)
  - Accuracy: 4/5 = 80%
- Impact: Tasks T033-T034 (accuracy calculation), T041 (feedback display)

### Q9: Read-Only Constraint Boundary is Inclusive ✅
**Decision**: Users can modify subtitle settings for sentences at index >= currentSentenceIndex (inclusive)
- **Locked sentences**: Indices < currentSentenceIndex (already completed)
- **Editable sentences**: Indices >= currentSentenceIndex (current and future)
- **Boundary example**:
  - Exercise has 10 sentences (0-9)
  - User completed sentences 0-4, currently on sentence 5
  - currentSentenceIndex = 5
  - User CAN edit: sentences 5, 6, 7, 8, 9
  - User CANNOT edit: sentences 0, 1, 2, 3, 4
- **Rationale**: Allows users to preview and customize the next sentence before playing it
- Impact: Tasks T045 (validation), T048 (UI boundary), T062 (tests)

### Q10: Admin Content Management - Database-Only Approach ✅
**Decision**: App handles content as read-only; admins manage exercises via database tools only
- **Application responsibility**: Read exercises, series, seasons, episodes; display to learners; handle practice sessions
- **Admin responsibility**: Manage content through external database tools (phpMyAdmin, DBeaver, etc.)
  - Create/edit/delete Series, Seasons, Episodes, Exercises
  - Upload video URLs and subtitle URLs to Tencent COS
  - Manage InvitationCodes (generate, expire, view usage)
- **No admin UI in app**: No admin endpoints, no admin dashboard, no content management interface
- **Rationale**: Simplifies MVP scope; keeps app focused on learner experience; admins have direct DB access anyway
- Impact: Reduces Phase 0-6 tasks; no admin CRUD endpoints needed; clarifies FR-012 as "app validates admin-created content" not "app manages content"
