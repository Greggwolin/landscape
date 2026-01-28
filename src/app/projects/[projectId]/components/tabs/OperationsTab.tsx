'use client';

import React, { memo, useMemo, useEffect, useCallback } from 'react';
import { CCard, CCardBody } from '@coreui/react';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';
import OpExHierarchy from '@/app/components/OpExHierarchy';

// New Operations components
import {
  OperatingStatement,
  SummaryBar,
  OperationsHeader,
  LineItemRow
} from '@/components/operations';
import '@/styles/operations-tab.css';
import { useOperationsData } from '@/hooks/useOperationsData';
import { useLandscaperRefresh } from '@/hooks/useLandscaperRefresh';
import { useValueAddAssumptions } from '@/hooks/useValueAddAssumptions';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
}

interface OperationsTabProps {
  project: Project;
  mode?: ComplexityTier;
  onModeChange?: (mode: ComplexityTier) => void;
}

function OperationsTab({ project, mode: propMode, onModeChange }: OperationsTabProps) {
  // Check project type
  const isMultifamily = project.project_type_code === 'MF';
  const isLand = project.project_type_code === 'LAND';

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
  useLandscaperRefresh(
    project.project_id,
    ['operating_expenses', 'units', 'unit_types', 'leases'],
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

  // Unsupported project types
  if (!isMultifamily) {
    const projectTypeLabels: Record<string, string> = {
      'OFF': 'Office',
      'RET': 'Retail',
      'IND': 'Industrial',
      'MXD': 'Mixed-Use',
      'LAND': 'Land Development',
      'HOT': 'Hospitality'
    };

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
                {projectTypeLabels[project.project_type_code || ''] || 'Commercial'} Operations Tab Coming Soon
              </h2>
              <p className="mb-2" style={{ color: 'var(--cui-body-color)' }}>
                This project is a <strong>{projectTypeLabels[project.project_type_code || ''] || project.project_type_code}</strong> asset type.
              </p>
              <p className="mb-6" style={{ color: 'var(--cui-secondary-color)' }}>
                The Operations tab is currently designed for multifamily projects only.
                A dedicated template for {projectTypeLabels[project.project_type_code || '']?.toLowerCase() || 'this asset type'} properties is under development.
              </p>
              <div className="p-4 rounded" style={{ backgroundColor: 'var(--cui-info-bg)', borderLeft: '4px solid var(--cui-info)' }}>
                <p className="text-sm mb-2" style={{ color: 'var(--cui-info)' }}>
                  <strong>For now, use these alternatives:</strong>
                </p>
                <ul className="text-sm text-left ml-4" style={{ color: 'var(--cui-body-color)', listStyleType: 'disc' }}>
                  <li>Budget tab for operating expense planning</li>
                  <li>Financial Analysis for cash flow modeling</li>
                  <li>Assumptions & Factors for expense inputs</li>
                </ul>
              </div>
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
    <CCard>
      {/* Header */}
      <OperationsHeader
        projectName={project.project_name}
        unitCount={unitCount}
        totalSF={totalSF}
        isSaving={isSaving}
        isDirty={isDirty}
        valueAddEnabled={valueAddEnabled}
        onValueAddToggle={handleValueAddToggle}
        onSave={saveAll}
      />
      <CCardBody className="p-0">
        <div className="ops-container">
      {valueAddError && (
        <div
          className="rounded-lg px-4 py-2 border flex items-center gap-2"
          style={{
            backgroundColor: 'var(--cui-warning-bg)',
            borderColor: 'var(--cui-warning)'
          }}
        >
          <svg className="w-4 h-4" style={{ color: 'var(--cui-warning)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm" style={{ color: 'var(--cui-warning)' }}>{valueAddError}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          className="rounded-lg px-6 py-4 border flex items-center gap-3"
          style={{
            backgroundColor: 'var(--cui-danger-bg)',
            borderColor: 'var(--cui-danger)'
          }}
        >
          <svg className="w-5 h-5" style={{ color: 'var(--cui-danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        valueAddEnabled={valueAddEnabled}
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
      />

      {/* Sticky Summary Bar */}
      <SummaryBar
        asIsNOI={totals?.as_is_noi || 0}
        postRenoNOI={totals?.post_reno_noi || 0}
        noiUplift={totals?.noi_uplift || 0}
        noiUpliftPercent={totals?.noi_uplift_percent || 0}
        valueAddEnabled={valueAddEnabled}
      />
        </div>
      </CCardBody>
    </CCard>
  );
}

// Export memoized version to prevent unnecessary re-renders
export default memo(OperationsTab);
