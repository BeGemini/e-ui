import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireAdmin } from '@/lib/session';
import { AdminEpisodeCreateSchema } from '@/lib/validation';
import { initializeDatabase, queryOne, transaction } from '@/lib/db';
import { conflict, isDuplicateEntry, notFound, parseBody, serverError } from '../_shared';

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;

  const parsed = await parseBody(request, AdminEpisodeCreateSchema);
  if ('response' in parsed) return parsed.response;
  const { seasonId, episodeNumber, title, description } = parsed.data;

  try {
    await initializeDatabase();
    const season = await queryOne<{ seasonId: string; seriesId: string }>(
      'SELECT seasonId, seriesId FROM Season WHERE seasonId = ?',
      [seasonId]
    );
    if (!season) return notFound('seasonId', 'Season not found');

    const episodeId = uuidv4();
    await transaction(async (conn) => {
      await conn.execute(
        'INSERT INTO Episode (episodeId, seasonId, episodeNumber, title, description) VALUES (?, ?, ?, ?, ?)',
        [episodeId, seasonId, episodeNumber, title, description ?? null]
      );
      await conn.execute(
        'UPDATE Season SET totalEpisodes = (SELECT COUNT(*) FROM Episode WHERE seasonId = ?) WHERE seasonId = ?',
        [seasonId, seasonId]
      );
      await conn.execute(
        `UPDATE Series SET totalEpisodes = (
           SELECT COUNT(*) FROM Episode e JOIN Season s ON e.seasonId = s.seasonId WHERE s.seriesId = ?
         ) WHERE seriesId = ?`,
        [season.seriesId, season.seriesId]
      );
    });
    return NextResponse.json({ episodeId }, { status: 201 });
  } catch (error) {
    if (isDuplicateEntry(error)) {
      return conflict('episodeNumber', `Episode ${episodeNumber} already exists in this season`);
    }
    return serverError(error);
  }
}
