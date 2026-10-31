import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, queryOne, execute, query } from '@/lib/db';
import { getOrCreateProgress, upsertAttempt } from '@/lib/dictation-attempts';
import { UserExerciseProgress, UserDictationAttempt, UserSubtitleConfig, WordFeedback } from '@/lib/types';

interface SaveProgressRequest {
  sentenceIndex: number;
  userInput?: string;
  accuracy: number;
  correctText?: string;
  wordFeedback?: WordFeedback[];
  isCompleted?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    await initializeDatabase();
    
    // Verify authentication
    const session = verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const { exerciseId } = await params;

    const body: SaveProgressRequest = await request.json();
    const { sentenceIndex, userInput, accuracy, correctText, wordFeedback, isCompleted } = body;

    if (sentenceIndex === undefined || accuracy === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: sentenceIndex, accuracy' },
        { status: 400 }
      );
    }

    // Get user's progress for this exercise, creating it if this is the first save
    let progress: UserExerciseProgress | null = await getOrCreateProgress(session.userId, exerciseId);

    // Save the dictation attempt, overwriting any earlier save for this sentence
    await upsertAttempt({
      progressId: progress.progressId,
      sentenceIndex,
      userInput: userInput ?? '',
      correctAnswer: correctText ?? '',
      accuracy,
      wordFeedback: wordFeedback ?? [],
    });

    // Update progress: move to next sentence
    const nextSentenceIndex = sentenceIndex + 1;
    await execute(
      'UPDATE UserExerciseProgress SET currentSentenceIndex = ? WHERE progressId = ?',
      [nextSentenceIndex, progress.progressId]
    );

    // If exercise is completed, calculate overall accuracy and mark as completed
    if (isCompleted) {
      const overallAccuracy = await calculateOverallAccuracy(
        progress.progressId,
        exerciseId,
        session.userId
      );

      await execute(
        'UPDATE UserExerciseProgress SET isCompleted = 1, overallAccuracy = ?, completedDate = NOW() WHERE progressId = ?',
        [overallAccuracy, progress.progressId]
      );
    }

    // Fetch updated progress
    progress = await queryOne<UserExerciseProgress>(
      'SELECT * FROM UserExerciseProgress WHERE progressId = ?',
      [progress.progressId]
    );

    return NextResponse.json(
      {
        success: true,
        message: isCompleted ? 'Exercise completed!' : 'Progress saved',
        progress,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Save progress error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate overall accuracy for completed exercise
 * Excludes skipped sentences from calculation
 */
async function calculateOverallAccuracy(
  progressId: string,
  exerciseId: string,
  userId: string
): Promise<number> {
  try {
    // Get all attempts for this progress
    const attempts = await query<UserDictationAttempt>(
      'SELECT * FROM UserDictationAttempt WHERE progressId = ? ORDER BY sentenceIndex',
      [progressId]
    );

    if (attempts.length === 0) {
      return 0;
    }

    // Get user's subtitle config to know which sentences are skipped
    const config = await queryOne<UserSubtitleConfig>(
      'SELECT * FROM UserSubtitleConfig WHERE userId = ? AND exerciseId = ?',
      [userId, exerciseId]
    );

    // mysql2 returns JSON columns already parsed; handle both shapes
    const rawSkipped = config?.skippedSentences as unknown;
    const skippedSentences: number[] = Array.isArray(rawSkipped)
      ? rawSkipped
      : typeof rawSkipped === 'string'
        ? JSON.parse(rawSkipped)
        : [];

    // Calculate average accuracy, excluding skipped sentences
    let totalAccuracy = 0;
    let countedAttempts = 0;

    for (const attempt of attempts) {
      // Skip this attempt if sentence was skipped by user
      if (!skippedSentences.includes(attempt.sentenceIndex)) {
        totalAccuracy += attempt.accuracy;
        countedAttempts++;
      }
    }

    if (countedAttempts === 0) {
      return 0;
    }

    return Math.round(totalAccuracy / countedAttempts);
  } catch (error) {
    console.error('Error calculating overall accuracy:', error);
    return 0;
  }
}
