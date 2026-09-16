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
import { Pencil, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { KNOWLEDGE_POINT_CATEGORIES } from '@/lib/types';
import type { KnowledgePoint, KnowledgePointCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

interface KnowledgePointEditDialogProps {
  open: boolean;
  knowledgePoint: KnowledgePoint | null;
  exerciseId: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function KnowledgePointEditDialog({
  open,
  knowledgePoint,
  exerciseId,
  onOpenChange,
  onSaved,
}: KnowledgePointEditDialogProps) {
  const [category, setCategory] = useState<KnowledgePointCategory>(
    knowledgePoint?.category ?? 'word'
  );
  const [description, setDescription] = useState(knowledgePoint?.description ?? '');
  const [isPreview, setIsPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!knowledgePoint) return;

    if (!description.trim()) {
      setError('Please enter a note');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/knowledge-points/${exerciseId}/${knowledgePoint.knowledgePointId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            category,
            description: description.trim(),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update knowledge point');
      }

      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update knowledge point');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setIsPreview(false);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={handleClose} swipeDirection="right">
      <DrawerContent className="sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>Edit Knowledge Point</DrawerTitle>
          <DrawerDescription>
            Update the category and note for &quot;{knowledgePoint?.capturedText}&quot;.
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
              <label htmlFor="edit-description" className="text-sm font-medium">Note</label>
              {description && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPreview((prev) => !prev)}
                  disabled={isSubmitting}
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
            </div>
            {isPreview ? (
              <div className="max-h-80 min-h-32 overflow-y-auto rounded-lg border border-input bg-transparent px-2.5 py-2 prose prose-sm dark:prose-invert">
                <ReactMarkdown>{description}</ReactMarkdown>
              </div>
            ) : (
              <Textarea
                id="edit-description"
                placeholder="Enter your note..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                className="max-h-80 overflow-y-auto resize-y"
              />
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DrawerFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
