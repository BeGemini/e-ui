'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SeasonExpander from './SeasonExpander';

interface Season {
  seasonId: string;
  seasonNumber: number;
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{series.title}</CardTitle>
            {series.description && (
              <p className="mt-1 text-sm text-muted-foreground">{series.description}</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <Badge className={config.className}>{config.label}</Badge>
              <span className="text-xs text-muted-foreground">
                {totalEpisodes} episodes • {totalExercises} exercises
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2"
          >
            {isExpanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          {series.seasons.map((season) => (
            <SeasonExpander key={season.seasonId} season={season} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}
