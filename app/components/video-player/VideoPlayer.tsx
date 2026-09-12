'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

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
  onSentenceEnd: (sentenceIndex: number, reason: 'auto' | 'skip') => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export function VideoPlayer({
  videoUrl,
  subtitles,
  currentSentenceIndex,
  onSentenceEnd,
  onTimeUpdate,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const pendingPlayRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrlWithToken, setVideoUrlWithToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

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

  // Get current subtitle (API already filters skipped ones)
  const currentSubtitle = currentSentenceIndex < subtitles.length ? subtitles[currentSentenceIndex] : null;

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

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !currentSubtitle) return;

    const time = video.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time);

    // Check if we've reached the end of current subtitle
    if (isPlaying && time >= currentSubtitle.endSeconds && time < currentSubtitle.endSeconds + 0.5) {
      video.pause();
      setIsPlaying(false);
      // Notify parent that the sentence finished playing, but do not auto-advance
      onSentenceEnd(currentSubtitle.index, 'auto');
    }
  }, [isPlaying, currentSubtitle, onSentenceEnd, onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration);
    setIsReady(true);
    applyPendingSeek();
  }, [applyPendingSeek]);

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
      video.pause();
      setIsPlaying(false);
      return;
    }

    // Ensure playback starts inside the current subtitle range.
    // If the user is outside the range (e.g. after a page reload where the
    // seek did not apply yet), jump to the start of the current sentence.
    if (
      video.currentTime < currentSubtitle.startSeconds - 0.1 ||
      video.currentTime > currentSubtitle.endSeconds + 0.1
    ) {
      video.currentTime = currentSubtitle.startSeconds;
      setCurrentTime(currentSubtitle.startSeconds);
    }

    if (!isReady) {
      // Defer playback until the video is ready; the canplay handler will
      // resume playing after applying any pending seek.
      pendingPlayRef.current = true;
      setIsPlaying(true);
      return;
    }

    video.play().catch(() => {
      setIsPlaying(false);
    });
    setIsPlaying(true);
  };

  const handleReplay = () => {
    const video = videoRef.current;
    if (!video || !currentSubtitle) return;

    video.currentTime = currentSubtitle.startSeconds;
    setCurrentTime(currentSubtitle.startSeconds);
    video.play();
    setIsPlaying(true);
  };

  const handleSkipReplay = () => {
    if (!currentSubtitle || currentSentenceIndex >= subtitles.length - 1) return;

    const video = videoRef.current;
    if (!video) return;

    // Move to next subtitle
    const nextSubtitle = subtitles[currentSentenceIndex + 1];
    video.currentTime = nextSubtitle.startSeconds;
    setCurrentTime(nextSubtitle.startSeconds);
    video.play();
    setIsPlaying(true);
    onSentenceEnd(currentSubtitle.index, 'skip');
  };

  const handleSliderChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

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
            Sentence {currentSubtitle.index + 1} / {subtitles.length}
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
      </div>
    </div>
  );
}
