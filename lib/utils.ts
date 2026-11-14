export { cn } from "cn"
import { ParsedSubtitle, MergeGroup, EffectiveSubtitle, SubtitleTimeAdjustment } from './types';

export interface SubtitleConfigInput {
  mergedGroups: MergeGroup[];
  skippedSentences: number[];
}

/** Video URLs stored as full http(s) links point to an externally hosted stream (e.g. TED HLS), not to a COS object key. */
export function isExternalVideoUrl(videoUrl: string): boolean {
  return /^https?:\/\//i.test(videoUrl.trim());
}

export function isHlsVideoUrl(videoUrl: string): boolean {
  return /\.m3u8($|\?)/i.test(videoUrl);
}

/** Format seconds as HH:MM:SS.mmm for subtitle timestamp display. */
export function formatSubtitleTimestamp(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = Math.floor(clamped % 60);
  const ms = Math.round((clamped % 1) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  // Carry a 1000ms round-up into the seconds field.
  if (ms === 1000) {
    return formatSubtitleTimestamp(Math.floor(clamped) + 1);
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(ms, 3)}`;
}

/** Parse a HH:MM:SS.mmm (or HH:MM:SS,mmm) timestamp into seconds. Returns null when invalid. */
export function parseSubtitleTimestamp(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const ms = parseInt(match[4].padEnd(3, '0'), 10);
  if (minutes >= 60 || seconds >= 60) return null;
  return hours * 3600 + minutes * 60 + seconds + ms / 1000;
}

/**
 * Apply exercise-global per-sentence timing overrides to freshly parsed
 * subtitles. Adjustments use ORIGINAL indices and never change the number or
 * order of sentences, so they compose freely with merge/skip config.
 */
export function applyTimeAdjustments(
  rawSubtitles: ParsedSubtitle[],
  adjustments: SubtitleTimeAdjustment[] | null | undefined
): ParsedSubtitle[] {
  if (!adjustments || adjustments.length === 0) {
    return rawSubtitles;
  }
  const byIndex = new Map(adjustments.map((a) => [a.index, a]));
  return rawSubtitles.map((sub, originalIndex) => {
    const adjustment = byIndex.get(originalIndex);
    if (!adjustment) return sub;
    const startSeconds = adjustment.startSeconds ?? sub.startSeconds;
    const endSeconds = adjustment.endSeconds ?? sub.endSeconds;
    return {
      ...sub,
      startSeconds,
      endSeconds,
      startTime: formatSubtitleTimestamp(startSeconds),
      endTime: formatSubtitleTimestamp(endSeconds),
    };
  });
}

/**
 * Shift every sentence's start/end by the same offset (whole-video
 * calibration). Mutually exclusive with per-sentence overrides: the caller
 * applies one or the other based on the user's timing mode. Negative offsets
 * are clamped at 0 for the leading sentences.
 */
export function applyGlobalTimeOffset(
  rawSubtitles: ParsedSubtitle[],
  offsetMs: number
): ParsedSubtitle[] {
  if (!offsetMs) {
    return rawSubtitles;
  }
  const offsetSeconds = offsetMs / 1000;
  return rawSubtitles.map((sub) => {
    const startSeconds = Math.max(0, sub.startSeconds + offsetSeconds);
    const endSeconds = Math.max(0, sub.endSeconds + offsetSeconds);
    return {
      ...sub,
      startSeconds,
      endSeconds,
      startTime: formatSubtitleTimestamp(startSeconds),
      endTime: formatSubtitleTimestamp(endSeconds),
    };
  });
}

/**
 * Linked-boundary timing edit: setting a row's start also pins the previous
 * played row's end to the same time (and symmetrically for end → next row's
 * start), so adjacent sentences never leave a gap or overlap.
 *
 * `rows` must be in playback order with skipped rows omitted; rows are
 * located by their first original index.
 */
export function applyLinkedTimeEdit(
  rows: Array<{ index: number; originalIndices?: number[] }>,
  targetFirstOriginal: number,
  field: 'start' | 'end',
  seconds: number,
  current: SubtitleTimeAdjustment[]
): {
  adjustments: SubtitleTimeAdjustment[];
  /** Display updates for the edited row and the linked neighbor. */
  updates: Array<{ index: number; field: 'start' | 'end'; seconds: number }>;
} {
  const originalsOf = (r: { index: number; originalIndices?: number[] }) =>
    r.originalIndices ?? [r.index];
  const updates: Array<{ index: number; field: 'start' | 'end'; seconds: number }> = [];
  const edits: SubtitleTimeAdjustment[] = [];

  const targetIdx = rows.findIndex((r) => originalsOf(r)[0] === targetFirstOriginal);
  const target = rows[targetIdx];

  if (target) {
    const originals = originalsOf(target);
    updates.push({ index: target.index, field, seconds });
    if (field === 'start') {
      edits.push({ index: originals[0], startSeconds: seconds });
      const prev = rows[targetIdx - 1];
      if (prev) {
        const prevOriginals = originalsOf(prev);
        edits.push({ index: prevOriginals[prevOriginals.length - 1], endSeconds: seconds });
        updates.push({ index: prev.index, field: 'end', seconds });
      }
    } else {
      edits.push({ index: originals[originals.length - 1], endSeconds: seconds });
      const next = rows[targetIdx + 1];
      if (next) {
        edits.push({ index: originalsOf(next)[0], startSeconds: seconds });
        updates.push({ index: next.index, field: 'start', seconds });
      }
    }
  }

  const next = [...current];
  for (const edit of edits) {
    const existingIdx = next.findIndex((a) => a.index === edit.index);
    const updated = {
      ...(existingIdx >= 0 ? next[existingIdx] : { index: edit.index }),
      ...edit,
    };
    if (existingIdx >= 0) {
      next[existingIdx] = updated;
    } else {
      next.push(updated);
    }
  }
  next.sort((a, b) => a.index - b.index);
  return { adjustments: next, updates };
}

/**
 * Clear a row's timing overrides together with the shared boundaries of its
 * played neighbors (previous row's end, next row's start).
 */
export function clearLinkedTimeEdit(
  rows: Array<{ index: number; originalIndices?: number[] }>,
  targetFirstOriginal: number,
  current: SubtitleTimeAdjustment[]
): SubtitleTimeAdjustment[] {
  const originalsOf = (r: { index: number; originalIndices?: number[] }) =>
    r.originalIndices ?? [r.index];
  const targetIdx = rows.findIndex((r) => originalsOf(r)[0] === targetFirstOriginal);
  const target = rows[targetIdx];
  if (!target) return current;

  const targetOriginals = originalsOf(target);
  const toClear = new Set<number>([
    targetOriginals[0],
    targetOriginals[targetOriginals.length - 1],
  ]);
  const prev = rows[targetIdx - 1];
  if (prev) {
    const prevOriginals = originalsOf(prev);
    toClear.add(prevOriginals[prevOriginals.length - 1]);
  }
  const next = rows[targetIdx + 1];
  if (next) toClear.add(originalsOf(next)[0]);

  return current.filter((a) => !toClear.has(a.index));
}

/**
 * Derive the effective subtitle list for a user from raw parsed subtitles
 * and the user's merge/skip configuration.
 *
 * Rules:
 * - Each merge group collapses its original indices into a single effective
 *   subtitle with start = first original start, end = last original end.
 * - If a merge group has customText, that becomes the effective text;
 *   otherwise the original texts are joined with single spaces.
 * - Skipped original indices are marked on the effective row (merged rows
 *   are skipped when ALL their original indices are skipped) and omitted
 *   when omitSkipped is true.
 * - Effective indices are 0-based logical positions in the resulting list.
 */
export function applySubtitleConfig(
  rawSubtitles: ParsedSubtitle[],
  config: Partial<SubtitleConfigInput>,
  options: { omitSkipped?: boolean } = {}
): EffectiveSubtitle[] {
  const mergedGroups = config.mergedGroups ?? [];
  const skippedSet = new Set(config.skippedSentences ?? []);

  // Sort merge groups by startIndex to process in order
  const sortedGroups = [...mergedGroups].sort((a, b) => a.startIndex - b.startIndex);

  // Build a map of original index -> merge group
  const originalToGroup = new Map<number, MergeGroup>();
  const groupStartIndices = new Set<number>();
  for (const group of sortedGroups) {
    groupStartIndices.add(group.startIndex);
    for (let i = group.startIndex; i <= group.endIndex; i++) {
      originalToGroup.set(i, group);
    }
  }

  const effective: EffectiveSubtitle[] = [];
  const seenOriginalIndices = new Set<number>();

  for (let originalIndex = 0; originalIndex < rawSubtitles.length; originalIndex++) {
    // Skip original indices already consumed by a merge group
    if (seenOriginalIndices.has(originalIndex)) {
      continue;
    }

    const group = originalToGroup.get(originalIndex);

    if (group && originalIndex === group.startIndex) {
      // This is the start of a merge group: consume all indices in the group
      const groupSubs: ParsedSubtitle[] = [];
      for (let i = group.startIndex; i <= group.endIndex; i++) {
        const sub = rawSubtitles[i];
        if (sub) {
          groupSubs.push(sub);
        }
        seenOriginalIndices.add(i);
      }

      if (groupSubs.length === 0) {
        continue;
      }

      const first = groupSubs[0];
      const last = groupSubs[groupSubs.length - 1];
      const joinedText = groupSubs.map((s) => s.text).join(' ');
      const text = group.customText?.trim() ? group.customText.trim() : joinedText;
      const allSkipped = groupSubs.every((_, idx) =>
        skippedSet.has(group.startIndex + idx)
      );

      const row: EffectiveSubtitle = {
        index: effective.length,
        text,
        startSeconds: first.startSeconds,
        endSeconds: last.endSeconds,
        startTime: first.startTime,
        endTime: last.endTime,
        originalIndices: groupSubs.map((_, idx) => group.startIndex + idx),
        isMerged: true,
        isSkipped: allSkipped,
      };

      if (!allSkipped || !options.omitSkipped) {
        effective.push(row);
      }
    } else {
      // Single original subtitle
      const sub = rawSubtitles[originalIndex];
      if (!sub) {
        continue;
      }
      seenOriginalIndices.add(originalIndex);

      const isSkipped = skippedSet.has(originalIndex);
      const row: EffectiveSubtitle = {
        index: effective.length,
        text: sub.text,
        startSeconds: sub.startSeconds,
        endSeconds: sub.endSeconds,
        startTime: sub.startTime,
        endTime: sub.endTime,
        originalIndices: [originalIndex],
        isMerged: false,
        isSkipped,
      };

      if (!isSkipped || !options.omitSkipped) {
        effective.push(row);
      }
    }
  }

  // Final pass to ensure indices are compact 0-based
  return effective.map((sub, idx) => ({ ...sub, index: idx }));
}

/**
 * Apply subtitle configuration and lock state for the editor.
 *
 * `lockedOriginalCount` is a count in ORIGINAL subtitle index space (see
 * getLockedOriginalCount) — not the effective sentence index stored in
 * UserExerciseProgress.currentSentenceIndex.
 */
export function applySubtitleConfigWithLock(
  rawSubtitles: ParsedSubtitle[],
  config: Partial<SubtitleConfigInput>,
  lockedOriginalCount: number
): EffectiveSubtitle[] {
  const effective = applySubtitleConfig(rawSubtitles, config);
  return effective.map((sub) => ({
    ...sub,
    isLocked: sub.originalIndices.every((i) => i < lockedOriginalCount),
  }));
}

/**
 * Translate practice progress into original-subtitle index space.
 *
 * UserExerciseProgress.currentSentenceIndex is an index into the effective
 * subtitle list served during practice — merges applied and skipped sentences
 * omitted. Merge groups and skipped sentences are expressed in original
 * indices, so lock checks must use the count of original subtitles covered by
 * the first `currentProgress` effective sentences instead.
 */
export function getLockedOriginalCount(
  rawSubtitles: ParsedSubtitle[],
  config: Partial<SubtitleConfigInput>,
  currentProgress: number
): number {
  if (currentProgress <= 0) {
    return 0;
  }
  const effective = applySubtitleConfig(rawSubtitles, config, { omitSkipped: true });
  if (currentProgress >= effective.length) {
    return rawSubtitles.length;
  }
  let lockedCount = 0;
  for (let i = 0; i < currentProgress; i++) {
    const lastOriginal = effective[i].originalIndices[effective[i].originalIndices.length - 1];
    if (lastOriginal + 1 > lockedCount) {
      lockedCount = lastOriginal + 1;
    }
  }
  return lockedCount;
}

/**
 * Build a set of original subtitle indices that are part of any merge group.
 */
export function getMergedOriginalIndices(mergedGroups: MergeGroup[]): Set<number> {
  const set = new Set<number>();
  for (const group of mergedGroups) {
    for (let i = group.startIndex; i <= group.endIndex; i++) {
      set.add(i);
    }
  }
  return set;
}