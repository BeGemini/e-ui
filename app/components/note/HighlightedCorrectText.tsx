'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { NOTE_CATEGORY_MAP } from '@/lib/types';
import type { Note, NoteCategory } from '@/lib/types';
import { buildHighlightSegments } from '@/lib/note-utils';

interface NoteRange {
  note: Note;
  start: number;
  end: number;
}

interface HighlightedCorrectTextProps {
  text: string;
  notes: Note[];
  className?: string;
  onEditNote?: (note: Note) => void;
}

/**
 * Combine multiple category colors into a single background gradient.
 * When segments overlap, the colors are layered with transparency.
 */
function combineCategoryColors(categories: NoteCategory[]): string {
  if (categories.length === 0) {
    return 'transparent';
  }

  if (categories.length === 1) {
    return NOTE_CATEGORY_MAP[categories[0]].fallbackColor;
  }

  const colors = categories.map(
    (category) => NOTE_CATEGORY_MAP[category].fallbackColor
  );
  const step = 100 / colors.length;
  const stops = colors
    .map((color, index) => `${color} ${index * step}%, ${color} ${(index + 1) * step}%`)
    .join(', ');

  return `linear-gradient(135deg, ${stops})`;
}

export function HighlightedCorrectText({
  text,
  notes,
  className,
  onEditNote,
}: HighlightedCorrectTextProps) {
  const segments = buildHighlightSegments(text, notes);

  const ranges = useMemo<NoteRange[]>(() => {
    return notes
      .map((kp) => {
        const start = text.indexOf(kp.capturedText);
        if (start === -1) return null;
        return { note: kp, start, end: start + kp.capturedText.length };
      })
      .filter((item): item is NoteRange => item !== null);
  }, [text, notes]);

  return (
    <span className={cn('inline leading-relaxed', className)}>
      {segments.map((segment, index) => {
        if (segment.categories.length === 0) {
          return <span key={index}>{segment.text}</span>;
        }

        const backgroundColor = combineCategoryColors(segment.categories);
        const textColors = segment.categories.map(
          (category) => NOTE_CATEGORY_MAP[category].colorClass.split(' ')[1]
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
              onEditNote && matched && 'cursor-pointer hover:opacity-80',
              textColorClass
            )}
            style={{ backgroundColor }}
            title={matched ? 'Click to edit note' : undefined}
            onClick={() => {
              if (matched) {
                onEditNote?.(matched.note);
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
