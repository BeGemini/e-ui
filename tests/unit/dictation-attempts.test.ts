import { query } from '@/lib/db';
import { listPracticeAttempts } from '@/lib/dictation-attempts';

jest.mock('@/lib/db', () => ({
  execute: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
}));

const mockedQuery = query as jest.MockedFunction<typeof query>;

describe('listPracticeAttempts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the latest saved input and normalized feedback for each sentence', async () => {
    mockedQuery.mockResolvedValue([
      {
        sentenceIndex: 2,
        userInput: 'saved answer',
        correctAnswer: 'Saved answer.',
        accuracy: '87.50',
        wordFeedback: JSON.stringify([
          { word: 'saved', userWord: 'saved', status: 'correct' },
        ]),
        attemptDate: '2026-01-01T00:00:00.000Z',
      },
    ]);

    await expect(listPracticeAttempts('user-1', 'exercise-1')).resolves.toEqual([
      {
        sentenceIndex: 2,
        userInput: 'saved answer',
        accuracy: 87.5,
        wordFeedback: [{ word: 'saved', userWord: 'saved', status: 'correct' }],
      },
    ]);
    expect(mockedQuery).toHaveBeenCalledWith(
      expect.stringContaining('AND NOT EXISTS'),
      ['user-1', 'exercise-1']
    );
  });

  it('handles already parsed feedback and missing values', async () => {
    mockedQuery.mockResolvedValue([
      {
        sentenceIndex: 0,
        userInput: null,
        correctAnswer: null,
        accuracy: 0,
        wordFeedback: null,
        attemptDate: '2026-01-01T00:00:00.000Z',
      },
      {
        sentenceIndex: 1,
        userInput: 'answer',
        correctAnswer: 'Answer.',
        accuracy: 100,
        wordFeedback: [{ word: 'answer', userWord: 'answer', status: 'correct' }],
        attemptDate: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const result = await listPracticeAttempts('user-1', 'exercise-1');

    expect(result[0]).toEqual({ sentenceIndex: 0, userInput: '', accuracy: 0, wordFeedback: [] });
    expect(result[1].wordFeedback).toEqual([
      { word: 'answer', userWord: 'answer', status: 'correct' },
    ]);
  });
});
