import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, queryOne } from '@/lib/db';
import { getOrCreateProgress, upsertAttempt } from '@/lib/dictation-attempts';
import type { SaveAttemptRequest } from '@/lib/types';

/**
 * Save (or overwrite) the learner's answer for one sentence after a successful Check.
 * Does NOT advance currentSentenceIndex and does NOT change completion state.
 */
export async function POST(
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request: body' }, { status: 400 });
    }

    const invalidField = validateSaveAttempt(body);
    if (invalidField) {
      return NextResponse.json(
        { error: `Invalid request: ${invalidField}` },
        { status: 400 }
      );
    }
    const { sentenceIndex, userInput, correctText, accuracy, wordFeedback } =
      body as SaveAttemptRequest;

    const exercise = await queryOne<{ exerciseId: string }>(
      'SELECT exerciseId FROM Exercise WHERE exerciseId = ?',
      [exerciseId]
    );
    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    const progress = await getOrCreateProgress(session.userId, exerciseId);

    await upsertAttempt({
      progressId: progress.progressId,
      sentenceIndex,
      userInput: userInput.trim(),
      correctAnswer: correctText,
      accuracy,
      wordFeedback: wordFeedback ?? [],
    });

    return NextResponse.json(
      { success: true, sentenceIndex, savedAt: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    console.error('Save attempt error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Returns the name of the first invalid field, or null when the body is valid. */
function validateSaveAttempt(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'body';

  const { sentenceIndex, userInput, correctText, accuracy, wordFeedback } =
    body as Record<string, unknown>;

  if (typeof sentenceIndex !== 'number' || !Number.isInteger(sentenceIndex) || sentenceIndex < 0) {
    return 'sentenceIndex';
  }
  if (typeof userInput !== 'string' || userInput.trim() === '') {
    return 'userInput';
  }
  if (typeof correctText !== 'string' || correctText === '') {
    return 'correctText';
  }
  if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100) {
    return 'accuracy';
  }
  if (wordFeedback !== undefined && !Array.isArray(wordFeedback)) {
    return 'wordFeedback';
  }
  return null;
}
