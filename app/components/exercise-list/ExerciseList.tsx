'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SeriesCard from './SeriesCard';

interface Series {
  seriesId: string;
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  seasons: Season[];
}

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

export interface ExerciseListProps {
  filter?: 'beginner' | 'intermediate' | 'advanced';
  search?: string;
}

export default function ExerciseList({ filter, search }: ExerciseListProps) {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExercises();
  }, [filter, search]);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/api/exercises';
      const params = new URLSearchParams();

      if (filter) {
        params.append('difficulty', filter);
      }
      if (search) {
        params.append('search', search);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch exercises: ${response.statusText}`);
      }

      const data = await response.json();
      setSeries(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading exercises...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-900">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-800">{error}</p>
          <Button onClick={fetchExercises} variant="outline" className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (series.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Exercises Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No exercises match your current filters. Try adjusting your search criteria.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {series.map((s) => (
        <SeriesCard key={s.seriesId} series={s} />
      ))}
    </div>
  );
}
