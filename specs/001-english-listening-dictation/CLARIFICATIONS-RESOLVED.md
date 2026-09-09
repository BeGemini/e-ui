# Clarifications Resolved - Phase 0 Readiness

**Date**: 2026-09-09 16:30 UTC+8  
**Status**: ✅ **ALL CRITICAL CLARIFICATIONS RESOLVED - Ready for Phase 0 Implementation**  
**Resolver**: Product Lead (User Input)

---

## Summary of Resolutions

Three critical clarification items blocking Phase 0 have been resolved:

| Item | Clarification | Decision | Impact | Status |
|------|---|---|---|---|
| **A1** | Word-Level Accuracy: How to handle missing/extra words | Missing words: empty slot + red highlight (0% that word). Extra words: mark as red error. Formula: (correct + acceptable_typo) / total_correct × 100% | Tasks T033-T034 (accuracy algorithm) can proceed | ✅ RESOLVED |
| **A3** | Read-Only Constraint Boundary: > or >= | **Inclusive boundary (>=)**. If currentSentenceIndex=5, users can edit sentence 5 onwards (allows preview before play) | Tasks T045 (validation), T048 (UI), T062 (tests) can proceed | ✅ RESOLVED |
| **A7** | Admin Content Management: In-app or external | **Database-only approach**. App is read-only learner app. Admins manage content via external DB tools (phpMyAdmin, DBeaver, etc.). No admin UI/endpoints in scope. | Scope clarification: No admin CRUD tasks needed. Reduces MVP scope. | ✅ RESOLVED |

---

## Implementation Guidance

### A1: Accuracy Algorithm Implementation

**Word-Level Comparison with Missing/Extra Word Handling**

```typescript
// Pseudo-algorithm for accuracy calculation
function checkAccuracy(userInput: string, correctText: string): {
  accuracy: number;
  wordFeedback: Array<{
    correctWord: string;
    userWord: string;
    status: 'correct' | 'acceptable' | 'wrong' | 'missing';
  }>;
}

// 1. Tokenize both inputs (split by whitespace and punctuation)
const correctWords = tokenize(correctText);     // ["Hello", "everyone", "how", "are", "you"]
const userWords = tokenize(userInput);           // ["Hello", "how", "are", "you"]

// 2. Perform sequence alignment (e.g., Longest Common Subsequence or diff algorithm)
// 3. For each word in correctWords:
//    - If word exists in userWords AND Levenshtein(word, userWord) <= 2: "acceptable" (orange)
//    - If word exists in userWords AND exact match: "correct" (green)
//    - If word NOT in userWords: "missing" (red, empty slot)
// 4. For extra words in userWords not in correctWords: mark as "wrong" (red)

// 5. Calculate accuracy:
//    accuracy = (count_correct + count_acceptable) / len(correctWords) * 100%
```

**Display Format**:
```
Correct:  |Hello |everyone|how |are |you |
User:     |Hello |        |how |are |you |
Status:   |🟢    |🔴      |🟢  |🟢  |🟢  |
Accuracy: 4/5 = 80%
```

**Key Implementation Notes**:
- Use Levenshtein distance library (e.g., `fuzzyset.js` or native implementation)
- Tokenization: split by `\s+` (whitespace) and remove/normalize punctuation
- Empty slot display: use HTML `<span>` or shadcn `Badge` with red background
- Task T033: Implement Levenshtein distance
- Task T034: Implement word comparison logic
- Task T041: Implement color-coded display component

---

### A3: Read-Only Constraint Implementation

**Inclusive Boundary: currentSentenceIndex >= user_can_edit_from**

```typescript
// API validation (Task T045: PUT /api/subtitles/[exerciseId]/config)
function validateSubtitleConfig(
  userId: string,
  exerciseId: string,
  config: { mergedGroups: MergeGroup[]; skippedSentences: number[] }
) {
  // 1. Get user's current progress
  const progress = await getUserExerciseProgress(userId, exerciseId);
  const currentSentenceIndex = progress.currentSentenceIndex; // e.g., 5
  
  // 2. Validate read-only constraint (inclusive boundary)
  for (const index of config.skippedSentences) {
    if (index < currentSentenceIndex) {
      throw new Error(
        `Cannot modify sentence ${index}. Only sentences >= ${currentSentenceIndex} are editable.`
      );
    }
  }
  
  // 3. Validate merge groups don't overlap and are within valid range
  // 4. Save config
}
```

**Boundary Examples**:
- currentSentenceIndex = 0 → Can edit sentences 0, 1, 2, ... (all sentences)
- currentSentenceIndex = 5 → Can edit sentences 5, 6, 7, ... (locked: 0-4)
- currentSentenceIndex = 9 (last sentence) → Can edit only sentence 9

**UI Display (Task T048)**:
- Sentences 0 to currentSentenceIndex-1: **Locked** (visual indicator, no checkboxes)
- Sentences currentSentenceIndex onwards: **Editable** (checkboxes, merge controls available)

**Database Validation**:
- Update constraint in UserSubtitleConfig: `skippedSentences cannot include indices < currentSentenceIndex`

---

### A7: Admin Content Management - Database-Only Approach

**Application Scope**:
- ✅ **READ operations**: App displays Series → Seasons → Episodes → Exercises
- ✅ **Practice operations**: App handles dictation, progress, subtitle customization
- ❌ **ADMIN operations**: App does NOT create/edit/delete content (no admin UI or API endpoints)

**Admin Workflow (External)**:
```
Admin (external to app):
1. Use database client (phpMyAdmin, DBeaver, CLI, etc.)
2. INSERT INTO Series VALUES (...)
3. INSERT INTO Season VALUES (...)
4. INSERT INTO Episode VALUES (...)
5. INSERT INTO Exercise VALUES (videoUrl, subtitleUrl, ...)
6. Upload video and subtitle files to Tencent COS (via COS console or CLI)
7. INSERT INTO InvitationCode VALUES (code, expiryDate, ...)

App (learner-focused):
- GET /api/exercises → List all Series/Seasons/Episodes
- GET /api/exercises/[id] → Load exercise metadata
- GET /api/practice/[id] → Load practice content
- POST /api/practice/[id]/check → Check accuracy
- ... (no admin endpoints)
```

**FR-012 Reinterpretation**:
- Original: "System MUST support admin role with permissions to manage exercises"
- Clarified: "System MUST display admin-managed exercises correctly" (read-only validation)
- Admin management happens outside the app via database

**Impact on Tasks**:
- ✅ No admin CRUD endpoints needed
- ✅ No admin authentication/authorization logic needed
- ✅ No admin UI components needed
- ✅ MVP scope REDUCED
- ✅ Tasks T001-T080 remain focused on learner experience

---

## Documentation Updates

All documents have been updated to reflect these clarifications:

1. ✅ **spec.md**
   - Updated FR-007 with missing/extra word handling
   - Updated FR-016 with inclusive boundary
   - Added Q8, Q9, Q10 to Clarifications section

2. ✅ **data-model.md**
   - Updated read-only constraint description with inclusive boundary

3. ✅ **analysis-report.md**
   - Marked A1, A3, A7 as ✅ RESOLVED
   - Updated issue severity from HIGH to RESOLVED

4. ✅ **tasks.md**
   - No changes needed (no admin CRUD tasks in MVP scope)
   - Story 7 (Premium copy admin) remains deferred to v2.0

---

## Phase 0 Readiness Checklist

Before starting Phase 0 implementation:

- [x] All 3 critical clarification items resolved
- [x] No HIGH severity issues remain open
- [x] Constitutional compliance verified (5/5 principles pass)
- [x] All documents updated with clarifications
- [x] Phase 0 tasks (T001-T010) are executable and clear
- [x] Team understanding aligned on accuracy algorithm, boundary, and admin scope

**Gate Status**: ✅ **APPROVED FOR PHASE 0 IMPLEMENTATION**

---

## Next Steps

**Immediate**: Start Phase 0 (Project Initialization & Setup)

```bash
# Phase 0 Tasks (2-3 days):
# T001: Initialize Next.js with TypeScript/ESLint
# T002: Configure Tailwind CSS 4
# T003: Setup environment variables
# T004: Setup MySQL connection pool
# T005: Setup Tencent COS SDK
# T006: Create TypeScript type definitions
# T007: Create database schema migration
# T008: Create seed data script
# T009: Setup Jest testing
# T010: Setup GitHub Actions CI/CD
```

**Phase 0 Completion**: Ready to start Phase 1 (Authentication & User Management) within 2-3 days

---

**Prepared by**: GitHub Copilot (speckit.implement mode)  
**Timestamp**: 2026-09-09T16:30:00+08:00  
**Status**: 🟢 Ready for Implementation

