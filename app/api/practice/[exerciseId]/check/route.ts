import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, queryOne } from '@/lib/db';
import { Exercise } from '@/lib/types';
import { checkAccuracy } from '@/lib/accuracy';
import { downloadFile } from '@/lib/cos-client';
import { parseSubtitles, detectSubtitleFormat } from '@/lib/subtitle-parser';

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

    const body = await request.json();
    const { userInput, sentenceIndex } = body;

    if (!userInput || typeof userInput !== 'string' || sentenceIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: userInput, sentenceIndex' },
        { status: 400 }
      );
    }

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

    // Fetch subtitles from COS
    let subtitles: any[] = [];
    try {
      const subtitleContent = await downloadFile(exercise.subtitleUrl);
      const format = detectSubtitleFormat(exercise.subtitleUrl);

      if (format && subtitleContent) {
        const contentStr = typeof subtitleContent === 'string' ? subtitleContent : subtitleContent.toString('utf-8');
        subtitles = parseSubtitles(contentStr, format);
      }
    } catch (error) {
      console.error('Error fetching subtitles:', error);
      return NextResponse.json(
        { error: 'Could not fetch subtitle content' },
        { status: 500 }
      );
    }

    // Validate sentence index
    if (sentenceIndex < 0 || sentenceIndex >= subtitles.length) {
      return NextResponse.json(
        { error: `Invalid sentence index: ${sentenceIndex}. Exercise has ${subtitles.length} sentences.` },
        { status: 400 }
      );
    }

    // Get correct text for this sentence
    const correctText = subtitles[sentenceIndex]?.text;

    if (!correctText) {
      return NextResponse.json(
        { error: 'Correct text not found for this sentence' },
        { status: 400 }
      );
    }

    // Calculate accuracy
    const result = checkAccuracy(userInput, correctText);

    // Note: NOT saving to database here - that's done in save-progress endpoint
    // This endpoint is only for checking and getting feedback

    return NextResponse.json(
      {
        success: true,
        sentenceIndex,
        userInput,
        correctText,
        accuracy: result.accuracy,
        wordFeedback: result.wordFeedback,
        summary: result.summary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Check accuracy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
