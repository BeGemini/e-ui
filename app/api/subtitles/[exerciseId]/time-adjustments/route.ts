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

const TIMING_MODES = ['sentence', 'global'] as const;
type TimingMode = (typeof TIMING_MODES)[number];

/**
 * GET /api/subtitles/[exerciseId]/time-adjustments
 * Return the current user's timing settings for this exercise.
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
      'SELECT timeAdjustments, globalTimeOffsetMs, timingMode FROM UserSubtitleConfig WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    return NextResponse.json(
      {
        success: true,
        adjustments: readAdjustments(config ?? null),
        globalTimeOffsetMs: config?.globalTimeOffsetMs ?? 0,
        timingMode: config?.timingMode ?? 'sentence',
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
 * Update the current user's timing settings. Accepts any subset of:
 * - adjustments: replace per-sentence overrides (empty array clears)
 * - globalTimeOffsetMs: whole-video offset in milliseconds
 * - timingMode: 'sentence' | 'global'
 * Per-user, same scope as merge/skip config.
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

    const hasAdjustments = body !== null && 'adjustments' in body;
    const hasOffset = body !== null && 'globalTimeOffsetMs' in body;
    const hasMode = body !== null && 'timingMode' in body;
    if (!hasAdjustments && !hasOffset && !hasMode) {
      return NextResponse.json(
        { error: 'Nothing to update: provide adjustments, globalTimeOffsetMs, or timingMode' },
        { status: 400 }
      );
    }

    let adjustments: SubtitleTimeAdjustment[] | null = null;
    if (hasAdjustments) {
      adjustments = normalizeAdjustments(body.adjustments);
      if (!adjustments) {
        return NextResponse.json(
          { error: 'Invalid adjustments: expected [{index, startSeconds?, endSeconds?}] with non-negative numbers' },
          { status: 400 }
        );
      }
    }

    let offsetMs: number | null = null;
    if (hasOffset) {
      if (typeof body.globalTimeOffsetMs !== 'number' || !Number.isFinite(body.globalTimeOffsetMs)) {
        return NextResponse.json(
          { error: 'Invalid globalTimeOffsetMs: expected a finite number of milliseconds' },
          { status: 400 }
        );
      }
      offsetMs = Math.round(body.globalTimeOffsetMs);
    }

    let timingMode: TimingMode | null = null;
    if (hasMode) {
      if (!TIMING_MODES.includes(body.timingMode)) {
        return NextResponse.json(
          { error: `Invalid timingMode: expected one of ${TIMING_MODES.join(', ')}` },
          { status: 400 }
        );
      }
      timingMode = body.timingMode;
    }

    if (adjustments && adjustments.length > 0) {
      // Validate against the real subtitles: referenced indices must exist.
      const exercise = await queryOne<Exercise>(
        'SELECT * FROM Exercise WHERE exerciseId = ?',
        [exerciseId]
      );
      if (!exercise) {
        return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
      }
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

    // Upsert the user's config row; timing settings live alongside the
    // per-user merge/skip config.
    const existing = await queryOne<UserSubtitleConfig>(
      'SELECT configId FROM UserSubtitleConfig WHERE userId = ? AND exerciseId = ?',
      [session.userId, exerciseId]
    );

    if (!existing) {
      await execute(
        `INSERT INTO UserSubtitleConfig (configId, userId, exerciseId, mergedGroups, skippedSentences, timeAdjustments, globalTimeOffsetMs, timingMode, effectiveSentenceCount, createdDate)
         VALUES (?, ?, ?, '[]', '[]', ?, ?, ?, NULL, NOW())`,
        [
          uuidv4(),
          session.userId,
          exerciseId,
          JSON.stringify(adjustments ?? []),
          offsetMs ?? 0,
          timingMode ?? 'sentence',
        ]
      );
    } else {
      const sets: string[] = ['updatedDate = NOW()'];
      const params: Array<string | number> = [];
      if (adjustments) {
        sets.push('timeAdjustments = ?');
        params.push(JSON.stringify(adjustments));
      }
      if (offsetMs !== null) {
        sets.push('globalTimeOffsetMs = ?');
        params.push(offsetMs);
      }
      if (timingMode) {
        sets.push('timingMode = ?');
        params.push(timingMode);
      }
      params.push(session.userId, exerciseId);
      await execute(
        `UPDATE UserSubtitleConfig SET ${sets.join(', ')} WHERE userId = ? AND exerciseId = ?`,
        params
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Timing settings saved. They apply to your next playback.',
        adjustments: adjustments ?? undefined,
        globalTimeOffsetMs: offsetMs ?? undefined,
        timingMode: timingMode ?? undefined,
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
