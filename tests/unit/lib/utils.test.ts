import { describe, it, expect } from '@jest/globals';
import {
  applySubtitleConfig,
  applyTimeAdjustments,
  applyLinkedTimeEdit,
  clearLinkedTimeEdit,
  applyGlobalTimeOffset,
  formatSubtitleTimestamp,
  parseSubtitleTimestamp,
  SubtitleConfigInput,
} from '@/lib/utils';
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

describe('applyTimeAdjustments', () => {
  it('should return subtitles unchanged when adjustments are empty or missing', () => {
    const raw = makeSubtitles(3);

    expect(applyTimeAdjustments(raw, [])).toEqual(raw);
    expect(applyTimeAdjustments(raw, null)).toEqual(raw);
    expect(applyTimeAdjustments(raw, undefined)).toEqual(raw);
  });

  it('should override start and end for the targeted original index only', () => {
    const raw = makeSubtitles(4);
    const result = applyTimeAdjustments(raw, [
      { index: 1, startSeconds: 5.5, endSeconds: 8.75 },
    ]);

    expect(result).toHaveLength(4);
    expect(result[0].startSeconds).toBe(0);
    expect(result[1].startSeconds).toBe(5.5);
    expect(result[1].endSeconds).toBe(8.75);
    expect(result[1].startTime).toBe('00:00:05.500');
    expect(result[1].endTime).toBe('00:00:08.750');
    expect(result[2].startSeconds).toBe(10);
  });

  it('should support overriding only one boundary', () => {
    const raw = makeSubtitles(3);
    const result = applyTimeAdjustments(raw, [{ index: 2, endSeconds: 15.25 }]);

    expect(result[2].startSeconds).toBe(10);
    expect(result[2].endSeconds).toBe(15.25);
  });

  it('should not change sentence count or order, composing with merge/skip config', () => {
    const raw = makeSubtitles(5);
    const adjusted = applyTimeAdjustments(raw, [
      { index: 2, startSeconds: 10.4 },
      { index: 4, endSeconds: 25.1 },
    ]);

    const result = applySubtitleConfig(adjusted, {
      mergedGroups: [{ startIndex: 2, endIndex: 4 }],
      skippedSentences: [],
    });

    // Merged row inherits adjusted boundaries: first start and last end.
    expect(result).toHaveLength(3);
    expect(result[2].startSeconds).toBe(10.4);
    expect(result[2].endSeconds).toBe(25.1);
  });
});

describe('formatSubtitleTimestamp', () => {
  it('should format seconds as HH:MM:SS.mmm', () => {
    expect(formatSubtitleTimestamp(0)).toBe('00:00:00.000');
    expect(formatSubtitleTimestamp(141.172)).toBe('00:02:21.172');
    expect(formatSubtitleTimestamp(3661.5)).toBe('01:01:01.500');
  });

  it('should clamp negative values to zero', () => {
    expect(formatSubtitleTimestamp(-1)).toBe('00:00:00.000');
  });
});

describe('parseSubtitleTimestamp', () => {
  it('should parse dot and comma millisecond separators', () => {
    expect(parseSubtitleTimestamp('00:02:21.172')).toBeCloseTo(141.172, 3);
    expect(parseSubtitleTimestamp('00:02:21,172')).toBeCloseTo(141.172, 3);
    expect(parseSubtitleTimestamp('1:01:01.5')).toBeCloseTo(3661.5, 3);
  });

  it('should reject invalid input', () => {
    expect(parseSubtitleTimestamp('')).toBeNull();
    expect(parseSubtitleTimestamp('abc')).toBeNull();
    expect(parseSubtitleTimestamp('00:61:00.000')).toBeNull();
    expect(parseSubtitleTimestamp('00:00:61.000')).toBeNull();
    expect(parseSubtitleTimestamp('00:00:00')).toBeNull();
  });
});

describe('applyLinkedTimeEdit', () => {
  // Row 1 is a merged row spanning originals 1–2.
  const rows = [
    { index: 0, originalIndices: [0] },
    { index: 1, originalIndices: [1, 2] },
    { index: 2, originalIndices: [3] },
  ];

  it('pins the previous row’s end when setting a start', () => {
    const { adjustments, updates } = applyLinkedTimeEdit(rows, 3, 'start', 10.5, []);

    // Target row (original 3) start + previous row’s end (original 2).
    expect(adjustments).toEqual([
      { index: 2, endSeconds: 10.5 },
      { index: 3, startSeconds: 10.5 },
    ]);
    expect(updates).toEqual([
      { index: 2, field: 'start', seconds: 10.5 },
      { index: 1, field: 'end', seconds: 10.5 },
    ]);
  });

  it('pins the next row’s start when setting an end', () => {
    const { adjustments, updates } = applyLinkedTimeEdit(rows, 0, 'end', 20.25, []);

    // Target row (original 0) end + next row’s start (original 1).
    expect(adjustments).toEqual([
      { index: 0, endSeconds: 20.25 },
      { index: 1, startSeconds: 20.25 },
    ]);
    expect(updates).toEqual([
      { index: 0, field: 'end', seconds: 20.25 },
      { index: 1, field: 'start', seconds: 20.25 },
    ]);
  });

  it('does not link beyond the first or last row', () => {
    const first = applyLinkedTimeEdit(rows, 0, 'start', 1, []);
    expect(first.adjustments).toEqual([{ index: 0, startSeconds: 1 }]);
    expect(first.updates).toEqual([{ index: 0, field: 'start', seconds: 1 }]);

    const last = applyLinkedTimeEdit(rows, 3, 'end', 30, []);
    expect(last.adjustments).toEqual([{ index: 3, endSeconds: 30 }]);
  });

  it('upserts over existing adjustments for the same original', () => {
    const existing = [{ index: 2, endSeconds: 8 }];
    const { adjustments } = applyLinkedTimeEdit(rows, 3, 'start', 10, existing);

    expect(adjustments).toEqual([
      { index: 2, endSeconds: 10 },
      { index: 3, startSeconds: 10 },
    ]);
  });
});

describe('clearLinkedTimeEdit', () => {
  const rows = [
    { index: 0, originalIndices: [0] },
    { index: 1, originalIndices: [1, 2] },
    { index: 2, originalIndices: [3] },
  ];

  it('clears the row’s overrides plus the shared neighbor boundaries', () => {
    const current = [
      { index: 0, endSeconds: 10 },
      { index: 1, endSeconds: 10 },
      { index: 2, startSeconds: 10, endSeconds: 20 },
      { index: 3, startSeconds: 20 },
      { index: 7, startSeconds: 99 },
    ];
    const result = clearLinkedTimeEdit(rows, 1, current);

    // Target row (originals 1 and 2), previous row's end (original 0),
    // next row's start (original 3) are cleared; unrelated entries survive.
    expect(result).toEqual([{ index: 7, startSeconds: 99 }]);
  });

  it('returns the list unchanged when the row is not found', () => {
    const current = [{ index: 5, startSeconds: 1 }];
    expect(clearLinkedTimeEdit(rows, 42, current)).toEqual(current);
  });
});

describe('applyGlobalTimeOffset', () => {
  it('returns subtitles unchanged when the offset is 0', () => {
    const raw = makeSubtitles(3);
    expect(applyGlobalTimeOffset(raw, 0)).toEqual(raw);
  });

  it('shifts every start/end by the offset and regenerates timestamps', () => {
    const raw = makeSubtitles(3);
    const result = applyGlobalTimeOffset(raw, 2000);

    expect(result[0].startSeconds).toBe(2);
    expect(result[0].endSeconds).toBe(6);
    expect(result[2].startSeconds).toBe(12);
    expect(result[2].endSeconds).toBe(16);
    expect(result[0].startTime).toBe('00:00:02.000');
    expect(result[0].endTime).toBe('00:00:06.000');
  });

  it('shifts earlier with a negative offset and clamps at 0', () => {
    const raw = makeSubtitles(3);
    const result = applyGlobalTimeOffset(raw, -7000);

    expect(result[0].startSeconds).toBe(0);
    expect(result[0].endSeconds).toBe(0);
    expect(result[1].startSeconds).toBe(0);
    expect(result[1].endSeconds).toBe(2);
    expect(result[2].startSeconds).toBe(3);
    expect(result[2].endSeconds).toBe(7);
  });
});
