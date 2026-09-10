'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SubtitleList } from '@/app/components/subtitle-editor/SubtitleList';
import { MergeGroupEditor, type MergeGroup } from '@/app/components/subtitle-editor/MergeGroupEditor';
import { SkipSentenceEditor } from '@/app/components/subtitle-editor/SkipSentenceEditor';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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

interface SubtitleConfig {
  exerciseId: string;
  userId: string;
  mergedGroups: MergeGroup[];
  skippedSentences: number[];
}

interface UserProgress {
  currentSentenceIndex: number;
}

export default function SubtitleEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const exerciseId = params.exerciseId as string;

  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [config, setConfig] = useState<SubtitleConfig | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedForMerge, setSelectedForMerge] = useState<number[]>([]);
  const [mergeGroups, setMergeGroups] = useState<MergeGroup[]>([]);
  const [skippedSentences, setSkippedSentences] = useState<number[]>([]);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Get practice data for subtitles
        const practiceRes = await fetch(`/api/practice/${exerciseId}`);
        if (!practiceRes.ok) throw new Error('Failed to load practice data');
        const practiceData = await practiceRes.json();
        setSubtitles(practiceData.subtitles);
        setUserProgress(practiceData.userProgress);

        // Get config
        const configRes = await fetch(`/api/subtitles/${exerciseId}/config`);
        if (!configRes.ok) throw new Error('Failed to load config');
        const configData = await configRes.json();
        setConfig(configData);
        setMergeGroups(configData.mergedGroups || []);
        setSkippedSentences(configData.skippedSentences || []);
      } catch (error) {
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
  }, [exerciseId, toast]);

  const handleSelectForMerge = (index: number, selected: boolean) => {
    setSelectedForMerge((prev) =>
      selected ? [...prev, index] : prev.filter((i) => i !== index)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    if (!userProgress) return;

    if (selected) {
      const editableIndices = subtitles
        .filter((s) => s.index >= userProgress.currentSentenceIndex)
        .map((s) => s.index);
      setSelectedForMerge(editableIndices);
    } else {
      setSelectedForMerge([]);
    }
  };

  const handleToggleSkip = (index: number, skipped: boolean) => {
    setSkippedSentences((prev) =>
      skipped ? [...prev, index] : prev.filter((i) => i !== index)
    );
  };

  const handleAddGroup = (group: MergeGroup) => {
    setMergeGroups((prev) => [...prev, group]);
    setSelectedForMerge([]);
  };

  const handleRemoveGroup = (index: number) => {
    setMergeGroups((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateGroup = (index: number, group: MergeGroup) => {
    setMergeGroups((prev) => prev.map((g, i) => (i === index ? group : g)));
  };

  const handleCreateFromSelected = (label: string) => {
    if (selectedForMerge.length < 2) return;

    const sorted = [...selectedForMerge].sort((a, b) => a - b);
    const newGroup: MergeGroup = {
      startIndex: sorted[0],
      endIndex: sorted[sorted.length - 1],
      label,
    };

    handleAddGroup(newGroup);
  };

  const handleSaveConfig = async () => {
    try {
      setIsSaving(true);

      const response = await fetch(`/api/subtitles/${exerciseId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mergedGroups,
          skippedSentences,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      toast({
        title: 'Success',
        description: 'Subtitle configuration saved. Changes apply to next playback.',
      });

      // Return to exercise detail page
      setTimeout(() => {
        router.push(`/dashboard/${exerciseId}`);
      }, 1500);
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

      const response = await fetch(`/api/subtitles/${exerciseId}/config`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to reset configuration');
      }

      setMergeGroups([]);
      setSkippedSentences([]);
      setSelectedForMerge([]);

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading subtitle configuration...</p>
        </div>
      </div>
    );
  }

  if (!subtitles || subtitles.length === 0 || !userProgress) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Unable to load subtitle data</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customize Subtitles</h1>
            <p className="text-gray-600 mt-1">Merge sentences or skip them during practice</p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>

        {/* Info Banner */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Tip:</strong> Your changes will apply the next time you practice this exercise.
            Subtitle customization helps you focus on specific sections or skip parts you find too easy.
          </p>
        </div>

        {/* Subtitle List */}
        <SubtitleList
          subtitles={subtitles}
          currentProgress={userProgress.currentSentenceIndex}
          selectedForMerge={selectedForMerge}
          skippedSentences={skippedSentences}
          onSelectForMerge={handleSelectForMerge}
          onToggleSkip={handleToggleSkip}
          onSelectAll={handleSelectAll}
        />

        {/* Merge Group Editor */}
        <MergeGroupEditor
          mergeGroups={mergeGroups}
          selectedForMerge={selectedForMerge}
          totalSentences={subtitles.length}
          onAddGroup={handleAddGroup}
          onRemoveGroup={handleRemoveGroup}
          onUpdateGroup={handleUpdateGroup}
          onCreateFromSelected={handleCreateFromSelected}
        />

        {/* Skip Sentence Editor */}
        <SkipSentenceEditor
          subtitles={subtitles}
          currentProgress={userProgress.currentSentenceIndex}
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
