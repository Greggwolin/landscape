'use client';

import React, { useState } from 'react';
import EditableCell from './EditableCell';
import { BudgetItem } from './hooks/useBudgetData';
import { useCalculations } from './hooks/useCalculations';
import { BudgetColumnConfig } from './ColumnChooser';

interface DataGridProps {
  data: BudgetItem[];
  onUpdate: (factId: number, field: string, value: any) => Promise<void>;
  onDelete: (factId: number) => Promise<void>;
  uomOptions: { value: string; label: string }[];
  visibleColumns: BudgetColumnConfig[];
}

export default function DataGrid({ data, onUpdate, onDelete, uomOptions, visibleColumns }: DataGridProps) {
  const { calculateAmount, formatCurrency, formatNumber, isParent, calculateSubtotal } = useCalculations();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [savingCell, setSavingCell] = useState<string | null>(null);

  // Helper to check if column is visible
  const isColumnVisible = (columnId: string) => {
    const col = visibleColumns.find(c => c.id === columnId);
    return col ? col.visible : true; // Default to visible if not found
  };

  const toggleExpand = (categoryId: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleCellSave = async (factId: number, field: string, value: any) => {
    setSavingCell(`${factId}-${field}`);
    try {
      await onUpdate(factId, field, value);
    } finally {
      setSavingCell(null);
    }
  };

  const handleDelete = async (factId: number) => {
    if (!confirm('Are you sure you want to delete this budget item?')) return;
    await onDelete(factId);
  };

  // Build hierarchical structure
  const buildTree = () => {
    const itemMap = new Map<number, BudgetItem[]>();

    // Group by parent
    data.forEach((item) => {
      const parentId = item.parent_category_id ?? 0;
      if (!itemMap.has(parentId)) {
        itemMap.set(parentId, []);
      }
      itemMap.get(parentId)!.push(item);
    });

    return itemMap;
  };

  const renderRow = (item: BudgetItem, level: number = 0) => {
    const itemIsParent = isParent(data, item.category_id);
    const isExpanded = expandedRows.has(item.category_id);
    const hasChildren = itemIsParent;

    // Calculate amount (Qty × Rate) or show subtotal for parents
    const displayAmount = hasChildren
      ? calculateSubtotal(data, item.category_id)
      : calculateAmount(item.qty, item.rate);

    const rowClass = hasChildren ? 'parent-row' : 'child-row';

    return (
      <React.Fragment key={item.fact_id}>
        <tr className={rowClass}>
          {/* Scope */}
          {isColumnVisible('scope') && (
            <td className="scope-cell">{item.scope || '—'}</td>
          )}

          {/* Budget Item with tree indentation */}
          <td className="budget-item-cell" style={{ paddingLeft: `${level * 24 + 12}px` }}>
            {hasChildren && (
              <button
                className="expand-button"
                onClick={() => toggleExpand(item.category_id)}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
            <span className="category-detail">{item.category_detail}</span>
          </td>

          {/* Quantity */}
          {isColumnVisible('qty') && (
            <td className="qty-cell">
              {!hasChildren ? (
                <EditableCell
                  value={item.qty}
                  type="number"
                  decimals={2}
                  onSave={(val) => handleCellSave(item.fact_id, 'qty', val)}
                  className={savingCell === `${item.fact_id}-qty` ? 'saving' : ''}
                />
              ) : (
                <span className="subtotal-text">—</span>
              )}
            </td>
          )}

          {/* UOM */}
          {isColumnVisible('uom') && (
            <td className="uom-cell">
              {!hasChildren ? (
                <EditableCell
                  value={item.uom_code}
                  type="select"
                  options={uomOptions}
                  onSave={(val) => handleCellSave(item.fact_id, 'uom_code', val)}
                  className={savingCell === `${item.fact_id}-uom_code` ? 'saving' : ''}
                />
              ) : (
                <span>—</span>
              )}
            </td>
          )}

          {/* Rate */}
          {isColumnVisible('rate') && (
            <td className="rate-cell">
              {!hasChildren ? (
                <EditableCell
                  value={item.rate}
                  type="currency"
                  onSave={(val) => handleCellSave(item.fact_id, 'rate', val)}
                  className={savingCell === `${item.fact_id}-rate` ? 'saving' : ''}
                />
              ) : (
                <span>—</span>
              )}
            </td>
          )}

          {/* Amount (Calculated) */}
          {isColumnVisible('amount') && (
            <td className="amount-cell calculated">
              {formatCurrency(displayAmount)}
            </td>
          )}

          {/* Start Date */}
          {isColumnVisible('start_date') && (
            <td className="date-cell">
              <EditableCell
                value={item.start_date}
                type="date"
                onSave={(val) => handleCellSave(item.fact_id, 'start_date', val)}
                className={savingCell === `${item.fact_id}-start_date` ? 'saving' : ''}
              />
            </td>
          )}

          {/* End Date */}
          {isColumnVisible('end_date') && (
            <td className="date-cell">
              <EditableCell
                value={item.end_date}
                type="date"
                onSave={(val) => handleCellSave(item.fact_id, 'end_date', val)}
                className={savingCell === `${item.fact_id}-end_date` ? 'saving' : ''}
              />
            </td>
          )}

          {/* Escalation % */}
          {isColumnVisible('escalation') && (
            <td className="percent-cell">
              <EditableCell
                value={item.escalation_rate}
                type="number"
                decimals={1}
                onSave={(val) => handleCellSave(item.fact_id, 'escalation_rate', val)}
                className={savingCell === `${item.fact_id}-escalation_rate` ? 'saving' : ''}
              />
            </td>
          )}

          {/* Contingency % */}
          {isColumnVisible('contingency') && (
            <td className="percent-cell">
              <EditableCell
                value={item.contingency_pct}
                type="number"
                decimals={1}
                onSave={(val) => handleCellSave(item.fact_id, 'contingency_pct', val)}
                className={savingCell === `${item.fact_id}-contingency_pct` ? 'saving' : ''}
              />
            </td>
          )}

          {/* Actions */}
          <td className="actions-cell">
            <div className="action-buttons">
              <button
                className="edit-chip"
                onClick={() => {
                  // TODO: Open edit modal/form
                  console.log('Edit budget item:', item.fact_id);
                }}
                aria-label="Edit item"
                title="Edit item"
              >
                Edit
              </button>
              {!hasChildren && (
                <button
                  className="delete-button"
                  onClick={() => handleDelete(item.fact_id)}
                  aria-label="Delete item"
                  title="Delete item"
                >
                  🗑️
                </button>
              )}
            </div>
          </td>
        </tr>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <>
            {data
              .filter((child) => child.parent_category_id === item.category_id)
              .map((child) => renderRow(child, level + 1))}
          </>
        )}
      </React.Fragment>
    );
  };

  // Render top-level items (no parent)
  const topLevelItems = data.filter((item) => !item.parent_category_id);

  return (
    <div className="data-grid-container">
      <table className="budget-data-grid">
        <thead>
          <tr>
            {isColumnVisible('scope') && <th className="scope-header">Scope</th>}
            <th className="budget-item-header">Budget Item</th>
            {isColumnVisible('qty') && <th className="qty-header">Quantity</th>}
            {isColumnVisible('uom') && <th className="uom-header">UOM</th>}
            {isColumnVisible('rate') && <th className="rate-header">Rate</th>}
            {isColumnVisible('amount') && <th className="amount-header">Amount</th>}
            {isColumnVisible('start_date') && <th className="date-header">Start Date</th>}
            {isColumnVisible('end_date') && <th className="date-header">End Date</th>}
            {isColumnVisible('escalation') && <th className="percent-header">Escalation %</th>}
            {isColumnVisible('contingency') && <th className="percent-header">Contingency %</th>}
            <th className="actions-header">Actions</th>
          </tr>
        </thead>
        <tbody>
          {topLevelItems.length > 0 ? (
            topLevelItems.map((item) => renderRow(item, 0))
          ) : (
            <tr>
              <td colSpan={11} className="empty-state">
                No budget items found. Add items to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
