'use client';

import { useState } from 'react';
import { HighlightedCorrectText } from '@/app/components/note/HighlightedCorrectText';
import { NoteTextSelector } from '@/app/components/note/NoteTextSelector';
import { NoteEditDialog } from '@/app/components/note/NoteEditDialog';
import { AiSearchResultDialog } from '@/app/components/note/AiSearchResultDialog';
import type { Note } from '@/lib/types';

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
  notes?: Note[];
  onNoteCreated?: () => void;
}

export function WordFeedbackDisplay({
  correctText,
  wordFeedback = [],
  accuracy,
  isVisible,
  exerciseId,
  sentenceIndex,
  notes = [],
  onNoteCreated,
}: WordFeedbackDisplayProps) {
  const [editingPoint, setEditingPoint] = useState<Note | null>(null);
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

  const handleAiSearch = (text: string) => {
    setAiSearchText(text);
    setAiSearchOpen(true);
  };

  const handleEdit = (note: Note) => {
    setEditingPoint(note);
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4">
      {/* Accuracy Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <h3 className="font-semibold text-gray-900">Feedback</h3>
        <div
          className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold text-white ${
            accuracy >= 80
              ? 'bg-green-500'
              : accuracy >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500'
          }`}
        >
          {accuracy}%
        </div>
      </div>

      {/* Original Text */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Correct Text:</p>
        <NoteTextSelector sentenceText={correctText} onAiSearch={handleAiSearch}>
          <div className="rounded bg-blue-50 p-3">
            <HighlightedCorrectText
              text={correctText}
              notes={notes}
              onEditNote={handleEdit}
            />
          </div>
        </NoteTextSelector>
      </div>

      <AiSearchResultDialog
        open={aiSearchOpen}
        capturedText={aiSearchText}
        sourceSentence={correctText}
        exerciseId={exerciseId}
        sourceSentenceIndex={sentenceIndex}
        onOpenChange={setAiSearchOpen}
        onSaved={() => onNoteCreated?.()}
      />

      <NoteEditDialog
        key={editingPoint?.noteId ?? 'closed'}
        open={!!editingPoint}
        note={editingPoint}
        exerciseId={exerciseId}
        onOpenChange={() => setEditingPoint(null)}
        onSaved={() => {
          onNoteCreated?.();
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
