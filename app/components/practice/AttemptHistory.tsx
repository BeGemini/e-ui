'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface Attempt {
  attemptId: string;
  timestamp: string;
  accuracy: number;
  completedSentences: number;
  totalSentences: number;
  duration: number;
}

interface AttemptHistoryProps {
  attempts: Attempt[];
}

export function AttemptHistory({ attempts }: AttemptHistoryProps) {
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-green-600';
    if (accuracy >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyBg = (accuracy: number) => {
    if (accuracy >= 80) return 'bg-green-50';
    if (accuracy >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  if (attempts.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">No previous attempts found</p>
        </div>
      </Card>
    );
  }

  // Sort attempts by date (newest first)
  const sortedAttempts = [...attempts].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Attempt History</h3>

      <div className="space-y-2">
        {sortedAttempts.map((attempt) => (
          <Collapsible key={attempt.attemptId}>
            <CollapsibleTrigger asChild>
              <button className={`w-full rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50 transition-colors ${getAccuracyBg(attempt.accuracy)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {new Date(attempt.timestamp).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(attempt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{attempt.completedSentences}/{attempt.totalSentences} sentences</span>
                      <span>{Math.round(attempt.duration / 60)}m {attempt.duration % 60}s</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-bold ${getAccuracyColor(attempt.accuracy)}`}>
                      {attempt.accuracy}%
                    </span>
                    <span className="text-gray-400">›</span>
                  </div>
                </div>
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="bg-gray-50 border border-t-0 border-gray-200 rounded-b-lg p-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Completed Sentences</p>
                    <p className="text-lg font-bold text-gray-900">
                      {attempt.completedSentences}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Accuracy</p>
                    <p className={`text-lg font-bold ${getAccuracyColor(attempt.accuracy)}`}>
                      {attempt.accuracy}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="text-lg font-bold text-gray-900">
                      {Math.round(attempt.duration / 60)}m {attempt.duration % 60}s
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date & Time</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(attempt.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                {attempt.completedSentences < attempt.totalSentences && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="text-sm text-amber-900">
                      This attempt was incomplete ({attempt.completedSentences}/{attempt.totalSentences} sentences).
                    </p>
                  </div>
                )}

                <div className="text-xs text-gray-500 text-right">
                  ID: {attempt.attemptId.substring(0, 8)}...
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </Card>
  );
}
