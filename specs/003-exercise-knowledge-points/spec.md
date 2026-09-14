# Feature Specification: Exercise Knowledge Points

**Feature Branch**: `003-exercise-knowledge-points`

**Created**: 2026-09-13

**Status**: Draft

**Input**: User description: "我要加一个维护知识点的功能。每个用户可以在做 exercise 的时候，对当前的 exercise 增加学习到的知识点。知识点有 单词、短语、句子 这三个分类，而知识点是从 practice 页面中 feedback 区域的 Correct Text 中选取的。当 Correct Text 显示后，我可以从 Correct Text 中选中知识点，然后右键，新建知识点，然后选择知识点分类（知识点分类要用不同的颜色来区分），填写知识点笔记（description）。添加完成后， Correct Text 要回显对应的颜色来表示哪些词或短语已经被添加为了知识点。然后在 dashboard 页也显示每个 exercise 有几个知识点，点知识点的图标就能进入这个 exercise 的知识点列表页进行查看。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Knowledge Point from Practice Feedback (Priority: P1)

During dictation practice, after checking an answer, the learner reviews the Correct Text shown in the feedback area. The learner selects a word, phrase, or the full sentence that they want to remember; a floating action menu appears near the selection. The learner opens the create action, chooses a category, adds a personal note, and saves it as a knowledge point for that exercise.

**Why this priority**: Creating knowledge points directly from the feedback area is the core value of this feature. Without it, learners cannot capture learning material while practicing.

**Independent Test**: Can be fully tested by completing a dictation sentence, selecting text in Correct Text, creating a knowledge point with category and note, and verifying it is saved.

**Acceptance Scenarios**:

1. **Given** a learner has submitted a dictation answer and the feedback area shows Correct Text, **When** the learner selects a contiguous portion of text, **Then** a floating action menu appears near the selection and offers an action to create a knowledge point
2. **Given** the learner has selected text and opened the create action from the floating menu, **When** they choose a category (word, phrase, or sentence) and enter a description, **Then** the knowledge point is saved and linked to the current exercise and user
3. **Given** the learner uses a touch device without a traditional context menu, **When** they select text, **Then** the same floating action menu appears and the create action remains available
4. **Given** the learner saves a knowledge point, **When** the feedback area remains visible, **Then** the selected text is highlighted with the color associated with the chosen category
5. **Given** the learner returns to the same exercise later, **When** the same Correct Text is shown, **Then** previously saved knowledge points remain highlighted with their category colors
6. **Given** the learner attempts to save a knowledge point with an empty description, **When** they submit, **Then** the system prevents saving and prompts for a description
7. **Given** the learner selects text on a desktop browser, **When** they complete the selection, **Then** the floating action menu appears without requiring a right-click

---

### User Story 2 - Dashboard Shows Knowledge Point Count and Navigation (Priority: P1)

Learners see at a glance how many knowledge points they have created for each exercise directly from the dashboard. They can click a knowledge point indicator to open the full list of knowledge points for that exercise.

**Why this priority**: Visibility on the dashboard motivates continued learning and provides quick access to review saved material. It is the primary entry point to the knowledge point list page.

**Independent Test**: Can be fully tested by adding knowledge points to an exercise, visiting the dashboard, and verifying the count and navigation work.

**Acceptance Scenarios**:

1. **Given** a learner has created knowledge points for an exercise, **When** they view the dashboard, **Then** that exercise card shows the total count of knowledge points
2. **Given** a learner has not created any knowledge points for an exercise, **When** they view the dashboard, **Then** the exercise card shows a zero or empty state for knowledge points
3. **Given** a learner sees the knowledge point count on an exercise card, **When** they click the knowledge point indicator, **Then** they are taken to the knowledge point list page for that exercise
4. **Given** the learner opens the knowledge point list page from the dashboard, **When** the page loads, **Then** it shows only the knowledge points created by the current user for that exercise

---

### User Story 3 - Manage Knowledge Points in List Page (Priority: P2)

From the knowledge point list page, learners review all knowledge points they have saved for an exercise. They can edit the description or category, or delete a knowledge point they no longer need.

**Why this priority**: Learners need to maintain their notes over time. Basic update and delete capabilities keep the knowledge base useful and accurate.

**Independent Test**: Can be fully tested by opening the knowledge point list page, editing a knowledge point, and deleting another, then verifying the changes persist.

**Acceptance Scenarios**:

1. **Given** a learner is on the knowledge point list page, **When** the page loads, **Then** they see all knowledge points for that exercise grouped or labeled by category
2. **Given** a learner views a knowledge point, **When** they choose to edit it, **Then** they can change the description and category and save the changes
3. **Given** a learner edits a knowledge point, **When** they save, **Then** the updated category color is reflected wherever the knowledge point appears in the Correct Text
4. **Given** a learner chooses to delete a knowledge point, **When** they confirm the deletion, **Then** the knowledge point is removed and the highlight no longer appears in the Correct Text
5. **Given** a learner deletes a knowledge point, **When** they return to the dashboard, **Then** the knowledge point count for that exercise is reduced accordingly

---

### User Story 4 - Visual Highlighting of Saved Knowledge Points in Correct Text (Priority: P2)

When the Correct Text is displayed during practice, any portion of the text that has already been saved as a knowledge point is visually highlighted. Each category uses a distinct color so learners can immediately distinguish words, phrases, and sentences.

**Why this priority**: Visual feedback helps learners recognize material they have already captured, reducing duplicate entries and reinforcing review.

**Independent Test**: Can be fully tested by viewing Correct Text that contains previously saved knowledge points and confirming the expected colors appear.

**Acceptance Scenarios**:

1. **Given** a sentence in Correct Text contains text saved as a word knowledge point, **When** the Correct Text is rendered, **Then** that word appears with the word category color
2. **Given** a sentence in Correct Text contains text saved as a phrase knowledge point, **When** the Correct Text is rendered, **Then** the phrase appears with the phrase category color
3. **Given** a sentence in Correct Text is saved as a sentence knowledge point, **When** the Correct Text is rendered, **Then** the entire sentence appears with the sentence category color
4. **Given** the same text segment belongs to multiple knowledge points, **When** the Correct Text is rendered, **Then** each saved segment is highlighted independently with its own category color; overlapping areas visually combine the colors of the overlapping knowledge points

### Edge Cases

- What happens when the learner selects text that does not belong to the current subtitle sentence? (Resolved by FR-001: system normalizes to whole words within the current sentence only; cross-sentence selections do not trigger create action)
- What happens when the learner attempts to save the exact same text as a knowledge point twice for the same exercise? (Resolved by FR-013: duplicate is ignored and existing description may be shown)
- How does the system handle text selection that starts or ends inside a word? (Resolved by FR-001: selection is normalized to whole word boundaries)
- What happens if a knowledge point text no longer exists in the Correct Text after an admin edits subtitles? (Resolved by FR-007: the knowledge point is preserved in the list page but no longer highlighted in the Correct Text)
- How does the system handle right-click actions on touch devices without a traditional context menu? (Resolved by FR-002: floating action menu on all devices)
- What happens when a learner creates many knowledge points for a single exercise?
- How does the system handle punctuation when matching saved knowledge point text to Correct Text?
- What happens if the learner refreshes the practice page before the knowledge point save completes?

## Clarifications

### Session 2026-09-13

- **Q**: On touch devices without a right-click, how does the learner create a knowledge point? → **A**: All devices show a floating action menu when text is selected; the original right-click requirement is replaced by this menu. The design target is PC-first, with touch support secondary.
- **Q**: What happens when the learner attempts to save the exact same text as a knowledge point twice for the same exercise? → **A**: The duplicate save is ignored; the existing knowledge point is preserved and its description may be surfaced.
- **Q**: How does the system handle text selection that starts or ends inside a word? → **A**: The selection is normalized to the nearest whole word boundaries before the knowledge point is created.
- **Q**: What happens if a knowledge point's captured text no longer exists in the Correct Text after subtitle edits? → **A**: The knowledge point remains in the list page but is no longer highlighted in the Correct Text.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow learners to select text from the Correct Text displayed in the practice feedback area; when the selection starts or ends inside a word, the system MUST normalize the selection to the nearest whole word boundaries within the current subtitle sentence before a knowledge point is created; cross-sentence selections MUST NOT trigger the create action
- **FR-001a**: System MUST capture knowledge point text only from the current subtitle sentence shown in the feedback area
- **FR-002**: System MUST display a floating action menu near any text selection in the Correct Text and provide an action to create a new knowledge point from the selected text
- **FR-003**: System MUST support three knowledge point categories: word, phrase, and sentence
- **FR-004**: Each category MUST have a distinct visual color so learners can distinguish them at a glance
- **FR-005**: System MUST allow learners to enter a description (note) when creating or editing a knowledge point
- **FR-006**: System MUST persist each knowledge point with the creating user, the exercise, the captured text, the selected category, the description, and the source subtitle sentence reference; the captured text MUST be stored after whole-word normalization
- **FR-007**: System MUST highlight all saved knowledge point text segments that exactly match a substring of the current Correct Text using the color associated with their category; if a knowledge point's captured text no longer appears in the Correct Text (for example after subtitle edits), the knowledge point MUST remain available in the list page but MUST NOT be highlighted in the Correct Text
- **FR-008**: Dashboard MUST display the total count of knowledge points created by the current user for each exercise
- **FR-009**: Dashboard MUST provide a way to navigate from an exercise card to the knowledge point list page for that exercise
- **FR-010**: Knowledge point list page MUST display all knowledge points for the selected exercise created by the current user
- **FR-011**: Knowledge point list page MUST allow learners to edit the description and category of an existing knowledge point
- **FR-012**: Knowledge point list page MUST allow learners to delete a knowledge point they created
- **FR-013**: System MUST prevent duplicate knowledge points with identical text within the same exercise for the same user; when the user attempts to save an identical text again, the system MUST ignore the duplicate request and MAY surface the existing description to confirm it is already captured
- **FR-014**: Knowledge points MUST be private to the user who created them; one user cannot see another user's knowledge points
- **FR-015**: System MUST handle overlapping knowledge points by highlighting each saved segment independently; where segments overlap, the visual presentation must clearly indicate the overlap (for example by combining category colors or rendering overlapping boundaries)

### Key Entities *(include if feature involves data)*

- **KnowledgePoint**: Represents a learning note captured by a user with user reference, exercise reference, source subtitle reference, captured text, category (word/phrase/sentence), description, creation timestamp, and last modified timestamp
- **KnowledgePointCategory**: Represents the classification of a knowledge point (word, phrase, sentence) and its associated visual color

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Learners can create a knowledge point from the Correct Text in under 30 seconds
- **SC-002**: 100% of saved knowledge point text segments appear highlighted in the Correct Text during subsequent practice sessions
- **SC-003**: Dashboard accurately reflects the number of knowledge points per exercise for the current user with zero miscounts
- **SC-004**: Learners can open the knowledge point list page for any exercise within 2 clicks from the dashboard
- **SC-005**: 95% of learners successfully create a knowledge point on their first attempt without requiring help
- **SC-006**: Knowledge points created, edited, or deleted by a user are not visible or affected by any other user

## Assumptions

- The primary design target is desktop (PC-first); touch device support is required but secondary
- Knowledge points are private to each learner and are not shared across users
- A knowledge point created from a sentence remains preserved even if the source subtitle text changes; it simply stops being highlighted when the captured text no longer matches the current Correct Text
- The text of a knowledge point is an exact substring of the current subtitle sentence shown in the feedback area, after normalization to whole word boundaries
- Word category refers to a single contiguous word, phrase category refers to multiple contiguous words, and sentence category refers to a full subtitle sentence
- Learners can edit and delete only the knowledge points they created
- Existing practice feedback already displays Correct Text after a dictation answer is checked
- Visual category colors are fixed and consistent across the application
- The dashboard already lists exercises for the logged-in learner
