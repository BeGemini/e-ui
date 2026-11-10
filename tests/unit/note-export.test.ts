import {
  buildNoteExportFilename,
  groupByCategory,
} from '@/lib/note-export';
import type { Note } from '@/lib/types';

function makeNote(overrides: Partial<Note>): Note {
  return {
    noteId: 'kp-1',
    userId: 'user-1',
    exerciseId: 'ex-1',
    sourceSentenceIndex: 0,
    capturedText: 'apple',
    category: 'word',
    description: 'A fruit.',
    createdDate: '2026-11-01T00:00:00.000Z',
    updatedDate: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildNoteExportFilename', () => {
  it('builds <title>-Notes-YYYY-MM-DD.pdf', () => {
    expect(buildNoteExportFilename('Pilot', new Date(2026, 10, 1))).toBe(
      'Pilot-Notes-2026-11-01.pdf'
    );
  });

  it('removes characters that are invalid in file names', () => {
    expect(buildNoteExportFilename('a/b:c*d?"e<f>g|h', new Date(2026, 0, 5))).toBe(
      'abcdefgh-Notes-2026-01-05.pdf'
    );
  });

  it('falls back to "exercise" when nothing is left after cleaning', () => {
    expect(buildNoteExportFilename('///', new Date(2026, 0, 5))).toBe(
      'exercise-Notes-2026-01-05.pdf'
    );
  });

  it('truncates long titles to 80 characters', () => {
    const name = buildNoteExportFilename('x'.repeat(100), new Date(2026, 0, 5));
    expect(name.startsWith(`${'x'.repeat(80)}-Notes-`)).toBe(true);
  });
});

describe('groupByCategory', () => {
  it('groups items in NOTE_CATEGORIES order and drops empty groups', () => {
    const points = [
      makeNote({ noteId: 'kp-s', category: 'sentence' }),
      makeNote({ noteId: 'kp-w1', category: 'word' }),
      makeNote({ noteId: 'kp-w2', category: 'word' }),
    ];

    const groups = groupByCategory(points);

    expect(groups.map((g) => g.category)).toEqual(['word', 'sentence']);
    expect(groups[0].items.map((kp) => kp.noteId)).toEqual(['kp-w1', 'kp-w2']);
    expect(groups[1].items.map((kp) => kp.noteId)).toEqual(['kp-s']);
  });

  it('returns an empty array when there are no notes', () => {
    expect(groupByCategory([])).toEqual([]);
  });
});
