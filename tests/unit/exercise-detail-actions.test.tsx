import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExerciseDetailPage from '@/app/dashboard/[exerciseId]/page';

const mockPush = jest.fn();
const mockRouter = { push: mockPush, back: jest.fn() };

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ exerciseId: 'exercise-1' }),
}));

describe('Exercise detail icon actions', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        exercise: { title: 'Test exercise', difficulty: 'beginner' },
      }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  it('uses the practice-page style for the back button and preserves navigation', async () => {
    render(<ExerciseDetailPage />);
    const button = await screen.findByRole('button', { name: 'Back', exact: true });

    expect(button.textContent).toBe('');
    expect(button).toHaveAttribute('title', 'Back');
    expect(button).toHaveClass('size-8', 'border-border', 'bg-background');
    expect(button.querySelector('svg')).toHaveClass('lucide-arrow-left');
    const heading = screen.getByRole('heading', { name: 'Test exercise' });
    expect(button.parentElement).toBe(heading.parentElement);
    expect(button.parentElement).toHaveClass('flex', 'items-center', 'justify-between');
    expect(heading.nextElementSibling).toBe(button);
    const main = screen.getByRole('main');
    expect(main.firstElementChild).toBe(heading.parentElement);
    expect(main).toHaveClass('space-y-6');
    expect(main.parentElement).toHaveClass('bg-gray-50', 'py-8');
    expect(heading.parentElement).not.toHaveClass('border-b', 'bg-white', 'shadow');

    fireEvent.click(button);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['Start Practice', 'practice'],
    ['Customize Subtitles', 'subtitles'],
    ['View History', 'complete'],
    ['My Sentences', 'sentences'],
  ])('shows an accessible icon-only %s action and preserves navigation', async (name, path) => {
    render(<ExerciseDetailPage />);
    const button = await screen.findByRole('button', { name, exact: true });

    expect(button.textContent).toBe('');
    expect(button).toHaveAttribute('title', name);
    expect(button.querySelectorAll('svg')).toHaveLength(1);
    expect(button).toHaveClass('size-8');
    expect(button).not.toHaveClass('flex-1');
    const card = button.closest('[data-slot="card"]');
    expect(card).not.toBeNull();
    expect(card?.lastElementChild).toBe(button.parentElement);
    expect(card).toContainElement(screen.getByText('BEGINNER'));

    fireEvent.click(button);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/dashboard/exercise-1/${path}`));
    if (path === 'practice') {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/exercises/exercise-1/start',
        expect.objectContaining({ method: 'POST' })
      );
    }
  });
});
