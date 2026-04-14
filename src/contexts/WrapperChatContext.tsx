'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ArtifactContent {
  title: string;
  type: string;
  data: unknown;
}

interface WrapperChatContextValue {
  // Artifact panel state
  artifactOpen: boolean;
  toggleArtifact: () => void;
  artifactContent: ArtifactContent | null;
  setArtifactContent: (content: ArtifactContent | null) => void;
}

const WrapperChatContext = createContext<WrapperChatContextValue | null>(null);

interface WrapperChatProviderProps {
  children: React.ReactNode;
}

/**
 * Context for shared wrapper UI state.
 * Manages artifact panel state. Thread state is managed internally
 * by LandscaperChatThreaded (center panel) and useRecentThreads (sidebar).
 */
export function WrapperChatProvider({ children }: WrapperChatProviderProps) {
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [artifactContent, setArtifactContent] = useState<ArtifactContent | null>(null);
  const toggleArtifact = useCallback(() => setArtifactOpen((v) => !v), []);

  return (
    <WrapperChatContext.Provider
      value={{
        artifactOpen,
        toggleArtifact,
        artifactContent,
        setArtifactContent,
      }}
    >
      {children}
    </WrapperChatContext.Provider>
  );
}

/**
 * Hook to consume WrapperChatContext.
 * Returns null when called outside a WrapperChatProvider.
 */
export function useWrapperChat(): WrapperChatContextValue | null {
  return useContext(WrapperChatContext);
}

/**
 * Hook that throws if not inside WrapperChatProvider.
 */
export function useWrapperChatRequired(): WrapperChatContextValue {
  const ctx = useContext(WrapperChatContext);
  if (!ctx) {
    throw new Error('useWrapperChatRequired must be used within a WrapperChatProvider');
  }
  return ctx;
}
