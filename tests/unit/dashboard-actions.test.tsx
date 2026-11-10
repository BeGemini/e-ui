import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '@/app/(site)/dashboard/page';

const mockPush = jest.fn();
const mockRouter = { push: mockPush };

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@/app/components/exercise-list/ExerciseList', () => ({
  __esModule: true,
  default: () => null,
}));

describe('Dashboard icon actions', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { email: 'test@example.com', role: 'admin' } }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  it('shows labeled icon-only controls and preserves the admin link', async () => {
    render(<DashboardPage />);

    for (const name of ['Content management', 'Logout']) {
      const button = await screen.findByRole('button', { name, exact: true });
      expect(button.textContent).toBe('');
      expect(button).toHaveAttribute('title', name);
      expect(button.querySelectorAll('svg')).toHaveLength(1);
      expect(button).toHaveClass('size-8');
    }

    expect(screen.getByRole('button', { name: 'Content management' }))
      .toHaveAttribute('href', '/admin');
  });

  it('keeps content management hidden for non-admin users', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { email: 'test@example.com', role: 'user' } }),
    });
    render(<DashboardPage />);

    await screen.findByRole('button', { name: 'Logout' });
    expect(screen.queryByRole('button', { name: 'Content management' })).not.toBeInTheDocument();
  });

  it('preserves logout behavior', async () => {
    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Logout' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
    expect(localStorage.getItem('token')).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
