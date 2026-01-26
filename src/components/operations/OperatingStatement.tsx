'use client';

import React, { useState, useRef, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DetailSummaryToggle, ViewMode } from './DetailSummaryToggle';
import { InputCell } from './InputCell';
import { AddButton } from './AddButton';
import { LineItemRow, formatCurrency, formatPercent, formatPerSF } from './types';
import { LockClosedIcon } from '@heroicons/react/20/solid';

const DRAG_TYPE = 'opex_item';

interface DragItem {
  opex_id: number;
  label: string;
  line_item_key: string;
  source_category: string;
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
  onUpdateVacancy?: (lineItemKey: string, field: string, value: number | null) => void;
  onUpdateOtherIncome?: (lineItemKey: string, field: string, value: number | null) => void;
  onUpdateOpex?: (lineItemKey: string, field: string, value: number | null) => void;
  onToggleExpand?: (lineItemKey: string) => void;
  onCategoryChange?: (opexId: number, newCategory: string, label: string) => Promise<void>;
  onAddItem?: (parentKey?: string) => void;
}

interface DraggableExpenseRowProps {
  row: LineItemRow & { _uniqueKey: string };
  unitCount: number;
  totalSF: number;
  valueAddEnabled: boolean;
  showParentTotals: boolean;
  onUpdateRow: (lineItemKey: string, field: string, value: number | null) => void;
  onToggleExpand?: (lineItemKey: string) => void;
  onAddItem?: (parentKey?: string) => void;
}

function DraggableExpenseRow({
  row,
  unitCount,
  totalSF,
  valueAddEnabled,
  showParentTotals,
  onUpdateRow,
  onToggleExpand,
  onAddItem
}: DraggableExpenseRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isParent = row.is_calculated;
  const isDraggable = row.is_draggable && !isParent;
  const isUnclassifiedSection = row.is_unclassified_section;
  const isCollapsed = row.is_expanded === false;

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

  const parentPerUnit = unitCount > 0 && row.as_is.total
    ? row.as_is.total / unitCount
    : row.as_is.rate;
  const parentPerSF = totalSF > 0 && row.as_is.total
    ? row.as_is.total / totalSF
    : null;

  const postRenoRowPerUnit = unitCount > 0 && row.post_reno?.total
    ? row.post_reno.total / unitCount
    : row.post_reno?.rate;
  const parentPostRenoPerUnit = unitCount > 0 && row.post_reno?.total
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
    canDrag: isDraggable,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }), [row.opex_id, row.label, row.line_item_key, row.parent_category, isDraggable]);

  if (isDraggable) {
    drag(ref);
  }

  let rowClass = `ops-row ${isParent ? 'ops-parent-row' : 'ops-child-row'}`;
  if (isDraggable) rowClass += ' draggable-opex-row';
  if (isDragging) rowClass += ' dragging';
  if (isUnclassifiedSection) rowClass += ' unclassified-section';

  return (
    <div
      ref={ref}
      className={rowClass}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDraggable ? 'grab' : 'default'
      }}
    >
      <div className="ops-cell">
        {isParent && (
          <>
            <span
              className={`ops-expand-icon ${isCollapsed ? 'collapsed' : ''}`}
              onClick={() => onToggleExpand?.(row.line_item_key)}
            >
              ▼
            </span>
            {isUnclassifiedSection && (
              <span className="unclassified-badge">
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
          <span className="ops-label-inline">
            {isDraggable && (
              <span className="ops-drag-handle" title="Drag to categorize">
                ⋮⋮
              </span>
            )}
            {row.label}
          </span>
        )}
      </div>
      <div className="ops-cell num"></div>
      <div className="ops-cell num">
        {isParent ? (
          showParentTotals ? <span className="ops-calc">{renderCurrency(parentPerUnit)}</span> : null
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
      </div>
      <div className="ops-cell num ops-calc">
        {isParent ? (showParentTotals ? renderCurrency(row.as_is.total) : '') : renderCurrency(row.as_is.total)}
      </div>
      <div className="ops-cell num ops-calc">
        {isPercent ? '' : (isParent ? (showParentTotals ? renderPerSF(parentPerSF) : '') : renderPerSF(rowPerSF))}
      </div>
      <div className="ops-cell num"></div>
      <div className="ops-cell num ops-col-post">
        {valueAddEnabled ? (
          isParent ? (
            showParentTotals ? <span className="ops-calc">{renderCurrency(parentPostRenoPerUnit)}</span> : null
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
          )
        ) : null}
      </div>
      <div className="ops-cell num ops-calc ops-col-reno">
        {valueAddEnabled
          ? (isParent ? (showParentTotals ? renderCurrency(row.post_reno?.total) : '') : renderCurrency(row.post_reno?.total))
          : null}
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
  showParentTotals,
  onDrop,
  onUpdateRow,
  onToggleExpand,
  onAddItem
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
        <span
          className={`ops-expand-icon ${isCollapsed ? 'collapsed' : ''}`}
          onClick={() => onToggleExpand?.(row.line_item_key)}
        >
          ▼
        </span>
        {isUnclassifiedSection && (
          <span className="unclassified-badge">
            NEEDS REVIEW
          </span>
        )}
        {row.label}
        {isOver && canDrop && <span className="ops-drop-hint">Drop here</span>}
        {onAddItem && (
          <AddButton
            label="Add"
            onClick={() => onAddItem(row.line_item_key)}
            inline
          />
        )}
      </div>
      <div className="ops-cell num"></div>
      <div className="ops-cell num">
        {showParentTotals ? <span className="ops-calc">{renderCurrency(rowPerUnit)}</span> : null}
      </div>
      <div className="ops-cell num ops-calc">
        {showParentTotals ? renderCurrency(row.as_is.total) : ''}
      </div>
      <div className="ops-cell num ops-calc">
        {showParentTotals ? renderPerSF(rowPerSF) : ''}
      </div>
      <div className="ops-cell num"></div>
      <div className="ops-cell num ops-col-post">
        {valueAddEnabled && showParentTotals ? <span className="ops-calc">{renderCurrency(rowPostRenoPerUnit)}</span> : null}
      </div>
      <div className="ops-cell num ops-calc ops-col-reno">
        {valueAddEnabled && showParentTotals ? renderCurrency(row.post_reno?.total) : ''}
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
  onUpdateVacancy,
  onUpdateOtherIncome,
  onUpdateOpex,
  onToggleExpand,
  onCategoryChange,
  onAddItem
}: OperatingStatementProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('detail');
  const [savingItem, setSavingItem] = useState<number | null>(null);

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

  const rentalTotals = rentalRows.reduce(
    (acc, row) => {
      const count = row.as_is.count || 0;
      const currentTotal = row.as_is.total || 0;
      const marketTotal = row.as_is.market_total || currentTotal;
      const lossToLease = marketTotal - currentTotal;
      const sf = row.as_is.sf || 0;
      return {
        count: acc.count + count,
        annual: acc.annual + currentTotal,
        lossToLease: acc.lossToLease + lossToLease,
        totalSF: acc.totalSF + (sf * count)
      };
    },
    { count: 0, annual: 0, lossToLease: 0, totalSF: 0 }
  );

  const otherIncomeTotal = otherIncomeRows.reduce(
    (acc, row) => acc + (row.as_is.total || 0),
    0
  );

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
  const sourceLabel = hasDetailedRentRoll ? 'from Rent Roll' : 'from Floor Plan Matrix';

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="ops-statement-scroll">
        <div className={`ops-statement-grid ${valueAddEnabled ? '' : 'ops-hide-post'}`}>
          <div className="ops-row ops-header-row">
            <div className="ops-cell ops-header-cell">Operating Statement</div>
            <div className="ops-cell ops-header-cell num">Units</div>
            <div className="ops-cell ops-header-cell num">Current</div>
            <div className="ops-cell ops-header-cell num">Annual</div>
            <div className="ops-cell ops-header-cell num">$/SF</div>
            <div className="ops-cell ops-header-cell num">Loss to Lease</div>
            <div className="ops-cell ops-header-cell num ops-col-post">Post-Reno</div>
            <div className="ops-cell ops-header-cell num ops-col-reno">Reno Total</div>
          </div>

          <div className="ops-row ops-section-row">
            <div className="ops-cell ops-section-cell">
              <span>Rental Income</span>
              <span className="ops-section-subtle">{sourceLabel}</span>
            </div>
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
              <div key={row.line_item_key} className="ops-row ops-child-row">
                <div className="ops-cell">{row.label}</div>
                <div className="ops-cell num">{row.as_is.count ? row.as_is.count : '—'}</div>
                <div className="ops-cell num">{currentRate > 0 ? formatCurrency(currentRate) : '—'}</div>
                <div className="ops-cell num ops-calc font-semibold">{currentTotal > 0 ? formatCurrency(currentTotal) : '—'}</div>
                <div className="ops-cell num">{perSF ? formatPerSF(perSF) : '—'}</div>
                <div className="ops-cell num ops-loss-to-lease">{lossToLease > 0 ? formatCurrency(lossToLease) : '—'}</div>
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
              </div>

              <div className="ops-row ops-parent-row">
                <div className="ops-cell">Other Income</div>
                <div className="ops-cell num">—</div>
                <div className="ops-cell num">—</div>
                <div className="ops-cell num ops-calc font-semibold">{formatCurrency(otherIncomeTotal)}</div>
                <div className="ops-cell num">—</div>
                <div className="ops-cell num">—</div>
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
                    <div className="ops-cell num">—</div>
                    <div className="ops-cell num">
                      {isParent ? (
                        <span className="ops-calc">—</span>
                      ) : onUpdateOtherIncome ? (
                        <InputCell
                          value={row.as_is.rate}
                          variant="as-is"
                          format="currency"
                          onChange={(val) => onUpdateOtherIncome(row.line_item_key, 'as_is_rate', val)}
                        />
                      ) : (
                        formatCurrency(row.as_is.rate || 0)
                      )}
                    </div>
                    <div className="ops-cell num ops-calc font-semibold">{(row.as_is.total || 0) > 0 ? formatCurrency(row.as_is.total || 0) : '—'}</div>
                    <div className="ops-cell num">—</div>
                    <div className="ops-cell num">—</div>
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

          <div className="ops-row ops-section-row">
            <div className="ops-cell ops-section-cell">
              <span>Less: Vacancy &amp; Deductions</span>
            </div>
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
              <div key={row.line_item_key} className="ops-row ops-child-row">
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
                <div className="ops-cell num ops-loss-to-lease">{vacancyLossToLease > 0 ? formatCurrency(vacancyLossToLease) : '—'}</div>
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

          <div className="ops-row ops-total-row">
            <div className="ops-cell font-bold">Effective Gross Income</div>
            <div className="ops-cell num font-semibold">{rentalTotals.count}</div>
            <div className="ops-cell num font-semibold">—</div>
            <div className="ops-cell num font-bold ops-positive">{formatCurrency(effectiveGrossIncome)}</div>
            <div className="ops-cell num font-semibold">—</div>
            <div className="ops-cell num ops-loss-to-lease">{rentalTotals.lossToLease > 0 ? formatCurrency(rentalTotals.lossToLease) : '—'}</div>
            <div className="ops-cell num ops-col-post">{valueAddEnabled ? '—' : null}</div>
            <div className="ops-cell num ops-col-reno">{valueAddEnabled ? '—' : null}</div>
          </div>

          <div className="ops-row ops-section-row">
            <div className="ops-cell ops-section-cell">
              <span>Operating Expenses</span>
              <div className="ops-section-controls">
                <span className="ops-section-hint">Drag items to recategorize</span>
                <DetailSummaryToggle value={viewMode} onChange={setViewMode} />
              </div>
            </div>
          </div>

          {displayOpexRows.map((row) => {
            const isParent = row.is_calculated;
            if (isParent) {
              return (
                <DroppableParentRow
                  key={row._uniqueKey}
                  row={row}
                  unitCount={unitCount}
                  totalSF={totalSF}
                  valueAddEnabled={valueAddEnabled}
                  showParentTotals={row.is_expanded === false}
                  onDrop={handleDrop}
                  onUpdateRow={onUpdateOpex || (() => undefined)}
                  onToggleExpand={onToggleExpand}
                  onAddItem={onAddItem}
                />
              );
            }

            return (
              <DraggableExpenseRow
                key={row._uniqueKey}
                row={row}
                unitCount={unitCount}
                totalSF={totalSF}
                valueAddEnabled={valueAddEnabled}
                showParentTotals={row.is_calculated && row.is_expanded === false}
                onUpdateRow={onUpdateOpex || (() => undefined)}
                onToggleExpand={onToggleExpand}
                onAddItem={onAddItem}
              />
            );
          })}

          <div className="ops-row ops-subtotal-row">
            <div className="ops-cell">Total Operating Expenses</div>
            <div className="ops-cell num"></div>
            <div className="ops-cell num ops-negative">({renderCurrency(opexPerUnit)})</div>
            <div className="ops-cell num ops-negative font-semibold">({renderCurrency(expenseTotals.as_is_total)})</div>
            <div className="ops-cell num ops-calc">{renderPerSF(opexPerSF)}</div>
            <div className="ops-cell num"></div>
            <div className="ops-cell num ops-negative ops-col-post">{valueAddEnabled ? `(${renderCurrency(opexPostRenoPerUnit)})` : null}</div>
            <div className="ops-cell num ops-negative font-semibold ops-col-reno">{valueAddEnabled ? `(${renderCurrency(expenseTotals.post_reno_total)})` : null}</div>
          </div>

          <div className="ops-row ops-noi-row">
            <div className="ops-cell font-bold">Net Operating Income</div>
            <div className="ops-cell num"></div>
            <div className="ops-cell num"></div>
            <div className="ops-cell num font-bold">{formatCurrency(asIsNOI)}</div>
            <div className="ops-cell num"></div>
            <div className="ops-cell num"></div>
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
