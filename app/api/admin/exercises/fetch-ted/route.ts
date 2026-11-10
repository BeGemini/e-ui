import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { uploadTedTalkAssets } from '@/lib/ted-media';
import { fetchTedTalkAssets } from '@/lib/ted-talk';
import type { TedFetchErrorCode, TedFetchErrorResponse, TedFetchSuccessResponse } from '@/lib/types';
import { AdminExerciseFetchTedSchema } from '@/lib/validation';
import { parseBody, serverError } from '../../_shared';

export const runtime = 'nodejs';
export const maxDuration = 300;

const OPERATION_TIMEOUT_MS = (maxDuration - 5) * 1000;

const ERROR_STATUS: Record<TedFetchErrorCode, number> = {
  INVALID_URL: 400,
  TALK_NOT_FOUND: 404,
  VIDEO_UNAVAILABLE: 422,
  ENGLISH_SUBTITLES_UNAVAILABLE: 422,
  RESOURCE_VALIDATION_FAILED: 422,
  FFMPEG_UNAVAILABLE: 500,
  STORAGE_UPLOAD_FAILED: 500,
  UPSTREAM_FETCH_FAILED: 502,
  MEDIA_CONVERSION_FAILED: 502,
  TIMEOUT: 504,
};

function isTedErrorCode(value: unknown): value is TedFetchErrorCode {
  return typeof value === 'string' && value in ERROR_STATUS;
}

function tedErrorResponse(error: unknown): NextResponse<TedFetchErrorResponse> | null {
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as { code?: unknown; message?: unknown };
  if (!isTedErrorCode(candidate.code) || typeof candidate.message !== 'string') return null;
  return NextResponse.json(
    { error: candidate.message, code: candidate.code, field: 'url' },
    { status: ERROR_STATUS[candidate.code] }
  );
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;

  const parsed = await parseBody(request, AdminExerciseFetchTedSchema);
  if ('response' in parsed) return parsed.response;

  const controller = new AbortController();
  let timedOut = false;
  const onRequestAbort = () => controller.abort();
  request.signal.addEventListener('abort', onRequestAbort, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, OPERATION_TIMEOUT_MS);

  try {
    const assets = await fetchTedTalkAssets(parsed.data.url, controller.signal);
    const result = await uploadTedTalkAssets(assets, controller.signal, {
      uploadVideoToCos: parsed.data.uploadToCos,
    });
    return NextResponse.json<TedFetchSuccessResponse>(result);
  } catch (error) {
    if (timedOut) {
      return NextResponse.json<TedFetchErrorResponse>(
        { error: 'TED media acquisition timed out. Please retry.', code: 'TIMEOUT', field: 'url' },
        { status: 504 }
      );
    }
    if (request.signal.aborted) return new NextResponse(null, { status: 499 });
    const response = tedErrorResponse(error);
    return response ?? serverError(error);
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener('abort', onRequestAbort);
  }
}
