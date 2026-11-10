'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export interface PracticeProgress {
  current: number;
  total: number;
}

interface PracticeProgressContextValue {
  progress: PracticeProgress | null;
  setProgress: (progress: PracticeProgress | null) => void;
}

const PracticeProgressContext = createContext<PracticeProgressContextValue>({
  progress: null,
  setProgress: () => {},
});

export function PracticeProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<PracticeProgress | null>(null);

  return (
    <PracticeProgressContext.Provider value={{ progress, setProgress }}>
      {children}
    </PracticeProgressContext.Provider>
  );
}

export function usePracticeProgress() {
  return useContext(PracticeProgressContext);
}
