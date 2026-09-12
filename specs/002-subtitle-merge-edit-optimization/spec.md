# Feature Specification: Subtitle Merge & Edit Optimization

**Feature Branch**: `002-subtitle-merge-edit-optimization`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "我要优化一下自定义字幕的功能，现在的交互很不友好，还缺少功能。第一，字幕合并这里，字幕的序号不知道为什么是从2开始。第二，每句字幕的显示都有 \\N 这个符号。第三，我希望现在的 Subtitle Management 显示的是合并之后的样子，比如我把第3，4，5句合并成一句，那只需要显示一句就可以，现在是依然显示三句。第四，合并后的字幕需要可以编辑，在听写的那里显示原文需要显示编辑后的内容。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correct Subtitle Numbering in Merge Interface (Priority: P1)

When a user opens the subtitle management interface to merge or edit subtitles, the subtitle list must display sequence numbers starting from 1. Currently, numbering appears to start from 2, which causes confusion when users try to identify which sentences to merge or skip.

**Why this priority**: Incorrect numbering is a fundamental usability bug that misleads users during every subtitle customization session. It directly affects the reliability of merge/skip actions.

**Independent Test**: Can be fully tested by opening the subtitle editor for any exercise and verifying that the first visible subtitle line is labeled "1" rather than "2".

**Acceptance Scenarios**:

1. **Given** an exercise with parsed subtitles, **When** the user opens the subtitle management screen, **Then** the first subtitle line is shown with sequence number 1
2. **Given** the user scrolls through the subtitle list, **When** they review sequence numbers, **Then** each subsequent line increments by exactly 1 with no gaps or duplicates
3. **Given** the user has merged or skipped lines, **When** the subtitle list refreshes, **Then** displayed sequence numbers remain continuous and start from 1

---

### User Story 2 - Clean Subtitle Text Without Formatting Artifacts (Priority: P1)

When subtitles are parsed from source files (especially SSA/ASS), line-break markers such as `\N` must not be visible to users in the subtitle management interface or during dictation. The system must normalize subtitle text so learners see clean, readable sentences.

**Why this priority**: Visible formatting artifacts break readability and make the app look unprofessional. This is a basic content quality issue affecting every exercise that contains such markers.

**Independent Test**: Can be fully tested by uploading a subtitle file containing `\N` markers, opening the subtitle editor, and confirming the markers are replaced with normal whitespace or removed.

**Acceptance Scenarios**:

1. **Given** a subtitle file contains lines with `\N` markers, **When** the system parses and displays the subtitles, **Then** the user sees the text without any `\N` characters
2. **Given** a subtitle originally reads "Line one\\NLine two", **When** displayed in the subtitle management list, **Then** it appears as a single continuous sentence or with a normal space between words
3. **Given** the user starts dictation practice, **When** the original subtitle is shown as the correct answer, **Then** no `\N` marker is visible in the answer text

---

### User Story 3 - Subtitle Management Reflects Merged Lines as Single Units (Priority: P1)

When the user merges multiple adjacent subtitle lines (for example, lines 3, 4, and 5) into one logical sentence, the Subtitle Management list must display that merged group as a single row. The user should not still see three separate rows after performing the merge.

**Why this priority**: This is the core expectation of the merge feature. If merged lines continue to appear separately, users cannot verify that their merge action worked and cannot manage the group as a unit.

**Independent Test**: Can be fully tested by selecting three adjacent subtitles, pressing Merge, and confirming the subtitle list collapses to one row representing the merged group.

**Acceptance Scenarios**:

1. **Given** the user selects subtitles 3, 4, and 5 in the subtitle management list, **When** they press "Merge", **Then** the list refreshes and shows only one combined row for the merged group
2. **Given** a merged group exists, **When** the user views the Subtitle Management screen, **Then** the merged group appears as a single entry with a visible "Unmerge" or "Split" option
3. **Given** the user hovers or focuses the merged group row, **When** the row displays details, **Then** the user can see the combined time range and the number of original lines included
4. **Given** the user chooses to unmerge a merged group, **When** they confirm the split action, **Then** the list restores the original separate subtitle rows

---

### User Story 4 - Edit Merged Subtitle Text and Use It During Dictation (Priority: P1)

After merging subtitles, the user must be able to edit the text of the merged sentence. When the user later practices dictation, the "original subtitle" shown as the correct answer must be the edited merged text, not the raw concatenation of the original lines.

**Why this priority**: Users merge lines precisely because the original segmentation is awkward or truncated. Allowing them to refine the merged text ensures the correct answer is natural and matches what they actually hear, which directly improves dictation accuracy and learning quality.

**Independent Test**: Can be fully tested by merging lines, editing the merged text, saving, starting dictation for that exercise, and verifying the answer key uses the edited text.

**Acceptance Scenarios**:

1. **Given** the user has merged multiple subtitle lines, **When** they click into the merged row, **Then** an inline or modal text editor appears with the current merged text
2. **Given** the user edits the merged subtitle text, **When** they save the change, **Then** the new text is persisted and reflected in the Subtitle Management list
3. **Given** the user starts dictation practice for the exercise, **When** the merged sentence is played, **Then** the original subtitle shown as the correct answer displays the edited merged text
4. **Given** the edited merged text is used as the answer key, **When** the system calculates accuracy, **Then** accuracy is based on the edited text, not the pre-edit concatenation
5. **Given** the user unmerges a group that had edited text, **When** the group is split, **Then** the system restores the original line texts and discards the merged group edits

---

### Edge Cases

- What happens if a subtitle file contains `\N` markers mixed with other whitespace characters?
- How does the system handle merging lines where the resulting text exceeds a reasonable display length?
- What happens if the user tries to merge a line that is already part of a merged group with another line?
- How does the system preserve edits when the user first edits, then unmerges, then remerges the same lines? (Unmerge discards edits; remerging uses default joined text)
- What occurs if the user edits a merged group after they have already practiced part of the exercise? (Previous attempts remain unchanged; future attempts use the edited text)
- How does the system handle edits when the user has progress locked for some sentences (read-only constraint)? (Locked merged groups and locked single lines cannot be edited)
- What happens if the merged group contains only whitespace after cleaning `\N` markers?
- How does numbering behave when the first few subtitles are skipped by the user?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display subtitle sequence numbers starting from 1 in the Subtitle Management interface, with each subsequent line incremented by exactly 1
- **FR-002**: System MUST normalize subtitle text by replacing visible `\N` line-break markers with a single space and trimming leading/trailing whitespace so they are never shown to users
- **FR-003**: System MUST preserve the original timing boundaries when normalizing text (start time of the first line and end time of the last line remain unchanged)
- **FR-004**: When the user merges multiple adjacent subtitle lines, the Subtitle Management list MUST display the merged result as a single row; the default merged text MUST be the original line texts joined by a single space
- **FR-005**: A merged subtitle row MUST provide a way to unmerge (split) the group back into its original separate lines
- **FR-006**: The user MUST be able to edit the text of a merged subtitle row; individual unmerged subtitle lines MUST remain read-only
- **FR-007**: Edited merged subtitle text MUST be persisted as part of the user's subtitle configuration for that exercise
- **FR-008**: During future dictation practice sessions, the system MUST use the edited merged text as the correct answer key for that sentence
- **FR-009**: Accuracy calculation for a merged sentence in future practice sessions MUST compare the user's input against the edited merged text; previously recorded attempts remain unchanged
- **FR-010**: Existing read-only constraints MUST continue to apply: users can only merge, unmerge, skip, or edit sentences that are not before their current progress position
- **FR-011**: Subtitle numbering displayed to the user MUST remain continuous and start from 1 regardless of merged, skipped, or edited states
- **FR-012**: When a merged group is unmerged, the system MUST restore the original subtitle texts and discard any edits made to the merged group text

### Key Entities *(include if feature involves data)*

- **Subtitle**: Represents an original parsed subtitle line with identifier, exercise reference, text content, start time, end time, and display order
- **MergedSubtitleGroup**: Represents a user-defined combination of adjacent original subtitles treated as one logical sentence, including combined time range, editable display text, references to original subtitle identifiers, and display order
- **UserSubtitleConfig**: Represents user-specific subtitle customization for an exercise, including merge groups, skipped subtitle identifiers, edited merged texts, and last modified timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of subtitle lines in the Subtitle Management interface show sequence numbers starting at 1 with no gaps or duplicates
- **SC-002**: 100% of subtitle text displayed to users is free of `\N` and other visible formatting artifacts
- **SC-003**: After a merge action, the Subtitle Management list shows exactly one row for each merged group instead of the original separate rows
- **SC-004**: Users can edit merged subtitle text and see the edited version used as the correct answer during dictation within 1 second of submission
- **SC-005**: Dictation accuracy for merged sentences matches the user's input against the edited merged text in 100% of cases
- **SC-006**: Users can complete a full subtitle customization workflow (merge, edit, save, verify in practice) in under 3 minutes

## Clarifications

### Session 2026-09-11

- **Q1**: Can users edit unmerged single-line subtitle text, or only merged groups? → **A**: Only merged subtitle groups are editable; individual unmerged lines remain read-only.
- **Q2**: How should merged subtitle text be generated by default? → **A**: Join the original line texts with a single space.
- **Q3**: What happens to edited text when a merged group is unmerged? → **A**: Discard the edits and restore each original line's original text.
- **Q4**: How should `\N` line-break markers be cleaned? → **A**: Replace each `\N` with a single space and trim leading/trailing whitespace.
- **Q5**: Should editing a merged subtitle retroactively change existing practice history? → **A**: No; existing attempts remain unchanged, and only future practice sessions use the edited text.

## Assumptions

- Subtitle files are already parsed and stored with correct timing information before reaching the Subtitle Management interface
- The existing read-only progress constraint (sentences before current progress are locked) remains in effect for this feature
- Users are comfortable with inline or modal text editing for merged subtitle rows
- The system currently stores merge groups as references to original subtitle identifiers; editable merged text can be added to this structure
- Changes to merged subtitle text are considered part of the user's personal configuration and do not affect other users or admin defaults
- Cleaning `\N` markers means replacing each `\N` with a single space and trimming leading/trailing whitespace
- Subtitle numbering is a presentation-layer concern and does not require changing stored subtitle identifiers
- Mobile and desktop users will have equivalent access to merge, unmerge, and edit actions
- Existing practice history is not retroactively changed when a user edits a merged subtitle; only future attempts use the new text
