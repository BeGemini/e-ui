import { describe, it, expect } from '@jest/globals';
import { levenshteinDistance, checkAccuracy } from '@/lib/accuracy';

describe('Levenshtein Distance Algorithm', () => {
  it('should return 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
    expect(levenshteinDistance('', '')).toBe(0);
  });

  it('should return string length for empty comparison', () => {
    expect(levenshteinDistance('hello', '')).toBe(5);
    expect(levenshteinDistance('', 'hello')).toBe(5);
  });

  it('should calculate distance for single character difference', () => {
    expect(levenshteinDistance('cat', 'car')).toBe(1);
    expect(levenshteinDistance('hello', 'hallo')).toBe(1);
  });

  it('should calculate distance for multiple character differences', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
  });

  it('should handle case sensitivity', () => {
    expect(levenshteinDistance('Hello', 'hello')).toBe(1);
  });

  it('should calculate distance for insertions', () => {
    expect(levenshteinDistance('cat', 'cats')).toBe(1);
    expect(levenshteinDistance('hello', 'helloworld')).toBe(5);
  });

  it('should calculate distance for deletions', () => {
    expect(levenshteinDistance('cats', 'cat')).toBe(1);
    expect(levenshteinDistance('hello', 'hlo')).toBe(2);
  });
});

describe('Accuracy Checker', () => {
  it('should return 100% for exact match', () => {
    const result = checkAccuracy('hello world', 'hello world');
    expect(result.accuracy).toBe(100);
    expect(result.wordFeedback).toHaveLength(2);
    result.wordFeedback.forEach((feedback) => {
      expect(feedback.status).toBe('correct');
    });
  });

  it('should return 100% for exact match (case insensitive)', () => {
    const result = checkAccuracy('Hello World', 'hello world');
    expect(result.accuracy).toBe(100);
    result.wordFeedback.forEach((feedback) => {
      expect(feedback.status).toBe('correct');
    });
  });

  it('should mark typos with distance 1-2 as acceptable', () => {
    const result = checkAccuracy('hallo world', 'hello world');
    expect(result.accuracy).toBe(100); // Both words are within tolerance
    expect(result.wordFeedback[0].status).toBe('typo');
    expect(result.wordFeedback[1].status).toBe('correct');
  });

  it('should mark wrong words as wrong', () => {
    const result = checkAccuracy('goodbye world', 'hello world');
    expect(result.accuracy).toBe(50); // 1 correct out of 2
    expect(result.wordFeedback[0].status).toBe('wrong');
    expect(result.wordFeedback[1].status).toBe('correct');
  });

  it('should handle extra words in user input', () => {
    const result = checkAccuracy('hello beautiful world', 'hello world');
    expect(result.accuracy).toBeLessThan(100);
    expect(result.wordFeedback).toContainEqual(
      expect.objectContaining({ status: 'wrong' })
    );
  });

  it('should handle missing words', () => {
    const result = checkAccuracy('hello', 'hello world');
    expect(result.accuracy).toBeLessThan(100);
  });

  it('should handle punctuation', () => {
    const result = checkAccuracy('hello, world!', 'hello world');
    // Depending on implementation, might strip punctuation
    expect(result.accuracy).toBeGreaterThanOrEqual(50);
  });

  it('should handle empty input', () => {
    const result = checkAccuracy('', 'hello world');
    expect(result.accuracy).toBe(0);
  });

  it('should handle single word', () => {
    const result = checkAccuracy('hello', 'hello');
    expect(result.accuracy).toBe(100);
    expect(result.wordFeedback).toHaveLength(1);
    expect(result.wordFeedback[0].status).toBe('correct');
  });

  it('should handle multiple typos with distance < 2', () => {
    const result = checkAccuracy('halo wrld', 'hello world');
    expect(result.wordFeedback[0].status).toBe('typo'); // halo vs hello (1 char diff)
    expect(result.wordFeedback[1].status).toBe('typo'); // wrld vs world (1 char diff)
    expect(result.accuracy).toBe(100); // Both within tolerance
  });

  it('should correctly format word feedback', () => {
    const result = checkAccuracy('helo world', 'hello world');
    expect(result.wordFeedback[0]).toEqual({
      word: 'hello',
      userWord: 'helo',
      status: 'typo',
    });
    expect(result.wordFeedback[1]).toEqual({
      word: 'world',
      userWord: 'world',
      status: 'correct',
    });
  });
});
