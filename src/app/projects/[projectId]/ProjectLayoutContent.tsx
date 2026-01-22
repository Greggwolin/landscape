'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import ProjectContextBar from '@/app/components/ProjectContextBar';
import { ProjectLayoutClient } from './ProjectLayoutClient';

interface ProjectLayoutContentProps {
  projectId: number;
  children: React.ReactNode;
}

/**
 * ProjectLayoutContent - Conditional layout wrapper
 *
 * For /studio routes: Renders children directly (studio has its own layout)
 * For other routes: Renders the standard project layout with:
 *   - ProjectContextBar (header with project selector + lifecycle tiles)
 *   - ProjectLayoutClient (30/70 split with LandscaperPanel)
 */
export function ProjectLayoutContent({ projectId, children }: ProjectLayoutContentProps) {
  const pathname = usePathname();
  const isStudioRoute = pathname?.includes('/studio');

  // Studio routes get direct passthrough - they have their own standalone layout
  if (isStudioRoute) {
    return <>{children}</>;
  }

  // Standard project layout with header + 30/70 split
  return (
    <div className="app-page flex-1 min-h-0">
      {/* Full-width header */}
      <ProjectContextBar projectId={projectId} />

      {/* 30/70 split content area */}
      <ProjectLayoutClient projectId={projectId}>
        {children}
      </ProjectLayoutClient>
    </div>
  );
}
