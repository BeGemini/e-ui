'use client';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EffectiveSubtitle } from '@/lib/types';
import * as React from 'react';

interface SkipSentenceEditorProps {
  subtitles: EffectiveSubtitle[];
  skippedSentences: number[];
  onToggleSkip: (index: number, skipped: boolean) => void;
}

export function SkipSentenceEditor({
  subtitles,
  skippedSentences,
  onToggleSkip,
}: SkipSentenceEditorProps) {
  const editableSentences = subtitles.filter((s) => !s.isLocked);
  // skippedSentences stores original indices, so match against originalIndices
  const editableSkipped = skippedSentences.filter((idx) =>
    editableSentences.some((s) => s.originalIndices.includes(idx))
  );

  const handleSkipAll = () => {
    editableSentences.forEach((subtitle) => {
      const isSkipped = subtitle.originalIndices.every((idx) =>
        skippedSentences.includes(idx)
      );
      if (!isSkipped) {
        onToggleSkip(subtitle.index, true);
      }
    });
  };

  const handleUnskipAll = () => {
    editableSkipped.forEach((idx) => {
      onToggleSkip(idx, false);
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Skip Sentences</h3>
        <div className="text-sm text-gray-500">
          {editableSkipped.length} skipped
        </div>
      </div>

      {/* Bulk Actions */}
      {editableSentences.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkipAll}
            disabled={editableSkipped.length === editableSentences.length}
            className="text-xs"
          >
            Skip All Remaining
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnskipAll}
            disabled={editableSkipped.length === 0}
            className="text-xs"
          >
            Unskip All
          </Button>
        </div>
      )}

      {/* Skipped Sentences List */}
      {editableSkipped.length > 0 ? (
        <div className="max-h-48 overflow-y-auto space-y-2">
          {editableSkipped.map((index) => {
            // skippedSentences stores original indices
            const subtitle = subtitles.find((s) => s.originalIndices.includes(index));
            if (!subtitle) return null;

            return (
              <div
                key={index}
                className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-900">
                    Sentence {index + 1}
                  </p>
                  <p className="text-sm text-red-700 line-clamp-2">
                    {subtitle.text}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 flex-shrink-0"
                  >
                    Unskip
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unskip Sentence?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This sentence will no longer be skipped and will be included in your practice.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogAction onClick={() => onToggleSkip(index, false)}>
                      Unskip
                    </AlertDialogAction>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-3 text-center text-sm text-gray-600">
          No sentences are currently skipped.
        </div>
      )}
    </div>
  );
}
