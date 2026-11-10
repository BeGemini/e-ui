'use client';

import { useState, useCallback, useRef } from 'react';
import type { AiNoteTeachRequest, AiNoteTeachResponse } from '@/lib/types';

interface UseAiNoteSearchReturn {
  result: string;
  isGenerating: boolean;
  error: string;
  search: (params: AiNoteTeachRequest) => Promise<string>;
  reset: () => void;
}

export function useAiNoteSearch(): UseAiNoteSearchReturn {
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const isGeneratingRef = useRef(false);

  const search = useCallback(async (params: AiNoteTeachRequest) => {
    if (isGeneratingRef.current) return '';

    isGeneratingRef.current = true;
    setIsGenerating(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/note-teach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate AI explanation');
      }

      const json = (await response.json()) as { data: AiNoteTeachResponse };
      setResult(json.data.explanation);
      return json.data.explanation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate AI explanation';
      setError(message);
      throw err;
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult('');
    setError('');
  }, []);

  return { result, isGenerating, error, search, reset };
}
