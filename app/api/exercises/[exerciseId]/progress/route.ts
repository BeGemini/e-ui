import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { queryOne, query } from '@/lib/db';
import { UserExerciseProgress, UserDictationAttempt } from '@/lib/types';

const LAST_ATTEMPTS_LIMIT = 10;

export async function GET(
  request: NextRequest,
  { params }: { params: { exerciseId: string } }
) {
  try {
    // Verify authentication
    const session = verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const { exerciseId } = params;

    // Fetch user's progress for this exercise
    const progress = await queryOne<UserExerciseProgress>(
      'SELECT * FROM UserExerciseProgress WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    if (!progress) {
      return NextResponse.json(
        { error: 'Progress not found. Please start the exercise first.' },
        { status: 404 }
      );
    }

    // Fetch last 10 attempts for this exercise
    const attempts = await query<UserDictationAttempt>(
      `SELECT * FROM UserDictationAttempt 
       WHERE progressId = ? 
       ORDER BY attemptDate DESC 
       LIMIT ?`,
      [progress.progressId, LAST_ATTEMPTS_LIMIT]
    );

    return NextResponse.json(
      {
        success: true,
        progress,
        attempts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get exercise progress error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
