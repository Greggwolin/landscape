'use client';

import React from 'react';
import CapitalizationLayout from '../../capitalization/layout';
import EquityPage from '../../capitalization/equity/page';
import DebtPage from '../../capitalization/debt/page';

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
  activeSubTab = 'equity',
  setFolderTab,
}: CapitalizationTabProps) {
  const currentSubTab = ['equity', 'debt'].includes(activeSubTab)
    ? activeSubTab
    : 'equity';

  const handleSubTabChange = (tabId: string) => {
    setFolderTab?.('capital', tabId);
  };

  const renderContent =
    currentSubTab === 'debt' ? <DebtPage /> : <EquityPage />;

  return (
    <CapitalizationLayout
      subNavOverrides={{
        activeSubTab: currentSubTab,
        ...(setFolderTab ? { onSubTabChange: handleSubTabChange } : {}),
      }}
    >
      {renderContent}
    </CapitalizationLayout>
  );
}
