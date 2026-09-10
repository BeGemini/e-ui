import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, queryOne, execute } from '@/lib/db';
import { UserExerciseProgress, UserSubtitleConfig, Exercise } from '@/lib/types';

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
        `INSERT INTO UserSubtitleConfig (configId, userId, exerciseId, mergedGroups, skippedSentences, createdDate)
         VALUES (?, ?, ?, '[]', '[]', NOW())`,
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

    // Validate merged groups don't modify already completed sentences
    if (mergedGroups && Array.isArray(mergedGroups)) {
      for (const group of mergedGroups) {
        if (group.start < currentProgress) {
          return NextResponse.json(
            { error: `Cannot modify merge group starting at sentence ${group.start}. Already completed up to sentence ${currentProgress - 1}. Read-only constraint enforced.` },
            { status: 400 }
          );
        }
      }

      // Validate no overlapping groups
      for (let i = 0; i < mergedGroups.length; i++) {
        for (let j = i + 1; j < mergedGroups.length; j++) {
          const g1 = mergedGroups[i];
          const g2 = mergedGroups[j];
          if (g1.start <= g2.start && g2.start <= g1.end) {
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
        if (sentenceIndex < currentProgress) {
          return NextResponse.json(
            { error: `Cannot skip sentence ${sentenceIndex}. Already completed up to sentence ${currentProgress - 1}. Read-only constraint enforced.` },
            { status: 400 }
          );
        }
      }
    }

    // Get or create config
    let config = await queryOne<UserSubtitleConfig>(
      'SELECT * FROM UserSubtitleConfig WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    if (!config) {
      const configId = uuidv4();
      await execute(
        `INSERT INTO UserSubtitleConfig (configId, userId, exerciseId, mergedGroups, skippedSentences, createdDate)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          configId,
          session.userId,
          exerciseId,
          JSON.stringify(mergedGroups || []),
          JSON.stringify(skippedSentences || []),
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
         SET mergedGroups = ?, skippedSentences = ?, updatedDate = NOW()
         WHERE userId = ? AND exerciseId = ?`,
        [
          JSON.stringify(mergedGroups || []),
          JSON.stringify(skippedSentences || []),
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
       SET mergedGroups = '[]', skippedSentences = '[]', updatedDate = NOW()
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
