'use client';

/**
 * ViewModeToggle - Switch between Studio and Main views
 *
 * STYLING RULES:
 * - Uses CoreUI components (CButtonGroup, CButton, CBadge)
 * - No Tailwind color classes
 *
 * @version 1.0
 * @created 2026-01-21
 */

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CButtonGroup, CButton, CBadge } from '@coreui/react';

interface ViewModeToggleProps {
  projectId: string | number;
}

/**
 * Maps Studio routes to Main branch tabs
 */
const STUDIO_TO_MAIN_TAB: Record<string, string> = {
  '': 'project',
  'property': 'property',
  'planning': 'planning',
  'budget': 'budget',
  'operations': 'operations',
  'sales': 'sales',
  'valuation': 'valuation',
  'feasibility': 'feasibility',
  'capitalization': 'capitalization',
  'reports': 'reports',
  'documents': 'documents',
  'market': 'project', // No direct equivalent
  'hbu': 'project', // No direct equivalent
  'overview': 'project',
};

export default function ViewModeToggle({ projectId }: ViewModeToggleProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isStudioView = pathname?.includes('/studio') ?? false;

  const handleToggle = (mode: 'studio' | 'main') => {
    if (mode === 'studio' && !isStudioView) {
      // Switch to Studio view
      router.push(`/projects/${projectId}/studio`);
    } else if (mode === 'main' && isStudioView) {
      // Switch to Main view
      // Extract current tab from studio route and map to main branch
      const studioPath = pathname?.split('/studio')[1] || '';
      const segment = studioPath.replace(/^\//, '').split('/')[0] || '';
      const tab = STUDIO_TO_MAIN_TAB[segment] || 'project';
      router.push(`/projects/${projectId}?tab=${tab}`);
    }
  };

  return (
    <div className="d-flex align-items-center gap-2">
      <CButtonGroup size="sm" role="group" aria-label="View mode toggle">
        <CButton
          color={isStudioView ? 'primary' : 'secondary'}
          variant={isStudioView ? undefined : 'ghost'}
          onClick={() => handleToggle('studio')}
          title="Studio View (experimental)"
        >
          Studio
        </CButton>
        <CButton
          color={!isStudioView ? 'primary' : 'secondary'}
          variant={!isStudioView ? undefined : 'ghost'}
          onClick={() => handleToggle('main')}
          title="Main View"
        >
          Main
        </CButton>
      </CButtonGroup>
      {isStudioView && (
        <CBadge color="warning" shape="rounded-pill" className="ms-1">
          BETA
        </CBadge>
      )}
    </div>
  );
}
