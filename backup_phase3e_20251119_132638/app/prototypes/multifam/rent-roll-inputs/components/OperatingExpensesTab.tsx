'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';
import { BenchmarkPanel } from './BenchmarkPanel';
import { NestedExpenseTable } from './NestedExpenseTable';
import { ConfigureColumnsModal } from './ConfigureColumnsModal';
import { buildHierarchicalExpenses, ExpenseRow } from '@/config/opex/hierarchical-structure';
import { multifamilyOpExFields } from '@/config/opex/multifamily-fields';

interface OperatingExpensesTabProps {
  mode: ComplexityTier;
  projectId: number;
  hideTitle?: boolean;
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

export function OperatingExpensesTab({ mode, projectId, hideTitle = false }: OperatingExpensesTabProps) {
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [hierarchicalRows, setHierarchicalRows] = useState<ExpenseRow[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [prototypeNotes, setPrototypeNotes] = useState<string>('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesMessage, setNotesMessage] = useState<string>('');
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [showColumnConfig, setShowColumnConfig] = useState(false);

  // Load expenses on mount
  useEffect(() => {
    loadExpenses();
  }, [projectId]);

  // Load prototype notes on mount
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const response = await fetch('/api/prototypes/notes?prototypeId=multifam-opex');
        if (response.ok) {
          const notes = await response.json();
          if (notes.length > 0) {
            setPrototypeNotes(notes[0].note);
          }
        }
      } catch (err) {
        console.error('Failed to load notes:', err);
      }
    };
    loadNotes();
  }, []);

  // Rebuild hierarchical structure when expenses or mode changes
  useEffect(() => {
    console.log('Rebuilding hierarchy, expenses:', expenses.length, 'mode:', mode);
    if (expenses.length > 0) {
      const rows = buildHierarchicalExpenses(expenses, mode);
      console.log('Built hierarchical rows:', rows.length, rows);
      setHierarchicalRows(rows);
    }
  }, [expenses, mode]);

  const loadExpenses = async () => {
    console.log('Loading expenses for project:', projectId);

    // For now, just use mock data directly since API might not be set up
    console.log('Using mock expenses');
    const mockData = generateMockExpenses();
    console.log('Generated mock data:', mockData);
    setExpenses(mockData);
    setIsLoading(false);
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

  const getFieldLabel = (key: string): string => {
    const field = multifamilyOpExFields.find(f => f.key === key);
    return field?.label || key;
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

      const response = await fetch(`/api/projects/${projectId}/opex`, {
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

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    setNotesMessage('');
    try {
      const response = await fetch('/api/prototypes/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prototypeId: 'multifam-opex',
          note: prototypeNotes
        })
      });

      if (response.ok) {
        setNotesMessage('Notes saved successfully!');
        setTimeout(() => setNotesMessage(''), 3000);
      } else {
        setNotesMessage('Failed to save notes');
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
      setNotesMessage('Error saving notes');
    } finally {
      setIsSavingNotes(false);
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
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-400">Loading operating expenses...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Page Title with Notes Button */}
      {!hideTitle && (
        <div className="bg-gray-800 rounded border border-gray-700 p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Operating Expenses - Prototype</h2>
            <button
              onClick={() => setShowNotesModal(true)}
              className={`px-3 py-2 text-white text-sm rounded transition-colors flex items-center gap-2 relative ${
                prototypeNotes
                  ? 'bg-blue-700 hover:bg-blue-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {prototypeNotes && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {prototypeNotes ? 'Edit Notes' : 'Add Notes'}
            </button>
          </div>
        </div>
      )}

      {/* Summary Metrics Bar - Full Width */}
      <div className="bg-blue-900/50 border border-blue-700 rounded-lg px-6 py-4">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-blue-200 uppercase font-medium mb-1">Total Operating Expenses</div>
            <div className="text-2xl font-bold text-white">${totals.annual.toLocaleString()}</div>
            <div className="text-xs text-blue-300">per year</div>
          </div>
          <div>
            <div className="text-xs text-blue-200 uppercase font-medium mb-1">Per Unit</div>
            <div className="text-2xl font-bold text-white">${Math.round(totals.perUnit).toLocaleString()}</div>
            <div className="text-xs text-blue-300">annual</div>
          </div>
          <div>
            <div className="text-xs text-blue-200 uppercase font-medium mb-1">Per SF</div>
            <div className="text-2xl font-bold text-white">${totals.perSF.toFixed(2)}</div>
            <div className="text-xs text-blue-300">annual</div>
          </div>
          <div>
            <div className="text-xs text-blue-200 uppercase font-medium mb-1">Expense Ratio</div>
            <div className="text-2xl font-bold text-white">--</div>
            <div className="text-xs text-blue-300">of EGI (TBD)</div>
          </div>
        </div>
      </div>

      {/* Benchmark Panel - Full Width */}
      <BenchmarkPanel
        mode={mode}
        totalPerUnit={Math.round(totals.perUnit)}
        marketMedian={8200}
        alerts={benchmarkAlerts}
      />

      {/* Nested Expense Table - Full Width */}
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
        <div className="bg-gray-800 rounded border border-gray-700 p-8 text-center">
          <div className="text-gray-400">No expense data available. Expenses: {expenses.length}, Hierarchical rows: {hierarchicalRows.length}</div>
        </div>
      )}

      {/* Save Button */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 right-4 bg-orange-100 dark:bg-orange-900/90 border border-orange-300 dark:border-orange-700 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
          <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
            You have unsaved changes
          </span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {isSaving ? 'Saving...' : 'Save Now'}
          </button>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNotesModal(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Prototype Notes</h3>
              <button
                onClick={() => setShowNotesModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Add notes about this prototype (saved to JSON file for export)
              </label>
              <textarea
                value={prototypeNotes}
                onChange={(e) => setPrototypeNotes(e.target.value)}
                className="w-full h-64 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your notes here..."
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {notesMessage && (
                  <span className={`text-sm ${notesMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                    {notesMessage}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNotesModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSavingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </div>
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
