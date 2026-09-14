'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KnowledgePointList } from '@/app/components/knowledge-point-list/KnowledgePointList';
import type { KnowledgePoint } from '@/lib/types';

interface ExerciseInfo {
  exerciseId: string;
  title: string;
}

export default function KnowledgePointsPage() {
  const params = useParams();
  const router = useRouter();
  const exerciseId = params.exerciseId as string;

  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [exercise, setExercise] = useState<ExerciseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchKnowledgePoints = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`/api/knowledge-points/${exerciseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch knowledge points');
      }

      const data = await response.json();
      setKnowledgePoints(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge points');
    }
  }, [exerciseId, router]);

  const fetchExerciseInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/exercises`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;

      const data = await response.json();
      const series: { seasons: { episodes: { exercises: { exerciseId: string; title: string }[] }[] }[] }[] = data.data || [];

      for (const s of series) {
        for (const season of s.seasons) {
          for (const episode of season.episodes) {
            for (const ex of episode.exercises) {
              if (ex.exerciseId === exerciseId) {
                setExercise({ exerciseId: ex.exerciseId, title: ex.title });
                return;
              }
            }
          }
        }
      }
    } catch {
      // Ignore exercise info errors
    }
  }, [exerciseId]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchKnowledgePoints(), fetchExerciseInfo()]);
      setIsLoading(false);
    };

    if (exerciseId) {
      load();
    }
  }, [exerciseId, fetchKnowledgePoints, fetchExerciseInfo]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading knowledge points...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Knowledge Points</h1>
            {exercise && (
              <p className="text-sm text-gray-600 mt-1">{exercise.title}</p>
            )}
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        <KnowledgePointList
          exerciseId={exerciseId}
          knowledgePoints={knowledgePoints}
          onKnowledgePointsChange={fetchKnowledgePoints}
        />
      </div>
    </div>
  );
}
