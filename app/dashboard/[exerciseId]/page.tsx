'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
        setExercise(data);
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

  const handleStartPractice = async () => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/exercises/${exerciseId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push(`/dashboard/${exerciseId}/practice`);
    } catch (err) {
      console.error('Failed to start practice:', err);
      setError('Failed to start practice');
    }
  };

  const handleCustomizeSubtitles = () => {
    router.push(`/dashboard/${exerciseId}/subtitles`);
  };

  const handleViewHistory = () => {
    router.push(`/dashboard/${exerciseId}/complete`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
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
      <div className="flex min-h-screen items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="border-b bg-white shadow">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-3"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {exercise.title}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="p-8 mb-8">
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
                  <p className="text-gray-900">MP4/WebM</p>
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
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Your Progress
                </p>
                <div className="space-y-2 text-sm text-blue-700">
                  <p>
                    Current Position:{' '}
                    <span className="font-semibold">
                      Sentence {exercise.userProgress.currentSentenceIndex + 1}
                    </span>
                  </p>
                  {exercise.userProgress.isCompleted && (
                    <p className="text-green-700 font-medium">
                      ✓ Completed
                    </p>
                  )}
                  {exercise.userProgress.overallAccuracy && (
                    <p>
                      Best Accuracy:{' '}
                      <span className="font-semibold">
                        {exercise.userProgress.overallAccuracy.toFixed(1)}%
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleStartPractice}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Start Practice
          </Button>
          <Button
            onClick={handleCustomizeSubtitles}
            variant="outline"
            className="flex-1 border-gray-300 hover:bg-gray-100"
          >
            Customize Subtitles
          </Button>
          <Button
            onClick={handleViewHistory}
            variant="outline"
            className="flex-1 border-gray-300 hover:bg-gray-100"
          >
            View History
          </Button>
        </div>
      </main>
    </div>
  );
}
