import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, queryOne } from '@/lib/db';
import { listMySentences } from '@/lib/dictation-attempts';
import type { MySentencesResponse } from '@/lib/types';

/**
 * List the current learner's saved sentences for an exercise ("My Sentences").
 * Always scoped to the session user; no userId parameter is accepted.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    await initializeDatabase();

    const session = verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const { exerciseId } = await params;

    const exercise = await queryOne<{ exerciseId: string; title: string }>(
      'SELECT exerciseId, title FROM Exercise WHERE exerciseId = ?',
      [exerciseId]
    );
    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    const sentences = await listMySentences(session.userId, exerciseId);

    const response: MySentencesResponse = {
      success: true,
      exercise: { exerciseId: exercise.exerciseId, title: exercise.title },
      sentences,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Get my sentences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
