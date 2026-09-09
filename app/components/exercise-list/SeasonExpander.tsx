'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ExerciseDetail from './ExerciseDetail';

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

interface Season {
  seasonId: string;
  seasonNumber: number;
  episodes: Episode[];
}

interface SeasonExpanderProps {
  season: Season;
}

export default function SeasonExpander({ season }: SeasonExpanderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalExercises = season.episodes.reduce(
    (acc, episode) => acc + episode.exercises.length,
    0
  );

  return (
    <div className="space-y-2 border-l-2 border-muted pl-4">
      <Button
        variant="ghost"
        className="w-full justify-start text-left h-auto py-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 flex-1">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span className="font-medium">Season {season.seasonNumber}</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {season.episodes.length} episodes • {totalExercises} exercises
          </span>
        </div>
      </Button>

      {isExpanded && (
        <div className="space-y-2 pt-2">
          {season.episodes.map((episode) => (
            <div key={episode.episodeId} className="space-y-1 border-l pl-4">
              <div className="text-sm font-medium text-muted-foreground">
                Episode {episode.episodeNumber}: {episode.title}
              </div>
              <div className="space-y-1">
                {episode.exercises.map((exercise) => (
                  <ExerciseDetail key={exercise.exerciseId} exercise={exercise} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
