import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, queryOne } from '@/lib/db';
import { Exercise, UserSubtitleConfig } from '@/lib/types';
import { checkAccuracy } from '@/lib/accuracy';
import { downloadFile } from '@/lib/cos-client';
import { parseSubtitles, detectSubtitleFormat } from '@/lib/subtitle-parser';
import { applySubtitleConfig, SubtitleConfigInput } from '@/lib/utils';

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
    let rawSubtitles: ReturnType<typeof parseSubtitles> = [];
    try {
      const subtitleContent = await downloadFile(exercise.subtitleUrl);
      const format = detectSubtitleFormat(exercise.subtitleUrl);

      if (format && subtitleContent) {
        const contentStr = typeof subtitleContent === 'string' ? subtitleContent : subtitleContent.toString('utf-8');
        rawSubtitles = parseSubtitles(contentStr, format);
      }
    } catch (error) {
      console.error('Error fetching subtitles:', error);
      return NextResponse.json(
        { error: 'Could not fetch subtitle content' },
        { status: 500 }
      );
    }

    // Fetch user's subtitle configuration
    const userConfig = await queryOne<UserSubtitleConfig>(
      'SELECT * FROM UserSubtitleConfig WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    const mergedGroupsRaw = userConfig?.mergedGroups;
    const skippedSentencesRaw = userConfig?.skippedSentences;

    const mergedGroups = typeof mergedGroupsRaw === 'string'
      ? (mergedGroupsRaw ? JSON.parse(mergedGroupsRaw) : [])
      : (Array.isArray(mergedGroupsRaw) ? mergedGroupsRaw : []);

    const skippedSentences = typeof skippedSentencesRaw === 'string'
      ? (skippedSentencesRaw ? JSON.parse(skippedSentencesRaw) : [])
      : (Array.isArray(skippedSentencesRaw) ? skippedSentencesRaw : []);

    const configInput: SubtitleConfigInput = {
      mergedGroups,
      skippedSentences,
    };

    const effectiveSubtitles = applySubtitleConfig(rawSubtitles, configInput, { omitSkipped: true });

    // Validate sentence index
    if (sentenceIndex < 0 || sentenceIndex >= effectiveSubtitles.length) {
      return NextResponse.json(
        { error: `Invalid sentence index: ${sentenceIndex}. Exercise has ${effectiveSubtitles.length} active sentences.` },
        { status: 400 }
      );
    }

    // Get correct text for this sentence
    const correctText = effectiveSubtitles[sentenceIndex]?.text;

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
