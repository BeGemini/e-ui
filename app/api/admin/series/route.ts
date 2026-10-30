import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireAdmin } from '@/lib/session';
import { AdminSeriesCreateSchema } from '@/lib/validation';
import { execute, initializeDatabase } from '@/lib/db';
import { conflict, isDuplicateEntry, parseBody, serverError } from '../_shared';

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;

  const parsed = await parseBody(request, AdminSeriesCreateSchema);
  if ('response' in parsed) return parsed.response;
  const { title, difficulty, description, genre, coverImageUrl } = parsed.data;

  try {
    await initializeDatabase();
    const seriesId = uuidv4();
    await execute(
      `INSERT INTO Series (seriesId, title, description, genre, difficulty, coverImageUrl)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [seriesId, title, description ?? null, genre ?? null, difficulty, coverImageUrl ?? null]
    );
    return NextResponse.json({ seriesId }, { status: 201 });
  } catch (error) {
    if (isDuplicateEntry(error)) return conflict('title', 'A series with this title already exists');
    return serverError(error);
  }
}
