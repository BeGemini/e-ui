import { fireEvent, render, screen } from '@testing-library/react';
import SeriesCard from '@/app/components/exercise-list/SeriesCard';

jest.mock('@/app/components/exercise-list/SeasonExpander', () => ({
  __esModule: true,
  default: () => <button type="button">Season content</button>,
}));

const series = {
  seriesId: 'series-1',
  title: 'TED Talks',
  description: 'TED Talks you can watch',
  difficulty: 'advanced' as const,
  seasons: [
    {
      seasonId: 'season-1',
      seasonNumber: 1,
      episodes: [
        {
          episodeId: 'episode-1',
          episodeNumber: 1,
          title: 'Episode one',
          exercises: [{ exerciseId: 'exercise-1', title: 'Exercise one' }],
        },
      ],
    },
  ],
};

describe('SeriesCard header', () => {
  it.each([
    'TED Talks',
    'TED Talks you can watch',
    'Advanced',
    '1 episodes • 1 exercises',
  ])('toggles the series when clicking %s', (text) => {
    render(<SeriesCard series={series} />);
    const toggle = screen.getByRole('button', { name: series.title });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Season content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(text));

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Season content')).toBeInTheDocument();
    expect(document.getElementById(toggle.getAttribute('aria-controls')!))
      .toContainElement(screen.getByText('Season content'));

    fireEvent.click(screen.getByText(text));

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Season content')).not.toBeInTheDocument();
  });

  it('uses one header button and preserves arrow and season interactions', () => {
    render(<SeriesCard series={series} />);
    const toggle = screen.getByRole('button', { name: series.title });
    expect(screen.getAllByRole('button')).toHaveLength(1);

    const arrow = toggle.querySelector('svg');
    expect(arrow).not.toBeNull();
    fireEvent.click(arrow!);

    fireEvent.click(screen.getByRole('button', { name: 'Season content' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
