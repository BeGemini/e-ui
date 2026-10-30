# Specification Analysis Report

**Feature**: English Listening Dictation Practice App  
**Branch**: `001-english-listening-dictation`  
**Analysis Date**: 2026-09-09  
**Artifacts Analyzed**: spec.md, plan.md, data-model.md, tasks.md, contracts/, constitution.md  
**Status**: ✅ Ready for Implementation (with recommended clarifications)

---

## Executive Summary

**Overall Assessment**: ✅ **PASS - Ready for Phase 0 Implementation**

All critical constitutional principles are compliant. The specification and implementation plan are comprehensive and well-organized. **All 3 high-severity clarification items have been resolved (2026-09-09)**:

1. ✅ **Word-Level Accuracy Algorithm** - RESOLVED: Missing words show as blank+red (0% accuracy), extra words marked red
2. ✅ **Read-Only Constraint Boundary** - RESOLVED: Boundary is inclusive (>=), users can edit sentences at index >= currentSentenceIndex
3. ✅ **Admin Content Management** - RESOLVED: App handles read-only content; admins manage via DB tools only

These are **clarification-level** issues (not design failures) and should be resolved in the next 1-2 days before Phase 0 begins.

**Metrics**:
- Functional Requirements: 22 (3 deferred to v2.0) → 19 MVP
- Success Criteria: 8 (1 operational, not buildable) → 7 buildable
- User Stories: 7 (1 deferred to v2.0) → 6 MVP
- Implementation Tasks: 82 MVP + 3 Future
- Requirement-to-Task Coverage: ~95%
- Constitutional Compliance: ✅ 5/5 principles

---

## Issue Analysis Table

| ID | Category | Severity | Location | Summary | Recommendation |
|----|----------|----------|----------|---------|-----------------|
| A1 | Ambiguity | ✅ RESOLVED | FR-006, FR-007, FR-007a | Word-level accuracy algorithm clarified: missing words show as blank+red (0% that word), extra words marked red. Levenshtein ≤2 chars=orange, >2=red | **Decision (2026-09-09)**: For missing words: display empty slot with red highlight (visual cue to learner). For extra words: mark as red error. Accuracy = (correct + acceptable_typo) / total_correct_words × 100% |
| A2 | Inconsistency | 🔴 HIGH | tasks.md:L374-394 | User Story 5 tasks (T051-T054) partially tagged. T051, T052, T053 should all have [US5] tag like T054 does | Standardize task labels: mark all US5 implementation tasks with [US5] for consistent tracking and coverage reporting |
| A3 | Ambiguity | ✅ RESOLVED | FR-016, data-model.md:L515 | Read-only constraint boundary clarified to inclusive (>=). Users can modify sentences at index >= currentSentenceIndex. | **Decision (2026-09-09)**: Boundary is INCLUSIVE (>=). If currentSentenceIndex=5, user can edit sentence 5 onwards. Allows user to preview/customize next sentence before playing. |
| A4 | Underspecification | 🟠 MEDIUM | US5, tasks.md:L370-394 | User Story 5 Scenario 2 mentions "average accuracy and trend graph" but no explicit FR. Dashboard design not fully specified in FRs. | Add FR-023: "System MUST display user's exercise history with date, accuracy %, and optional trend visualization" OR update US5 to clarify scope |
| A5 | Coverage Gap | 🟠 MEDIUM | SC-002, SC-003, SC-004, tasks.md Phase 5 | Performance metrics (2s playback, 500ms pause, 1s accuracy display) defined but no explicit test tasks. T069-T072 general optimization but no latency assertion tests. | Add performance regression tests in Phase 5: T067a for latency verification per SC-002/003/004 |
| A6 | Terminology Drift | 🟠 MEDIUM | spec.md, data-model.md, contracts/ | Inconsistent terminology: "sentence" vs "Subtitle" entity. FR uses "sentence", schema uses "Subtitle" table. tasks.md mixes both terms. | Unify terminology: either rename data-model entity "Sentence" or update all FRs to use "subtitle" consistently (recommend "Sentence" as it's more semantic) |
| A7 | Scope Ambiguity | ✅ RESOLVED | FR-012, plan.md | Admin content management handled via DB only. App is read-only for content; admins manage Series/Seasons/Episodes/Exercises directly in database. | **Decision (2026-09-09)**: No admin UI or endpoints for content creation. App focuses on learner experience only. Admin uses external DB tools (phpMyAdmin, DBeaver, etc.) for content management. |
| A8 | Scope Ambiguity | 🟠 MEDIUM | Assumptions, FR-001, tasks.md:T013 | Invitation code generation not in scope (admin manages in DB). No API or UI for admin to generate codes. | Clarify: Will there be an admin endpoint to generate invitation codes (POST /api/admin/codes), or is external DB management required? Document the admin workflow. |
| A9 | Classification | 🟡 LOW | SC-005, spec.md:L203 | "Users can access exercises without errors 99% of the time" is an operational metric (uptime/SLA), not a feature success criterion. No implementation task for this. | Move SC-005 to separate Operations/SLA section or mark as "Non-Buildable - Operational Metric". Feature success criteria should be deliverable outcomes, not post-launch monitoring. |
| A10 | Redundancy (Intentional) | 🟡 LOW | FR-009, FR-011, FR-019 | Accuracy calculation requirements appear related but serve distinct purposes (storage, display, filtering). Not redundant, but tightly coupled. | No action required. These are intentional: FR-009 (persistence) + FR-011 (display) + FR-019 (skip filtering) form complete accuracy feature. Document this coupling in architecture notes. |

---

## Coverage Summary

| Requirement Category | Count | Mapped Tasks | Coverage | Notes |
|---|---|---|---|---|
| User Stories (MVP) | 6 | T011-T080 | ✅ 100% | US1-US6 all have task groups; US7 (Premium) deferred |
| Functional Requirements (MVP) | 19 | T011-T080 | ✅ 95% | FR-001-019 mapped; FR-020-022 deferred; A7 (admin mgmt) needs clarification |
| Success Criteria (Buildable) | 7 | T001-T080 | ✅ 90% | SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008 covered; SC-005 operational (not buildable) |
| API Endpoints | 14 | contracts/ | ✅ 100% | Auth (4), Exercise (4), Practice (3), Subtitle (3) - all FRs mapped |
| Data Entities | 9 | data-model.md | ✅ 100% | All entities defined with SQL DDL, FKs, indexes, constraints |

**Total Specification Lines Analyzed**: ~800  
**Total Implementation Tasks Generated**: 82 MVP  
**Requirement Density**: 22 FRs / 68 epic tasks = 0.32 FRs per task (complex features)

---

## Constitution Alignment Verification

**Status**: ✅ **FULLY COMPLIANT** - All 5 principles verified

| Principle | Compliance | Evidence | Risk |
|-----------|-----------|----------|------|
| **I. shadcn-First UI** | ✅ PASS | Tasks T026-T054 specify shadcn components exclusively (VideoPlayer, Form, Card, Button, Dialog). No custom HTML planned. plan.md affirms compliance. | None |
| **II. Type Safety** | ✅ PASS | T006 creates lib/types.ts; all API contracts have full TypeScript types (RegisterRequest, CheckAccuracyResponse, etc.). plan.md requires strict mode. | None |
| **III. Full-Stack Integration** | ✅ PASS | All backend in app/api/* routes. No microservices. T001-T005 setup confirms single Next.js project. plan.md III confirms. | None |
| **IV. Desktop Web & Accessible** | ✅ PASS | Tailwind CSS desktop layout in T002. T068 includes WCAG 2.1 AA audit. Components use ARIA and semantic shadcn structure. | None |
| **V. Code Quality** | ✅ PASS | T009 (Jest setup), T010 (CI/CD), T055-T062 (comprehensive tests), T073 (input validation). ESLint enforced in T001. | None |

**Constitutional Gate**: ✅ **APPROVED FOR IMPLEMENTATION**

---

## Unmapped or Partially Mapped Items

### Requirements with Unclear Implementation Path

**A7 (Admin Exercise Management)**
- **Requirement**: FR-012 "System MUST support admin role with permissions to manage exercises"
- **Issue**: No admin endpoints in contracts/ for exercise creation/editing
- **Current Implementation**: None in API contracts (only learner/read endpoints)
- **Impact**: Admin cannot manage content via app UI; must use DB directly
- **Recommendation**: 
  - **Option A**: Add admin exercise management API endpoints (POST/PUT /api/admin/exercises/*, /api/admin/series/*, etc.) - requires ~5 additional tasks
  - **Option B**: Document that admin uses external tool (DB client) for content management; mark FR-012 as "Database-Level Only"
  - **Decision Needed**: By Phase 0 kickoff

**A8 (Invitation Code Generation)**
- **Requirement**: Invitation codes generated by admin (Assumption, FR-001 validation)
- **Issue**: No admin endpoint to generate codes; no UI for admin code management
- **Current Implementation**: None (assumes external generation)
- **Impact**: Admin must use DB tool to create codes; no in-app management
- **Recommendation**: 
  - **Option A**: Add POST /api/admin/codes endpoint to generate new codes
  - **Option B**: Document that code generation happens outside app (CRM or external tool)
  - **Decision Needed**: By Phase 0 kickoff

### User Story 5 (Progress Display) - Partial Coverage

**Status**: Mostly Complete, Partially Labeled

**What's Covered**:
- ✅ T051: Exercise completion summary calculation
- ✅ T052: ExerciseSummaryCard component (shows current attempt stats)
- ✅ T053: AttemptHistory component (shows previous attempts)
- ✅ T054: ExerciseCompletionPage (aggregates summary + history)

**What's Possibly Missing**:
- ❓ "Progress Dashboard" mentioned in US5 Scenario 2 as showing "average accuracy and trend graph"
- Current Tasks: T054 only shows single-exercise completion page
- Gap: Dashboard aggregating stats across all exercises not explicitly covered
- Recommendation: Clarify if dashboard is in scope or just per-exercise completion summary

---

## Ambiguity Deep-Dives

### A1: Word-Level Accuracy Algorithm (Levenshtein Distance)

**Current Spec (FR-007)**:
> "System MUST calculate accuracy percentage for each sentence (0-100%) using word-level comparison with fuzzy matching (Levenshtein distance ≤ 2 characters per word considered acceptable)"

**Questions**:
1. Is the algorithm **word-level** (split by spaces) or **character-level** (Levenshtein on whole string)?
2. How does "missing words" scenario work? Example:
   - Correct: "Hello everyone"
   - User input: "Hello"
   - Levenshtein on "Hello everyone" vs "Hello" = very large distance → RED feedback?
   - Or do we split words and calculate per-word, then if a word is missing entirely → treat as RED word?
3. Example scenarios needed:
   - **Exact match**: "Hello everyone" vs "Hello everyone" → Accuracy = 100% ✅
   - **Typo within threshold**: "Hello everyone" vs "Helo everyone" → Accuracy = 50% (1 correct, 1 acceptable) ✅
   - **Typo exceeding threshold**: "Hello everyone" vs "Hallo everywun" → Accuracy = 0% ✅
   - **Missing word**: "Hello everyone" vs "Hello" → Accuracy = ? (1 correct, 1 missing/wrong)
   - **Extra word**: "Hello everyone" vs "Hello everyone today" → Accuracy = ?

**Impact**: Core learning feedback accuracy; affects tasks T033-T034 and T041

**Recommendation**: 
1. Add example test cases to spec.md showing accuracy for each scenario
2. Specify in FR-007 or new sub-requirement:
   - "Words are tokenized by whitespace and punctuation is normalized"
   - "Missing words are counted as incorrect (red)"
   - "Extra words are counted as incorrect (red)"
   - "Accuracy = (correct_words + acceptable_words) / total_correct_words * 100"
3. Add these examples to quickstart.md validation scenarios

---

### A3: Read-Only Constraint Boundary (FR-016)

**Current Spec (FR-016)**:
> "System MUST enforce subtitle editing permission: users can only modify subtitle configurations for sentences AFTER their current progress position"

**Ambiguity**:
- Word "AFTER" is ambiguous: does it mean `>` (strictly greater) or `>=` (greater or equal)?

**Example**:
- Exercise has 10 sentences (indices 0-9)
- User has completed sentence 0-4, currently on sentence 5
- UserExerciseProgress.currentSentenceIndex = 5
- Question: Can user modify sentence 5?

**Option A (Inclusive: >=)**:
- User can modify sentences 5-9 (everything from current onward)
- Allows user to preview/customize next sentence before playing it
- Rationale: User hasn't completed sentence 5 yet

**Option B (Exclusive: >)**:
- User can only modify sentences 6-9
- Sentence 5 is "in progress" so locked
- Rationale: Sentence 5 is currently being played/answered

**Data Model**: UserSubtitleConfig.skippedSentences cannot include indices < currentSentenceIndex (line 515)
- This suggests **Option B** is implemented (boundary is exclusive)
- But code review needed to verify

**Impact**: 
- Task T045 (PUT /api/subtitles/config endpoint) validation logic
- Task T048 (MergeGroupEditor) UI boundary display
- User experience of which sentences appear editable

**Recommendation**:
1. Explicitly clarify in FR-016: "users can modify sentences at index >= currentSentenceIndex" (inclusive) OR "> currentSentenceIndex" (exclusive)
2. Add example to data-model.md L515 showing both boundary cases
3. Add validation test case to T062 (subtitle config integration tests)

---

## Missing or Deferred Features (Intentional)

### Premium Features [FUTURE v2.0]
- **FR-020-022**: Copy admin subtitle configuration
- **US7**: Complete user story deferred
- **Tasks T081-T083**: Explicitly marked [FUTURE]
- **Status**: Approved for v2.0; not blocking MVP

### Admin Features (Needs Clarification)
- **FR-012**: Admin exercise management
- **Status**: ⚠️ Unclear if in-app or external only

### Non-Buildable Operational Metrics
- **SC-005**: 99% uptime
- **Status**: Not a feature requirement; operational/SLA

---

## Next Actions & Remediation Plan

### 🔴 Critical (Blocking Implementation) - Must Resolve Before Phase 0

**1. Clarify Word-Level Accuracy Algorithm (A1)**
- **Owner**: Product Lead
- **Timeline**: Next meeting
- **Deliverable**: Updated FR-007 with specific example test cases
- **Blocked Tasks**: T033, T034, T047 (cannot implement accurately until clarified)

**2. Clarify Read-Only Constraint Boundary (A3)**
- **Owner**: Product Lead + Backend Lead
- **Timeline**: Next meeting
- **Deliverable**: Explicit >= or > definition in FR-016 with implementation examples
- **Blocked Tasks**: T045 (validation logic requires clarity)

**3. Clarify Admin Exercise Management Scope (A7)**
- **Owner**: Product Lead
- **Timeline**: Next meeting
- **Deliverable**: Decision: in-app admin UI or external DB management only
- **Impact**: May add 5-10 tasks if admin endpoints needed

**4. Clarify Invitation Code Generation (A8)**
- **Owner**: Product Lead
- **Timeline**: Next meeting
- **Deliverable**: Decision: API endpoint or external tool
- **Impact**: May add 2-3 tasks if admin endpoint needed

### 🟠 High Priority (Complete Before Phase 1) - Recommended Clarifications

**5. Standardize User Story 5 Task Labels (A2)**
- **Owner**: Backend/Frontend Lead
- **Timeline**: Today (5 min task)
- **Action**: Add [US5] tag to T051, T052, T053 in tasks.md
- **Blocked Tasks**: None (just tracking clarity)

**6. Unify Terminology: "Sentence" vs "Subtitle" (A6)**
- **Owner**: Tech Lead
- **Timeline**: Before Phase 1
- **Decision**: Rename data-model.md "Subtitle" entity to "Sentence" for clarity
- **Impact**: Affects data-model.md, all API contracts, quickstart.md
- **Recommendation**: Use "Sentence" (more semantic; users "record sentences", not "record subtitles")

**7. Add Performance Test Assertions (A5)**
- **Owner**: QA Lead
- **Timeline**: Before Phase 5
- **Action**: Add T067a performance regression test for SC-002/SC-003/SC-004
- **Deliverable**: Test script verifying <2s playback load, <500ms pause timing, <1s accuracy display

### 🟡 Medium Priority (Before MVP Release) - Recommended Enhancements

**8. Clarify Progress Dashboard Scope (A4)**
- **Owner**: Product/UX Lead
- **Timeline**: Before Phase 4
- **Decision**: Is cross-exercise dashboard in scope for MVP, or just per-exercise completion summary?
- **Impact**: May add UI task (T054a) if dashboard wanted

**9. Reclassify Non-Buildable Metric (A9)**
- **Owner**: Tech Lead
- **Timeline**: Before documentation finalization
- **Action**: Move SC-005 (99% uptime) to Operations/SLA section; clarify it's post-launch monitoring, not feature requirement
- **Impact**: Documentation only; no code impact

---

## Test Coverage Assessment

### Covered Adequately ✅
- Authentication flows (T055, T059)
- Subtitle parsing for all formats (T056)
- Accuracy calculation algorithm (T055, T047)
- Exercise browsing and hierarchy (T060)
- Progress persistence (T061)
- Subtitle configuration and read-only constraint (T062)
- E2E user journeys (T064-T066)

### Requires Enhancement ⚠️
- Performance latency metrics (SC-002, SC-003, SC-004) - add T067a performance regression test
- Admin workflow (if needed) - no test coverage if admin endpoints added
- Accessibility (WCAG 2.1 AA) - T068 planned but should formalize requirements

### Deferred to v2.0 [FUTURE]
- Premium copy admin settings (T081-T083)
- Advanced analytics/reporting

---

## Metrics Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Total User Stories** | 7 (6 MVP + 1 Future) | ✅ Complete |
| **Total Functional Requirements** | 22 (19 MVP + 3 Future) | ✅ Complete |
| **Total Success Criteria** | 8 (7 Buildable + 1 Operational) | ✅ Complete |
| **Total Implementation Tasks** | 82 MVP | ✅ Complete |
| **API Endpoints Defined** | 14 | ✅ Complete |
| **Data Entities Modeled** | 9 | ✅ Complete |
| **Requirement-to-Task Coverage** | 95% | ⚠️ 4 items need clarification |
| **Constitutional Compliance** | 5/5 Principles | ✅ 100% |
| **Ambiguity Issues** | 3 | 🔴 HIGH - Require Clarification |
| **Coverage Gaps** | 2 (Admin mgmt, Code generation) | 🟠 MEDIUM - Need Scope Decision |
| **Critical Blockers** | 0 (Design is sound; needs clarification only) | ✅ None |

---

## Recommendations for Implementation Kickoff

### Before Phase 0 Begins (Estimated 1-2 days of clarification work)

1. ✅ **Schedule 1-hour clarification meeting** with Product Lead, Backend Lead, QA Lead
   - Agenda: Resolve A1, A3, A7, A8 (ambiguities and scope)
   - Deliverable: Updated spec section with examples

2. ✅ **Update spec.md** with clarifications from meeting
   - Add examples to FR-007 for accuracy calculation
   - Clarify FR-016 read-only boundary
   - Document admin exercise management approach
   - Document invitation code generation approach

3. ✅ **Update tasks.md**
   - Add [US5] tags to T051, T052, T053 for consistency
   - If admin endpoints needed, add admin CRUD tasks
   - If admin code generation endpoint needed, add tasks

4. ✅ **Finalize architecture decision**
   - Rename Subtitle → Sentence in data-model.md (recommended)
   - Update all references in contracts/ and quickstart.md
   - Verify terminology consistency across all docs

5. ✅ **Validate Phase 0 setup**
   - Review T001-T010 for completeness
   - Verify all dependencies listed
   - Confirm database migration script structure

### Readiness Gate Checklist ✅

Before Phase 0 begins, verify:
- [ ] All 4 clarification items (A1, A3, A7, A8) resolved and documented
- [ ] No HIGH severity issues remain open
- [ ] Task labels standardized (A2 fixed)
- [ ] Constitutional compliance verified (5/5 principles pass)
- [ ] Phase 0 tasks are executable (T001-T010)
- [ ] Team roles assigned (Backend, Frontend, QA, DevOps leads)

---

## Conclusion

**Overall Assessment**: ✅ **READY FOR PHASE 0 WITH RECOMMENDED CLARIFICATIONS**

The specification and implementation plan are **comprehensive, well-structured, and technically sound**. All constitutional principles are satisfied. The identified issues are **clarification-level** (not design failures) and can be resolved in 1-2 days before Phase 0 begins.

**Estimated Timeline**: 
- Clarifications: 1-2 days
- Phase 0: 2-3 days
- Phases 1-6: 5-6 weeks
- **Total to MVP**: ~5.5-6 weeks

**Risk Assessment**: 🟢 **LOW RISK**
- No blocking architectural issues
- All constitutional requirements met
- Clear task dependencies
- Good separation of concerns
- Comprehensive test strategy planned

---

**Analysis Completed**: 2026-09-09  
**Analyst**: GitHub Copilot (speckit.analyze mode)  
**Next Review**: After clarifications integrated (estimated 2026-09-10)

