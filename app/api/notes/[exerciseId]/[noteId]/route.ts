import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, queryOne, execute } from '@/lib/db';
import { validate } from '@/lib/validation';
import { NoteUpdateSchema } from '@/lib/validation';
import type { Note, NoteUpdateRequest } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string; noteId: string }> }
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

    const { exerciseId, noteId } = await params;
    const body = await request.json();
    const data = await validate<NoteUpdateRequest>(NoteUpdateSchema, body);

    const existing = await queryOne<Note>(
      `SELECT * FROM Note
       WHERE noteId = ? AND userId = ? AND exerciseId = ?`,
      [noteId, session.userId, exerciseId]
    );

    if (!existing) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (data.category !== undefined) {
      updates.push('category = ?');
      values.push(data.category);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    await execute(
      `UPDATE Note SET ${updates.join(', ')} WHERE noteId = ?`,
      [...values, noteId]
    );

    const updated = await queryOne<Note>(
      'SELECT * FROM Note WHERE noteId = ?',
      [noteId]
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update note error:', error);
    if (error instanceof Error && error.message.startsWith('Validation error')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string; noteId: string }> }
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

    const { exerciseId, noteId } = await params;

    const existing = await queryOne<Note>(
      `SELECT * FROM Note
       WHERE noteId = ? AND userId = ? AND exerciseId = ?`,
      [noteId, session.userId, exerciseId]
    );

    if (!existing) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    await execute(
      'DELETE FROM Note WHERE noteId = ?',
      [noteId]
    );

    return NextResponse.json({
      success: true,
      message: 'Note deleted',
    });
  } catch (error) {
    console.error('Delete note error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
