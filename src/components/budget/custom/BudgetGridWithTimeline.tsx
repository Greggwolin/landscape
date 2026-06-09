'use client';

import React, { useState, useEffect } from 'react';
import DataGrid from './DataGrid';
import TimelineChart from './TimelineChart';
import { useBudgetData } from './hooks/useBudgetData';
import type { BudgetItem as LegacyBudgetItem } from './hooks/useBudgetData';
import type { BudgetItem } from '@/types/budget';
import { ColumnChooser, BudgetColumnConfig } from './ColumnChooser';

import { getAuthHeaders } from '@/lib/authHeaders';

// Adapter: useBudgetData returns the legacy /api/budget/gantt row shape, but the
// DataGrid + TimelineChart consume the canonical src/types/budget BudgetItem.
// The two shapes have different field names, so map the overlapping fields and
// leave the canonical-only fields null/undefined (the legacy feed never supplied
// them). Pure projection — no runtime behavior change.
function toCanonicalBudgetItem(item: LegacyBudgetItem): BudgetItem {
  return {
    fact_id: item.fact_id,
    project_id: 0,
    division_id: null,
    scope: item.scope ?? null,

    category_l1_id: null,
    category_l1_name: null,
    category_l1_code: null,
    category_l2_id: null,
    category_l2_name: null,
    category_l2_code: null,
    category_l3_id: null,
    category_l3_name: null,
    category_l3_code: null,
    category_l4_id: null,
    category_l4_name: null,
    category_l4_code: null,

    notes: item.category_detail ?? null,
    activity: null,
    qty: item.qty,
    uom_code: item.uom_code,
    rate: item.rate,
    amount: item.amount,
    start_period: null,
    periods_to_complete: null,

    escalation_rate: item.escalation_rate,
    escalation_method: null,
    start_date: item.start_date,
    end_date: item.end_date,
    timing_method: null,
    curve_profile: null,
    curve_steepness: null,

    contingency_pct: item.contingency_pct,
    confidence_level: null,
    vendor_name: null,
    vendor_contact_id: null,
    contract_number: null,
    purchase_order: null,
    is_committed: null,

    scope_override: null,
    cost_type: null,
    tax_treatment: null,
    internal_memo: null,

    baseline_start_date: null,
    baseline_end_date: null,
    actual_start_date: null,
    actual_end_date: null,
    percent_complete: null,
    status: null,
    is_critical: null,
    float_days: null,
    early_start_date: null,
    late_finish_date: null,

    budget_version: null,
    version_as_of_date: null,
    funding_id: null,
    funding_draw_pct: null,
    draw_schedule: null,
    retention_pct: null,
    payment_terms: null,
    invoice_frequency: null,
    cost_allocation: null,
    is_reimbursable: null,

    allocation_method: null,
    cf_start_flag: null,
    allocated_total: null,
    allocation_variance: null,

    bid_date: null,
    bid_amount: null,
    bid_variance: null,
    change_order_count: null,
    change_order_total: null,
    approval_status: null,
    approved_by: null,
    approval_date: null,
    document_count: null,
    last_modified_by: null,
    last_modified_date: null,

    // Legacy fields carried through
    category_id: item.category_id,
    category_code: item.category_code,
  };
}
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
        const response = await fetch('/api/measures', { headers: getAuthHeaders() });
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
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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
      const response = await fetch(`/api/budget/gantt/items/${factId}`, { headers: getAuthHeaders(), method: 'DELETE',
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
        {/* DataGrid is now the canonical BudgetDataGrid (Phase 1 shim). Its prop
            contract differs from the legacy grid this component was written for:
            mode + projectId are required, and update/delete flow through
            onInlineCommit / onRequestRowDelete (item-based, not factId-based).
            uomOptions/visibleColumns have no equivalent on the new grid and were
            runtime no-ops, so they are dropped. */}
        <DataGrid
          data={data.map(toCanonicalBudgetItem)}
          mode="standard"
          projectId={projectId}
          onInlineCommit={(item, field, value) =>
            handleUpdate(item.fact_id, String(field), value)
          }
          onRequestRowDelete={(item) => handleDelete(item.fact_id)}
        />
      </div>

      {/* Timeline Section */}
      {data.length > 0 && (
        <div className="timeline-section">
          <div className="section-header">
            <h3>Timeline</h3>
          </div>
          <TimelineChart data={data.map(toCanonicalBudgetItem)} />
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
