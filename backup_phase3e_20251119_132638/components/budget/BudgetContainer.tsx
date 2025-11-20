'use client';

import { useState } from 'react';
import { CCard, CCardBody } from '@coreui/react';
import BudgetGridTab from './BudgetGridTab';
import TimelineTab from './TimelineTab';
import AssumptionsTab from './AssumptionsTab';
import AnalysisTab from './AnalysisTab';

interface BudgetContainerProps {
  projectId: number;
}

export default function BudgetContainer({ projectId }: BudgetContainerProps) {
  const [activeSubTab, setActiveSubTab] = useState('grid');

  return (
    <>
      {/* Sub-tab navigation - moved inside the card in BudgetGridTab */}
      {activeSubTab === 'grid' && <BudgetGridTab projectId={projectId} />}
      {activeSubTab === 'timeline' && <TimelineTab projectId={projectId} />}
      {activeSubTab === 'assumptions' && <AssumptionsTab projectId={projectId} />}
      {activeSubTab === 'analysis' && <AnalysisTab projectId={projectId} />}
    </>
  );
}
