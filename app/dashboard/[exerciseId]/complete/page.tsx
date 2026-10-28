'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ExerciseSummaryCard } from '@/app/components/practice/ExerciseSummaryCard';
import { AttemptHistory } from '@/app/components/practice/AttemptHistory';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Attempt {
  attemptId: string;
  timestamp: string;
  accuracy: number;
  completedSentences: number;
  totalSentences: number;
  duration: number;
}

interface CompletionData {
  exerciseId: string;
  exerciseTitle: string;
  overallAccuracy: number;
  completionDate: string;
  totalSentences: number;
  timeSpent: number;
  attempts: Attempt[];
}

export default function ExerciseCompletionPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const exerciseId = params.exerciseId as string;

  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const fetchCompletionData = async () => {
      try {
        setIsLoading(true);

        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/');
          return;
        }
        const authHeaders = { Authorization: `Bearer ${token}` };

        // Get latest progress
        const progressRes = await fetch(`/api/exercises/${exerciseId}/progress`, {
          headers: authHeaders,
        });
        if (!progressRes.ok) throw new Error('Failed to load progress data');
        const progressData = await progressRes.json();
        const progress = progressData.progress ?? {};

        // Get exercise metadata
        const exerciseRes = await fetch(`/api/exercises/${exerciseId}`, {
          headers: authHeaders,
        });
        if (!exerciseRes.ok) throw new Error('Failed to load exercise data');
        const exerciseData = await exerciseRes.json();
        const exercise = exerciseData.exercise ?? {};
        const totalSentences = exercise.totalSentences ?? 0;

        setCompletionData({
          exerciseId,
          exerciseTitle: exercise.title ?? '',
          overallAccuracy: Number(progress.overallAccuracy) || 0,
          completionDate: progress.completedDate || new Date().toISOString(),
          totalSentences,
          timeSpent: progress.totalTimeSpent || 0,
          // API returns per-sentence attempts; adapt them to the summary shape
          attempts: (progressData.attempts || []).map((attempt: any) => ({
            attemptId: attempt.attemptId,
            timestamp: attempt.attemptDate,
            accuracy: Number(attempt.accuracy) || 0,
            completedSentences: (attempt.sentenceIndex ?? 0) + 1,
            totalSentences,
            duration: 0,
          })),
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load completion data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (exerciseId) {
      fetchCompletionData();
    }
  }, [exerciseId, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading completion details...</p>
        </div>
      </div>
    );
  }

  if (!completionData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Unable to load completion data</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Celebration Header */}
        <div className="text-center space-y-3">
          <div className="text-6xl mb-2">🎉</div>
          <h1 className="text-4xl font-bold text-green-600">Congratulations!</h1>
          <p className="text-xl text-gray-600">
            You have completed <strong>{completionData.exerciseTitle}</strong>
          </p>
        </div>

        {/* Summary Card */}
        <ExerciseSummaryCard
          overallAccuracy={Math.round(completionData.overallAccuracy)}
          completionDate={completionData.completionDate}
          totalSentences={completionData.totalSentences}
          timeSpent={completionData.timeSpent}
          onRetake={() => {
            router.push(`/dashboard/${exerciseId}/practice`);
          }}
          onViewHistory={() => {
            setShowHistory(!showHistory);
          }}
        />

        {/* Attempt History Section */}
        {showHistory && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Your Progress</h2>
            <AttemptHistory attempts={completionData.attempts} />
          </div>
        )}

        {/* Statistics Grid */}
        {!showHistory && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-white border border-gray-200 p-4 text-center">
              <p className="text-sm text-gray-600">Total Attempts</p>
              <p className="text-3xl font-bold text-gray-900">{completionData.attempts.length}</p>
            </div>
            <div className="rounded-lg bg-white border border-gray-200 p-4 text-center">
              <p className="text-sm text-gray-600">Best Accuracy</p>
              <p className="text-3xl font-bold text-green-600">
                {completionData.attempts.length > 0
                  ? Math.max(...completionData.attempts.map((a) => a.accuracy))
                  : 0}
                %
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4">
          <Button
            size="lg"
            onClick={() => router.push('/dashboard')}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Back to Dashboard
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push(`/dashboard/${exerciseId}`)}
            className="w-full"
          >
            View Exercise Details
          </Button>
        </div>

        {/* Encouragement Message */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-center">
          <p className="text-sm text-blue-900">
            <strong>Great job!</strong> Keep practicing to improve your listening comprehension.
            You can retake this exercise anytime to beat your score! 📚
          </p>
        </div>
      </div>
    </div>
  );
}
