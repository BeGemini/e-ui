'use client';

import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { NOTE_CATEGORIES } from '@/lib/types';
import type { NoteCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAiNoteSearch } from '@/hooks/use-ai-note-search';

interface AiSearchResultDialogProps {
  open: boolean;
  capturedText: string;
  sourceSentence: string;
  exerciseId: string;
  sourceSentenceIndex: number;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function AiSearchResultDialog({
  open,
  capturedText,
  sourceSentence,
  exerciseId,
  sourceSentenceIndex,
  onOpenChange,
  onSaved,
}: AiSearchResultDialogProps) {
  const [category, setCategory] = useState<NoteCategory>('word');
  const [searchedCategory, setSearchedCategory] = useState<NoteCategory | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { result, isGenerating, error, search, reset } = useAiNoteSearch();

  const resetState = () => {
    setCategory('word');
    setSearchedCategory(null);
    setSaveError('');
    reset();
  };

  const handleSearch = async () => {
    try {
      await search({
        capturedText,
        category,
        sourceSentence,
      });
      setSearchedCategory(category);
    } catch {
      // Error is surfaced through the hook's error state.
    }
  };

  const handleClose = () => {
    if (isGenerating || isSaving) return;
    resetState();
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!result.trim() || isSaving) return;
    setIsSaving(true);
    setSaveError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/notes/${exerciseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceSentenceIndex,
          capturedText,
          category: searchedCategory ?? category,
          description: result.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save note');
      }

      resetState();
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleClose} swipeDirection="right">
      <DrawerContent className="sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            AI Search Result
          </DrawerTitle>
          <DrawerDescription>
            Explanation for &quot;{capturedText}&quot;
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <div className="flex gap-2">
              {NOTE_CATEGORIES.map((config) => (
                <Button
                  key={config.category}
                  type="button"
                  variant={category === config.category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(config.category)}
                  disabled={isGenerating}
                  className={cn(
                    'flex-1',
                    category === config.category && [config.colorClass, 'hover:bg-primary hover:text-primary-foreground']
                  )}
                >
                  {config.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Explanation</label>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSearch}
                disabled={isGenerating}
                className="h-8 gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white hover:from-violet-700 hover:to-indigo-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    {searchedCategory ? 'Search Again' : 'AI Search'}
                  </>
                )}
              </Button>
            </div>
            {result && searchedCategory && searchedCategory !== category && (
              <p className="text-xs text-amber-600">
                Category changed — click Search Again to refresh the result.
              </p>
            )}
            {isGenerating ? (
              <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Searching with AI...</span>
                </div>
              </div>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : result ? (
              <div className="max-h-80 min-h-32 overflow-y-auto rounded-lg border border-input bg-transparent px-2.5 py-2 prose prose-sm dark:prose-invert">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <span className="text-sm text-gray-500">Select a category, then click AI Search.</span>
              </div>
            )}
          </div>
        </div>

        {saveError && <p className="px-4 text-sm text-red-600">{saveError}</p>}

        <DrawerFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isGenerating || isSaving}>
            Close
          </Button>
          <Button
            onClick={handleSave}
            disabled={isGenerating || isSaving || !result.trim()}
            className="gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save as Note
              </>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
