'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';
import { CChart } from '@coreui/react-chartjs';
import { LineItemRow } from './types';

interface ExpenseBreakdownChartProps {
  opexRows: LineItemRow[];
  totalOperatingExpenses: number;
}

/**
 * Expense Breakdown Donut Chart — shows category-level expense split.
 * Uses CoreUI chart wrapper with CSS variable theming.
 */
export function ExpenseBreakdownChart({
  opexRows,
  totalOperatingExpenses,
}: ExpenseBreakdownChartProps) {
  const chartRef = useRef<any>(null);
  const [coreColors, setCoreColors] = useState({
    primary: '#321fdb',
    success: '#2eb85c',
    danger: '#e55353',
    info: '#3399ff',
    warning: '#f9b115',
    bodyColor: '#4f5d73',
    borderColor: '#d8dbe0',
    secondaryColor: '#9da5b1',
    cardBg: '#ffffff',
  });

  useEffect(() => {
    const root = document.documentElement;
    const get = (v: string) => getComputedStyle(root).getPropertyValue(v).trim();
    setCoreColors({
      primary: get('--cui-primary') || '#321fdb',
      success: get('--cui-success') || '#2eb85c',
      danger: get('--cui-danger') || '#e55353',
      info: get('--cui-info') || '#3399ff',
      warning: get('--cui-warning') || '#f9b115',
      bodyColor: get('--cui-body-color') || '#4f5d73',
      borderColor: get('--cui-border-color') || '#d8dbe0',
      secondaryColor: get('--cui-secondary-color') || '#9da5b1',
      cardBg: get('--cui-card-bg') || '#ffffff',
    });
  }, []);

  // Aggregate parent-level categories
  const categories = useMemo(() => {
    const catMap = new Map<string, number>();

    for (const row of opexRows) {
      if (row.level === 0 && row.is_calculated) {
        // Parent rollup row
        const total = Math.abs(row.as_is.total || 0);
        if (total > 0) {
          catMap.set(row.label, total);
        }
      } else if (row.level === 1 && !row.parent_key) {
        // Flat child without parent grouping
        const total = Math.abs(row.as_is.total || 0);
        if (total > 0) {
          const cat = row.parent_category || 'Other';
          catMap.set(cat, (catMap.get(cat) || 0) + total);
        }
      }
    }

    // If no parent-level rows found, aggregate by parent_category
    if (catMap.size === 0) {
      for (const row of opexRows) {
        const total = Math.abs(row.as_is.total || 0);
        if (total > 0) {
          const cat = row.parent_category || row.label || 'Other';
          catMap.set(cat, (catMap.get(cat) || 0) + total);
        }
      }
    }

    // Sort by value descending
    return Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [opexRows]);

  const chartData = useMemo(() => {
    const palette = [
      coreColors.primary,
      coreColors.info,
      coreColors.warning,
      coreColors.success,
      coreColors.danger,
      '#6610f2', // purple
      '#20c997', // teal
      '#fd7e14', // orange
      '#6f42c1', // indigo
      '#d63384', // pink
    ];

    return {
      labels: categories.map(([label]) => label),
      datasets: [
        {
          data: categories.map(([, value]) => value),
          backgroundColor: categories.map((_, i) => palette[i % palette.length]),
          borderWidth: 2,
          borderColor: coreColors.cardBg,
          hoverOffset: 6,
        },
      ],
    };
  }, [categories, coreColors]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '55%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: coreColors.bodyColor,
          font: { size: 11 },
          padding: 12,
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const val = ctx.raw as number;
            const pct = totalOperatingExpenses > 0
              ? ((val / totalOperatingExpenses) * 100).toFixed(1)
              : '0.0';
            return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${pct}%)`;
          },
        },
      },
    },
  }), [coreColors, totalOperatingExpenses]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <CCard>
      <CCardHeader
        className="d-flex align-items-center"
        style={{ padding: '0.5rem 0.75rem' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--cui-body-color)' }}>
          Expense Breakdown
        </span>
      </CCardHeader>
      <CCardBody style={{ padding: '0.75rem', height: '280px' }}>
        <CChart
          ref={chartRef}
          type="doughnut"
          data={chartData}
          options={chartOptions}
          style={{ height: '100%' }}
        />
      </CCardBody>
    </CCard>
  );
}
