'use client';

import React, { useState, useRef, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SectionCard } from './SectionCard';
import { DetailSummaryToggle, ViewMode } from './DetailSummaryToggle';
import { InputCell } from './InputCell';
import { EvidenceCell } from './EvidenceCell';
import { GrowthBadge, FeeBadge } from './GrowthBadge';
import { AddButton } from './AddButton';
import { LineItemRow, formatCurrency, formatPerSF } from './types';

const DRAG_TYPE = 'opex_item';

interface DragItem {
  opex_id: number;
  label: string;
  line_item_key: string;
  source_category: string;
}

// Parent category metadata (exported for potential future use)
export const PARENT_CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: 'taxes_insurance', label: 'Taxes & Insurance', color: '#3b82f6' },
  { key: 'utilities', label: 'Utilities', color: '#10b981' },
  { key: 'repairs_maintenance', label: 'Repairs & Maintenance', color: '#f59e0b' },
  { key: 'payroll_personnel', label: 'Payroll & Personnel', color: '#8b5cf6' },
  { key: 'administrative', label: 'Administrative', color: '#ec4899' },
  { key: 'management', label: 'Management', color: '#06b6d4' },
  { key: 'other', label: 'Other Expenses', color: '#6b7280' },
  { key: 'unclassified', label: 'Unclassified', color: '#ef4444' },
];

interface DraggableExpenseRowProps {
  row: LineItemRow & { _uniqueKey: string };
  unitCount: number;
  totalSF: number;
  valueAddEnabled: boolean;
  availableScenarios: string[];
  preferredScenario: string;
  extraScenarios: string[];
  evidenceExpanded: boolean;
  onUpdateRow: (lineItemKey: string, field: string, value: number | null) => void;
  onToggleExpand?: (lineItemKey: string) => void;
  onAddItem?: (parentKey?: string) => void;
}

function DraggableExpenseRow({
  row,
  unitCount,
  totalSF,
  valueAddEnabled,
  availableScenarios,
  preferredScenario,
  extraScenarios,
  evidenceExpanded,
  onUpdateRow,
  onToggleExpand,
  onAddItem
}: DraggableExpenseRowProps) {
  const ref = useRef<HTMLTableRowElement>(null);

  const isParent = row.is_calculated;
  const isDraggable = row.is_draggable && !isParent;
  const isUnclassifiedSection = row.is_unclassified_section;

  // Check if row is a percentage-based item (like management fee)
  const isPercentageBased = (r: LineItemRow) => {
    return r.is_percentage || r.calculation_base === 'egi';
  };

  const isPercent = isPercentageBased(row);

  // Calculate per-unit and per-SF for this row
  const rowPerUnit = unitCount > 0 && row.as_is.total
    ? row.as_is.total / unitCount
    : row.as_is.rate;
  const rowPerSF = totalSF > 0 && row.as_is.total
    ? row.as_is.total / totalSF
    : null;
  const postRenoRowPerUnit = unitCount > 0 && row.post_reno?.total
    ? row.post_reno.total / unitCount
    : row.post_reno?.rate;

  // Parent rows only show totals when collapsed
  const isCollapsed = row.is_expanded === false;
  const showParentTotals = isParent && isCollapsed;

  // Setup drag
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DRAG_TYPE,
    item: {
      opex_id: row.opex_id,
      label: row.label,
      line_item_key: row.line_item_key,
      source_category: row.parent_category || 'unclassified'
    } as DragItem,
    canDrag: isDraggable,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }), [row.opex_id, row.label, row.line_item_key, row.parent_category, isDraggable]);

  // Apply drag ref only if draggable
  if (isDraggable) {
    drag(ref);
  }

  // Determine row styling
  let rowClass = isParent ? 'ops-parent-row' : (row.level > 0 ? 'ops-child-row' : '');
  if (isDraggable) {
    rowClass += ' draggable-opex-row';
  }
  if (isDragging) {
    rowClass += ' dragging';
  }
  if (isUnclassifiedSection) {
    rowClass += ' unclassified-section';
  }

  return (
    <tr
      ref={ref}
      className={rowClass}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDraggable ? 'grab' : 'default',
        backgroundColor: isUnclassifiedSection ? 'rgba(239, 68, 68, 0.08)' : undefined
      }}
    >
      <td>
        {isParent && (
          <>
            <span
              className={`ops-expand-icon ${isCollapsed ? 'collapsed' : ''}`}
              onClick={() => onToggleExpand?.(row.line_item_key)}
            >
              ▼
            </span>
            {isUnclassifiedSection && (
              <span className="unclassified-badge" style={{
                backgroundColor: '#ef4444',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                marginRight: '6px'
              }}>
                NEEDS REVIEW
              </span>
            )}
            {row.label}
            {onAddItem && (
              <AddButton
                label="Add"
                onClick={() => onAddItem(row.line_item_key)}
                inline
              />
            )}
          </>
        )}
        {!isParent && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isDraggable && (
              <span style={{ cursor: 'grab', color: '#9ca3af' }} title="Drag to categorize">
                ⋮⋮
              </span>
            )}
            {row.label}
          </span>
        )}
      </td>
      <td className="num">{isPercent ? '—' : (isParent && !isCollapsed ? '' : (unitCount || '—'))}</td>
      <td className="num">
        {isParent ? (
          showParentTotals ? (
            <span className="ops-calc">{formatCurrency(rowPerUnit)}</span>
          ) : null
        ) : isPercent ? (
          <InputCell
            value={row.as_is.rate}
            variant="as-is"
            format="percent"
            onChange={(val) => onUpdateRow(row.line_item_key, 'as_is_rate', val)}
          />
        ) : (
          <InputCell
            value={row.as_is.rate ?? rowPerUnit}
            variant="as-is"
            format="currency"
            onChange={(val) => onUpdateRow(row.line_item_key, 'as_is_rate', val)}
          />
        )}
      </td>
      <td className="num ops-calc">
        {isPercent ? '—' : (isParent && !isCollapsed ? '' : formatPerSF(rowPerSF))}
      </td>
      <td className="num ops-calc">
        {isParent && !isCollapsed ? '' : formatCurrency(row.as_is.total)}
      </td>
      <td className="num">
        {!isParent && (
          isPercent ? (
            <FeeBadge label="% of EGI" />
          ) : (
            <GrowthBadge
              value={row.as_is.growth_rate}
              type={row.as_is.growth_type || 'global'}
            />
          )
        )}
      </td>
      {valueAddEnabled && (
        <>
          <td className="num post-reno">
            {isParent ? (
              showParentTotals ? (
                <span className="ops-calc">{formatCurrency(postRenoRowPerUnit)}</span>
              ) : null
            ) : isPercent ? (
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
            )}
          </td>
          <td className="num post-reno ops-calc">
            {isParent && !isCollapsed ? '' : formatCurrency(row.post_reno?.total)}
          </td>
        </>
      )}
      {availableScenarios.length > 0 && (
        <td className="num evidence ops-evidence-group">
          <EvidenceCell
            value={isPercent
              ? row.evidence[preferredScenario]?.rate
              : row.evidence[preferredScenario]?.per_unit
            }
            format={isPercent ? 'percent' : 'per_unit'}
          />
        </td>
      )}
      {evidenceExpanded && extraScenarios.map(scenario => (
        <td key={scenario} className="num evidence ops-evidence-extra">
          <EvidenceCell
            value={isPercent
              ? row.evidence[scenario]?.rate
              : row.evidence[scenario]?.per_unit
            }
            format={isPercent ? 'percent' : 'per_unit'}
          />
        </td>
      ))}
    </tr>
  );
}

interface DroppableParentRowProps {
  row: LineItemRow & { _uniqueKey: string };
  unitCount: number;
  totalSF: number;
  valueAddEnabled: boolean;
  availableScenarios: string[];
  preferredScenario: string;
  extraScenarios: string[];
  evidenceExpanded: boolean;
  onDrop: (item: DragItem, targetCategory: string) => void;
  onUpdateRow: (lineItemKey: string, field: string, value: number | null) => void;
  onToggleExpand?: (lineItemKey: string) => void;
  onAddItem?: (parentKey?: string) => void;
}

function DroppableParentRow({
  row,
  unitCount,
  totalSF,
  valueAddEnabled,
  availableScenarios,
  preferredScenario,
  extraScenarios,
  evidenceExpanded,
  onDrop,
  onUpdateRow,
  onToggleExpand,
  onAddItem
}: DroppableParentRowProps) {
  const targetCategory = row.parent_category || 'unclassified';
  const isUnclassifiedSection = row.is_unclassified_section;

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: DRAG_TYPE,
    canDrop: (item: DragItem) => {
      // Can drop on any category except the source category
      // Cannot drop INTO unclassified (only drag FROM it)
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

  const isCollapsed = row.is_expanded === false;

  // Calculate totals
  const rowPerUnit = unitCount > 0 && row.as_is.total
    ? row.as_is.total / unitCount
    : row.as_is.rate;
  const postRenoRowPerUnit = unitCount > 0 && row.post_reno?.total
    ? row.post_reno.total / unitCount
    : row.post_reno?.rate;

  // Determine row styling
  let rowClass = 'ops-parent-row droppable-parent-row';
  if (isOver && canDrop) {
    rowClass += ' drop-target-active';
  } else if (canDrop) {
    rowClass += ' drop-target-available';
  }
  if (isUnclassifiedSection) {
    rowClass += ' unclassified-section';
  }

  return (
    <tr
      ref={drop}
      className={rowClass}
      style={{
        backgroundColor: isOver && canDrop
          ? 'rgba(59, 130, 246, 0.15)'
          : isUnclassifiedSection
            ? 'rgba(239, 68, 68, 0.08)'
            : undefined,
        transition: 'background-color 0.2s ease'
      }}
    >
      <td>
        <span
          className={`ops-expand-icon ${isCollapsed ? 'collapsed' : ''}`}
          onClick={() => onToggleExpand?.(row.line_item_key)}
        >
          ▼
        </span>
        {isUnclassifiedSection && (
          <span style={{
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            marginRight: '6px'
          }}>
            NEEDS REVIEW
          </span>
        )}
        {row.label}
        {isOver && canDrop && (
          <span style={{
            marginLeft: '8px',
            color: '#3b82f6',
            fontSize: '12px'
          }}>
            Drop here
          </span>
        )}
        {onAddItem && (
          <AddButton
            label="Add"
            onClick={() => onAddItem(row.line_item_key)}
            inline
          />
        )}
      </td>
      <td className="num">{isCollapsed ? unitCount || '—' : ''}</td>
      <td className="num">
        {isCollapsed ? (
          <span className="ops-calc">{formatCurrency(rowPerUnit)}</span>
        ) : null}
      </td>
      <td className="num ops-calc">
        {isCollapsed ? formatPerSF(row.as_is.total && totalSF ? row.as_is.total / totalSF : null) : ''}
      </td>
      <td className="num ops-calc">
        {isCollapsed ? formatCurrency(row.as_is.total) : ''}
      </td>
      <td className="num"></td>
      {valueAddEnabled && (
        <>
          <td className="num post-reno">
            {isCollapsed ? (
              <span className="ops-calc">{formatCurrency(postRenoRowPerUnit)}</span>
            ) : null}
          </td>
          <td className="num post-reno ops-calc">
            {isCollapsed ? formatCurrency(row.post_reno?.total) : ''}
          </td>
        </>
      )}
      {availableScenarios.length > 0 && (
        <td className="num evidence ops-evidence-group"></td>
      )}
      {evidenceExpanded && extraScenarios.map(scenario => (
        <td key={scenario} className="num evidence ops-evidence-extra"></td>
      ))}
    </tr>
  );
}

interface DraggableOpexSectionProps {
  rows: LineItemRow[];
  unitCount: number;
  totalSF: number;
  availableScenarios: string[];
  preferredScenario: string;
  valueAddEnabled: boolean;
  onUpdateRow: (lineItemKey: string, field: string, value: number | null) => void;
  onAddItem?: (parentKey?: string) => void;
  onToggleExpand?: (lineItemKey: string) => void;
  onCategoryChange?: (opexId: number, newCategory: string, label: string) => Promise<void>;
}

function DraggableOpexSectionInner({
  rows,
  unitCount,
  totalSF,
  availableScenarios,
  preferredScenario,
  valueAddEnabled,
  onUpdateRow,
  onAddItem,
  onToggleExpand,
  onCategoryChange
}: DraggableOpexSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('detail');
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);
  const [savingItem, setSavingItem] = useState<number | null>(null);

  // Calculate totals recursively
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

  const totals = sumRowsRecursive(rows);
  const asIsPerUnit = unitCount > 0 ? totals.as_is_total / unitCount : 0;
  const postRenoPerUnit = unitCount > 0 ? totals.post_reno_total / unitCount : 0;
  const asIsPerSF = totalSF > 0 ? totals.as_is_total / totalSF : 0;
  const postRenoPerSF = totalSF > 0 ? totals.post_reno_total / totalSF : 0;

  const hasExtraScenarios = availableScenarios.length > 1;
  const extraScenarios = availableScenarios.filter(s => s !== preferredScenario);

  // Flatten hierarchical rows for display with unique keys
  // In summary mode, only show parent categories (collapsed)
  // In detail mode, show parent categories with their expanded children
  const flattenRows = (items: LineItemRow[], parentKey = ''): Array<LineItemRow & { _uniqueKey: string }> => {
    const result: Array<LineItemRow & { _uniqueKey: string }> = [];
    items.forEach((row, idx) => {
      const uniqueKey = parentKey ? `${parentKey}_${row.line_item_key}_${idx}` : `${row.line_item_key}_${idx}`;

      // In summary mode, show parent rows collapsed (with totals)
      if (viewMode === 'summary') {
        if (row.is_calculated) {
          // Parent row - show it collapsed with totals
          result.push({ ...row, _uniqueKey: uniqueKey, is_expanded: false });
        }
        // Don't show children in summary mode
        return;
      }

      // Detail mode - show all rows with normal expansion
      result.push({ ...row, _uniqueKey: uniqueKey });
      if (row.children && row.is_expanded !== false) {
        result.push(...flattenRows(row.children, uniqueKey));
      }
    });
    return result;
  };

  const displayRows = flattenRows(rows);

  // Handle drop event
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

  // Check if there are any unclassified items
  const hasUnclassified = rows.some(row => row.is_unclassified_section && row.children && row.children.length > 0);

  const controls = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {hasUnclassified ? (
        <span style={{
          color: '#ef4444',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{ fontSize: '14px' }}>⚠</span>
          Drag items to classify
        </span>
      ) : (
        <span style={{
          color: 'var(--cui-secondary-color)',
          fontSize: '11px',
          opacity: 0.7
        }}>
          Drag items to recategorize
        </span>
      )}
      <DetailSummaryToggle value={viewMode} onChange={setViewMode} />
    </div>
  );

  return (
    <SectionCard
      title="Operating Expenses"
      controls={controls}
      evidenceExpanded={evidenceExpanded}
    >
      <table className="ops-table">
        <thead>
          <tr>
            <th style={{ width: '18%' }}>Expense Category</th>
            <th className="num" style={{ width: '6%' }}>Count</th>
            <th className="num" style={{ width: '9%' }}>$/Unit</th>
            <th className="num" style={{ width: '7%' }}>$/SF</th>
            <th className="num" style={{ width: '10%' }}>Total</th>
            <th className="num" style={{ width: '8%' }}>Growth</th>
            {valueAddEnabled && (
              <>
                <th className="num post-reno" style={{ width: '9%' }}>Post-Reno</th>
                <th className="num post-reno" style={{ width: '10%' }}>Reno Total</th>
              </>
            )}
            {availableScenarios.length > 0 && (
              <th
                className={`num evidence ops-evidence-group ${evidenceExpanded ? 'expanded' : ''}`}
                style={{ width: '8%' }}
                onClick={() => setEvidenceExpanded(!evidenceExpanded)}
              >
                {preferredScenario.replace('_', ' ')}
                {hasExtraScenarios && <span className="chevron">▶</span>}
              </th>
            )}
            {evidenceExpanded && extraScenarios.map(scenario => (
              <th
                key={scenario}
                className="num evidence ops-evidence-extra"
                style={{ width: '8%' }}
              >
                {scenario.replace('_', ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row) => {
            const isParent = row.is_calculated;

            if (isParent) {
              // Parent rows are drop targets
              return (
                <DroppableParentRow
                  key={row._uniqueKey}
                  row={row}
                  unitCount={unitCount}
                  totalSF={totalSF}
                  valueAddEnabled={valueAddEnabled}
                  availableScenarios={availableScenarios}
                  preferredScenario={preferredScenario}
                  extraScenarios={extraScenarios}
                  evidenceExpanded={evidenceExpanded}
                  onDrop={handleDrop}
                  onUpdateRow={onUpdateRow}
                  onToggleExpand={onToggleExpand}
                  onAddItem={onAddItem}
                />
              );
            }

            // Child rows are draggable (if they're unclassified)
            return (
              <DraggableExpenseRow
                key={row._uniqueKey}
                row={row}
                unitCount={unitCount}
                totalSF={totalSF}
                valueAddEnabled={valueAddEnabled}
                availableScenarios={availableScenarios}
                preferredScenario={preferredScenario}
                extraScenarios={extraScenarios}
                evidenceExpanded={evidenceExpanded}
                onUpdateRow={onUpdateRow}
                onToggleExpand={onToggleExpand}
                onAddItem={onAddItem}
              />
            );
          })}

          {/* Subtotal Row */}
          <tr className="ops-subtotal-row">
            <td>Total Operating Expenses</td>
            <td className="num">{unitCount}</td>
            <td className="num ops-calc">{formatCurrency(asIsPerUnit)}</td>
            <td className="num ops-calc">{formatPerSF(asIsPerSF)}</td>
            <td className="num ops-negative">({formatCurrency(totals.as_is_total)})</td>
            <td className="num"></td>
            {valueAddEnabled && (
              <>
                <td className="num post-reno ops-calc">{formatCurrency(postRenoPerUnit)}</td>
                <td className="num post-reno ops-negative">({formatCurrency(totals.post_reno_total)})</td>
              </>
            )}
            {availableScenarios.length > 0 && (
              <td className="num evidence ops-evidence-group">—</td>
            )}
            {evidenceExpanded && extraScenarios.map(scenario => (
              <td key={scenario} className="num evidence ops-evidence-extra">—</td>
            ))}
          </tr>
        </tbody>
      </table>

      {savingItem && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#1f2937',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 1000
        }}>
          <span className="animate-spin">⟳</span>
          Saving category...
        </div>
      )}
    </SectionCard>
  );
}

// Main exported component wrapped with DndProvider
export function DraggableOpexSection(props: DraggableOpexSectionProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <DraggableOpexSectionInner {...props} />
    </DndProvider>
  );
}

export default DraggableOpexSection;
