/**
 * Budget Page with Full Budget Grid
 *
 * Displays all budget items with full editing capabilities.
 * Uses BudgetGridTab which includes grid, timeline, filters, and editing.
 */

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import BudgetGridTab from '@/components/budget/BudgetGridTab';
import '@/components/budget/custom/BudgetGrid.css';

export default function BudgetPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <div className="container-fluid px-4">
      <BudgetGridTab projectId={projectId} />
    </div>
  );
}
