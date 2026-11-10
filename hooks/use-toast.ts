'use client';

// Hook for showing toast notifications
// This is a placeholder implementation using browser alerts
// In production, this would use a proper toast library like react-hot-toast or sonner

// Defined at module level so the reference is stable across renders and safe to use in effect deps
function toast(options: {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}) {
  const message = `${options.title || ''} ${options.description || ''}`.trim();
  if (options.variant === 'destructive') {
    console.error(message);
  } else {
    console.log(message);
  }
}

export function useToast() {
  return { toast };
}
