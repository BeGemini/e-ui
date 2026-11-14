'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VideoPlayer } from '@/app/components/video-player/VideoPlayer';
import type { VideoPlayerRef } from '@/app/components/video-player/VideoPlayer';
import { DictationInput } from '@/app/components/dictation/DictationInput';
import { WordFeedbackDisplay } from '@/app/components/dictation/WordFeedbackDisplay';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePracticeProgress } from '@/app/components/layout/PracticeProgress';
import type { Note, PracticeAttempt, SaveAttemptRequest, SubtitleTimeAdjustment, WordFeedback } from '@/lib/types';
import { formatSubtitleTimestamp, applyLinkedTimeEdit, clearLinkedTimeEdit } from '@/lib/utils';

interface Subtitle {
  index: number;
  text: string;
  startSeconds: number;
  endSeconds: number;
  startTime: string;
  endTime: string;
  /** Present on effective subtitles; the row's boundaries come from its
   *  first/last original index, which is where timing overrides live. */
  originalIndices?: number[];
}

interface PracticeData {
  exerciseId: string;
  videoUrl: string;
  videoFallbackUrl?: string | null;
  subtitleFormat: string;
  totalSentences: number;
  durationSeconds: number;
  subtitles: Subtitle[];
  userProgress: {
    currentSentenceIndex: number;
    isCompleted: boolean;
    overallAccuracy?: number;
  };
  userConfig?: {
    timeAdjustments?: SubtitleTimeAdjustment[] | string | null;
    globalTimeOffsetMs?: number;
    timingMode?: 'sentence' | 'global';
  } | null;
  notes: Note[];
  attempts: PracticeAttempt[];
}

interface CheckResponse {
  accuracy: number;
  correctText?: string;
  wordFeedback: WordFeedback[];
}

function getAttemptState(attempts: PracticeAttempt[], sentenceIndex: number) {
  const attempt = attempts.find((item) => item.sentenceIndex === sentenceIndex);

  return {
    userInput: attempt?.userInput ?? '',
    feedback: attempt
      ? { accuracy: attempt.accuracy, wordFeedback: attempt.wordFeedback }
      : null,
  };
}

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const exerciseId = params.exerciseId as string;

  const [practiceData, setPracticeData] = useState<PracticeData | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [currentFeedback, setCurrentFeedback] = useState<CheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAccuracy, setIsCheckingAccuracy] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  // The user's per-sentence timing overrides (same store the subtitle editor
  // writes to), so player-side adjustments show up there too.
  const [timeAdjustments, setTimeAdjustments] = useState<SubtitleTimeAdjustment[]>([]);
  // Whole-video timing controls, independent of per-sentence overrides; only
  // one mode is applied server-side at a time.
  const [timingMode, setTimingMode] = useState<'sentence' | 'global'>('sentence');
  const [globalOffsetMs, setGlobalOffsetMs] = useState(0);
  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  // Serializes sentence saves so they reach the server in the order the user acted.
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const { setProgress } = usePracticeProgress();

  // Queue a background save of the checked sentence. Never rejects, never blocks the UI.
  const enqueueSaveAttempt = (payload: SaveAttemptRequest) => {
    saveChainRef.current = saveChainRef.current.then(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/practice/${exerciseId}/save-attempt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error('Failed to save sentence');
        }
      } catch {
        toast({
          title: "Couldn't save your sentence",
          description: 'Your feedback is still shown. You can keep practicing.',
        });
      }
    });
  };

  // Fetch practice data on mount or when exerciseId changes
  useEffect(() => {
    const fetchPracticeData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.push('/');
          return;
        }
        
        const response = await fetch(`/api/practice/${exerciseId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load practice data');
        }

        const data = await response.json();
        const sentenceIndex = data.data.userProgress?.currentSentenceIndex ?? 0;
        const attemptState = getAttemptState(data.data.attempts ?? [], sentenceIndex);

        const rawAdjustments = data.data.userConfig?.timeAdjustments;
        const parsedAdjustments = typeof rawAdjustments === 'string'
          ? JSON.parse(rawAdjustments || '[]')
          : rawAdjustments;
        setTimeAdjustments(Array.isArray(parsedAdjustments) ? parsedAdjustments : []);
        setTimingMode(data.data.userConfig?.timingMode === 'global' ? 'global' : 'sentence');
        setGlobalOffsetMs(
          typeof data.data.userConfig?.globalTimeOffsetMs === 'number'
            ? data.data.userConfig.globalTimeOffsetMs
            : 0
        );

        setPracticeData(data.data);
        setCurrentSentenceIndex(sentenceIndex);
        setUserInput(attemptState.userInput);
        setCurrentFeedback(attemptState.feedback);
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load exercise',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (exerciseId) {
      fetchPracticeData();
    }
  }, [exerciseId]);

  // Get current subtitle (skip skipped ones)
  const getCurrentSubtitle = useCallback(() => {
    if (!practiceData || !practiceData.subtitles) return null;

    // API already filters out skipped subtitles, so just return the current one
    if (currentSentenceIndex < practiceData.subtitles.length) {
      return practiceData.subtitles[currentSentenceIndex];
    }
    return null;
  }, [practiceData, currentSentenceIndex]);

  // Total sentences exposed by the API already reflects the user's subtitle
  // configuration (merge/skip). Fallback to the raw subtitle count just in case.
  const totalSentences = practiceData?.totalSentences ?? practiceData?.subtitles.length ?? 0;

  const currentSubtitle = getCurrentSubtitle();

  // Whether the current sentence's boundaries carry timing overrides (used
  // to show the reset control in the player's timing panel).
  const currentOriginals = currentSubtitle?.originalIndices
    ?? (currentSubtitle ? [currentSubtitle.index] : []);
  const isSentenceTimeAdjusted =
    !!currentSubtitle &&
    currentOriginals.length > 0 &&
    timeAdjustments.some(
      (a) =>
        (a.index === currentOriginals[0] && a.startSeconds !== undefined) ||
        (a.index === currentOriginals[currentOriginals.length - 1] && a.endSeconds !== undefined)
    );

  // Report progress so the site header can display it.
  useEffect(() => {
    if (!practiceData) return;
    setProgress({ current: currentSentenceIndex, total: totalSentences });
  }, [practiceData, currentSentenceIndex, totalSentences, setProgress]);

  useEffect(() => () => setProgress(null), [setProgress]);

  const cacheAttempt = (attempt: PracticeAttempt) => {
    setPracticeData((current) => current ? {
      ...current,
      attempts: [
        ...current.attempts.filter((item) => item.sentenceIndex !== attempt.sentenceIndex),
        attempt,
      ],
    } : current);
  };

  // Handle checking accuracy
  const handleCheckAccuracy = async () => {
    if (!currentSubtitle || !userInput.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your dictation first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCheckingAccuracy(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/practice/${exerciseId}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sentenceIndex: currentSubtitle.index,
          userInput: userInput.trim(),
          correctText: currentSubtitle.text,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || 'Failed to check accuracy');
      }

      const feedback: CheckResponse = await response.json();
      setCurrentFeedback(feedback);
      cacheAttempt({
        sentenceIndex: currentSubtitle.index,
        userInput: userInput.trim(),
        accuracy: feedback.accuracy,
        wordFeedback: feedback.wordFeedback,
      });

      // Save in the background after showing feedback; does not advance the sentence.
      enqueueSaveAttempt({
        sentenceIndex: currentSubtitle.index,
        userInput: userInput.trim(),
        correctText: feedback.correctText ?? currentSubtitle.text,
        accuracy: feedback.accuracy,
        wordFeedback: feedback.wordFeedback,
      });

      toast({
        title: 'Checked',
        description: `Accuracy: ${feedback.accuracy}%`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to check accuracy',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingAccuracy(false);
    }
  };

  // Handle moving to next sentence (video auto-paused at end)
  const handleSentenceEnd = async (
    sentenceIndex: number,
    reason: 'auto' | 'skip' = 'auto'
  ) => {
    if (!practiceData) return;

    if (reason === 'skip') {
      // User explicitly skipped this sentence; save progress and advance
      await saveProgress(sentenceIndex, 0);
    }
    // For normal auto-pause at the end of a sentence, stay on the current
    // sentence so the user can type their dictation and check it.
  };

  const advanceToNextSentence = async (completedIndex: number) => {
    if (!practiceData) return;

    // Find next sentence (API already filters skipped ones)
    const nextIndex = completedIndex + 1;

    if (nextIndex >= totalSentences) {
      // Exercise completed
      handleExerciseComplete(completedIndex);
    } else {
      const attemptState = getAttemptState(practiceData.attempts, nextIndex);
      setCurrentSentenceIndex(nextIndex);
      setUserInput(attemptState.userInput);
      setCurrentFeedback(attemptState.feedback);
      // Auto-play the next sentence so the user can listen immediately.
      // A small timeout ensures the player has rendered with the new index.
      setTimeout(() => {
        videoPlayerRef.current?.playSentenceAtIndex(nextIndex);
      }, 0);
    }
  };

  const handlePreviousSentence = () => {
    if (currentSentenceIndex <= 0 || isSavingProgress || isCheckingAccuracy || !practiceData) return;

    // Client-only navigation: intentionally does NOT call saveProgress (FR-007).
    const prev = currentSentenceIndex - 1;
    const attemptState = getAttemptState(practiceData.attempts, prev);
    setCurrentSentenceIndex(prev);
    setUserInput(attemptState.userInput);
    setCurrentFeedback(attemptState.feedback);
    setTimeout(() => {
      videoPlayerRef.current?.playSentenceAtIndex(prev);
    }, 0);
  };

  const saveProgress = async (sentenceIndex: number, accuracy: number) => {
    if (!practiceData || !currentSubtitle) return;

    try {
      setIsSavingProgress(true);
      // Wait for any saves queued by earlier Checks so this Next/Skip write is always the last one.
      await saveChainRef.current;
      const token = localStorage.getItem('token');

      const isCompleted =
        sentenceIndex >= totalSentences - 1;

      const response = await fetch(`/api/practice/${exerciseId}/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sentenceIndex,
          accuracy,
          userInput: userInput.trim(),
          correctText: currentSubtitle.text,
          wordFeedback: currentFeedback?.wordFeedback ?? [],
          isCompleted,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }

      cacheAttempt({
        sentenceIndex,
        userInput: userInput.trim(),
        accuracy,
        wordFeedback: currentFeedback?.wordFeedback ?? [],
      });
      await advanceToNextSentence(sentenceIndex);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save progress',
        variant: 'destructive',
      });
    } finally {
      setIsSavingProgress(false);
    }
  };

  const handleExerciseComplete = (lastSentenceIndex: number) => {
    setCompletionMessage('Congratulations! You have completed this exercise.');
    setTimeout(() => {
      router.push(`/dashboard/${exerciseId}/complete`);
    }, 2000);
  };

  const handleClearInput = () => {
    setUserInput('');
    setCurrentFeedback(null);
  };

  const handleSkip = async () => {
    if (!currentSubtitle) return;

    // Save with 0 accuracy (skipped)
    await saveProgress(currentSubtitle.index, 0);
  };

  // Apply a timing override to the current sentence and persist it. The
  // boundary is shared: setting start also pins the previous sentence's end,
  // setting end pins the next sentence's start. Stored in the same per-user
  // config as the subtitle editor, so both stay in sync.
  const handleAdjustSentenceTime = async (
    field: 'start' | 'end',
    seconds: number
  ) => {
    if (!practiceData || !currentSubtitle) return;

    const targetFirstOriginal = (currentSubtitle.originalIndices ?? [currentSubtitle.index])[0];
    const previous = timeAdjustments;
    const { adjustments: next, updates } = applyLinkedTimeEdit(
      practiceData.subtitles,
      targetFirstOriginal,
      field,
      seconds,
      previous
    );

    // Optimistically update the edited row and its linked neighbor.
    const prevValues = updates.map((u) => {
      const row = practiceData.subtitles.find((s) => s.index === u.index);
      return { ...u, seconds: u.field === 'start' ? row?.startSeconds : row?.endSeconds };
    });
    const applyLocalUpdates = (list: typeof updates) => {
      const byKey = new Map(list.map((u) => [`${u.index}:${u.field}`, u.seconds]));
      setPracticeData((cur) =>
        cur
          ? {
              ...cur,
              subtitles: cur.subtitles.map((s) => {
                const start = byKey.get(`${s.index}:start`);
                const end = byKey.get(`${s.index}:end`);
                return start === undefined && end === undefined
                  ? s
                  : {
                      ...s,
                      ...(start !== undefined
                        ? { startSeconds: start, startTime: formatSubtitleTimestamp(start) }
                        : {}),
                      ...(end !== undefined
                        ? { endSeconds: end, endTime: formatSubtitleTimestamp(end) }
                        : {}),
                    };
              }),
            }
          : cur
      );
    };
    applyLocalUpdates(updates);
    setTimeAdjustments(next);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/subtitles/${exerciseId}/time-adjustments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adjustments: next }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to save timing adjustment');
      }
      toast({
        title: 'Timing updated',
        description: 'Also reflected in Customize Subtitles.',
      });
    } catch (error) {
      applyLocalUpdates(prevValues.filter((u) => u.seconds !== undefined) as typeof updates);
      setTimeAdjustments(previous);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save timing adjustment',
        variant: 'destructive',
      });
    }
  };

  // Remove the current sentence's timing overrides together with the shared
  // boundaries of its neighbors. Displayed boundaries are refetched afterwards.
  const handleResetSentenceTime = async () => {
    if (!practiceData || !currentSubtitle) return;

    const targetFirstOriginal = (currentSubtitle.originalIndices ?? [currentSubtitle.index])[0];
    const previous = timeAdjustments;
    const next = clearLinkedTimeEdit(
      practiceData.subtitles,
      targetFirstOriginal,
      timeAdjustments
    );

    setTimeAdjustments(next);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/subtitles/${exerciseId}/time-adjustments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adjustments: next }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to reset timing adjustment');
      }

      const refreshRes = await fetch(`/api/practice/${exerciseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setPracticeData((cur) =>
          cur ? { ...cur, subtitles: refreshData.data.subtitles } : cur
        );
      }
      toast({ title: 'Timing reset', description: 'Back to the subtitle file\'s original timing.' });
    } catch (error) {
      setTimeAdjustments(previous);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reset timing adjustment',
        variant: 'destructive',
      });
    }
  };

  // Switch between per-sentence overrides and the whole-video offset. The
  // served times change entirely, so subtitles are refetched after saving.
  const handleSetTimingMode = async (mode: 'sentence' | 'global') => {
    if (!practiceData || mode === timingMode) return;

    const previous = timingMode;
    setTimingMode(mode);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/subtitles/${exerciseId}/time-adjustments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ timingMode: mode }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to switch timing mode');
      }

      const refreshRes = await fetch(`/api/practice/${exerciseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setPracticeData((cur) =>
          cur ? { ...cur, subtitles: refreshData.data.subtitles } : cur
        );
      }
    } catch (error) {
      setTimingMode(previous);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to switch timing mode',
        variant: 'destructive',
      });
    }
  };

  // Set the whole-video offset (ms). The optimistic update shifts every
  // displayed time by the delta; negative values clamp at 0 like the server.
  const handleSetGlobalOffset = async (offsetMs: number) => {
    if (!practiceData || timingMode !== 'global') return;

    const previousOffset = globalOffsetMs;
    if (offsetMs === previousOffset) return;

    const shiftBy = (deltaSeconds: number) => {
      setPracticeData((cur) =>
        cur
          ? {
              ...cur,
              subtitles: cur.subtitles.map((s) => {
                const startSeconds = Math.max(0, s.startSeconds + deltaSeconds);
                const endSeconds = Math.max(0, s.endSeconds + deltaSeconds);
                return {
                  ...s,
                  startSeconds,
                  endSeconds,
                  startTime: formatSubtitleTimestamp(startSeconds),
                  endTime: formatSubtitleTimestamp(endSeconds),
                };
              }),
            }
          : cur
      );
    };

    setGlobalOffsetMs(offsetMs);
    shiftBy((offsetMs - previousOffset) / 1000);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/subtitles/${exerciseId}/time-adjustments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ globalTimeOffsetMs: offsetMs }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to save timing offset');
      }
    } catch (error) {
      shiftBy((previousOffset - offsetMs) / 1000);
      setGlobalOffsetMs(previousOffset);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save timing offset',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading practice data...</p>
        </div>
      </div>
    );
  }

  if (!practiceData) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Unable to load exercise data</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!currentSubtitle) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">No subtitles available for this exercise</p>
          <p className="text-gray-600 mb-4">Please check the subtitle file or contact an administrator.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

    return (
      <div className="flex-1 bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-[90%] space-y-6">
          {/* Main content: video on the left (7/12), dictation/feedback on the right (5/12) */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Video Player */}
            <div className="w-full lg:w-7/12 min-w-0">
              <VideoPlayer
                ref={videoPlayerRef}
                videoUrl={practiceData.videoUrl}
                videoFallbackUrl={practiceData.videoFallbackUrl}
                subtitles={practiceData.subtitles}
                currentSentenceIndex={currentSentenceIndex}
                totalSentences={totalSentences}
                onSentenceEnd={handleSentenceEnd}
                onPreviousSentence={handlePreviousSentence}
                isPreviousDisabled={isSavingProgress || isCheckingAccuracy}
                isSentenceTimeAdjusted={isSentenceTimeAdjusted}
                onAdjustSentenceTime={handleAdjustSentenceTime}
                onResetSentenceTime={handleResetSentenceTime}
                timingMode={timingMode}
                globalOffsetMs={globalOffsetMs}
                onSetTimingMode={handleSetTimingMode}
                onSetGlobalOffset={handleSetGlobalOffset}
              />
            </div>

            {/* Right side: Dictation + Feedback + Actions */}
            <div className="w-full lg:w-5/12 min-w-0 space-y-6">
              {/* Dictation Input */}
              <DictationInput
                value={userInput}
                onChange={setUserInput}
                onSubmit={handleCheckAccuracy}
                onClear={handleClearInput}
                isLoading={isCheckingAccuracy}
                isDisabled={isSavingProgress}
              />

              {/* Word Feedback Display */}
              {currentFeedback && (
                <WordFeedbackDisplay
                  correctText={currentSubtitle.text}
                  wordFeedback={currentFeedback.wordFeedback}
                  accuracy={currentFeedback.accuracy}
                  isVisible={true}
                  exerciseId={exerciseId}
                  sentenceIndex={currentSubtitle.index}
                  notes={practiceData?.notes ?? []}
                  onNoteCreated={() => {
                    // Refresh practice data to include the new note
                    const fetchPracticeData = async () => {
                      const token = localStorage.getItem('token');
                      const response = await fetch(`/api/practice/${exerciseId}`, {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      });
                      if (response.ok) {
                        const data = await response.json();
                        setPracticeData(data.data);
                      }
                    };
                    fetchPracticeData();
                  }}
                />
              )}

              {/* Action Buttons */}
              {currentFeedback && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSkip()}
                    className="flex-1"
                    disabled={isSavingProgress}
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={() => {
                      if (currentFeedback) {
                        saveProgress(currentSubtitle.index, currentFeedback.accuracy);
                      }
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={isSavingProgress}
                  >
                    {isSavingProgress ? 'Saving...' : 'Next Sentence'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
