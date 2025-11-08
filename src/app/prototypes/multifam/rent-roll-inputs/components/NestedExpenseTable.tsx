'use client';

import React, { useState } from 'react';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';
import { ExpenseRow, flattenExpenseRows, getCategoryInfo, CATEGORY_DEFINITIONS } from '@/config/opex/hierarchical-structure';

interface NestedExpenseTableProps {
  mode: ComplexityTier;
  rows: ExpenseRow[];
  onToggleExpand: (rowId: string) => void;
  onUpdateExpense: (expenseType: string, field: string, value: number | boolean) => void;
  selectedCategories: string[];
  onCategoryFilterChange: (categories: string[]) => void;
  onConfigureColumns: () => void;
  visibleColumns: string[];
}

export function NestedExpenseTable({
  mode,
  rows,
  onToggleExpand,
  onUpdateExpense,
  selectedCategories,
  onCategoryFilterChange,
  onConfigureColumns,
  visibleColumns
}: NestedExpenseTableProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editedRows, setEditedRows] = useState<Set<string>>(new Set());
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingExit, setPendingExit] = useState<{ rowId: string; field: string } | null>(null);

  // Flatten rows for rendering
  const flatRows = flattenExpenseRows(rows);

  // Helper function to find root category by traversing up the hierarchy
  const findRootCategory = (row: ExpenseRow): string => {
    if (row.level === 0) {
      return row.category;
    }

    // For non-root rows, traverse up to find the root parent
    let currentRow = row;
    while (currentRow.parentId) {
      const parent = rows.find(r => r.id === currentRow.parentId);
      if (!parent) break;
      if (parent.level === 0) {
        return parent.category;
      }
      currentRow = parent;
    }

    return row.category; // Fallback
  };

  // Filter by selected categories
  const filteredRows = selectedCategories.length === 0
    ? flatRows
    : flatRows.filter(row => {
        const rootCategory = findRootCategory(row);
        return selectedCategories.includes(rootCategory);
      });

  // Calculate category counts - count all rows (including children) in each category
  const categoryCounts = CATEGORY_DEFINITIONS.map(cat => {
    const count = flatRows.filter(r => {
      const rootCategory = findRootCategory(r);
      return rootCategory === cat.key;
    }).length;
    return { ...cat, count };
  });

  const handleStartEdit = (rowId: string, field: string, currentValue: number) => {
    setEditingCell({ rowId, field });
    // Format with commas for editing
    setEditValue(currentValue.toLocaleString('en-US'));
  };

  const handleSaveEdit = (rowId: string, field: string) => {
    // Remove commas before parsing
    const cleanValue = editValue.replace(/,/g, '');
    const numValue = parseFloat(cleanValue);
    if (!isNaN(numValue)) {
      onUpdateExpense(rowId, field, numValue);
      // Mark this row as edited
      setEditedRows(prev => new Set(prev).add(rowId));
    }
    setEditingCell(null);
  };

  const handleValueChange = (value: string) => {
    // Remove all non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');

    // Parse and reformat with commas
    if (cleanValue === '' || cleanValue === '.') {
      setEditValue(cleanValue);
    } else {
      const numValue = parseFloat(cleanValue);
      if (!isNaN(numValue)) {
        setEditValue(numValue.toLocaleString('en-US'));
      }
    }
  };

  const handleSaveRow = (rowId: string) => {
    // Clear the edited state for this row
    setEditedRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(rowId);
      return newSet;
    });
    // TODO: Trigger API save for this specific row
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: string, field: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(rowId, field);
    } else if (e.key === 'Escape') {
      // Check if this row has unsaved changes
      if (editedRows.has(rowId)) {
        e.preventDefault();
        setPendingExit({ rowId, field });
        setShowExitModal(true);
      } else {
        handleCancelEdit();
      }
    }
  };

  const confirmExit = () => {
    handleCancelEdit();
    setShowExitModal(false);
    setPendingExit(null);
  };

  const cancelExit = () => {
    setShowExitModal(false);
    setPendingExit(null);
  };

  const toggleCategoryFilter = (categoryKey: string) => {
    if (selectedCategories.includes(categoryKey)) {
      onCategoryFilterChange(selectedCategories.filter(c => c !== categoryKey));
    } else {
      onCategoryFilterChange([...selectedCategories, categoryKey]);
    }
  };

  const renderIndentation = (row: ExpenseRow) => {
    if (row.level === 0) return null;

    const indent = row.level * 24; // 24px per level
    const symbol = row.level === 1 ? '├─' : '  └─';

    return (
      <span className="inline-flex items-center" style={{ marginLeft: `${indent}px` }}>
        <span className="text-gray-500 mr-2">{symbol}</span>
      </span>
    );
  };

  const renderCell = (row: ExpenseRow, field: string) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field;
    const isParentRow = row.isParent;

    // Determine if this row is editable based on mode and hierarchy
    // Basic mode: Only parents editable (level 0)
    // Standard mode: Only children editable (level 1)
    // Advanced mode: Only grandchildren editable (level 2)
    const isEditable = (
      (mode === 'basic' && row.level === 0) ||
      (mode === 'standard' && row.level === 1) ||
      (mode === 'advanced' && row.level === 2)
    );

    switch (field) {
      case 'annual_amount':
        // Show calculated value if not editable
        if (!isEditable) {
          return (
            <div className={`text-right px-2 py-1 ${isParentRow ? 'font-bold' : ''}`} style={{ color: 'var(--cui-body-color)' }}>
              ${row.annualAmount.toLocaleString()}
            </div>
          );
        }

        return isEditing ? (
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-right"
            style={{
              borderColor: 'var(--cui-border-color)',
              borderWidth: '2px',
              backgroundColor: 'var(--cui-input-bg)',
              color: 'var(--cui-body-color)'
            }}
            value={editValue}
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, row.id, field)}
            onBlur={() => handleSaveEdit(row.id, field)}
            autoFocus
          />
        ) : (
          <button
            onClick={() => handleStartEdit(row.id, field, row.annualAmount)}
            className={`w-full text-right px-2 py-1 rounded ${isParentRow ? 'font-bold' : ''}`}
            style={{ color: 'var(--cui-body-color)' }}
          >
            ${row.annualAmount.toLocaleString()}
          </button>
        );

      case 'per_unit':
        if (!visibleColumns.includes('per_unit')) return null;
        return (
          <div className={`text-right ${isParentRow ? 'font-semibold' : ''}`} style={{ color: 'var(--cui-body-color)' }}>
            ${Math.round(row.perUnit).toLocaleString()}
          </div>
        );

      case 'per_sf':
        if (!visibleColumns.includes('per_sf') || mode === 'basic') return null;
        return (
          <div className={`text-right ${isParentRow ? 'font-semibold' : ''}`} style={{ color: 'var(--cui-body-color)' }}>
            ${row.perSF.toFixed(2)}
          </div>
        );

      case 'escalation_rate':
        if (!visibleColumns.includes('escalation_rate') || mode === 'basic') return null;

        // Only editable fields can have escalation rates edited
        if (!isEditable) {
          return (
            <div className={`text-right px-2 py-1 ${isParentRow ? 'font-semibold' : ''}`} style={{ color: 'var(--cui-body-color)' }}>
              {(row.escalationRate * 100).toFixed(1)}%
            </div>
          );
        }

        return isEditing ? (
          <input
            type="number"
            step="0.001"
            className="w-full border rounded px-2 py-1 text-right"
            style={{
              borderColor: 'var(--cui-border-color)',
              borderWidth: '2px',
              backgroundColor: 'var(--cui-input-bg)',
              color: 'var(--cui-body-color)'
            }}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, row.id, field)}
            onBlur={() => handleSaveEdit(row.id, field)}
            autoFocus
          />
        ) : (
          <button
            onClick={() => handleStartEdit(row.id, field, row.escalationRate)}
            className={`w-full text-right px-2 py-1 rounded ${isParentRow ? 'font-semibold' : ''}`}
            style={{ color: 'var(--cui-body-color)' }}
          >
            {(row.escalationRate * 100).toFixed(1)}%
          </button>
        );

      case 'is_recoverable':
        if (!visibleColumns.includes('is_recoverable') || mode !== 'advanced') return null;
        return (
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={row.isRecoverable || false}
              onChange={(e) => onUpdateExpense(row.id, 'is_recoverable', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-500 rounded focus:ring-blue-500"
            />
          </div>
        );

      case 'recovery_rate':
        if (!visibleColumns.includes('recovery_rate') || mode !== 'advanced') return null;
        if (!row.isRecoverable) return <div className="text-center" style={{ color: 'var(--cui-secondary-color)' }}>—</div>;
        return isEditing ? (
          <input
            type="number"
            step="0.01"
            className="w-full border rounded px-2 py-1 text-right"
            style={{
              borderColor: 'var(--cui-border-color)',
              borderWidth: '2px',
              backgroundColor: 'var(--cui-input-bg)',
              color: 'var(--cui-body-color)'
            }}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, row.id, field)}
            onBlur={() => handleSaveEdit(row.id, field)}
            autoFocus
          />
        ) : (
          <button
            onClick={() => handleStartEdit(row.id, field, row.recoveryRate || 0)}
            className="w-full text-right px-2 py-1 rounded"
            style={{ color: 'var(--cui-body-color)' }}
          >
            {((row.recoveryRate || 0) * 100).toFixed(0)}%
          </button>
        );

      default:
        return null;
    }
  };

  return (
    <div className="rounded border" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)' }}>
      {/* Table Header with Filters */}
      <div className="px-4 py-2 border-b" style={{ backgroundColor: '#f1f2f6', borderColor: 'var(--cui-border-color)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>Detailed Breakdown</h3>
          <button
            onClick={onConfigureColumns}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Configure Columns
          </button>
        </div>

        {/* Category Filter Chips (Standard/Advanced only) */}
        {mode !== 'basic' && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-400 py-1">Filter by category:</span>
            {categoryCounts.map(cat => (
              <button
                key={cat.key}
                onClick={() => toggleCategoryFilter(cat.key)}
                className={`px-2 py-1 text-xs font-medium rounded transition-all ${cat.color} ${
                  selectedCategories.includes(cat.key)
                    ? 'ring-2 ring-white scale-105'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{ color: 'white' }}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
            {selectedCategories.length > 0 && (
              <button
                onClick={() => onCategoryFilterChange([])}
                className="px-2 py-1 text-xs text-gray-400 hover:text-white underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0" style={{ backgroundColor: '#f8f8f8' }}>
            <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
              <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Expense Category</th>
              <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Annual Amount</th>
              {visibleColumns.includes('per_unit') && <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Per Unit</th>}
              {visibleColumns.includes('per_sf') && mode !== 'basic' && <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Per SF</th>}
              {visibleColumns.includes('escalation_rate') && mode !== 'basic' && <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Escalation</th>}
              {visibleColumns.includes('is_recoverable') && mode === 'advanced' && <th className="text-center px-4 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Recoverable</th>}
              {visibleColumns.includes('recovery_rate') && mode === 'advanced' && <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Recovery %</th>}
              <th className="w-20 text-right px-4 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  No expenses match the selected filters
                </td>
              </tr>
            ) : (
              filteredRows.map(row => (
                <tr
                  key={row.id}
                  className="border-b"
                  style={{
                    borderColor: 'var(--cui-border-color)',
                    backgroundColor: 'var(--cui-body-bg)'
                  }}
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {renderIndentation(row)}
                      <span className={row.isParent ? 'font-bold' : ''} style={{ color: 'var(--cui-body-color)' }}>
                        {row.label}
                      </span>
                      {row.hasChildren && (
                        <button
                          onClick={() => onToggleExpand(row.id)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {row.isExpanded ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">{renderCell(row, 'annual_amount')}</td>
                  {visibleColumns.includes('per_unit') && (
                    <td className="px-4 py-2">{renderCell(row, 'per_unit')}</td>
                  )}
                  {visibleColumns.includes('per_sf') && mode !== 'basic' && (
                    <td className="px-4 py-2">{renderCell(row, 'per_sf')}</td>
                  )}
                  {visibleColumns.includes('escalation_rate') && mode !== 'basic' && (
                    <td className="px-4 py-2">{renderCell(row, 'escalation_rate')}</td>
                  )}
                  {visibleColumns.includes('is_recoverable') && mode === 'advanced' && (
                    <td className="px-4 py-2">{renderCell(row, 'is_recoverable')}</td>
                  )}
                  {visibleColumns.includes('recovery_rate') && mode === 'advanced' && (
                    <td className="px-4 py-2">{renderCell(row, 'recovery_rate')}</td>
                  )}
                  <td className="px-2 py-2">
                    {editedRows.has(row.id) && (
                      <button
                        onClick={() => handleSaveRow(row.id)}
                        className="px-3 py-1 text-xs font-medium rounded transition-colors"
                        style={{
                          backgroundColor: 'var(--cui-success)',
                          color: 'white'
                        }}
                      >
                        Save
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Exit Without Saving Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            style={{
              backgroundColor: 'var(--cui-body-bg)',
              borderColor: 'var(--cui-border-color)',
              border: '1px solid'
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--cui-body-color)' }}>
              Exit Without Saving?
            </h3>
            <p className="mb-6" style={{ color: 'var(--cui-secondary-color)' }}>
              This row has unsaved changes. Do you want to exit without saving?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelExit}
                className="px-4 py-2 rounded transition-colors"
                style={{
                  backgroundColor: 'var(--cui-secondary-bg)',
                  color: 'var(--cui-body-color)',
                  border: '1px solid var(--cui-border-color)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmExit}
                className="px-4 py-2 rounded transition-colors"
                style={{
                  backgroundColor: 'var(--cui-danger)',
                  color: 'white'
                }}
              >
                Exit Without Saving
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
