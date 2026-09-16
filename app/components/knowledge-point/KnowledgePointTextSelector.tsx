'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import { normalizeSelectionToWholeWords } from '@/lib/knowledge-point-utils';

interface SelectionState {
  text: string;
  x: number;
  y: number;
}

interface KnowledgePointTextSelectorProps {
  sentenceText: string;
  children: React.ReactNode;
  onCreate: (capturedText: string) => void;
  onAiSearch?: (capturedText: string) => void;
}

export function KnowledgePointTextSelector({
  sentenceText,
  children,
  onCreate,
  onAiSearch,
}: KnowledgePointTextSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);

  const handleSelectionChange = useCallback(() => {
    const nativeSelection = window.getSelection();
    if (!nativeSelection || nativeSelection.isCollapsed || !containerRef.current) {
      setSelection(null);
      return;
    }

    const range = nativeSelection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }

    const selectedText = nativeSelection.toString().trim();
    if (!selectedText) {
      setSelection(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const normalized = normalizeSelectionToWholeWords(
      sentenceText,
      getTextOffset(containerRef.current, range.startContainer, range.startOffset),
      getTextOffset(containerRef.current, range.endContainer, range.endOffset)
    );

    if (!normalized) {
      setSelection(null);
      return;
    }

    setSelection({
      text: normalized,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }, [sentenceText]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  const handleCreate = () => {
    if (!selection) return;
    onCreate(selection.text);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleAiSearch = () => {
    if (!selection || !onAiSearch) return;
    onAiSearch(selection.text);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only clear selection when clicking the text content, not the floating button
    if (e.target instanceof Element && e.target.closest('[data-kp-floating-button]')) {
      return;
    }
    setSelection(null);
  };

  return (
    <div ref={containerRef} onMouseDown={handleMouseDown} className="relative">
      {children}
      {selection && (
        <div
          className="fixed z-50 flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg"
          style={{
            left: selection.x,
            top: selection.y,
            transform: 'translate(-50%, -100%)',
          }}
          data-kp-floating-button
        >
          <Button
            size="sm"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleCreate}
            className="shadow-sm"
          >
            <Plus className="mr-1 h-4 w-4" />
            New Knowledge Point
          </Button>
          {onAiSearch && (
            <Button
              size="sm"
              variant="outline"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleAiSearch}
              className="gap-1 border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800"
            >
              <Sparkles className="h-4 w-4" />
              AI Search
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Calculate the text offset of a node/offset pair relative to a container.
 */
function getTextOffset(
  container: HTMLElement,
  node: Node,
  offset: number
): number {
  let textOffset = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);

  while (walker.nextNode()) {
    const currentNode = walker.currentNode;
    if (currentNode === node) {
      return textOffset + offset;
    }
    textOffset += currentNode.textContent?.length ?? 0;
  }

  return textOffset;
}
