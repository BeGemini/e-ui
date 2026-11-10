/**
 * Lightweight helpers shared by the notes export flow.
 *
 * IMPORTANT: this module must NOT import `@react-pdf/renderer`.
 * It is loaded on demand from ./build-pdf when the user exports.
 */

import type { Note, NoteCategoryConfig } from '@/lib/types';
import { NOTE_CATEGORIES } from '@/lib/types';
import { formatLocalDate, sanitizeExportTitle } from '@/lib/sentence-export';

export interface NoteExportInput {
  title: string;
  exportedAt: Date;
  notes: Note[];
}

export interface NoteGroup extends NoteCategoryConfig {
  items: Note[];
}

/** Group notes by category, in NOTE_CATEGORIES order, empty groups dropped. */
export function groupByCategory(notes: Note[]): NoteGroup[] {
  return NOTE_CATEGORIES.map((config) => ({
    ...config,
    items: notes.filter((kp) => kp.category === config.category),
  })).filter((group) => group.items.length > 0);
}

/** Build `<title>-Notes-YYYY-MM-DD.pdf` with a filesystem-safe title. */
export function buildNoteExportFilename(title: string, date: Date): string {
  return `${sanitizeExportTitle(title)}-Notes-${formatLocalDate(date)}.pdf`;
}
