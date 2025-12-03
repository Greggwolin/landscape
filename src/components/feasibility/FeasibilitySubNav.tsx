'use client';

import React, { useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CNav, CNavItem, CNavLink } from '@coreui/react';

interface FeasibilitySubNavProps {
  projectId: number;
}

interface SubTab {
  id: string;
  label: string;
  path: string;
}

/**
 * FeasibilitySubNav Component
 *
 * Secondary navigation for FEASIBILITY/VALUATION tab sub-routes.
 * Appears below main navigation when on Feasibility tab.
 *
 * Sub-tabs:
 * - Market Data: Comparable sales, pricing, absorption rates
 * - Sensitivity Analysis: Slider-based assumption testing with IRR/NPV impact
 */
export default function FeasibilitySubNav({ projectId }: FeasibilitySubNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const subTabs: SubTab[] = [
    { id: 'market-data', label: 'Market Data', path: `/projects/${projectId}/feasibility/market-data` },
    { id: 'sensitivity', label: 'Sensitivity Analysis', path: `/projects/${projectId}/feasibility/sensitivity` },
  ];

  // Determine active sub-tab from pathname
  const activeSubTab = useMemo(() => {
    const match = subTabs.find(tab => pathname.startsWith(tab.path));
    return match?.id || 'market-data';
  }, [pathname]);

  const handleSubTabChange = (path: string) => {
    router.push(path);
  };

  return (
    <div
      className="feasibility-sub-nav"
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
