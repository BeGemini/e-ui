/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('@/lib/cos-client', () => ({
  initializeCosClient: jest.fn(),
  getSignedUrl: jest.fn(() => 'https://signed.example/video'),
  downloadFile: jest.fn(),
  getBucketName: jest.fn(() => 'videos-123'),
  getRegion: jest.fn(() => 'ap-guangzhou'),
}));

import { downloadFile } from '@/lib/cos-client';
import {
  normalizeCosKey,
  parseMvhdDuration,
  probeExercise,
  probeSubtitle,
  probeVideo,
  scanChunk,
  VIDEO_CHUNK_BYTES,
} from '@/lib/media-probe';

const mockedDownload = downloadFile as jest.MockedFunction<typeof downloadFile>;

// ---- MP4 fixture helpers ----

function box(type: string, payload: Buffer): Buffer {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + payload.length, 0);
  header.write(type, 4, 'latin1');
  return Buffer.concat([header, payload]);
}

function mvhdV0(timescale: number, duration: number): Buffer {
  const payload = Buffer.alloc(100);
  payload.writeUInt32BE(timescale, 12);
  payload.writeUInt32BE(duration, 16);
  return box('mvhd', payload);
}

function mvhdV1(timescale: number, duration: bigint): Buffer {
  const payload = Buffer.alloc(112);
  payload[0] = 1;
  payload.writeUInt32BE(timescale, 20);
  payload.writeBigUInt64BE(duration, 24);
  return box('mvhd', payload);
}

const ftyp = box('ftyp', Buffer.from('isom\0\0\0\0isomavc1', 'latin1'));

function rangeResponse(file: Buffer, rangeHeader: string): Response {
  const [, startStr, endStr] = /bytes=(\d+)-(\d+)/.exec(rangeHeader)!;
  const start = Number(startStr);
  if (start >= file.length) return new Response(null, { status: 416 });
  const end = Math.min(Number(endStr), file.length - 1);
  return new Response(new Uint8Array(file.subarray(start, end + 1)), {
    status: 206,
    headers: { 'Content-Range': `bytes ${start}-${end}/${file.length}` },
  });
}

function mockFetchWithFile(file: Buffer) {
  const fetchMock = jest.fn(async (_url: unknown, init?: RequestInit) => {
    const range = (init?.headers as Record<string, string>).Range;
    return rangeResponse(file, range);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

// ---- Tests ----

describe('normalizeCosKey', () => {
  it('accepts a plain key and strips leading slashes', () => {
    expect(normalizeCosKey('/Show/S01/E01.mp4')).toEqual({ ok: true, key: 'Show/S01/E01.mp4' });
  });

  it('keeps spaces in plain keys as-is', () => {
    expect(normalizeCosKey('Desperate Hosewives/S01/E01.ass')).toEqual({
      ok: true,
      key: 'Desperate Hosewives/S01/E01.ass',
    });
  });

  it('extracts and decodes the key from a full bucket URL, ignoring query string', () => {
    const result = normalizeCosKey(
      'https://videos-123.cos.ap-guangzhou.myqcloud.com/Desperate%20Hosewives/S01/E01.mp4?sign=abc'
    );
    expect(result).toEqual({ ok: true, key: 'Desperate Hosewives/S01/E01.mp4' });
  });

  it('rejects other hosts', () => {
    const result = normalizeCosKey('https://example.com/a.mp4');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('FOREIGN_HOST');
  });

  it('rejects empty input', () => {
    const result = normalizeCosKey('   ');
    expect(!result.ok && result.error.code).toBe('INVALID_KEY');
  });
});

describe('parseMvhdDuration / scanChunk', () => {
  it('reads mvhd version 0', () => {
    const mvhd = mvhdV0(1000, 125_400);
    expect(parseMvhdDuration(mvhd, 8)).toBeCloseTo(125.4);
  });

  it('reads mvhd version 1', () => {
    const mvhd = mvhdV1(90_000, BigInt(90_000 * 2580));
    expect(parseMvhdDuration(mvhd, 8)).toBe(2580);
  });

  it('finds moov at the start of the file', () => {
    const file = Buffer.concat([ftyp, box('moov', mvhdV0(600, 600 * 42)), box('mdat', Buffer.alloc(64))]);
    expect(scanChunk(file, 0, file.length, true)).toEqual({ kind: 'duration', seconds: 42 });
  });

  it('points to the next box when moov is after mdat', () => {
    const mdat = box('mdat', Buffer.alloc(1000));
    const file = Buffer.concat([ftyp, mdat, box('moov', mvhdV0(1, 10))]);
    const head = file.subarray(0, ftyp.length + 16);
    expect(scanChunk(head, 0, file.length, true)).toEqual({ kind: 'next', offset: ftyp.length + mdat.length });
  });

  it('rejects non ISO-BMFF data', () => {
    expect(() => scanChunk(Buffer.from('<!DOCTYPE html><html>'), 0, 21, true)).toThrow('not a valid MP4');
  });
});

describe('probeVideo', () => {
  it('rejects unsupported extensions without network access', async () => {
    const fetchMock = mockFetchWithFile(Buffer.alloc(0));
    const result = await probeVideo('Show/E01.mkv');
    expect(result.error?.code).toBe('UNSUPPORTED_EXTENSION');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads duration with a single request for faststart files', async () => {
    const file = Buffer.concat([ftyp, box('moov', mvhdV0(1000, 61_600)), box('mdat', Buffer.alloc(10))]);
    const fetchMock = mockFetchWithFile(file);
    const result = await probeVideo('Show/E01.mp4');
    expect(result).toEqual({ key: 'Show/E01.mp4', ok: true, durationSeconds: 62 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses a second range request when moov is at the end', async () => {
    const mdat = box('mdat', Buffer.alloc(VIDEO_CHUNK_BYTES + 5000));
    const file = Buffer.concat([ftyp, mdat, box('moov', mvhdV1(48_000, BigInt(48_000 * 1500)))]);
    const fetchMock = mockFetchWithFile(file);
    const result = await probeVideo('Show/E01.mov');
    expect(result.durationSeconds).toBe(1500);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('maps 404 to NOT_FOUND', async () => {
    global.fetch = jest.fn(async () => new Response(null, { status: 404 })) as unknown as typeof fetch;
    const result = await probeVideo('missing.mp4');
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  it('reports DURATION_UNREADABLE when no moov exists', async () => {
    mockFetchWithFile(Buffer.concat([ftyp, box('mdat', Buffer.alloc(100))]));
    const result = await probeVideo('Show/E01.mp4');
    expect(result.error?.code).toBe('DURATION_UNREADABLE');
  });
});

describe('probeSubtitle', () => {
  beforeEach(() => {
    mockedDownload.mockReset();
  });

  const srt = '1\n00:00:01,000 --> 00:00:03,000\nHello\n\n2\n00:00:04,000 --> 00:00:09,500\nWorld\n';

  it('extracts format, sentence count and last cue end', async () => {
    mockedDownload.mockResolvedValue(Buffer.from(srt, 'utf-8'));
    const result = await probeSubtitle('Show/E01.srt');
    expect(result).toEqual({
      key: 'Show/E01.srt',
      ok: true,
      subtitleFormat: 'srt',
      totalSentences: 2,
      lastCueEndSeconds: 9.5,
    });
  });

  it('rejects unsupported extensions', async () => {
    const result = await probeSubtitle('Show/E01.txt');
    expect(result.error?.code).toBe('UNSUPPORTED_EXTENSION');
    expect(mockedDownload).not.toHaveBeenCalled();
  });

  it('rejects empty subtitles', async () => {
    mockedDownload.mockResolvedValue(Buffer.from('\n\n', 'utf-8'));
    const result = await probeSubtitle('Show/E01.srt');
    expect(result.error?.code).toBe('EMPTY_SUBTITLE');
  });

  it('rejects non UTF-8 content', async () => {
    mockedDownload.mockResolvedValue(Buffer.from([0xc4, 0xe3, 0xba, 0xc3])); // GBK bytes
    const result = await probeSubtitle('Show/E01.srt');
    expect(result.error?.code).toBe('NOT_UTF8');
  });

  it('maps COS NoSuchKey to NOT_FOUND', async () => {
    mockedDownload.mockRejectedValue({ statusCode: 404, code: 'NoSuchKey' });
    const result = await probeSubtitle('Show/E01.srt');
    expect(result.error?.code).toBe('NOT_FOUND');
  });
});

describe('probeExercise', () => {
  it('warns when subtitles run past the video end', async () => {
    mockFetchWithFile(Buffer.concat([ftyp, box('moov', mvhdV0(1, 5))]));
    mockedDownload.mockResolvedValue(Buffer.from('1\n00:00:01,000 --> 00:00:09,000\nHi\n', 'utf-8'));
    const result = await probeExercise('a.mp4', 'a.srt');
    expect(result.ok).toBe(true);
    expect(result.warnings.map((w) => w.code)).toEqual(['SUBTITLE_EXCEEDS_VIDEO']);
  });

  it('reports each resource independently', async () => {
    global.fetch = jest.fn(async () => new Response(null, { status: 404 })) as unknown as typeof fetch;
    mockedDownload.mockResolvedValue(Buffer.from('1\n00:00:01,000 --> 00:00:02,000\nHi\n', 'utf-8'));
    const result = await probeExercise('a.mp4', 'https://evil.example.com/a.srt');
    expect(result.ok).toBe(false);
    expect(result.video.error?.code).toBe('NOT_FOUND');
    expect(result.subtitle.error?.code).toBe('FOREIGN_HOST');
  });
});
