import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, query, queryOne, execute } from '@/lib/db';
import { validate } from '@/lib/validation';
import { KnowledgePointCreateSchema } from '@/lib/validation';
import type { KnowledgePoint, KnowledgePointCreateRequest } from '@/lib/types';

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

    const knowledgePointRows = await query<RowDataPacket>(
      `SELECT * FROM KnowledgePoint
       WHERE userId = ? AND exerciseId = ?
       ORDER BY createdDate DESC`,
      [session.userId, exerciseId]
    );

    return NextResponse.json({ success: true, data: knowledgePointRows as KnowledgePoint[] });
  } catch (error) {
    console.error('Get knowledge points error:', error);
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
    const data = await validate<KnowledgePointCreateRequest>(KnowledgePointCreateSchema, body);

    // Check for duplicate knowledge point
    const existing = await queryOne<KnowledgePoint>(
      `SELECT * FROM KnowledgePoint
       WHERE userId = ? AND exerciseId = ? AND capturedText = ?`,
      [session.userId, exerciseId, data.capturedText]
    );

    if (existing) {
      return NextResponse.json(
        {
          success: true,
          data: existing,
          message: 'Knowledge point already exists',
        },
        { status: 200 }
      );
    }

    const knowledgePointId = uuidv4();

    await execute(
      `INSERT INTO KnowledgePoint (
        knowledgePointId, userId, exerciseId, sourceSentenceIndex,
        capturedText, category, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        knowledgePointId,
        session.userId,
        exerciseId,
        data.sourceSentenceIndex,
        data.capturedText,
        data.category,
        data.description,
      ]
    );

    const created = await queryOne<KnowledgePoint>(
      'SELECT * FROM KnowledgePoint WHERE knowledgePointId = ?',
      [knowledgePointId]
    );

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('Create knowledge point error:', error);
    if (error instanceof Error && error.message.startsWith('Validation error')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
