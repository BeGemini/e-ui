'use client';

interface SubtitleDisplayProps {
  text: string;
  isVisible: boolean;
  isMerged?: boolean;
  mergedLabel?: string;
}

export function SubtitleDisplay({
  text,
  isVisible,
  isMerged,
  mergedLabel,
}: SubtitleDisplayProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gradient-to-b from-gray-900 to-black p-8 text-center min-h-40 flex flex-col items-center justify-center">
      {isVisible ? (
        <div className="w-full space-y-3">
          {isMerged && mergedLabel && (
            <div className="text-xs font-semibold text-amber-500 uppercase tracking-wide">
              {mergedLabel}
            </div>
          )}
          <p className="text-xl md:text-2xl lg:text-3xl font-medium leading-relaxed text-white break-words">
            {text}
          </p>
          {isMerged && (
            <div className="text-xs text-gray-400">Multiple sentences combined</div>
          )}
        </div>
      ) : (
        <div className="text-gray-500 text-sm">Waiting for subtitle...</div>
      )}
    </div>
  );
}
