import { describe, it, expect } from '@jest/globals';
import { applySubtitleConfig, SubtitleConfigInput } from '@/lib/utils';
import { ParsedSubtitle } from '@/lib/types';

function makeSubtitles(count: number): ParsedSubtitle[] {
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    text: `Sentence ${i + 1}`,
    startSeconds: i * 5,
    endSeconds: i * 5 + 4,
    startTime: `0:00:${String(i * 5).padStart(2, '0')}.00`,
    endTime: `0:00:${String(i * 5 + 4).padStart(2, '0')}.00`,
  }));
}

describe('applySubtitleConfig', () => {
  it('should return original subtitles with metadata when config is empty', () => {
    const raw = makeSubtitles(3);
    const result = applySubtitleConfig(raw, {});

    expect(result).toHaveLength(3);
    expect(result[0].index).toBe(0);
    expect(result[0].text).toBe('Sentence 1');
    expect(result[0].isMerged).toBe(false);
    expect(result[0].originalIndices).toEqual([0]);
  });

  it('should merge adjacent subtitles into a single effective row', () => {
    const raw = makeSubtitles(5);
    const config: SubtitleConfigInput = {
      mergedGroups: [{ startIndex: 2, endIndex: 4 }],
      skippedSentences: [],
    };

    const result = applySubtitleConfig(raw, config);

    expect(result).toHaveLength(3);
    expect(result[0].text).toBe('Sentence 1');
    expect(result[1].text).toBe('Sentence 2');
    expect(result[2].text).toBe('Sentence 3 Sentence 4 Sentence 5');
    expect(result[2].isMerged).toBe(true);
    expect(result[2].originalIndices).toEqual([2, 3, 4]);
    expect(result[2].startSeconds).toBe(10);
    expect(result[2].endSeconds).toBe(24);
  });

  it('should use customText for merged group when provided', () => {
    const raw = makeSubtitles(5);
    const config: SubtitleConfigInput = {
      mergedGroups: [{ startIndex: 2, endIndex: 4, customText: 'Custom merged text' }],
      skippedSentences: [],
    };

    const result = applySubtitleConfig(raw, config);

    expect(result[2].text).toBe('Custom merged text');
    expect(result[2].isMerged).toBe(true);
  });

  it('should omit skipped sentences when omitSkipped is true', () => {
    const raw = makeSubtitles(5);
    const config: SubtitleConfigInput = {
      mergedGroups: [],
      skippedSentences: [1, 3],
    };

    const result = applySubtitleConfig(raw, config, { omitSkipped: true });

    expect(result).toHaveLength(3);
    expect(result.map((s) => s.text)).toEqual(['Sentence 1', 'Sentence 3', 'Sentence 5']);
    expect(result[0].index).toBe(0);
    expect(result[1].index).toBe(1);
    expect(result[2].index).toBe(2);
  });

  it('should mark skipped sentences but keep them when omitSkipped is false', () => {
    const raw = makeSubtitles(3);
    const config: SubtitleConfigInput = {
      mergedGroups: [],
      skippedSentences: [1],
    };

    const result = applySubtitleConfig(raw, config);

    expect(result).toHaveLength(3);
    expect(result[1].isSkipped).toBe(true);
    expect(result[0].isSkipped).toBe(false);
    expect(result[2].isSkipped).toBe(false);
  });

  it('should mark merged row as skipped only when all original indices are skipped', () => {
    const raw = makeSubtitles(5);
    const config: SubtitleConfigInput = {
      mergedGroups: [{ startIndex: 2, endIndex: 4 }],
      skippedSentences: [2, 3],
    };

    const result = applySubtitleConfig(raw, config);

    expect(result[2].isSkipped).toBe(false);
  });

  it('should keep effective indices continuous after merges and skips', () => {
    const raw = makeSubtitles(6);
    const config: SubtitleConfigInput = {
      mergedGroups: [{ startIndex: 1, endIndex: 3 }],
      skippedSentences: [5],
    };

    const result = applySubtitleConfig(raw, config, { omitSkipped: true });

    expect(result).toHaveLength(3);
    expect(result.map((s) => s.index)).toEqual([0, 1, 2]);
    expect(result[0].text).toBe('Sentence 1');
    expect(result[1].text).toBe('Sentence 2 Sentence 3 Sentence 4');
    expect(result[2].text).toBe('Sentence 5');
  });

  it('should sort unsorted merge groups by startIndex', () => {
    const raw = makeSubtitles(5);
    const config: SubtitleConfigInput = {
      mergedGroups: [
        { startIndex: 3, endIndex: 4 },
        { startIndex: 0, endIndex: 1 },
      ],
      skippedSentences: [],
    };

    const result = applySubtitleConfig(raw, config);

    expect(result).toHaveLength(3);
    expect(result[0].text).toBe('Sentence 1 Sentence 2');
    expect(result[1].text).toBe('Sentence 3');
    expect(result[2].text).toBe('Sentence 4 Sentence 5');
  });

  it('should handle overlapping group definitions by using the first encountered start', () => {
    const raw = makeSubtitles(5);
    const config: SubtitleConfigInput = {
      mergedGroups: [
        { startIndex: 0, endIndex: 2 },
        { startIndex: 2, endIndex: 4 },
      ],
      skippedSentences: [],
    };

    const result = applySubtitleConfig(raw, config);

    // First group consumes 0-2, second group sees 2 already consumed so it is ignored
    expect(result[0].text).toBe('Sentence 1 Sentence 2 Sentence 3');
    expect(result[1].text).toBe('Sentence 4');
    expect(result[2].text).toBe('Sentence 5');
  });
});
