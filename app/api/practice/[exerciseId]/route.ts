import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, queryOne } from '@/lib/db';
import { Exercise, UserSubtitleConfig, ParsedSubtitle, EffectiveSubtitle, UserExerciseProgress } from '@/lib/types';
import { downloadFile } from '@/lib/cos-client';
import { parseSubtitles, detectSubtitleFormat } from '@/lib/subtitle-parser';
import { applySubtitleConfig, SubtitleConfigInput } from '@/lib/utils';

interface ExerciseWithSubtitles extends Exercise {
  videoUrl: string;
  subtitles: EffectiveSubtitle[];
  userConfig?: UserSubtitleConfig | null;
  userProgress?: {
    currentSentenceIndex: number;
    isCompleted: boolean;
  } | null;
}

export async function GET(
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

    // Await params to unwrap the Promise (Next.js 16+)
    const { exerciseId } = await params;

    // Check for raw subtitle request (used by subtitle editor)
    const { searchParams } = new URL(request.url);
    const rawSubtitlesRequested = searchParams.get('raw') === 'true';

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

    // Generate proxy URL for video with auth token
    // Client will add token query parameter when fetching
    const videoUrl = `/api/video/${exercise.videoUrl}`;

    // Fetch subtitles from COS
    let subtitles: ParsedSubtitle[] = [];
    try {
      const subtitleContent = await downloadFile(exercise.subtitleUrl);
      const format = detectSubtitleFormat(exercise.subtitleUrl);

      if (format && subtitleContent) {
        // Convert Buffer to string
        const contentStr = typeof subtitleContent === 'string' 
          ? subtitleContent 
          : subtitleContent.toString('utf-8');
        subtitles = parseSubtitles(contentStr, format);
      }
    } catch (error) {
      console.error('Error fetching subtitles:', error);
      // Continue without subtitles if fetch fails
    }

    // Fetch user's subtitle configuration
    const userConfig = await queryOne<UserSubtitleConfig>(
      'SELECT * FROM UserSubtitleConfig WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    // Fetch user's exercise progress
    const userProgress = await queryOne<UserExerciseProgress>(
      'SELECT * FROM UserExerciseProgress WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    // Apply user's subtitle configuration (merge/skip)
    let processedSubtitles: EffectiveSubtitle[] = subtitles.map((sub, idx) => ({
      ...sub,
      index: idx,
      originalIndices: [idx],
      isMerged: false,
      isSkipped: false,
    }));

    if (!rawSubtitlesRequested && userConfig && subtitles.length > 0) {
      // Get merged groups and skipped sentences from JSON columns
      // MySQL JSON fields are already parsed, so check if they're strings or objects
      const mergedGroupsRaw = userConfig.mergedGroups;
      const skippedSentencesRaw = userConfig.skippedSentences;

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

      processedSubtitles = applySubtitleConfig(subtitles, configInput, { omitSkipped: true });
    }

    const result: ExerciseWithSubtitles = {
      ...exercise,
      videoUrl,
      subtitles: processedSubtitles,
      userConfig: userConfig || null,
      userProgress: userProgress ? {
        currentSentenceIndex: userProgress.currentSentenceIndex,
        isCompleted: userProgress.isCompleted,
      } : {
        currentSentenceIndex: 0,
        isCompleted: false,
      },
    };

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get practice data error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


