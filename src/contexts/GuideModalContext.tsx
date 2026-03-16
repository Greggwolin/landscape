'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface GuideModalState {
  isOpen: boolean;
  /** Optional hash to scroll to on open, e.g. "4.2" */
  initialHash?: string;
  openGuide: (hash?: string) => void;
  closeGuide: () => void;
  toggleGuide: () => void;
}

const GuideModalContext = createContext<GuideModalState | undefined>(undefined);

export function GuideModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialHash, setInitialHash] = useState<string | undefined>(undefined);

  const openGuide = useCallback((hash?: string) => {
    setInitialHash(hash);
    setIsOpen(true);
  }, []);

  const closeGuide = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleGuide = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return (
    <GuideModalContext.Provider value={{ isOpen, initialHash, openGuide, closeGuide, toggleGuide }}>
      {children}
    </GuideModalContext.Provider>
  );
}

export function useGuideModal(): GuideModalState {
  const ctx = useContext(GuideModalContext);
  if (!ctx) throw new Error('useGuideModal must be used within GuideModalProvider');
  return ctx;
}
