'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface Subtitle {
  index: number;
  start: number;
  end: number;
  text: string;
  userConfigured: {
    isMerged: boolean;
    isSkipped: boolean;
    mergedLabel?: string;
  };
}

interface SubtitleListProps {
  subtitles: Subtitle[];
  currentProgress: number;
  selectedForMerge: number[];
  skippedSentences: number[];
  onSelectForMerge: (index: number, selected: boolean) => void;
  onToggleSkip: (index: number, skipped: boolean) => void;
  onSelectAll: (selected: boolean) => void;
}

export function SubtitleList({
  subtitles,
  currentProgress,
  selectedForMerge,
  skippedSentences,
  onSelectForMerge,
  onToggleSkip,
  onSelectAll,
}: SubtitleListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const editableSubtitles = subtitles.slice(currentProgress);
  const allEditableSelected =
    editableSubtitles.length > 0 &&
    editableSubtitles.every((s) => selectedForMerge.includes(s.index));

  const toggleExpandedSentence = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <h3 className="font-semibold text-gray-900">Subtitle Management</h3>
        <div className="text-sm text-gray-500">
          {currentProgress}/{subtitles.length} completed
        </div>
      </div>

      {/* Locked Section Warning */}
      {currentProgress > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-900">
            <strong>Note:</strong> Sentences 1–{currentProgress} are locked (already practiced).
            You can only modify sentences after sentence {currentProgress}.
          </p>
        </div>
      )}

      {/* Bulk Actions */}
      {editableSubtitles.length > 0 && (
        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded">
          <Checkbox
            id="select-all"
            checked={allEditableSelected}
            onCheckedChange={(checked) => onSelectAll(!!checked)}
          />
          <label htmlFor="select-all" className="text-sm font-medium text-gray-700">
            Select all editable sentences for merge group
          </label>
        </div>
      )}

      {/* Subtitle List */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {subtitles.map((subtitle) => {
          const isLocked = subtitle.index < currentProgress;
          const isSelected = selectedForMerge.includes(subtitle.index);
          const isSkipped = skippedSentences.includes(subtitle.index);
          const isExpanded = expandedIndex === subtitle.index;

          return (
            <div
              key={subtitle.index}
              className={`rounded border p-3 transition-colors ${
                isLocked
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              {/* Main Row */}
              <div className="flex items-start gap-3">
                {/* Checkbox (disabled for locked) */}
                <Checkbox
                  id={`merge-${subtitle.index}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => !isLocked && onSelectForMerge(subtitle.index, !!checked)}
                  disabled={isLocked}
                  className="mt-1"
                />

                {/* Sentence Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <label
                      htmlFor={`merge-${subtitle.index}`}
                      className={`text-sm font-medium ${
                        isLocked ? 'text-gray-500' : 'text-gray-700 cursor-pointer'
                      }`}
                    >
                      Sentence {subtitle.index + 1}
                    </label>
                    {isLocked && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                        Locked
                      </span>
                    )}
                    {isSkipped && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                        Skipped
                      </span>
                    )}
                    {isSelected && !isLocked && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        Merge Selected
                      </span>
                    )}
                  </div>

                  {/* Sentence Text */}
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {subtitle.text}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpandedSentence(subtitle.index)}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </Button>
                  {!isLocked && (
                    <Button
                      variant={isSkipped ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => onToggleSkip(subtitle.index, !isSkipped)}
                    >
                      {isSkipped ? 'Unskip' : 'Skip'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                  <p className="mb-1">
                    <strong>Time:</strong> {subtitle.start.toFixed(2)}s – {subtitle.end.toFixed(2)}s
                  </p>
                  <p className="mb-1">
                    <strong>Full text:</strong> {subtitle.text}
                  </p>
                  {isLocked && (
                    <p className="text-amber-700">
                      This sentence has been practiced and cannot be edited.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
