'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MergeGroup } from '@/lib/types';

interface MergeGroupEditorProps {
  mergeGroups: MergeGroup[];
  selectedForMerge: number[];
  onCreateFromSelected: (label: string) => void;
  /** Count of original subtitles already practiced; groups starting below it are read-only */
  lockedOriginalCount?: number;
  onDeleteGroup?: (startIndex: number) => void;
}

export function MergeGroupEditor({
  mergeGroups,
  selectedForMerge,
  onCreateFromSelected,
  lockedOriginalCount = 0,
  onDeleteGroup,
}: MergeGroupEditorProps) {
  const [labelForSelected, setLabelForSelected] = useState('');

  const handleCreateFromSelected = () => {
    if (selectedForMerge.length < 2) {
      alert('Please select at least 2 sentences for merge group');
      return;
    }

    onCreateFromSelected(labelForSelected || `Group ${mergeGroups.length + 1}`);
    setLabelForSelected('');
  };

  return (
    <div className="flex h-96 flex-col rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 font-semibold text-gray-900">Merge Groups</h3>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">

      {mergeGroups.length === 0 && selectedForMerge.length < 2 && (
        <p className="text-sm text-gray-500">
          Select two or more sentences above, then create a merge group.
        </p>
      )}

      {/* Quick Create from Selected */}
      {selectedForMerge.length >= 2 && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-900">
              Create group from {selectedForMerge.length} selected sentences?
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Group label (optional)"
                value={labelForSelected}
                onChange={(e) => setLabelForSelected(e.target.value)}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={handleCreateFromSelected}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Group
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Existing groups */}
      {mergeGroups.length > 0 && (
        <div className="space-y-2">
          {mergeGroups.map((group) => {
            const isLocked = group.startIndex < lockedOriginalCount;
            return (
              <div
                key={group.startIndex}
                className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-gray-900">
                    {group.label || `Group (sentences ${group.startIndex + 1}-${group.endIndex + 1})`}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    sentences {group.startIndex + 1}-{group.endIndex + 1}
                    {group.customText ? ' · custom text' : ''}
                  </span>
                </div>
                {onDeleteGroup && !isLocked && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDeleteGroup(group.startIndex)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
