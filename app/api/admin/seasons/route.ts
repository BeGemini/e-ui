import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireAdmin } from '@/lib/session';
import { AdminSeasonCreateSchema } from '@/lib/validation';
import { execute, initializeDatabase, queryOne } from '@/lib/db';
import { conflict, isDuplicateEntry, notFound, parseBody, serverError } from '../_shared';

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;

  const parsed = await parseBody(request, AdminSeasonCreateSchema);
  if ('response' in parsed) return parsed.response;
  const { seriesId, seasonNumber, description } = parsed.data;

  try {
    await initializeDatabase();
    const series = await queryOne<{ seriesId: string }>('SELECT seriesId FROM Series WHERE seriesId = ?', [seriesId]);
    if (!series) return notFound('seriesId', 'Series not found');

    const seasonId = uuidv4();
    await execute('INSERT INTO Season (seasonId, seriesId, seasonNumber, description) VALUES (?, ?, ?, ?)', [
      seasonId,
      seriesId,
      seasonNumber,
      description ?? null,
    ]);
    return NextResponse.json({ seasonId }, { status: 201 });
  } catch (error) {
    if (isDuplicateEntry(error)) return conflict('seasonNumber', `Season ${seasonNumber} already exists in this series`);
    return serverError(error);
  }
}
