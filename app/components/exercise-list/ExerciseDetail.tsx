'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Play, RotateCcw, BookOpen } from 'lucide-react';

interface Exercise {
  exerciseId: string;
  title: string;
  completed?: boolean;
  currentProgress?: number;
  totalSentences?: number;
  knowledgePointCount?: number;
}

interface ExerciseDetailProps {
  exercise: Exercise;
}

export default function ExerciseDetail({ exercise }: ExerciseDetailProps) {
  const router = useRouter();

  const handleStartPractice = () => {
    router.push(`/dashboard/${exercise.exerciseId}/practice`);
  };

  const handleViewDetails = () => {
    router.push(`/dashboard/${exercise.exerciseId}`);
  };

  const handleViewKnowledgePoints = () => {
    router.push(`/dashboard/${exercise.exerciseId}/knowledge-points`);
  };

  const isStarted = (exercise.currentProgress ?? 0) > 0;
  const isCompleted = exercise.completed;
  const progressPercent =
    exercise.totalSentences && exercise.currentProgress
      ? (exercise.currentProgress / exercise.totalSentences) * 100
      : 0;

  return (
    <div className="rounded-md border p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <button
            onClick={handleViewDetails}
            className="text-left hover:text-blue-600 focus:text-blue-600 transition-colors w-full flex items-center gap-2"
          >
            <span className="text-sm font-medium truncate underline">{exercise.title}</span>
            {isCompleted && <Badge className="bg-green-100 text-green-800 text-xs">Completed</Badge>}
            {isStarted && !isCompleted && (
              <Badge className="bg-blue-100 text-blue-800 text-xs">In Progress</Badge>
            )}
          </button>
          {isStarted && !isCompleted && (
            <div className="mt-2 space-y-1">
              <Progress value={progressPercent} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {exercise.currentProgress} / {exercise.totalSentences} sentences
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleViewKnowledgePoints}
            className="flex items-center gap-1"
            title="Knowledge points"
          >
            <BookOpen className="h-3 w-3" />
            <span>{exercise.knowledgePointCount ?? 0}</span>
          </Button>
          <Button
            size="sm"
            onClick={handleStartPractice}
            variant={isStarted ? 'outline' : 'default'}
          >
            {isStarted ? (
              <>
                <RotateCcw className="h-3 w-3 mr-1" />
                Resume
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                Start
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
