'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VideoPlayer } from '@/app/components/video-player/VideoPlayer';
import { DictationInput } from '@/app/components/dictation/DictationInput';
import { WordFeedbackDisplay } from '@/app/components/dictation/WordFeedbackDisplay';
import { AccuracyBadge } from '@/app/components/dictation/AccuracyBadge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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

  // Handle moving to next sentence
  const handleSentenceEnd = async (sentenceIndex: number) => {
    if (!practiceData || !currentFeedback) {
      // Auto-advance even without feedback if video auto-paused
      await advanceToNextSentence(sentenceIndex);
      return;
    }

    // Save progress before moving to next
    await saveProgress(sentenceIndex, currentFeedback.accuracy);
  };

  const advanceToNextSentence = async (completedIndex: number) => {
    if (!practiceData) return;

    // Find next sentence (API already filters skipped ones)
    let nextIndex = completedIndex + 1;

    if (nextIndex >= practiceData.subtitles.length) {
      // Exercise completed
      handleExerciseComplete(completedIndex);
    } else {
      setCurrentSentenceIndex(nextIndex);
      setUserInput('');
      setCurrentFeedback(null);
    }
  };

  const saveProgress = async (sentenceIndex: number, accuracy: number) => {
    try {
      setIsSavingProgress(true);
      const token = localStorage.getItem('token');

      const isCompleted =
        sentenceIndex >= practiceData!.subtitles.length - 1;

      const response = await fetch(`/api/practice/${exerciseId}/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sentenceIndex,
          accuracy,
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

  if (!practiceData || !currentSubtitle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Unable to load exercise data</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (completionMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 mb-4">{completionMessage}</p>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Practice Dictation</h1>
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>

        {/* Video Player */}
        <div className="space-y-2">
          <VideoPlayer
            videoUrl={practiceData.videoUrl}
            subtitles={practiceData.subtitles}
            currentSentenceIndex={currentSentenceIndex}
            onSentenceEnd={handleSentenceEnd}
          />
        </div>

        {/* Accuracy Badge (if feedback exists) */}
        {currentFeedback && (
          <div className="flex justify-center">
            <AccuracyBadge accuracy={currentFeedback.accuracy} size="lg" />
          </div>
        )}

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
            userText={userInput}
            wordFeedback={currentFeedback.wordFeedback}
            accuracy={currentFeedback.accuracy}
            isVisible={true}
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
  );
}
