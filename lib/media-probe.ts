/**
 * Resource probing for admin Exercise creation.
 * Validates COS-hosted video/subtitle objects and extracts metadata
 * (durationSeconds, subtitleFormat, totalSentences) without downloading full videos.
 */

import { downloadFile, getBucketName, getRegion, getSignedUrl, initializeCosClient } from './cos-client';
import { detectSubtitleFormat, parseSubtitles, type SubtitleFormat } from './subtitle-parser';
import type { ExerciseProbeResult, ProbeErrorCode, ProbeIssue, SubtitleProbe, VideoProbe } from './types';

export const PROBE_TIMEOUT_MS = 10_000;
export const VIDEO_CHUNK_BYTES = 256 * 1024;
const MAX_VIDEO_REQUESTS = 4;
const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'mov'];
const ISO_BMFF_TOP_LEVEL = new Set(['ftyp', 'styp', 'moov', 'mdat', 'free', 'skip', 'wide', 'pdin', 'uuid', 'meta']);

class ProbeError extends Error {
  constructor(public readonly code: ProbeErrorCode, message: string) {
    super(message);
  }
}

function issue(code: ProbeErrorCode, message: string): ProbeIssue {
  return { code, message };
}

function toIssue(error: unknown, fallback: ProbeErrorCode, fallbackMessage: string): ProbeIssue {
  if (error instanceof ProbeError) return issue(error.code, error.message);
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return issue('TIMEOUT', `Timed out after ${PROBE_TIMEOUT_MS / 1000}s. Please retry.`);
  }
  return issue(fallback, fallbackMessage);
}

// ===== Key normalization =====

export type NormalizedKey = { ok: true; key: string } | { ok: false; error: ProbeIssue };

/**
 * Accepts a raw COS object key or a full link to this project's bucket and returns the object key.
 */
export function normalizeCosKey(input: string): NormalizedKey {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return { ok: false, error: issue('INVALID_KEY', 'Resource path is required') };

  let key: string;
  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return { ok: false, error: issue('INVALID_KEY', 'Invalid URL') };
    }
    let expectedHost: string;
    try {
      expectedHost = `${getBucketName()}.cos.${getRegion()}.myqcloud.com`.toLowerCase();
    } catch {
      return { ok: false, error: issue('FETCH_FAILED', 'Storage is not configured on the server') };
    }
    if (url.hostname.toLowerCase() !== expectedHost) {
      return {
        ok: false,
        error: issue('FOREIGN_HOST', `Only files in this project's COS bucket (${expectedHost}) are supported`),
      };
    }
    try {
      key = decodeURIComponent(url.pathname);
    } catch {
      return { ok: false, error: issue('INVALID_KEY', 'URL path is not correctly encoded') };
    }
  } else {
    key = trimmed;
  }

  key = key.replace(/^\/+/, '');
  if (!key || /[\u0000-\u001f]/.test(key)) {
    return { ok: false, error: issue('INVALID_KEY', 'Invalid resource path') };
  }
  return { ok: true, key };
}

function extensionOf(key: string): string {
  const name = key.split('/').pop() ?? '';
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

// ===== Subtitle probing =====

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('timeout');
      err.name = 'TimeoutError';
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function isCosNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { statusCode?: number; code?: string };
  return e.statusCode === 404 || e.code === 'NoSuchKey';
}

export async function probeSubtitle(key: string): Promise<SubtitleProbe> {
  const format = detectSubtitleFormat(key) as SubtitleFormat | null;
  if (!format) {
    return {
      key,
      ok: false,
      error: issue('UNSUPPORTED_EXTENSION', 'Subtitle must be a .srt, .vtt, .ssa or .ass file'),
    };
  }

  let content: Buffer;
  try {
    content = await withTimeout(downloadFile(key), PROBE_TIMEOUT_MS);
  } catch (error) {
    if (isCosNotFound(error)) {
      return { key, ok: false, error: issue('NOT_FOUND', 'Subtitle file not found') };
    }
    return { key, ok: false, error: toIssue(error, 'FETCH_FAILED', 'Could not read subtitle file') };
  }

  // Decode exactly as the practice runtime does so sentence counts match.
  const text = Buffer.isBuffer(content) ? content.toString('utf-8') : String(content);
  if (text.includes('\uFFFD')) {
    return { key, ok: false, error: issue('NOT_UTF8', 'Subtitle file is not UTF-8 encoded') };
  }

  let cues;
  try {
    cues = parseSubtitles(text, format);
  } catch {
    return { key, ok: false, error: issue('PARSE_FAILED', `Could not parse subtitle as ${format.toUpperCase()}`) };
  }
  if (cues.length === 0) {
    return { key, ok: false, error: issue('EMPTY_SUBTITLE', 'Subtitle file contains no sentences') };
  }

  const lastCueEndSeconds = cues.reduce((max, c) => (c.endSeconds > max ? c.endSeconds : max), 0);
  return { key, ok: true, subtitleFormat: format, totalSentences: cues.length, lastCueEndSeconds };
}

// ===== Video probing (ISO-BMFF / MP4) =====

interface BoxHeader {
  type: string;
  size: number;
  headerSize: number;
}

function readBoxHeader(buf: Buffer, offset: number, bytesToEof: number): BoxHeader | null {
  if (offset + 8 > buf.length) return null;
  let size = buf.readUInt32BE(offset);
  const type = buf.toString('latin1', offset + 4, offset + 8);
  let headerSize = 8;
  if (size === 1) {
    if (offset + 16 > buf.length) return null;
    size = Number(buf.readBigUInt64BE(offset + 8));
    headerSize = 16;
  } else if (size === 0) {
    size = bytesToEof;
  }
  if (size < headerSize) throw new ProbeError('NOT_ISO_BMFF', 'Corrupted video container');
  return { type, size, headerSize };
}

/**
 * Parses duration (seconds) from an `mvhd` box payload.
 */
export function parseMvhdDuration(buf: Buffer, payloadOffset: number): number | null {
  const version = buf[payloadOffset];
  let timescale: number;
  let duration: number;
  if (version === 1) {
    if (payloadOffset + 32 > buf.length) return null;
    timescale = buf.readUInt32BE(payloadOffset + 20);
    duration = Number(buf.readBigUInt64BE(payloadOffset + 24));
  } else {
    if (payloadOffset + 20 > buf.length) return null;
    timescale = buf.readUInt32BE(payloadOffset + 12);
    duration = buf.readUInt32BE(payloadOffset + 16);
    if (duration === 0xffffffff) return null;
  }
  if (!timescale || !duration) return null;
  return duration / timescale;
}

export type ChunkScanResult =
  | { kind: 'duration'; seconds: number }
  | { kind: 'next'; offset: number }
  | { kind: 'unreadable' };

/**
 * Walks top-level boxes inside a chunk that starts at absolute file offset `chunkStart`.
 * Returns the duration if `moov/mvhd` is within the chunk, otherwise the absolute
 * offset of the next top-level box to fetch.
 */
export function scanChunk(buf: Buffer, chunkStart: number, totalSize: number, isFirstChunk: boolean): ChunkScanResult {
  let offset = 0;
  let first = isFirstChunk;
  while (offset + 8 <= buf.length) {
    const header = readBoxHeader(buf, offset, totalSize - (chunkStart + offset));
    if (!header) break;
    if (first && !ISO_BMFF_TOP_LEVEL.has(header.type)) {
      throw new ProbeError('NOT_ISO_BMFF', 'File is not a valid MP4/MOV video');
    }
    first = false;

    if (header.type === 'moov') {
      const end = Math.min(offset + header.size, buf.length);
      let child = offset + header.headerSize;
      while (child + 8 <= end) {
        const childHeader = readBoxHeader(buf, child, end - child);
        if (!childHeader) break;
        if (childHeader.type === 'mvhd') {
          const seconds = parseMvhdDuration(buf, child + childHeader.headerSize);
          return seconds === null ? { kind: 'unreadable' } : { kind: 'duration', seconds };
        }
        child += childHeader.size;
      }
      return { kind: 'unreadable' };
    }

    const next = offset + header.size;
    if (next + 8 > buf.length) {
      return { kind: 'next', offset: chunkStart + next };
    }
    offset = next;
  }
  return { kind: 'next', offset: chunkStart + offset };
}

async function readLimited(response: Response, limit: number): Promise<Buffer> {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let received = 0;
  while (received < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    received += value.length;
  }
  await reader.cancel().catch(() => undefined);
  return Buffer.concat(parts).subarray(0, limit);
}

function parseTotalSize(response: Response): number | null {
  const contentRange = response.headers.get('content-range');
  const match = contentRange?.match(/\/(\d+)\s*$/);
  if (match) return Number(match[1]);
  if (response.status === 200) {
    const length = response.headers.get('content-length');
    if (length) return Number(length);
  }
  return null;
}

export async function probeVideo(key: string): Promise<VideoProbe> {
  if (!VIDEO_EXTENSIONS.includes(extensionOf(key))) {
    return { key, ok: false, error: issue('UNSUPPORTED_EXTENSION', 'Video must be a .mp4, .m4v or .mov file') };
  }

  // One shared deadline for every request of this probe (see research R4).
  const signal = AbortSignal.timeout(PROBE_TIMEOUT_MS);

  try {
    // getSignedUrl() does not lazily initialize the client (see research R3).
    initializeCosClient();
    const url = getSignedUrl(key, 600);
    if (!url) throw new ProbeError('FETCH_FAILED', 'Could not sign video URL');

    let position = 0;
    let totalSize = Number.POSITIVE_INFINITY;
    for (let i = 0; i < MAX_VIDEO_REQUESTS; i++) {
      if (position >= totalSize) break;
      const response = await fetch(url, {
        headers: { Range: `bytes=${position}-${position + VIDEO_CHUNK_BYTES - 1}` },
        signal,
        cache: 'no-store',
      });
      if (response.status === 404) throw new ProbeError('NOT_FOUND', 'Video file not found');
      if (response.status === 416) break;
      if (!response.ok) throw new ProbeError('FETCH_FAILED', `Could not read video (HTTP ${response.status})`);

      totalSize = parseTotalSize(response) ?? totalSize;
      const ignoredRange = response.status === 200 && position > 0;
      const chunk = await readLimited(response, VIDEO_CHUNK_BYTES);
      if (ignoredRange) {
        throw new ProbeError('DURATION_UNREADABLE', 'Storage does not support range requests for this file');
      }

      const result = scanChunk(chunk, position, Number.isFinite(totalSize) ? totalSize : position + chunk.length, i === 0);
      if (result.kind === 'duration') {
        return { key, ok: true, durationSeconds: Math.round(result.seconds) };
      }
      if (result.kind === 'unreadable' || result.offset <= position) break;
      position = result.offset;
    }
    throw new ProbeError('DURATION_UNREADABLE', 'Could not read video duration from file metadata');
  } catch (error) {
    return { key, ok: false, error: toIssue(error, 'FETCH_FAILED', 'Could not read video file') };
  }
}

// ===== Combined =====

export async function probeExercise(videoInput: string, subtitleInput: string): Promise<ExerciseProbeResult> {
  const videoKey = normalizeCosKey(videoInput);
  const subtitleKey = normalizeCosKey(subtitleInput);

  const [video, subtitle] = await Promise.all([
    videoKey.ok
      ? probeVideo(videoKey.key)
      : Promise.resolve<VideoProbe>({ key: videoInput, ok: false, error: videoKey.error }),
    subtitleKey.ok
      ? probeSubtitle(subtitleKey.key)
      : Promise.resolve<SubtitleProbe>({ key: subtitleInput, ok: false, error: subtitleKey.error }),
  ]);

  const warnings: ProbeIssue[] = [];
  if (
    video.ok &&
    subtitle.ok &&
    video.durationSeconds !== undefined &&
    subtitle.lastCueEndSeconds !== undefined &&
    subtitle.lastCueEndSeconds > video.durationSeconds + 1
  ) {
    warnings.push(
      issue(
        'SUBTITLE_EXCEEDS_VIDEO',
        `Subtitles end at ${Math.round(subtitle.lastCueEndSeconds)}s but the video is only ${video.durationSeconds}s long. Check that they belong together.`
      )
    );
  }

  return { ok: video.ok && subtitle.ok, video, subtitle, warnings };
}
