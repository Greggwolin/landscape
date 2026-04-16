'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

/** Viewport width below which the artifacts panel auto-collapses. */
const ARTIFACTS_COLLAPSE_BREAKPOINT = 1200;

interface WrapperUIContextValue {
  chatOpen: boolean;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  /** When true, <main> shrinks to fit its content (e.g. 320px artifacts sidebar). */
  rightPanelNarrow: boolean;
  setRightPanelNarrow: (v: boolean) => void;
  /** Whether the artifacts right panel is expanded (true) or collapsed to strip (false). */
  artifactsOpen: boolean;
  toggleArtifacts: () => void;
}

const WrapperUIContext = createContext<WrapperUIContextValue | null>(null);

/**
 * Global UI state for the /w/ wrapper shell.
 * - chatOpen: center Landscaper panel visibility (default: true).
 * - artifactsOpen: right artifacts panel visibility (auto-collapses on narrow viewports).
 */
export function WrapperUIProvider({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(true);
  const [rightPanelNarrow, setRightPanelNarrow] = useState(false);
  const [artifactsOpen, setArtifactsOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= ARTIFACTS_COLLAPSE_BREAKPOINT;
  });

  // Auto-collapse/expand artifacts panel on viewport resize
  useEffect(() => {
    const onResize = () => {
      setArtifactsOpen(window.innerWidth >= ARTIFACTS_COLLAPSE_BREAKPOINT);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleChat = useCallback(() => setChatOpen((v) => !v), []);
  const openChat = useCallback(() => setChatOpen(true), []);
  const closeChat = useCallback(() => setChatOpen(false), []);
  const toggleArtifacts = useCallback(() => setArtifactsOpen((v) => !v), []);

  return (
    <WrapperUIContext.Provider value={{
      chatOpen, toggleChat, openChat, closeChat,
      rightPanelNarrow, setRightPanelNarrow,
      artifactsOpen, toggleArtifacts,
    }}>
      {children}
    </WrapperUIContext.Provider>
  );
}

export function useWrapperUI(): WrapperUIContextValue {
  const ctx = useContext(WrapperUIContext);
  if (!ctx) throw new Error('useWrapperUI must be used within WrapperUIProvider');
  return ctx;
}
