'use client';

import { Badge } from '@/components/ui/badge';

interface AccuracyBadgeProps {
  accuracy: number;
  showPercent?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AccuracyBadge({
  accuracy,
  showPercent = true,
  size = 'md',
}: AccuracyBadgeProps) {
  const getVariant = () => {
    if (accuracy >= 80) return 'default';
    if (accuracy >= 50) return 'secondary';
    return 'destructive';
  };

  const getBackgroundColor = () => {
    if (accuracy >= 80) return 'bg-green-500 hover:bg-green-600';
    if (accuracy >= 50) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-red-500 hover:bg-red-600';
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1';
      case 'lg':
        return 'text-lg px-4 py-2';
      default:
        return 'text-base px-3 py-1.5';
    }
  };

  return (
    <div className={`${getBackgroundColor()} inline-block rounded-full text-white font-bold ${getSizeClass()} transition-colors`}>
      {accuracy}
      {showPercent && '%'}
    </div>
  );
}
