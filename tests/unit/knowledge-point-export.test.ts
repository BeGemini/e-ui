import {
  buildKnowledgePointExportFilename,
  groupByCategory,
} from '@/lib/knowledge-point-export';
import type { KnowledgePoint } from '@/lib/types';

function makeKnowledgePoint(overrides: Partial<KnowledgePoint>): KnowledgePoint {
  return {
    knowledgePointId: 'kp-1',
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

describe('buildKnowledgePointExportFilename', () => {
  it('builds <title>-知识点-YYYY-MM-DD.pdf', () => {
    expect(buildKnowledgePointExportFilename('Pilot', new Date(2026, 10, 1))).toBe(
      'Pilot-知识点-2026-11-01.pdf'
    );
  });

  it('removes characters that are invalid in file names', () => {
    expect(buildKnowledgePointExportFilename('a/b:c*d?"e<f>g|h', new Date(2026, 0, 5))).toBe(
      'abcdefgh-知识点-2026-01-05.pdf'
    );
  });

  it('falls back to "exercise" when nothing is left after cleaning', () => {
    expect(buildKnowledgePointExportFilename('///', new Date(2026, 0, 5))).toBe(
      'exercise-知识点-2026-01-05.pdf'
    );
  });

  it('truncates long titles to 80 characters', () => {
    const name = buildKnowledgePointExportFilename('x'.repeat(100), new Date(2026, 0, 5));
    expect(name.startsWith(`${'x'.repeat(80)}-知识点-`)).toBe(true);
  });
});

describe('groupByCategory', () => {
  it('groups items in KNOWLEDGE_POINT_CATEGORIES order and drops empty groups', () => {
    const points = [
      makeKnowledgePoint({ knowledgePointId: 'kp-s', category: 'sentence' }),
      makeKnowledgePoint({ knowledgePointId: 'kp-w1', category: 'word' }),
      makeKnowledgePoint({ knowledgePointId: 'kp-w2', category: 'word' }),
    ];

    const groups = groupByCategory(points);

    expect(groups.map((g) => g.category)).toEqual(['word', 'sentence']);
    expect(groups[0].items.map((kp) => kp.knowledgePointId)).toEqual(['kp-w1', 'kp-w2']);
    expect(groups[1].items.map((kp) => kp.knowledgePointId)).toEqual(['kp-s']);
  });

  it('returns an empty array when there are no knowledge points', () => {
    expect(groupByCategory([])).toEqual([]);
  });
});
