'use client';

import { useState } from 'react';
import { HighlightedCorrectText } from '@/app/components/knowledge-point/HighlightedCorrectText';
import { KnowledgePointTextSelector } from '@/app/components/knowledge-point/KnowledgePointTextSelector';
import { KnowledgePointCreateDialog } from '@/app/components/knowledge-point/KnowledgePointCreateDialog';
import { KnowledgePointEditDialog } from '@/app/components/knowledge-point/KnowledgePointEditDialog';
import { AiSearchResultDialog } from '@/app/components/knowledge-point/AiSearchResultDialog';
import type { KnowledgePoint } from '@/lib/types';

interface WordFeedback {
  word: string;
  userWord: string;
  status: 'correct' | 'typo' | 'wrong';
}

interface WordFeedbackDisplayProps {
  correctText: string;
  wordFeedback?: WordFeedback[];
  accuracy: number;
  isVisible: boolean;
  exerciseId: string;
  sentenceIndex: number;
  knowledgePoints?: KnowledgePoint[];
  onKnowledgePointCreated?: () => void;
}

export function WordFeedbackDisplay({
  correctText,
  wordFeedback = [],
  accuracy,
  isVisible,
  exerciseId,
  sentenceIndex,
  knowledgePoints = [],
  onKnowledgePointCreated,
}: WordFeedbackDisplayProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createInitialDescription, setCreateInitialDescription] = useState('');
  const [capturedText, setCapturedText] = useState('');
  const [editingPoint, setEditingPoint] = useState<KnowledgePoint | null>(null);
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const [aiSearchText, setAiSearchText] = useState('');

  if (!isVisible || !wordFeedback || wordFeedback.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'correct':
        return 'bg-green-100 text-green-900';
      case 'typo':
        return 'bg-amber-100 text-amber-900';
      case 'wrong':
        return 'bg-red-100 text-red-900';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'correct':
        return '✓';
      case 'typo':
        return '~';
      case 'wrong':
        return '✗';
      default:
        return '?';
    }
  };

  const handleCreate = (text: string) => {
    setCapturedText(text);
    setCreateInitialDescription('');
    setCreateDialogOpen(true);
  };

  const handleAiSearch = (text: string) => {
    setAiSearchText(text);
    setAiSearchOpen(true);
  };

  const handleSaveAsKnowledgePoint = (description: string) => {
    setCapturedText(aiSearchText);
    setCreateInitialDescription(description);
    setCreateDialogOpen(true);
  };

  const handleEdit = (knowledgePoint: KnowledgePoint) => {
    setEditingPoint(knowledgePoint);
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4">
      {/* Accuracy Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <h3 className="font-semibold text-gray-900">Feedback</h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900">{accuracy}%</span>
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-white ${
              accuracy >= 80
                ? 'bg-green-500'
                : accuracy >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
          >
            {accuracy >= 80 ? '✓' : accuracy >= 50 ? '◐' : '✗'}
          </div>
        </div>
      </div>

      {/* Original Text */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Correct Text:</p>
        <KnowledgePointTextSelector sentenceText={correctText} onCreate={handleCreate} onAiSearch={handleAiSearch}>
          <div className="rounded bg-blue-50 p-3">
            <HighlightedCorrectText
              text={correctText}
              knowledgePoints={knowledgePoints}
              onEditKnowledgePoint={handleEdit}
            />
          </div>
        </KnowledgePointTextSelector>
      </div>

      <KnowledgePointCreateDialog
        key={`create-kp-${capturedText}-${createInitialDescription}`}
        open={createDialogOpen}
        capturedText={capturedText}
        exerciseId={exerciseId}
        sourceSentenceIndex={sentenceIndex}
        sourceSentence={correctText}
        initialDescription={createInitialDescription}
        onOpenChange={setCreateDialogOpen}
        onCreated={() => {
          onKnowledgePointCreated?.();
          setCreateDialogOpen(false);
        }}
      />

      <AiSearchResultDialog
        open={aiSearchOpen}
        capturedText={aiSearchText}
        sourceSentence={correctText}
        onOpenChange={setAiSearchOpen}
        onSaveAsKnowledgePoint={handleSaveAsKnowledgePoint}
      />

      <KnowledgePointEditDialog
        key={editingPoint?.knowledgePointId ?? 'closed'}
        open={!!editingPoint}
        knowledgePoint={editingPoint}
        exerciseId={exerciseId}
        onOpenChange={() => setEditingPoint(null)}
        onSaved={() => {
          onKnowledgePointCreated?.();
          setEditingPoint(null);
        }}
      />

      {/* User Input with Feedback */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Your Input:</p>
        <div className="flex flex-wrap gap-1 rounded bg-gray-50 p-3">
          {wordFeedback.map((fb, idx) => (
            <div
              key={idx}
              className={`rounded px-2 py-1 text-sm font-medium transition-colors ${getStatusColor(fb.status)}`}
              title={`Expected: "${fb.word}" | You said: "${fb.userWord}" | Status: ${fb.status}`}
            >
              <span>{fb.userWord}</span>
              <span className="ml-1 text-xs font-bold">{getStatusBadge(fb.status)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-green-100"></span>
          <span className="text-gray-600">Correct</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-amber-100"></span>
          <span className="text-gray-600">Minor typo</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-red-100"></span>
          <span className="text-gray-600">Wrong/Missing</span>
        </div>
      </div>
    </div>
  );
}
