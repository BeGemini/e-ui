# Implementation Plan: English Listening Dictation Practice App

**Branch**: `001-english-listening-dictation` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-english-listening-dictation/spec.md`

**Status**: Phase 0 - Technical Context Established | Phase 1 - Design Artifacts (In Progress)

## Summary

Full-stack Next.js application for English listening dictation practice with video playback, word-level accuracy feedback, and user-customizable subtitle configurations. Users register with invitation codes, practice dictation exercises organized hierarchically (Series → Season → Episode), and receive color-coded word-level feedback (green/orange/red) using fuzzy matching. Videos and subtitles are stored on Tencent COS; application provides learner experience, progress tracking, and subtitle customization interface. Premium feature (admin settings copy) deferred to v2.0.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, per Constitution)

**Primary Dependencies**: 
- Next.js 16+ (App Router, per Constitution)
- React 19+ (via Next.js)
- shadcn/ui (exclusive UI component library, per Constitution)
- Tailwind CSS 4 (PostCSS, per Constitution)
- MySQL 8.0+ (application database)
- Tencent COS SDK (video/subtitle storage)

**Storage**: 
- MySQL 8.0+ (user accounts, exercises, progress, subtitle configs)
- Tencent COS (video files MP4/WebM, subtitle files SRT/VTT/SSA/ASS)

**Testing**: Jest + React Testing Library (for UI and utilities)

**Target Platform**: Web browsers (modern: Chrome, Firefox, Safari, Edge)

**Project Type**: Full-stack web application (Next.js)

**Performance Goals**: 
- Video playback latency: <500ms initial load
- Subtitle parsing: <100ms for typical exercise (50-200 sentences)
- API response time: <200ms p95 for all endpoints
- Concurrent users: Scalable to 1000+ via Next.js/MySQL architecture

**Constraints**: 
- No custom HTML tags; shadcn components only (Constitution I)
- TypeScript strict mode required (Constitution II)
- No separate backend microservices (Constitution III)
- Desktop-only web UI (Constitution IV)
- WCAG 2.1 AA accessibility minimum (Constitution IV)

**Scale/Scope**: 
- Users: 100s-1000s (per invitation code management)
- Exercises: 100s-1000s (per series/season/episode hierarchy)
- Sentences per exercise: No limit (1-500+)
- Deployment: Single Next.js instance + MySQL + COS integration

## Constitution Check

**Status**: ✅ All Core Principles Compliant

**Principle Verification**:
- ✅ **Principle I (UI Component Library)**: All user-facing UI will use shadcn components exclusively (no custom HTML)
- ✅ **Principle II (Type Safety)**: TypeScript strict mode enforced; all API routes, data structures, component props typed
- ✅ **Principle III (Full-Stack Integration)**: Backend implemented in Next.js API routes (app/api/*); no separate microservices
- ✅ **Principle IV (Desktop Web & Accessible)**: Desktop layout via Tailwind CSS; WCAG 2.1 AA compliance
- ✅ **Principle V (Code Quality)**: ESLint validation required; unit tests for critical logic recommended

**Gate Status**: ✅ **PASS** - All principles satisfied by design
- No violations identified
- Architecture aligns with constitutional constraints
- Technology stack approved (Next.js, shadcn, TypeScript, Tailwind)

## Project Structure

### Documentation (this feature)

```text
specs/001-english-listening-dictation/
├── plan.md                  # This file (implementation plan)
├── research.md              # Phase 0: Technical research & alternatives (to be generated)
├── data-model.md            # Phase 1: Entity definitions & database schema
├── quickstart.md            # Phase 1: End-to-end validation guide
├── contracts/               # Phase 1: API route contracts
│   ├── auth-routes.md       # Auth endpoints (register, login, logout)
│   ├── exercise-routes.md   # Exercise management endpoints
│   ├── practice-routes.md   # Dictation practice endpoints
│   └── subtitle-routes.md   # Subtitle customization endpoints
├── checklists/
│   └── requirements.md      # Quality checklist (in progress)
└── tasks.md                 # Phase 2: Implementation task list (via /speckit.tasks)
```

### Source Code (repository root) - Web Application

```text
e-ui/
├── app/
│   ├── layout.tsx                   # Root layout with shadcn theme provider
│   ├── page.tsx                     # Home page (redirect to /dashboard or /login)
│   ├── globals.css                  # Tailwind base styles
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register/route.ts    # Invitation code validation + registration
│   │   │   ├── login/route.ts       # Email/password authentication
│   │   │   └── logout/route.ts      # Session cleanup
│   │   ├── exercises/
│   │   │   ├── route.ts             # GET /api/exercises (list series/seasons/episodes)
│   │   │   ├── [exerciseId]/route.ts# GET single exercise metadata
│   │   │   └── [exerciseId]/progress/route.ts # GET/POST user progress
│   │   ├── practice/
│   │   │   ├── [exerciseId]/route.ts          # GET exercise with parsed subtitles
│   │   │   ├── [exerciseId]/check/route.ts    # POST dictation text → accuracy feedback
│   │   │   └── [exerciseId]/save-progress/route.ts # POST update progress
│   │   └── subtitles/
│   │       ├── [exerciseId]/config/route.ts   # GET/PUT user's subtitle config (merge/skip)
│   ├── dashboard/
│   │   ├── page.tsx                 # Main learner dashboard (exercise list)
│   │   ├── [exerciseId]/
│   │   │   ├── page.tsx             # Exercise detail page
│   │   │   └── practice/page.tsx    # Dictation practice interface
│   │   └── [exerciseId]/
│   │       └── subtitles/page.tsx   # Subtitle customization UI
│   ├── admin/                       # [Future: admin dashboard for managing exercises]
│   └── components/
│       ├── auth/                    # shadcn-based auth forms
│       ├── exercise-list/           # Exercise browsing components
│       ├── video-player/            # Video playback with subtitle timing
│       ├── dictation-input/         # Dictation input with real-time display
│       ├── feedback-display/        # Color-coded accuracy feedback
│       └── subtitle-editor/         # Merge/skip configuration UI
│
├── lib/
│   ├── types.ts                     # TypeScript definitions (User, Exercise, Progress, etc.)
│   ├── utils.ts                     # Utility functions
│   ├── db.ts                        # MySQL connection pool
│   ├── cos-client.ts                # Tencent COS SDK wrapper
│   ├── accuracy.ts                  # Levenshtein distance + fuzzy matching
│   ├── subtitle-parser.ts           # SRT/VTT/SSA/ASS format parsing
│   ├── auth.ts                      # Session management utilities
│   └── constants.ts                 # App-wide constants
│
├── public/
│   └── [assets, videos if needed]
│
├── tests/
│   ├── unit/
│   │   ├── accuracy.test.ts         # Levenshtein distance tests
│   │   ├── subtitle-parser.test.ts  # Format parsing tests
│   │   └── utils.test.ts            # Utility function tests
│   ├── integration/
│   │   ├── auth-flow.test.ts        # Registration → login flow
│   │   ├── practice-flow.test.ts    # Exercise → dictation → feedback flow
│   │   └── subtitle-config.test.ts  # Subtitle customization flow
│   └── e2e/                         # [Future: Playwright E2E tests]
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts               # Tailwind CSS configuration
├── postcss.config.mjs               # PostCSS configuration (Tailwind)
├── next.config.ts                   # Next.js configuration
├── eslint.config.mjs                # ESLint configuration
└── README.md
```

## Data Model

### Core Entities (Phase 1 Output)

**Entity Hierarchy** (Series → Season → Episode → Exercise):

1. **Series** (电视剧/Show)
   - seriesId, title, description, coverImageUrl, difficulty

2. **Season** (季)
   - seasonId, seriesId, seasonNumber, description

3. **Episode** (集)
   - episodeId, seasonId, episodeNumber, title

4. **Exercise** (练习)
   - exerciseId, episodeId, videoUrl (COS), subtitleUrl (COS), subtitleFormat, totalSentences, durationSeconds

5. **User** (用户)
   - userId, email, passwordHash, registrationDate, role (admin|user), lastLoginDate

6. **InvitationCode** (邀请码)
   - codeId, code, expiryDate, isUsed, usedByUserId, createdDate

7. **UserExerciseProgress** (用户练习进度)
   - progressId, userId, exerciseId, currentSentenceIndex, isCompleted, overallAccuracy, completionDate, lastAccessDate

8. **UserDictationAttempt** (用户录音尝试)
   - attemptId, progressId, sentenceIndex, userInput, correctAnswer, accuracy, wordFeedback (JSON), timestamp

9. **UserSubtitleConfig** (用户字幕配置)
   - configId, userId, exerciseId, mergedGroups (JSON array of sentence ranges), skippedSentences (JSON array of indices), createdDate, modifiedDate

### Relationships

```
Series (1) ──────────────── (N) Season
Season (1) ──────────────── (N) Episode
Episode (1) ──────────────── (N) Exercise
User (1) ──────────────── (N) UserExerciseProgress
Exercise (1) ──────────────── (N) UserExerciseProgress
UserExerciseProgress (1) ──────────────── (N) UserDictationAttempt
User (1) ──────────────── (N) UserSubtitleConfig
Exercise (1) ──────────────── (N) UserSubtitleConfig
InvitationCode: expiryDate and isUsed track validity
```

## API Route Contracts (Phase 1 Output)

### Authentication Routes

**POST /api/auth/register**
- Body: `{ code, email, password, passwordConfirm }`
- Validation: Check InvitationCode validity, email uniqueness
- Response: `{ userId, token, email }`
- Error: 400 Invalid code | 409 Email exists

**POST /api/auth/login**
- Body: `{ email, password }`
- Response: `{ userId, token, email }`
- Error: 401 Invalid credentials

**POST /api/auth/logout**
- Response: `{ success: true }`

### Exercise Routes

**GET /api/exercises**
- Query: `?search=&difficulty=&page=1`
- Response: `{ series: [{ seriesId, title, seasons: [...] }], total }`
- Purpose: List all Series → Seasons → Episodes hierarchy

**GET /api/exercises/[exerciseId]**
- Response: `{ exerciseId, episodeId, videoUrl, subtitleFormat, totalSentences, durationSeconds, userProgress }`
- Purpose: Get exercise metadata (does not include raw subtitles)

**GET /api/exercises/[exerciseId]/progress**
- Auth: Required
- Response: `{ userId, exerciseId, currentSentenceIndex, isCompleted, overallAccuracy, attempts: [...] }`
- Purpose: Get user's progress for resuming

### Practice Routes

**GET /api/practice/[exerciseId]**
- Auth: Required
- Response: `{ videoUrl, subtitles: [{ index, start, end, text, userConfigured: { isMerged, isSkipped } }] }`
- Purpose: Get video + parsed subtitles with user's config applied

**POST /api/practice/[exerciseId]/check**
- Auth: Required
- Body: `{ sentenceIndex, userInput }`
- Response: `{ correctAnswer, accuracy, wordFeedback: [{ word, userWord, status: "correct|acceptable|wrong" }] }`
- Purpose: Check dictation and return accuracy + word-level feedback

**POST /api/practice/[exerciseId]/save-progress**
- Auth: Required
- Body: `{ sentenceIndex, userInput, accuracy, wordFeedback, isCompleted }`
- Response: `{ progressId, savedAt }`
- Purpose: Persist dictation attempt and progress

### Subtitle Configuration Routes

**GET /api/subtitles/[exerciseId]/config**
- Auth: Required
- Response: `{ userId, exerciseId, mergedGroups: [...], skippedSentences: [...], currentProgress: sentenceIndex }`
- Purpose: Get user's subtitle customization for this exercise

**PUT /api/subtitles/[exerciseId]/config**
- Auth: Required
- Body: `{ mergedGroups: [...], skippedSentences: [...] }`
- Validation: Ensure modified sentences are AFTER currentProgress (read-only constraint)
- Response: `{ configId, updatedAt, appliesNextPlayback: true }`
- Purpose: Update merge/skip configuration

## Success Criteria Mapping

| Success Criteria | Implementation Phase | Owner |
|---|---|---|
| Users can register with valid invitation codes | Auth (Phase 1) | Backend API |
| Learners can browse and select exercises organized by series/season/episode | Exercise listing (Phase 1) | Backend API + UI |
| Video plays one subtitle sentence at a time with auto-pause | Video player (Phase 2) | Frontend component |
| Word-level accuracy feedback in three colors (green/orange/red) | Accuracy check (Phase 2) | Backend algorithm + Frontend display |
| User progress persists and can resume from last sentence | Progress persistence (Phase 2) | Backend database |
| Users can customize subtitle settings (merge/skip) with read-only constraints | Subtitle config (Phase 2) | Backend validation + Frontend UI |
| Exercises have no file size limits; all subtitle formats supported | Parser & storage (Phase 1) | Backend parser + COS integration |
| Premium copy feature deferred to v2.0 | N/A (v1) | Future planning |
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: Web application single Next.js project (Option 1)
- No separate backend/frontend split (Constitution III: Full-Stack Integration)
- All business logic in Next.js API routes (app/api/*)
- All UI in shadcn components (Constitution I)
- Single database (MySQL 8.0+)
- Single deployment target (Node.js server + MySQL + COS)

## Complexity Tracking

**Complexity Assessment**: 
- Video playback with precise subtitle timing (medium complexity)
- Levenshtein distance algorithm for fuzzy word matching (low complexity)
- Subtitle format parsing (SRT/VTT/SSA/ASS) (medium complexity)
- User progress persistence with read-only constraint (medium complexity)
- Invitation code validation system (low complexity)
- User-level subtitle customization with independent configs (medium complexity)

**No Constitutional Violations**: All complexity constraints are satisfied by approved stack (Next.js, TypeScript, shadcn, MySQL)

---

## Phase 0: Technical Research & Analysis ✅

**Status**: COMPLETE - All clarifications resolved in specification

**Research Outcomes**:

1. **Subtitle Format Support** → SRT, VTT, SSA, ASS (all required; no exclusions)
   - Research Path: Identify parsing libraries for each format
   - Decision: Use `subtitle` npm package (supports all formats)
   - Rationale: Single library covers all formats; reduces dependencies

2. **Levenshtein Distance Implementation** → Fuzzy word matching with threshold ≤ 2
   - Research Path: Evaluate fuzzy matching algorithms
   - Decision: Use `fuzzyset.js` or implement native Levenshtein (small dependency)
   - Rationale: Handles typos and minor variations; supports learning objectives

3. **Video Playback with Subtitle Timing** → Next.js + HTML5 Video + COS URLs
   - Research Path: Video player libraries (HLS vs direct MP4)
   - Decision: HTML5 `<video>` with direct MP4/WebM URLs from COS
   - Rationale: Simple, no additional player library; direct URL support via COS

4. **MySQL Schema Design** → Series/Season/Episode hierarchy
   - Research Path: Entity-relationship modeling
   - Decision: 9-entity schema with foreign keys for hierarchy
   - Rationale: Enables content organization; supports future admin features

5. **Session Management** → Next.js built-in session/auth
   - Research Path: Authentication strategies (JWT vs sessions)
   - Decision: Use `next-auth` or custom session middleware
   - Rationale: Integrates with Next.js; simplifies cookie management

6. **COS Integration** → Tencent COS SDK for Node.js
   - Research Path: SDK setup and error handling
   - Decision: `cos-nodejs-sdk-v5` npm package
   - Rationale: Official SDK; well-documented; handles retries

**No NEEDS CLARIFICATION items remain** - All Phase 0 questions resolved by specification clarifications Q1-Q7.

---

## Phase 1: Design Artifacts ✅

### 1. data-model.md (Generated)

**Location**: `specs/001-english-listening-dictation/data-model.md`

**Content**:
- 9 core entities with complete field definitions
- SQL schema for each entity (MySQL DDL)
- Foreign key relationships and constraints
- Index strategy for query performance
- Validation rules for each field
- Enum definitions (roles, subtitle formats)

**Key Design Decisions**:
- SeriesId → SeasonId → EpisodeId → ExerciseId hierarchy
- UserSubtitleConfig stored as separate entity (enables per-user customization)
- UserDictationAttempt with JSON column for word-level feedback
- InvitationCode with expiryDate and isUsed flags
- Role column supports admin|user (no granular permissions needed for v1)

### 2. contracts/ (Generated)

**Location**: `specs/001-english-listening-dictation/contracts/`

**Files**:
- `auth-routes.md` - Auth endpoints (register, login, logout)
- `exercise-routes.md` - Exercise browsing and metadata
- `practice-routes.md` - Dictation practice (check, save-progress)
- `subtitle-routes.md` - Subtitle config (get, update)

**Contract Format**: Request/Response signatures with TypeScript types, error codes, examples

**Example Contract Fragment**:
```typescript
// POST /api/practice/[exerciseId]/check
Request {
  sentenceIndex: number;
  userInput: string;
}

Response {
  correctAnswer: string;
  accuracy: number;  // 0-100
  wordFeedback: Array<{
    word: string;
    userWord: string;
    status: "correct" | "acceptable" | "wrong";
  }>;
}

Errors: 404 Exercise not found | 401 Unauthorized
```

### 3. quickstart.md (Generated)

**Location**: `specs/001-english-listening-dictation/quickstart.md`

**Purpose**: End-to-end validation guide proving the feature works

**Content**:
- Prerequisites (MySQL, Node.js, COS access)
- Setup commands (npm install, database migration, seed data)
- Test scenarios with expected outcomes:
  1. Register with valid invitation code → User account created
  2. Browse exercises → Series/Season/Episode hierarchy displayed
  3. Start practice exercise → Video loads, subtitles parse
  4. Submit dictation → Accuracy calculated, feedback displayed
  5. Save progress → User can resume from last sentence
  6. Customize subtitles → Merge/skip applied to next playback
- Verification steps (check database records, API responses)
- Troubleshooting guide

**Example Quickstart Step**:
```bash
# 1. Setup database
npm run migrate

# 2. Seed invitation codes
npm run seed:invitations --count=5

# 3. Register user
POST http://localhost:3000/api/auth/register
Body: { code, email, password }

# 4. Login and get token
POST http://localhost:3000/api/auth/login
Response includes session/token

# 5. Get exercise list
GET http://localhost:3000/api/exercises
Expected: Array of Series with Seasons and Episodes
```

---

## Constitution Check - Phase 1 Re-evaluation ✅

**Re-check Status**: All 5 Core Principles remain compliant

- ✅ **Principle I**: All UI components will use shadcn (Button, Card, Form, etc.)
- ✅ **Principle II**: All API routes have full TypeScript types; no `any` types
- ✅ **Principle III**: All backend logic in Next.js API routes; no separate backend
- ✅ **Principle IV**: Desktop Tailwind design; WCAG 2.1 AA compliance
- ✅ **Principle V**: ESLint rules enforced; unit tests for accuracy algorithm

**Gate Status**: ✅ **PASS** - No violations; design ready for Phase 2 implementation

---

## Next Steps: Phase 2 Implementation

### 1. Generate Task List
```bash
/speckit.tasks
```
Generates actionable implementation tasks in `tasks.md` covering:
- Database setup (migrations, schema, indices)
- API route implementation (auth, exercises, practice, subtitles)
- Frontend components (dashboard, video player, subtitle editor, feedback display)
- Utility functions (accuracy calculation, subtitle parsing, COS integration)
- Testing (unit, integration, E2E)

### 2. Implementation Sequence (Recommended)
1. **Phase 2A - Foundation** (Week 1-2):
   - MySQL schema migration
   - User auth API routes (register, login)
   - InvitationCode validation
   
2. **Phase 2B - Content** (Week 2-3):
   - Exercise/Series/Season/Episode API routes
   - Subtitle parsing + COS integration
   - Progress tracking tables

3. **Phase 2C - Core Feature** (Week 3-4):
   - Video player component (shadcn-based)
   - Dictation input component
   - Accuracy calculation (Levenshtein)
   - Word-level feedback display

4. **Phase 2D - User Config** (Week 4-5):
   - Subtitle customization UI
   - Merge/skip configuration persistence
   - Read-only permission constraints

5. **Phase 2E - Testing & Polish** (Week 5-6):
   - Unit tests (accuracy, parsing)
   - Integration tests (auth flow, practice flow)
   - E2E tests (Playwright)
   - WCAG accessibility audit

### 3. Deployment Readiness
- Environment variables (MySQL connection, COS credentials)
- Database migrations automated
- Error logging and monitoring setup
- Performance optimization (query indices, caching)
- Security review (input validation, SQL injection prevention, password hashing)
