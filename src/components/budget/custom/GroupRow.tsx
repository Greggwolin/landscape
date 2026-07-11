// Group Row - Parent category row with subtotal and expand/collapse
// v1.3 · 2026-01-09 · ARGUS-style density upgrade

'use client';

import React from 'react';
import { SemanticButton } from '@/components/ui/landscape';
import { formatMoney } from '@/utils/formatters/number';
import { SemanticBadge } from '@/components/ui/landscape';
import type { BudgetMode } from '../ModeSelector';

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
  onAddItem,
}: GroupRowProps) {
  // Calculate indentation based on level (starting at 0px for L1)
  const indentPx = (categoryLevel - 1) * 8;

  // Determine column count based on mode (all modes share the same layout)
  // Phase, Stage, Category, Description, Qty, UOM, Rate, Amount, Start, Duration, Actions = 11 columns
  const totalColumns = 11;

  // Amount column is always second to last in napkin mode, and varies in others
  // We'll use a simple approach: show breadcrumb in first cell, subtotal in specific position

  const levelColor = LEVEL_COLORS[categoryLevel as keyof typeof LEVEL_COLORS] || 'var(--cui-secondary)';

  return (
    <tr
      className="ls-group-row"
      data-group-row="true"
      data-level={categoryLevel}
      onClick={onToggle}
      role="row"
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
            <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
              ▶
            </span>

            {/* Breadcrumb - allows overflow into next column */}
            <span
              title={categoryBreadcrumb}
              style={{
                whiteSpace: 'nowrap',
                overflow: 'visible',
                fontWeight: isExpanded ? 'bold' : 'normal',
              }}
            >
              {categoryBreadcrumb}
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
            <SemanticBadge
              intent="navigation-meta"
              value="count"
              className="ms-1"
              style={{ fontSize: '0.75rem', flexShrink: 0 }}
            >
              {childCount}
            </SemanticBadge>
          </div>

          {isExpanded && onAddItem && (
            <SemanticButton
              intent="secondary-action"
              size="sm"
              variant="ghost"
              className="text-nowrap"
              onClick={(event: any) => {
                event.stopPropagation();
                onAddItem();
              }}
            >
              + Add Item
            </SemanticButton>
          )}
        </div>
      </td>

      {/* Empty cells before Amount column: Stage, Category, Description, Qty, UOM, Rate */}
      {mode === 'napkin' && (<><td></td><td></td><td></td><td></td><td></td><td></td></>)}
      {mode === 'standard' && (<><td></td><td></td><td></td><td></td><td></td><td></td></>)}
      {mode === 'detail' && (<><td></td><td></td><td></td><td></td><td></td><td></td></>)}

      {/* Amount column with subtotal */}
      <td className="text-end group-subtotal">
        <span className="ls-cell-calculated ls-cell-number">
          {formatMoney(amountSubtotal)}
        </span>
      </td>

      {/* Remaining empty columns: Start, Duration, Actions */}
      {mode === 'napkin' && (<><td></td><td></td><td></td></>)}
      {mode === 'standard' && (<><td></td><td></td><td></td></>)}
      {mode === 'detail' && (<><td></td><td></td><td></td></>)}
    </tr>
  );
}
