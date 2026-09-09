import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { queryOne } from '@/lib/db';
import { Exercise, UserExerciseProgress } from '@/lib/types';

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

    // Fetch exercise
    const exercise = await queryOne<Exercise>(
      'SELECT * FROM Exercise WHERE exerciseId = ?',
      [exerciseId]
    );

    if (!exercise) {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 404 }
      );
    }

    // Fetch user's progress for this exercise
    const progress = await queryOne<UserExerciseProgress>(
      'SELECT * FROM UserExerciseProgress WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    return NextResponse.json(
      {
        success: true,
        exercise,
        progress: progress || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get exercise detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
