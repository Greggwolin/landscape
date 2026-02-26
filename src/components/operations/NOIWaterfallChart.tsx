'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';
import { CChart } from '@coreui/react-chartjs';

interface NOIWaterfallChartProps {
  grossPotentialRent: number;
  vacancyDeductions: number; // negative number
  otherIncome: number;
  effectiveGrossIncome: number;
  totalOperatingExpenses: number;
  asIsNOI: number;
}

/**
 * NOI Waterfall Chart — shows Revenue → Vacancy → Other Income → EGI → Expenses → NOI
 * Uses CoreUI chart wrapper with CSS variable theming.
 */
export function NOIWaterfallChart({
  grossPotentialRent,
  vacancyDeductions,
  otherIncome,
  effectiveGrossIncome,
  totalOperatingExpenses,
  asIsNOI,
}: NOIWaterfallChartProps) {
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
  });

  // Read CoreUI CSS variables at mount
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
    });
  }, []);

  const chartData = useMemo(() => {
    const absVacancy = Math.abs(vacancyDeductions);
    const absExpenses = Math.abs(totalOperatingExpenses);

    // Waterfall: stacked bars with invisible base + visible segment
    // GPR: full bar from 0
    // Vacancy: drops from GPR
    // Other Income: rises from (GPR - vacancy)
    // EGI: full bar (subtotal)
    // Expenses: drops from EGI
    // NOI: full bar (final)
    const nriAfterVacancy = grossPotentialRent - absVacancy;
    const egiBase = nriAfterVacancy; // before other income

    const labels = ['GPR', 'Vacancy', 'Other Inc.', 'EGI', 'Expenses', 'NOI'];

    // Invisible base (transparent)
    const baseData = [
      0,
      nriAfterVacancy,
      nriAfterVacancy,
      0,
      asIsNOI,
      0,
    ];

    // Visible segment
    const visibleData = [
      grossPotentialRent,
      absVacancy,
      otherIncome,
      effectiveGrossIncome,
      absExpenses,
      asIsNOI,
    ];

    // Colors per bar
    const barColors = [
      coreColors.primary,    // GPR - blue
      coreColors.danger,     // Vacancy - red
      coreColors.success,    // Other Income - green
      coreColors.info,       // EGI - teal
      coreColors.danger,     // Expenses - red
      asIsNOI >= 0 ? coreColors.success : coreColors.danger, // NOI
    ];

    return {
      labels,
      datasets: [
        {
          label: 'Base',
          data: baseData,
          backgroundColor: 'transparent',
          borderWidth: 0,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
        {
          label: 'Amount',
          data: visibleData,
          backgroundColor: barColors,
          borderWidth: 0,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
      ],
    };
  }, [grossPotentialRent, vacancyDeductions, otherIncome, effectiveGrossIncome, totalOperatingExpenses, asIsNOI, coreColors]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartOptions: any = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: (item: any) => item.datasetIndex === 1,
        callbacks: {
          label: (ctx: any) => {
            const val = ctx.raw as number;
            const label = ctx.label;
            const isDeduction = label === 'Vacancy' || label === 'Expenses';
            const prefix = isDeduction ? '-' : '';
            return `${prefix}$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: {
          color: coreColors.secondaryColor,
          font: { size: 11 },
        },
        border: { color: coreColors.borderColor },
      },
      y: {
        stacked: true,
        grid: {
          color: coreColors.borderColor,
          drawBorder: false,
        },
        ticks: {
          color: coreColors.secondaryColor,
          font: { size: 11 },
          callback: (value: number) => {
            if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
            if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
            return `$${value}`;
          },
        },
        border: { display: false },
      },
    },
  }), [coreColors]);

  return (
    <CCard>
      <CCardHeader
        className="d-flex align-items-center"
        style={{ padding: '0.5rem 0.75rem' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--cui-body-color)' }}>
          NOI Waterfall
        </span>
      </CCardHeader>
      <CCardBody style={{ padding: '0.75rem', height: '280px' }}>
        <CChart
          ref={chartRef}
          type="bar"
          data={chartData}
          options={chartOptions}
          style={{ height: '100%' }}
        />
      </CCardBody>
    </CCard>
  );
}
