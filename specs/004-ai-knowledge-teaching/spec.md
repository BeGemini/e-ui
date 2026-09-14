# Feature Specification: AI Knowledge Point Teaching

**Feature Branch**: `[004-ai-knowledge-teaching]`

**Created**: 2026-09-14

**Status**: Ready for Review

**Input**: User description: "我要加一个 AI 功能。就是我现在不是可以新建知识点吗，但是这个知识点呢，对于我来说肯定是新的，陌生的，我需要自己去查。我希望通过 AI 来帮我把这些东西查出来。比如这个词是什么意思，使用场景，例句，其他相同表达。我需要在新建知识点的那个弹窗里，多一个按钮：AI教学。点了按钮之后，开始调用 AI 接口来获取我上面说的这些，然后显示在原有的那个文本框里"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate AI explanation while creating a knowledge point (Priority: P1)

As a learner practicing listening dictation, I often encounter unfamiliar words, phrases, or sentences. When I create a knowledge point from the practice screen, I want the system to automatically look up and explain the captured text for me so I don't have to research it myself.

**Why this priority**: This is the core value of the feature. It removes the manual research step from learning and makes knowledge points immediately useful.

**Independent Test**: Open the create knowledge point dialog, click the AI教学 button, and verify the note field is populated with a structured explanation.

**Acceptance Scenarios**:

1. **Given** the create knowledge point dialog is open with captured text, **When** the user clicks the AI教学 button, **Then** the system requests an explanation from the AI service and displays the result in the note text area.
2. **Given** the AI-generated explanation is displayed, **When** the user reviews and clicks Save, **Then** the knowledge point is saved with the AI-generated content.
3. **Given** the captured text is a word, phrase, or sentence, **When** the AI explanation is returned, **Then** it includes the meaning, common usage scenarios, example sentences, and similar/alternative expressions.

---

### User Story 2 - Keep manual note creation as an option (Priority: P2)

As a learner, I may already know what I want to write, or the AI explanation may not match my needs. I want to create a knowledge point with my own note without using AI.

**Why this priority**: The AI feature must be optional. Forcing AI would slow down users who prefer to write their own notes and would reduce trust in the feature.

**Independent Test**: Create a knowledge point by typing a note manually and saving it without clicking AI教学.

**Acceptance Scenarios**:

1. **Given** the create knowledge point dialog is open, **When** the user types a note manually and clicks Save, **Then** the knowledge point is saved with the manually entered text.
2. **Given** the user has clicked AI教学 and the note field is populated, **When** the user edits the AI-generated content, **Then** the edited version is what gets saved.

---

### User Story 3 - Recover from AI service failures (Priority: P3)

As a learner, I don't want a temporary AI service problem to block me from creating knowledge points. If the AI call fails, I should see a clear message and still be able to enter my own note.

**Why this priority**: Reliability protects the core learning workflow. Without graceful failure handling, users may abandon creating knowledge points entirely when the AI is unavailable.

**Independent Test**: Simulate an AI service failure while clicking AI教学 and verify the user can still complete manual note creation.

**Acceptance Scenarios**:

1. **Given** the AI service is unavailable or returns an error, **When** the user clicks AI教学, **Then** a user-friendly error message is shown and the note field remains editable.
2. **Given** an AI error message is shown, **When** the user clicks AI教学 again after the service recovers, **Then** the system retries and populates the note field on success.

---

### Edge Cases

- What happens when the captured text is empty or only whitespace?
- How does the system handle an AI response that is too long for the note field?
- What happens if the user clicks AI教学 repeatedly while a request is still in flight?
- How does the system behave when the user has already typed a manual note and then clicks AI教学?
- What happens if the source sentence context is missing or incomplete?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display an "AI教学" button inside the create knowledge point dialog.
- **FR-002**: System MUST send the captured text, selected category, and source sentence context to an AI service when the user clicks the AI教学 button.
- **FR-003**: System MUST populate the note text area with AI-generated content that includes: meaning, common usage scenarios, example sentences, and similar/alternative expressions.
- **FR-004**: System MUST allow the user to edit AI-generated content before saving the knowledge point.
- **FR-005**: System MUST show a loading indicator on or near the AI教学 button while the AI content is being fetched.
- **FR-006**: System MUST display a user-friendly error message if the AI service fails, without blocking manual note entry.
- **FR-007**: System MUST disable the AI教学 button while an AI request is in progress.
- **FR-008**: System MUST require the user to click Save before a knowledge point is created; AI-generated content must not be saved automatically.
- **FR-009**: System MUST include the selected knowledge point category in the AI request so the explanation is appropriate for a word, phrase, or sentence.

### Key Entities *(include if feature involves data)*

- **Knowledge Point**: An existing learning note created by a user. Relevant attributes: capturedText, category, description, sourceSentenceIndex.
- **AI Teaching Request**: The information sent to the AI service to generate an explanation, including capturedText, category, and the source sentence in which the text appeared.
- **AI Teaching Explanation**: The structured explanation returned by the AI service, covering meaning, usage scenarios, example sentences, and similar expressions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate and view an AI explanation in the note field within 5 seconds under normal network conditions.
- **SC-002**: At least 95% of AI-generated explanations include all four required sections: meaning, usage scenarios, example sentences, and similar/alternative expressions.
- **SC-003**: Users can edit and save AI-generated notes without encountering errors caused by the AI teaching feature.
- **SC-004**: When the AI service fails, users can still create a knowledge point manually without leaving the dialog.
- **SC-005**: Users report that the AI teaching feature reduces the time needed to create a useful knowledge point compared to manual research.

## Assumptions

- Users have internet connectivity while creating knowledge points.
- The application already has access to an AI service and the necessary credentials.
- AI-generated explanations are presented in a language appropriate for the learner, matching the application interface.
- The AI teaching feature is optional and does not replace manual note creation.
- Users can review, edit, or discard AI-generated content before saving.
- The source sentence from which the captured text was taken is available to enrich the AI prompt.
- The knowledge point category selected by the user is accurate and informs the type of explanation requested.
