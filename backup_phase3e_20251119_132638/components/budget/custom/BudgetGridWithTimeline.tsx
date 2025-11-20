'use client';

import React, { useState, useEffect } from 'react';
import DataGrid from './DataGrid';
import TimelineChart from './TimelineChart';
import { useBudgetData } from './hooks/useBudgetData';
import { ColumnChooser, BudgetColumnConfig } from './ColumnChooser';

interface BudgetGridWithTimelineProps {
  projectId: number;
  scope?: string;
  level?: string;
  entityId?: string;
}

export default function BudgetGridWithTimeline({
  projectId,
  scope = 'all',
  level = 'project',
  entityId,
}: BudgetGridWithTimelineProps) {
  const { data, isLoading, error, mutate } = useBudgetData({
    projectId,
    scope,
    level,
    entityId,
  });

  const [uomOptions, setUomOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingUom, setLoadingUom] = useState(true);
  const [showColumnChooser, setShowColumnChooser] = useState(false);

  // Column configuration
  const [columns, setColumns] = useState<BudgetColumnConfig[]>([
    { id: 'budget_item', label: 'Budget Item', visible: true, locked: true, description: 'Category code and description' },
    { id: 'qty', label: 'Quantity', visible: true, locked: true, description: 'Number of units' },
    { id: 'uom', label: 'UOM', visible: true, description: 'Unit of measure' },
    { id: 'rate', label: 'Rate', visible: true, locked: true, description: 'Cost per unit' },
    { id: 'amount', label: 'Amount', visible: true, locked: true, description: 'Calculated: Qty × Rate' },
    { id: 'start_date', label: 'Start Date', visible: true, description: 'Budget item start date' },
    { id: 'end_date', label: 'End Date', visible: true, description: 'Budget item end date' },
    { id: 'escalation', label: 'Escalation %', visible: false, description: 'Annual cost escalation rate' },
    { id: 'contingency', label: 'Contingency %', visible: false, description: 'Cost contingency percentage' },
    { id: 'scope', label: 'Scope', visible: true, description: 'Cost phase (Acquisition, Stage 1-3)' },
  ]);

  const handleToggleColumn = (columnId: string) => {
    setColumns(prev =>
      prev.map(col =>
        col.id === columnId && !col.locked
          ? { ...col, visible: !col.visible }
          : col
      )
    );
  };

  // Fetch UOM options
  useEffect(() => {
    async function fetchUom() {
      try {
        const response = await fetch('/api/measures');
        if (!response.ok) throw new Error('Failed to fetch UOM');
        const measures = await response.json();
        setUomOptions(
          measures.map((m: any) => ({
            value: m.code,
            label: `${m.code} - ${m.name}`,
          }))
        );
      } catch (err) {
        console.error('Error fetching UOM:', err);
      } finally {
        setLoadingUom(false);
      }
    }
    fetchUom();
  }, []);

  const handleUpdate = async (factId: number, field: string, value: any) => {
    try {
      const response = await fetch(`/api/budget/gantt/items/${factId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update budget item');
      }

      // Refresh data
      mutate();
    } catch (err) {
      console.error('Error updating budget item:', err);
      alert(`Failed to update: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (factId: number) => {
    try {
      const response = await fetch(`/api/budget/gantt/items/${factId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete budget item');
      }

      // Refresh data
      mutate();
    } catch (err) {
      console.error('Error deleting budget item:', err);
      alert(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (isLoading || loadingUom) {
    return (
      <div className="budget-grid-loading">
        <div className="spinner"></div>
        <p>Loading budget data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="budget-grid-error">
        <h3>Error Loading Budget</h3>
        <p>{error.message}</p>
        <button onClick={() => mutate()} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="budget-grid-with-timeline">
      {/* Data Grid Section */}
      <div className="grid-section">
        <div className="section-header">
          <h3>Budget Items</h3>
          <div className="grid-actions">
            <button className="add-item-button">+ Add Item</button>
            <button
              className="refresh-button"
              onClick={() => setShowColumnChooser(true)}
              title="Configure columns"
            >
              ⚙️ Columns
            </button>
            <button className="refresh-button" onClick={() => mutate()}>
              🔄 Refresh
            </button>
          </div>
        </div>
        <DataGrid
          data={data}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          uomOptions={uomOptions}
          visibleColumns={columns}
        />
      </div>

      {/* Timeline Section */}
      {data.length > 0 && (
        <div className="timeline-section">
          <div className="section-header">
            <h3>Timeline</h3>
          </div>
          <TimelineChart data={data} />
        </div>
      )}

      {/* Empty State */}
      {data.length === 0 && (
        <div className="empty-budget-state">
          <h3>No Budget Items</h3>
          <p>Add budget items to see them visualized on the timeline.</p>
          <button className="add-first-item-button">+ Add First Item</button>
        </div>
      )}

      {/* Column Chooser Modal */}
      <ColumnChooser
        isOpen={showColumnChooser}
        onClose={() => setShowColumnChooser(false)}
        columns={columns}
        onToggleColumn={handleToggleColumn}
      />
    </div>
  );
}
