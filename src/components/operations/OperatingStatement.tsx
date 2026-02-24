'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DetailSummaryToggle, ViewMode } from './DetailSummaryToggle';
import { InputCell } from './InputCell';
import { ItemNameEditor } from './ItemNameEditor';
import { LineItemRow, formatCurrency, formatPercent, formatPerSF } from './types';
import { LockClosedIcon, PlusIcon, MinusIcon } from '@heroicons/react/20/solid';

const DRAG_TYPE = 'opex_item';

interface DragItem {
  opex_id: number;
  label: string;
  line_item_key: string;
  source_category: string;
}

interface CategoryOption {
  category_id: number;
  category_name: string;
  has_children: boolean;
}

interface NewExpenseRow {
  tempId: string;
  parentCategory: string;
  expense_category: string;
  unit_amount: number | null;
  post_reno_unit_amount: number | null;
}

const renderCurrency = (value: number | null | undefined) => (
  value === null || value === undefined ? '—' : formatCurrency(value)
);

const renderPerSF = (value: number | null | undefined) => (
  value === null || value === undefined ? '—' : formatPerSF(value)
);

interface OperatingStatementProps {
  rentalRows: LineItemRow[];
  vacancyRows: LineItemRow[];
  otherIncomeRows: LineItemRow[];
  opexRows: LineItemRow[];
  unitCount: number;
  totalSF: number;
  grossPotentialRent: number;
  effectiveGrossIncome: number;
  asIsNOI: number;
  postRenoNOI: number;
  valueAddEnabled: boolean;
  hasDetailedRentRoll: boolean;
  projectId: number;
  onUpdateVacancy?: (lineItemKey: string, field: string, value: number | null) => void;
  onUpdateOtherIncome?: (lineItemKey: string, field: string, value: number | null) => void;
  onUpdateOpex?: (lineItemKey: string, field: string, value: number | null) => void;
  onToggleExpand?: (lineItemKey: string) => void;
  onCategoryChange?: (opexId: number, newCategory: string, label: string) => Promise<void>;
  onAddExpense?: (expense: {
    expense_category: string;
    parent_category: string;
    unit_amount: number | null;
  }) => Promise<void>;
  onDeleteExpenses?: (opexIds: number[]) => Promise<void>;
  /** Callback for inline item name changes (double-click edit) */
  onItemNameChange?: (opexId: number, categoryId: number, categoryName: string) => Promise<void>;
  hideLossToLease?: boolean;
  hidePostReno?: boolean;
}

interface SelectableExpenseRowProps {
  row: LineItemRow & { _uniqueKey: string };
  unitCount: number;
  totalSF: number;
  valueAddEnabled: boolean;
  isSelected: boolean;
  isEditingName: boolean;
  onSelect: (opexId: number, event: React.MouseEvent) => void;
  onUpdateRow: (lineItemKey: string, field: string, value: number | null) => void;
  onStartEditName: (opexId: number) => void;
  onSaveItemName: (opexId: number, categoryId: number, categoryName: string) => void;
  onCancelEditName: () => void;
}

function SelectableExpenseRow({
  row,
  unitCount,
  totalSF,
  valueAddEnabled,
  isSelected,
  isEditingName,
  onSelect,
  onUpdateRow,
  onStartEditName,
  onSaveItemName,
  onCancelEditName
}: SelectableExpenseRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isDraggable = row.is_draggable;

  const isPercentageBased = (r: LineItemRow) => {
    return r.is_percentage || r.calculation_base === 'egi';
  };

  const isPercent = isPercentageBased(row);

  const rowPerUnit = unitCount > 0 && row.as_is.total
    ? row.as_is.total / unitCount
    : row.as_is.rate;
  const rowPerSF = totalSF > 0 && row.as_is.total
    ? row.as_is.total / totalSF
    : null;

  const postRenoRowPerUnit = unitCount > 0 && row.post_reno?.total
    ? row.post_reno.total / unitCount
    : row.post_reno?.rate;

  const [{ isDragging }, drag] = useDrag(() => ({
    type: DRAG_TYPE,
    item: {
      opex_id: row.opex_id,
      label: row.label,
      line_item_key: row.line_item_key,
      source_category: row.parent_category || 'unclassified'
    } as DragItem,
    canDrag: isDraggable && !isEditingName,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }), [row.opex_id, row.label, row.line_item_key, row.parent_category, isDraggable, isEditingName]);

  if (isDraggable && !isEditingName) {
    drag(ref);
  }

  let rowClass = 'ops-row ops-child-row';
  if (isDraggable) rowClass += ' draggable-opex-row';
  if (isDragging) rowClass += ' dragging';
  if (isSelected) rowClass += ' ops-row-selected';
  if (isEditingName) rowClass += ' ops-row-editing';

  const handleClick = (e: React.MouseEvent) => {
    // Don't select if we're editing
    if (isEditingName) return;
    if (row.opex_id) {
      onSelect(row.opex_id, e);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (row.opex_id && isDraggable) {
      onStartEditName(row.opex_id);
    }
  };

  const handleSaveItemName = (categoryId: number, categoryName: string) => {
    if (row.opex_id) {
      onSaveItemName(row.opex_id, categoryId, categoryName);
    }
  };

  return (
    <div
      ref={ref}
      className={rowClass}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isEditingName ? 'default' : isDraggable ? 'grab' : 'pointer'
      }}
      onClick={handleClick}
    >
      <div className="ops-cell">
        {isEditingName ? (
          <ItemNameEditor
            currentCategoryId={row.category_id || null}
            parentCategory={row.parent_category || 'other'}
            currentLabel={row.label}
            onSave={handleSaveItemName}
            onCancel={onCancelEditName}
          />
        ) : (
          <span className="ops-label-inline">
            {isDraggable && (
              <span className="ops-drag-handle" title="Drag to categorize">
                ⋮⋮
              </span>
            )}
            <span
              className={isDraggable ? 'ops-editable-label' : ''}
              onDoubleClick={handleDoubleClick}
              title={isDraggable ? 'Double-click to edit' : undefined}
            >
              {row.label}
            </span>
          </span>
        )}
      </div>
      <div className="ops-cell ops-input-cell">
        {isPercent ? (
          <InputCell
            value={row.as_is.rate}
            variant="as-is"
            format="percent"
            className="ops-input-compact"
            onChange={(val) => onUpdateRow(row.line_item_key, 'as_is_rate', val)}
          />
        ) : (
          <InputCell
            value={row.as_is.rate ?? rowPerUnit}
            variant="as-is"
            format="currency"
            className="ops-input-compact"
            onChange={(val) => onUpdateRow(row.line_item_key, 'as_is_rate', val)}
          />
        )}
      </div>
      <div className="ops-cell num">—</div>
      <div className="ops-cell num ops-calc">
        {renderCurrency(row.as_is.total)}
      </div>
      <div className="ops-cell num ops-calc">
        {isPercent ? '' : renderPerSF(rowPerSF)}
      </div>
      <div className="ops-cell num ops-col-ltl"></div>
      <div className="ops-cell num ops-col-post">
        {valueAddEnabled ? (
          isPercent ? (
            <InputCell
              value={row.post_reno?.rate}
              variant="post-reno"
              format="percent"
              onChange={(val) => onUpdateRow(row.line_item_key, 'post_reno_rate', val)}
            />
          ) : (
            <InputCell
              value={row.post_reno?.rate ?? postRenoRowPerUnit}
              variant="post-reno"
              format="currency"
              onChange={(val) => onUpdateRow(row.line_item_key, 'post_reno_rate', val)}
            />
          )
        ) : null}
      </div>
      <div className="ops-cell num ops-calc ops-col-reno">
        {valueAddEnabled ? renderCurrency(row.post_reno?.total) : null}
      </div>
    </div>
  );
}

interface DroppableParentRowProps {
  row: LineItemRow & { _uniqueKey: string };
  unitCount: number;
  totalSF: number;
  valueAddEnabled: boolean;
  showParentTotals: boolean;
  hasSelectedChildren: boolean;
  onDrop: (item: DragItem, targetCategory: string) => void;
  onToggleExpand?: (lineItemKey: string) => void;
  onAddClick: () => void;
  onDeleteClick: () => void;
}

function DroppableParentRow({
  row,
  unitCount,
  totalSF,
  valueAddEnabled,
  showParentTotals,
  hasSelectedChildren,
  onDrop,
  onToggleExpand,
  onAddClick,
  onDeleteClick
}: DroppableParentRowProps) {
  const targetCategory = row.parent_category || 'unclassified';
  const isUnclassifiedSection = row.is_unclassified_section;
  const isCollapsed = row.is_expanded === false;

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: DRAG_TYPE,
    canDrop: (item: DragItem) => {
      return item.source_category !== targetCategory && targetCategory !== 'unclassified';
    },
    drop: (item: DragItem) => {
      onDrop(item, targetCategory);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  }), [targetCategory, onDrop]);

  const rowPerUnit = unitCount > 0 && row.as_is.total
    ? row.as_is.total / unitCount
    : row.as_is.rate;
  const rowPerSF = totalSF > 0 && row.as_is.total
    ? row.as_is.total / totalSF
    : null;
  const rowPostRenoPerUnit = unitCount > 0 && row.post_reno?.total
    ? row.post_reno.total / unitCount
    : row.post_reno?.rate;

  let rowClass = 'ops-row ops-parent-row droppable-parent-row';
  if (isOver && canDrop) rowClass += ' drop-target-active';
  else if (canDrop) rowClass += ' drop-target-available';
  if (isUnclassifiedSection) rowClass += ' unclassified-section';

  return (
    <div ref={drop} className={rowClass}>
      <div className="ops-cell">
        {isUnclassifiedSection && (
          <span className="unclassified-badge">
            NEEDS REVIEW
          </span>
        )}
        <span className="ops-parent-label">
          {row.label}
          <span
            className={`ops-expand-icon ${isCollapsed ? 'collapsed' : ''}`}
            onClick={() => onToggleExpand?.(row.line_item_key)}
          >
            ▼
          </span>
        </span>
        {isOver && canDrop && <span className="ops-drop-hint">Drop here</span>}
        <div className="ops-category-actions">
          <button
            type="button"
            className="ops-action-btn ops-action-add"
            onClick={(e) => { e.stopPropagation(); onAddClick(); }}
            title="Add expense item"
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
          {hasSelectedChildren && (
            <button
              type="button"
              className="ops-action-btn ops-action-delete"
              onClick={(e) => { e.stopPropagation(); onDeleteClick(); }}
              title="Delete selected items"
            >
              <MinusIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="ops-cell num">
        {showParentTotals ? <span className="ops-calc">{renderCurrency(rowPerUnit)}</span> : null}
      </div>
      <div className="ops-cell num">
        {showParentTotals ? '—' : null}
      </div>
      <div className="ops-cell num ops-calc">
        {showParentTotals ? renderCurrency(row.as_is.total) : ''}
      </div>
      <div className="ops-cell num ops-calc">
        {showParentTotals ? renderPerSF(rowPerSF) : ''}
      </div>
      <div className="ops-cell num ops-col-ltl"></div>
      <div className="ops-cell num ops-col-post">
        {valueAddEnabled && showParentTotals ? <span className="ops-calc">{renderCurrency(rowPostRenoPerUnit)}</span> : null}
      </div>
      <div className="ops-cell num ops-calc ops-col-reno">
        {valueAddEnabled && showParentTotals ? renderCurrency(row.post_reno?.total) : ''}
      </div>
    </div>
  );
}

interface InlineAddRowProps {
  parentCategory: string;
  unitCount: number;
  totalSF: number;
  valueAddEnabled: boolean;
  categoryOptions: CategoryOption[];
  isLoadingCategories: boolean;
  onSave: (expense: { expense_category: string; unit_amount: number | null }) => void;
  onCancel: () => void;
}

function InlineAddRow({
  parentCategory,
  unitCount,
  totalSF,
  valueAddEnabled,
  categoryOptions,
  isLoadingCategories,
  onSave,
  onCancel
}: InlineAddRowProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [unitAmount, setUnitAmount] = useState<number | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the select/input when mounted
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const annualTotal = unitAmount && unitCount > 0 ? unitAmount * unitCount : null;
  const perSF = annualTotal && totalSF > 0 ? annualTotal / totalSF : null;

  const handleSave = () => {
    const expenseName = showCustomInput ? customName.trim() : selectedCategory;
    if (!expenseName) return;
    onSave({
      expense_category: expenseName,
      unit_amount: unitAmount
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const hasSubcategories = categoryOptions.length > 0;

  return (
    <div className="ops-row ops-child-row ops-add-row">
      <div className="ops-cell ops-add-cell">
        {isLoadingCategories ? (
          <span className="ops-loading-text">Loading...</span>
        ) : hasSubcategories && !showCustomInput ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="ops-add-select"
            value={selectedCategory}
            onChange={(e) => {
              if (e.target.value === '__custom__') {
                setShowCustomInput(true);
                setSelectedCategory('');
              } else {
                setSelectedCategory(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
          >
            <option value="">Select expense type...</option>
            {categoryOptions.map(opt => (
              <option key={opt.category_id} value={opt.category_name}>
                {opt.category_name}
              </option>
            ))}
            <option value="__custom__">+ Add custom...</option>
          </select>
        ) : (
          <input
            ref={inputRef}
            type="text"
            className="ops-add-input"
            placeholder="Enter expense name..."
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        )}
      </div>
      <div className="ops-cell ops-input-cell">
        <InputCell
          value={unitAmount}
          variant="as-is"
          format="currency"
          className="ops-input-compact"
          onChange={setUnitAmount}
        />
      </div>
      <div className="ops-cell num">—</div>
      <div className="ops-cell num ops-calc">
        {renderCurrency(annualTotal)}
      </div>
      <div className="ops-cell num ops-calc">
        {renderPerSF(perSF)}
      </div>
      <div className="ops-cell num ops-col-ltl">
        <div className="ops-add-actions">
          <button
            type="button"
            className="ops-add-save-btn"
            onClick={handleSave}
            disabled={!(showCustomInput ? customName.trim() : selectedCategory)}
          >
            Save
          </button>
          <button
            type="button"
            className="ops-add-cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
      <div className="ops-cell num ops-col-post">
        {valueAddEnabled ? '—' : null}
      </div>
      <div className="ops-cell num ops-calc ops-col-reno">
        {valueAddEnabled ? '—' : null}
      </div>
    </div>
  );
}

export function OperatingStatement({
  rentalRows,
  vacancyRows,
  otherIncomeRows,
  opexRows,
  unitCount,
  totalSF,
  grossPotentialRent,
  effectiveGrossIncome,
  asIsNOI,
  postRenoNOI,
  valueAddEnabled,
  hasDetailedRentRoll,
  projectId,
  onUpdateVacancy,
  onUpdateOtherIncome,
  onUpdateOpex,
  onToggleExpand,
  onCategoryChange,
  onAddExpense,
  onDeleteExpenses,
  onItemNameChange,
  hideLossToLease = false,
  hidePostReno: hidePostRenoProp
}: OperatingStatementProps) {
  const hidePR = hidePostRenoProp ?? !valueAddEnabled;
  const [viewMode, setViewMode] = useState<ViewMode>('detail');
  const [savingItem, setSavingItem] = useState<number | null>(null);

  // Compute grid-template-columns based on visible columns
  const gridTemplateCols = [
    '200px',                    // label
    'minmax(60px, 70px)',       // units
    'minmax(90px, 100px)',      // current
    'minmax(100px, 120px)',     // annual
    'minmax(70px, 80px)',       // $/SF
    ...(hideLossToLease ? [] : ['minmax(100px, 110px)']),  // loss to lease
    ...(hidePR ? [] : ['minmax(110px, 130px)']),      // post renovation rent/mo
    ...(hidePR ? [] : ['minmax(90px, 110px)']),       // annual (reno)
  ].join(' ');

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [lastClickedRow, setLastClickedRow] = useState<number | null>(null);

  // Add row state
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Inline item name edit state
  const [editingItemNameOpexId, setEditingItemNameOpexId] = useState<number | null>(null);

  // Fetch subcategories when adding to a category
  useEffect(() => {
    if (!addingToCategory) {
      setCategoryOptions([]);
      return;
    }

    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        // Fetch subcategories filtered by parent category so the picklist
        // only shows line items relevant to the selected expense group
        const response = await fetch(
          `/api/lookups/opex-categories?parent_category=${encodeURIComponent(addingToCategory)}&flat=true`
        );
        if (response.ok) {
          const data = await response.json();
          // Lookup endpoint returns flat array directly
          setCategoryOptions(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [addingToCategory]);

  // Get all child opex_ids for a parent category
  const getChildOpexIds = useCallback((parentCategory: string): number[] => {
    const ids: number[] = [];
    const findChildren = (rows: LineItemRow[]) => {
      rows.forEach(row => {
        if (row.parent_category === parentCategory && row.opex_id && !row.is_calculated) {
          ids.push(row.opex_id);
        }
        if (row.children) {
          findChildren(row.children);
        }
      });
    };
    findChildren(opexRows);
    return ids;
  }, [opexRows]);

  // Handle row selection
  const handleRowSelect = useCallback((opexId: number, parentCategory: string, event: React.MouseEvent) => {
    // If clicking in different category, clear previous selections and select new row
    if (selectedCategory && selectedCategory !== parentCategory) {
      setSelectedRows(new Set([opexId]));
      setSelectedCategory(parentCategory);
      setLastClickedRow(opexId);
      return;
    }

    if (event.shiftKey && lastClickedRow !== null) {
      // Range select: select all rows between lastClicked and current
      const categoryIds = getChildOpexIds(parentCategory);
      const lastIndex = categoryIds.indexOf(lastClickedRow);
      const currentIndex = categoryIds.indexOf(opexId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = categoryIds.slice(start, end + 1);

        setSelectedRows(prev => {
          const next = new Set(prev);
          rangeIds.forEach(id => next.add(id));
          return next;
        });
      }
    } else {
      // Toggle selection
      setSelectedRows(prev => {
        const next = new Set(prev);
        if (next.has(opexId)) {
          next.delete(opexId);
        } else {
          next.add(opexId);
        }
        return next;
      });
    }

    setLastClickedRow(opexId);
    setSelectedCategory(parentCategory);
  }, [selectedCategory, lastClickedRow, getChildOpexIds]);

  // Handle add button click
  const handleAddClick = useCallback((parentCategory: string) => {
    setAddingToCategory(parentCategory);
  }, []);

  // Handle delete button click
  const handleDeleteClick = useCallback(async () => {
    if (selectedRows.size === 0 || !onDeleteExpenses) return;

    // Confirm deletion for multiple rows
    if (selectedRows.size > 1) {
      const confirmed = window.confirm(
        `Delete ${selectedRows.size} expense items?`
      );
      if (!confirmed) return;
    }

    try {
      await onDeleteExpenses(Array.from(selectedRows));
      setSelectedRows(new Set());
      setSelectedCategory(null);
    } catch (error) {
      console.error('Failed to delete expenses:', error);
    }
  }, [selectedRows, onDeleteExpenses]);

  // Handle save new expense
  const handleSaveNewExpense = useCallback(async (expense: { expense_category: string; unit_amount: number | null }) => {
    if (!addingToCategory || !onAddExpense) return;

    try {
      await onAddExpense({
        expense_category: expense.expense_category,
        parent_category: addingToCategory,
        unit_amount: expense.unit_amount
      });
      setAddingToCategory(null);
    } catch (error) {
      console.error('Failed to add expense:', error);
    }
  }, [addingToCategory, onAddExpense]);

  // Handle starting item name edit (double-click)
  const handleStartEditItemName = useCallback((opexId: number) => {
    setEditingItemNameOpexId(opexId);
    // Clear selection when entering edit mode
    setSelectedRows(new Set());
  }, []);

  // Handle saving item name change
  const handleSaveItemName = useCallback(async (opexId: number, categoryId: number, categoryName: string) => {
    setEditingItemNameOpexId(null);

    if (onItemNameChange) {
      setSavingItem(opexId);
      try {
        await onItemNameChange(opexId, categoryId, categoryName);
      } catch (error) {
        console.error('Failed to update item name:', error);
      } finally {
        setSavingItem(null);
      }
    }
  }, [onItemNameChange]);

  // Handle canceling item name edit
  const handleCancelEditItemName = useCallback(() => {
    setEditingItemNameOpexId(null);
  }, []);

  const sumRowsRecursive = (items: LineItemRow[]): { as_is_total: number; post_reno_total: number } => {
    return items.reduce(
      (acc, row) => {
        if (row.children && row.children.length > 0) {
          const childTotals = sumRowsRecursive(row.children);
          return {
            as_is_total: acc.as_is_total + childTotals.as_is_total,
            post_reno_total: acc.post_reno_total + childTotals.post_reno_total
          };
        }
        return {
          as_is_total: acc.as_is_total + (row.as_is?.total || 0),
          post_reno_total: acc.post_reno_total + (row.post_reno?.total || 0)
        };
      },
      { as_is_total: 0, post_reno_total: 0 }
    );
  };

  const expenseTotals = sumRowsRecursive(opexRows);
  const opexPerUnit = unitCount > 0 ? expenseTotals.as_is_total / unitCount : 0;
  const opexPerSF = totalSF > 0 ? expenseTotals.as_is_total / totalSF : 0;
  const opexPostRenoPerUnit = unitCount > 0 ? expenseTotals.post_reno_total / unitCount : 0;
  const netPerUnit = unitCount > 0 ? asIsNOI / unitCount : 0;
  const netPerSF = totalSF > 0 ? asIsNOI / totalSF : 0;

  const rentalTotals = rentalRows.reduce(
    (acc, row) => {
      const count = row.as_is.count || 0;
      const rate = row.as_is.rate || 0;
      const currentTotal = row.as_is.total || 0;
      const marketTotal = row.as_is.market_total || currentTotal;
      const lossToLease = marketTotal - currentTotal;
      const sf = row.as_is.sf || 0;
      const postRenoRate = row.post_reno?.rate || 0;
      const postRenoTotal = row.post_reno?.total || 0;
      return {
        count: acc.count + count,
        annual: acc.annual + currentTotal,
        lossToLease: acc.lossToLease + lossToLease,
        totalSF: acc.totalSF + (sf * count),
        weightedRent: acc.weightedRent + (rate * count),
        weightedPostRenoRent: acc.weightedPostRenoRent + (postRenoRate * count),
        postRenoAnnual: acc.postRenoAnnual + postRenoTotal
      };
    },
    { count: 0, annual: 0, lossToLease: 0, totalSF: 0, weightedRent: 0, weightedPostRenoRent: 0, postRenoAnnual: 0 }
  );

  const avgCurrentRent = rentalTotals.count > 0 ? rentalTotals.weightedRent / rentalTotals.count : 0;
  const avgRentPerSF = rentalTotals.totalSF > 0 ? rentalTotals.annual / rentalTotals.totalSF : (totalSF > 0 ? rentalTotals.annual / totalSF : 0);
  const avgPostRenoRent = rentalTotals.count > 0 ? rentalTotals.weightedPostRenoRent / rentalTotals.count : 0;

  const otherIncomeTotal = otherIncomeRows.reduce(
    (acc, row) => acc + (row.as_is.total || 0),
    0
  );
  const potentialGrossIncome = rentalTotals.annual + otherIncomeTotal;

  const handleDrop = useCallback(async (item: DragItem, targetCategory: string) => {
    if (!onCategoryChange || !item.opex_id) return;

    setSavingItem(item.opex_id);
    try {
      await onCategoryChange(item.opex_id, targetCategory, item.label);
    } catch (error) {
      console.error('Failed to update category:', error);
    } finally {
      setSavingItem(null);
    }
  }, [onCategoryChange]);

  const flattenRows = (items: LineItemRow[], parentKey = ''): Array<LineItemRow & { _uniqueKey: string }> => {
    const result: Array<LineItemRow & { _uniqueKey: string }> = [];
    items.forEach((row, idx) => {
      const uniqueKey = parentKey ? `${parentKey}_${row.line_item_key}_${idx}` : `${row.line_item_key}_${idx}`;

      if (viewMode === 'summary') {
        if (row.is_calculated) {
          result.push({ ...row, _uniqueKey: uniqueKey, is_expanded: false });
        }
        return;
      }

      result.push({ ...row, _uniqueKey: uniqueKey });
      if (row.children && row.is_expanded !== false) {
        result.push(...flattenRows(row.children, uniqueKey));
      }
    });
    return result;
  };

  const displayOpexRows = flattenRows(opexRows);

  // Check if a category has selected children
  const categoryHasSelectedChildren = (parentCategory: string): boolean => {
    return selectedCategory === parentCategory && selectedRows.size > 0;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="ops-statement-scroll">
        <div
          className={`ops-statement-grid${hideLossToLease ? ' ops-hide-ltl' : ''}${hidePR ? ' ops-hide-post' : ''}`}
          style={{ gridTemplateColumns: gridTemplateCols }}
        >
          {/* Group header row — only visible when post-reno columns shown */}
          {!hidePR && (
            <div className="ops-row ops-header-group-row">
              <div className="ops-header-group-spacer" />
              <div className="ops-header-group-spacer" />
              <div className="ops-header-group-spacer" />
              <div className="ops-header-group-spacer" />
              <div className="ops-header-group-spacer" />
              {!hideLossToLease && <div className="ops-header-group-spacer ops-col-ltl" />}
              <div className="ops-header-group-span ops-col-post" style={{ gridColumn: 'span 2' }}>
                Post Renovation
              </div>
            </div>
          )}
          {/* Column header row */}
          <div className="ops-row ops-header-row">
            <div className="ops-cell ops-header-cell">Revenue</div>
            <div className="ops-cell ops-header-cell num">Units</div>
            <div className="ops-cell ops-header-cell num">Rent/Mo</div>
            <div className="ops-cell ops-header-cell num">Annual</div>
            <div className="ops-cell ops-header-cell num">$/SF</div>
            <div className="ops-cell ops-header-cell num ops-col-ltl">Loss to Lease</div>
            <div className="ops-cell ops-header-cell num ops-col-post">Rent / Mo</div>
            <div className="ops-cell ops-header-cell num ops-col-reno">Annual</div>
          </div>

          {rentalRows.map((row) => {
            const currentRate = row.as_is.rate || 0;
            const currentTotal = row.as_is.total || 0;
            const marketTotal = row.as_is.market_total || currentTotal;
            const lossToLease = marketTotal - currentTotal;
            const perSF = row.as_is.per_sf;
            const postRenoRate = row.post_reno?.rate || 0;
            const postRenoTotal = row.post_reno?.total || 0;

            return (
              <div key={row.line_item_key} className="ops-row ops-child-row ops-income-item">
                <div className="ops-cell">{row.label}</div>
                <div className="ops-cell num">{row.as_is.count ? row.as_is.count : '—'}</div>
                <div className="ops-cell num">{currentRate > 0 ? formatCurrency(currentRate) : '—'}</div>
                <div className="ops-cell num ops-calc font-semibold">{currentTotal > 0 ? formatCurrency(currentTotal) : '—'}</div>
                <div className="ops-cell num">{perSF ? formatPerSF(perSF) : '—'}</div>
                <div className="ops-cell num ops-loss-to-lease ops-col-ltl">{lossToLease > 0 ? formatCurrency(lossToLease) : '—'}</div>
                <div className="ops-cell num ops-col-post">{valueAddEnabled ? (postRenoRate > 0 ? formatCurrency(postRenoRate) : '—') : null}</div>
                <div className="ops-cell num ops-col-reno">{valueAddEnabled ? (postRenoTotal > 0 ? formatCurrency(postRenoTotal) : '—') : null}</div>
              </div>
            );
          })}

          {otherIncomeRows.length > 0 && (
            <>
              <div className="ops-row ops-section-row">
                <div className="ops-cell ops-section-cell">
                  <span>Other Income</span>
                </div>
                <div className="ops-cell ops-section-fill"></div>
                <div className="ops-cell ops-section-fill"></div>
                <div className="ops-cell ops-section-fill"></div>
                <div className="ops-cell ops-section-fill"></div>
                <div className="ops-cell ops-section-fill ops-col-ltl"></div>
                <div className="ops-cell ops-section-fill ops-col-post"></div>
                <div className="ops-cell ops-section-fill ops-col-reno"></div>
              </div>

              <div className="ops-row ops-parent-row">
                <div className="ops-cell">Other Income</div>
                <div className="ops-cell num">—</div>
                <div className="ops-cell num">—</div>
                <div className="ops-cell num ops-calc font-semibold">{formatCurrency(otherIncomeTotal)}</div>
                <div className="ops-cell num">—</div>
                <div className="ops-cell num ops-col-ltl">—</div>
                <div className="ops-cell num ops-col-post">{valueAddEnabled ? '—' : null}</div>
                <div className="ops-cell num ops-col-reno">{valueAddEnabled ? '—' : null}</div>
              </div>

              {otherIncomeRows.map((row) => {
                const isParent = row.is_calculated;
                const postRenoRate = row.post_reno?.rate || 0;
                const postRenoTotal = row.post_reno?.total || 0;

                return (
                  <div key={row.line_item_key} className="ops-row ops-child-row">
                    <div className="ops-cell">{row.label}</div>
                    <div className={`ops-cell ${isParent ? 'num' : 'ops-input-cell'}`}>
                      {isParent ? (
                        <span className="ops-calc">—</span>
                      ) : onUpdateOtherIncome ? (
                        <InputCell
                          value={row.as_is.rate}
                          variant="as-is"
                          format="currency"
                          className="ops-input-compact"
                          onChange={(val) => onUpdateOtherIncome(row.line_item_key, 'as_is_rate', val)}
                        />
                      ) : (
                        formatCurrency(row.as_is.rate || 0)
                      )}
                    </div>
                    <div className="ops-cell num">—</div>
                    <div className="ops-cell num ops-calc font-semibold">{(row.as_is.total || 0) > 0 ? formatCurrency(row.as_is.total || 0) : '—'}</div>
                    <div className="ops-cell num">—</div>
                    <div className="ops-cell num ops-col-ltl">—</div>
                    <div className="ops-cell num ops-col-post">
                      {valueAddEnabled ? (
                        isParent ? '—' : (
                          onUpdateOtherIncome ? (
                            <InputCell
                              value={postRenoRate}
                              variant="post-reno"
                              format="currency"
                              onChange={(val) => onUpdateOtherIncome(row.line_item_key, 'post_reno_rate', val)}
                            />
                          ) : formatCurrency(postRenoRate)
                        )
                      ) : null}
                    </div>
                    <div className="ops-cell num ops-col-reno">
                      {valueAddEnabled ? (postRenoTotal > 0 ? formatCurrency(postRenoTotal) : '—') : null}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          <div className="ops-row ops-egi-row">
            <div className="ops-cell font-bold">Potential Rental Income</div>
            <div className="ops-cell num font-semibold">{rentalTotals.count}</div>
            <div className="ops-cell num font-semibold">{avgCurrentRent > 0 ? formatCurrency(avgCurrentRent) : '—'}</div>
            <div className="ops-cell num font-bold ops-positive">{formatCurrency(potentialGrossIncome)}</div>
            <div className="ops-cell num font-semibold">{avgRentPerSF > 0 ? formatPerSF(avgRentPerSF) : '—'}</div>
            <div className="ops-cell num ops-loss-to-lease ops-col-ltl">{rentalTotals.lossToLease > 0 ? formatCurrency(rentalTotals.lossToLease) : '—'}</div>
            <div className="ops-cell num ops-col-post">{valueAddEnabled ? (avgPostRenoRent > 0 ? formatCurrency(avgPostRenoRent) : '—') : null}</div>
            <div className="ops-cell num ops-col-reno">{valueAddEnabled ? (rentalTotals.postRenoAnnual > 0 ? formatCurrency(rentalTotals.postRenoAnnual) : '—') : null}</div>
          </div>

          <div className="ops-row ops-section-row ops-vacancy-header">
            <div className="ops-cell ops-section-cell">
              <span>Less: Vacancy &amp; Deductions</span>
            </div>
            <div className="ops-cell ops-section-fill"></div>
            <div className="ops-cell ops-section-fill"></div>
            <div className="ops-cell ops-section-fill"></div>
            <div className="ops-cell ops-section-fill"></div>
            <div className="ops-cell ops-section-fill ops-col-ltl"></div>
            <div className="ops-cell ops-section-fill ops-col-post"></div>
            <div className="ops-cell ops-section-fill ops-col-reno"></div>
          </div>

          {vacancyRows.map((row) => {
            const rate = row.as_is.rate || 0;
            const amount = row.as_is.total || 0;
            const isPercentage = row.is_percentage;
            const isReadOnly = row.is_readonly || (row.line_item_key === 'physical_vacancy' && hasDetailedRentRoll);
            const postRenoRate = row.post_reno?.rate || 0;
            const postRenoTotal = row.post_reno?.total || 0;
            const perSF = totalSF > 0 ? (Math.abs(amount) / 12) / totalSF : 0;
            const vacancyLossToLease = valueAddEnabled ? Math.abs(amount) - Math.abs(postRenoTotal) : 0;

            return (
              <div key={row.line_item_key} className="ops-row ops-child-row ops-vacancy-item">
                <div className="ops-cell">
                  <span className="ops-label-inline">
                    {row.label}
                    {isReadOnly && (
                      <span className="ops-lock">
                        <LockClosedIcon className="w-3 h-3" />
                      </span>
                    )}
                  </span>
                </div>
                <div className={`ops-cell ${isReadOnly ? 'num' : 'ops-input-cell'}`}>
                  {isReadOnly ? (
                    <span>{formatPercent(rate)}</span>
                  ) : onUpdateVacancy ? (
                    <InputCell
                      value={rate}
                      variant="as-is"
                      format={isPercentage ? 'percent' : 'currency'}
                      onChange={(val) => onUpdateVacancy(row.line_item_key, 'as_is_rate', val)}
                      className="ops-input-compact"
                    />
                  ) : (
                    formatPercent(rate)
                  )}
                </div>
                <div className="ops-cell num ops-vacancy-value">{rate > 0 ? `(${formatCurrency(Math.abs(rate * grossPotentialRent / 12))})` : '—'}</div>
                <div className="ops-cell num ops-vacancy-value font-semibold">{amount !== 0 ? `(${formatCurrency(Math.abs(amount))})` : '—'}</div>
                <div className="ops-cell num ops-vacancy-value">{perSF > 0 ? `(${formatPerSF(perSF)})` : '—'}</div>
                <div className="ops-cell num ops-loss-to-lease ops-col-ltl">{vacancyLossToLease > 0 ? formatCurrency(vacancyLossToLease) : '—'}</div>
                <div className="ops-cell num ops-col-post">
                  {valueAddEnabled ? (
                    onUpdateVacancy ? (
                      <InputCell
                        value={postRenoRate}
                        variant="post-reno"
                        format={isPercentage ? 'percent' : 'currency'}
                        onChange={(val) => onUpdateVacancy(row.line_item_key, 'post_reno_rate', val)}
                        className="ops-input-compact"
                      />
                    ) : (
                      formatPercent(postRenoRate)
                    )
                  ) : null}
                </div>
                <div className="ops-cell num ops-vacancy-value font-semibold ops-col-reno">
                  {valueAddEnabled ? (postRenoTotal !== 0 ? `(${formatCurrency(Math.abs(postRenoTotal))})` : '—') : null}
                </div>
              </div>
            );
          })}

          <div className="ops-row ops-egi-row">
            <div className="ops-cell font-bold">Effective Gross Income</div>
            <div className="ops-cell num font-semibold">{rentalTotals.count}</div>
            <div className="ops-cell num font-semibold">—</div>
            <div className="ops-cell num font-bold ops-positive">{formatCurrency(effectiveGrossIncome)}</div>
            <div className="ops-cell num font-semibold">—</div>
            <div className="ops-cell num ops-loss-to-lease ops-col-ltl">{rentalTotals.lossToLease > 0 ? formatCurrency(rentalTotals.lossToLease) : '—'}</div>
            <div className="ops-cell num ops-col-post">{valueAddEnabled ? '—' : null}</div>
            <div className="ops-cell num ops-col-reno">{valueAddEnabled ? '—' : null}</div>
          </div>

          <div className="ops-row ops-section-row ops-expense-header">
            <div className="ops-cell ops-section-cell">
              <span>Expenses and Reserves</span>
            </div>
            <div className="ops-cell ops-section-fill"></div>
            <div className="ops-cell ops-section-fill"></div>
            <div className="ops-cell ops-section-fill"></div>
            <div className="ops-cell ops-section-fill"></div>
            <div className="ops-cell ops-section-controls-cell ops-col-ltl">
              <div className="ops-section-controls">
                <span className="ops-section-hint">Click rows to select, drag to recategorize</span>
                <DetailSummaryToggle value={viewMode} onChange={setViewMode} />
              </div>
            </div>
            <div className="ops-cell ops-section-fill ops-col-post"></div>
            <div className="ops-cell ops-section-fill ops-col-reno"></div>
          </div>

          {displayOpexRows.map((row) => {
            const isParent = row.is_calculated;
            const parentCategory = row.parent_category || 'unclassified';

            if (isParent) {
              return (
                <React.Fragment key={row._uniqueKey}>
                  <DroppableParentRow
                    row={row}
                    unitCount={unitCount}
                    totalSF={totalSF}
                    valueAddEnabled={valueAddEnabled}
                    showParentTotals={row.is_expanded === false}
                    hasSelectedChildren={categoryHasSelectedChildren(parentCategory)}
                    onDrop={handleDrop}
                    onToggleExpand={onToggleExpand}
                    onAddClick={() => handleAddClick(parentCategory)}
                    onDeleteClick={handleDeleteClick}
                  />
                  {addingToCategory === parentCategory && row.is_expanded !== false && (
                    <InlineAddRow
                      parentCategory={parentCategory}
                      unitCount={unitCount}
                      totalSF={totalSF}
                      valueAddEnabled={valueAddEnabled}
                      categoryOptions={categoryOptions}
                      isLoadingCategories={isLoadingCategories}
                      onSave={handleSaveNewExpense}
                      onCancel={() => setAddingToCategory(null)}
                    />
                  )}
                </React.Fragment>
              );
            }

            return (
              <SelectableExpenseRow
                key={row._uniqueKey}
                row={row}
                unitCount={unitCount}
                totalSF={totalSF}
                valueAddEnabled={valueAddEnabled}
                isSelected={row.opex_id ? selectedRows.has(row.opex_id) : false}
                isEditingName={row.opex_id === editingItemNameOpexId}
                onSelect={(opexId, event) => handleRowSelect(opexId, parentCategory, event)}
                onUpdateRow={onUpdateOpex || (() => undefined)}
                onStartEditName={handleStartEditItemName}
                onSaveItemName={handleSaveItemName}
                onCancelEditName={handleCancelEditItemName}
              />
            );
          })}

          <div className="ops-row ops-subtotal-row">
            <div className="ops-cell">Total Operating Expenses</div>
            <div className="ops-cell num ops-negative">({renderCurrency(opexPerUnit)})</div>
            <div className="ops-cell num">—</div>
            <div className="ops-cell num ops-negative font-semibold">({renderCurrency(expenseTotals.as_is_total)})</div>
            <div className="ops-cell num ops-calc">{renderPerSF(opexPerSF)}</div>
            <div className="ops-cell num ops-col-ltl"></div>
            <div className="ops-cell num ops-negative ops-col-post">{valueAddEnabled ? `(${renderCurrency(opexPostRenoPerUnit)})` : null}</div>
            <div className="ops-cell num ops-negative font-semibold ops-col-reno">{valueAddEnabled ? `(${renderCurrency(expenseTotals.post_reno_total)})` : null}</div>
          </div>

          <div className="ops-row ops-noi-row">
            <div className="ops-cell font-bold">Net Operating Income</div>
            <div className="ops-cell num">{formatCurrency(netPerUnit)}</div>
            <div className="ops-cell num">—</div>
            <div className="ops-cell num font-bold">{formatCurrency(asIsNOI)}</div>
            <div className="ops-cell num">{formatPerSF(netPerSF)}</div>
            <div className="ops-cell num ops-col-ltl"></div>
            <div className="ops-cell num ops-col-post"></div>
            <div className="ops-cell num ops-col-reno">{valueAddEnabled ? formatCurrency(postRenoNOI) : null}</div>
          </div>
        </div>
      </div>

      {savingItem && (
        <div className="ops-saving-toast">
          <span className="animate-spin">⟳</span>
          Saving category...
        </div>
      )}
    </DndProvider>
  );
}

export default OperatingStatement;
