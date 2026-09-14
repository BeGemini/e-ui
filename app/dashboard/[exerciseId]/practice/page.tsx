'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VideoPlayer } from '@/app/components/video-player/VideoPlayer';
import type { VideoPlayerRef } from '@/app/components/video-player/VideoPlayer';
import { DictationInput } from '@/app/components/dictation/DictationInput';
import { WordFeedbackDisplay } from '@/app/components/dictation/WordFeedbackDisplay';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { KnowledgePoint } from '@/lib/types';

interface Subtitle {
  index: number;
  text: string;
  startSeconds: number;
  endSeconds: number;
  startTime: string;
  endTime: string;
}

interface PracticeData {
  exerciseId: string;
  videoUrl: string;
  subtitleFormat: string;
  totalSentences: number;
  durationSeconds: number;
  subtitles: Subtitle[];
  userProgress: {
    currentSentenceIndex: number;
    isCompleted: boolean;
    overallAccuracy?: number;
  };
  knowledgePoints: KnowledgePoint[];
}

interface WordFeedback {
  word: string;
  userWord: string;
  status: 'correct' | 'typo' | 'wrong';
}

interface CheckResponse {
  accuracy: number;
  wordFeedback: WordFeedback[];
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
  const videoPlayerRef = useRef<VideoPlayerRef>(null);

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
        setPracticeData(data.data);
        setCurrentSentenceIndex(data.data.userProgress?.currentSentenceIndex ?? 0);
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
        throw new Error('Failed to check accuracy');
      }

      const feedback: CheckResponse = await response.json();
      setCurrentFeedback(feedback);

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
      setCurrentSentenceIndex(nextIndex);
      setUserInput('');
      setCurrentFeedback(null);
      // Auto-play the next sentence so the user can listen immediately.
      // A small timeout ensures the player has rendered with the new index.
      setTimeout(() => {
        videoPlayerRef.current?.playSentenceAtIndex(nextIndex);
      }, 0);
    }
  };

  const saveProgress = async (sentenceIndex: number, accuracy: number) => {
    if (!practiceData || !currentSubtitle) return;

    try {
      setIsSavingProgress(true);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading practice data...</p>
        </div>
      </div>
    );
  }

  if (!practiceData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Unable to load exercise data</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!currentSubtitle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">No subtitles available for this exercise</p>
          <p className="text-gray-600 mb-4">Please check the subtitle file or contact an administrator.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

    const progressPercent = totalSentences > 0
      ? Math.round((currentSentenceIndex / totalSentences) * 100)
      : 0;

    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-[90%] space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Practice Dictation</h1>
              <p className="text-sm text-gray-600 mt-1">
                Sentence {currentSentenceIndex + 1} of {totalSentences} ({progressPercent}%)
              </p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
          </div>

          {/* Main content: video on the left (2/3), dictation/feedback on the right (1/3) */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Video Player */}
            <div className="w-full lg:w-2/3 min-w-0">
              <VideoPlayer
                ref={videoPlayerRef}
                videoUrl={practiceData.videoUrl}
                subtitles={practiceData.subtitles}
                currentSentenceIndex={currentSentenceIndex}
                totalSentences={totalSentences}
                onSentenceEnd={handleSentenceEnd}
              />
            </div>

            {/* Vertical divider */}
            <div className="hidden lg:block w-px bg-gray-200 self-stretch" />

            {/* Right side: Dictation + Feedback + Actions */}
            <div className="w-full lg:w-1/3 min-w-0 space-y-6">
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
                  knowledgePoints={practiceData?.knowledgePoints ?? []}
                  onKnowledgePointCreated={() => {
                    // Refresh practice data to include the new knowledge point
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
