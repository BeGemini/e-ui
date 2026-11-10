import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { VideoPlayer } from '@/app/components/video-player/VideoPlayer';

// jsdom shims needed by Base UI Select (rendered in the same controls row):
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
  { index: 2, text: 'Fine, thanks.', startSeconds: 4, endSeconds: 6, startTime: '00:00:04,000', endTime: '00:00:06,000' },
];

type PlayerProps = ComponentProps<typeof VideoPlayer>;

function renderPlayer(overrides: Partial<PlayerProps> = {}) {
  const onSentenceEnd = jest.fn();
  const utils = render(
    <VideoPlayer
      videoUrl="/v.mp4"
      subtitles={subtitles}
      currentSentenceIndex={1}
      onSentenceEnd={onSentenceEnd}
      {...overrides}
    />,
  );
  return { ...utils, onSentenceEnd };
}

function previousButton() {
  return screen.getByRole('button', { name: 'Previous sentence' });
}

describe('VideoPlayer previous sentence button', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('(a) is disabled on the first sentence and does not call the callback', () => {
    const onPreviousSentence = jest.fn();
    renderPlayer({ currentSentenceIndex: 0, onPreviousSentence });

    const button = previousButton();
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onPreviousSentence).not.toHaveBeenCalled();
  });

  it('(b) calls onPreviousSentence once and never onSentenceEnd', () => {
    const onPreviousSentence = jest.fn();
    const { onSentenceEnd } = renderPlayer({ currentSentenceIndex: 1, onPreviousSentence });

    const button = previousButton();
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onPreviousSentence).toHaveBeenCalledTimes(1);
    // Previous must never trigger the save path (onSentenceEnd → saveProgress).
    expect(onSentenceEnd).toHaveBeenCalledTimes(0);
  });

  it('(c) is disabled when no onPreviousSentence handler is provided', () => {
    renderPlayer({ currentSentenceIndex: 1 });

    expect(previousButton()).toBeDisabled();
  });

  it('(d) is the first button in the controls row, before Play/Pause', () => {
    renderPlayer({ currentSentenceIndex: 1, onPreviousSentence: jest.fn() });

    const playButton = screen.getByTitle('Play');
    const controlsRow = playButton.parentElement;
    expect(controlsRow).not.toBeNull();
    const firstButton = controlsRow?.querySelector('button');
    expect(firstButton).toBe(previousButton());
    expect(
      previousButton().compareDocumentPosition(playButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('(e) is locked while the parent reports a save/check in flight', () => {
    const onPreviousSentence = jest.fn();
    const { onSentenceEnd } = renderPlayer({
      currentSentenceIndex: 1,
      onPreviousSentence,
      isPreviousDisabled: true,
    });

    const button = previousButton();
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onPreviousSentence).not.toHaveBeenCalled();
    expect(onSentenceEnd).not.toHaveBeenCalled();
  });

  it('(f) is an accessible native button with tooltip, disabled state and focus', () => {
    const { unmount } = renderPlayer({ currentSentenceIndex: 0, onPreviousSentence: jest.fn() });

    const disabledButton = previousButton();
    expect(disabledButton.tagName).toBe('BUTTON');
    expect(disabledButton).toHaveAttribute('title', 'Previous sentence');
    expect(disabledButton).toHaveAttribute('disabled');
    unmount();

    renderPlayer({ currentSentenceIndex: 2, onPreviousSentence: jest.fn() });
    const enabledButton = previousButton();
    expect(enabledButton).not.toHaveAttribute('disabled');
    enabledButton.focus();
    expect(document.activeElement).toBe(enabledButton);
  });
});
