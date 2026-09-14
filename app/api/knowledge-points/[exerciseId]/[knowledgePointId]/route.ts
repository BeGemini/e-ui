import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, queryOne, execute } from '@/lib/db';
import { validate } from '@/lib/validation';
import { KnowledgePointUpdateSchema } from '@/lib/validation';
import type { KnowledgePoint, KnowledgePointUpdateRequest } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string; knowledgePointId: string }> }
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

    const { exerciseId, knowledgePointId } = await params;
    const body = await request.json();
    const data = await validate<KnowledgePointUpdateRequest>(KnowledgePointUpdateSchema, body);

    const existing = await queryOne<KnowledgePoint>(
      `SELECT * FROM KnowledgePoint
       WHERE knowledgePointId = ? AND userId = ? AND exerciseId = ?`,
      [knowledgePointId, session.userId, exerciseId]
    );

    if (!existing) {
      return NextResponse.json(
        { error: 'Knowledge point not found' },
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
      `UPDATE KnowledgePoint SET ${updates.join(', ')} WHERE knowledgePointId = ?`,
      [...values, knowledgePointId]
    );

    const updated = await queryOne<KnowledgePoint>(
      'SELECT * FROM KnowledgePoint WHERE knowledgePointId = ?',
      [knowledgePointId]
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update knowledge point error:', error);
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
  { params }: { params: Promise<{ exerciseId: string; knowledgePointId: string }> }
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

    const { exerciseId, knowledgePointId } = await params;

    const existing = await queryOne<KnowledgePoint>(
      `SELECT * FROM KnowledgePoint
       WHERE knowledgePointId = ? AND userId = ? AND exerciseId = ?`,
      [knowledgePointId, session.userId, exerciseId]
    );

    if (!existing) {
      return NextResponse.json(
        { error: 'Knowledge point not found' },
        { status: 404 }
      );
    }

    await execute(
      'DELETE FROM KnowledgePoint WHERE knowledgePointId = ?',
      [knowledgePointId]
    );

    return NextResponse.json({
      success: true,
      message: 'Knowledge point deleted',
    });
  } catch (error) {
    console.error('Delete knowledge point error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
