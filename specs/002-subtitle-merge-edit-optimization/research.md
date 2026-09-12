# Research: Subtitle Merge & Edit Optimization

**Feature**: Subtitle Merge & Edit Optimization  
**Created**: 2026-09-12  
**Purpose**: Resolve unknowns and document best-practice decisions before Phase 1 design.

---

## Research Topics

### 1. Why do subtitle numbers start from 2 in the current interface?

**Findings from codebase inspection**:
- [app/api/practice/[exerciseId]/route.ts](app/api/practice/[exerciseId]/route.ts) reassigns `index: result.length + 1` after merging and filtering.
- The client component [SubtitleList.tsx](app/components/subtitle-editor/SubtitleList.tsx) renders `Sentence {subtitle.index + 1}`.
- The combination of server-side re-indexing (`index` already 1-based) plus client-side `+ 1` causes the first visible row to display as "2".

**Decision**: Server should return merged/skipped subtitles with `index` as the **0-based logical position** (matching original subtitle index semantics), and the client should render `index + 1` for display. Alternatively, normalize the API contract so `index` always means "0-based logical sentence index" across endpoints. This is a **presentation-layer bug**, not a data bug.

---

### 2. Where do `\N` line-break markers come from, and how should they be cleaned?

**Findings**:
- SSA/ASS subtitles frequently use `\N` as an explicit line-break override inside `Dialogue:` text.
- Current parser in [lib/parsers/ssa-ass.ts](lib/parsers/ssa-ass.ts) removes style tags (`{\...}`) but does not normalize `\N`.
- SRT and VTT parsers split multi-line cues by joining text lines with `\n` (JavaScript newline), not `\N` (literal backslash-N).

**Decision**: Add a shared `normalizeSubtitleText()` utility in `lib/subtitle-parser.ts` that:
1. Replaces literal `\N` with a single space.
2. Collapses multiple whitespace characters to a single space.
3. Trims leading/trailing whitespace.
4. Is applied in all format parsers before returning `ParsedSubtitle`.

This satisfies FR-002/FR-003 without changing timing or storage.

---

### 3. How should merged groups be represented in the Subtitle Management list?

**Findings**:
- Current `MergeGroupEditor` stores groups separately from the `SubtitleList`; the list still renders every original subtitle row.
- [app/api/practice/[exerciseId]/route.ts](app/api/practice/[exerciseId]/route.ts) applies groups server-side for practice, but the editor page calls `/api/practice/[exerciseId]` to get raw subtitles and then shows them without applying the user's own merge configuration.

**Decision**: Build a shared `applySubtitleConfig(rawSubtitles, config)` function (server and client) that transforms the raw subtitle list into the **effective** list seen by the user. The Subtitle Management list must render the effective list, so merged lines collapse to a single row. Unmerge restores original rows. This function will also be reused by the practice endpoint.

---

### 4. Where should edited merged text be stored?

**Findings**:
- Current `UserSubtitleConfig.mergedGroups` JSON stores `{ startIndex, endIndex, label }`.
- `label` is currently only a display label, not used as the answer key.
- To support editable merged text, extend each merge group to include an optional `customText?: string` field.

**Decision**: Update `MergeGroup` type to:
```ts
export interface MergeGroup {
  startIndex: number;
  endIndex: number;
  label?: string;
  customText?: string;
}
```
When `customText` is present, the effective merged subtitle uses it instead of joining original texts. The database schema does not need migration because `mergedGroups` is a JSON column; older records without `customText` will default to joined text. Validation schema must be updated to allow optional `customText`.

---

### 5. How does the practice/check accuracy endpoint need to change?

**Findings**:
- [app/api/practice/[exerciseId]/check/route.ts](app/api/practice/[exerciseId]/check/route.ts) currently re-parses the raw subtitle file and uses `subtitles[sentenceIndex].text`.
- The client sends `sentenceIndex` and `correctText` from the already-processed practice data.
- Because the client uses the effective subtitles returned by `/api/practice/[exerciseId]`, `correctText` already reflects merged/edited text if the practice endpoint applies config correctly. The check endpoint should trust the `correctText` provided by the client (after validation) instead of re-parsing from file, or it should re-apply config consistently.

**Decision**: Refactor check endpoint to load the user's `UserSubtitleConfig`, build the effective subtitle list using the shared `applySubtitleConfig`, and use the effective `sentenceIndex` to get the correct text. This avoids drift between client and server. Alternatively, keep trusting `correctText` from client but add server-side verification that it matches the effective list. The safer approach is server-side re-computation.

---

## Decisions Summary

| Topic | Decision |
|-------|----------|
| Numbering bug | Normalize `index` to mean 0-based logical position; client displays `index + 1` |
| `\N` cleanup | Add `normalizeSubtitleText()` utility; replace `\N` with space, collapse whitespace, trim |
| Merged display | Build shared `applySubtitleConfig()` used by editor and practice |
| Editable merged text | Add optional `customText` to `MergeGroup`; no DB migration needed |
| Answer key source | Practice/check endpoints apply config server-side to compute effective subtitles |

## Alternatives Considered

- **Client-side-only merge rendering**: Rejected because it duplicates logic and the check endpoint must also know the effective text.
- **Database migration for custom text**: Rejected because JSON column can be extended backward-compatibly; migration adds risk for v1.
- **Trust client `correctText` in check endpoint**: Rejected because server-side recomputation is more robust against tampering and drift.

## Risks

- Changing the meaning of `ParsedSubtitle.index` from 1-based to 0-based across endpoints could break existing components if not done consistently. All consumers (`SubtitleList`, `VideoPlayer`, `PracticePage`) must be updated together.
- Existing user configs with old `label` field remain compatible; `customText` absence means fallback to joined text.
