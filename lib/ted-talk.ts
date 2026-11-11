import type { TedFetchErrorCode, TedMediaResources, TedTalkSource } from './types';

const TED_PAGE_HOST = 'www.ted.com';
const TED_MEDIA_HOSTS = new Set(['hls.ted.com']);
const NEXT_DATA_PATTERN = /<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i;
const VTT_TIMING_PATTERN = /\d{2}:\d{2}:\d{2}[.,]\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}[.,]\d{3}/;

export class TedTalkError extends Error {
  constructor(public readonly code: TedFetchErrorCode, message: string) {
    super(message);
    this.name = 'TedTalkError';
  }
}

export interface TedTalkAssets {
  source: TedTalkSource;
  resources: TedMediaResources;
  subtitleContent: string;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nestedRecord(value: unknown, key: string): Record<string, unknown> | null {
  return record(record(value)?.[key]);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parsePageUrl(input: string): { url: URL; slug: string } {
  const url = new URL(input);
  const match = /^\/talks\/([^/]+)\/?$/.exec(url.pathname);
  if (url.protocol !== 'https:' || url.hostname !== TED_PAGE_HOST || !match) {
    throw new TedTalkError('INVALID_URL', 'Enter a valid TED Talk URL');
  }
  return { url, slug: decodeURIComponent(match[1]) };
}

function parseMediaUrl(value: unknown, missingCode: TedFetchErrorCode, label: string): string {
  const raw = nonEmptyString(value);
  if (!raw) throw new TedTalkError(missingCode, `${label} is not available for this talk`);
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !TED_MEDIA_HOSTS.has(url.hostname)) {
      throw new TedTalkError('UPSTREAM_FETCH_FAILED', `TED returned an unsupported ${label.toLowerCase()} location`);
    }
    return url.toString();
  } catch (error) {
    if (error instanceof TedTalkError) throw error;
    throw new TedTalkError('UPSTREAM_FETCH_FAILED', `TED returned an invalid ${label.toLowerCase()} location`);
  }
}

async function getResponse(url: string, signal: AbortSignal | undefined, accept: string): Promise<Response> {
  try {
    return await fetch(url, {
      headers: { Accept: accept, 'User-Agent': 'e-ui-admin-ted-fetch/1.0' },
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    console.error('[ted-talk] upstream fetch failed:', url, error);
    throw new TedTalkError('UPSTREAM_FETCH_FAILED', 'Could not reach TED. Please retry.');
  }
}

function assertTimelineMatch(hlsStreamUrl: string, hlsMetadataUrl: string, englishVttUrl: string): void {
  const introIds = [hlsStreamUrl, hlsMetadataUrl, englishVttUrl].map(
    (value) => new URL(value).searchParams.get('intro_master_id')
  );
  if (introIds.some((value) => value !== introIds[0])) {
    throw new TedTalkError('UPSTREAM_FETCH_FAILED', 'TED returned video and subtitles with different timelines');
  }
}

function parsePage(html: string, input: string): { source: TedTalkSource; hls: Record<string, unknown> } {
  const { url, slug } = parsePageUrl(input);
  const match = NEXT_DATA_PATTERN.exec(html);
  if (!match) throw new TedTalkError('UPSTREAM_FETCH_FAILED', 'Could not read TED talk metadata');

  let root: Record<string, unknown> | null;
  try {
    root = record(JSON.parse(match[1]));
  } catch {
    throw new TedTalkError('UPSTREAM_FETCH_FAILED', 'TED returned invalid talk metadata');
  }

  const pageProps = nestedRecord(nestedRecord(root, 'props'), 'pageProps');
  const videoData = nestedRecord(pageProps, 'videoData');
  const playerData = nestedRecord(videoData, 'videoPlayerData');
  const resources = nestedRecord(playerData, 'resources');
  const hls = nestedRecord(resources, 'hls');
  const rawId = videoData?.id;
  const tedId = typeof rawId === 'number' && Number.isFinite(rawId) ? String(rawId) : nonEmptyString(rawId);
  const title = nonEmptyString(videoData?.title);
  if (!videoData || !playerData || !hls || !tedId || !title) {
    throw new TedTalkError('UPSTREAM_FETCH_FAILED', 'TED talk metadata is incomplete');
  }

  return {
    source: {
      url: url.toString(),
      slug,
      tedId,
      title,
      canonicalUrl: nonEmptyString(videoData.canonicalUrl) ?? undefined,
    },
    hls,
  };
}

export async function fetchTedTalkAssets(input: string, signal?: AbortSignal): Promise<TedTalkAssets> {
  const { url } = parsePageUrl(input);
  url.searchParams.set('language', 'en');
  const pageResponse = await getResponse(url.toString(), signal, 'text/html');
  if (pageResponse.status === 404) throw new TedTalkError('TALK_NOT_FOUND', 'TED Talk not found');
  if (!pageResponse.ok) {
    throw new TedTalkError('UPSTREAM_FETCH_FAILED', `TED returned HTTP ${pageResponse.status}. Please retry.`);
  }
  if (!pageResponse.headers.get('content-type')?.toLowerCase().includes('text/html')) {
    throw new TedTalkError('UPSTREAM_FETCH_FAILED', 'TED returned an unexpected page format');
  }
  if (new URL(pageResponse.url).hostname !== TED_PAGE_HOST) {
    throw new TedTalkError('UPSTREAM_FETCH_FAILED', 'TED redirected to an unsupported location');
  }

  const { source, hls } = parsePage(await pageResponse.text(), input);
  const hlsStreamUrl = parseMediaUrl(hls.stream, 'VIDEO_UNAVAILABLE', 'Video');
  const hlsMetadataUrl = parseMediaUrl(hls.metadata, 'VIDEO_UNAVAILABLE', 'Video metadata');

  const metadataResponse = await getResponse(hlsMetadataUrl, signal, 'application/json');
  if (!metadataResponse.ok) {
    throw new TedTalkError('UPSTREAM_FETCH_FAILED', 'Could not read TED subtitle metadata');
  }
  if (new URL(metadataResponse.url).hostname !== TED_PAGE_HOST && !TED_MEDIA_HOSTS.has(new URL(metadataResponse.url).hostname)) {
    throw new TedTalkError('UPSTREAM_FETCH_FAILED', 'TED subtitle metadata redirected to an unsupported location');
  }

  let metadata: Record<string, unknown> | null;
  try {
    metadata = record(await metadataResponse.json());
  } catch {
    throw new TedTalkError('UPSTREAM_FETCH_FAILED', 'TED returned invalid subtitle metadata');
  }
  const subtitles = Array.isArray(metadata?.subtitles) ? metadata.subtitles : [];
  const english = subtitles.map(record).find((item) => item?.code === 'en');
  const englishVttUrl = parseMediaUrl(
    english?.webvtt,
    'ENGLISH_SUBTITLES_UNAVAILABLE',
    'English subtitles'
  );
  assertTimelineMatch(hlsStreamUrl, hlsMetadataUrl, englishVttUrl);

  const subtitleResponse = await getResponse(englishVttUrl, signal, 'text/vtt,text/plain');
  if (!subtitleResponse.ok) {
    throw new TedTalkError('ENGLISH_SUBTITLES_UNAVAILABLE', 'English subtitles are not available for this talk');
  }
  const subtitleContent = await subtitleResponse.text();
  if (!subtitleContent.trimStart().startsWith('WEBVTT') || !VTT_TIMING_PATTERN.test(subtitleContent)) {
    throw new TedTalkError('ENGLISH_SUBTITLES_UNAVAILABLE', 'English subtitles are empty or invalid');
  }
  signal?.throwIfAborted();

  return {
    source,
    resources: {
      hlsStreamUrl,
      hlsMetadataUrl,
      englishVttUrl,
      durationSeconds: undefined,
    },
    subtitleContent,
  };
}
