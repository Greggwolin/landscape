'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

/** Viewport width below which the artifacts panel auto-collapses. */
const ARTIFACTS_COLLAPSE_BREAKPOINT = 1200;

/** Map artifact config returned by generate_map_artifact tool. */
export interface MapArtifactConfig {
  title: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
  pitch: number;
  bearing: number;
  basemap: 'satellite' | 'terrain' | 'roadmap';
  markers: Array<{
    id: string;
    coordinates: [number, number];
    label?: string;
    color?: string;
    variant?: 'pin' | 'dot' | 'numbered';
    popup?: string;
  }>;
  project_name?: string;
  location?: string;
  /** When 'input', map opens in pin-placement mode (no coords on project). */
  mode?: 'display' | 'input';
  /** Project ID — needed for input mode to save coordinates back. */
  project_id?: number;
}

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
  /** Active map artifact — set by Landscaper tool result, rendered in artifacts panel. */
  activeMapArtifact: MapArtifactConfig | null;
  setActiveMapArtifact: (config: MapArtifactConfig | null) => void;
  /** Chat search overlay state. */
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  /** Content domain derived from the last modal opened — enriches page context for Landscaper. */
  activeContentContext: string | null;
  setActiveContentContext: (ctx: string | null) => void;
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
  const [activeMapArtifact, setActiveMapArtifact] = useState<MapArtifactConfig | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeContentContext, setActiveContentContext] = useState<string | null>(null);
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
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <WrapperUIContext.Provider value={{
      chatOpen, toggleChat, openChat, closeChat,
      rightPanelNarrow, setRightPanelNarrow,
      artifactsOpen, toggleArtifacts,
      activeMapArtifact, setActiveMapArtifact,
      searchOpen, openSearch, closeSearch,
      activeContentContext, setActiveContentContext,
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
