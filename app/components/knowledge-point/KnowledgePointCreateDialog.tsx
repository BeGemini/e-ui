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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Pencil, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { KNOWLEDGE_POINT_CATEGORIES } from '@/lib/types';
import type { KnowledgePointCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAiKnowledgePointSearch } from '@/hooks/use-ai-knowledge-point-search';

interface KnowledgePointCreateDialogProps {
  open: boolean;
  capturedText: string;
  exerciseId: string;
  sourceSentenceIndex: number;
  sourceSentence: string;
  initialDescription?: string;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function KnowledgePointCreateDialog({
  open,
  capturedText,
  exerciseId,
  sourceSentenceIndex,
  sourceSentence,
  initialDescription = '',
  onOpenChange,
  onCreated,
}: KnowledgePointCreateDialogProps) {
  const [category, setCategory] = useState<KnowledgePointCategory>('word');
  const [description, setDescription] = useState(initialDescription);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState('');
  const { isGenerating, search: aiSearch, reset: resetAiSearch } = useAiKnowledgePointSearch();

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/knowledge-points/${exerciseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceSentenceIndex,
          capturedText,
          category,
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create knowledge point');
      }

      setDescription('');
      onOpenChange(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create knowledge point');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiTeach = async () => {
    setError('');

    try {
      const explanation = await aiSearch({
        capturedText,
        category,
        sourceSentence,
      });
      setDescription(explanation);
      setIsPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI explanation');
    }
  };

  const handleClose = () => {
    if (isSubmitting || isGenerating) return;
    setDescription('');
    setIsPreview(false);
    setError('');
    resetAiSearch();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={handleClose} swipeDirection="right">
      <DrawerContent className="sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>Create Knowledge Point</DrawerTitle>
          <DrawerDescription>
            Save &quot;{capturedText}&quot; as a learning note.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <div className="flex gap-2">
              {KNOWLEDGE_POINT_CATEGORIES.map((config) => (
                <Button
                  key={config.category}
                  type="button"
                  variant={category === config.category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(config.category)}
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
              <label htmlFor="description" className="text-sm font-medium">Note</label>
              <div className="flex items-center gap-1.5">
                {description && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPreview((prev) => !prev)}
                    disabled={isGenerating}
                    className="h-8 w-8"
                    title={isPreview ? 'Edit' : 'Preview'}
                  >
                    {isPreview ? (
                      <Pencil className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleAiTeach}
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
                      AI Search
                    </>
                  )}
                </Button>
              </div>
            </div>
            {isPreview ? (
              <div className="max-h-80 min-h-32 overflow-y-auto rounded-lg border border-input bg-transparent px-2.5 py-2 prose prose-sm dark:prose-invert">
                <ReactMarkdown>{description}</ReactMarkdown>
              </div>
            ) : (
              <Textarea
                id="description"
                placeholder="Enter your note or click AI Search to generate one..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                disabled={isGenerating}
                className="max-h-80 overflow-y-auto resize-y"
              />
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DrawerFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting || isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isGenerating}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
