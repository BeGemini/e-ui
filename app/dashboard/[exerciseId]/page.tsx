'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isExternalVideoUrl } from '@/lib/utils';

export default function ExerciseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const exerciseId = params?.exerciseId as string;

  const [exercise, setExercise] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      try {
        // Fetch exercise details
        const res = await fetch(`/api/exercises/${exerciseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setError('Failed to load exercise');
          return;
        }

        const data = await res.json();
        setExercise(
          data.exercise ? { ...data.exercise, userProgress: data.progress } : null
        );
      } catch (err) {
        console.error('Failed to load exercise:', err);
        setError('Error loading exercise');
      } finally {
        setIsLoading(false);
      }
    };

    if (exerciseId) {
      checkAuth();
    }
  }, [exerciseId, router]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="max-w-md p-6">
          <div className="text-center">
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-600">Exercise not found</p>
      </div>
    );
  }

  // Get difficulty color
  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  };

  return (
    <div className="flex-1 bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-4xl space-y-6">
        <Card className="p-8">
          <div className="space-y-6">
            {/* Difficulty Badge */}
            <div>
              <Badge
                className={`${
                  difficultyColors[exercise.difficulty] ||
                  'bg-gray-100 text-gray-800'
                }`}
              >
                {exercise.difficulty?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>

            {/* Description */}
            {exercise.description && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Description
                </h2>
                <p className="text-gray-600">{exercise.description}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {exercise.videoUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Video Format
                  </p>
                  <p className="text-gray-900">
                    {isExternalVideoUrl(exercise.videoUrl) ? 'HLS (TED)' : 'MP4/WebM'}
                  </p>
                </div>
              )}
              {exercise.subtitleFormat && (
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Subtitle Format
                  </p>
                  <p className="text-gray-900 uppercase">
                    {exercise.subtitleFormat}
                  </p>
                </div>
              )}
            </div>

            {/* User Progress */}
            {exercise.userProgress && (
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="flex items-center gap-4">
                  {(() => {
                    const total = exercise.totalSentences ?? 0;
                    const current = exercise.userProgress.currentSentenceIndex;
                    const percent = exercise.userProgress.isCompleted
                      ? 100
                      : total > 0
                        ? Math.round((current / total) * 100)
                        : 0;

                    return (
                      <div className="relative h-16 w-16 shrink-0">
                        <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                          <circle
                            cx="18"
                            cy="18"
                            r="15.9155"
                            fill="none"
                            stroke="#dbeafe"
                            strokeWidth="3"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="15.9155"
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${percent} ${100 - percent}`}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-blue-900">
                          {percent}%
                        </span>
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Your Progress
                    </p>
                    <div className="space-y-2 text-sm text-blue-700">
                      <p>
                        Current Position:{' '}
                        <span className="font-semibold">
                          Sentence {exercise.userProgress.currentSentenceIndex + 1} of{' '}
                          {exercise.totalSentences}
                        </span>
                      </p>
                      {Boolean(exercise.userProgress.isCompleted) && (
                        <p className="text-green-700 font-medium">
                          ✓ Completed
                        </p>
                      )}
                      {exercise.userProgress.overallAccuracy != null && (
                        <p>
                          Best Accuracy:{' '}
                          <span className="font-semibold">
                            {Number(exercise.userProgress.overallAccuracy).toFixed(1)}%
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
