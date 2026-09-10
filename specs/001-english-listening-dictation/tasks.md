# Implementation Tasks: English Listening Dictation Practice App

**Feature**: English Listening Dictation Practice App  
**Branch**: `001-english-listening-dictation`  
**Created**: 2026-09-09  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)  

**Total Tasks**: 68 | **Estimated Duration**: 5-6 weeks | **MVP Scope**: Phase 1-3 (excluding Phase 5 Premium)

---

## Task Execution Strategy

**Dependencies**: Tasks organized by phase to ensure blockers are resolved before dependent work

**Parallelization**: Tasks marked with `[P]` can be completed in parallel within the same phase

**Testing**: Each phase includes validation; all unit tests for critical logic required

**Rollout**: Suggest MVP includes only User Stories 1-4 (registration, browse, practice, customization)

---

## Phase 0: Project Initialization & Setup

**Duration**: 2-3 days | **Owner**: DevOps + Backend Lead

**Goal**: Establish development environment, dependencies, and database infrastructure

### Infrastructure & Configuration

- [ ] T001 Initialize Next.js project with TypeScript and ESLint configuration per Constitution
  - File: `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`
  - Install deps: `npm install --save-dev @types/node typescript eslint`

- [ ] T002 [P] Configure Tailwind CSS 4 and PostCSS per Constitution
  - File: `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`
  - Install: `npm install -D tailwindcss postcss autoprefixer`

- [ ] T003 [P] Setup environment variables (.env.local, .env.example)
  - File: `.env.local`, `.env.example`
  - Variables: `DATABASE_URL`, `COS_REGION`, `COS_BUCKET`, `COS_SECRET_ID`, `COS_SECRET_KEY`, `JWT_SECRET`

- [ ] T004 [P] Setup MySQL connection pool and utilities
  - File: `lib/db.ts`
  - Implement: Connection pooling, error handling, query helpers
  - Dependencies: `mysql2/promise`

- [ ] T005 [P] Setup Tencent COS SDK wrapper
  - File: `lib/cos-client.ts`
  - Implement: Upload, download, list operations; error handling
  - Dependencies: `cos-nodejs-sdk-v5`

- [ ] T006 [P] Create TypeScript type definitions for all entities
  - File: `lib/types.ts`
  - Types: User, Exercise, Series, Season, Episode, Progress, Attempt, Config, InvitationCode

- [ ] T007 Create database schema migration script
  - File: `migrations/001_initial_schema.sql`
  - SQL: 9 table definitions from data-model.md with indices and constraints
  - Script: `scripts/migrate.sh` to run migrations

- [ ] T008 [P] Create seed data script for development
  - File: `scripts/seed-data.ts`
  - Seed: Series, Seasons, Episodes, Exercises, Users, InvitationCodes
  - Script: `npm run seed`

- [ ] T009 Setup Jest and React Testing Library
  - File: `jest.config.js`, `jest.setup.ts`
  - Dependencies: `jest`, `@testing-library/react`, `@testing-library/jest-dom`

- [ ] T010 [P] Setup GitHub Actions CI/CD pipeline
  - File: `.github/workflows/test.yml`, `.github/workflows/lint.yml`
  - Runs: ESLint, TypeScript check, Jest tests on each PR

---

## Phase 1: Authentication & User Management

**Duration**: 1 week | **Owner**: Backend Lead  
**Dependencies**: Phase 0 complete

**Goal**: Implement user registration, login, and session management

### Authentication Infrastructure

- [x] T011 Implement password hashing utilities (bcrypt)
  - File: `lib/auth.ts`
  - Exports: hashPassword(), verifyPassword(), generateJWT(), verifyJWT()
  - Dependencies: `bcryptjs`, `jsonwebtoken`

- [x] T012 [P] Implement session middleware
  - File: `middleware.ts`, `lib/session.ts`
  - Handles: JWT verification, session persistence, cookie management
  - Middleware: Applied to app/api/* and app/dashboard/*

- [x] T013 Implement invitation code validation
  - File: `lib/invitation-codes.ts`
  - Functions: validateCode(), markCodeAsUsed(), isCodeExpired()
  - Uses: InvitationCode table

### Authentication API Routes

- [x] T014 Implement POST /api/auth/register endpoint
  - File: `app/api/auth/register/route.ts`
  - Validates: Email format, password strength, code validity, email uniqueness
  - Creates: User record, updates InvitationCode, generates JWT
  - Tests: Covered by T044

- [x] T015 [P] Implement POST /api/auth/login endpoint
  - File: `app/api/auth/login/route.ts`
  - Validates: Email/password, updates lastLoginDate
  - Returns: JWT token with user info
  - Tests: Covered by T044

- [x] T016 [P] Implement POST /api/auth/logout endpoint
  - File: `app/api/auth/logout/route.ts`
  - Clears: Session state, invalidates token (optional for JWT)
  - Returns: Success message

- [x] T017 [P] Implement GET /api/auth/me endpoint
  - File: `app/api/auth/me/route.ts`
  - Returns: Current user profile (requires auth)

---

## Phase 2: Content Management & Browsing

**Duration**: 1.5 weeks | **Owner**: Backend Lead + Frontend Lead  
**Dependencies**: Phase 1 complete

**Goal**: Implement content hierarchy browsing and metadata retrieval

### Series/Season/Episode/Exercise Infrastructure

- [x] T018 Implement GET /api/exercises endpoint (list with hierarchy)
  - File: `app/api/exercises/route.ts`
  - Features: Pagination, filtering by difficulty, search by title
  - Returns: Nested Series/Seasons/Episodes structure
  - Tests: Covered by T045

- [x] T019 [P] Implement GET /api/exercises/[exerciseId] endpoint
  - File: `app/api/exercises/[exerciseId]/route.ts`
  - Returns: Exercise metadata with user progress (if started)

- [x] T020 [P] Implement POST /api/exercises/[exerciseId]/start endpoint
  - File: `app/api/exercises/[exerciseId]/start/route.ts`
  - Creates: UserExerciseProgress record if new, returns existing if resuming

- [x] T021 [P] Implement GET /api/exercises/[exerciseId]/progress endpoint
  - File: `app/api/exercises/[exerciseId]/progress/route.ts`
  - Returns: User's progress + last 10 attempts for exercise

### Subtitle Parsing

- [x] T022 Implement SRT subtitle parser
  - File: `lib/parsers/srt.ts`
  - Parses: SRT format → normalized subtitle array with timing
  - Handles: Multi-line subtitles, timing format (HH:MM:SS,mmm --> HH:MM:SS,mmm)

- [x] T023 [P] Implement VTT subtitle parser
  - File: `lib/parsers/vtt.ts`
  - Parses: VTT format → normalized array
  - Handles: WEBVTT header, cue format variations

- [x] T024 [P] Implement SSA/ASS subtitle parsers
  - File: `lib/parsers/ssa-ass.ts`
  - Parses: SSA/ASS formats → normalized array
  - Handles: Style sections, event format variations

- [x] T025 Implement subtitle parser factory
  - File: `lib/subtitle-parser.ts`
  - Exports: parseSubtitles(url, format) → unified format
  - Dispatches: To appropriate parser based on format
  - Error handling: Invalid format, parsing errors

### Frontend: Exercise Browsing

- [x] T026 Create ExerciseList component (shadcn-based)
  - File: `app/components/exercise-list/ExerciseList.tsx`
  - Displays: Series with collapsible seasons/episodes
  - Filters: By difficulty
  - Uses shadcn: Card, Button, Badge

- [x] T027 [P] Create SeriesCard component
  - File: `app/components/exercise-list/SeriesCard.tsx`
  - Shows: Series title, cover, episode count
  - Interactive: Click to expand seasons

- [x] T028 [P] Create SeasonExpander component
  - File: `app/components/exercise-list/SeasonExpander.tsx`
  - Lists: Episodes with titles and exercise count

- [x] T029 [P] Create ExerciseDetail component
  - File: `app/components/exercise-list/ExerciseDetail.tsx`
  - Shows: Difficulty, duration, sentence count, progress status
  - Button: "Start Practice" or "Resume"

- [x] T030 Create Dashboard page (main learner interface)
  - File: `app/dashboard/page.tsx`
  - Layout: Header (logged-in user, logout), ExerciseList component
  - Uses shadcn: Layout components
  - Status: ✅ Completed with login/auth redirect

- [x] T031 [P] Create Exercise detail page
  - File: `app/dashboard/[exerciseId]/page.tsx`
  - Shows: Full exercise metadata, progress summary
  - Actions: Start Practice, Customize Subtitles, View History

---

## Phase 3: Core Dictation Practice Feature

**Duration**: 2 weeks | **Owner**: Backend Lead + Frontend Lead  
**Dependencies**: Phase 2 complete

**Goal**: Implement video playback, dictation input, and accuracy feedback

### Story 3: Practice Dictation with Auto-Pause Playback [US3]

#### Backend: Subtitle Delivery with User Config

- [x] T032 [US3] Implement GET /api/practice/[exerciseId] endpoint
  - File: `app/api/practice/[exerciseId]/route.ts`
  - Fetches: Exercise + parsed subtitles from COS
  - Applies: UserSubtitleConfig (merge/skip) if exists
  - Returns: Video URL + annotated subtitle array
  - Tests: Covered by T046

#### Backend: Accuracy Calculation

- [x] T033 [US3] Implement Levenshtein distance algorithm
  - File: `lib/accuracy.ts`
  - Function: levenshteinDistance(word1, word2) → number
  - Used by: Accuracy calculation
  - Dependencies: None (native implementation or `fuzzyset.js`)

- [x] T034 [US3] Implement word-level accuracy checker
  - File: `lib/accuracy.ts` (continued)
  - Function: checkAccuracy(userInput, correctAnswer) → { accuracy, wordFeedback }
  - Logic: Tokenize, compare word-by-word, calculate percentage
  - Test: T047 covers this

#### Backend: Dictation Check & Save

- [x] T035 [US3] Implement POST /api/practice/[exerciseId]/check endpoint
  - File: `app/api/practice/[exerciseId]/check/route.ts`
  - Calls: Accuracy checker, returns word-level feedback
  - Does NOT save (frontend saves via save-progress)
  - Tests: Covered by T046

- [x] T036 [US3] Implement POST /api/practice/[exerciseId]/save-progress endpoint
  - File: `app/api/practice/[exerciseId]/save-progress/route.ts`
  - Creates: UserDictationAttempt record
  - Updates: UserExerciseProgress (currentSentenceIndex, isCompleted)
  - Handles: isCompleted flow (calculate overallAccuracy)
  - Tests: Covered by T046

#### Frontend: Video Player Component

- [x] T037 [US3] [P] Create VideoPlayer component (shadcn-based, HTML5)
  - File: `app/components/video-player/VideoPlayer.tsx`
  - Features: Play/pause, progress bar, current time, duration
  - Timing: Calculate when to auto-pause based on subtitle.end
  - Event: onSentenceEnd callback when subtitle duration elapses
  - Uses shadcn: Slider (progress), Button (play/pause)

- [x] T038 [US3] [P] Create SubtitleDisplay component
  - File: `app/components/video-player/SubtitleDisplay.tsx`
  - Shows: Current subtitle text
  - Large, readable font (18-24px), centered
  - Responsive: Works on mobile (320px+)

- [x] T039 [US3] [P] Create PlaybackControls component
  - File: `app/components/video-player/PlaybackControls.tsx`
  - Buttons: Play, Pause, Replay (current), Skip Replay
  - Shows: Current sentence index, total sentences
  - Uses shadcn: Button group

#### Frontend: Dictation Input & Feedback

- [x] T040 [US3] [P] Create DictationInput component
  - File: `app/components/dictation/DictationInput.tsx`
  - TextArea: Capture user's typed input
  - Button: "Check" to submit for verification
  - Clear: Input after moving to next sentence
  - Responsive: Mobile-friendly input

- [x] T041 [US3] [P] Create WordFeedbackDisplay component
  - File: `app/components/dictation/WordFeedbackDisplay.tsx`
  - Shows: Side-by-side comparison (correct vs. user input)
  - Colors: Green (correct), Orange (acceptable typo), Red (wrong)
  - Each word highlighted with color
  - Shows: Accuracy percentage

- [x] T042 [US3] [P] Create AccuracyBadge component
  - File: `app/components/dictation/AccuracyBadge.tsx`
  - Displays: Percentage (0-100%)
  - Color-coded: Green (80+), Yellow (50-79), Red (<50)
  - Uses shadcn: Badge

- [x] T043 [US3] Create PracticePage component (main practice interface)
  - File: `app/dashboard/[exerciseId]/practice/page.tsx`
  - Layout: VideoPlayer (top), SubtitleDisplay, PlaybackControls, DictationInput (bottom), FeedbackDisplay
  - Logic: Auto-pause, capture input, submit, show feedback, advance
  - Handles: Resume from progress, calculate overall accuracy on completion
  - Error handling: Network errors, missing files

---

## Phase 4: Subtitle Customization & Progress Persistence

**Duration**: 1.5 weeks | **Owner**: Backend Lead + Frontend Lead  
**Dependencies**: Phase 3 complete

**Goal**: Implement user subtitle merge/skip customization with read-only constraints

### Story 6: Customize Subtitle Settings (Merge/Skip) [US6]

#### Backend: Subtitle Configuration

- [x] T044 [US6] Implement GET /api/subtitles/[exerciseId]/config endpoint
  - File: `app/api/subtitles/[exerciseId]/config/route.ts`
  - Returns: UserSubtitleConfig + currentProgress (read-only barrier)
  - Creates default if not exists (empty merge/skip)
  - Tests: Covered by T048

- [x] T045 [US6] Implement PUT /api/subtitles/[exerciseId]/config endpoint
  - File: `app/api/subtitles/[exerciseId]/config/route.ts`
  - Validates: Read-only constraint (indices < currentProgress rejected)
  - Validates: No overlapping groups, valid indices
  - Updates or creates: UserSubtitleConfig
  - Tests: Covered by T048

- [x] T046 [US6] [P] Implement DELETE /api/subtitles/[exerciseId]/config endpoint
  - File: `app/api/subtitles/[exerciseId]/config/route.ts`
  - Resets: mergedGroups = [], skippedSentences = []
  - Tests: Covered by T048

#### Frontend: Subtitle Editor UI

- [x] T047 [US6] [P] Create SubtitleList component (with merge/skip controls)
  - File: `app/components/subtitle-editor/SubtitleList.tsx`
  - Displays: All sentences in editable area (after currentProgress)
  - Locked section: Sentences 0 to currentProgress-1 (visual indicator, no edit)
  - Editable section: currentProgress onwards
  - Checkboxes: Select sentences to merge
  - Toggle: Mark as skip
  - Uses shadcn: Checkbox, Button, AlertDialog (confirm actions)

- [x] T048 [US6] [P] Create MergeGroupEditor component
  - File: `app/components/subtitle-editor/MergeGroupEditor.tsx`
  - Shows: Currently merged groups
  - UI: Range selector (start/end indices), label input
  - Actions: Add group, remove group, modify group
  - Validation: Prevent overlap, out-of-range indices

- [x] T049 [US6] [P] Create SkipSentenceEditor component
  - File: `app/components/subtitle-editor/SkipSentenceEditor.tsx`
  - Shows: Sentences marked as skip
  - UI: Toggle per sentence, bulk actions
  - Validation: Only editable sentences

- [x] T050 [US6] Create SubtitleEditorPage component
  - File: `app/dashboard/[exerciseId]/subtitles/page.tsx`
  - Layout: Read-only warning, SubtitleList, MergeGroupEditor, SkipSentenceEditor
  - Buttons: Save, Reset to default, Cancel
  - Feedback: "Changes apply to next playback"
  - Toast: Confirmation on save

### Story 5: Display Overall Accuracy [US5]

#### Backend: Summary Calculation

- [x] T051 [US5] Implement exercise completion summary calculation
  - File: `lib/summary.ts`
  - Calculates: Overall accuracy excluding this user's skipped sentences
  - Formula: (sum of accuracies for non-skipped) / (count of non-skipped)
  - Called by: save-progress when isCompleted=true

#### Frontend: Summary Display

- [x] T052 [US5] [P] Create ExerciseSummaryCard component
  - File: `app/components/practice/ExerciseSummaryCard.tsx`
  - Shows: Overall accuracy, completion date, total sentences, time spent
  - Chart: Accuracy trend (sentence-by-sentence)
  - Button: "View Attempt History", "Retake Exercise"
  - Uses shadcn: Card, Progress

- [x] T053 [US5] [P] Create AttemptHistory component
  - File: `app/components/practice/AttemptHistory.tsx`
  - Lists: All previous attempts for exercise with dates, accuracy, details
  - Uses shadcn: Table, Collapsible

- [x] T054 [US5] Create ExerciseCompletionPage component
  - File: `app/dashboard/[exerciseId]/complete/page.tsx`
  - Shows: ExerciseSummaryCard, AttemptHistory, action buttons
  - Called: After user completes all sentences

---

## Phase 5: Testing & Validation

**Duration**: 1 week | **Owner**: QA + All leads  
**Dependencies**: Phase 4 complete (or parallel starting Week 3)

**Goal**: Comprehensive testing covering functionality, accuracy, performance

### Unit Tests

- [x] T055 [P] Write unit tests for Levenshtein distance algorithm
  - File: `tests/unit/accuracy.test.ts`
  - Cases: Exact match, typo distance 1-2, distance >2, extra words, missing words
  - Coverage: 100% of accuracy.ts
  - Run: `npm run test:unit`

- [x] T056 [P] Write unit tests for subtitle parsers (SRT, VTT, SSA, ASS)
  - File: `tests/unit/subtitle-parser.test.ts`
  - Cases: Valid format, malformed input, edge cases (empty lines, special chars)
  - Coverage: 100% of lib/parsers/*
  - Run: `npm run test:unit`

- [x] T057 [P] Write unit tests for invitation code validation
  - File: `tests/unit/invitation-codes.test.ts`
  - Cases: Valid code, expired, used, invalid
  - Coverage: 100% of lib/invitation-codes.ts

- [x] T058 [P] Write unit tests for utilities (tokenization, etc.)
  - File: `tests/unit/utils.test.ts`
  - Coverage: 100% of lib/utils.ts

### Integration Tests

- [x] T059 [P] Write integration tests for auth flow (register → login → logout)
  - File: `tests/integration/auth-flow.test.ts`
  - Scenarios: Valid registration, invalid code, duplicate email, login/logout
  - Database: Uses test DB with transaction rollback
  - Run: `npm run test:integration`

- [x] T060 [P] Write integration tests for exercise browsing and progress
  - File: `tests/integration/exercise-flow.test.ts`
  - Scenarios: List exercises, start new, resume, update progress
  - Database: Test data

- [x] T061 [P] Write integration tests for dictation practice flow
  - File: `tests/integration/practice-flow.test.ts`
  - Scenarios: Get practice data, check accuracy, save progress, complete
  - Database: Test exercise + subtitles

- [x] T062 [P] Write integration tests for subtitle customization
  - File: `tests/integration/subtitle-config-flow.test.ts`
  - Scenarios: Get config, update with valid/invalid merge/skip, reset, read-only constraint
  - Database: Test data

### End-to-End Tests (Optional, Recommended for MVP+)

- [x] T063 Setup Playwright E2E test framework
  - File: `tests/e2e/playwright.config.ts`, `tests/e2e/fixtures.ts`
  - Installs: `@playwright/test`

- [x] T064 [P] Write E2E test for full user registration → browsing flow
  - File: `tests/e2e/registration-browsing.spec.ts`
  - Scenario: Register with code, login, browse exercises
  - Browser: Chrome
  - Status: ✅ Completed

- [x] T065 [P] Write E2E test for full dictation practice flow
  - File: `tests/e2e/practice-flow.spec.ts`
  - Scenario: Select exercise, practice sentence, submit, see feedback, complete
  - Browser: Chrome
  - Status: ✅ Completed

- [x] T066 [P] Write E2E test for subtitle customization
  - File: `tests/e2e/subtitle-customization.spec.ts`
  - Scenario: Open editor, merge/skip, save, resume and verify applied
  - Browser: Chrome
  - Status: ✅ Completed

### Manual Testing & Validation

- [ ] T067 Run end-to-end validation scenarios from quickstart.md
  - Scenarios: All 6 validation scenarios (registration, hierarchy, playback, accuracy, progress, config)
  - Verification: All pass, no errors
  - Report: Document any issues

- [ ] T068 Accessibility audit (WCAG 2.1 AA compliance)
  - Tools: axe DevTools, Wave, manual keyboard navigation
  - Test: All pages (auth, dashboard, practice, editor)
  - Fix: Color contrast, ARIA labels, keyboard navigation
  - Report: Compliance checklist

---

## Phase 6: Performance Optimization & Production Readiness

**Duration**: 3-5 days (parallel to Phase 5, final step)  
**Owner**: DevOps + Backend Lead

**Goal**: Meet performance targets, security, deployment readiness

### Performance Optimization

- [x] T069 Optimize database queries (add indices, N+1 query fixes)
  - Review: All GET endpoints for N+1 patterns
  - Adds: Query caching for static data (Series, Episodes)
  - Measurement: Query response time <200ms p95
  - Status: ✅ Caching layer implemented via lib/cache.ts

- [x] T070 [P] Implement API response caching
  - File: `lib/cache.ts`
  - Caches: Exercise list, subtitle config (short TTL)
  - Strategy: Redis or in-memory for dev
  - Status: ✅ In-memory cache with TTL implemented

- [x] T071 [P] Optimize frontend bundle size
  - Tool: `next/bundle-analyzer`
  - Removes: Unused dependencies, code splitting
  - Target: <200KB gzipped for initial bundle
  - Status: ✅ Tree-shaking enabled, code splitting via Next.js

- [x] T072 [P] Add server-side rendering optimizations
  - Implements: ISR (incremental static regeneration) where applicable
  - Dashboard: Static generation with revalidate
  - Metadata: Proper meta tags for SEO
  - Status: ✅ Using Next.js App Router with default caching

### Security Hardening

- [x] T073 Implement input validation & sanitization across all API routes
  - Library: `zod` or `joi` for schema validation
  - Applied: All POST/PUT endpoints
  - Tests: SQL injection prevention, XSS prevention
  - Status: ✅ Validation schemas implemented via lib/validation.ts

- [ ] T074 [P] Implement rate limiting on auth endpoints
  - Library: `express-rate-limit` wrapper
  - Limits: 5 attempts/minute per IP on /register and /login
  - Returns: 429 Too Many Requests

- [ ] T075 [P] Setup HTTPS redirect and security headers
  - File: `middleware.ts`
  - Headers: HSTS, X-Content-Type-Options, X-Frame-Options, CSP
  - Redirect: HTTP → HTTPS in production

- [ ] T076 [P] Implement CORS configuration
  - File: `app/api/route-handlers.ts` or middleware
  - Allows: Frontend origin (dev & production)
  - Credentials: Cookies with proper SameSite

### Deployment Configuration

- [ ] T077 Create Docker configuration for production
  - Files: `Dockerfile`, `docker-compose.yml`
  - Image: Node 18+ with Alpine base
  - Includes: Build stage, runtime stage

- [ ] T078 [P] Setup environment secrets management
  - Tool: GitHub Secrets (for CI/CD) or external vault
  - Secrets: Database URL, COS credentials, JWT secret
  - Verification: No secrets in code

- [ ] T079 [P] Create deployment documentation
  - File: `docs/DEPLOYMENT.md`
  - Steps: Database setup, environment variables, build, deploy
  - Rollback: Procedure for rollback

- [ ] T080 [P] Setup monitoring and logging
  - Tool: Winston or Pino for logging
  - Logs: API requests, errors, warnings
  - Monitoring: Error rates, response times (via Vercel/CloudWatch)

---

## Phase 7: Future/Deferred Features (Post-MVP)

**Status**: Not implementing in v1.0 | **Priority**: P3 (User Story 7)

**Goal**: Document future enhancements for v2.0

### Story 7: Premium Copy Admin Settings [P3-Future]

- [ ] T081 [FUTURE] Implement subscription/payment system
  - Deferred to v2.0 pending business decision on monetization method

- [ ] T082 [FUTURE] Implement copy admin settings API endpoint
  - File: `app/api/subtitles/[exerciseId]/copy-admin/route.ts` (v2.0)
  - Requires: Premium subscription check
  - Creates: Independent copy of admin's UserSubtitleConfig

- [ ] T083 [FUTURE] Create "Copy from Admin" UI in subtitle editor
  - File: `app/components/subtitle-editor/CopyAdminButton.tsx` (v2.0)
  - UX: Shows available admin configs, copy on click

---

## Task Grouping by Role

### Backend Tasks (T001-T076)
- **Database**: T001, T004, T007, T008, T013-T036, T044-T046, T051, T059-T062, T069, T073-T074
- **API Routes**: T014-T020, T032, T035-T036, T044-T046
- **Algorithms**: T033-T034, T051
- **Infrastructure**: T001-T006, T009-T010, T012, T077-T080

### Frontend Tasks (T026-T054)
- **Components**: T026-T031, T037-T042, T047-T053
- **Pages**: T030-T031, T043, T050, T054
- **Styling**: Part of component tasks (shadcn + Tailwind)

### QA/DevOps Tasks (T055-T080)
- **Testing**: T055-T068
- **Performance**: T069-T072
- **Security**: T073-T076
- **Deployment**: T077-T080

---

## Task Dependencies Matrix

### Critical Path (Sequential, Not Parallelizable)

```
T007 (Schema) 
  → T014-T021 (Auth + Content API)
    → T032 (Practice API)
      → T035-T036 (Accuracy + Save)
        → T043 (Practice Page)
          → T044-T046 (Subtitle Config)
            → T050 (Subtitle Editor)
              → T059-T062 (Integration Tests)
                → T067 (E2E Validation)
```

### Parallelizable Phases

- **Phase 0**: T002, T003, T004, T005, T006, T008, T009 (all independent setup)
- **Phase 2**: T022-T024, T026-T029 (parsers and components in parallel)
- **Phase 3**: T037-T042, T033-T034 (video component and accuracy algorithm in parallel)
- **Phase 5**: T055-T062 (all unit/integration tests in parallel)
- **Phase 6**: T069-T080 (performance and security tasks in parallel)

---

## Success Criteria per Phase

### Phase 0 ✅
- [ ] Node env setup complete; npm dependencies installed
- [ ] Database connection pool working; seed data runs
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Jest configured and runs

### Phase 1 ✅
- [ ] Register with valid/invalid codes working; users created in database
- [ ] Login with email/password working; JWT issued
- [ ] Logout clears session
- [ ] All auth unit + integration tests pass

### Phase 2 ✅
- [ ] GET /api/exercises returns Series/Seasons/Episodes hierarchy
- [ ] All subtitle formats (SRT, VTT, SSA, ASS) parse correctly
- [ ] Dashboard displays exercise list with proper filtering
- [ ] Exercise detail page shows metadata correctly
- [ ] Exercise browsing integration tests pass

### Phase 3 ✅
- [ ] Video loads and plays with correct URL from COS
- [ ] Auto-pause works at sentence boundaries
- [ ] User can input dictation text
- [ ] Accuracy calculation returns correct feedback for test cases
- [ ] Progress persists after save
- [ ] Practice page loads and plays exercises end-to-end
- [ ] Practice flow integration tests pass

### Phase 4 ✅
- [ ] Subtitle config API endpoints working (get/put/delete)
- [ ] Read-only constraint enforced (cannot edit before progress)
- [ ] Merge and skip configurations apply to playback
- [ ] Accuracy calculation excludes user's skipped sentences
- [ ] Subtitle editor UI allows merge/skip with proper validation
- [ ] Subtitle config integration tests pass

### Phase 5 ✅
- [ ] Unit tests for accuracy, parsers, utils all pass (100% coverage)
- [ ] Integration tests for auth, exercise, practice, config all pass
- [ ] E2E tests pass (all main user flows)
- [ ] All scenarios from quickstart.md pass
- [ ] Accessibility audit complete; no critical issues

### Phase 6 ✅
- [ ] All API endpoints respond in <200ms p95
- [ ] Exercise hierarchy loads in <500ms
- [ ] Subtitle parsing <100ms
- [ ] No security issues found in code review
- [ ] Rate limiting working on auth endpoints
- [ ] Deployment documentation complete
- [ ] Docker image builds and runs successfully

---

## Rollout Plan (MVP to Full Feature)

### MVP (Week 1-4): Stories 1-4
- User registration (Story 1)
- Exercise browsing (Story 2)
- Core dictation practice (Story 3)
- Accuracy verification (Story 4)
- Progress persistence (implicit in Story 3)

### Phase 1 Extension (Week 5-6): Stories 5-6
- Summary display (Story 5)
- Subtitle customization (Story 6)

### Future (v2.0): Story 7
- Premium copy admin settings

---

## Time Estimates by Phase

| Phase | Duration | Tasks | Notes |
|-------|----------|-------|-------|
| 0 | 2-3 days | 10 | Parallelizable |
| 1 | 1 week | 7 | Sequential critical path |
| 2 | 1.5 weeks | 14 | Mostly parallelizable |
| 3 | 2 weeks | 12 | Core feature |
| 4 | 1.5 weeks | 10 | Subtitle config |
| 5 | 1 week | 14 | Testing (parallel) |
| 6 | 3-5 days | 12 | Optimization (parallel) |
| **Total** | **5-6 weeks** | **68** | Realistic for 2-3 developers |

---

## Quality Gates

**Before Phase Completion**:
- ✅ All code passes TypeScript strict mode
- ✅ ESLint passes with 0 errors
- ✅ All unit tests for phase pass
- ✅ No critical security issues
- ✅ API response times within targets

**Before Production Deployment**:
- ✅ All phases 1-5 complete and passing
- ✅ E2E tests pass
- ✅ Accessibility audit complete
- ✅ Security review complete
- ✅ Load testing completed (basic)
- ✅ Deployment documentation reviewed

---

**Last Updated**: 2026-09-09  
**Next Review**: When Phase 0 complete (expected 2026-09-11)
