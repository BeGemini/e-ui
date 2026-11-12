'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface SubtitleEditorActionsContextValue {
  /** Registered by the subtitle editor page; the header button invokes it.
   *  Object wrapper avoids React treating a bare function state as an updater. */
  autoMerge: { run: () => void } | null;
  setAutoMerge: (handler: { run: () => void } | null) => void;
}

const SubtitleEditorActionsContext = createContext<SubtitleEditorActionsContextValue>({
  autoMerge: null,
  setAutoMerge: () => {},
});

export function SubtitleEditorActionsProvider({ children }: { children: ReactNode }) {
  const [autoMerge, setAutoMerge] = useState<{ run: () => void } | null>(null);

  return (
    <SubtitleEditorActionsContext.Provider value={{ autoMerge, setAutoMerge }}>
      {children}
    </SubtitleEditorActionsContext.Provider>
  );
}

export function useSubtitleEditorActions() {
  return useContext(SubtitleEditorActionsContext);
}
