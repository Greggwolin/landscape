'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';
import { LineItemRow } from './types';

interface IncomeTreemapProps {
  rentalRows: LineItemRow[];
  grossPotentialRent: number;
}

interface TreemapRect {
  label: string;
  total: number;
  units: number;
  rate: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Squarified treemap layout — slice-and-dice by area proportion */
function layoutTreemap(
  items: { label: string; total: number; units: number; rate: number }[],
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

    // Greedily take items into a row until aspect ratio worsens
    const row: typeof remaining = [];
    let rowValue = 0;

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      const testValue = rowValue + item.total;
      const rowDim = (testValue / remainingValue) * dim;

      if (row.length === 0) {
        row.push(item);
        rowValue = testValue;
        continue;
      }

      // Check if adding this item worsens the worst aspect ratio in the row
      const currentWorst = worstAspectRatio(row, rowValue, remainingValue, dim, otherDim);
      row.push(item);
      const newWorst = worstAspectRatio(row, testValue, remainingValue, dim, otherDim);

      if (newWorst > currentWorst) {
        row.pop();
        break;
      }
      rowValue = testValue;
    }

    // Layout the row
    const rowDim = (rowValue / remainingValue) * dim;
    let offset = 0;
    for (const item of row) {
      const itemDim = (item.total / rowValue) * otherDim;
      if (isHorizontal) {
        rects.push({ ...item, x: x, y: y + offset, w: rowDim, h: itemDim });
      } else {
        rects.push({ ...item, x: x + offset, y: y, w: itemDim, h: rowDim });
      }
      offset += itemDim;
    }

    // Shrink remaining area
    if (isHorizontal) {
      x += rowDim;
      w -= rowDim;
    } else {
      y += rowDim;
      h -= rowDim;
    }

    // Remove laid out items
    for (const item of row) {
      const idx = remaining.indexOf(item);
      if (idx >= 0) remaining.splice(idx, 1);
    }
  }

  return rects;
}

function worstAspectRatio(
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

export function IncomeTreemap({ rentalRows, grossPotentialRent }: IncomeTreemapProps) {
  const [coreColors, setCoreColors] = useState<string[]>([]);
  const [popup, setPopup] = useState<{ label: string; total: number; units: number; rate: number; pct: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const get = (v: string) => getComputedStyle(root).getPropertyValue(v).trim();
    setCoreColors([
      get('--cui-primary') || '#321fdb',
      get('--cui-info') || '#3399ff',
      get('--cui-success') || '#2eb85c',
      get('--cui-warning') || '#f9b115',
      get('--cui-danger') || '#e55353',
      '#6610f2',
      '#20c997',
      '#fd7e14',
    ]);
  }, []);

  const blocks = useMemo(() => {
    return rentalRows
      .filter(r => !r.is_calculated && (r.as_is.total || 0) > 0)
      .map(r => ({
        label: r.label,
        total: r.as_is.total || 0,
        units: r.as_is.count || 0,
        rate: r.as_is.rate || 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [rentalRows]);

  const TREEMAP_W = 400;
  const TREEMAP_H = 260;

  const rects = useMemo(
    () => layoutTreemap(blocks, TREEMAP_W, TREEMAP_H),
    [blocks]
  );

  if (rects.length === 0 || coreColors.length === 0) return null;

  const totalValue = blocks.reduce((s, b) => s + b.total, 0);

  return (
    <CCard>
      <CCardHeader style={{ padding: '0.5rem 0.75rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--cui-body-color)' }}>
          Income by Floorplan
        </span>
      </CCardHeader>
      <CCardBody style={{ padding: '0.5rem' }}>
        <div
          style={{ position: 'relative', width: '100%', paddingBottom: `${(TREEMAP_H / TREEMAP_W) * 100}%` }}
          onMouseLeave={() => setPopup(null)}
        >
          <svg
            viewBox={`0 0 ${TREEMAP_W} ${TREEMAP_H}`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            preserveAspectRatio="none"
          >
            {rects.map((rect, i) => {
              const color = coreColors[i % coreColors.length];
              const pct = totalValue > 0 ? ((rect.total / totalValue) * 100).toFixed(1) : '0';
              const showDetails = rect.w > 60 && rect.h > 45;
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
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      const svgEl = e.currentTarget.closest('svg');
                      if (!svgEl) return;
                      const bounds = svgEl.getBoundingClientRect();
                      setPopup({
                        label: rect.label, total: rect.total, units: rect.units, rate: rect.rate, pct,
                        x: bounds.left + (rect.x + rect.w / 2) * (bounds.width / TREEMAP_W),
                        y: bounds.top + rect.y * (bounds.height / TREEMAP_H),
                      });
                    }}
                  />
                  {showLabel && (
                    <text
                      x={rect.x + 5}
                      y={rect.y + 14}
                      fill="white"
                      fontSize="10.5"
                      fontWeight="400"
                      style={{ pointerEvents: 'none' }}
                    >
                      {rect.label}
                    </text>
                  )}
                  {showDetails && (
                    <>
                      <text
                        x={rect.x + 5}
                        y={rect.y + rect.h - 18}
                        fill="rgba(255,255,255,0.95)"
                        fontSize="11.5"
                        fontWeight="500"
                        style={{ pointerEvents: 'none' }}
                      >
                        {formatCompact(rect.total)}
                      </text>
                      <text
                        x={rect.x + 5}
                        y={rect.y + rect.h - 6}
                        fill="rgba(255,255,255,0.7)"
                        fontSize="9.5"
                        fontWeight="400"
                        style={{ pointerEvents: 'none' }}
                      >
                        {rect.units > 0 ? `${rect.units} units` : ''}
                        {rect.units > 0 && rect.rate > 0 ? ' · ' : ''}
                        {rect.rate > 0 ? `$${rect.rate.toLocaleString()}/mo` : ''}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
          {popup && (
            <div
              style={{
                position: 'fixed',
                left: popup.x,
                top: popup.y - 8,
                transform: 'translate(-50%, -100%)',
                background: 'var(--cui-body-bg, #fff)',
                border: '1px solid var(--cui-border-color)',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>{popup.label}</div>
              <div>{formatCompact(popup.total)} ({popup.pct}%)</div>
              {popup.units > 0 && <div>{popup.units} units · ${popup.rate.toLocaleString()}/mo</div>}
            </div>
          )}
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
            Gross Potential Rent
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>
            {formatCompact(grossPotentialRent)}
          </span>
        </div>
      </CCardBody>
    </CCard>
  );
}
