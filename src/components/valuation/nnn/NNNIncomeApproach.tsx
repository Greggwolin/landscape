'use client';

/**
 * NNNIncomeApproach — Container for NNN SLB Income Approach
 *
 * Manages Level 3 sub-sub tab state (synced to URL ?subtab= param).
 * Renders SubSubTabBar + routes to one of four panels.
 * Updates Landscaper context on tab switch.
 *
 * @version 1.0
 * @created 2026-02-23
 * @session QT2
 */

import React, { memo, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import SubSubTabBar, { type SubSubTab } from './SubSubTabBar';
import LeaseTermsPanel from './panels/LeaseTermsPanel';
import TenantCreditPanel from './panels/TenantCreditPanel';
import UnitEconomicsPanel from './panels/UnitEconomicsPanel';
import ValueConclusionPanel from './panels/ValueConclusionPanel';

// ─── Tab Config ──────────────────────────────────────────────────────

const NNN_INCOME_TABS: SubSubTab[] = [
  { id: 'lease-terms', label: 'Lease Terms' },
  { id: 'tenant-credit', label: 'Tenant & Credit' },
  { id: 'unit-economics', label: 'Unit Economics' },
  { id: 'value-conclusion', label: 'Value Conclusion' },
];

const DEFAULT_TAB = 'lease-terms';

// ─── Props ───────────────────────────────────────────────────────────

interface NNNIncomeApproachProps {
  projectId: number;
  project?: Record<string, unknown>;
}

// ─── Component ───────────────────────────────────────────────────────

function NNNIncomeApproach({ projectId }: NNNIncomeApproachProps) {
  void projectId; // Will be used when wiring to API
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read subtab from URL, fallback to default
  const activeSubTab = useMemo(() => {
    const param = searchParams.get('subtab');
    if (param && NNN_INCOME_TABS.some((t) => t.id === param)) return param;
    return DEFAULT_TAB;
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('subtab', tabId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      // Landscaper context auto-reads ?subtab= from URL via HelpLandscaperContext
    },
    [searchParams, router, pathname]
  );

  // Meta summary for tab bar (could be computed from data)
  const metaSummary = '7.50% Cap · $322,500 NOI · 2.44x Coverage';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Level 3 Tab Bar */}
      <SubSubTabBar
        tabs={NNN_INCOME_TABS}
        activeTab={activeSubTab}
        onTabChange={handleTabChange}
        metaSummary={metaSummary}
      />

      {/* Panel Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeSubTab === 'lease-terms' && <LeaseTermsPanel />}
        {activeSubTab === 'tenant-credit' && <TenantCreditPanel />}
        {activeSubTab === 'unit-economics' && <UnitEconomicsPanel />}
        {activeSubTab === 'value-conclusion' && <ValueConclusionPanel />}
      </div>
    </div>
  );
}

export default memo(NNNIncomeApproach);
