'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles } from 'lucide-react';
import { KNOWLEDGE_POINT_CATEGORIES } from '@/lib/types';
import type { KnowledgePointCategory, AiKnowledgePointTeachResponse } from '@/lib/types';
import { cn } from '@/lib/utils';

interface KnowledgePointCreateDialogProps {
  open: boolean;
  capturedText: string;
  exerciseId: string;
  sourceSentenceIndex: number;
  sourceSentence: string;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function KnowledgePointCreateDialog({
  open,
  capturedText,
  exerciseId,
  sourceSentenceIndex,
  sourceSentence,
  onOpenChange,
  onCreated,
}: KnowledgePointCreateDialogProps) {
  const [category, setCategory] = useState<KnowledgePointCategory>('word');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

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
    if (isGenerating) return;

    setIsGenerating(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/knowledge-point-teach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          capturedText,
          category,
          sourceSentence,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate AI explanation');
      }

      const result = (await response.json()) as { data: AiKnowledgePointTeachResponse };
      setDescription(result.data.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI explanation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting || isGenerating) return;
    setDescription('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Knowledge Point</DialogTitle>
          <DialogDescription>
            Save &quot;{capturedText}&quot; as a learning note.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
            <Textarea
              id="description"
              placeholder="Enter your note or click AI Search to generate one..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              disabled={isGenerating}
              className="max-h-60 overflow-y-auto resize-y"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting || isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isGenerating}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
