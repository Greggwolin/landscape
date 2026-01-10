'use client';

import { useState } from 'react';
import BudgetGridTab from './BudgetGridTab';
import TimelineTab from './TimelineTab';

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
    </>
  );
}
