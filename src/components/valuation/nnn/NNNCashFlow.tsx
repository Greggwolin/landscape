'use client';

/**
 * NNNCashFlow — Container for NNN SLB Cash Flow (Investment Perspective)
 *
 * Investment perspective equivalent of NNNIncomeApproach.
 * Same four sub-sub tabs, but Value Conclusion swaps for ReturnsSummaryPanel.
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
import ReturnsSummaryPanel from './panels/ReturnsSummaryPanel';

// ─── Tab Config ──────────────────────────────────────────────────────

const NNN_CASHFLOW_TABS: SubSubTab[] = [
  { id: 'lease-terms', label: 'Lease Terms' },
  { id: 'tenant-credit', label: 'Tenant & Credit' },
  { id: 'unit-economics', label: 'Unit Economics' },
  { id: 'returns-summary', label: 'Returns Summary' },
];

const DEFAULT_TAB = 'lease-terms';

// ─── Props ───────────────────────────────────────────────────────────

interface NNNCashFlowProps {
  projectId: number;
  project?: Record<string, unknown>;
}

// ─── Component ───────────────────────────────────────────────────────

function NNNCashFlow({ projectId }: NNNCashFlowProps) {
  void projectId;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeSubTab = useMemo(() => {
    const param = searchParams.get('subtab');
    if (param && NNN_CASHFLOW_TABS.some((t) => t.id === param)) return param;
    return DEFAULT_TAB;
  }, [searchParams]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('subtab', tabId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      // Landscaper context auto-reads ?subtab= from URL via HelpLandscaperContext
    },
    [searchParams, router, pathname]
  );

  const metaSummary = '7.50% Cap · 8.25% IRR · 10-Yr Hold';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <SubSubTabBar
        tabs={NNN_CASHFLOW_TABS}
        activeTab={activeSubTab}
        onTabChange={handleTabChange}
        metaSummary={metaSummary}
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeSubTab === 'lease-terms' && <LeaseTermsPanel />}
        {activeSubTab === 'tenant-credit' && <TenantCreditPanel />}
        {activeSubTab === 'unit-economics' && <UnitEconomicsPanel />}
        {activeSubTab === 'returns-summary' && <ReturnsSummaryPanel />}
      </div>
    </div>
  );
}

export default memo(NNNCashFlow);
