import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deleteFile, uploadFile } from './cos-client';
import { probeExercise } from './media-probe';
import type { TedFetchErrorCode, TedFetchSuccessResponse } from './types';
import type { TedTalkAssets } from './ted-talk';

export class TedMediaError extends Error {
  constructor(public readonly code: TedFetchErrorCode, message: string) {
    super(message);
    this.name = 'TedMediaError';
  }
}

interface ProcessResult {
  code: number | null;
  stderr: string;
}

function runProcess(args: string[], signal?: AbortSignal): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    const onAbort = () => child.kill('SIGKILL');
    signal?.addEventListener('abort', onAbort, { once: true });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString('utf8')}`.slice(-16_000);
    });
    child.once('error', (error) => {
      signal?.removeEventListener('abort', onAbort);
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new TedMediaError('FFMPEG_UNAVAILABLE', 'ffmpeg is not installed on the server'));
        return;
      }
      reject(new TedMediaError('MEDIA_CONVERSION_FAILED', 'Could not start video conversion'));
    });
    child.once('close', (code) => {
      signal?.removeEventListener('abort', onAbort);
      if (signal?.aborted) {
        reject(new TedMediaError('MEDIA_CONVERSION_FAILED', 'Video conversion was cancelled'));
        return;
      }
      resolve({ code, stderr });
    });
  });
}

async function assertFfmpegAvailable(signal?: AbortSignal): Promise<void> {
  const result = await runProcess(['-version'], signal);
  if (result.code !== 0) {
    throw new TedMediaError('FFMPEG_UNAVAILABLE', 'ffmpeg is not available on the server');
  }
}

async function convertToMp4(hlsUrl: string, outputPath: string, signal?: AbortSignal): Promise<void> {
  const result = await runProcess(
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-nostdin',
      '-y',
      '-protocol_whitelist',
      'file,http,https,tcp,tls,crypto',
      '-i',
      hlsUrl,
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      outputPath,
    ],
    signal
  );
  if (result.code !== 0) {
    console.error('[ted] ffmpeg conversion failed:', result.stderr);
    throw new TedMediaError('MEDIA_CONVERSION_FAILED', 'Could not convert the TED video to MP4');
  }
  const output = await stat(outputPath);
  if (!output.isFile() || output.size === 0) {
    throw new TedMediaError('MEDIA_CONVERSION_FAILED', 'The converted TED video is empty');
  }
}

function safePart(value: string, fallback: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return normalized || fallback;
}

export async function uploadTedTalkAssets(
  { source, resources, subtitleContent }: TedTalkAssets,
  signal?: AbortSignal
): Promise<TedFetchSuccessResponse> {
  await assertFfmpegAvailable(signal);
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'e-ui-ted-'));
  const outputPath = join(temporaryDirectory, 'talk.mp4');
  const prefix = `TED/${safePart(source.tedId, 'talk')}-${safePart(source.slug, 'talk')}/${randomUUID()}`;
  const videoUrl = `${prefix}.mp4`;
  const subtitleUrl = `${prefix}.vtt`;
  const uploadedKeys: string[] = [];

  try {
    await convertToMp4(resources.hlsStreamUrl, outputPath, signal);
    signal?.throwIfAborted();
    try {
      await uploadFile(videoUrl, createReadStream(outputPath), 'video/mp4');
      uploadedKeys.push(videoUrl);
      await uploadFile(subtitleUrl, subtitleContent, 'text/vtt; charset=utf-8');
      uploadedKeys.push(subtitleUrl);
    } catch {
      throw new TedMediaError('STORAGE_UPLOAD_FAILED', 'Could not save TED media to cloud storage');
    }

    signal?.throwIfAborted();
    let probe: TedFetchSuccessResponse['probe'];
    try {
      probe = await probeExercise(videoUrl, subtitleUrl);
    } catch {
      throw new TedMediaError('RESOURCE_VALIDATION_FAILED', 'Could not validate the uploaded TED media');
    }
    if (!probe.ok || probe.subtitle.subtitleFormat !== 'vtt' || (probe.subtitle.totalSentences ?? 0) === 0) {
      throw new TedMediaError('RESOURCE_VALIDATION_FAILED', 'The uploaded TED media did not pass validation');
    }
    signal?.throwIfAborted();
    return { videoUrl, subtitleUrl, probe };
  } catch (error) {
    await Promise.allSettled(uploadedKeys.map((key) => deleteFile(key)));
    throw error;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
