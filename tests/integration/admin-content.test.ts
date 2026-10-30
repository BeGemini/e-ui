/**
 * @jest-environment node
 */
import { describe, it, expect, beforeAll } from '@jest/globals';

/**
 * Integration Tests: Admin Content Management (spec 005)
 *
 * Runs against a live server (TEST_BASE_URL, default http://localhost:3000).
 * Role-specific suites need credentials and are skipped otherwise:
 *   TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD  – an account with role 'admin'
 *   TEST_USER_EMAIL  / TEST_USER_PASSWORD   – an account with role 'user'
 *
 * Note: admin suites create real rows (prefixed "__test__") because there is no delete API in this release.
 */

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
const adminCreds = { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD };
const userCreds = { email: process.env.TEST_USER_EMAIL, password: process.env.TEST_USER_PASSWORD };

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error(`Login failed for ${email}`);
  return data.token;
}

async function call(path: string, token: string | null, body?: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // Loose JSON typing keeps assertions on deeply nested API payloads readable in tests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: res.status, data: (await res.json().catch(() => ({}))) as Record<string, any> };
}

const adminEndpoints: [string, unknown][] = [
  ['/api/admin/content', undefined],
  ['/api/admin/series', { title: 'x', difficulty: 'beginner' }],
  ['/api/admin/seasons', {}],
  ['/api/admin/episodes', {}],
  ['/api/admin/exercises/probe', { videoUrl: 'a.mp4', subtitleUrl: 'a.srt' }],
  ['/api/admin/exercises', {}],
];

describe('Admin API access control (US4)', () => {
  it.each(adminEndpoints)('%s rejects requests without a token (401)', async (path, body) => {
    const { status } = await call(path, null, body);
    expect(status).toBe(401);
  });

  const withUser = userCreds.email && userCreds.password ? describe : describe.skip;
  withUser('as a regular user', () => {
    let userToken: string;
    beforeAll(async () => {
      userToken = await login(userCreds.email!, userCreds.password!);
    });

    it.each(adminEndpoints)('%s rejects non-admins (403)', async (path, body) => {
      const { status, data } = await call(path, userToken, body);
      expect(status).toBe(403);
      expect(data.error).toBe('Forbidden: admin only');
    });
  });
});

const withAdmin = adminCreds.email && adminCreds.password ? describe : describe.skip;

withAdmin('Admin content creation (US1, US2)', () => {
  const stamp = Date.now();
  const title = `__test__ Series ${stamp}`;
  let token: string;
  let seriesId: string;
  let seasonId: string;
  let episodeId: string;

  beforeAll(async () => {
    token = await login(adminCreds.email!, adminCreds.password!);
  });

  it('creates a series (201) and rejects a duplicate title (409)', async () => {
    const created = await call('/api/admin/series', token, { title, difficulty: 'intermediate' });
    expect(created.status).toBe(201);
    seriesId = created.data.seriesId;

    const dup = await call('/api/admin/series', token, { title, difficulty: 'beginner' });
    expect(dup.status).toBe(409);
    expect(dup.data.field).toBe('title');
  });

  it('returns 400 with field errors for invalid input', async () => {
    const res = await call('/api/admin/seasons', token, { seriesId, seasonNumber: 0 });
    expect(res.status).toBe(400);
    expect(res.data.fieldErrors.seasonNumber).toBeDefined();
  });

  it('returns 404 when the parent does not exist', async () => {
    const res = await call('/api/admin/seasons', token, {
      seriesId: '00000000-0000-4000-8000-000000000000',
      seasonNumber: 1,
    });
    expect(res.status).toBe(404);
    expect(res.data.field).toBe('seriesId');
  });

  it('creates a season and rejects a duplicate season number', async () => {
    const created = await call('/api/admin/seasons', token, { seriesId, seasonNumber: 1 });
    expect(created.status).toBe(201);
    seasonId = created.data.seasonId;

    const dup = await call('/api/admin/seasons', token, { seriesId, seasonNumber: 1 });
    expect(dup.status).toBe(409);
    expect(dup.data.field).toBe('seasonNumber');
  });

  it('creates an episode and recomputes season/series episode counts', async () => {
    const created = await call('/api/admin/episodes', token, { seasonId, episodeNumber: 1, title: 'Pilot' });
    expect(created.status).toBe(201);
    episodeId = created.data.episodeId;

    const { data } = await call('/api/admin/content', token);
    const series = data.series.find((s: { seriesId: string }) => s.seriesId === seriesId);
    expect(series.totalEpisodes).toBe(1);
    expect(series.seasons[0].totalEpisodes).toBe(1);
    expect(series.seasons[0].episodes[0].episodeId).toBe(episodeId);
  });

  it('probe reports per-resource errors without writing anything', async () => {
    const res = await call('/api/admin/exercises/probe', token, {
      videoUrl: `__test__/missing-${stamp}.mp4`,
      subtitleUrl: `__test__/missing-${stamp}.txt`,
    });
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(false);
    expect(res.data.video.ok).toBe(false);
    expect(res.data.subtitle.error.code).toBe('UNSUPPORTED_EXTENSION');
  });

  it('rejects exercise creation with 422 when resources fail validation, and ignores client metadata', async () => {
    const res = await call('/api/admin/exercises', token, {
      episodeId,
      title: 'Full Version',
      videoUrl: `__test__/missing-${stamp}.mp4`,
      subtitleUrl: `__test__/missing-${stamp}.srt`,
      totalSentences: 999,
      durationSeconds: 999,
      subtitleFormat: 'srt',
    });
    expect(res.status).toBe(422);
    expect(res.data.probe.ok).toBe(false);

    const { data } = await call('/api/admin/content', token);
    const series = data.series.find((s: { seriesId: string }) => s.seriesId === seriesId);
    expect(series.seasons[0].episodes[0].exercises).toHaveLength(0);
    expect(series.seasons[0].episodes[0].totalExercises).toBe(0);
  });
});
