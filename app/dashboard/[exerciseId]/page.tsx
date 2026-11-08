'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Captions, History, NotebookText, Play } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">
            {exercise.title}
          </h1>
          <Button
            variant="outline"
            size="icon"
            aria-label="Back"
            title="Back"
            onClick={() => router.back()}
          >
            <ArrowLeft />
          </Button>
        </header>
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
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleStartPractice}
              size="icon"
              aria-label="Start Practice"
              title="Start Practice"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Play />
            </Button>
            <Button
              onClick={handleCustomizeSubtitles}
              variant="outline"
              size="icon"
              aria-label="Customize Subtitles"
              title="Customize Subtitles"
              className="border-gray-300 hover:bg-gray-100"
            >
              <Captions />
            </Button>
            <Button
              onClick={handleViewHistory}
              variant="outline"
              size="icon"
              aria-label="View History"
              title="View History"
              className="border-gray-300 hover:bg-gray-100"
            >
              <History />
            </Button>
            <Button
              onClick={() => router.push(`/dashboard/${exerciseId}/sentences`)}
              variant="outline"
              size="icon"
              aria-label="My Sentences"
              title="My Sentences"
              className="border-gray-300 hover:bg-gray-100"
            >
              <NotebookText />
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
