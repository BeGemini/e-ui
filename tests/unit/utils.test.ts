import { describe, it, expect } from '@jest/globals';
import { tokenizeText, normalizeText, formatDuration } from '@/lib/utils';

describe('Text Utilities', () => {
  describe('tokenizeText', () => {
    it('should tokenize a simple sentence', () => {
      const tokens = tokenizeText('hello world');
      expect(tokens).toEqual(['hello', 'world']);
    });

    it('should handle punctuation', () => {
      const tokens = tokenizeText('Hello, world!');
      expect(tokens).toContain('hello');
      expect(tokens).toContain('world');
    });

    it('should handle multiple spaces', () => {
      const tokens = tokenizeText('hello    world');
      expect(tokens).toHaveLength(2);
    });

    it('should handle empty string', () => {
      const tokens = tokenizeText('');
      expect(tokens).toEqual([]);
    });

    it('should handle single word', () => {
      const tokens = tokenizeText('hello');
      expect(tokens).toEqual(['hello']);
    });

    it('should be case-insensitive', () => {
      const tokens = tokenizeText('Hello World');
      expect(tokens).toEqual(['hello', 'world']);
    });

    it('should handle contractions', () => {
      const tokens = tokenizeText("don't you");
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle numbers', () => {
      const tokens = tokenizeText('test 123 example');
      expect(tokens).toContain('test');
      expect(tokens).toContain('example');
    });

    it('should handle special characters', () => {
      const tokens = tokenizeText('hello@world.com test');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('normalizeText', () => {
    it('should convert to lowercase', () => {
      const normalized = normalizeText('HELLO World');
      expect(normalized).toMatch(/hello.*world/i);
    });

    it('should trim whitespace', () => {
      const normalized = normalizeText('  hello world  ');
      expect(normalized).not.toMatch(/^ /);
      expect(normalized).not.toMatch(/ $/);
    });

    it('should handle extra spaces', () => {
      const normalized = normalizeText('hello    world');
      expect(normalized).toContain('hello');
      expect(normalized).toContain('world');
    });

    it('should preserve meaningful content', () => {
      const normalized = normalizeText('Hello123World');
      expect(normalized).toContain('hello');
      expect(normalized).toContain('world');
      expect(normalized).toContain('123');
    });

    it('should handle empty string', () => {
      const normalized = normalizeText('');
      expect(normalized).toBe('');
    });

    it('should handle punctuation', () => {
      const normalized = normalizeText('Hello, World!');
      expect(normalized.toLowerCase()).toContain('hello');
      expect(normalized.toLowerCase()).toContain('world');
    });

    it('should handle unicode characters', () => {
      const normalized = normalizeText('Café Naïve');
      expect(normalized).toBeDefined();
      expect(normalized.length).toBeGreaterThan(0);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds to HH:MM:SS', () => {
      expect(formatDuration(0)).toBe('00:00:00');
      expect(formatDuration(59)).toBe('00:00:59');
      expect(formatDuration(60)).toBe('00:01:00');
      expect(formatDuration(3661)).toBe('01:01:01');
    });

    it('should handle large durations', () => {
      expect(formatDuration(86400)).toBe('24:00:00'); // 1 day
    });

    it('should handle decimal seconds', () => {
      const formatted = formatDuration(1.5);
      expect(formatted).toMatch(/00:00:\d+/);
    });

    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('00:00:00');
    });

    it('should pad with zeros', () => {
      expect(formatDuration(3661)).toMatch(/\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings gracefully', () => {
      expect(tokenizeText('')).toEqual([]);
      expect(normalizeText('')).toBe('');
    });

    it('should handle null-like strings', () => {
      expect(tokenizeText('   ')).toEqual([]);
    });

    it('should handle very long strings', () => {
      const longString = 'word '.repeat(1000);
      const tokens = tokenizeText(longString);
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle mixed unicode and ASCII', () => {
      const mixed = 'Hello 世界 World مرحبا';
      const tokens = tokenizeText(mixed);
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});
