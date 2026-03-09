'use client';

/**
 * LandscaperThinkingContext
 *
 * Lightweight global signal so any component (e.g. TopNavigationBar)
 * can know whether the project Landscaper is currently processing.
 *
 * The project Landscaper chat calls setIsThinking(true/false) from its
 * local useLandscaperThreads hook; the HelpIcon reads isThinking to
 * animate its propeller.
 */

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface LandscaperThinkingContextValue {
  isThinking: boolean;
  setIsThinking: (v: boolean) => void;
}

const LandscaperThinkingContext = createContext<LandscaperThinkingContextValue>({
  isThinking: false,
  setIsThinking: () => {},
});

export function LandscaperThinkingProvider({ children }: { children: ReactNode }) {
  const [isThinking, setIsThinkingRaw] = useState(false);
  const setIsThinking = useCallback((v: boolean) => setIsThinkingRaw(v), []);

  return (
    <LandscaperThinkingContext.Provider value={{ isThinking, setIsThinking }}>
      {children}
    </LandscaperThinkingContext.Provider>
  );
}

export function useLandscaperThinking() {
  return useContext(LandscaperThinkingContext);
}
