'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { EffectiveSubtitle } from '@/lib/types';

interface SubtitleListProps {
  subtitles: EffectiveSubtitle[];
  currentProgress: number;
  selectedForMerge: number[];
  skippedSentences: number[];
  onSelectForMerge: (index: number, selected: boolean) => void;
  onToggleSkip: (index: number, skipped: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onUnmerge?: (index: number) => void;
  onUpdateMergedText?: (index: number, text: string) => void;
}

export function SubtitleList({
  subtitles,
  currentProgress,
  selectedForMerge,
  skippedSentences,
  onSelectForMerge,
  onToggleSkip,
  onSelectAll,
  onUnmerge,
  onUpdateMergedText,
}: SubtitleListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const editableSubtitles = subtitles.filter((s) => !s.isLocked);
  const allEditableSelected =
    editableSubtitles.length > 0 &&
    editableSubtitles.every((s) => selectedForMerge.includes(s.index));

  const toggleExpandedSentence = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const startEditing = (subtitle: EffectiveSubtitle) => {
    if (!subtitle.isMerged || subtitle.isLocked) return;
    setEditingIndex(subtitle.index);
    setEditingText(subtitle.text);
  };

  const saveEdit = () => {
    if (editingIndex !== null && onUpdateMergedText) {
      onUpdateMergedText(editingIndex, editingText);
    }
    setEditingIndex(null);
    setEditingText('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
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
          const isSelected = selectedForMerge.includes(subtitle.index);
          // skippedSentences stores original indices, so check against originalIndices
          const isSkipped = subtitle.originalIndices.every((idx) =>
            skippedSentences.includes(idx)
          );
          const isExpanded = expandedIndex === subtitle.index;
          const isEditing = editingIndex === subtitle.index;

          return (
            <div
              key={subtitle.index}
              className={`rounded border p-3 transition-colors ${
                subtitle.isLocked
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
                  onCheckedChange={(checked) =>
                    !subtitle.isLocked && onSelectForMerge(subtitle.index, !!checked)
                  }
                  disabled={subtitle.isLocked}
                  className="mt-1"
                />

                {/* Sentence Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <label
                      htmlFor={`merge-${subtitle.index}`}
                      className={`text-sm font-medium ${
                        subtitle.isLocked
                          ? 'text-gray-500'
                          : 'text-gray-700 cursor-pointer'
                      }`}
                    >
                      Sentence {subtitle.index + 1}
                    </label>
                    {subtitle.isLocked && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                        Locked
                      </span>
                    )}
                    {subtitle.isMerged && (
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                        Merged
                      </span>
                    )}
                    {isSkipped && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                        Skipped
                      </span>
                    )}
                    {isSelected && !subtitle.isLocked && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        Merge Selected
                      </span>
                    )}
                  </div>

                  {/* Sentence Text / Edit Area */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        className="w-full min-h-[80px] rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        maxLength={2000}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {subtitle.text}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {!subtitle.isLocked && (
                    <Button
                      variant={isSkipped ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => onToggleSkip(subtitle.index, !isSkipped)}
                    >
                      {isSkipped ? 'Unskip' : 'Skip'}
                    </Button>
                  )}
                  {subtitle.isMerged && !subtitle.isLocked && !isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(subtitle)}
                    >
                      Edit
                    </Button>
                  )}
                  {subtitle.isMerged && !subtitle.isLocked && !isEditing && onUnmerge && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUnmerge(subtitle.index)}
                    >
                      Unmerge
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpandedSentence(subtitle.index)}
                    aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                  <p className="mb-1">
                    <strong>Time:</strong> {subtitle.startSeconds.toFixed(2)}s – {subtitle.endSeconds.toFixed(2)}s
                  </p>
                  <p className="mb-1">
                    <strong>Full text:</strong> {subtitle.text}
                  </p>
                  {subtitle.isMerged && (
                    <div className="mb-1">
                      <strong>Original sentences:</strong>{' '}
                      {subtitle.originalIndices.map((i) => i + 1).join(', ')}
                    </div>
                  )}
                  {subtitle.isLocked && (
                    <p className="text-amber-700">
                      This sentence has been practiced and cannot be edited.
                    </p>
                  )}
                  {subtitle.isMerged && !subtitle.isLocked && !isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => startEditing(subtitle)}
                    >
                      Edit merged text
                    </Button>
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

