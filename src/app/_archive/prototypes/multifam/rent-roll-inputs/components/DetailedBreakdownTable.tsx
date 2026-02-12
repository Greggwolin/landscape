'use client';

import React, { useState } from 'react';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';

interface ExpenseRow {
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

interface DetailedBreakdownTableProps {
  mode: ComplexityTier;
  expenses: ExpenseRow[];
  selectedCategory: string | null;
  onUpdateExpense: (expenseType: string, field: string, value: number | boolean) => void;
}

export function DetailedBreakdownTable({
  mode,
  expenses,
  selectedCategory,
  onUpdateExpense
}: DetailedBreakdownTableProps) {
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Filter expenses based on selected category and mode
  const visibleExpenses = expenses.filter(exp => {
    if (selectedCategory && exp.expense_category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const handleEditStart = (expenseType: string, currentValue: number) => {
    setEditingRow(expenseType);
    setEditValue(currentValue.toString());
  };

  const handleEditSave = (expenseType: string) => {
    const numValue = parseFloat(editValue.replace(/,/g, ''));
    if (!isNaN(numValue)) {
      onUpdateExpense(expenseType, 'annual_amount', numValue);
    }
    setEditingRow(null);
  };

  const handleEditCancel = () => {
    setEditingRow(null);
    setEditValue('');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Calculate totals
  const totals = visibleExpenses.reduce(
    (acc, exp) => ({
      annual: acc.annual + exp.annual_amount,
      perUnit: acc.perUnit + exp.per_unit,
      perSF: acc.perSF + exp.per_sf
    }),
    { annual: 0, perUnit: 0, perSF: 0 }
  );

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Detailed Breakdown</h3>
          <p className="text-xs text-gray-400 mt-1">
            {selectedCategory
              ? `Showing expenses for selected category`
              : `Showing all ${visibleExpenses.length} line items`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors">
            ⚙️ Configure
          </button>
          <button className="px-3 py-1.5 text-xs bg-blue-700 text-white rounded hover:bg-blue-600 transition-colors">
            📄 Import T-12
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-900">
              <th className="text-left p-3 text-xs font-medium text-gray-400 uppercase">Category</th>
              <th className="text-left p-3 text-xs font-medium text-gray-400 uppercase">Line Item</th>
              <th className="text-right p-3 text-xs font-medium text-gray-400 uppercase">Annual</th>
              <th className="text-right p-3 text-xs font-medium text-gray-400 uppercase">Per Unit</th>
              {(mode === 'standard' || mode === 'advanced') && (
                <>
                  <th className="text-right p-3 text-xs font-medium text-gray-400 uppercase">Per SF</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-400 uppercase">Escalation</th>
                </>
              )}
              {mode === 'advanced' && (
                <>
                  <th className="text-center p-3 text-xs font-medium text-gray-400 uppercase">Recoverable</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-400 uppercase">Recovery %</th>
                </>
              )}
              <th className="text-center p-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleExpenses.map((expense, idx) => {
              const isEditing = editingRow === expense.expense_type;

              return (
                <tr
                  key={expense.expense_type}
                  className={`
                    border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors
                    ${idx % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/50'}
                  `}
                >
                  <td className="p-3 text-sm text-gray-400">{expense.expense_category}</td>
                  <td className="p-3 text-sm text-white">{expense.label}</td>
                  <td className="p-3 text-right">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSave(expense.expense_type);
                          if (e.key === 'Escape') handleEditCancel();
                        }}
                        className="w-28 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-right text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm text-white font-mono">
                        ${formatCurrency(expense.annual_amount)}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right text-sm text-gray-300 font-mono">
                    ${formatCurrency(expense.per_unit)}
                  </td>
                  {(mode === 'standard' || mode === 'advanced') && (
                    <>
                      <td className="p-3 text-right text-sm text-gray-300 font-mono">
                        ${expense.per_sf.toFixed(2)}
                      </td>
                      <td className="p-3 text-right text-sm text-gray-300">
                        {(expense.escalation_rate * 100).toFixed(1)}%
                      </td>
                    </>
                  )}
                  {mode === 'advanced' && (
                    <>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={expense.is_recoverable || false}
                          onChange={(e) =>
                            onUpdateExpense(expense.expense_type, 'is_recoverable', e.target.checked)
                          }
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600"
                        />
                      </td>
                      <td className="p-3 text-right text-sm text-gray-300">
                        {expense.is_recoverable && expense.recovery_rate
                          ? `${(expense.recovery_rate * 100).toFixed(0)}%`
                          : '—'}
                      </td>
                    </>
                  )}
                  <td className="p-3 text-center">
                    {isEditing ? (
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          onClick={() => handleEditSave(expense.expense_type)}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="text-gray-400 hover:text-gray-300 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditStart(expense.expense_type, expense.annual_amount)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-600 bg-gray-800">
              <td colSpan={2} className="p-3 text-sm font-semibold text-white">
                TOTAL
              </td>
              <td className="p-3 text-right text-lg font-bold text-white">
                ${formatCurrency(totals.annual)}
              </td>
              <td className="p-3 text-right text-sm font-semibold text-white">
                ${formatCurrency(totals.perUnit)}
              </td>
              {(mode === 'standard' || mode === 'advanced') && (
                <>
                  <td className="p-3 text-right text-sm font-semibold text-white">
                    ${totals.perSF.toFixed(2)}
                  </td>
                  <td colSpan={mode === 'advanced' ? 3 : 1}></td>
                </>
              )}
              {mode === 'advanced' && <td></td>}
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
