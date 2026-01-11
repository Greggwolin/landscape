'use client';

import React, { memo } from 'react';
import { CCard, CCardBody } from '@coreui/react';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';
import OpExHierarchy from '@/app/components/OpExHierarchy';

// New Operations components
import {
  RentalIncomeSection,
  VacancyDeductionsSection,
  OtherIncomeSection,
  OperatingExpensesSection,
  EGISubtotalBar,
  NOITotalBar,
  SummaryBar,
  OperationsHeader,
  LineItemRow
} from '@/components/operations';
import '@/styles/operations-tab.css';
import { useOperationsData } from '@/hooks/useOperationsData';

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
    saveAll
  } = useOperationsData(project.project_id);

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
        <div className="rounded-xl shadow-lg p-12 text-center max-w-2xl" style={{ backgroundColor: 'var(--cui-card-bg)', border: '1px solid var(--cui-border-color)' }}>
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
  const rentalRows: LineItemRow[] = rentalIncome?.rows || [];
  const vacancyRows: LineItemRow[] = vacancyDeductions?.rows || [];
  const otherRows: LineItemRow[] = otherIncome?.rows || [];
  const opexRows: LineItemRow[] = operatingExpenses?.rows || [];

  // Calculate GPR for vacancy calculations
  const grossPotentialRent = totals?.gross_potential_rent || 0;
  const unitCount = propertySummary?.unit_count || 0;
  const totalSF = propertySummary?.total_sf || 0;

  return (
    <div className="ops-container">
      {/* Header with Value-Add toggle */}
      <OperationsHeader
        projectName={project.project_name}
        unitCount={unitCount}
        totalSF={totalSF}
        valueAddEnabled={valueAddEnabled}
        onToggleValueAdd={toggleValueAdd}
        isSaving={isSaving}
        isDirty={isDirty}
        onSave={saveAll}
      />

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

      {/* Section 1: Rental Income */}
      {rentalRows.length > 0 && (
        <RentalIncomeSection
          rows={rentalRows}
          unitCount={unitCount}
          availableScenarios={availableScenarios}
          preferredScenario={preferredScenario}
          valueAddEnabled={valueAddEnabled}
          onUpdateRow={handleUpdateRow('rental_income')}
        />
      )}

      {/* Section 2: Vacancy & Deductions */}
      {vacancyRows.length > 0 && (
        <VacancyDeductionsSection
          rows={vacancyRows}
          grossPotentialRent={grossPotentialRent}
          availableScenarios={availableScenarios}
          preferredScenario={preferredScenario}
          valueAddEnabled={valueAddEnabled}
          onUpdateRow={handleUpdateRow('vacancy_deductions')}
        />
      )}

      {/* Section 3: Other Income */}
      {otherRows.length > 0 && (
        <OtherIncomeSection
          rows={otherRows}
          unitCount={unitCount}
          availableScenarios={availableScenarios}
          preferredScenario={preferredScenario}
          valueAddEnabled={valueAddEnabled}
          onUpdateRow={handleUpdateRow('other_income')}
          onToggleExpand={handleToggleExpand('other_income')}
        />
      )}

      {/* EGI Subtotal */}
      <EGISubtotalBar
        asIsEGI={totals?.effective_gross_income || 0}
        postRenoEGI={totals?.effective_gross_income || 0} // TODO: Calculate post-reno EGI
        valueAddEnabled={valueAddEnabled}
        availableScenarios={availableScenarios}
      />

      {/* Section 4: Operating Expenses */}
      {opexRows.length > 0 && (
        <OperatingExpensesSection
          rows={opexRows}
          unitCount={unitCount}
          totalSF={totalSF}
          availableScenarios={availableScenarios}
          preferredScenario={preferredScenario}
          valueAddEnabled={valueAddEnabled}
          onUpdateRow={handleUpdateRow('operating_expenses')}
          onToggleExpand={handleToggleExpand('operating_expenses')}
        />
      )}

      {/* NOI Total */}
      <NOITotalBar
        asIsNOI={totals?.as_is_noi || 0}
        postRenoNOI={totals?.post_reno_noi || 0}
        valueAddEnabled={valueAddEnabled}
        availableScenarios={availableScenarios}
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
  );
}

// Export memoized version to prevent unnecessary re-renders
export default memo(OperationsTab);
