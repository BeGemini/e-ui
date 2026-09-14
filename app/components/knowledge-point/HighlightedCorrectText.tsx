'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { KNOWLEDGE_POINT_CATEGORY_MAP } from '@/lib/types';
import type { KnowledgePoint, KnowledgePointCategory } from '@/lib/types';
import { buildHighlightSegments } from '@/lib/knowledge-point-utils';

interface KnowledgePointRange {
  knowledgePoint: KnowledgePoint;
  start: number;
  end: number;
}

interface HighlightedCorrectTextProps {
  text: string;
  knowledgePoints: KnowledgePoint[];
  className?: string;
  onEditKnowledgePoint?: (knowledgePoint: KnowledgePoint) => void;
}

/**
 * Combine multiple category colors into a single background gradient.
 * When segments overlap, the colors are layered with transparency.
 */
function combineCategoryColors(categories: KnowledgePointCategory[]): string {
  if (categories.length === 0) {
    return 'transparent';
  }

  if (categories.length === 1) {
    return KNOWLEDGE_POINT_CATEGORY_MAP[categories[0]].fallbackColor;
  }

  const colors = categories.map(
    (category) => KNOWLEDGE_POINT_CATEGORY_MAP[category].fallbackColor
  );
  const step = 100 / colors.length;
  const stops = colors
    .map((color, index) => `${color} ${index * step}%, ${color} ${(index + 1) * step}%`)
    .join(', ');

  return `linear-gradient(135deg, ${stops})`;
}

export function HighlightedCorrectText({
  text,
  knowledgePoints,
  className,
  onEditKnowledgePoint,
}: HighlightedCorrectTextProps) {
  const segments = buildHighlightSegments(text, knowledgePoints);

  const ranges = useMemo<KnowledgePointRange[]>(() => {
    return knowledgePoints
      .map((kp) => {
        const start = text.indexOf(kp.capturedText);
        if (start === -1) return null;
        return { knowledgePoint: kp, start, end: start + kp.capturedText.length };
      })
      .filter((item): item is KnowledgePointRange => item !== null);
  }, [text, knowledgePoints]);

  return (
    <span className={cn('inline leading-relaxed', className)}>
      {segments.map((segment, index) => {
        if (segment.categories.length === 0) {
          return <span key={index}>{segment.text}</span>;
        }

        const backgroundColor = combineCategoryColors(segment.categories);
        const textColors = segment.categories.map(
          (category) => KNOWLEDGE_POINT_CATEGORY_MAP[category].colorClass.split(' ')[1]
        );
        const textColorClass = textColors[0];

        const matched = ranges.find(
          (range) => range.start <= segment.start && range.end >= segment.end
        );

        return (
          <mark
            key={index}
            className={cn(
              'rounded px-0.5 font-medium',
              onEditKnowledgePoint && matched && 'cursor-pointer hover:opacity-80',
              textColorClass
            )}
            style={{ backgroundColor }}
            title={matched ? 'Click to edit knowledge point' : undefined}
            onClick={() => {
              if (matched) {
                onEditKnowledgePoint?.(matched.knowledgePoint);
              }
            }}
          >
            {segment.text}
          </mark>
        );
      })}
    </span>
  );
}
