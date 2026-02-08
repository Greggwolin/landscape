'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import BudgetGridTab from '@/components/budget/BudgetGridTab';
import { ExportButton } from '@/components/admin';
import '@/components/budget/custom/BudgetGrid.css';

/**
 * Development Budget Page
 *
 * Development budget with phasing, cost curves, and unit pricing.
 * Uses BudgetGridTab with scope filtering.
 */
export default function DevelopmentBudgetPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <div className="app-content">
      <BudgetGridTab
        projectId={projectId}
        scopeFilter="Development"
      />
    </div>
  );
}
