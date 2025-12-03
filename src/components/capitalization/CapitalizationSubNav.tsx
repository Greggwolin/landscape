'use client';

import React, { useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CNav, CNavItem, CNavLink } from '@coreui/react';

interface CapitalizationSubNavProps {
  projectId: number;
}

interface SubTab {
  id: string;
  label: string;
  path: string;
}

/**
 * CapitalizationSubNav Component
 *
 * Secondary navigation for CAPITALIZATION tab sub-routes.
 * Appears below main navigation when on Capitalization tab.
 *
 * Sub-tabs:
 * - Debt: Debt facilities, terms, draw schedules
 * - Equity: Equity structure, waterfall, distributions
 * - Developer Operations: Developer fees, overhead, operating costs
 */
export default function CapitalizationSubNav({ projectId }: CapitalizationSubNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const subTabs: SubTab[] = useMemo(() => [
    { id: 'debt', label: 'Debt', path: `/projects/${projectId}/capitalization/debt` },
    { id: 'equity', label: 'Equity', path: `/projects/${projectId}/capitalization/equity` },
    { id: 'operations', label: 'Developer Operations', path: `/projects/${projectId}/capitalization/operations` },
  ], [projectId]);

  // Determine active sub-tab from pathname
  const activeSubTab = useMemo(() => {
    const match = subTabs.find(tab => pathname.startsWith(tab.path));
    return match?.id || 'debt';
  }, [pathname, subTabs]);

  const handleSubTabChange = (path: string) => {
    router.push(path);
  };

  return (
    <div
      className="capitalization-sub-nav"
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
