'use client';

import React, { memo, useMemo, useEffect, useCallback, useState, useRef } from 'react';
import { CCard, CCardBody } from '@coreui/react';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';
import OpExHierarchy from '@/app/components/OpExHierarchy';

// New Operations components
import {
  OperatingStatement,
  SummaryBar,
  OperationsHeader,
  LineItemRow,
  IncomeTreemap,
  ExpenseTreemap,
} from '@/components/operations';
import { getProjectCategory, isIncomeProperty } from '@/components/projects/tiles/tileConfig';
import '@/styles/operations-tab.css';
import { useOperationsData } from '@/hooks/useOperationsData';
import { useLandscaperRefresh } from '@/hooks/useLandscaperRefresh';
import { useValueAddAssumptions } from '@/hooks/useValueAddAssumptions';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
  project_type?: string;
  property_subtype?: string;
}

interface OperationsTabProps {
  project: Project;
  mode?: ComplexityTier;
  onModeChange?: (mode: ComplexityTier) => void;
}

function OperationsTab({ project, mode: propMode, onModeChange }: OperationsTabProps) {
  // Align project-type resolution with folder tabs/navigation
  // project_type_code ('RET', 'MF') is the canonical field for category routing
  const effectiveProjectType =
    project.project_type_code || project.project_type || project.property_subtype;
  const projectCategory = getProjectCategory(effectiveProjectType);
  const isIncome = isIncomeProperty(effectiveProjectType);
  const isLand = !isIncome;
  const isMultifamily = projectCategory === 'multifamily';

  // Use the operations data hook
  const {
    data,
    propertySummary,
    rentalIncome,
    vacancyDeductions,
    otherIncome,
    operatingExpenses,
    totals,
    availableScenarios,
    preferredScenario,
    valueAddEnabled,
    showPostRehab,
    isLoading,
    isSaving,
    error,
    isDirty,
    updateInput,
    toggleValueAdd,
    toggleExpand,
    saveAll,
    reload
  } = useOperationsData(project.project_id);

  // Column visibility state (lifted here so chooser can render in header)
  const [hideLossToLease, setHideLossToLease] = useState(false);
  const [hidePostReno, setHidePostReno] = useState(!showPostRehab);
  const [showColumnChooser, setShowColumnChooser] = useState(false);
  const columnChooserRef = useRef<HTMLDivElement>(null);

  // Close column chooser on outside click
  useEffect(() => {
    if (!showColumnChooser) return;
    const handleClick = (e: MouseEvent) => {
      if (columnChooserRef.current && !columnChooserRef.current.contains(e.target as Node)) {
        setShowColumnChooser(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showColumnChooser]);

  // Sync hidePostReno with valueAddEnabled
  useEffect(() => {
    if (!showPostRehab) setHidePostReno(true);
  }, [showPostRehab]);

  const rentalRows: LineItemRow[] = rentalIncome?.rows || [];
  const unitCount = propertySummary?.unit_count || 0;
  const totalSF = propertySummary?.total_sf || 0;

  const unitMixStats = useMemo(() => {
    const totalUnitsFromRows = rentalRows.reduce((sum, row) => sum + (row.as_is.count || 0), 0);
    const weightedRent = rentalRows.reduce(
      (sum, row) => sum + (row.as_is.rate || 0) * (row.as_is.count || 0),
      0
    );
    const avgCurrentRent = totalUnitsFromRows > 0 ? weightedRent / totalUnitsFromRows : 0;
    const avgUnitSf = propertySummary?.avg_unit_sf || (unitCount > 0 ? totalSF / unitCount : 0);

    return {
      totalUnits: unitCount || totalUnitsFromRows,
      avgUnitSf,
      avgCurrentRent
    };
  }, [rentalRows, propertySummary?.avg_unit_sf, totalSF, unitCount]);

  const {
    state: valueAddState,
    calculated: valueAddCalculated,
    updateField: updateValueAddField,
    isLoading: isValueAddLoading,
    isSaving: isValueAddSaving,
    error: valueAddError
  } = useValueAddAssumptions(project.project_id, unitMixStats);

  const handleValueAddToggle = useCallback(async () => {
    const nextValue = !valueAddEnabled;
    await toggleValueAdd();
    updateValueAddField('isEnabled', nextValue);
  }, [toggleValueAdd, updateValueAddField, valueAddEnabled]);

  useEffect(() => {
    if (!isValueAddLoading && valueAddState.isEnabled !== valueAddEnabled) {
      updateValueAddField('isEnabled', valueAddEnabled);
    }
  }, [isValueAddLoading, updateValueAddField, valueAddEnabled, valueAddState.isEnabled]);

  const getValueAddErrors = useCallback((nextState: typeof valueAddState) => {
    const errors: Partial<Record<keyof typeof valueAddState, string>> = {};
    if (nextState.renoCost <= 0) errors.renoCost = 'Must be greater than 0.';
    if (nextState.relocationIncentive < 0) errors.relocationIncentive = 'Must be 0 or greater.';
    if (!nextState.renovateAll) {
      if (nextState.unitsToRenovate === null || nextState.unitsToRenovate <= 0) {
        errors.unitsToRenovate = 'Enter a positive unit count.';
      } else if (unitMixStats.totalUnits > 0 && nextState.unitsToRenovate > unitMixStats.totalUnits) {
        errors.unitsToRenovate = `Cannot exceed total units (${unitMixStats.totalUnits}).`;
      }
    }
    if (nextState.renoStartsPerMonth <= 0) errors.renoStartsPerMonth = 'Must be greater than 0.';
    if (nextState.renoStartMonth < 1) errors.renoStartMonth = 'Must be 1 or greater.';
    if (nextState.monthsToComplete < 1) errors.monthsToComplete = 'Must be 1 or greater.';
    if (nextState.rentPremiumPct < 0 || nextState.rentPremiumPct > 1) {
      errors.rentPremiumPct = 'Must be between 0 and 1.';
    }
    if (nextState.reletMonths < 0) errors.reletMonths = 'Must be 0 or greater.';
    return errors;
  }, [unitMixStats.totalUnits]);

  const valueAddErrors = useMemo(() => getValueAddErrors(valueAddState), [getValueAddErrors, valueAddState]);

  const handleValueAddUpdate = useCallback(<K extends keyof typeof valueAddState>(
    key: K,
    value: (typeof valueAddState)[K]
  ) => {
    const nextState = { ...valueAddState, [key]: value };
    const nextErrors = getValueAddErrors(nextState);
    updateValueAddField(key, value, { skipSave: Object.keys(nextErrors).length > 0 });
  }, [getValueAddErrors, updateValueAddField, valueAddState]);

  // Auto-refresh when Landscaper updates operating expenses
  const watchedTables = useMemo(() => ['operating_expenses', 'units', 'unit_types', 'leases'], []);
  useLandscaperRefresh(
    project.project_id,
    watchedTables,
    reload
  );

  // Handle input updates - route to correct section
  const handleUpdateRow = (section: 'rental_income' | 'vacancy_deductions' | 'other_income' | 'operating_expenses') =>
    (lineItemKey: string, field: string, value: number | null) => {
      updateInput(section, lineItemKey, field, value);
    };

  // Handle expand/collapse
  const handleToggleExpand = (section: 'other_income' | 'operating_expenses') =>
    (lineItemKey: string) => {
      toggleExpand(section, lineItemKey);
    };

  // Handle expense category change (drag and drop)
  const handleCategoryChange = async (opexId: number, newCategory: string, label: string) => {
    try {
      const response = await fetch('/api/opex/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opex_id: opexId,
          new_category: newCategory,
          label: label
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update category');
      }

      // Reload data to reflect the change
      reload();
    } catch (error) {
      console.error('Failed to categorize expense:', error);
      throw error;
    }
  };

  // Handle adding a new expense
  const handleAddExpense = async (expense: {
    expense_category: string;
    parent_category: string;
    unit_amount: number | null;
  }) => {
    try {
      const response = await fetch('/api/opex/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.project_id,
          expense_category: expense.expense_category,
          parent_category: expense.parent_category,
          unit_amount: expense.unit_amount,
          annual_amount: expense.unit_amount && unitCount > 0 ? expense.unit_amount * unitCount : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add expense');
      }

      // Reload data to reflect the change
      reload();
    } catch (error) {
      console.error('Failed to add expense:', error);
      throw error;
    }
  };

  // Handle deleting expenses
  const handleDeleteExpenses = async (opexIds: number[]) => {
    try {
      const response = await fetch('/api/opex/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: opexIds })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete expenses');
      }

      // Reload data to reflect the change
      reload();
    } catch (error) {
      console.error('Failed to delete expenses:', error);
      throw error;
    }
  };

  // Handle provenance toggle (lock/unlock or revert)
  const handleProvenanceToggle = useCallback((lineItemKey: string, currentSource: string) => {
    // Special handling for physical vacancy
    if (lineItemKey === 'physical_vacancy') {
      if (currentSource === 'ingestion') {
        // Lock clicked → set vacancy override to current calculated value (makes it editable)
        const currentRate = vacancyRows.find(r => r.line_item_key === 'physical_vacancy')?.as_is?.rate;
        fetch(`/api/projects/${project.project_id}/operations/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vacancy_override_pct: currentRate ?? 0.05 })
        }).then(() => reload());
      } else if (currentSource === 'user_modified') {
        // Revert to rent-roll-calculated value
        if (window.confirm('Revert physical vacancy to the rent-roll-calculated value?')) {
          fetch(`/api/projects/${project.project_id}/operations/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vacancy_override_pct: null })
          }).then(() => reload());
        }
      }
      return;
    }

    // OpEx row provenance toggle
    const findOpexId = (rows: LineItemRow[]): number | undefined => {
      for (const row of rows) {
        if (row.line_item_key === lineItemKey) return row.opex_id;
        if (row.children) {
          const found = findOpexId(row.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    if (currentSource === 'ingestion') {
      // Lock clicked → make editable (source → user_modified)
      const opexId = findOpexId(opexRows);
      if (!opexId) return;

      fetch(`/api/projects/${project.project_id}/opex/${opexId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'user_modified' })
      }).then(() => reload());
    } else if (currentSource === 'user_modified') {
      // Input icon on user_modified → revert to extracted value
      const opexId = findOpexId(opexRows);
      if (!opexId) return;

      if (window.confirm('Revert this value to the original extracted amount?')) {
        fetch(`/api/projects/${project.project_id}/opex/${opexId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'ingestion', revert: true })
        }).then(() => reload());
      }
    }
    // source === 'user' → no action (user-entered, nothing to revert to)
  }, [opexRows, vacancyRows, project.project_id, reload]);

  // Handle inline item name change (double-click edit)
  const handleItemNameChange = async (opexId: number, categoryId: number, categoryName: string) => {
    try {
      const response = await fetch(`/api/projects/${project.project_id}/opex/${opexId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: categoryId,
          expense_category: categoryName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update item name');
      }

      // Reload data to reflect the change
      reload();
    } catch (error) {
      console.error('Failed to update item name:', error);
      throw error;
    }
  };

  // Land projects use OpExHierarchy
  if (isLand) {
    return (
      <div className="py-6">
        <OpExHierarchy projectId={project.project_id} />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 'var(--component-gap)', minHeight: '400px' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: 'var(--cui-primary)' }}></div>
          <p style={{ color: 'var(--cui-secondary-color)' }}>Loading operations data...</p>
        </div>
      </div>
    );
  }

  // Land development projects use the Budget tab, not Operations
  if (isLand) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="max-w-2xl mx-auto text-center p-8">
          <CCard>
            <CCardBody>
              <div className="mb-6">
                <svg className="w-24 h-24 mx-auto" style={{ color: 'var(--cui-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-3">
                Operations Not Available
              </h2>
              <p className="mb-6" style={{ color: 'var(--cui-secondary-color)' }}>
                Land development projects use the Budget tab for cost planning and the Feasibility tab for financial analysis.
              </p>
            </CCardBody>
          </CCard>
        </div>
      </div>
    );
  }

  // Empty state for multifamily with no data
  if (!data || (!rentalIncome?.rows?.length && !operatingExpenses?.rows?.length)) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 'var(--component-gap)', minHeight: '400px' }}>
        <div className="shadow-lg p-12 text-center max-w-2xl" style={{ backgroundColor: 'var(--cui-card-bg)', border: '1px solid var(--cui-border-color)' }}>
          <div className="mb-6">
            <svg className="w-24 h-24 mx-auto" style={{ color: 'var(--cui-secondary-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-3" style={{ color: 'var(--cui-body-color)' }}>
            No Operating Data Yet
          </h2>
          <p className="mb-6" style={{ color: 'var(--cui-secondary-color)' }}>
            This multifamily project doesn't have any operating data configured yet.
          </p>
          <div
            className="p-4 rounded text-left"
            style={{
              backgroundColor: 'var(--cui-info-bg)',
              borderLeft: '4px solid var(--cui-info)'
            }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--cui-info)' }}>
              <strong>To add operating data:</strong>
            </p>
            <ul
              className="text-sm ml-4"
              style={{
                color: 'var(--cui-body-color)',
                listStyleType: 'disc'
              }}
            >
              <li>Upload rent rolls and operating statements via the Documents tab</li>
              <li>Use Landscaper to extract income and expense data</li>
              <li>Manually input values in the Budget tab</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Extract row data for sections
  const vacancyRows: LineItemRow[] = vacancyDeductions?.rows || [];
  const otherRows: LineItemRow[] = otherIncome?.rows || [];
  const opexRows: LineItemRow[] = operatingExpenses?.rows || [];

  // Calculate GPR for vacancy calculations
  const grossPotentialRent = totals?.gross_potential_rent || 0;

  return (
    <div className="d-flex gap-3 align-items-start">
    <CCard style={{ flexShrink: 0 }}>
      {/* Header */}
      <OperationsHeader
        projectName={project.project_name}
        unitCount={unitCount}
        totalSF={totalSF}
        isSaving={isSaving}
        isDirty={isDirty}
        onSave={saveAll}
      >
        <div ref={columnChooserRef} style={{ position: 'relative' }}>
          <button
            className="ops-pill"
            onClick={() => setShowColumnChooser(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Columns
          </button>
          {showColumnChooser && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.25rem',
              background: 'var(--cui-card-bg)',
              border: '1px solid var(--cui-border-color)',
              borderRadius: '0.375rem',
              padding: '0.5rem',
              zIndex: 20,
              minWidth: 180,
              fontSize: '0.8125rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.35rem', cursor: 'pointer', color: 'var(--cui-body-color)' }}>
                <input type="checkbox" checked={!hideLossToLease} onChange={() => setHideLossToLease(prev => !prev)} />
                Loss to Lease
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.35rem', cursor: 'pointer', color: showPostRehab ? 'var(--cui-body-color)' : 'var(--cui-secondary-color)' }}>
                <input type="checkbox" checked={!hidePostReno} onChange={() => { if (showPostRehab) setHidePostReno(prev => !prev); }} disabled={!showPostRehab} />
                Post-Reno Rent / Annual
              </label>
            </div>
          )}
        </div>
      </OperationsHeader>
      <CCardBody className="p-0">
        <div className="ops-container">
      {valueAddError && (
        <div
          style={{
            backgroundColor: 'var(--cui-warning-bg)',
            border: '1px solid var(--cui-warning)',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <svg style={{ width: 16, height: 16, flexShrink: 0, color: 'var(--cui-warning)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span style={{ color: 'var(--cui-warning)', fontSize: '0.875rem' }}>{valueAddError}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          style={{
            backgroundColor: 'var(--cui-danger-bg)',
            border: '1px solid var(--cui-danger)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <svg style={{ width: 20, height: 20, flexShrink: 0, color: 'var(--cui-danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span style={{ color: 'var(--cui-danger)' }}>{error}</span>
        </div>
      )}

      {/* Unified Operating Statement */}
      <OperatingStatement
        rentalRows={rentalRows}
        vacancyRows={vacancyRows}
        otherIncomeRows={otherRows}
        opexRows={opexRows}
        unitCount={unitCount}
        totalSF={totalSF}
        grossPotentialRent={grossPotentialRent}
        effectiveGrossIncome={totals?.effective_gross_income || 0}
        asIsNOI={totals?.as_is_noi || 0}
        postRenoNOI={totals?.post_reno_noi || 0}
        valueAddEnabled={showPostRehab}
        hasDetailedRentRoll={data?.has_detailed_rent_roll || false}
        projectId={project.project_id}
        onUpdateVacancy={handleUpdateRow('vacancy_deductions')}
        onUpdateOtherIncome={handleUpdateRow('other_income')}
        onUpdateOpex={handleUpdateRow('operating_expenses')}
        onToggleExpand={handleToggleExpand('operating_expenses')}
        onCategoryChange={handleCategoryChange}
        onAddExpense={handleAddExpense}
        onDeleteExpenses={handleDeleteExpenses}
        onItemNameChange={handleItemNameChange}
        onProvenanceToggle={handleProvenanceToggle}
        hideLossToLease={hideLossToLease}
        hidePostReno={hidePostReno}
      />

      {/* Sticky Summary Bar */}
      <SummaryBar
        asIsNOI={totals?.as_is_noi || 0}
        postRenoNOI={totals?.post_reno_noi || 0}
        noiUplift={totals?.noi_uplift || 0}
        noiUpliftPercent={totals?.noi_uplift_percent || 0}
        valueAddEnabled={showPostRehab}
      />
        </div>
      </CCardBody>
    </CCard>

      {/* Right: Treemap Charts — fills remaining space */}
      <div style={{ flex: '1 1 0', minWidth: '280px' }} className="d-flex flex-column gap-3">
        <IncomeTreemap
          rentalRows={rentalRows}
          grossPotentialRent={grossPotentialRent}
        />
        <ExpenseTreemap
          opexRows={opexRows}
          totalOperatingExpenses={totals?.total_operating_expenses || 0}
        />
      </div>
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders
export default memo(OperationsTab);
