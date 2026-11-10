import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VideoPlayer } from '@/app/components/video-player/VideoPlayer';

// jsdom shims needed by Base UI Select:
// - nwsapi resolves :modal/:fullscreen/:popover-open by calling back into
//   Element.matches, recursing until a stack overflow (very slow). Nothing
//   is ever in the top layer in jsdom, so answer false directly.
// - jsdom does not implement PointerEvent.
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

const subtitles = [
  { index: 0, text: 'Hello there.', startSeconds: 0, endSeconds: 2, startTime: '00:00:00,000', endTime: '00:00:02,000' },
  { index: 1, text: 'How are you?', startSeconds: 2, endSeconds: 4, startTime: '00:00:02,000', endTime: '00:00:04,000' },
];

function playerElement(videoUrl: string) {
  return (
    <VideoPlayer
      videoUrl={videoUrl}
      subtitles={subtitles}
      currentSentenceIndex={0}
      onSentenceEnd={jest.fn()}
    />
  );
}

async function renderPlayer(videoUrl = '/api/videos/a.mp4') {
  const utils = render(playerElement(videoUrl));
  const video = await waitFor(() => {
    const el = utils.container.querySelector('video');
    if (!el) throw new Error('video not mounted');
    return el;
  });
  return { ...utils, video };
}

// Base UI only commits mouse clicks that start with a pointerdown on the item.
function clickOption(option: HTMLElement) {
  fireEvent.pointerDown(option, { pointerType: 'mouse' });
  fireEvent.mouseUp(option);
  fireEvent.click(option);
}

async function selectRate(label: string) {
  fireEvent.click(screen.getByRole('combobox'));
  clickOption(await screen.findByRole('option', { name: label }));
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
}

describe('VideoPlayer playback speed', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to 1x', async () => {
    const { video } = await renderPlayer();

    expect(screen.getByRole('combobox')).toHaveTextContent('1x');
    expect(video.playbackRate).toBe(1);
    expect(video.defaultPlaybackRate).toBe(1);
  });

  it('offers five rates in order and applies the selected one', async () => {
    const { video } = await renderPlayer();

    fireEvent.click(screen.getByRole('combobox'));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['0.25x', '0.5x', '1x', '1.25x', '1.5x']);

    clickOption(screen.getByRole('option', { name: '0.5x' }));

    await waitFor(() => expect(video.playbackRate).toBe(0.5));
    expect(video.defaultPlaybackRate).toBe(0.5);
    expect(screen.getByRole('combobox')).toHaveTextContent('0.5x');
  });

  it('keeps the selected rate after the video source reloads', async () => {
    const { video, rerender } = await renderPlayer();

    await selectRate('1.25x');
    expect(video.playbackRate).toBe(1.25);

    rerender(playerElement('/api/videos/b.mp4'));
    await waitFor(() => expect(video.getAttribute('src')).toContain('/api/videos/b.mp4'));

    // Simulate the media load algorithm resetting playbackRate.
    video.playbackRate = 1;
    Object.defineProperty(video, 'duration', { configurable: true, value: 4 });
    fireEvent.loadedMetadata(video);

    expect(video.playbackRate).toBe(1.25);
    expect(video.defaultPlaybackRate).toBe(1.25);
  });

  it('has an accessible name and is keyboard operable', async () => {
    const { video } = await renderPlayer();

    const trigger = screen.getByRole('combobox', { name: 'Playback speed' });
    expect(trigger).toHaveAttribute('aria-label', 'Playback speed');
    expect(trigger).toHaveTextContent('1x');

    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    // Focus moves to the selected item (1x) once open; move down once to 1.25x.
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('option', { name: '1x' })));
    fireEvent.keyDown(document.activeElement ?? trigger, { key: 'ArrowDown' });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('option', { name: '1.25x' })));
    fireEvent.keyDown(document.activeElement ?? trigger, { key: 'Enter' });

    await waitFor(() => expect(video.playbackRate).toBe(1.25));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await waitFor(() => expect(document.activeElement).toBe(trigger));

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('option', { name: '1.25x' })));
    fireEvent.keyDown(document.activeElement ?? trigger, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(video.playbackRate).toBe(1.25);
  });
});
