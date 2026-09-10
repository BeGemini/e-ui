'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface DictationInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

export function DictationInput({
  value,
  onChange,
  onSubmit,
  onClear,
  isDisabled = false,
  isLoading = false,
  placeholder = 'Type what you hear...',
}: DictationInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on component mount
  useEffect(() => {
    if (textareaRef.current && !isDisabled) {
      textareaRef.current.focus();
    }
  }, [isDisabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <label className="block text-sm font-medium text-gray-700">
        Your Dictation
      </label>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled || isLoading}
        placeholder={placeholder}
        className="w-full h-24 p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 resize-none"
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {value.length} characters
          {value.length > 0 && ` • Press Ctrl+Enter to submit`}
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={isDisabled || isLoading || value.length === 0}
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={isDisabled || isLoading || value.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Checking...' : 'Check'}
          </Button>
        </div>
      </div>
    </div>
  );
}
