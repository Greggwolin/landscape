'use client';

import React, { useCallback, useMemo, useState } from 'react';
import CapitalizationLayout from '../../capitalization/layout';
import EquityPage from '../../capitalization/equity/page';
import DebtPage from '../../capitalization/debt/page';
import { useLandscaperRefresh } from '@/hooks/useLandscaperRefresh';

interface Project {
  project_id: number;
  project_name: string;
}

interface CapitalizationTabProps {
  project?: Project;
  activeSubTab?: 'equity' | 'debt';
  setFolderTab?: (folder: string, tab?: string) => void;
}

export default function CapitalizationTab({
  project,
  activeSubTab = 'equity',
  setFolderTab,
}: CapitalizationTabProps) {
  const currentSubTab = ['equity', 'debt'].includes(activeSubTab)
    ? activeSubTab
    : 'equity';

  const handleSubTabChange = (tabId: string) => {
    setFolderTab?.('capital', tabId);
  };

  // Force child remount on Landscaper mutations via key increment
  const [refreshKey, setRefreshKey] = useState(0);
  const watchedTables = useMemo(() => ['loans', 'equity_structure', 'waterfall_tiers'], []);
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  useLandscaperRefresh(project?.project_id ?? 0, watchedTables, handleRefresh);

  const renderContent =
    currentSubTab === 'debt' ? <DebtPage key={refreshKey} /> : <EquityPage key={refreshKey} />;

  return (
    // Next route layouts only accept { children }; CapitalizationLayout ignored
    // subNavOverrides, so passing it was a no-op (removed for the #43 typecheck gate).
    <CapitalizationLayout>
      {renderContent}
    </CapitalizationLayout>
  );
}
