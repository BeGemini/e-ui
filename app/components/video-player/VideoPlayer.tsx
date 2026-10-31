'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const PLAYBACK_RATES = [0.25, 0.5, 1, 1.25, 1.5] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];
const DEFAULT_PLAYBACK_RATE: PlaybackRate = 1;
const PLAYBACK_RATE_ITEMS = PLAYBACK_RATES.map((r) => ({ value: r, label: `${r}x` }));

function isPlaybackRate(v: unknown): v is PlaybackRate {
  return PLAYBACK_RATES.includes(v as PlaybackRate);
}

type Segment = { index: number; startSeconds: number; endSeconds: number };

interface VideoPlayerProps {
  videoUrl: string;
  subtitles: Array<{
    index: number;
    text: string;
    startSeconds: number;
    endSeconds: number;
    startTime: string;
    endTime: string;
  }>;
  currentSentenceIndex: number;
  totalSentences?: number;
  onSentenceEnd: (sentenceIndex: number, reason: 'auto' | 'skip') => void;
  onTimeUpdate?: (currentTime: number) => void;
  /** Called when the user activates "Previous sentence". The parent owns the
   *  sentence index and is responsible for switching + playback. */
  onPreviousSentence?: () => void;
  /** Extra lock from the parent (e.g. save/check in flight). Defaults to false. */
  isPreviousDisabled?: boolean;
}

export interface VideoPlayerRef {
  /** Seek to the start of the sentence at the given array index and play it. */
  playSentenceAtIndex: (index: number) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(function VideoPlayer({
  videoUrl,
  subtitles,
  currentSentenceIndex,
  totalSentences: totalSentencesProp,
  onSentenceEnd,
  onTimeUpdate,
  onPreviousSentence,
  isPreviousDisabled = false,
}: VideoPlayerProps, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const pendingPlayRef = useRef(false);
  // The sentence currently being played as a bounded segment. Kept in a ref so
  // end detection never depends on a stale `isPlaying` closure.
  const segmentRef = useRef<Segment | null>(null);
  // Removes the pending "play after seeked" listener, if any.
  const cancelSeekPlayRef = useRef<(() => void) | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrlWithToken, setVideoUrlWithToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(DEFAULT_PLAYBACK_RATE);

  // Set defaultPlaybackRate too, since the media load algorithm resets
  // playbackRate to it when the source changes.
  const applyPlaybackRate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.defaultPlaybackRate = playbackRate;
    video.playbackRate = playbackRate;
  }, [playbackRate]);

  const cancelPendingSeekPlay = useCallback(() => {
    cancelSeekPlayRef.current?.();
    cancelSeekPlayRef.current = null;
  }, []);

  // Seek to `fromTime` and play the segment. Playback only starts once the
  // seek has completed, otherwise the browser briefly plays (and shows) the
  // old position — typically the start of the next sentence.
  const playSegment = useCallback((segment: Segment, fromTime: number = segment.startSeconds) => {
    const video = videoRef.current;
    if (!video) return;

    cancelPendingSeekPlay();
    segmentRef.current = segment;
    setIsPlaying(true);

    const needsSeek = Math.abs(video.currentTime - fromTime) > 0.01;
    if ((needsSeek || video.seeking) && !video.paused) {
      video.pause();
    }
    if (needsSeek) {
      video.currentTime = fromTime;
      setCurrentTime(fromTime);
    }

    if (!isReady) {
      // The canplay handler resumes playback after loading.
      pendingPlayRef.current = true;
      return;
    }

    const start = () => {
      video.play().catch(() => {
        // Autoplay may be blocked; keep button state consistent
        setIsPlaying(false);
      });
    };

    if (!video.seeking) {
      start();
      return;
    }

    const onSeeked = () => {
      cancelSeekPlayRef.current = null;
      start();
    };
    video.addEventListener('seeked', onSeeked, { once: true });
    cancelSeekPlayRef.current = () => video.removeEventListener('seeked', onSeeked);
  }, [isReady, cancelPendingSeekPlay]);

  // Expose imperative playback control so the parent can trigger playback
  // when the user advances to the next sentence.
  useImperativeHandle(ref, () => ({
    playSentenceAtIndex: (index: number) => {
      const targetSubtitle = index < subtitles.length ? subtitles[index] : null;
      if (!targetSubtitle) return;
      playSegment(targetSubtitle);
    },
  }), [subtitles, playSegment]);

  // Add token to video URL. Reading localStorage must happen in an effect
  // to avoid SSR/hydration mismatches.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (videoUrl && token) {
      const urlWithToken = `${videoUrl}?token=${encodeURIComponent(token)}`;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVideoUrlWithToken(urlWithToken);
    } else {
      setVideoUrlWithToken(videoUrl);
    }
  }, [videoUrl]);

  // Re-run when the <video> element first mounts (videoUrlWithToken becomes non-empty).
  useEffect(() => {
    applyPlaybackRate();
  }, [applyPlaybackRate, videoUrlWithToken]);

  // Get current subtitle (API already filters skipped ones)
  const currentSubtitle = currentSentenceIndex < subtitles.length ? subtitles[currentSentenceIndex] : null;

  // Use the authoritative total sentence count when provided; otherwise fall
  // back to the effective subtitle array length.
  const totalSentences = totalSentencesProp ?? subtitles.length;

  const seekTo = useCallback((targetTime: number) => {
    const video = videoRef.current;
    if (!video || !currentSubtitle) return;

    if (isReady && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      // Only seek if significantly different from current time to avoid
      // resetting the playhead on redundant renders.
      if (Math.abs(video.currentTime - targetTime) > 0.5) {
        video.currentTime = targetTime;
        setCurrentTime(targetTime);
      }
      pendingSeekRef.current = null;
    } else {
      // Defer the seek until the video is ready
      pendingSeekRef.current = targetTime;
    }
  }, [isReady, currentSubtitle]);

  const applyPendingSeek = useCallback(() => {
    const video = videoRef.current;
    if (!video || pendingSeekRef.current === null) return;

    video.currentTime = pendingSeekRef.current;
    setCurrentTime(pendingSeekRef.current);
    pendingSeekRef.current = null;
  }, []);

  // Seek to current subtitle start when it changes
  useEffect(() => {
    if (!currentSubtitle) return;
    seekTo(currentSubtitle.startSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSubtitle?.index, seekTo]);

  // Apply pending seek when video becomes ready
  useEffect(() => {
    if (isReady) {
      applyPendingSeek();
    }
  }, [isReady, applyPendingSeek]);

  const stopAtSegmentEnd = useCallback(() => {
    const video = videoRef.current;
    const segment = segmentRef.current;
    // Ignore mid-seek positions: they may still report the pre-seek time.
    if (!video || !segment || video.paused || video.seeking) return;
    if (video.currentTime < segment.endSeconds) return;

    segmentRef.current = null;
    video.pause();
    // Pull back from any overshoot so the paused frame belongs to this
    // sentence rather than the next one.
    const settleTime = Math.max(segment.startSeconds, segment.endSeconds - 0.05);
    video.currentTime = settleTime;
    setCurrentTime(settleTime);
    setIsPlaying(false);
    // Notify parent that the sentence finished playing, but do not auto-advance
    onSentenceEnd(segment.index, 'auto');
  }, [onSentenceEnd]);

  // `timeupdate` fires only every ~250ms, so poll every frame while playing
  // to stop close to the sentence end.
  useEffect(() => {
    if (!isPlaying) return;
    let frameId = 0;
    const tick = () => {
      stopAtSegmentEnd();
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, stopAtSegmentEnd]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const time = video.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time);
    // Fallback for when rAF is throttled (e.g. background tab).
    stopAtSegmentEnd();
  }, [onTimeUpdate, stopAtSegmentEnd]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    applyPlaybackRate();
    setDuration(video.duration);
    setIsReady(true);
    applyPendingSeek();
  }, [applyPendingSeek, applyPlaybackRate]);

  const handleCanPlay = useCallback(() => {
    const video = videoRef.current;
    setIsReady(true);
    setIsLoading(false);
    applyPendingSeek();

    if (pendingPlayRef.current && video) {
      pendingPlayRef.current = false;
      video.play().catch(() => {
        // Autoplay may be blocked; keep button state consistent
        setIsPlaying(false);
      });
    }
  }, [applyPendingSeek]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video || !currentSubtitle) return;

    if (isPlaying) {
      pendingPlayRef.current = false;
      cancelPendingSeekPlay();
      video.pause();
      setIsPlaying(false);
      return;
    }

    // Ensure playback starts inside the current subtitle range.
    // If the user is outside the range (e.g. after a page reload where the
    // seek did not apply yet, or after auto-pausing at the sentence end),
    // restart from the beginning of the current sentence.
    const isOutsideSentence =
      video.currentTime < currentSubtitle.startSeconds - 0.1 ||
      video.currentTime >= currentSubtitle.endSeconds - 0.1;
    playSegment(
      currentSubtitle,
      isOutsideSentence ? currentSubtitle.startSeconds : video.currentTime
    );
  };

  const handleReplay = () => {
    if (!currentSubtitle) return;
    playSegment(currentSubtitle);
  };

  const handleSkipReplay = () => {
    if (!currentSubtitle || currentSentenceIndex >= subtitles.length - 1) return;

    // Move to next subtitle
    playSegment(subtitles[currentSentenceIndex + 1]);
    onSentenceEnd(currentSubtitle.index, 'skip');
  };

  const handleSliderChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    // Dragging outside the active sentence ends the bounded segment playback.
    const segment = segmentRef.current;
    if (segment && (value[0] < segment.startSeconds || value[0] >= segment.endSeconds)) {
      segmentRef.current = null;
    }

    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full space-y-4 rounded-lg border border-gray-200 bg-black p-4">
      {/* Video Element */}
      <div className="relative w-full rounded-lg bg-black">
        {videoUrlWithToken ? (
          <video
            ref={videoRef}
            src={videoUrlWithToken}
            className="w-full rounded-lg bg-black"
            crossOrigin="anonymous"
            onLoadStart={() => {
              setIsLoading(true);
              setIsReady(false);
              pendingPlayRef.current = false;
              cancelPendingSeekPlay();
            }}
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={handleCanPlay}
            onTimeUpdate={handleTimeUpdate}
            onPlay={handlePlay}
            onPause={handlePause}
            onError={() => setIsLoading(false)}
          />
        ) : (
          <div className="w-full aspect-video rounded-lg bg-gray-800 flex items-center justify-center">
            <span className="text-gray-400">Loading video...</span>
          </div>
        )}
        
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-blue-500"></div>
              <span className="text-sm text-gray-400">Loading video...</span>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-300">{formatTime(currentTime)}</span>
        <Slider
          value={[currentTime]}
          max={Math.max(duration, currentTime, 1)}
          step={0.1}
          onValueChange={handleSliderChange}
          className="flex-1"
        />
        <span className="text-sm text-gray-300">{formatTime(duration)}</span>
      </div>

      {/* Sentence Info */}
      {currentSubtitle && (
        <div className="flex items-center justify-between rounded bg-gray-800 px-3 py-2 text-sm text-gray-300">
          <span>
            Sentence {currentSubtitle.index + 1} / {totalSentences}
          </span>
          <span className="text-xs text-gray-500">
            Duration: {(currentSubtitle.endSeconds - currentSubtitle.startSeconds).toFixed(1)}s
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousSentence}
          disabled={!onPreviousSentence || !currentSubtitle || currentSentenceIndex <= 0 || isPreviousDisabled}
          className="bg-transparent border-0 text-gray-300 hover:bg-gray-700 hover:text-white rounded disabled:text-gray-500"
          aria-label="Previous sentence"
          title="Previous sentence"
        >
          <SkipBack size={16} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlayPause}
          className="bg-transparent border-0 text-gray-300 hover:bg-gray-700 hover:text-white rounded"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReplay}
          disabled={!currentSubtitle}
          className="bg-transparent border-0 text-gray-300 hover:bg-gray-700 hover:text-white rounded disabled:text-gray-500"
          title="Replay"
        >
          <RotateCcw size={16} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSkipReplay}
          disabled={!currentSubtitle || currentSentenceIndex >= subtitles.length - 1}
          className="bg-transparent border-0 text-gray-300 hover:bg-gray-700 hover:text-white rounded disabled:text-gray-500"
          title="Skip & Continue"
        >
          <SkipForward size={16} />
        </Button>
        <Select
          items={PLAYBACK_RATE_ITEMS}
          value={playbackRate}
          onValueChange={(v) => {
            if (isPlaybackRate(v)) setPlaybackRate(v);
          }}
        >
          <SelectTrigger
            size="sm"
            className="bg-transparent border-0 text-gray-300 hover:bg-gray-700 hover:text-white rounded"
            aria-label="Playback speed"
            title="Playback speed"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAYBACK_RATE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
});
