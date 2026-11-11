import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireAdmin } from '@/lib/session';
import { AdminExerciseCreateSchema } from '@/lib/validation';
import { probeExercise } from '@/lib/media-probe';
import { initializeDatabase, queryOne, transaction } from '@/lib/db';
import type { AdminExerciseCreateResponse, ExerciseProbeResult } from '@/lib/types';
import { notFound, parseBody, serverError } from '../_shared';

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;

  // Any client-supplied subtitleFormat/totalSentences/durationSeconds are dropped by the schema.
  const parsed = await parseBody(request, AdminExerciseCreateSchema);
  if ('response' in parsed) return parsed.response;
  const { episodeId, title, difficulty, videoUrl, subtitleUrl, videoFallbackUrl } = parsed.data;

  try {
    await initializeDatabase();

    const episode = await queryOne<{ episodeId: string }>('SELECT episodeId FROM Episode WHERE episodeId = ?', [
      episodeId,
    ]);
    if (!episode) return notFound('episodeId', 'Episode not found');

    // Server-side probe is authoritative (FR-016). When a COS fallback exists
    // (TED flow), probe it instead of the external primary: it validates the
    // copy the player actually falls back to, and works even when the external
    // host is unreachable from this server.
    const probe = await probeExercise(videoFallbackUrl ?? videoUrl, subtitleUrl);
    if (!probe.ok) {
      return NextResponse.json<{ error: string; probe: ExerciseProbeResult }>(
        { error: 'Resource validation failed', probe },
        { status: 422 }
      );
    }

    const exerciseId = uuidv4();
    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO Exercise
           (exerciseId, episodeId, title, difficulty, videoUrl, videoFallbackUrl, subtitleUrl, subtitleFormat, totalSentences, durationSeconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          exerciseId,
          episodeId,
          title,
          difficulty ?? null,
          videoFallbackUrl ? videoUrl : probe.video.key,
          videoFallbackUrl ? probe.video.key : null,
          probe.subtitle.key,
          probe.subtitle.subtitleFormat!,
          probe.subtitle.totalSentences!,
          probe.video.durationSeconds!,
        ]
      );
      await conn.execute(
        `UPDATE Episode SET totalExercises = (SELECT COUNT(*) FROM Exercise WHERE episodeId = ?) WHERE episodeId = ?`,
        [episodeId, episodeId]
      );
    });

    return NextResponse.json<AdminExerciseCreateResponse>({ exerciseId, probe }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
