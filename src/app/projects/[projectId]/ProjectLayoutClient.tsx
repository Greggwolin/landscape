'use client';

import React from 'react';
import { LandscaperPanel } from '@/components/landscaper';

interface ProjectLayoutClientProps {
  projectId: number;
  children: React.ReactNode;
}

export function ProjectLayoutClient({ projectId, children }: ProjectLayoutClientProps) {
  return (
    <div
      className="flex flex-1 min-h-0"
      style={{
        backgroundColor: '#E6E7EB', // Grey background for entire content area
        paddingLeft: 'var(--app-padding)', // Match nav tile bar left padding
        paddingRight: 'var(--app-padding)',
      }}
    >
      {/* Left Panel - Landscaper (30%) */}
      <div
        className="flex flex-col py-3 pr-3"
        style={{
          width: '30%',
          minWidth: '350px',
          maxWidth: '450px',
        }}
      >
        <LandscaperPanel projectId={projectId} />
      </div>

      {/* Right Content - Tab Content (70%) */}
      <div className="flex-1 overflow-auto py-3">
        {children}
      </div>
    </div>
  );
}
