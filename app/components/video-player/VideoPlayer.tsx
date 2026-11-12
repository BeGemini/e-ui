'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import Hls from 'hls.js';
import { Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isExternalVideoUrl, isHlsVideoUrl } from '@/lib/utils';

export const PLAYBACK_RATES = [0.25, 0.5, 1, 1.25, 1.5] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];
const DEFAULT_PLAYBACK_RATE: PlaybackRate = 1;
const PLAYBACK_RATE_ITEMS = PLAYBACK_RATES.map((r) => ({ value: r, label: `${r}x` }));
// How long initial loading may stall before the player switches to the fallback source.
const LOAD_WATCHDOG_MS = 20_000;
// How long the "switched source" toast stays visible.
const FALLBACK_NOTICE_MS = 3_000;

function isPlaybackRate(v: unknown): v is PlaybackRate {
  return PLAYBACK_RATES.includes(v as PlaybackRate);
}

type Segment = { index: number; startSeconds: number; endSeconds: number };

interface VideoPlayerProps {
  videoUrl: string;
  /** Backup source (e.g. COS copy of a TED video). When the primary source
   *  stalls or fails with a network error, the player switches to it once. */
  videoFallbackUrl?: string | null;
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
  videoFallbackUrl,
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
  const [videoFallbackUrlWithToken, setVideoFallbackUrlWithToken] = useState<string>('');
  const [useFallback, setUseFallback] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState(false);
  const switchedToFallbackRef = useRef(false);
  const loadWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // to avoid SSR/hydration mismatches. Externally hosted videos (e.g. TED HLS
  // streams) are used as-is — they don't go through the authenticated proxy.
  useEffect(() => {
    if (isExternalVideoUrl(videoUrl)) {
      setVideoUrlWithToken(videoUrl);
      return;
    }
    const token = localStorage.getItem('token');
    if (videoUrl && token) {
      const urlWithToken = `${videoUrl}?token=${encodeURIComponent(token)}`;
      setVideoUrlWithToken(urlWithToken);
    } else {
      setVideoUrlWithToken(videoUrl);
    }
  }, [videoUrl]);

  // Same token handling for the fallback source.
  useEffect(() => {
    if (!videoFallbackUrl) {
      setVideoFallbackUrlWithToken('');
      return;
    }
    if (isExternalVideoUrl(videoFallbackUrl)) {
      setVideoFallbackUrlWithToken(videoFallbackUrl);
      return;
    }
    const token = localStorage.getItem('token');
    setVideoFallbackUrlWithToken(
      token ? `${videoFallbackUrl}?token=${encodeURIComponent(token)}` : videoFallbackUrl
    );
  }, [videoFallbackUrl]);

  // A new exercise resets the fallback switch.
  useEffect(() => {
    switchedToFallbackRef.current = false;
    setUseFallback(false);
  }, [videoUrl]);

  const activeVideoUrl = useFallback && videoFallbackUrlWithToken ? videoFallbackUrlWithToken : videoUrlWithToken;

  // Get current subtitle (API already filters skipped ones)
  const currentSubtitle = currentSentenceIndex < subtitles.length ? subtitles[currentSentenceIndex] : null;

  // Use the authoritative total sentence count when provided; otherwise fall
  // back to the effective subtitle array length.
  const totalSentences = totalSentencesProp ?? subtitles.length;

  // Switch to the fallback source once, resuming at the current sentence.
  const switchToFallback = useCallback(() => {
    if (switchedToFallbackRef.current || !videoFallbackUrlWithToken) return;
    switchedToFallbackRef.current = true;
    pendingSeekRef.current = currentSubtitle?.startSeconds ?? null;
    setUseFallback(true);
    setFallbackNotice(true);
  }, [videoFallbackUrlWithToken, currentSubtitle]);

  // Latest-callback ref so the hls.js effect and DOM handlers never go stale.
  const switchToFallbackRef = useRef(switchToFallback);
  switchToFallbackRef.current = switchToFallback;

  // Auto-dismiss the "switched source" notice.
  useEffect(() => {
    if (!fallbackNotice) return;
    const timer = setTimeout(() => setFallbackNotice(false), FALLBACK_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [fallbackNotice]);

  // Watchdog: if a source stays unplayable for too long (e.g. the manifest
  // request hangs until ERR_TIMED_OUT), treat it as a timeout and fall back.
  const clearLoadWatchdog = useCallback(() => {
    if (loadWatchdogRef.current) {
      clearTimeout(loadWatchdogRef.current);
      loadWatchdogRef.current = null;
    }
  }, []);
  const armLoadWatchdog = useCallback(() => {
    clearLoadWatchdog();
    loadWatchdogRef.current = setTimeout(() => {
      switchToFallbackRef.current();
    }, LOAD_WATCHDOG_MS);
  }, [clearLoadWatchdog]);
  useEffect(() => clearLoadWatchdog, [clearLoadWatchdog]);

  // HLS sources (e.g. TED streams) need hls.js except where the browser plays
  // HLS natively (Safari). The decision is made at render time: while MSE is in
  // use the <video> src stays unset from the very first frame, because removing
  // a React-managed src after hls.js attached its MediaSource would reset the
  // media element and detach the stream. The video element only renders after
  // the client-only token effect anyway, so reading window here is safe.
  const isHlsSource = isHlsVideoUrl(activeVideoUrl);
  const useMse = isHlsSource && typeof window !== 'undefined' && Hls.isSupported();
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !useMse) return;
    const hls = new Hls({
      // A dictation player seeks sentence-by-sentence: keep some already-played
      // buffer so "previous sentence" replays don't refetch segments, and don't
      // pull 1080p for a small player.
      backBufferLength: 30,
      capLevelToPlayerSize: true,
    });
    // Retries exhausted on a network level (manifest/segment timeout or
    // unreachable host) — switch to the fallback source instead of hanging.
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        switchToFallbackRef.current();
      }
    });
    hls.loadSource(activeVideoUrl);
    hls.attachMedia(video);
    return () => hls.destroy();
  }, [activeVideoUrl, useMse]);

  // Re-run when the <video> element first mounts (activeVideoUrl becomes non-empty).
  useEffect(() => {
    applyPlaybackRate();
  }, [applyPlaybackRate, activeVideoUrl]);

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
  // to stop close to the sentence end and keep the millisecond readout live.
  useEffect(() => {
    if (!isPlaying) return;
    let frameId = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video) setCurrentTime(video.currentTime);
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
    clearLoadWatchdog();
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
  }, [applyPendingSeek, clearLoadWatchdog]);

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

  const handleSliderChange = (value: number | readonly number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const time = typeof value === 'number' ? value : value[0];
    if (time === undefined) return;

    // Dragging outside the active sentence ends the bounded segment playback.
    const segment = segmentRef.current;
    if (segment && (time < segment.startSeconds || time >= segment.endSeconds)) {
      segmentRef.current = null;
    }

    video.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (seconds: number, showMs = false) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const base = `${mins}:${secs.toString().padStart(2, '0')}`;
    if (!showMs) return base;
    const ms = Math.floor((seconds % 1) * 1000);
    return `${base}.${ms.toString().padStart(3, '0')}`;
  };

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-black p-4">
      <div className="flex gap-4">
        {/* Left: video + progress + sentence info */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Video Element */}
          <div className="relative w-full rounded-lg bg-black">
            {activeVideoUrl ? (
              <video
                ref={videoRef}
                src={useMse ? undefined : activeVideoUrl}
                className="w-full rounded-lg bg-black"
                crossOrigin="anonymous"
                onLoadStart={() => {
                  setIsLoading(true);
                  setIsReady(false);
                  pendingPlayRef.current = false;
                  cancelPendingSeekPlay();
                  armLoadWatchdog();
                }}
                onLoadedMetadata={handleLoadedMetadata}
                onCanPlay={handleCanPlay}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handlePlay}
                onPause={handlePause}
                onError={() => {
                  setIsLoading(false);
                  switchToFallbackRef.current();
                }}
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

            {/* Fallback notice toast (auto-dismisses) */}
            {fallbackNotice && (
              <div
                role="status"
                className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-gray-900/90 px-4 py-2 text-sm text-white shadow-lg"
              >
                视频加载超时，已切换播放源
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300 tabular-nums">{formatTime(currentTime, true)}</span>
            <Slider
              value={[currentTime]}
              max={Math.max(duration, currentTime, 1)}
              step={0.01}
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
              <span className="text-xs text-gray-500 tabular-nums">
                {formatTime(currentSubtitle.startSeconds, true)} – {formatTime(currentSubtitle.endSeconds, true)}
                {' '}({(currentSubtitle.endSeconds - currentSubtitle.startSeconds).toFixed(3)}s)
              </span>
            </div>
          )}
        </div>

        {/* Right: vertical controls, next to the dictation input column */}
        <div className="flex flex-col items-center justify-start gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviousSentence}
            disabled={!onPreviousSentence || !currentSubtitle || currentSentenceIndex <= 0 || isPreviousDisabled}
            className="w-9 px-0 bg-transparent border-0 text-gray-300 hover:bg-gray-700 hover:text-white rounded disabled:text-gray-500"
            aria-label="Previous sentence"
            title="Previous sentence"
          >
            <SkipBack size={16} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayPause}
            className="w-9 px-0 bg-transparent border-0 text-gray-300 hover:bg-gray-700 hover:text-white rounded"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReplay}
            disabled={!currentSubtitle}
            className="w-9 px-0 bg-transparent border-0 text-gray-300 hover:bg-gray-700 hover:text-white rounded disabled:text-gray-500"
            title="Replay"
          >
            <RotateCcw size={16} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkipReplay}
            disabled={!currentSubtitle || currentSentenceIndex >= subtitles.length - 1}
            className="w-9 px-0 bg-transparent border-0 text-gray-300 hover:bg-gray-700 hover:text-white rounded disabled:text-gray-500"
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
              className="w-9 h-7 justify-center gap-0 px-0 bg-transparent border-0 text-gray-300 hover:bg-gray-700 hover:text-white rounded [&_svg]:hidden"
              aria-label="Playback speed"
              title="Playback speed"
            >
              <SelectValue className="flex-none" />
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
    </div>
  );
});
