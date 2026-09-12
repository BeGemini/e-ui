import { describe, it, expect } from '@jest/globals';
import { normalizeSubtitleText } from '@/lib/subtitle-parser';

describe('normalizeSubtitleText', () => {
  it('should remove literal \\N markers and replace with space', () => {
    const result = normalizeSubtitleText('First part\\NSecond part');
    expect(result).toBe('First part Second part');
  });

  it('should collapse multiple whitespace characters', () => {
    const result = normalizeSubtitleText('Hello    world   !');
    expect(result).toBe('Hello world !');
  });

  it('should trim leading and trailing whitespace', () => {
    const result = normalizeSubtitleText('  Hello world  ');
    expect(result).toBe('Hello world');
  });

  it('should handle mixed \\N and normal whitespace', () => {
    const result = normalizeSubtitleText('Line one\\N   Line two');
    expect(result).toBe('Line one Line two');
  });

  it('should return empty string for empty input', () => {
    expect(normalizeSubtitleText('')).toBe('');
    expect(normalizeSubtitleText('   ')).toBe('');
  });

  it('should return empty string for non-string input', () => {
    expect(normalizeSubtitleText(undefined as unknown as string)).toBe('');
    expect(normalizeSubtitleText(null as unknown as string)).toBe('');
  });

  it('should handle multiple \\N markers in one string', () => {
    const result = normalizeSubtitleText('A\\NB\\NC');
    expect(result).toBe('A B C');
  });
});
