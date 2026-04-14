'use client';

import React, { createContext, useContext } from 'react';

export interface WrapperProject {
  project_id: number;
  project_name: string;
  project_type_code?: string;
  project_type?: string;
  property_subtype?: string;
}

const WrapperProjectContext = createContext<WrapperProject | null>(null);

interface WrapperProjectProviderProps {
  project: WrapperProject;
  children: React.ReactNode;
}

export function WrapperProjectProvider({ project, children }: WrapperProjectProviderProps) {
  return (
    <WrapperProjectContext.Provider value={project}>
      {children}
    </WrapperProjectContext.Provider>
  );
}

export function useWrapperProject(): WrapperProject {
  const ctx = useContext(WrapperProjectContext);
  if (!ctx) {
    throw new Error('useWrapperProject must be used within a WrapperProjectProvider');
  }
  return ctx;
}
