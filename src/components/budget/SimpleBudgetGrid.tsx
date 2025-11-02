/**
 * SimpleBudgetGrid - MVP Budget Grid Component
 *
 * Uses react-data-grid for the budget table without complex Gantt dependencies.
 * This is a working MVP until we can integrate a commercial Gantt library.
 */

'use client';

import React, { useMemo } from 'react';
import { DataGrid } from 'react-data-grid';
import type { Column } from 'react-data-grid';
import { useBudgetGanttData, BudgetGanttTask } from './hooks/useBudgetGanttData';
import { useBudgetCalculations } from './hooks/useBudgetCalculations';
import { useBudgetSave } from './hooks/useBudgetSave';
import 'react-data-grid/lib/styles.css';
import './SimpleBudgetGrid.css';

interface SimpleBudgetGridProps {
  projectId: string | number;
  scope?: string;
  level?: string;
  entityId?: string | number;
}

export default function SimpleBudgetGrid({
  projectId,
  scope,
  level = 'project',
  entityId,
}: SimpleBudgetGridProps) {
  const { tasks, isLoading, error } = useBudgetGanttData({
    projectId,
    scope,
    level,
    entityId,
  });

  const { formatCurrency, formatNumber } = useBudgetCalculations();
  const { saveBudgetItem, isSaving } = useBudgetSave({
    projectId,
    scope,
    level,
    entityId,
  });

  // Define columns
  const columns: Column<BudgetGanttTask>[] = useMemo(() => [
    {
      key: 'text',
      name: 'Budget Item',
      width: 300,
      frozen: true,
      resizable: true,
      renderCell: ({ row }) => (
        <div className={`budget-cell ${row.type === 'summary' ? 'summary-row' : ''}`}>
          <span style={{ paddingLeft: row.parent ? '24px' : '0' }}>
            {row.text}
          </span>
        </div>
      ),
    },
    {
      key: 'category_code',
      name: 'Code',
      width: 120,
      resizable: true,
    },
    {
      key: 'qty',
      name: 'Quantity',
      width: 100,
      resizable: true,
      renderCell: ({ row }) => (
        <div className="budget-cell numeric">
          {row.type === 'summary' ? '' : formatNumber(row.qty || 0, 2)}
        </div>
      ),
      renderEditCell: ({ row, onRowChange }) => (
        <input
          type="number"
          value={row.qty || 0}
          onChange={(e) => {
            const newQty = parseFloat(e.target.value) || 0;
            onRowChange({ ...row, qty: newQty, amount: newQty * (row.rate || 0) });
          }}
          onBlur={async () => {
            await saveBudgetItem({
              fact_id: Number(row.id),
              qty: row.qty,
              amount: (row.qty || 0) * (row.rate || 0),
            });
          }}
        />
      ),
    },
    {
      key: 'uom_code',
      name: 'UOM',
      width: 80,
      resizable: true,
    },
    {
      key: 'rate',
      name: 'Rate',
      width: 120,
      resizable: true,
      renderCell: ({ row }) => (
        <div className="budget-cell numeric">
          {row.type === 'summary' ? '' : formatCurrency(row.rate || 0)}
        </div>
      ),
    },
    {
      key: 'amount',
      name: 'Amount',
      width: 140,
      resizable: true,
      renderCell: ({ row }) => {
        const calculated = row.qty && row.rate ? row.qty * row.rate : row.amount;
        const className = row.type === 'summary' ? 'summary-amount' : 'calculated';
        return (
          <div className={`budget-cell numeric ${className}`}>
            {formatCurrency(calculated || 0)}
          </div>
        );
      },
    },
    {
      key: 'start',
      name: 'Start Date',
      width: 120,
      resizable: true,
      renderCell: ({ row }) => (
        <div className="budget-cell">
          {row.start ? new Date(row.start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '-'}
        </div>
      ),
    },
    {
      key: 'duration',
      name: 'Duration',
      width: 100,
      resizable: true,
      renderCell: ({ row }) => (
        <div className="budget-cell numeric">
          {row.duration || 1} mo
        </div>
      ),
    },
    {
      key: 'escalation_rate',
      name: 'Escalation %',
      width: 120,
      resizable: true,
      renderCell: ({ row }) => (
        <div className="budget-cell numeric">
          {row.type === 'summary' || !row.escalation_rate ? '-' : `${formatNumber(row.escalation_rate, 2)}%`}
        </div>
      ),
    },
    {
      key: 'contingency_pct',
      name: 'Contingency %',
      width: 130,
      resizable: true,
      renderCell: ({ row }) => (
        <div className="budget-cell numeric">
          {row.type === 'summary' || !row.contingency_pct ? '-' : `${formatNumber(row.contingency_pct, 2)}%`}
        </div>
      ),
    },
  ], [formatCurrency, formatNumber, saveBudgetItem]);

  if (isLoading) {
    return (
      <div className="simple-budget-loading">
        <div className="spinner" />
        <p>Loading budget data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="simple-budget-error">
        <p>Error loading budget data: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="simple-budget-grid-container">
      <DataGrid
        columns={columns}
        rows={tasks}
        rowKeyGetter={(row) => row.id}
        className="simple-budget-grid"
        style={{ height: '600px' }}
        rowClass={(row) => row.type === 'summary' ? 'summary-row' : 'detail-row'}
      />
      {isSaving && (
        <div className="simple-budget-saving">
          Saving...
        </div>
      )}
    </div>
  );
}
