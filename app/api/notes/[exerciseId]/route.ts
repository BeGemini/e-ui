import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, query, queryOne, execute } from '@/lib/db';
import { validate } from '@/lib/validation';
import { NoteCreateSchema } from '@/lib/validation';
import type { Note, NoteCreateRequest } from '@/lib/types';

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

    const noteRows = await query<RowDataPacket>(
      `SELECT * FROM Note
       WHERE userId = ? AND exerciseId = ?
       ORDER BY createdDate DESC`,
      [session.userId, exerciseId]
    );

    return NextResponse.json({ success: true, data: noteRows as Note[] });
  } catch (error) {
    console.error('Get notes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const body = await request.json();
    const data = await validate<NoteCreateRequest>(NoteCreateSchema, body);

    // Check for duplicate note
    const existing = await queryOne<Note>(
      `SELECT * FROM Note
       WHERE userId = ? AND exerciseId = ? AND capturedText = ?`,
      [session.userId, exerciseId, data.capturedText]
    );

    if (existing) {
      return NextResponse.json(
        {
          success: true,
          data: existing,
          message: 'Note already exists',
        },
        { status: 200 }
      );
    }

    const noteId = uuidv4();

    await execute(
      `INSERT INTO Note (
        noteId, userId, exerciseId, sourceSentenceIndex,
        capturedText, category, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        noteId,
        session.userId,
        exerciseId,
        data.sourceSentenceIndex,
        data.capturedText,
        data.category,
        data.description,
      ]
    );

    const created = await queryOne<Note>(
      'SELECT * FROM Note WHERE noteId = ?',
      [noteId]
    );

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('Create note error:', error);
    if (error instanceof Error && error.message.startsWith('Validation error')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
