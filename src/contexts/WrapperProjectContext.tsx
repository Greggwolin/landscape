'use client';

import React, { createContext, useContext } from 'react';

export interface WrapperProject {
  project_id: number;
  project_name: string;
  project_type_code?: string;
  project_type?: string;
  property_subtype?: string;
  // Location — needed by the Map tab so it centers on the saved location
  // instead of treating the project as having no home (causes auto-fit zoom-out).
  location_lat?: number | null;
  location_lon?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  county?: string | null;
  state?: string | null;
  apn_primary?: string | null;
}

const WrapperProjectContext = createContext<WrapperProject | null>(null);
// Separate context so consumers can re-fetch the project (e.g. after the Map
// tab moves the subject location) without changing the project value shape.
const WrapperProjectRefetchContext = createContext<(() => void) | null>(null);

interface WrapperProjectProviderProps {
  project: WrapperProject;
  onRefetch?: () => void;
  children: React.ReactNode;
}

export function WrapperProjectProvider({ project, onRefetch, children }: WrapperProjectProviderProps) {
  return (
    <WrapperProjectContext.Provider value={project}>
      <WrapperProjectRefetchContext.Provider value={onRefetch ?? null}>
        {children}
      </WrapperProjectRefetchContext.Provider>
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

/** Re-fetch the wrapper project from the API. No-op if no provider supplied one. */
export function useWrapperProjectRefetch(): () => void {
  return useContext(WrapperProjectRefetchContext) ?? (() => {});
}
