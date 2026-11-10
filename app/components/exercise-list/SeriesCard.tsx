'use client';

import { useId, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SeasonExpander from './SeasonExpander';

interface Season {
  seasonId: string;
  seasonNumber: number;
  title?: string | null;
  episodes: Episode[];
}

interface Episode {
  episodeId: string;
  episodeNumber: number;
  title: string;
  exercises: Exercise[];
}

interface Exercise {
  exerciseId: string;
  title: string;
  completed?: boolean;
  currentProgress?: number;
}

interface Series {
  seriesId: string;
  title: string;
  description?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  coverImageUrl?: string;
  seasons: Season[];
}

interface SeriesCardProps {
  series: Series;
}

const difficultyConfig = {
  beginner: { label: 'Beginner', className: 'bg-green-100 text-green-800' },
  intermediate: { label: 'Intermediate', className: 'bg-yellow-100 text-yellow-800' },
  advanced: { label: 'Advanced', className: 'bg-red-100 text-red-800' },
};

export default function SeriesCard({ series }: SeriesCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();
  const config = difficultyConfig[series.difficulty];

  const totalEpisodes = series.seasons.reduce(
    (acc, season) => acc + season.episodes.length,
    0
  );
  const totalExercises = series.seasons.reduce(
    (acc, season) =>
      acc +
      season.episodes.reduce((episodeAcc, episode) => episodeAcc + episode.exercises.length, 0),
    0
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-label={series.title}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          className="h-auto w-full cursor-pointer items-start justify-between gap-4 p-0 text-left font-normal whitespace-normal aria-expanded:bg-transparent"
        >
          <span className="flex-1">
            <span data-slot="card-title" className="block font-heading text-lg leading-snug font-medium">
              {series.title}
            </span>
            {series.description && (
              <span className="mt-1 block text-sm text-muted-foreground">{series.description}</span>
            )}
            <span className="mt-2 flex items-center gap-2">
              <Badge className={config.className}>{config.label}</Badge>
              <span className="text-xs text-muted-foreground">
                {totalEpisodes} episodes • {totalExercises} exercises
              </span>
            </span>
          </span>
          <span
            aria-hidden="true"
            className="mt-2 inline-flex h-7 shrink-0 items-center justify-center px-2.5"
          >
            {isExpanded ? <ChevronUp /> : <ChevronDown />}
          </span>
        </Button>
      </CardHeader>

      {isExpanded && (
        <CardContent id={contentId} className="space-y-3">
          {series.seasons.map((season) => (
            <SeasonExpander key={season.seasonId} season={season} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}
