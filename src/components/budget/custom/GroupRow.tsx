// Group Row - Parent category row with subtotal and expand/collapse
// v1.2 · 2025-11-03 · Added reconciliation support and enhanced tooltips

'use client';

import React from 'react';
import { CButton } from '@coreui/react';
import { formatMoney } from '@/utils/formatters/number';
import type { BudgetMode } from '../ModeSelector';
import type { CategoryVariance } from '@/hooks/useBudgetVariance';

interface GroupRowProps {
  categoryLevel: number;
  categoryId: number;
  categoryName: string;
  categoryBreadcrumb: string;
  amountSubtotal: number;
  childCount: number;
  descendantDepth: number;
  isExpanded: boolean;
  onToggle: () => void;
  mode: BudgetMode;
  variance?: CategoryVariance;
  onAddItem?: () => void;
}

const LEVEL_COLORS = {
  1: 'var(--cui-primary)', // Blue
  2: 'var(--cui-success)', // Green
  3: 'var(--cui-warning)', // Yellow/Amber
  4: 'var(--cui-danger)', // Red
};

export default function GroupRow({
  categoryLevel,
  categoryId,
  categoryName,
  categoryBreadcrumb,
  amountSubtotal,
  childCount,
  descendantDepth,
  isExpanded,
  onToggle,
  mode,
  variance,
  onAddItem,
}: GroupRowProps) {
  // Calculate indentation based on level (starting at 0px for L1)
  const indentPx = (categoryLevel - 1) * 8;

  // Determine column count based on mode
  // Napkin: 8 columns, Standard: 9 columns, Detail: 11 columns
  const totalColumns = mode === 'napkin' ? 8 : mode === 'standard' ? 9 : 11;

  // Amount column is always second to last in napkin mode, and varies in others
  // We'll use a simple approach: show breadcrumb in first cell, subtotal in specific position

  const levelColor = LEVEL_COLORS[categoryLevel as keyof typeof LEVEL_COLORS] || 'var(--cui-secondary)';

  // Format variance display
  const formatVarianceDisplay = () => {
    if (!variance || !variance.has_children) {
      return {
        text: 'N/A',
        colorClass: 'text-muted',
        title: variance ? 'No child categories to compare' : 'Variance data unavailable',
      };
    }

    const amount = variance.variance_amount;
    const pct = variance.variance_pct;

    // Format amount
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));

    // Format percentage
    const formattedPct = pct !== null ? `${Math.abs(pct).toFixed(1)}%` : '';

    // Determine color and prefix
    let colorClass = 'text-muted';
    let prefix = '';

    if (variance.is_reconciled) {
      colorClass = 'text-success';
      prefix = amount >= 0 ? '+' : '-';
    } else if (amount > 0) {
      colorClass = 'text-warning';
      prefix = '+';
    } else if (amount < 0) {
      colorClass = 'text-danger';
      prefix = '-';
    }

    const text = formattedPct
      ? `${prefix}${formattedAmount} (${formattedPct})`
      : `${prefix}${formattedAmount}`;

    const title = variance.is_reconciled
      ? `Reconciled: ${text}`
      : `Variance: Parent ($${variance.parent_amount.toLocaleString()}) - Children ($${variance.children_amount.toLocaleString()}) = ${text}`;

    return { text, colorClass, title };
  };

  const varianceDisplay = formatVarianceDisplay();


  return (
    <tr
      style={{
        cursor: 'pointer',
        backgroundColor: 'var(--cui-tertiary-bg)',
        borderTop: '2px solid var(--cui-border-color)',
        borderBottom: '1px solid var(--cui-border-color)',
      }}
      onClick={onToggle}
    >
      {/* Category column with breadcrumb and chevron */}
      <td
        style={{
          paddingLeft: `${indentPx + 12}px`,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <div
          className="d-flex align-items-center justify-content-between"
          style={{ overflow: 'visible', gap: '0.5rem' }}
        >
          <div className="d-flex align-items-center gap-2" style={{ overflow: 'visible' }}>
            {/* Chevron */}
            <span style={{ fontSize: '0.875rem', width: '12px', flexShrink: 0 }}>
              {isExpanded ? '▼' : '▶'}
            </span>

            {/* Breadcrumb - allows overflow into next column */}
            <span
              title={
                variance && variance.has_children
                  ? `${categoryBreadcrumb}\n\n💡 This category has ${variance.child_categories.length} child categories.\nEditing items here may create variances.\nCurrent variance: ${variance.variance_amount > 0 ? '+' : ''}$${Math.abs(variance.variance_amount).toLocaleString()}`
                  : categoryBreadcrumb
              }
              style={{
                whiteSpace: 'nowrap',
                overflow: 'visible',
                fontWeight: isExpanded ? 'bold' : 'normal',
              }}
            >
              {categoryBreadcrumb}
              {variance && variance.has_children && !variance.is_reconciled && (
                <span className="ms-1" style={{ fontSize: '0.75rem' }} title="This category has children">
                  📊
                </span>
              )}
            </span>

            {/* Descendant depth indicators - show one line per sub-level AFTER text */}
            {descendantDepth > 0 && (
              <div className="d-flex align-items-center ms-2" style={{ gap: '2px' }}>
                {Array.from({ length: descendantDepth }).map((_, idx) => (
                  <span
                    key={idx}
                    style={{
                      width: '3px',
                      height: '1em',
                      backgroundColor: LEVEL_COLORS[Math.min(categoryLevel + idx + 1, 4) as keyof typeof LEVEL_COLORS] || '#6c757d',
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Child count badge */}
            <span className="badge bg-secondary ms-1" style={{ fontSize: '0.75rem', flexShrink: 0 }}>
              {childCount}
            </span>
          </div>

          {isExpanded && onAddItem && (
            <CButton
              color="primary"
              size="sm"
              variant="ghost"
              className="text-nowrap"
              onClick={(event) => {
                event.stopPropagation();
                onAddItem();
              }}
            >
              + Add Item
            </CButton>
          )}
        </div>
      </td>

      {/* Empty cells before Amount column: Phase, Category, Description, Qty, UOM, Rate */}
      {mode === 'napkin' && (<><td></td><td></td><td></td><td></td><td></td><td></td></>)}
      {mode === 'standard' && (<><td></td><td></td><td></td><td></td><td></td><td></td></>)}
      {mode === 'detail' && (<><td></td><td></td><td></td><td></td><td></td><td></td></>)}

      {/* Amount column with subtotal */}
      <td className="text-end">
        <span
          className="text-success fw-bold tnum"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formatMoney(amountSubtotal)}
        </span>
      </td>

      {/* Variance column (only shown in Standard and Detail modes) */}
      {(mode === 'standard' || mode === 'detail') && (
        <td>
          <span
            className={`fw-semibold text-end d-block tnum ${varianceDisplay.colorClass}`}
            style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.875rem' }}
            title={varianceDisplay.title}
          >
            {varianceDisplay.text}
          </span>
        </td>
      )}

      {/* Remaining empty columns: Start, Duration */}
      {mode === 'napkin' && (<><td></td><td></td></>)}
      {mode === 'standard' && (<><td></td><td></td></>)}
      {mode === 'detail' && (<><td></td><td></td><td></td><td></td></>)}
    </tr>
  );
}
