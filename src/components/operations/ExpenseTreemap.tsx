'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';
import { LineItemRow } from './types';

interface ExpenseTreemapProps {
  opexRows: LineItemRow[];
  totalOperatingExpenses: number;
}

interface TreemapRect {
  label: string;
  total: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Squarified treemap layout */
function layoutTreemap(
  items: { label: string; total: number }[],
  width: number,
  height: number
): TreemapRect[] {
  if (items.length === 0) return [];
  const totalValue = items.reduce((s, i) => s + i.total, 0);
  if (totalValue <= 0) return [];

  const rects: TreemapRect[] = [];
  let x = 0, y = 0, w = width, h = height;
  const remaining = [...items];

  while (remaining.length > 0) {
    const isHorizontal = w >= h;
    const dim = isHorizontal ? w : h;
    const otherDim = isHorizontal ? h : w;
    const remainingValue = remaining.reduce((s, i) => s + i.total, 0);

    const row: typeof remaining = [];
    let rowValue = 0;

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      const testValue = rowValue + item.total;

      if (row.length === 0) {
        row.push(item);
        rowValue = testValue;
        continue;
      }

      const currentWorst = worstAspect(row, rowValue, remainingValue, dim, otherDim);
      row.push(item);
      const newWorst = worstAspect(row, testValue, remainingValue, dim, otherDim);

      if (newWorst > currentWorst) {
        row.pop();
        break;
      }
      rowValue = testValue;
    }

    const rowDim = (rowValue / remainingValue) * dim;
    let offset = 0;
    for (const item of row) {
      const itemDim = (item.total / rowValue) * otherDim;
      if (isHorizontal) {
        rects.push({ ...item, x, y: y + offset, w: rowDim, h: itemDim });
      } else {
        rects.push({ ...item, x: x + offset, y, w: itemDim, h: rowDim });
      }
      offset += itemDim;
    }

    if (isHorizontal) { x += rowDim; w -= rowDim; }
    else { y += rowDim; h -= rowDim; }

    for (const item of row) {
      const idx = remaining.indexOf(item);
      if (idx >= 0) remaining.splice(idx, 1);
    }
  }

  return rects;
}

function worstAspect(
  row: { total: number }[],
  rowValue: number,
  totalValue: number,
  dim: number,
  otherDim: number
): number {
  const rowDim = (rowValue / totalValue) * dim;
  if (rowDim <= 0) return Infinity;
  let worst = 0;
  for (const item of row) {
    const itemDim = (item.total / rowValue) * otherDim;
    const ratio = Math.max(rowDim / itemDim, itemDim / rowDim);
    worst = Math.max(worst, ratio);
  }
  return worst;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export function ExpenseTreemap({ opexRows, totalOperatingExpenses }: ExpenseTreemapProps) {
  const [coreColors, setCoreColors] = useState<string[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    const get = (v: string) => getComputedStyle(root).getPropertyValue(v).trim();
    setCoreColors([
      get('--cui-danger') || '#e55353',
      get('--cui-warning') || '#f9b115',
      get('--cui-info') || '#3399ff',
      get('--cui-primary') || '#321fdb',
      get('--cui-success') || '#2eb85c',
      '#6610f2',
      '#fd7e14',
      '#20c997',
      '#d63384',
      '#6f42c1',
    ]);
  }, []);

  const categories = useMemo(() => {
    const catMap = new Map<string, number>();

    for (const row of opexRows) {
      if (row.level === 0 && row.is_calculated) {
        const total = Math.abs(row.as_is.total || 0);
        if (total > 0) catMap.set(row.label, total);
      }
    }

    if (catMap.size === 0) {
      for (const row of opexRows) {
        const total = Math.abs(row.as_is.total || 0);
        if (total > 0) {
          const cat = row.parent_category || row.label || 'Other';
          catMap.set(cat, (catMap.get(cat) || 0) + total);
        }
      }
    }

    return Array.from(catMap.entries())
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total);
  }, [opexRows]);

  const TREEMAP_W = 400;
  const TREEMAP_H = 260;

  const rects = useMemo(
    () => layoutTreemap(categories, TREEMAP_W, TREEMAP_H),
    [categories]
  );

  if (rects.length === 0 || coreColors.length === 0) return null;

  const totalValue = categories.reduce((s, c) => s + c.total, 0);

  return (
    <CCard>
      <CCardHeader style={{ padding: '0.5rem 0.75rem' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--cui-body-color)' }}>
          Expenses by Category
        </span>
      </CCardHeader>
      <CCardBody style={{ padding: '0.5rem' }}>
        <div style={{ position: 'relative', width: '100%', paddingBottom: `${(TREEMAP_H / TREEMAP_W) * 100}%` }}>
          <svg
            viewBox={`0 0 ${TREEMAP_W} ${TREEMAP_H}`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            preserveAspectRatio="none"
          >
            {rects.map((rect, i) => {
              const color = coreColors[i % coreColors.length];
              const pct = totalValue > 0 ? ((rect.total / totalValue) * 100).toFixed(1) : '0';
              const showDetails = rect.w > 60 && rect.h > 40;
              const showLabel = rect.w > 35 && rect.h > 20;

              return (
                <g key={rect.label}>
                  <rect
                    x={rect.x + 1}
                    y={rect.y + 1}
                    width={Math.max(rect.w - 2, 0)}
                    height={Math.max(rect.h - 2, 0)}
                    rx={3}
                    fill={color}
                    style={{ cursor: 'default' }}
                  >
                    <title>{`${rect.label}: ${formatCompact(rect.total)} (${pct}%)`}</title>
                  </rect>
                  {showLabel && (
                    <text
                      x={rect.x + 6}
                      y={rect.y + 16}
                      fill="white"
                      fontSize="11"
                      fontWeight="600"
                      style={{ pointerEvents: 'none' }}
                    >
                      {rect.label}
                    </text>
                  )}
                  {showDetails && (
                    <>
                      <text
                        x={rect.x + 6}
                        y={rect.y + rect.h - 16}
                        fill="rgba(255,255,255,0.95)"
                        fontSize="13"
                        fontWeight="700"
                        style={{ pointerEvents: 'none' }}
                      >
                        {formatCompact(rect.total)}
                      </text>
                      <text
                        x={rect.x + 6}
                        y={rect.y + rect.h - 4}
                        fill="rgba(255,255,255,0.7)"
                        fontSize="9.5"
                        style={{ pointerEvents: 'none' }}
                      >
                        {pct}%
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        <div style={{
          marginTop: '0.5rem',
          paddingTop: '0.375rem',
          borderTop: '1px solid var(--cui-border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--cui-secondary-color)' }}>
            Total Operating Expenses
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>
            {formatCompact(totalOperatingExpenses)}
          </span>
        </div>
      </CCardBody>
    </CCard>
  );
}
