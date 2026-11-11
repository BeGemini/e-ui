import { act, render, screen, waitFor } from '@testing-library/react';
import Hls from 'hls.js';
import { VideoPlayer } from '@/app/components/video-player/VideoPlayer';

jest.mock('hls.js', () => {
  const MockHls = jest.fn().mockImplementation(() => ({
    loadSource: jest.fn(),
    attachMedia: jest.fn(),
    destroy: jest.fn(),
    on: jest.fn(),
  }));
  Object.assign(MockHls, {
    isSupported: jest.fn(),
    Events: { ERROR: 'hlsError' },
    ErrorTypes: { NETWORK_ERROR: 'networkError', MEDIA_ERROR: 'mediaError' },
  });
  return { __esModule: true, default: MockHls };
});

// jsdom shims needed by Base UI Select (see video-player-playback-rate.test.tsx).
const TOP_LAYER_SELECTOR = /^:(modal|fullscreen|popover-open)$/;
const originalMatches = Element.prototype.matches;

beforeAll(() => {
  Element.prototype.matches = function matches(this: Element, selector: string) {
    if (TOP_LAYER_SELECTOR.test(selector)) return false;
    return originalMatches.call(this, selector);
  };
  if (typeof window.PointerEvent === 'undefined') {
    window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
  }
});

afterAll(() => {
  Element.prototype.matches = originalMatches;
});

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

const MockedHls = Hls as unknown as jest.Mock & { isSupported: jest.Mock };

const TED_HLS_URL = 'https://hls.ted.com/project_masters/3289/manifest.m3u8?intro_master_id=9294';

const subtitles = [
  { index: 0, text: 'Hello there.', startSeconds: 0, endSeconds: 2, startTime: '00:00:00,000', endTime: '00:00:02,000' },
  { index: 1, text: 'How are you?', startSeconds: 2, endSeconds: 4, startTime: '00:00:02,000', endTime: '00:00:04,000' },
];

function renderPlayer(videoUrl: string, videoFallbackUrl?: string) {
  return render(
    <VideoPlayer
      videoUrl={videoUrl}
      videoFallbackUrl={videoFallbackUrl}
      subtitles={subtitles}
      currentSentenceIndex={0}
      onSentenceEnd={jest.fn()}
    />
  );
}

async function mountedVideo(container: HTMLElement) {
  return waitFor(() => {
    const el = container.querySelector('video');
    if (!el) throw new Error('video not mounted');
    return el;
  });
}

describe('VideoPlayer HLS sources', () => {
  it('uses the external URL as-is (no token) and native src when MSE is unsupported', async () => {
    MockedHls.isSupported.mockReturnValue(false);
    localStorage.setItem('token', 'secret-token');
    const { container } = renderPlayer(TED_HLS_URL);
    const video = await mountedVideo(container);

    await waitFor(() => expect(video.getAttribute('src')).toBe(TED_HLS_URL));
    expect(MockedHls).not.toHaveBeenCalled();
  });

  it('lets hls.js drive the element when MSE is supported', async () => {
    MockedHls.isSupported.mockReturnValue(true);
    const { container, unmount } = renderPlayer(TED_HLS_URL);
    const video = await mountedVideo(container);

    await waitFor(() => expect(MockedHls).toHaveBeenCalledTimes(1));
    const instance = MockedHls.mock.results[0].value;
    expect(instance.loadSource).toHaveBeenCalledWith(TED_HLS_URL);
    expect(instance.attachMedia).toHaveBeenCalledWith(video);
    await waitFor(() => expect(video.getAttribute('src')).toBeNull());

    unmount();
    expect(instance.destroy).toHaveBeenCalled();
  });

  it('still appends the auth token for proxied COS videos', async () => {
    MockedHls.isSupported.mockReturnValue(false);
    localStorage.setItem('token', 'secret-token');
    const { container } = renderPlayer('/api/video/TED/a.mp4');
    const video = await mountedVideo(container);

    await waitFor(() =>
      expect(video.getAttribute('src')).toBe('/api/video/TED/a.mp4?token=secret-token')
    );
  });

  it('switches to the fallback source with a toast on a fatal network error', async () => {
    MockedHls.isSupported.mockReturnValue(true);
    localStorage.setItem('token', 'secret-token');
    const { container } = renderPlayer(TED_HLS_URL, '/api/video/TED/a.mp4');
    await mountedVideo(container);

    await waitFor(() => expect(MockedHls).toHaveBeenCalledTimes(1));
    const first = MockedHls.mock.results[0].value;
    expect(first.loadSource).toHaveBeenCalledWith(TED_HLS_URL);
    const errorHandler = first.on.mock.calls.find(([event]: [string]) => event === 'hlsError')?.[1];
    expect(errorHandler).toBeDefined();

    act(() => {
      errorHandler('hlsError', { fatal: true, type: 'networkError' });
    });

    // The fallback is an mp4 over the proxy: native src with token, no hls.js.
    await waitFor(() => {
      const video = container.querySelector('video');
      expect(video?.getAttribute('src')).toBe('/api/video/TED/a.mp4?token=secret-token');
    });
    expect(first.destroy).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('视频加载超时，已切换播放源');

    // The toast dismisses itself after 3 seconds (real timers).
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull(), { timeout: 4_000 });
  });

  it('ignores non-fatal hls.js errors', async () => {
    MockedHls.isSupported.mockReturnValue(true);
    const { container } = renderPlayer(TED_HLS_URL, '/api/video/TED/a.mp4');
    await mountedVideo(container);

    await waitFor(() => expect(MockedHls).toHaveBeenCalledTimes(1));
    const first = MockedHls.mock.results[0].value;
    const errorHandler = first.on.mock.calls.find(([event]: [string]) => event === 'hlsError')?.[1];

    act(() => {
      errorHandler('hlsError', { fatal: false, type: 'networkError' });
    });

    const video = container.querySelector('video');
    expect(video?.getAttribute('src')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
