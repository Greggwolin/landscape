'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';
import { NestedExpenseTable } from '@/app/prototypes/multifam/rent-roll-inputs/components/NestedExpenseTable';
import { BenchmarkPanel } from '@/app/prototypes/multifam/rent-roll-inputs/components/BenchmarkPanel';
import { ConfigureColumnsModal } from './ConfigureColumnsModal';
import { buildHierarchicalExpenses, ExpenseRow } from '@/config/opex/hierarchical-structure';
import { multifamilyOpExFields } from '@/config/opex/multifamily-fields';

interface Project {
  project_id: number;
  project_name: string;
  property_type_code?: string;
}

interface OperationsTabProps {
  project: Project;
  mode?: ComplexityTier;
  onModeChange?: (mode: ComplexityTier) => void;
}

interface ExpenseData {
  expense_type: string;
  expense_category: string;
  label: string;
  annual_amount: number;
  per_unit: number;
  per_sf: number;
  escalation_rate: number;
  is_recoverable?: boolean;
  recovery_rate?: number;
}

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  minTier: ComplexityTier;
  description?: string;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'per_unit', label: 'Per Unit', visible: true, minTier: 'basic', description: 'Annual amount divided by unit count' },
  { id: 'per_sf', label: 'Per SF', visible: true, minTier: 'standard', description: 'Annual amount divided by total square footage' },
  { id: 'escalation_rate', label: 'Escalation', visible: true, minTier: 'standard', description: 'Annual inflation adjustment percentage' },
  { id: 'is_recoverable', label: 'Recoverable', visible: true, minTier: 'advanced', description: 'Whether expense can be recovered from tenants' },
  { id: 'recovery_rate', label: 'Recovery %', visible: true, minTier: 'advanced', description: 'Percentage of expense recovered from tenants' }
];

export default function OperationsTab({ project, mode: propMode, onModeChange }: OperationsTabProps) {
  // Use prop mode if provided, otherwise use local state
  const [localMode, setLocalMode] = useState<ComplexityTier>('standard');
  const mode = propMode || localMode;
  const setMode = onModeChange || setLocalMode;

  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [hierarchicalRows, setHierarchicalRows] = useState<ExpenseRow[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [propertyData, setPropertyData] = useState<{ unitCount: number; totalSF: number } | null>(null);
  const [savedValuesHistory, setSavedValuesHistory] = useState<{
    basic: Record<string, ExpenseData> | null;
    standard: Record<string, ExpenseData> | null;
    advanced: Record<string, ExpenseData> | null;
  }>({ basic: null, standard: null, advanced: null });
  const [showRestoreNotice, setShowRestoreNotice] = useState<string | null>(null);

  // Load property data on mount
  useEffect(() => {
    loadPropertyData();
  }, [project.project_id]);

  // Load expenses when property data is available
  useEffect(() => {
    if (propertyData) {
      loadExpenses();
    }
  }, [project.project_id, propertyData]);

  const loadPropertyData = async () => {
    try {
      const response = await fetch(`/api/multifamily/units?project_id=${project.project_id}`);
      if (response.ok) {
        const data = await response.json();
        const unitCount = data.count || 0;
        const totalSF = data.results?.reduce((sum: number, unit: any) => sum + (parseFloat(unit.square_feet) || 0), 0) || 0;

        console.log('[OperationsTab] Property data:', { unitCount, totalSF });
        setPropertyData({ unitCount, totalSF });
      }
    } catch (error) {
      console.error('Error loading property data:', error);
    }
  };

  // Handle mode changes with value preservation
  const previousMode = useRef<ComplexityTier>(mode);
  useEffect(() => {
    if (previousMode.current !== mode && expenses.length > 0) {
      const oldMode = previousMode.current;
      const newMode = mode;

      // Check if we're going backward (higher granularity to lower)
      const modeOrder: Record<ComplexityTier, number> = { basic: 1, standard: 2, advanced: 3 };
      const isGoingBackward = modeOrder[newMode] < modeOrder[oldMode];

      if (isGoingBackward) {
        // Restore from history if available
        const savedValues = savedValuesHistory[newMode];
        if (savedValues) {
          setExpenses(Object.values(savedValues));
          setShowRestoreNotice(newMode);
          setTimeout(() => setShowRestoreNotice(null), 5000);
        }
      } else {
        // Going forward - save current values
        const expensesMap = expenses.reduce((acc, exp) => {
          acc[exp.expense_type] = exp;
          return acc;
        }, {} as Record<string, ExpenseData>);

        setSavedValuesHistory(prev => ({
          ...prev,
          [oldMode]: expensesMap
        }));
      }

      previousMode.current = mode;
    }
  }, [mode, expenses.length]);

  // Rebuild hierarchical structure when expenses or mode changes
  useEffect(() => {
    console.log('[OperationsTab] Building hierarchy, expenses count:', expenses.length, 'mode:', mode);
    if (expenses.length > 0) {
      const rows = buildHierarchicalExpenses(expenses, mode);
      console.log('[OperationsTab] Built hierarchical rows:', rows.length, rows);
      setHierarchicalRows(rows);
    } else {
      console.log('[OperationsTab] No expenses to build hierarchy from');
      setHierarchicalRows([]);
    }
  }, [expenses, mode]);

  const loadExpenses = async () => {
    try {
      setIsLoading(true);

      // Load from Chart of Accounts hierarchy API
      const response = await fetch(`/api/projects/${project.project_id}/operating-expenses/hierarchy`);

      if (response.ok) {
        const data = await response.json();
        console.log('[OperationsTab] Chart of Accounts API response:', data);

        if (data.accounts && data.accounts.length > 0) {
          console.log('[OperationsTab] Using Chart of Accounts data, accounts count:', data.accounts.length);

          // Map Chart of Accounts to expected expense type keys and categories
          const accountToExpenseTypeMap: Record<string, { expenseType: string; category: string }> = {
            // Taxes & Insurance
            '5100': { expenseType: 'property_taxes', category: 'taxes' },
            '5110': { expenseType: 'property_taxes', category: 'taxes' },
            '5111': { expenseType: 'property_taxes', category: 'taxes' },
            '5112': { expenseType: 'property_taxes', category: 'taxes' },
            '5120': { expenseType: 'insurance', category: 'insurance' },

            // Utilities
            '5200': { expenseType: 'utilities_combined', category: 'utilities' },
            '5210': { expenseType: 'water_sewer', category: 'utilities' },
            '5220': { expenseType: 'gas_electric', category: 'utilities' },

            // Payroll
            '5300': { expenseType: 'property_management', category: 'management' },
            '5310': { expenseType: 'payroll_onsite', category: 'management' },
            '5320': { expenseType: 'payroll_offsite', category: 'management' },

            // Repairs & Maintenance
            '5400': { expenseType: 'repairs_maintenance', category: 'maintenance' },
            '5410': { expenseType: 'unit_turnover', category: 'maintenance' },
            '5420': { expenseType: 'general_repairs', category: 'maintenance' },

            // General & Administrative
            '5500': { expenseType: 'other_operating', category: 'other' },
            '5510': { expenseType: 'landscaping', category: 'other' },
            '5520': { expenseType: 'trash_removal', category: 'other' },
            '5530': { expenseType: 'pest_control', category: 'other' },
            '5540': { expenseType: 'pool_amenity', category: 'other' },
            '5550': { expenseType: 'administrative', category: 'other' }
          };

          // Flatten the hierarchical accounts into expense format
          const flattenAccounts = (accounts: any[]): ExpenseData[] => {
            const result: ExpenseData[] = [];

            accounts.forEach((account) => {
              const mapping = accountToExpenseTypeMap[account.account_number];

              // Add this account if we have a mapping for it
              if (mapping) {
                const annualAmount = parseFloat(account.calculated_total) || 0;
                result.push({
                  expense_type: mapping.expenseType,
                  expense_category: mapping.category,
                  label: account.account_name,
                  annual_amount: annualAmount,
                  per_unit: propertyData?.unitCount ? annualAmount / propertyData.unitCount : 0,
                  per_sf: propertyData?.totalSF ? annualAmount / propertyData.totalSF : 0,
                  escalation_rate: 0.03, // Default 3%
                  is_recoverable: false,
                  recovery_rate: 0
                });
              }

              // Recursively process children
              if (account.children && account.children.length > 0) {
                result.push(...flattenAccounts(account.children));
              }
            });

            return result;
          };

          const mappedExpenses = flattenAccounts(data.accounts);
          console.log('[OperationsTab] Mapped expenses from Chart of Accounts:', mappedExpenses);
          setExpenses(mappedExpenses);
        } else {
          console.log('[OperationsTab] API returned empty, using mock data');
          const mockData = generateMockExpenses();
          console.log('[OperationsTab] Mock data:', mockData);
          setExpenses(mockData);
        }
      } else {
        console.log('[OperationsTab] API failed, using mock data');
        setExpenses(generateMockExpenses());
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
      setExpenses(generateMockExpenses());
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockExpenses = (): ExpenseData[] => {
    return [
      { expense_type: 'property_taxes', expense_category: 'taxes', label: 'Property Taxes', annual_amount: 195000, per_unit: 1625, per_sf: 2.79, escalation_rate: 0.02, is_recoverable: false, recovery_rate: 0 },
      { expense_type: 'insurance', expense_category: 'insurance', label: 'Insurance', annual_amount: 16800, per_unit: 140, per_sf: 0.24, escalation_rate: 0.035, is_recoverable: false, recovery_rate: 0 },
      { expense_type: 'utilities_combined', expense_category: 'utilities', label: 'Utilities', annual_amount: 41720, per_unit: 348, per_sf: 0.60, escalation_rate: 0.04, is_recoverable: true, recovery_rate: 0.6 },
      { expense_type: 'repairs_maintenance', expense_category: 'maintenance', label: 'Repairs & Maintenance', annual_amount: 51560, per_unit: 430, per_sf: 0.74, escalation_rate: 0.03, is_recoverable: false, recovery_rate: 0 },
      { expense_type: 'property_management', expense_category: 'management', label: 'Property Management', annual_amount: 31200, per_unit: 260, per_sf: 0.45, escalation_rate: 0, is_recoverable: false, recovery_rate: 0 },
      { expense_type: 'other_operating', expense_category: 'other', label: 'Other Operating', annual_amount: 58120, per_unit: 484, per_sf: 0.83, escalation_rate: 0.03, is_recoverable: false, recovery_rate: 0 }
    ];
  };

  // Calculate totals
  const totals = useMemo(() => {
    return expenses.reduce(
      (acc, exp) => ({
        annual: acc.annual + exp.annual_amount,
        perUnit: acc.perUnit + exp.per_unit,
        perSF: acc.perSF + exp.per_sf
      }),
      { annual: 0, perUnit: 0, perSF: 0 }
    );
  }, [expenses]);

  // Benchmark alerts
  const benchmarkAlerts = useMemo(() => {
    const totalPerUnit = Math.round(totals.perUnit);
    const marketMedian = 8200;

    return [
      {
        category: 'Total Operating Expenses',
        variance: ((totalPerUnit - marketMedian) / marketMedian) * 100,
        userValue: totalPerUnit,
        marketMedian: marketMedian,
        message: `${totalPerUnit > marketMedian ? 'above' : 'below'} market median`,
        severity: totalPerUnit > marketMedian * 1.1 ? 'warning' as const : 'success' as const,
        recommendation: totalPerUnit > marketMedian * 1.1 ? 'Review expenses for optimization opportunities' : undefined
      }
    ];
  }, [totals]);

  const handleToggleExpand = (rowId: string) => {
    const updateExpanded = (rows: ExpenseRow[]): ExpenseRow[] => {
      return rows.map(row => {
        if (row.id === rowId) {
          return { ...row, isExpanded: !row.isExpanded };
        }
        if (row.children && row.children.length > 0) {
          return { ...row, children: updateExpanded(row.children) };
        }
        return row;
      });
    };

    setHierarchicalRows(updateExpanded(hierarchicalRows));
  };

  const handleUpdateExpense = (expenseType: string, field: string, value: number | boolean) => {
    setExpenses(prev => prev.map(exp => {
      if (exp.expense_type === expenseType) {
        return { ...exp, [field]: value };
      }
      return exp;
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const expensesArray = expenses.map(exp => ({
        expense_category: exp.expense_category,
        expense_type: exp.expense_type,
        annual_amount: exp.annual_amount,
        amount_per_sf: exp.per_sf,
        escalation_rate: exp.escalation_rate,
        is_recoverable: exp.is_recoverable,
        recovery_rate: exp.recovery_rate,
        escalation_type: 'FIXED_PERCENT',
        start_period: 1,
        payment_frequency: 'MONTHLY'
      }));

      const response = await fetch(`/api/projects/${project.project_id}/opex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses: expensesArray })
      });

      if (response.ok) {
        setHasUnsavedChanges(false);
        await loadExpenses();
      }
    } catch (error) {
      console.error('Error saving expenses:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleColumn = (columnId: string) => {
    setColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const visibleColumnIds = useMemo(() => {
    return columns.filter(col => col.visible).map(col => col.id);
  }, [columns]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--cui-primary)' }}></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Restore Notice Banner */}
      {showRestoreNotice && (
        <div
          className="rounded-lg px-6 py-4 border flex items-center justify-between"
          style={{
            backgroundColor: 'var(--cui-info-bg)',
            borderColor: 'var(--cui-info)'
          }}
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" style={{ color: 'var(--cui-info)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-semibold" style={{ color: 'var(--cui-info)' }}>
                Values Restored
              </div>
              <div className="text-sm" style={{ color: 'var(--cui-body-color)' }}>
                Previous {showRestoreNotice} mode values have been restored
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowRestoreNotice(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div
          className="rounded-lg px-6 py-4 text-center"
          style={{
            backgroundColor: 'var(--cui-primary-bg)',
            borderRadius: '8px'
          }}
        >
          <div
            className="text-xs uppercase font-medium mb-1"
            style={{ color: 'var(--cui-primary)' }}
          >
            Total Operating Expenses
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--cui-primary)' }}>
            ${totals.annual.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs" style={{ color: 'var(--cui-body-color)' }}>
            per year
          </div>
        </div>

        <div
          className="rounded-lg px-6 py-4 text-center"
          style={{
            backgroundColor: 'var(--cui-success-bg)',
            borderRadius: '8px'
          }}
        >
          <div
            className="text-xs uppercase font-medium mb-1"
            style={{ color: 'var(--cui-success)' }}
          >
            Per Unit
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--cui-success)' }}>
            ${Math.round(totals.perUnit).toLocaleString('en-US')}
          </div>
          <div className="text-xs" style={{ color: 'var(--cui-body-color)' }}>
            annual
          </div>
        </div>

        <div
          className="rounded-lg px-6 py-4 text-center"
          style={{
            backgroundColor: 'var(--cui-info-bg)',
            borderRadius: '8px'
          }}
        >
          <div
            className="text-xs uppercase font-medium mb-1"
            style={{ color: 'var(--cui-info)' }}
          >
            Per SF
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--cui-info)' }}>
            ${totals.perSF.toFixed(2)}
          </div>
          <div className="text-xs" style={{ color: 'var(--cui-body-color)' }}>
            annual
          </div>
        </div>

        <div
          className="rounded-lg px-6 py-4 text-center"
          style={{
            backgroundColor: 'var(--cui-warning-bg)',
            borderRadius: '8px'
          }}
        >
          <div
            className="text-xs uppercase font-medium mb-1"
            style={{ color: 'var(--cui-warning)' }}
          >
            Expense Ratio
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--cui-warning)' }}>
            --
          </div>
          <div className="text-xs" style={{ color: 'var(--cui-body-color)' }}>
            of EGI (TBD)
          </div>
        </div>
      </div>

      {/* Nested Expense Table */}
      {hierarchicalRows.length > 0 ? (
        <NestedExpenseTable
          mode={mode}
          rows={hierarchicalRows}
          onToggleExpand={handleToggleExpand}
          onUpdateExpense={handleUpdateExpense}
          selectedCategories={selectedCategories}
          onCategoryFilterChange={setSelectedCategories}
          onConfigureColumns={() => setShowColumnConfig(true)}
          visibleColumns={visibleColumnIds}
        />
      ) : (
        <div
          className="rounded border p-8 text-center"
          style={{
            backgroundColor: 'var(--cui-tertiary-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          <div style={{ color: 'var(--cui-secondary-color)' }}>
            No expense data available
          </div>
        </div>
      )}

      {/* Benchmark Panel */}
      <BenchmarkPanel
        mode={mode}
        totalPerUnit={Math.round(totals.perUnit)}
        marketMedian={8200}
        alerts={benchmarkAlerts}
      />

      {/* Save Button */}
      {hasUnsavedChanges && (
        <div
          className="fixed bottom-4 right-4 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 border"
          style={{
            backgroundColor: 'var(--cui-warning-bg)',
            borderColor: 'var(--cui-warning)'
          }}
        >
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--cui-warning-text)' }}
          >
            You have unsaved changes
          </span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded transition-colors disabled:opacity-50 text-sm font-medium"
            style={{
              backgroundColor: 'var(--cui-warning)',
              color: 'white'
            }}
          >
            {isSaving ? 'Saving...' : 'Save Now'}
          </button>
        </div>
      )}

      {/* Configure Columns Modal */}
      <ConfigureColumnsModal
        isOpen={showColumnConfig}
        onClose={() => setShowColumnConfig(false)}
        columns={columns}
        onToggleColumn={handleToggleColumn}
        currentMode={mode}
      />
    </div>
  );
}
