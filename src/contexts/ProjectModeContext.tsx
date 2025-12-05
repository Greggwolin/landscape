'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ProjectMode = 'napkin' | 'standard';

interface ProjectModeContextValue {
  mode: ProjectMode;
  setMode: (mode: ProjectMode) => void;
  toggleMode: () => void;
}

const ProjectModeContext = createContext<ProjectModeContextValue | undefined>(undefined);

function getStorageKey(projectId?: number) {
  return projectId ? `project_mode_${projectId}` : 'project_mode_global';
}

export function ProjectModeProvider({
  children,
  projectId
}: {
  children: React.ReactNode;
  projectId?: number;
}) {
  const storageKey = getStorageKey(projectId);
  const [mode, setModeState] = useState<ProjectMode>('napkin');

  // Load persisted mode on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(storageKey);
    if (stored === 'napkin' || stored === 'standard') {
      setModeState(stored);
    } else {
      setModeState('napkin');
    }
  }, [storageKey]);

  const setMode = useCallback(
    (nextMode: ProjectMode) => {
      setModeState(nextMode);
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, nextMode);
      }
    },
    [storageKey]
  );

  const toggleMode = useCallback(() => {
    setMode(mode === 'napkin' ? 'standard' : 'napkin');
  }, [mode, setMode]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode
    }),
    [mode, setMode, toggleMode]
  );

  return <ProjectModeContext.Provider value={value}>{children}</ProjectModeContext.Provider>;
}

export function useProjectMode() {
  const context = useContext(ProjectModeContext);
  if (!context) {
    throw new Error('useProjectMode must be used within a ProjectModeProvider');
  }
  return context;
}
