import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, queryOne, query } from '@/lib/db';
import { Exercise, UserSubtitleConfig, ParsedSubtitle, UserExerciseProgress } from '@/lib/types';
import { downloadFile, getSignedUrl } from '@/lib/cos-client';
import { parseSubtitles, detectSubtitleFormat } from '@/lib/subtitle-parser';

interface ExerciseWithSubtitles extends Exercise {
  videoUrl: string;
  subtitles: ParsedSubtitle[];
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
    let processedSubtitles = subtitles;

    if (userConfig && subtitles.length > 0) {
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

      // Apply merged groups
      if (mergedGroups.length > 0) {
        processedSubtitles = applyMergedGroups(processedSubtitles, mergedGroups);
      }

      // Apply skipped sentences
      if (skippedSentences.length > 0) {
        processedSubtitles = processedSubtitles.filter(
          (sub) => !skippedSentences.includes(sub.index - 1)
        );
        
        // Re-index after filtering to maintain correct array positions
        processedSubtitles = processedSubtitles.map((sub, idx) => ({
          ...sub,
          index: idx + 1,
        }));
      }
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

/**
 * Apply merged groups to subtitles
 * Combines multiple subtitles into single entries
 */
function applyMergedGroups(
  subtitles: ParsedSubtitle[],
  mergedGroups: Array<{ start: number; end: number; label?: string }>
): ParsedSubtitle[] {
  const result: ParsedSubtitle[] = [];
  const merged = new Set<number>();

  // Process merged groups
  for (const group of mergedGroups) {
    const groupSubtitles = subtitles.filter(
      (sub) => sub.index - 1 >= group.start && sub.index - 1 <= group.end
    );

    if (groupSubtitles.length > 0) {
      const mergedText = groupSubtitles.map((s) => s.text).join('\n');
      const startTime = groupSubtitles[0].startTime;
      const endTime = groupSubtitles[groupSubtitles.length - 1].endTime;
      const startSeconds = groupSubtitles[0].startSeconds;
      const endSeconds = groupSubtitles[groupSubtitles.length - 1].endSeconds;

      result.push({
        index: result.length + 1,
        startTime,
        endTime,
        startSeconds,
        endSeconds,
        text: mergedText,
      });

      // Mark these indices as merged
      for (let i = group.start; i <= group.end; i++) {
        merged.add(i);
      }
    }
  }

  // Add non-merged subtitles
  for (const sub of subtitles) {
    if (!merged.has(sub.index - 1)) {
      result.push({
        ...sub,
        index: result.length + 1,
      });
    }
  }

  return result;
}
