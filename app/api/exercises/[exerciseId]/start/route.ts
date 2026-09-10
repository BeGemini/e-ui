import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, queryOne, execute } from '@/lib/db';
import { Exercise, UserExerciseProgress } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    await initializeDatabase();
    
    const { exerciseId } = await params;
    
    // Verify authentication
    const session = verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    // Check if exercise exists
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

    // Check if user already has progress for this exercise
    let progress = await queryOne<UserExerciseProgress>(
      'SELECT * FROM UserExerciseProgress WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    if (progress) {
      // Return existing progress
      return NextResponse.json(
        {
          success: true,
          message: 'Resuming existing exercise progress',
          progress,
        },
        { status: 200 }
      );
    }

    // Create new progress record
    const progressId = uuidv4();
    await execute(
      `INSERT INTO UserExerciseProgress (progressId, userId, exerciseId, currentSentenceIndex, isCompleted)
       VALUES (?, ?, ?, 0, 0)`,
      [progressId, session.userId, exerciseId]
    );

    // Fetch the newly created progress record
    progress = await queryOne<UserExerciseProgress>(
      'SELECT * FROM UserExerciseProgress WHERE progressId = ?',
      [progressId]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Exercise started',
        progress,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Start exercise error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
