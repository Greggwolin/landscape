'use client';

import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { CCard, CCardBody } from '@coreui/react';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';
import { NestedExpenseTable } from '@/app/prototypes/multifam/rent-roll-inputs/components/NestedExpenseTable';
import { BenchmarkPanel } from '@/app/prototypes/multifam/rent-roll-inputs/components/BenchmarkPanel';
import { ConfigureColumnsModal } from './ConfigureColumnsModal';
import { buildHierarchicalExpenses, ExpenseRow } from '@/config/opex/hierarchical-structure';
import { multifamilyOpExFields } from '@/config/opex/multifamily-fields';
import { unitsAPI } from '@/lib/api/multifamily';
import OpExHierarchy from '@/app/components/OpExHierarchy';

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

function OperationsTab({ project, mode: propMode, onModeChange }: OperationsTabProps) {
  // Check if this is a supported project type (Multifamily only for now)
  const isMultifamily = project.project_type_code === 'MF';
  const isLand = project.project_type_code === 'LAND';

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
  const [activeScenario, setActiveScenario] = useState<string>('default');
  const [availableScenarios, setAvailableScenarios] = useState<string[]>([]);

  // Load property data on mount
  useEffect(() => {
    // Skip data loading for non-multifamily projects
    if (!isMultifamily) {
      setIsLoading(false);
      return;
    }
    loadPropertyData();
  }, [project.project_id, isMultifamily]);

  // Load expenses when property data is available
  useEffect(() => {
    if (propertyData && isMultifamily) {
      loadExpenses();
    }
  }, [project.project_id, propertyData, isMultifamily]);

  const loadPropertyData = async () => {
    try {
      const units = await unitsAPI.list(project.project_id);
      const unitCount = units.length;
      const totalSF = units.reduce((sum, unit) => sum + (parseFloat(unit.square_feet?.toString() || '0') || 0), 0);

      console.log('[OperationsTab] Property data:', { unitCount, totalSF });
      setPropertyData({ unitCount, totalSF });
    } catch (error) {
      console.error('Error loading property data:', error);
      // Set defaults if no units found
      setPropertyData({ unitCount: 0, totalSF: 0 });
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

  const loadExpenses = async (scenario?: string) => {
    try {
      setIsLoading(true);

      // Load from Chart of Accounts hierarchy API
      const query = scenario ? `?statement_discriminator=${encodeURIComponent(scenario)}` : '';
      const response = await fetch(`/api/projects/${project.project_id}/operating-expenses/hierarchy${query}`);

      if (response.ok) {
        const data = await response.json();
        console.log('[OperationsTab] Chart of Accounts API response:', data);

        if (data.accounts && data.accounts.length > 0) {
          console.log('[OperationsTab] Using Chart of Accounts data, accounts count:', data.accounts.length);
          if (data.active_statement_discriminator) {
            setActiveScenario(data.active_statement_discriminator);
          }
          if (Array.isArray(data.available_statement_discriminators)) {
            setAvailableScenarios(data.available_statement_discriminators);
          }

          // Map Chart of Accounts to multifamilyOpExFields keys
          // These MUST match the 'key' values in src/config/opex/multifamily-fields.ts
          const accountToExpenseTypeMap: Record<string, { expenseType: string; category: string }> = {
            // Taxes & Insurance (5100 series)
            '5100': { expenseType: 'property_taxes', category: 'taxes' },      // Parent rollup
            '5110': { expenseType: 'property_taxes', category: 'taxes' },      // Maps to basic tier parent
            '5111': { expenseType: 'property_taxes', category: 'taxes' },      // Real Estate Taxes -> property_taxes
            '5112': { expenseType: 'property_taxes', category: 'taxes' },      // Direct Assessment -> property_taxes
            '5120': { expenseType: 'insurance', category: 'insurance' },

            // Utilities (5200 series)
            '5200': { expenseType: 'utilities_combined', category: 'utilities' },
            '5210': { expenseType: 'water_sewer', category: 'utilities' },
            '5220': { expenseType: 'trash_removal', category: 'utilities' },   // Maps to trash_removal
            '5230': { expenseType: 'gas_electric', category: 'utilities' },    // Electricity -> gas_electric
            '5240': { expenseType: 'gas_electric', category: 'utilities' },    // Gas -> gas_electric

            // Repairs & Maintenance (5300 series)
            '5300': { expenseType: 'repairs_maintenance', category: 'maintenance' },
            '5310': { expenseType: 'unit_turnover', category: 'maintenance' }, // Repairs & Labor -> unit_turnover
            '5320': { expenseType: 'repairs_maintenance', category: 'maintenance' }, // Maintenance Contracts
            '5321': { expenseType: 'repairs_maintenance', category: 'maintenance' }, // Janitorial
            '5322': { expenseType: 'landscaping', category: 'other' },         // Gardening -> landscaping
            '5323': { expenseType: 'pest_control', category: 'other' },
            '5324': { expenseType: 'repairs_maintenance', category: 'maintenance' }, // Elevator

            // Administrative / Management (5400 series)
            '5400': { expenseType: 'property_management', category: 'management' },
            '5410': { expenseType: 'property_management', category: 'management' }, // Management Fee
            '5420': { expenseType: 'administrative', category: 'other' },      // Professional Services -> administrative
            '5421': { expenseType: 'administrative', category: 'other' },
            '5422': { expenseType: 'administrative', category: 'other' },
            '5423': { expenseType: 'security_service', category: 'other' },
            '5424': { expenseType: 'administrative', category: 'other' },
            '5425': { expenseType: 'administrative', category: 'other' },

            // Marketing (5500 series)
            '5500': { expenseType: 'marketing_advertising', category: 'other' },
            '5510': { expenseType: 'marketing_advertising', category: 'other' }
          };

          // Flatten the hierarchical accounts into expense format
          // Only use leaf accounts (those with actual opex_id) or parent accounts if they have direct data
          const flattenAccounts = (accounts: any[]): ExpenseData[] => {
            const result: ExpenseData[] = [];

            accounts.forEach((account) => {
              const mapping = accountToExpenseTypeMap[account.account_number];
              const hasChildren = account.children && account.children.length > 0;
              const hasDirectData = account.opex_id !== null; // Has actual expense record
              const isCalculatedParent = account.is_calculated && hasChildren;

              // Only add leaf accounts with data, or parents without children that have data
              // Skip calculated parents (they just sum children)
              if (mapping && hasDirectData && !isCalculatedParent) {
                const annualAmount = parseFloat(account.annual_amount) || parseFloat(account.calculated_total) || 0;
                const escalation = parseFloat(account.escalation_rate) || 0.03;

                result.push({
                  expense_type: mapping.expenseType,
                  expense_category: mapping.category,
                  label: account.account_name,
                  annual_amount: annualAmount,
                  per_unit: propertyData?.unitCount ? annualAmount / propertyData.unitCount : 0,
                  per_sf: propertyData?.totalSF ? annualAmount / propertyData.totalSF : 0,
                  escalation_rate: escalation,
                  is_recoverable: false,
                  recovery_rate: 0
                });
              }

              // Recursively process children
              if (hasChildren) {
                result.push(...flattenAccounts(account.children));
              }
            });

            return result;
          };

          const mappedExpenses = flattenAccounts(data.accounts);
          console.log('[OperationsTab] Mapped expenses from Chart of Accounts:', mappedExpenses);
          setExpenses(mappedExpenses);
        } else {
          console.log('[OperationsTab] API returned empty, no expenses for this project');
          setExpenses([]);
        }
      } else {
        console.log('[OperationsTab] API failed, setting empty expenses');
        setExpenses([]);
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScenarioChange = async (nextScenario: string) => {
    try {
      setIsLoading(true);
      setActiveScenario(nextScenario);
      await fetch(`/api/projects/${project.project_id}/opex/active-scenario`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement_discriminator: nextScenario })
      });
      await loadExpenses(nextScenario);
    } catch (error) {
      console.error('Error updating active OpEx scenario', error);
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

  if (isLand) {
    return (
      <div className="py-6">
        <OpExHierarchy projectId={project.project_id} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--cui-primary)' }}></div>
      </div>
    );
  }

  // Show "Coming Soon" for unsupported project types
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

  // Show empty state for multifamily projects with no operating expense data
  if (expenses.length === 0 && hierarchicalRows.length === 0) {
    return (
      <div className="p-4 space-y-4 bg-gray-950 min-h-screen flex items-center justify-center">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center max-w-2xl">
          <div className="text-6xl mb-6">📊</div>
          <h2 className="text-2xl font-semibold text-white mb-3">
            No Operating Expenses Data Yet
          </h2>
          <p className="text-gray-400 mb-6">
            This multifamily project doesn't have any operating expenses configured yet.
          </p>
          <div
            className="p-4 rounded text-left"
            style={{
              backgroundColor: 'var(--cui-info-bg)',
              borderLeft: '4px solid var(--cui-info)'
            }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--cui-info)' }}>
              <strong>To add operating expenses:</strong>
            </p>
            <ul
              className="text-sm ml-4"
              style={{
                color: 'var(--cui-body-color)',
                listStyleType: 'disc'
              }}
            >
              <li>Use the Budget tab to configure development and operating costs</li>
              <li>Add expense categories like management fees, utilities, insurance, etc.</li>
              <li>Operating expenses will be calculated on a per-unit and per-SF basis</li>
            </ul>
          </div>
        </div>
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

      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-400">Scenario:</div>
        <select
          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
          value={activeScenario}
          onChange={(e) => handleScenarioChange(e.target.value)}
          disabled={isLoading}
        >
          {(availableScenarios.length ? availableScenarios : [activeScenario || 'default']).map((scenario) => (
            <option key={scenario} value={scenario}>
              {scenario}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-500">
          Active scenario controls Operations view and valuation.
        </span>
      </div>

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

      {/* Main Content Grid: Expense Table + Benchmark Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Nested Expense Table */}
        <div className="lg:col-span-2">
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
            <CCard>
              <CCardBody className="p-8 text-center">
                <div style={{ color: 'var(--cui-secondary-color)' }}>
                  No expense data available
                </div>
              </CCardBody>
            </CCard>
          )}
        </div>

        {/* Benchmark Panel */}
        <div className="lg:col-span-1">
          <BenchmarkPanel
            mode={mode}
            totalPerUnit={Math.round(totals.perUnit)}
            marketMedian={8200}
            alerts={benchmarkAlerts}
          />
        </div>
      </div>

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

// Export memoized version to prevent unnecessary re-renders
export default memo(OperationsTab);
