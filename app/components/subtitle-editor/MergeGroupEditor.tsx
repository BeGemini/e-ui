'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export interface MergeGroup {
  startIndex: number;
  endIndex: number;
  label: string;
}

interface MergeGroupEditorProps {
  mergeGroups: MergeGroup[];
  selectedForMerge: number[];
  totalSentences: number;
  onAddGroup: (group: MergeGroup) => void;
  onRemoveGroup: (index: number) => void;
  onUpdateGroup: (index: number, group: MergeGroup) => void;
  onCreateFromSelected: (label: string) => void;
}

export function MergeGroupEditor({
  mergeGroups,
  selectedForMerge,
  totalSentences,
  onAddGroup,
  onRemoveGroup,
  onUpdateGroup,
  onCreateFromSelected,
}: MergeGroupEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newStartIndex, setNewStartIndex] = useState('');
  const [newEndIndex, setNewEndIndex] = useState('');
  const [labelForSelected, setLabelForSelected] = useState('');

  const validateGroup = (start: number, end: number) => {
    if (start < 0 || end >= totalSentences) {
      return { valid: false, error: 'Indices out of range' };
    }
    if (start > end) {
      return { valid: false, error: 'Start index must be <= end index' };
    }

    // Check for overlaps with other groups (except the one being edited)
    for (let i = 0; i < mergeGroups.length; i++) {
      if (i === editingIndex) continue;
      const existing = mergeGroups[i];
      if (!(end < existing.startIndex || start > existing.endIndex)) {
        return { valid: false, error: 'This range overlaps with an existing group' };
      }
    }

    return { valid: true };
  };

  const handleAddGroup = () => {
    const start = parseInt(newStartIndex, 10);
    const end = parseInt(newEndIndex, 10);

    const validation = validateGroup(start, end);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    onAddGroup({
      startIndex: start,
      endIndex: end,
      label: newLabel || `Group ${mergeGroups.length + 1}`,
    });

    setNewLabel('');
    setNewStartIndex('');
    setNewEndIndex('');
  };

  const handleCreateFromSelected = () => {
    if (selectedForMerge.length < 2) {
      alert('Please select at least 2 sentences for merge group');
      return;
    }

    const sortedIndices = [...selectedForMerge].sort((a, b) => a - b);
    const minIndex = sortedIndices[0];
    const maxIndex = sortedIndices[sortedIndices.length - 1];

    const validation = validateGroup(minIndex, maxIndex);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    onCreateFromSelected(labelForSelected || `Group ${mergeGroups.length + 1}`);
    setLabelForSelected('');
  };

  const handleUpdateGroup = (index: number) => {
    const start = parseInt(newStartIndex, 10);
    const end = parseInt(newEndIndex, 10);

    const validation = validateGroup(start, end);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    onUpdateGroup(index, {
      startIndex: start,
      endIndex: end,
      label: newLabel,
    });

    setEditingIndex(null);
    setNewLabel('');
    setNewStartIndex('');
    setNewEndIndex('');
  };

  const startEditingGroup = (index: number) => {
    const group = mergeGroups[index];
    setEditingIndex(index);
    setNewStartIndex(group.startIndex.toString());
    setNewEndIndex(group.endIndex.toString());
    setNewLabel(group.label);
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-gray-900">Merge Groups</h3>

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

      {/* Existing Merge Groups */}
      {mergeGroups.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {mergeGroups.map((group, idx) => (
            <div key={idx} className="flex items-center justify-between rounded border border-gray-300 bg-gray-50 p-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{group.label}</p>
                <p className="text-xs text-gray-500">
                  Sentences {group.startIndex + 1}–{group.endIndex + 1}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditingGroup(idx)}
                >
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                      Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Merge Group?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the merge group "{group.label}". Sentences will remain but no longer merged.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogAction onClick={() => onRemoveGroup(idx)}>
                      Remove
                    </AlertDialogAction>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Group Form */}
      {editingIndex === null ? (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-3">
          <p className="text-sm font-medium text-gray-700">Add New Merge Group</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Start sentence (0-based)"
              value={newStartIndex}
              onChange={(e) => setNewStartIndex(e.target.value)}
              min="0"
              className="text-sm"
            />
            <Input
              type="number"
              placeholder="End sentence (0-based)"
              value={newEndIndex}
              onChange={(e) => setNewEndIndex(e.target.value)}
              min="0"
              className="text-sm"
            />
          </div>
          <Input
            placeholder="Group label (e.g., 'Opening Dialogue')"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="text-sm"
          />
          <Button onClick={handleAddGroup} className="w-full bg-green-600 hover:bg-green-700">
            Add Group
          </Button>
        </div>
      ) : (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-3">
          <p className="text-sm font-medium text-amber-900">Edit Merge Group</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Start sentence"
              value={newStartIndex}
              onChange={(e) => setNewStartIndex(e.target.value)}
              className="text-sm"
            />
            <Input
              type="number"
              placeholder="End sentence"
              value={newEndIndex}
              onChange={(e) => setNewEndIndex(e.target.value)}
              className="text-sm"
            />
          </div>
          <Input
            placeholder="Group label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => handleUpdateGroup(editingIndex)}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingIndex(null);
                setNewLabel('');
                setNewStartIndex('');
                setNewEndIndex('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
