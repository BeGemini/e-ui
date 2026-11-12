'use client';

import { useEffect, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Undo2 } from 'lucide-react';
import { EffectiveSubtitle, SubtitleTimeAdjustment } from '@/lib/types';
import { parseSubtitleTimestamp } from '@/lib/utils';

interface SubtitleListProps {
  subtitles: EffectiveSubtitle[];
  currentProgress: number;
  /** Original index of the sentence currently being practiced; that row is
   *  highlighted and scrolled into view on mount. Null when practice is done. */
  currentOriginalIndex?: number | null;
  selectedForMerge: number[];
  skippedSentences: number[];
  onSelectForMerge: (index: number, selected: boolean) => void;
  onToggleSkip: (index: number, skipped: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onUnmerge?: (index: number) => void;
  onUpdateMergedText?: (index: number, text: string) => void;
  /** Per-user timing overrides; when onAdjustTime is provided, timestamps become editable. */
  timeAdjustments?: SubtitleTimeAdjustment[];
  onAdjustTime?: (index: number, field: 'start' | 'end', seconds: number) => void;
  onResetTimeAdjustment?: (index: number) => void;
}

/** Editable HH:MM:SS.mmm timestamp; commits on blur/Enter, reverts on invalid
 *  input or Escape. Parent keys it by the committed value so external updates
 *  remount it with fresh state. */
function TimeInput({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (seconds: number) => void;
}) {
  const [text, setText] = useState(value);
  const [isInvalid, setIsInvalid] = useState(false);

  const commit = () => {
    if (text === value) return;
    const seconds = parseSubtitleTimestamp(text);
    if (seconds === null) {
      setIsInvalid(true);
      setText(value);
      return;
    }
    onCommit(seconds);
  };

  return (
    <input
      className={`w-24 rounded border px-1 py-0.5 font-mono text-xs focus:outline-none focus:ring-1 ${
        isInvalid
          ? 'border-red-400 text-red-600 focus:ring-red-400'
          : 'border-gray-300 text-gray-600 focus:border-blue-500 focus:ring-blue-500'
      }`}
      value={text}
      title="Format: HH:MM:SS.mmm"
      onChange={(e) => {
        setText(e.target.value);
        setIsInvalid(false);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          setText(value);
          setIsInvalid(false);
        }
      }}
    />
  );
}

export function SubtitleList({
  subtitles,
  currentProgress,
  currentOriginalIndex = null,
  selectedForMerge,
  skippedSentences,
  onSelectForMerge,
  onToggleSkip,
  onSelectAll,
  onUnmerge,
  onUpdateMergedText,
  timeAdjustments = [],
  onAdjustTime,
  onResetTimeAdjustment,
}: SubtitleListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Scroll the sentence currently being practiced into view once on mount.
  const listRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  useEffect(() => {
    if (hasScrolledRef.current) return;
    hasScrolledRef.current = true;
    listRef.current
      ?.querySelector('[data-current-sentence="true"]')
      ?.scrollIntoView({ block: 'center' });
  });

  const editableSubtitles = subtitles.filter((s) => !s.isLocked);
  // Locked rows always form a prefix of the list, so this count is the range 1–N
  const lockedRowCount = subtitles.length - editableSubtitles.length;
  // Match practice: a row is excluded only when all of its original indices are skipped
  const skippedSet = new Set(skippedSentences);
  const activeSentenceCount = subtitles.filter(
    (s) => !s.originalIndices.every((i) => skippedSet.has(i))
  ).length;
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
          {currentProgress}/{activeSentenceCount} completed
        </div>
      </div>

      {/* Locked Section Warning */}
      {lockedRowCount > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-900">
            <strong>Note:</strong> Sentences 1–{lockedRowCount} are locked (already practiced).
            You can only modify sentences after sentence {lockedRowCount}.
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
      <div ref={listRef} className="max-h-96 overflow-y-auto space-y-2">
        {subtitles.map((subtitle) => {
          const isSelected = selectedForMerge.includes(subtitle.index);
          // skippedSentences stores original indices, so check against originalIndices
          const isSkipped = subtitle.originalIndices.every((idx) =>
            skippedSentences.includes(idx)
          );
          const isExpanded = expandedIndex === subtitle.index;
          const isEditing = editingIndex === subtitle.index;
          // A row's displayed boundaries come from its first/last original
          // sentence; timing overrides live on those two originals.
          const firstOriginal = subtitle.originalIndices[0];
          const lastOriginal = subtitle.originalIndices[subtitle.originalIndices.length - 1];
          const isTimeAdjusted = timeAdjustments.some(
            (a) =>
              (a.index === firstOriginal && a.startSeconds !== undefined) ||
              (a.index === lastOriginal && a.endSeconds !== undefined)
          );
          const canEditTime = !!onAdjustTime;
          const isCurrent =
            currentOriginalIndex !== null && firstOriginal === currentOriginalIndex;

          return (
            <div
              key={subtitle.index}
              data-current-sentence={isCurrent || undefined}
              className={`rounded border p-3 transition-colors ${
                isCurrent
                  ? 'border-green-400 bg-green-50/60 ring-1 ring-green-300'
                  : subtitle.isLocked
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
                    {isCurrent && (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                        Current
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

                  {/* Time range (merged rows span first start → last end).
                      Timestamps are editable to fix out-of-sync cues. */}
                  <div className="mb-1 flex items-center gap-1 font-mono text-xs text-gray-500">
                    {canEditTime ? (
                      <>
                        <TimeInput
                          key={`start-${subtitle.startTime}`}
                          value={subtitle.startTime}
                          onCommit={(seconds) => onAdjustTime(subtitle.index, 'start', seconds)}
                        />
                        <span>→</span>
                        <TimeInput
                          key={`end-${subtitle.endTime}`}
                          value={subtitle.endTime}
                          onCommit={(seconds) => onAdjustTime(subtitle.index, 'end', seconds)}
                        />
                      </>
                    ) : (
                      <span>
                        {subtitle.startTime} → {subtitle.endTime}
                      </span>
                    )}
                    {isTimeAdjusted && (
                      <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-sans text-amber-700">
                        Adjusted
                      </span>
                    )}
                    {isTimeAdjusted && canEditTime && onResetTimeAdjustment && (
                      <button
                        type="button"
                        className="text-amber-600 hover:text-amber-800"
                        title="Reset to the subtitle file's original timing"
                        onClick={() => onResetTimeAdjustment(subtitle.index)}
                      >
                        <Undo2 className="h-3 w-3" />
                      </button>
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
                    <strong>Time:</strong> {subtitle.startSeconds.toFixed(3)}s – {subtitle.endSeconds.toFixed(3)}s
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

