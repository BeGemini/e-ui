# Specification Quality Checklist: English Listening Dictation Practice App

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-09
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
  - ✅ Spec focuses on user value and learning outcomes, not tech stack
  - ✅ No mentions of Next.js, React, database technologies in requirements
- [x] Focused on user value and business needs
  - ✅ User stories clearly state what learners achieve
  - ✅ Monetization model (invitation codes) is clearly defined
- [x] Written for non-technical stakeholders
  - ✅ Terminology is accessible (users, exercises, sentences, accuracy)
  - ✅ Business context (monetization, teacher roles) is included
- **All mandatory sections completed**:
  - ✅ User Scenarios: 7 stories (P1 x 4, P2 x 2, P3 x 1) + edge cases
  - ✅ Requirements: 21 functional requirements defined (FR-001 through FR-021)
  - ✅ Key Entities: 7 entities identified with attributes (added UserSubtitleConfig for user-specific settings)
  - ✅ Success Criteria: 8 measurable outcomes
  - ✅ Assumptions: 14 documented assumptions (updated for user-level config and premium copy feature)

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
  - ✅ Both clarifications resolved and updated in spec
- [x] Requirements are testable and unambiguous
  - ✅ Each FR has clear, testable outcomes
  - ✅ Acceptance scenarios use Given-When-Then format
- [x] Success criteria are measurable
  - ✅ All success criteria include metrics (time, percentage, errors)
- [x] Success criteria are technology-agnostic
  - ✅ No implementation details in success criteria
  - ✅ Focus on user experience and system performance
- [x] All acceptance scenarios are defined
  - ✅ Each user story has 4-6 acceptance scenarios
  - ✅ Covers happy path and some error cases
- [x] Edge cases are identified
  - ✅ 5 edge cases listed (timing, corruption, network, punctuation, file access)
- [x] Scope is clearly bounded
  - ✅ MVP scope defined (5 user stories)
  - ✅ Out of scope noted (mobile, v1 constraints)
- [x] Dependencies and assumptions identified
  - ✅ 12 assumptions documented
  - ✅ Dependencies on auth, file storage identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
  - ✅ FR-001 through FR-021 all have testable outcomes
- [x] User scenarios cover primary flows
  - ✅ Registration → Upload → Practice → Verify → Review
- [x] Feature meets measurable outcomes defined in Success Criteria
  - ✅ SC-001 through SC-008 are achievable with defined requirements
- [x] No implementation details leak into specification
  - ✅ Spec is clean of technical stack mentions

## Clarification Resolution ✅

### Question 1: Accuracy Calculation → **RESOLVED (Option B - Fuzzy Matching with Visual Feedback)**

**Decision**: Word-level fuzzy matching with Levenshtein distance ≤ 2 characters per word

**Visual Feedback Design**:
- 🟢 **Green**: Exact word match (case-insensitive)
- 🟠 **Orange**: Near-correct with minor typos (Levenshtein distance 1-2 chars)
- 🔴 **Red**: Completely wrong or missing words

**Display Format**: Side-by-side comparison
- Left side: Original subtitle text
- Right side: User's dictation with color-coded word feedback

**Accuracy Calculation**: (correct_words + acceptable_typo_words) / total_words × 100%

**Rationale**: 
- Forgiving of slip-ups and typing errors while maintaining listening comprehension focus
- Visual word-level feedback helps learners identify exactly what they heard correctly vs. missed
- Color coding provides immediate reinforcement and motivation
- Better learning outcomes for language learners vs. strict grading

**Implementation Impact**: 
- Requires Levenshtein distance algorithm library
- Requires word tokenization and comparison logic
- Requires color-coded rendering in UI (separate styling for each word)

---

### Question 2: Progress Persistence → **RESOLVED (Full Session Persistence with Resume)**

**Decision**: Complete progress and dictation content persistence
- System saves user progress after each sentence
- User can resume from last completed sentence on return
- All dictation attempts retained for learner review
- Real-time autosave prevents data loss

**Rationale**: Users may have interrupted sessions due to network, browser close, or switching devices. Persistence ensures learning continuity and respects user time investment. Complete history supports learning analytics and review.

**Implementation Impact**: Requires session/progress table in database; autosave on sentence completion

---

## Clarification Q1-Q7: Final Round (2026-09-09) ✅

### Q1: User Roles and Permissions ✅
- **Q**: Should both admin and regular users have subtitle customization capability?
- **A**: Yes. Admin and User (learner) roles both need independent subtitle settings.
- **Impact**: Both roles can now merge/skip subtitles independently for each exercise
- **Updated**: User Story 6, FR-015-018

### Q2: Invitation Code Management ✅
- **Q**: How are invitation codes generated and managed?
- **A**: Codes are pre-generated by admin in database with expiration dates; system validates but doesn't generate
- **Impact**: FR-001 unchanged; Assumptions updated to clarify external code management
- **Updated**: Assumptions section

### Q3: Premium Feature Timeline ✅
- **Q**: Should premium copy feature be implemented in v1?
- **A**: No. Defer to v2.0; v1 focuses on manual subtitle customization without monetization
- **Impact**: User Story 7, FR-020-022 marked [FUTURE v2.0]; Premium feature removed from current scope
- **Updated**: User Story 7 priority downgraded to P3-Future

### Q4: Subtitle Editing Permissions ✅
- **Q**: When can users edit subtitle settings - anytime or with restrictions?
- **A**: Only for sentences AFTER current progress; before/current position are read-only
- **Impact**: Prevents editing already-completed sentences; maintains consistency of past attempts
- **Updated**: User Story 6 Acceptance Scenarios (2, 8), FR-016

### Q5: Subtitle Changes Timing ✅
- **Q**: When do subtitle changes take effect?
- **A**: Real-time after clicking Save; no need to restart or confirm
- **Impact**: Improved UX with immediate feedback
- **Updated**: User Story 6 Acceptance Scenario 9, FR-015

### Q6: Data Retention and Compliance ✅
- **Q**: How long is data retained and what compliance is needed?
- **A**: Permanent retention; user agreement required; no GDPR (Chinese users only)
- **Impact**: No data deletion policies; simplifies compliance
- **Updated**: Assumptions, Success Criteria

### Q7: Subtitle Format Support ✅
- **Q**: Which subtitle formats must be supported and are there size/count limits?
- **A**: Support SRT, VTT, SSA, ASS (all required); no file size or sentence count limits
- **Impact**: Maximum flexibility for content creators
- **Updated**: FR-003, Assumptions

---

## Key Specification Enhancements - Subtitle Management Redesign ✅


**Original Design**: Global subtitle merge/skip settings (admin-only)

**Revised Design**: User-level subtitle customization with premium copy feature

**Key Changes**:

1. **User-Level Customization** (FR-015-018):
   - Both admin and regular users can customize subtitles
   - Each user has independent settings per exercise
   - Settings include: merged subtitle groups, skipped sentence list
   - Stored in new `UserSubtitleConfig` entity

2. **Playback Behavior**:
   - System retrieves user's specific subtitle configuration for that exercise
   - Merged subtitles play together as single unit
   - Skipped subtitles are completely omitted from playback
   - Accuracy calculation: only counts active sentences (not skipped by this user)

3. **Premium Copy Feature** (FR-019-021, User Story 7, P3):
   - Regular users: Default settings or manually customize
   - Premium users: Can click "Copy from Admin" to instantly use admin's optimized configuration
   - Copy creates independent snapshot - admin's future changes don't affect user's copy
   - Non-premium users see upgrade prompt when attempting copy

**Monetization Strategy**:
- Free tier: Users can manually customize (merge/skip)
- Premium tier: Can copy admin's pre-configured settings (saves time)
- Value proposition: "Use expert-curated content configurations from experienced teachers"

---

## Notes

- Feature is well-structured and clear
- All clarification questions resolved and specification updated
- All user stories are independently testable and deliverable
- **Subtitle management refined** (FR-015 through FR-021):
  - ✅ User-level subtitle customization: Each user can independently configure subtitle merging/skipping per exercise
  - ✅ Independent settings: Multiple users can customize same exercise differently
  - ✅ Premium copy feature (P3): Paid users can copy admin's pre-optimized configurations
  - ✅ Independent copies: Copied settings don't change when admin modifies original
  - ✅ New UserSubtitleConfig entity to store per-user customizations
- Constitution compliance verified:
  - ✅ Uses shadcn for UI (not specified in spec, but will be enforced during planning)
  - ✅ Type safety enforced (entity definitions provided with new fields)
  - ✅ Full-stack integration (API routes in Next.js)
  - ✅ No separate backend required
- Ready for planning phase (`/speckit.plan`)
