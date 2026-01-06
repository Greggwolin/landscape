'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { LandscaperPanel } from '@/components/landscaper';

interface ProjectLayoutClientProps {
  projectId: number;
  children: React.ReactNode;
}

/**
 * Map query param tab values to canonical Landscaper tab names.
 * Tab comes from ?tab=xxx query parameter (see page.tsx line 30).
 */
function mapTabToLandscaperContext(tab: string): string {
  const tabMap: Record<string, string> = {
    // Direct mappings
    'project': 'home',
    'property': 'property',
    'operations': 'operations',
    'feasibility': 'feasibility',
    'valuation': 'feasibility',      // Valuation is part of feasibility context
    'capitalization': 'capitalization',
    'reports': 'reports',
    'documents': 'documents',
    // Land dev tabs
    'planning': 'property',          // Planning relates to property/site
    'budget': 'operations',          // Budget relates to operations
    'sales': 'feasibility',          // Sales relates to feasibility
    // Legacy
    'overview': 'home',
    'sources': 'capitalization',
    'uses': 'capitalization',
    'gis': 'property',
  };

  return tabMap[tab] || 'home';
}

export function ProjectLayoutClient({ projectId, children }: ProjectLayoutClientProps) {
  const searchParams = useSearchParams();
  const queryTab = searchParams.get('tab') || 'project';
  const activeTab = mapTabToLandscaperContext(queryTab);

  // Debug: log when activeTab changes
  console.log('[ProjectLayoutClient] queryTab:', queryTab, '-> activeTab:', activeTab);

  return (
    <div className="flex flex-1 min-h-0 gap-3" style={{ alignItems: 'flex-start' }}>
      {/* Left Panel - Landscaper (30%) - sticky to stay visible while scrolling */}
      {/* Key forces re-mount when tab changes to ensure fresh state */}
      <div
        key={`landscaper-${activeTab}`}
        className="flex-shrink-0 sticky top-0"
        style={{
          width: '30%',
          minWidth: '350px',
          maxWidth: '450px',
          height: 'calc(100vh - 180px)', // Subtract header heights
        }}
      >
        <LandscaperPanel projectId={projectId} activeTab={activeTab} />
      </div>

      {/* Right Content - Tab Content (70%) */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
