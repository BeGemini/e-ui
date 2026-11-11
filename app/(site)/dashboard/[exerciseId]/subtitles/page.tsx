'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Wand2, X } from 'lucide-react';
import { SubtitleList } from '@/app/components/subtitle-editor/SubtitleList';
import { MergeGroupEditor } from '@/app/components/subtitle-editor/MergeGroupEditor';
import { SkipSentenceEditor } from '@/app/components/subtitle-editor/SkipSentenceEditor';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { applySubtitleConfigWithLock, getLockedOriginalCount, getMergedOriginalIndices } from '@/lib/utils';
import { ParsedSubtitle, EffectiveSubtitle, MergeGroup } from '@/lib/types';

interface UserProgress {
  currentSentenceIndex: number;
}

export default function SubtitleEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const exerciseId = params.exerciseId as string;

  const [rawSubtitles, setRawSubtitles] = useState<ParsedSubtitle[]>([]);
  const [effectiveSubtitles, setEffectiveSubtitles] = useState<EffectiveSubtitle[]>([]);
  // Number of original subtitles covered by the user's practice progress.
  // currentSentenceIndex is an index into the effective (merged) list, so it
  // must be translated before comparing against original indices. Computed
  // once from the saved config; intentionally NOT recomputed while editing.
  const [lockedOriginalCount, setLockedOriginalCount] = useState(0);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedForMerge, setSelectedForMerge] = useState<number[]>([]);
  const [mergeGroups, setMergeGroups] = useState<MergeGroup[]>([]);
  const [skippedSentences, setSkippedSentences] = useState<number[]>([]);
  const [autoMergeSummary, setAutoMergeSummary] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get auth token
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };

        // Get raw practice data for subtitles (do not apply user's config on server)
        const practiceRes = await fetch(`/api/practice/${exerciseId}?raw=true`, { headers });
        if (!practiceRes.ok) {
          const errorData = await practiceRes.json().catch(() => ({}));
          console.error('Practice API error:', {
            status: practiceRes.status,
            statusText: practiceRes.statusText,
            error: errorData,
          });
          throw new Error(`Failed to load practice data (${practiceRes.status})`);
        }
        const practiceData = await practiceRes.json();
        console.log('Practice data loaded:', {
          hasData: 'data' in practiceData,
          hasSubtitles: practiceData.data?.subtitles?.length || 0,
          hasProgress: !!practiceData.data?.userProgress,
        });
        const fetchedSubtitles: ParsedSubtitle[] = practiceData.data?.subtitles || [];
        setRawSubtitles(fetchedSubtitles);
        const progress = practiceData.data?.userProgress || null;
        setUserProgress(progress);

        // Get config
        const configRes = await fetch(`/api/subtitles/${exerciseId}/config`, { headers });
        if (!configRes.ok) {
          const errorData = await configRes.json().catch(() => ({}));
          console.error('Config API error:', {
            status: configRes.status,
            statusText: configRes.statusText,
            error: errorData,
          });
          throw new Error(`Failed to load config (${configRes.status})`);
        }
        const configData = await configRes.json();
        console.log('Config data loaded:', {
          hasConfig: !!configData.config,
          mergedGroups: configData.config?.mergedGroups?.length || 0,
          skippedSentences: configData.config?.skippedSentences?.length || 0,
        });

        // Parse JSON fields from database
        const mergedGroups = configData.config?.mergedGroups;
        const skippedSentences = configData.config?.skippedSentences;

        const normalizedMergedGroups = Array.isArray(mergedGroups) ? mergedGroups : [];
        const normalizedSkippedSentences = Array.isArray(skippedSentences) ? skippedSentences : [];

        setMergeGroups(normalizedMergedGroups);
        setSkippedSentences(normalizedSkippedSentences);

        const lockedCount = getLockedOriginalCount(
          fetchedSubtitles,
          {
            mergedGroups: normalizedMergedGroups,
            skippedSentences: normalizedSkippedSentences,
          },
          progress?.currentSentenceIndex ?? 0
        );
        setLockedOriginalCount(lockedCount);

        // Compute effective subtitles for the editor (with lock state)
        const effectiveWithLock = applySubtitleConfigWithLock(
          fetchedSubtitles,
          {
            mergedGroups: normalizedMergedGroups,
            skippedSentences: normalizedSkippedSentences,
          },
          lockedCount
        );
        setEffectiveSubtitles(effectiveWithLock);
      } catch (error) {
        console.error('Fetch data error:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (exerciseId) {
      fetchData();
    }
  }, [exerciseId]);

  const handleSelectForMerge = (index: number, selected: boolean) => {
    setSelectedForMerge((prev) =>
      selected ? [...prev, index] : prev.filter((i) => i !== index)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    if (!userProgress) return;

    if (selected) {
      const editableIndices = effectiveSubtitles
        .filter((s) => !s.isLocked)
        .map((s) => s.index);
      setSelectedForMerge(editableIndices);
    } else {
      setSelectedForMerge([]);
    }
  };

  const handleToggleSkip = (effectiveIndex: number, skipped: boolean) => {
    const row = effectiveSubtitles.find((s) => s.index === effectiveIndex);
    if (!row) return;

    const originalIndices = row.originalIndices;
    setSkippedSentences((prev) => {
      const next = new Set(prev);
      for (const originalIndex of originalIndices) {
        if (skipped) {
          next.add(originalIndex);
        } else {
          next.delete(originalIndex);
        }
      }
      return Array.from(next);
    });
  };

  const recomputeEffectiveSubtitles = (
    groups: MergeGroup[],
    skips: number[]
  ) => {
    setEffectiveSubtitles(
      applySubtitleConfigWithLock(rawSubtitles, { mergedGroups: groups, skippedSentences: skips }, lockedOriginalCount)
    );
  };

  const handleAddGroup = (group: MergeGroup) => {
    const nextGroups = [...mergeGroups, group];
    setMergeGroups(nextGroups);
    setSelectedForMerge([]);
    setAutoMergeSummary(null);
    recomputeEffectiveSubtitles(nextGroups, skippedSentences);
  };

  const handleCreateFromSelected = (label: string) => {
    if (selectedForMerge.length < 2) return;

    // Map effective indices back to original indices so the merge group
    // stores the correct raw subtitle range (effective indices can differ
    // after existing merges/skips).
    const selectedOriginalIndices = selectedForMerge
      .map((idx) => effectiveSubtitles.find((s) => s.index === idx))
      .filter((s): s is EffectiveSubtitle => !!s)
      .flatMap((s) => s.originalIndices);

    const sortedOriginal = [...new Set(selectedOriginalIndices)].sort((a, b) => a - b);

    // Require a contiguous original range so we don't silently include
    // unselected sentences in the new group.
    const startIndex = sortedOriginal[0];
    const endIndex = sortedOriginal[sortedOriginal.length - 1];
    if (endIndex - startIndex + 1 !== sortedOriginal.length) {
      toast({
        title: 'Invalid selection',
        description: 'Please select consecutive sentences for a merge group.',
        variant: 'destructive',
      });
      return;
    }

    const newGroup: MergeGroup = {
      startIndex,
      endIndex,
      label,
    };

    handleAddGroup(newGroup);
  };

  const handleAutoMerge = () => {
    const mergedIndices = getMergedOriginalIndices(mergeGroups);
    const newGroups: MergeGroup[] = [];

    let start = -1;
    const flush = (end: number) => {
      if (start >= 0 && end > start) {
        newGroups.push({
          startIndex: start,
          endIndex: end,
          label: `Auto ${mergeGroups.length + newGroups.length + 1}`,
        });
      }
      start = -1;
    };

    // Accumulate sentences that contain no sentence/clause-ending
    // punctuation and merge them with the following ones; the group ends at
    // the first sentence containing one of: , . ? ! ; : (or their full-width
    // variants). Locked (already practiced) sentences and indices covered by
    // existing merge groups act as hard boundaries.
    const terminatorPattern = /[,.?!;:,.?!:;]/;
    for (let i = 0; i < rawSubtitles.length; i++) {
      if (i < lockedOriginalCount || mergedIndices.has(i)) {
        flush(i - 1);
        continue;
      }
      if (start < 0) {
        start = i;
      }
      if (terminatorPattern.test(rawSubtitles[i].text)) {
        flush(i);
      }
    }
    flush(rawSubtitles.length - 1);

    if (newGroups.length === 0) {
      setAutoMergeSummary(null);
      toast({
        title: 'Nothing to merge',
        description: 'No consecutive sentences without ending punctuation (, . ? ! ; :) were found.',
      });
      return;
    }

    const nextGroups = [...mergeGroups, ...newGroups];
    setMergeGroups(nextGroups);
    setSelectedForMerge([]);
    recomputeEffectiveSubtitles(nextGroups, skippedSentences);
    setAutoMergeSummary(
      `Merge successful: created ${newGroups.length} merge group${newGroups.length > 1 ? 's' : ''}. Review them below, then click "Save Changes" to apply.`
    );
  };

  const handleDeleteGroup = (startIndex: number) => {
    const nextGroups = mergeGroups.filter((g) => g.startIndex !== startIndex);
    setMergeGroups(nextGroups);
    setAutoMergeSummary(null);
    recomputeEffectiveSubtitles(nextGroups, skippedSentences);
  };

  const handleUnmerge = (effectiveIndex: number) => {
    const row = effectiveSubtitles.find((s) => s.index === effectiveIndex);
    if (!row || !row.isMerged) return;

    const startOriginal = row.originalIndices[0];
    const nextGroups = mergeGroups.filter(
      (g) => g.startIndex !== startOriginal
    );
    setMergeGroups(nextGroups);
    setAutoMergeSummary(null);
    recomputeEffectiveSubtitles(nextGroups, skippedSentences);
  };

  const handleUpdateMergedText = (effectiveIndex: number, text: string) => {
    const row = effectiveSubtitles.find((s) => s.index === effectiveIndex);
    if (!row || !row.isMerged) return;

    const startOriginal = row.originalIndices[0];
    const trimmed = text.trim();
    const nextGroups = mergeGroups.map((g) => {
      if (g.startIndex !== startOriginal) return g;
      const base: MergeGroup = {
        startIndex: g.startIndex,
        endIndex: g.endIndex,
        label: g.label,
      };
      return trimmed ? { ...base, customText: trimmed } : base;
    });
    setMergeGroups(nextGroups);
    recomputeEffectiveSubtitles(nextGroups, skippedSentences);
  };

  const handleSaveConfig = async () => {
    try {
      setIsSaving(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/subtitles/${exerciseId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          mergedGroups: mergeGroups,
          skippedSentences,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to save configuration');
      }

      setAutoMergeSummary(null);
      toast({
        title: 'Success',
        description: 'Subtitle configuration saved. Changes apply to next playback.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save config',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsSaving(true);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/subtitles/${exerciseId}/config`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to reset configuration');
      }

      setMergeGroups([]);
      setSkippedSentences([]);
      setSelectedForMerge([]);
      setAutoMergeSummary(null);
      recomputeEffectiveSubtitles([], []);

      toast({
        title: 'Success',
        description: 'Subtitle configuration reset to default.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reset config',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading subtitle configuration...</p>
        </div>
      </div>
    );
  }

  if (!effectiveSubtitles || effectiveSubtitles.length === 0 || !userProgress) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Unable to load subtitle data</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customize Subtitles</h1>
            <p className="text-gray-600 mt-1">Merge sentences or skip them during practice</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleAutoMerge}
              disabled={isSaving || rawSubtitles.length === 0}
              title="Automatically merge consecutive sentences that have no ending punctuation (, . ? ! ; :)"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              One-Click Merge
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Back"
              title="Back"
              onClick={() => router.back()}
            >
              <ArrowLeft />
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Tip:</strong> Your changes will apply the next time you practice this exercise.
            Subtitle customization helps you focus on specific sections or skip parts you find too easy.
          </p>
        </div>

        {/* Auto Merge Result Banner */}
        {autoMergeSummary && (
          <div className="flex items-start justify-between gap-2 rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <p className="text-sm text-green-900">{autoMergeSummary}</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setAutoMergeSummary(null)}
              className="shrink-0 text-green-600 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Subtitle List */}
        <SubtitleList
          subtitles={effectiveSubtitles}
          currentProgress={userProgress.currentSentenceIndex}
          selectedForMerge={selectedForMerge}
          skippedSentences={skippedSentences}
          onSelectForMerge={handleSelectForMerge}
          onToggleSkip={handleToggleSkip}
          onSelectAll={handleSelectAll}
          onUnmerge={handleUnmerge}
          onUpdateMergedText={handleUpdateMergedText}
        />

        {/* Merge Group Editor */}
        <MergeGroupEditor
          mergeGroups={mergeGroups}
          selectedForMerge={selectedForMerge}
          onCreateFromSelected={handleCreateFromSelected}
          lockedOriginalCount={lockedOriginalCount}
          onDeleteGroup={handleDeleteGroup}
        />

        {/* Skip Sentence Editor */}
        <SkipSentenceEditor
          subtitles={effectiveSubtitles}
          skippedSentences={skippedSentences}
          onToggleSkip={handleToggleSkip}
        />

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
            disabled={isSaving || (mergeGroups.length === 0 && skippedSentences.length === 0)}
          >
            Reset to Default
          </Button>
          <Button
            onClick={handleSaveConfig}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
