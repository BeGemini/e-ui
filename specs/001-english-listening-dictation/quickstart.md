# Quickstart & End-to-End Validation Guide

**Purpose**: Prove the feature works end-to-end with runnable validation scenarios

**Estimated Setup Time**: 30-45 minutes (first time) | 5 minutes (subsequent runs)

## Prerequisites

### Required Software
- Node.js 18+ (LTS recommended)
- MySQL 8.0+ (local or remote with credentials)
- Tencent COS account with credentials (or mocked for testing)
- Git and npm

### Environment Setup
1. Clone repository and install dependencies:
   ```bash
   git clone https://github.com/your-org/e-ui.git
   cd e-ui
   npm install
   ```

2. Create `.env.local` with database and COS credentials:
   ```env
   # Database
   DATABASE_URL=mysql://root:password@localhost:3306/english_listening_db
   
   # Tencent COS
   COS_REGION=ap-beijing
   COS_BUCKET=your-bucket-name
   COS_SECRET_ID=your-secret-id
   COS_SECRET_KEY=your-secret-key
   
   # Auth
   JWT_SECRET=your-jwt-secret
   ```

3. Create and seed database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

## Validation Scenarios

### Scenario 1: User Registration with Invitation Code

**Objective**: Verify that valid invitation codes grant account creation

**Setup**:
```bash
# Create invitation codes (auto-seeded by db:seed)
npm run seed:invitations --count=5
```

**Test Steps**:

1. **Get a valid invitation code**:
   ```bash
   curl -X GET http://localhost:3000/api/invitations/available \
     -H "Authorization: Bearer admin-token"
   # Response: { codes: ["CODE123", "CODE456", ...] }
   ```

2. **Register with valid code**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "code": "CODE123",
       "email": "learner@example.com",
       "password": "SecurePass123!",
       "passwordConfirm": "SecurePass123!"
     }'
   # Expected Response: { userId, token, email }
   # Status: 201 Created
   ```

3. **Attempt with invalid code**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "code": "INVALID",
       "email": "test@example.com",
       "password": "SecurePass123!",
       "passwordConfirm": "SecurePass123!"
     }'
   # Expected Response: { error: "Invalid or expired invitation code" }
   # Status: 400 Bad Request
   ```

4. **Attempt with already-used code**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "code": "CODE123",
       "email": "another@example.com",
       "password": "SecurePass123!",
       "passwordConfirm": "SecurePass123!"
     }'
   # Expected Response: { error: "Invitation code already used" }
   # Status: 400 Bad Request
   ```

**Verification**:
- ✅ Database contains InvitationCode.isUsed = true for CODE123
- ✅ Database contains User record with matching email and role = 'user'
- ✅ User can log in with email/password

---

### Scenario 2: Browse Exercise Hierarchy (Series → Season → Episode)

**Objective**: Verify content organization and retrieval

**Setup**:
```bash
# Seed content hierarchy (auto-seeded)
npm run db:seed
```

**Test Steps**:

1. **Get all series**:
   ```bash
   curl -X GET http://localhost:3000/api/exercises \
     -H "Authorization: Bearer user-token"
   # Expected Response:
   # {
   #   series: [
   #     {
   #       seriesId: "uuid1",
   #       title: "Desperate Housewives",
   #       difficulty: "intermediate",
   #       seasons: [
   #         {
   #           seasonId: "uuid2",
   #           seasonNumber: 1,
   #           episodes: [
   #             {
   #               episodeId: "uuid3",
   #               episodeNumber: 1,
   #               title: "Pilot"
   #             }
   #           ]
   #         }
   #       ]
   #     }
   #   ],
   #   total: 3
   # }
   ```

2. **Search by difficulty**:
   ```bash
   curl -X GET "http://localhost:3000/api/exercises?difficulty=beginner" \
     -H "Authorization: Bearer user-token"
   # Expected Response: Only beginner-level series
   ```

3. **Get single exercise metadata**:
   ```bash
   curl -X GET http://localhost:3000/api/exercises/[exerciseId] \
     -H "Authorization: Bearer user-token"
   # Expected Response:
   # {
   #   exerciseId: "uuid",
   #   episodeId: "uuid",
   #   videoUrl: "https://cos-bucket.cos.ap-beijing.myqcloud.com/video1.mp4",
   #   subtitleFormat: "srt",
   #   totalSentences: 127,
   #   durationSeconds: 3456,
   #   userProgress: { currentSentenceIndex: 0, isCompleted: false }
   # }
   ```

**Verification**:
- ✅ Series listed with correct titles and difficulty levels
- ✅ Each series contains correct seasons and episodes
- ✅ Hierarchy is properly nested (Series → Seasons → Episodes → Exercises)
- ✅ Video and subtitle URLs are valid COS URLs

---

### Scenario 3: Start Practice & Auto-Pause Playback

**Objective**: Verify video loads and subtitles are parsed with auto-pause capability

**Setup**:
- Ensure exercise from Scenario 2 is available
- Use test video file (MP4) with matching SRT subtitles on COS

**Test Steps**:

1. **Get exercise with parsed subtitles**:
   ```bash
   curl -X GET http://localhost:3000/api/practice/[exerciseId] \
     -H "Authorization: Bearer user-token"
   # Expected Response:
   # {
   #   videoUrl: "https://cos-bucket.cos.ap-beijing.myqcloud.com/video1.mp4",
   #   subtitles: [
   #     {
   #       index: 0,
   #       start: 0,
   #       end: 2.5,
   #       text: "Hello everyone.",
   #       userConfigured: { isMerged: false, isSkipped: false }
   #     },
   #     {
   #       index: 1,
   #       start: 2.6,
   #       end: 5.2,
   #       text: "Welcome to our show.",
   #       userConfigured: { isMerged: false, isSkipped: false }
   #     }
   #   ]
   # }
   # Status: 200 OK
   ```

2. **Verify frontend can play video**:
   - Load dashboard page: `http://localhost:3000/dashboard/[exerciseId]/practice`
   - Verify HTML5 video element with correct src
   - Verify video timeline shows correct duration
   - ✅ Video loads without CORS errors

3. **Verify frontend timing logic**:
   - Play video and let first subtitle finish
   - Verify video pauses automatically at end of first sentence (end: 2.5s)
   - Verify input field is focused and ready for user input
   - Verify playback cannot resume without user action

**Verification**:
- ✅ All sentences parsed correctly (count matches totalSentences)
- ✅ Timing data is accurate (start < end, sequential)
- ✅ Video plays from correct URL (no auth required for COS public URLs)
- ✅ Auto-pause works at sentence boundaries

---

### Scenario 4: Submit Dictation & Accuracy Feedback

**Objective**: Verify word-level accuracy calculation and color-coded feedback

**Setup**:
- Use sentence: "Hello everyone" (correct answer)
- User input: "Helo everyone" (typo in first word: 1 character diff)

**Test Steps**:

1. **Submit dictation for checking**:
   ```bash
   curl -X POST http://localhost:3000/api/practice/[exerciseId]/check \
     -H "Authorization: Bearer user-token" \
     -H "Content-Type: application/json" \
     -d '{
       "sentenceIndex": 0,
       "userInput": "Helo everyone"
     }'
   # Expected Response:
   # {
   #   correctAnswer: "Hello everyone",
   #   accuracy: 50.0,  // 1 correct + 1 acceptable / 2 words = 1 * 100 = 50%
   #   wordFeedback: [
   #     {
   #       word: "Hello",
   #       userWord: "Helo",
   #       status: "acceptable"  // Levenshtein distance = 1
   #     },
   #     {
   #       word: "everyone",
   #       userWord: "everyone",
   #       status: "correct"
   #     }
   #   ]
   # }
   ```

2. **Test boundary cases**:

   **Case A: Exact match**
   ```bash
   POST /api/practice/[exerciseId]/check
   { sentenceIndex: 0, userInput: "Hello everyone" }
   # Expected: accuracy = 100.0, all "correct" status
   ```

   **Case B: Typo within threshold (Levenshtein ≤ 2)**
   ```bash
   POST /api/practice/[exerciseId]/check
   { sentenceIndex: 0, userInput: "Helo evreyone" }
   # Expected: accuracy = 100.0
   # "Helo" → "acceptable" (distance 1)
   # "evreyone" → "acceptable" (distance 1)
   ```

   **Case C: Typo exceeding threshold (Levenshtein > 2)**
   ```bash
   POST /api/practice/[exerciseId]/check
   { sentenceIndex: 0, userInput: "Hlo vryn" }
   # Expected: accuracy = 0.0
   # "Hlo" → "wrong" (distance > 2)
   # "vryn" → "wrong" (distance > 2)
   ```

   **Case D: Extra words**
   ```bash
   POST /api/practice/[exerciseId]/check
   { sentenceIndex: 0, userInput: "Hello everyone please listen" }
   # Expected: accuracy = 66.7% (2 correct, 2 extra words)
   ```

   **Case E: Missing words**
   ```bash
   POST /api/practice/[exerciseId]/check
   { sentenceIndex: 0, userInput: "Hello" }
   # Expected: accuracy = 50.0% (1 correct, 1 missing)
   ```

3. **Verify frontend displays feedback**:
   - Load practice page: `http://localhost:3000/dashboard/[exerciseId]/practice`
   - Submit dictation
   - Verify color-coded display:
     - 🟢 "Hello" or "hello" = green (exact)
     - 🟠 "Helo" = orange (typo)
     - 🔴 "xyz" = red (wrong)
   - Verify accuracy percentage displayed (0-100)

**Verification**:
- ✅ Levenshtein distance calculation is correct
- ✅ Word-level feedback is accurate
- ✅ Accuracy percentage matches formula: (correct + acceptable) / total * 100
- ✅ Frontend displays colors correctly
- ✅ User can review feedback and click "Next"

---

### Scenario 5: Save Progress & Resume Exercise

**Objective**: Verify progress persistence and resume capability

**Setup**:
- User has completed sentences 0-3 with accuracy: 85%, 90%, 75%, 88%

**Test Steps**:

1. **Auto-save after each sentence** (should happen automatically):
   ```bash
   curl -X POST http://localhost:3000/api/practice/[exerciseId]/save-progress \
     -H "Authorization: Bearer user-token" \
     -H "Content-Type: application/json" \
     -d '{
       "sentenceIndex": 0,
       "userInput": "Hello everyone",
       "accuracy": 85.0,
       "wordFeedback": [
         { "word": "Hello", "userWord": "Hello", "status": "correct" },
         { "word": "everyone", "userWord": "everyone", "status": "correct" }
       ],
       "isCompleted": false
     }'
   # Response: { progressId, savedAt }
   # Status: 200 OK
   ```

2. **Check progress after saving sentence 0**:
   ```bash
   curl -X GET http://localhost:3000/api/exercises/[exerciseId]/progress \
     -H "Authorization: Bearer user-token"
   # Expected Response:
   # {
   #   userId: "uuid",
   #   exerciseId: "uuid",
   #   currentSentenceIndex: 0,
   #   isCompleted: false,
   #   overallAccuracy: null,  // Not yet completed
   #   attempts: [
   #     {
   #       sentenceIndex: 0,
   #       userInput: "Hello everyone",
   #       accuracy: 85.0,
   #       timestamp: "2026-09-09T10:30:00Z"
   #     }
   #   ]
   # }
   ```

3. **Close browser and reopen exercise**:
   - Navigate to: `http://localhost:3000/dashboard/[exerciseId]`
   - Click "Resume"
   - Verify video starts at sentence 1 (after last completed 0)
   - Verify progress bar shows "4/127 sentences completed"

4. **Complete exercise**:
   - User completes all 127 sentences
   - Last save includes isCompleted: true
   ```bash
   POST /api/practice/[exerciseId]/save-progress
   { ..., isCompleted: true, accuracy: 84.5 }
   ```

5. **Verify completion status**:
   ```bash
   GET /api/exercises/[exerciseId]/progress
   # Expected: isCompleted = true, overallAccuracy = 84.5
   ```

6. **Verify exercise list shows completion**:
   ```bash
   GET /api/exercises
   # Exercise now shows: "Completed - 84.5% accuracy"
   ```

**Verification**:
- ✅ Progress saved after each sentence (in database)
- ✅ User can resume from last sentence on page reload
- ✅ Overall accuracy calculated correctly on completion
- ✅ Completion status persists in database
- ✅ Exercise list reflects completion status

---

### Scenario 6: Customize Subtitle Settings (Merge/Skip)

**Objective**: Verify user can merge and skip subtitles with read-only constraints

**Setup**:
- User has completed 3 sentences (currentSentenceIndex: 3)
- Subtitle list has 127 total sentences

**Test Steps**:

1. **Get current subtitle config**:
   ```bash
   curl -X GET http://localhost:3000/api/subtitles/[exerciseId]/config \
     -H "Authorization: Bearer user-token"
   # Expected Response:
   # {
   #   userId: "uuid",
   #   exerciseId: "uuid",
   #   mergedGroups: [],
   #   skippedSentences: [],
   #   currentProgress: 3  // Read-only barrier
   # }
   ```

2. **Attempt to edit locked sentences (before progress)**:
   ```bash
   curl -X PUT http://localhost:3000/api/subtitles/[exerciseId]/config \
     -H "Authorization: Bearer user-token" \
     -H "Content-Type: application/json" \
     -d '{
       "mergedGroups": [
         { "startIndex": 0, "endIndex": 1, "label": "Intro" }
       ],
       "skippedSentences": []
     }'
   # Expected Response: { error: "Cannot modify sentences before current progress (3)" }
   # Status: 400 Bad Request
   ```

3. **Update editable sentences (at or after progress)**:
   ```bash
   curl -X PUT http://localhost:3000/api/subtitles/[exerciseId]/config \
     -H "Authorization: Bearer user-token" \
     -H "Content-Type: application/json" \
     -d '{
       "mergedGroups": [
         { "startIndex": 3, "endIndex": 5, "label": "First group" },
         { "startIndex": 10, "endIndex": 12, "label": "Second group" }
       ],
       "skippedSentences": [8, 9, 20]
     }'
   # Expected Response: { configId, updatedAt, appliesNextPlayback: true }
   # Status: 200 OK
   ```

4. **Verify config persisted**:
   ```bash
   GET /api/subtitles/[exerciseId]/config
   # Expected: mergedGroups and skippedSentences match submitted values
   ```

5. **Resume exercise and verify merged/skipped playback**:
   ```bash
   GET /api/practice/[exerciseId]
   # Expected subtitles response:
   # [
   #   { index: 3, start: X, end: Y, text: "...", isMerged: true },
   #   { index: 4, start: Y, end: Z, text: "...", isMerged: true },
   #   { index: 5, start: Z, end: W, text: "...", isMerged: true },  // Merged group 1
   #   { index: 6, text: "...", userConfigured: { isSkipped: false } },
   #   { index: 7, text: "...", userConfigured: { isSkipped: false } },
   #   { index: 8, userConfigured: { isSkipped: true } },  // Skipped
   #   { index: 9, userConfigured: { isSkipped: true } },  // Skipped
   #   ... (20 also marked skipped)
   # ]
   ```

6. **User completes updated exercise**:
   - Verify playback skips sentences 8, 9, 20
   - Verify merged sentences 3-5 play as single unit
   - Verify overall accuracy excludes skipped sentences

**Verification**:
- ✅ Cannot edit sentences before current progress (read-only constraint enforced)
- ✅ Can edit sentences at and after current progress
- ✅ Merge configuration persists in database
- ✅ Skip configuration persists in database
- ✅ Playback applies user's merged and skipped configurations
- ✅ Accuracy calculation excludes only this user's skipped sentences
- ✅ Changes take effect on next playback

---

## Test Data Summary

### Seed Data Includes:

**Series** (3 total):
- Desperate Housewives (intermediate)
- Breaking Bad (advanced)
- Friends (beginner)

**Seasons per Series** (2-3):
- Desperate Housewives: S01, S02
- Breaking Bad: S01, S02
- Friends: S01, S02, S03

**Episodes per Season** (3 typical):
- Each season contains 3 episodes

**Exercises per Episode** (1-2):
- Total ~20 exercises

**InvitationCodes** (10-20 available):
- All with expiry date 30 days from now
- Mix of used and unused

**Test Users** (3 total):
- admin@example.com (role: admin)
- learner1@example.com (role: user)
- learner2@example.com (role: user)

---

## Troubleshooting Guide

| Issue | Symptom | Solution |
|-------|---------|----------|
| Database connection fails | `Error: connect ECONNREFUSED` | Check DATABASE_URL, MySQL is running, credentials correct |
| Subtitle parsing fails | `404: Subtitle file not found` | Verify COS URLs are correct, file exists, COS credentials valid |
| Video doesn't load | `CORS error in console` | Ensure COS bucket allows public access or video URL is public |
| Levenshtein calculation wrong | Accuracy always 100% or 0% | Check word tokenization, ensure fuzzy matching library is called |
| Progress not saving | Resuming starts from 0 | Check DATABASE_URL, UserExerciseProgress table exists, userId/exerciseId correct |
| Read-only constraint not enforced | Can edit sentences before progress | Check validation in PUT /api/subtitles endpoint, compare startIndex to currentProgress |

---

## Running Automated Tests

```bash
# Unit tests (accuracy, parsing)
npm run test:unit

# Integration tests (auth, practice flow)
npm run test:integration

# E2E tests (full browser flow - requires Playwright)
npm run test:e2e

# All tests
npm run test
```

Expected outcome: All tests pass (green checkmarks)

---

## Performance Validation

**Load Exercise Hierarchy**: Should complete in <500ms
```bash
time curl -X GET http://localhost:3000/api/exercises
```

**Check Accuracy**: Should complete in <100ms
```bash
time curl -X POST http://localhost:3000/api/practice/[exerciseId]/check \
  -H "Content-Type: application/json" \
  -d '{"sentenceIndex": 0, "userInput": "..."}'
```

**Save Progress**: Should complete in <50ms
```bash
time curl -X POST http://localhost:3000/api/practice/[exerciseId]/save-progress ...
```

---

## Completion Checklist

- [ ] All seed data created (Series, Seasons, Episodes, Exercises, InvitationCodes, Users)
- [ ] Scenario 1 (Registration) passes with valid/invalid/used codes
- [ ] Scenario 2 (Exercise Hierarchy) displays correct Series/Seasons/Episodes
- [ ] Scenario 3 (Playback) loads video and parses all subtitles
- [ ] Scenario 4 (Accuracy) calculates correct feedback for 5 test cases
- [ ] Scenario 5 (Progress) saves and resumes correctly across sessions
- [ ] Scenario 6 (Subtitle Config) enforces read-only constraints
- [ ] All unit tests pass (accuracy, parsing, utils)
- [ ] All integration tests pass (auth, practice, config)
- [ ] All E2E tests pass (Playwright browser flow)
- [ ] Performance meets targets (<500ms hierarchy, <100ms accuracy)

**When all items checked**: Feature is production-ready for Phase 2 → Phase 3 integration testing
