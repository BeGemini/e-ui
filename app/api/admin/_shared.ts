import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { AdminErrorResponse } from '@/lib/types';

type ParseResult<T> = { data: T } | { response: NextResponse<AdminErrorResponse> };

export async function parseBody<S extends z.ZodType>(
  request: NextRequest,
  schema: S
): Promise<ParseResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { response: badRequest('Request body must be valid JSON') };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error);
    return {
      response: NextResponse.json<AdminErrorResponse>(
        { error: 'Validation failed', fieldErrors: fieldErrors as Record<string, string[]> },
        { status: 400 }
      ),
    };
  }
  return { data: result.data };
}

export function badRequest(error: string): NextResponse<AdminErrorResponse> {
  return NextResponse.json({ error }, { status: 400 });
}

export function notFound(field: string, error: string): NextResponse<AdminErrorResponse> {
  return NextResponse.json({ error, field }, { status: 404 });
}

export function conflict(field: string, error: string): NextResponse<AdminErrorResponse> {
  return NextResponse.json({ error, field }, { status: 409 });
}

export function serverError(error: unknown): NextResponse<AdminErrorResponse> {
  console.error('[admin] Unexpected error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

export function isDuplicateEntry(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ER_DUP_ENTRY';
}
