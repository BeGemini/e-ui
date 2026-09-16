'use client';

import { useEffect, useState, useRef } from 'react';
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
import { KNOWLEDGE_POINT_CATEGORIES } from '@/lib/types';
import type { KnowledgePointCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAiKnowledgePointSearch } from '@/hooks/use-ai-knowledge-point-search';

interface AiSearchResultDialogProps {
  open: boolean;
  capturedText: string;
  sourceSentence: string;
  onOpenChange: (open: boolean) => void;
  onSaveAsKnowledgePoint?: (description: string) => void;
}

export function AiSearchResultDialog({
  open,
  capturedText,
  sourceSentence,
  onOpenChange,
  onSaveAsKnowledgePoint,
}: AiSearchResultDialogProps) {
  const [category, setCategory] = useState<KnowledgePointCategory>('word');
  const { result, isGenerating, error, search, reset } = useAiKnowledgePointSearch();
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      if (hasOpenedRef.current) {
        reset();
      }
      hasOpenedRef.current = false;
      return;
    }

    if (hasOpenedRef.current) return;
    hasOpenedRef.current = true;

    void search({
      capturedText,
      category,
      sourceSentence,
    });
  }, [open, capturedText, category, sourceSentence, reset, search]);

  const handleCategoryChange = (newCategory: KnowledgePointCategory) => {
    setCategory(newCategory);
  };

  const handleClose = () => {
    if (isGenerating) return;
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!result.trim()) return;
    onSaveAsKnowledgePoint?.(result);
    onOpenChange(false);
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
              {KNOWLEDGE_POINT_CATEGORIES.map((config) => (
                <Button
                  key={config.category}
                  type="button"
                  variant={category === config.category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleCategoryChange(config.category)}
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
            <label className="text-sm font-medium">Explanation</label>
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
                <span className="text-sm text-gray-500">No result yet</span>
              </div>
            )}
          </div>
        </div>

        <DrawerFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
            Close
          </Button>
          <Button
            onClick={handleSave}
            disabled={isGenerating || !result.trim()}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" />
            Save as Knowledge Point
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
