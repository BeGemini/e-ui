import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, queryOne, execute, query } from '@/lib/db';
import { UserExerciseProgress, UserDictationAttempt, UserSubtitleConfig } from '@/lib/types';

interface SaveProgressRequest {
  sentenceIndex: number;
  userInput: string;
  accuracy: number;
  wordFeedback: any[];
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

    const body: SaveProgressRequest = await request.json();
    const { sentenceIndex, userInput, accuracy, wordFeedback, isCompleted } = body;

    if (sentenceIndex === undefined || !userInput || accuracy === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: sentenceIndex, userInput, accuracy' },
        { status: 400 }
      );
    }

    const { exerciseId } = await params;

    // Get user's progress for this exercise
    let progress = await queryOne<UserExerciseProgress>(
      'SELECT * FROM UserExerciseProgress WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    if (!progress) {
      return NextResponse.json(
        { error: 'Progress not found. Please start the exercise first.' },
        { status: 404 }
      );
    }

    // Create dictation attempt record
    const attemptId = uuidv4();
    await execute(
      `INSERT INTO UserDictationAttempt (attemptId, progressId, sentenceIndex, userInput, accuracy, wordFeedback, attemptDate)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [attemptId, progress.progressId, sentenceIndex, userInput, accuracy, JSON.stringify(wordFeedback)]
    );

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

    const skippedSentences = config?.skippedSentences
      ? JSON.parse(config.skippedSentences)
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
