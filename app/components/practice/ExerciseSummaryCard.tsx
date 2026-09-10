'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ExerciseSummaryCardProps {
  overallAccuracy: number;
  completionDate: string;
  totalSentences: number;
  timeSpent: number;
  onRetake: () => void;
  onViewHistory: () => void;
}

export function ExerciseSummaryCard({
  overallAccuracy,
  completionDate,
  totalSentences,
  timeSpent,
  onRetake,
  onViewHistory,
}: ExerciseSummaryCardProps) {
  const getAccuracyLevel = () => {
    if (overallAccuracy >= 90) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (overallAccuracy >= 80) return { label: 'Very Good', color: 'text-green-600', bg: 'bg-green-50' };
    if (overallAccuracy >= 70) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (overallAccuracy >= 60) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { label: 'Needs Practice', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const accuracyLevel = getAccuracyLevel();
  const formattedTime = Math.round(timeSpent / 60);

  return (
    <Card className={`p-6 ${accuracyLevel.bg} border-0`}>
      <div className="space-y-6">
        {/* Accuracy Display */}
        <div className="text-center">
          <div className="mb-2">
            <span className={`text-5xl font-bold ${accuracyLevel.color}`}>
              {overallAccuracy}%
            </span>
          </div>
          <p className={`text-lg font-semibold ${accuracyLevel.color}`}>
            {accuracyLevel.label}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Overall Accuracy</span>
            <span className="font-medium text-gray-900">{overallAccuracy}%</span>
          </div>
          <Progress value={overallAccuracy} className="h-3" />
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-white/50 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{totalSentences}</p>
            <p className="text-xs text-gray-600">Total Sentences</p>
          </div>
          <div className="rounded-lg bg-white/50 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{formattedTime}m</p>
            <p className="text-xs text-gray-600">Time Spent</p>
          </div>
          <div className="rounded-lg bg-white/50 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {new Date(completionDate).toLocaleDateString()}
            </p>
            <p className="text-xs text-gray-600">Completed</p>
          </div>
        </div>

        {/* Completion Date */}
        <div className="rounded-lg bg-white/50 p-3 text-center text-sm text-gray-700">
          Completed on {new Date(completionDate).toLocaleString()}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onViewHistory}
            className="flex-1"
          >
            View History
          </Button>
          <Button
            onClick={onRetake}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Retake Exercise
          </Button>
        </div>
      </div>
    </Card>
  );
}
