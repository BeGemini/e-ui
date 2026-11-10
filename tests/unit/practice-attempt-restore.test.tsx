import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PracticePage from '@/app/(site)/dashboard/[exerciseId]/practice/page';
import type { WordFeedback } from '@/lib/types';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useParams: () => ({ exerciseId: 'exercise-1' }),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('@/app/components/video-player/VideoPlayer', () => ({
  VideoPlayer: ({ onPreviousSentence }: { onPreviousSentence: () => void }) => (
    <button onClick={onPreviousSentence}>Previous sentence</button>
  ),
}));

jest.mock('@/app/components/dictation/WordFeedbackDisplay', () => ({
  WordFeedbackDisplay: ({ accuracy, wordFeedback }: { accuracy: number; wordFeedback: WordFeedback[] }) => (
    <div data-testid="feedback">
      {accuracy}:{wordFeedback.map((item) => item.userWord).join(' ')}
    </div>
  ),
}));

const subtitles = [
  { index: 0, text: 'First sentence.', startSeconds: 0, endSeconds: 2, startTime: '00:00:00,000', endTime: '00:00:02,000' },
  { index: 1, text: 'Second sentence.', startSeconds: 2, endSeconds: 4, startTime: '00:00:02,000', endTime: '00:00:04,000' },
];

function feedback(userWord: string): WordFeedback[] {
  return [{ word: userWord, userWord, status: 'correct' }];
}

function practiceData(currentSentenceIndex: number, withSecondAttempt = true): {
  data: Record<string, unknown>;
} {
  return {
    data: {
      exerciseId: 'exercise-1',
      videoUrl: '/video.mp4',
      subtitleFormat: 'srt',
      totalSentences: 2,
      durationSeconds: 4,
      subtitles,
      userProgress: { currentSentenceIndex, isCompleted: false },
      notes: [],
      attempts: [
        { sentenceIndex: 0, userInput: 'first answer', accuracy: 80, wordFeedback: feedback('first') },
        ...(withSecondAttempt ? [
          { sentenceIndex: 1, userInput: 'second answer', accuracy: 92, wordFeedback: feedback('second') },
        ] : []),
      ],
    },
  };
}

describe('Practice page saved attempts', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  it('restores the current attempt and the previous attempt when navigating', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => practiceData(1),
    });

    render(<PracticePage />);

    expect(await screen.findByDisplayValue('second answer')).toBeInTheDocument();
    expect(screen.getByTestId('feedback')).toHaveTextContent('92:second');

    fireEvent.click(screen.getByRole('button', { name: 'Previous sentence' }));

    expect(screen.getByDisplayValue('first answer')).toBeInTheDocument();
    expect(screen.getByTestId('feedback')).toHaveTextContent('80:first');
  });

  it('shows the newly checked answer when returning to a sentence', async () => {
    global.fetch = jest.fn().mockImplementation(async (input) => {
      const url = String(input);
      if (url === '/api/practice/exercise-1') {
        return { ok: true, json: async () => practiceData(1) };
      }
      if (url === '/api/practice/exercise-1/check') {
        return {
          ok: true,
          json: async () => ({ accuracy: 75, wordFeedback: feedback('updated') }),
        };
      }
      if (url === '/api/practice/exercise-1/save-attempt' || url === '/api/practice/exercise-1/save-progress') {
        return { ok: true, json: async () => ({ success: true }) };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<PracticePage />);

    const input = await screen.findByDisplayValue('second answer');
    fireEvent.change(input, { target: { value: 'updated answer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    await waitFor(() => expect(screen.getByTestId('feedback')).toHaveTextContent('75:updated'));
    fireEvent.click(screen.getByRole('button', { name: 'Previous sentence' }));
    expect(screen.getByDisplayValue('first answer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next Sentence' }));

    expect(await screen.findByDisplayValue('updated answer')).toBeInTheDocument();
    expect(screen.getByTestId('feedback')).toHaveTextContent('75:updated');
  });

  it('clears the input and feedback when the next sentence has no attempt', async () => {
    global.fetch = jest.fn().mockImplementation(async (input) => {
      const url = String(input);
      if (url === '/api/practice/exercise-1') {
        return { ok: true, json: async () => practiceData(0, false) };
      }
      if (url === '/api/practice/exercise-1/save-progress') {
        return { ok: true, json: async () => ({ success: true }) };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<PracticePage />);

    expect(await screen.findByDisplayValue('first answer')).toBeInTheDocument();
    expect(screen.getByTestId('feedback')).toHaveTextContent('80:first');

    fireEvent.click(screen.getByRole('button', { name: 'Next Sentence' }));

    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''));
    expect(screen.queryByTestId('feedback')).not.toBeInTheDocument();
  });
});
