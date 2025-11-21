'use client';

import React, { useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CNav, CNavItem, CNavLink } from '@coreui/react';

interface ProjectSubNavProps {
  projectId: number;
}

interface SubTab {
  id: string;
  label: string;
  path: string;
}

/**
 * ProjectSubNav Component
 *
 * Secondary navigation for PROJECT tab sub-routes.
 * Appears below ProjectContextBar when on PROJECT tab.
 *
 * Sub-tabs:
 * - Summary: Overview dashboard with key metrics
 * - Planning: Parcel management and phasing
 * - Budget: Lifecycle stage budget management
 * - Sales: Sales & absorption (Phase 3)
 * - DMS: Document Management System
 * - Operations: (Future) Operations tracking
 */
export default function ProjectSubNav({ projectId }: ProjectSubNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const subTabs: SubTab[] = [
    { id: 'summary', label: 'Summary', path: `/projects/${projectId}/project/summary` },
    { id: 'planning', label: 'Planning', path: `/projects/${projectId}/project/planning` },
    { id: 'budget', label: 'Budget', path: `/projects/${projectId}/project/budget` },
    { id: 'sales', label: 'Sales & Absorption', path: `/projects/${projectId}/project/sales` },
    { id: 'dms', label: 'DMS', path: `/projects/${projectId}/project/dms` },
    // Future Phase 4+ tabs
    // { id: 'operations', label: 'Operations', path: `/projects/${projectId}/project/operations` },
  ];

  // Determine active sub-tab from pathname
  const activeSubTab = useMemo(() => {
    const match = subTabs.find(tab => pathname.startsWith(tab.path));
    return match?.id || 'summary';
  }, [pathname, subTabs]);

  const handleSubTabChange = (path: string) => {
    router.push(path);
  };

  return (
    <div
      className="project-sub-nav"
      style={{
        background: 'var(--cui-tertiary-bg)',
        borderBottom: '1px solid var(--cui-border-color)',
        padding: '0 1.5rem',
      }}
    >
      <CNav variant="underline-border">
        {subTabs.map((tab) => (
          <CNavItem key={tab.id}>
            <CNavLink
              active={activeSubTab === tab.id}
              onClick={() => handleSubTabChange(tab.path)}
              style={{ cursor: 'pointer' }}
            >
              {tab.label}
            </CNavLink>
          </CNavItem>
        ))}
      </CNav>
    </div>
  );
}
