import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { validate } from '@/lib/validation';
import { AiKnowledgePointTeachSchema } from '@/lib/validation';
import { callDeepSeekForKnowledgePoint } from '@/lib/deepseek-client';
import type { AiKnowledgePointTeachRequest, AiKnowledgePointTeachResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const session = verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = await validate<AiKnowledgePointTeachRequest>(AiKnowledgePointTeachSchema, body);

    const result = await callDeepSeekForKnowledgePoint(data);

    const response: AiKnowledgePointTeachResponse = {
      explanation: result.explanation,
    };

    return NextResponse.json({ success: true, data: response }, { status: 200 });
  } catch (error) {
    console.error('AI knowledge point teach error:', error);

    if (error instanceof Error && error.message.startsWith('Validation error')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'AI service unavailable. Please try again later or enter a note manually.' },
      { status: 502 }
    );
  }
}
