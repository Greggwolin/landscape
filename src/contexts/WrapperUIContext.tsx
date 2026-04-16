'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

interface WrapperUIContextValue {
  chatOpen: boolean;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  /** When true, <main> shrinks to fit its content (e.g. 320px artifacts sidebar). */
  rightPanelNarrow: boolean;
  setRightPanelNarrow: (v: boolean) => void;
}

const WrapperUIContext = createContext<WrapperUIContextValue | null>(null);

/**
 * Global UI state for the /w/ wrapper shell.
 * - chatOpen: center Landscaper panel visibility (default: true).
 *   When false, center panel is fully hidden (not collapsed to a strip).
 */
export function WrapperUIProvider({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(true);
  const [rightPanelNarrow, setRightPanelNarrow] = useState(false);

  const toggleChat = useCallback(() => setChatOpen((v) => !v), []);
  const openChat = useCallback(() => setChatOpen(true), []);
  const closeChat = useCallback(() => setChatOpen(false), []);

  return (
    <WrapperUIContext.Provider value={{ chatOpen, toggleChat, openChat, closeChat, rightPanelNarrow, setRightPanelNarrow }}>
      {children}
    </WrapperUIContext.Provider>
  );
}

export function useWrapperUI(): WrapperUIContextValue {
  const ctx = useContext(WrapperUIContext);
  if (!ctx) throw new Error('useWrapperUI must be used within WrapperUIProvider');
  return ctx;
}
