import { describe, it, expect } from '@jest/globals';
import {
  normalizeSelectionToWholeWords,
  isValidCapturedText,
  buildHighlightSegments,
  getMatchingKnowledgePoints,
} from '@/lib/knowledge-point-utils';
import type { KnowledgePoint } from '@/lib/types';

function createKnowledgePoint(overrides: Partial<KnowledgePoint> = {}): KnowledgePoint {
  return {
    knowledgePointId: 'kp-1',
    userId: 'user-1',
    exerciseId: 'ex-1',
    sourceSentenceIndex: 0,
    capturedText: 'hello',
    category: 'word',
    description: '',
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString(),
    ...overrides,
  };
}

describe('Knowledge Point Utilities', () => {
  describe('normalizeSelectionToWholeWords', () => {
    it('returns null for empty or invalid selections', () => {
      const text = 'Hello world';
      expect(normalizeSelectionToWholeWords('', 0, 5)).toBeNull();
      expect(normalizeSelectionToWholeWords(text, -1, 5)).toBeNull();
      expect(normalizeSelectionToWholeWords(text, 0, 50)).toBeNull();
      expect(normalizeSelectionToWholeWords(text, 5, 5)).toBeNull();
    });

    it('expands partial word selection to whole word', () => {
      const text = 'The quick brown fox';
      // Selecting "qui" inside "quick"
      expect(normalizeSelectionToWholeWords(text, 4, 7)).toBe('quick');
      // Selecting "ick"
      expect(normalizeSelectionToWholeWords(text, 6, 9)).toBe('quick');
    });

    it('handles selection spanning multiple words', () => {
      const text = 'The quick brown fox';
      expect(normalizeSelectionToWholeWords(text, 4, 15)).toBe('quick brown');
    });

    it('handles leading and trailing whitespace', () => {
      const text = '  Hello world  ';
      // Selection covers 'llo' inside 'Hello' and is expanded to the whole word
      expect(normalizeSelectionToWholeWords(text, 4, 7)).toBe('Hello');
    });

    it('returns a single word when selection covers it fully', () => {
      const text = 'Hello world';
      expect(normalizeSelectionToWholeWords(text, 0, 5)).toBe('Hello');
    });
  });

  describe('isValidCapturedText', () => {
    it('returns true when captured text exists in sentence', () => {
      expect(isValidCapturedText('Hello world', 'world')).toBe(true);
    });

    it('returns false for empty captured text', () => {
      expect(isValidCapturedText('Hello world', '')).toBe(false);
    });

    it('returns false when captured text is not in sentence', () => {
      expect(isValidCapturedText('Hello world', 'foo')).toBe(false);
    });
  });

  describe('buildHighlightSegments', () => {
    it('returns a single unhighlighted segment when no knowledge points match', () => {
      const text = 'Hello world';
      const segments = buildHighlightSegments(text, []);
      expect(segments).toEqual([{ text, start: 0, end: text.length, categories: [] }]);
    });

    it('ignores knowledge points whose captured text is not in the sentence', () => {
      const text = 'Hello world';
      const kp = createKnowledgePoint({ capturedText: 'foo', category: 'word' });
      const segments = buildHighlightSegments(text, [kp]);
      expect(segments).toEqual([{ text, start: 0, end: text.length, categories: [] }]);
    });

    it('creates a highlighted segment for a single knowledge point', () => {
      const text = 'Hello world';
      const kp = createKnowledgePoint({ capturedText: 'Hello', category: 'word' });
      const segments = buildHighlightSegments(text, [kp]);

      expect(segments).toHaveLength(2);
      expect(segments[0]).toEqual({ text: 'Hello', start: 0, end: 5, categories: ['word'] });
      expect(segments[1]).toEqual({ text: ' world', start: 5, end: 11, categories: [] });
    });

    it('combines categories for overlapping knowledge points', () => {
      const text = 'The quick brown fox jumps';
      const kp1 = createKnowledgePoint({ capturedText: 'quick brown fox', category: 'phrase' });
      const kp2 = createKnowledgePoint({ capturedText: 'brown fox jumps', category: 'sentence' });
      const segments = buildHighlightSegments(text, [kp1, kp2]);

      const overlap = segments.find((s) => s.text === 'brown fox');
      expect(overlap).toBeDefined();
      expect(overlap?.categories).toEqual(['phrase', 'sentence']);
    });

    it('deduplicates repeated categories', () => {
      const text = 'Hello world';
      const kp1 = createKnowledgePoint({ capturedText: 'Hello', category: 'word' });
      const kp2 = createKnowledgePoint({ capturedText: 'Hello world', category: 'word' });
      const segments = buildHighlightSegments(text, [kp1, kp2]);

      const helloSegment = segments.find((s) => s.text === 'Hello');
      expect(helloSegment?.categories).toEqual(['word']);
    });
  });

  describe('getMatchingKnowledgePoints', () => {
    it('returns only knowledge points whose captured text is in the sentence', () => {
      const text = 'Hello world';
      const kp1 = createKnowledgePoint({ capturedText: 'Hello', category: 'word' });
      const kp2 = createKnowledgePoint({ capturedText: 'foo', category: 'word' });

      const result = getMatchingKnowledgePoints(text, [kp1, kp2]);
      expect(result).toHaveLength(1);
      expect(result[0].capturedText).toBe('Hello');
    });
  });
});
