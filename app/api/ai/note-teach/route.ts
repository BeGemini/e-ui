import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { validate } from '@/lib/validation';
import { AiNoteTeachSchema } from '@/lib/validation';
import { callDeepSeekForNote } from '@/lib/deepseek-client';
import type { AiNoteTeachRequest, AiNoteTeachResponse } from '@/lib/types';

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
    const data = await validate<AiNoteTeachRequest>(AiNoteTeachSchema, body);

    const result = await callDeepSeekForNote(data);

    const response: AiNoteTeachResponse = {
      explanation: result.explanation,
    };

    return NextResponse.json({ success: true, data: response }, { status: 200 });
  } catch (error) {
    console.error('AI note teach error:', error);

    if (error instanceof Error && error.message.startsWith('Validation error')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'AI service unavailable. Please try again later or enter a note manually.' },
      { status: 502 }
    );
  }
}
