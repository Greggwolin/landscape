'use client';

import React from 'react';
import { WorkbenchProvider } from '@/contexts/WorkbenchContext';
import { FileDropProvider } from '@/contexts/FileDropContext';
import { LandscaperCollisionProvider } from '@/contexts/LandscaperCollisionContext';

interface ProjectContextShellProps {
  children: React.ReactNode;
}

/**
 * Shared context provider shell for project-scoped layouts.
 * Used by both the existing ProjectLayoutClient and the new wrapper layout.
 */
export function ProjectContextShell({ children }: ProjectContextShellProps) {
  return (
    <FileDropProvider>
      <WorkbenchProvider>
        <LandscaperCollisionProvider>
          {children}
        </LandscaperCollisionProvider>
      </WorkbenchProvider>
    </FileDropProvider>
  );
}
