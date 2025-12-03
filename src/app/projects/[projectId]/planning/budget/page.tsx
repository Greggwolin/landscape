'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import BudgetGridTab from '@/components/budget/BudgetGridTab';
import { ExportButton } from '@/components/admin';
import '@/components/budget/custom/BudgetGrid.css';

/**
 * Planning & Engineering Budget Page
 *
 * Budget view filtered to show only Planning & Engineering costs.
 * Uses BudgetGridTab with scope filtering.
 */
export default function PlanningBudgetPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <BudgetGridTab
      projectId={projectId}
      scopeFilter="Planning & Engineering"
    />
  );
}
