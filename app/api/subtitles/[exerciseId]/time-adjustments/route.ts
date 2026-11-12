import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, queryOne, execute } from '@/lib/db';
import { Exercise, SubtitleTimeAdjustment, UserSubtitleConfig } from '@/lib/types';
import { downloadFile } from '@/lib/cos-client';
import { parseSubtitles, detectSubtitleFormat } from '@/lib/subtitle-parser';

function normalizeAdjustments(value: unknown): SubtitleTimeAdjustment[] | null {
  if (!Array.isArray(value)) return null;
  const result: SubtitleTimeAdjustment[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const { index, startSeconds, endSeconds } = item as SubtitleTimeAdjustment;
    if (!Number.isInteger(index) || index < 0) return null;
    if (startSeconds === undefined && endSeconds === undefined) continue;
    if (startSeconds !== undefined && (typeof startSeconds !== 'number' || !Number.isFinite(startSeconds) || startSeconds < 0)) return null;
    if (endSeconds !== undefined && (typeof endSeconds !== 'number' || !Number.isFinite(endSeconds) || endSeconds < 0)) return null;
    result.push({ index, startSeconds, endSeconds });
  }
  // Last entry wins on duplicate indices; store sorted for stable diffs.
  const byIndex = new Map(result.map((a) => [a.index, a]));
  return Array.from(byIndex.values()).sort((a, b) => a.index - b.index);
}

function readAdjustments(config: UserSubtitleConfig | null): SubtitleTimeAdjustment[] {
  const raw = config?.timeAdjustments;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw;
    return Array.isArray(parsed) ? (parsed as SubtitleTimeAdjustment[]) : [];
  } catch {
    return [];
  }
}

/**
 * GET /api/subtitles/[exerciseId]/time-adjustments
 * Return the current user's timing overrides for this exercise.
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

    const config = await queryOne<UserSubtitleConfig>(
      'SELECT timeAdjustments FROM UserSubtitleConfig WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    return NextResponse.json(
      {
        success: true,
        adjustments: readAdjustments(config ?? null),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get time adjustments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/subtitles/[exerciseId]/time-adjustments
 * Replace the current user's timing overrides for this exercise.
 * Per-user, same scope as merge/skip config. Pass an empty array to clear.
 */
export async function PUT(
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
    const body = await request.json().catch(() => null);
    const adjustments = normalizeAdjustments(body?.adjustments);
    if (!adjustments) {
      return NextResponse.json(
        { error: 'Invalid adjustments: expected [{index, startSeconds?, endSeconds?}] with non-negative numbers' },
        { status: 400 }
      );
    }

    const exercise = await queryOne<Exercise>(
      'SELECT * FROM Exercise WHERE exerciseId = ?',
      [exerciseId]
    );
    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    if (adjustments.length > 0) {
      // Validate against the real subtitles: indices must exist and every
      // adjusted sentence must keep 0 <= start < end <= video duration.
      let subtitles;
      try {
        const subtitleContent = await downloadFile(exercise.subtitleUrl);
        const format = detectSubtitleFormat(exercise.subtitleUrl);
        if (!format || !subtitleContent) {
          return NextResponse.json(
            { error: 'Subtitle file unavailable; cannot validate adjustments' },
            { status: 400 }
          );
        }
        const contentStr = typeof subtitleContent === 'string'
          ? subtitleContent
          : subtitleContent.toString('utf-8');
        subtitles = parseSubtitles(contentStr, format);
      } catch {
        return NextResponse.json(
          { error: 'Subtitle file unavailable; cannot validate adjustments' },
          { status: 400 }
        );
      }

      for (const adjustment of adjustments) {
        if (adjustment.index >= subtitles.length) {
          return NextResponse.json(
            { error: `Invalid adjustment: sentence index ${adjustment.index} out of range (0–${subtitles.length - 1}).` },
            { status: 400 }
          );
        }
      }
    }

    // Upsert the user's config row; timing overrides live alongside the
    // per-user merge/skip config.
    const existing = await queryOne<UserSubtitleConfig>(
      'SELECT configId FROM UserSubtitleConfig WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    if (!existing) {
      await execute(
        `INSERT INTO UserSubtitleConfig (configId, userId, exerciseId, mergedGroups, skippedSentences, timeAdjustments, effectiveSentenceCount, createdDate)
         VALUES (?, ?, ?, '[]', '[]', ?, NULL, NOW())`,
        [uuidv4(), session.userId, exerciseId, JSON.stringify(adjustments)]
      );
    } else {
      await execute(
        'UPDATE UserSubtitleConfig SET timeAdjustments = ?, updatedDate = NOW() WHERE userId = ? AND exerciseId = ?',
        [JSON.stringify(adjustments), session.userId, exerciseId]
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Timing adjustments saved. They apply to your next playback.',
        adjustments,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update time adjustments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
