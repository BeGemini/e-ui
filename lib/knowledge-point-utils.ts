/**
 * Knowledge point utility functions
 * - Text selection normalization to whole word boundaries
 * - Highlight segmentation for overlapping knowledge points
 */

import type { KnowledgePoint, KnowledgePointCategory } from './types';

/**
 * Normalize a text selection to whole word boundaries within a sentence.
 * Returns the normalized captured text, or null if the selection is empty.
 */
export function normalizeSelectionToWholeWords(
  sentenceText: string,
  startOffset: number,
  endOffset: number
): string | null {
  if (!sentenceText || startOffset < 0 || endOffset > sentenceText.length || startOffset >= endOffset) {
    return null;
  }

  // Expand start offset to the beginning of the word
  let normalizedStart = startOffset;
  while (normalizedStart > 0 && !/\s/.test(sentenceText[normalizedStart - 1])) {
    normalizedStart--;
  }

  // Expand end offset to the end of the word
  let normalizedEnd = endOffset;
  while (normalizedEnd < sentenceText.length && !/\s/.test(sentenceText[normalizedEnd])) {
    normalizedEnd++;
  }

  const capturedText = sentenceText.slice(normalizedStart, normalizedEnd).trim();
  return capturedText.length > 0 ? capturedText : null;
}

/**
 * Verify that the captured text is a valid substring of the sentence.
 */
export function isValidCapturedText(sentenceText: string, capturedText: string): boolean {
  return capturedText.length > 0 && sentenceText.includes(capturedText);
}

/**
 * A segment of text with associated knowledge point categories.
 */
export interface HighlightSegment {
  text: string;
  start: number;
  end: number;
  categories: KnowledgePointCategory[];
}

/**
 * Split a sentence into segments based on knowledge point boundaries.
 * Each segment contains the categories of all knowledge points that cover it.
 * Overlapping knowledge points produce segments that combine all applicable categories.
 */
export function buildHighlightSegments(
  sentenceText: string,
  knowledgePoints: KnowledgePoint[]
): HighlightSegment[] {
  if (!sentenceText || knowledgePoints.length === 0) {
    return [{ text: sentenceText, start: 0, end: sentenceText.length, categories: [] }];
  }

  // Find all boundary positions and category coverage
  const boundaries = new Set<number>([0, sentenceText.length]);
  const coverage: { start: number; end: number; category: KnowledgePointCategory }[] = [];

  for (const kp of knowledgePoints) {
    const index = sentenceText.indexOf(kp.capturedText);
    if (index === -1) continue;

    const start = index;
    const end = index + kp.capturedText.length;
    boundaries.add(start);
    boundaries.add(end);
    coverage.push({ start, end, category: kp.category });
  }

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
  const segments: HighlightSegment[] = [];

  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const start = sortedBoundaries[i];
    const end = sortedBoundaries[i + 1];
    if (start === end) continue;

    const categories = coverage
      .filter((c) => c.start <= start && c.end >= end)
      .map((c) => c.category);

    // Deduplicate categories while preserving order
    const uniqueCategories = Array.from(new Set(categories));

    segments.push({
      text: sentenceText.slice(start, end),
      start,
      end,
      categories: uniqueCategories,
    });
  }

  return segments;
}

/**
 * Filter knowledge points to those that match the given sentence text.
 */
export function getMatchingKnowledgePoints(
  sentenceText: string,
  knowledgePoints: KnowledgePoint[]
): KnowledgePoint[] {
  return knowledgePoints.filter((kp) => sentenceText.includes(kp.capturedText));
}
