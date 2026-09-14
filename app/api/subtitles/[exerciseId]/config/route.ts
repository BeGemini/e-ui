import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, queryOne, execute } from '@/lib/db';
import { UserExerciseProgress, UserSubtitleConfig, Exercise, MergeGroup } from '@/lib/types';
import { downloadFile } from '@/lib/cos-client';
import { parseSubtitles, detectSubtitleFormat } from '@/lib/subtitle-parser';
import { applySubtitleConfig, SubtitleConfigInput } from '@/lib/utils';

function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

/**
 * GET /api/subtitles/[exerciseId]/config
 * Retrieve user's subtitle configuration for an exercise
 */
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

    const { exerciseId } = await params;

    // Get user's progress for this exercise to know currentProgress
    const progress = await queryOne<UserExerciseProgress>(
      'SELECT * FROM UserExerciseProgress WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    // Get user's subtitle configuration
    let config = await queryOne<UserSubtitleConfig>(
      'SELECT * FROM UserSubtitleConfig WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    // If no config exists, create a default one
    if (!config) {
      const configId = uuidv4();
      await execute(
        `INSERT INTO UserSubtitleConfig (configId, userId, exerciseId, mergedGroups, skippedSentences, effectiveSentenceCount, createdDate)
         VALUES (?, ?, ?, '[]', '[]', NULL, NOW())`,
        [configId, session.userId, exerciseId]
      );

      config = await queryOne<UserSubtitleConfig>(
        'SELECT * FROM UserSubtitleConfig WHERE configId = ?',
        [configId]
      );
    }

    return NextResponse.json(
      {
        success: true,
        config,
        currentProgress: progress?.currentSentenceIndex ?? 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get subtitle config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/subtitles/[exerciseId]/config
 * Update user's subtitle configuration
 */
export async function PUT(
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
    const { mergedGroups, skippedSentences } = body;

    // Get user's progress to enforce read-only constraint
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

    const currentProgress = progress.currentSentenceIndex;

    // Load existing config so unchanged existing items can be re-saved
    // even if they overlap with already-completed sentences.
    const existingConfig = await queryOne<UserSubtitleConfig>(
      'SELECT * FROM UserSubtitleConfig WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    const existingGroups: MergeGroup[] = existingConfig
      ? safeParseJson<MergeGroup[]>(existingConfig.mergedGroups, [])
      : [];
    const existingSkipped: number[] = existingConfig
      ? safeParseJson<number[]>(existingConfig.skippedSentences, [])
      : [];

    const existingGroupKey = (group: MergeGroup) => {
      const startIndex = group.startIndex ?? group.start;
      const endIndex = group.endIndex ?? group.end;
      return `${startIndex}-${endIndex}-${group.label ?? ''}-${group.customText ?? ''}`;
    };
    const existingGroupKeys = new Set(existingGroups.map(existingGroupKey));
    const existingSkippedSet = new Set(existingSkipped);

    // Validate merged groups don't modify already completed sentences
    if (mergedGroups && Array.isArray(mergedGroups)) {
      for (const group of mergedGroups) {
        const startIndex = group.startIndex ?? group.start;
        const endIndex = group.endIndex ?? group.end;

        if (startIndex > endIndex) {
          return NextResponse.json(
            { error: `Merge group start (${startIndex}) must be <= end (${endIndex}).` },
            { status: 400 }
          );
        }

        if (group.customText !== undefined && group.customText.trim().length === 0) {
          return NextResponse.json(
            { error: 'customText cannot be empty when provided.' },
            { status: 400 }
          );
        }

        // Only enforce read-only for new or changed merge groups
        const normalizedGroup: MergeGroup = {
          startIndex,
          endIndex,
          label: group.label,
          customText: group.customText,
        };
        const isExistingUnchanged = existingGroupKeys.has(existingGroupKey(normalizedGroup));
        if (!isExistingUnchanged && startIndex < currentProgress) {
          return NextResponse.json(
            { error: `Cannot modify merge group starting at sentence ${startIndex}. Already completed up to sentence ${currentProgress - 1}. Read-only constraint enforced.` },
            { status: 400 }
          );
        }
      }

      // Validate no overlapping groups
      const sortedGroups = [...mergedGroups].sort(
        (a, b) => (a.startIndex ?? a.start) - (b.startIndex ?? b.start)
      );
      for (let i = 0; i < sortedGroups.length; i++) {
        for (let j = i + 1; j < sortedGroups.length; j++) {
          const g1 = sortedGroups[i];
          const g2 = sortedGroups[j];
          const g1Start = g1.startIndex ?? g1.start;
          const g1End = g1.endIndex ?? g1.end;
          const g2Start = g2.startIndex ?? g2.start;
          if (g1Start <= g2Start && g2Start <= g1End) {
            return NextResponse.json(
              { error: 'Merge groups cannot overlap' },
              { status: 400 }
            );
          }
        }
      }
    }

    // Validate skipped sentences don't modify already completed sentences
    if (skippedSentences && Array.isArray(skippedSentences)) {
      for (const sentenceIndex of skippedSentences) {
        // Only enforce read-only for newly added skips
        if (!existingSkippedSet.has(sentenceIndex) && sentenceIndex < currentProgress) {
          return NextResponse.json(
            { error: `Cannot skip sentence ${sentenceIndex}. Already completed up to sentence ${currentProgress - 1}. Read-only constraint enforced.` },
            { status: 400 }
          );
        }
      }
    }

    // Compute effective sentence count from raw subtitles + new config
    const effectiveSentenceCount = await computeEffectiveSentenceCount(
      exerciseId,
      mergedGroups || [],
      skippedSentences || []
    );

    // Get or create config
    let config = await queryOne<UserSubtitleConfig>(
      'SELECT * FROM UserSubtitleConfig WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    if (!config) {
      const configId = uuidv4();
      await execute(
        `INSERT INTO UserSubtitleConfig (configId, userId, exerciseId, mergedGroups, skippedSentences, effectiveSentenceCount, createdDate)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          configId,
          session.userId,
          exerciseId,
          JSON.stringify(mergedGroups || []),
          JSON.stringify(skippedSentences || []),
          effectiveSentenceCount,
        ]
      );

      config = await queryOne<UserSubtitleConfig>(
        'SELECT * FROM UserSubtitleConfig WHERE configId = ?',
        [configId]
      );
    } else {
      // Update existing config
      await execute(
        `UPDATE UserSubtitleConfig 
         SET mergedGroups = ?, skippedSentences = ?, effectiveSentenceCount = ?, updatedDate = NOW()
         WHERE userId = ? AND exerciseId = ?`,
        [
          JSON.stringify(mergedGroups || []),
          JSON.stringify(skippedSentences || []),
          effectiveSentenceCount,
          session.userId,
          exerciseId,
        ]
      );

      config = await queryOne<UserSubtitleConfig>(
        'SELECT * FROM UserSubtitleConfig WHERE userId = ? AND exerciseId = ?',
        [session.userId, exerciseId]
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Subtitle configuration updated. Changes will apply to next playback.',
        config,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update subtitle config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/subtitles/[exerciseId]/config
 * Reset subtitle configuration to defaults
 */
export async function DELETE(
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

    // Reset config to defaults
    await execute(
      `UPDATE UserSubtitleConfig 
       SET mergedGroups = '[]', skippedSentences = '[]', effectiveSentenceCount = NULL, updatedDate = NOW()
       WHERE userId = ? AND exerciseId = ?`,
      [session.userId, exerciseId]
    );

    // Fetch updated config
    const config = await queryOne<UserSubtitleConfig>(
      'SELECT * FROM UserSubtitleConfig WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Subtitle configuration reset to defaults',
        config,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete subtitle config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Compute the number of effective sentences after applying merge/skip config.
 * Falls back to the raw subtitle count if the subtitle file cannot be fetched.
 */
async function computeEffectiveSentenceCount(
  exerciseId: string,
  mergedGroups: unknown[],
  skippedSentences: unknown[]
): Promise<number> {
  try {
    const exercise = await queryOne<Exercise>(
      'SELECT * FROM Exercise WHERE exerciseId = ?',
      [exerciseId]
    );

    if (!exercise) {
      return 0;
    }

    const subtitleContent = await downloadFile(exercise.subtitleUrl);
    const format = detectSubtitleFormat(exercise.subtitleUrl);

    if (!format || !subtitleContent) {
      return exercise.totalSentences;
    }

    const contentStr = typeof subtitleContent === 'string'
      ? subtitleContent
      : subtitleContent.toString('utf-8');

    const rawSubtitles = parseSubtitles(contentStr, format);

    const configInput: SubtitleConfigInput = {
      mergedGroups: mergedGroups as SubtitleConfigInput['mergedGroups'],
      skippedSentences: skippedSentences as SubtitleConfigInput['skippedSentences'],
    };

    const effectiveSubtitles = applySubtitleConfig(rawSubtitles, configInput, { omitSkipped: true });
    return effectiveSubtitles.length;
  } catch (error) {
    console.error('Error computing effective sentence count:', error);
    return 0;
  }
}
