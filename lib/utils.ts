export { cn } from "cn"
import { ParsedSubtitle, MergeGroup, EffectiveSubtitle } from './types';

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