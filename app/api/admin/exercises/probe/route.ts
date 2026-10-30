import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { AdminExerciseProbeSchema } from '@/lib/validation';
import { probeExercise } from '@/lib/media-probe';
import { parseBody, serverError } from '../../_shared';

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;

  const parsed = await parseBody(request, AdminExerciseProbeSchema);
  if ('response' in parsed) return parsed.response;

  try {
    const result = await probeExercise(parsed.data.videoUrl, parsed.data.subtitleUrl);
    return NextResponse.json(result);
  } catch (error) {
    return serverError(error);
  }
}
