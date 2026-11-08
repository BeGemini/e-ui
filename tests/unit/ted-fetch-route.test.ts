/**
 * @jest-environment node
 */
import { afterEach, describe, expect, it } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/session', () => ({
  requireAdmin: jest.fn(async () => ({ userId: 'admin', role: 'admin' })),
}));

jest.mock('@/lib/ted-media', () => ({
  uploadTedTalkAssets: jest.fn(),
}));

jest.mock('@/lib/ted-talk', () => ({
  fetchTedTalkAssets: jest.fn(),
}));

import { POST } from '@/app/api/admin/exercises/fetch-ted/route';
import { uploadTedTalkAssets } from '@/lib/ted-media';
import { fetchTedTalkAssets } from '@/lib/ted-talk';

const mockedFetchAssets = fetchTedTalkAssets as jest.MockedFunction<typeof fetchTedTalkAssets>;
const mockedUpload = uploadTedTalkAssets as jest.MockedFunction<typeof uploadTedTalkAssets>;

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('POST /api/admin/exercises/fetch-ted', () => {
  it('returns a 504 before the hosting duration limit aborts the request', async () => {
    jest.useFakeTimers();
    mockedFetchAssets.mockImplementation(
      async (_url, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        })
    );
    const request = new NextRequest('http://localhost/api/admin/exercises/fetch-ted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.ted.com/talks/surya_ganguli_can_ai_match_the_human_brain' }),
    });

    const pending = POST(request);
    await jest.advanceTimersByTimeAsync(295_000);
    const response = await pending;

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({
      error: 'TED media acquisition timed out. Please retry.',
      code: 'TIMEOUT',
      field: 'url',
    });
    expect(mockedUpload).not.toHaveBeenCalled();
  });
});
