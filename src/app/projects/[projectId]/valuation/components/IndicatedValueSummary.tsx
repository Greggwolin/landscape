/**
 * IndicatedValueSummary Component
 *
 * Shows the reconciled value calculation from all comparables.
 * Uses the effective acquisition price (calculated from ledger or asking price fallback).
 */

'use client';

import { useEffect, useState } from 'react';
import type { SalesComparable, ValuationReconciliation } from '@/types/valuation';

interface AcquisitionPriceSummary {
  asking_price: number | null;
  has_closing_date: boolean;
  total_acquisition_cost: number | null;
  effective_acquisition_price: number | null;
  price_source: 'calculated' | 'asking' | null;
}

interface IndicatedValueSummaryProps {
  comparables: SalesComparable[];
  reconciliation: ValuationReconciliation | null;
  subjectUnits?: number;
  subjectAskingPrice?: number;
  projectId: number;
}

export function IndicatedValueSummary({
  comparables,
  reconciliation,
  subjectUnits = 113,
  subjectAskingPrice,
  projectId
}: IndicatedValueSummaryProps) {
  const [acquisitionData, setAcquisitionData] = useState<AcquisitionPriceSummary | null>(null);

  // Fetch effective acquisition price from Django API
  useEffect(() => {
    const fetchAcquisitionPrice = async () => {
      try {
        const djangoUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
        const response = await fetch(`${djangoUrl}/api/projects/${projectId}/acquisition/price-summary/`);
        if (response.ok) {
          const data = await response.json();
          setAcquisitionData(data);
        }
      } catch (error) {
        console.error('Failed to fetch acquisition price:', error);
      }
    };

    if (projectId) {
      fetchAcquisitionPrice();
    }
  }, [projectId]);

  // Use effective acquisition price from API, fall back to prop, then to 0
  const effectivePrice = acquisitionData?.effective_acquisition_price ?? subjectAskingPrice ?? 0;
  const priceSource = acquisitionData?.price_source;
  const priceLabel = priceSource === 'calculated' ? 'Acquisition Cost' : 'Asking Price';
  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '$0';
    return `$${Math.round(Number(value)).toLocaleString()}`;
  };

  const formatLargeCurrency = (value: number | null | undefined) => {
    if (!value) return '$0.00M';
    return `$${(Number(value) / 1000000).toFixed(2)}M`;
  };

  // Calculate weighted average if not in reconciliation
  const calculateWeightedAverage = () => {
    const compsWithAdjusted = comparables.filter(
      (c) => c.adjusted_price_per_unit && c.adjusted_price_per_unit > 0
    );

    if (compsWithAdjusted.length === 0) return 0;

    // Simple average for now (in production, use actual weights)
    const sum = compsWithAdjusted.reduce(
      (acc, comp) => acc + Number(comp.adjusted_price_per_unit),
      0
    );
    return sum / compsWithAdjusted.length;
  };

  const weightedAvg = reconciliation?.sales_comparison_value
    ? Number(reconciliation.sales_comparison_value) / subjectUnits
    : calculateWeightedAverage();

  const indicatedValue = reconciliation?.final_reconciled_value
    ? Number(reconciliation.final_reconciled_value)
    : weightedAvg * subjectUnits;

  const variance = effectivePrice > 0 && indicatedValue > 0
    ? ((effectivePrice - indicatedValue) / indicatedValue) * 100
    : 0;

  return (
    <div
      className="rounded-lg border h-full flex flex-col"
      style={{
        backgroundColor: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)',
        minHeight: '600px',
        maxHeight: '800px'
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center gap-3"
        style={{
          backgroundColor: 'var(--surface-card-header)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div className="text-2xl">📊</div>
        <h3
          className="text-lg font-semibold"
          style={{ color: 'var(--cui-body-color)' }}
        >
          Indicated Value - Sales Comparison
        </h3>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>

      {/* Comparables Table */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--cui-border-color)' }}>
              <th className="text-left py-2 px-3 font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                Property
              </th>
              <th className="text-center py-2 px-3 font-semibold" colSpan={2} style={{ color: 'var(--cui-body-color)' }}>
                Price / Unit
              </th>
            </tr>
            <tr style={{ borderBottom: '2px solid var(--cui-border-color)' }}>
              <th className="text-left py-2 px-3" style={{ color: 'var(--cui-body-color)' }}></th>
              <th className="text-right py-2 px-3 font-normal" style={{ color: 'var(--cui-body-color)' }}>
                Raw
              </th>
              <th className="text-right py-2 px-3 font-normal" style={{ color: 'var(--cui-body-color)' }}>
                Adjusted
              </th>
            </tr>
          </thead>
          <tbody>
            {comparables.map((comp) => {
              if (!comp.adjusted_price_per_unit) return null;
              return (
                <tr
                  key={comp.comparable_id}
                  style={{ borderBottom: '1px solid var(--cui-border-color-translucent)' }}
                >
                  <td className="py-2 px-3" style={{ color: 'var(--cui-body-color)' }}>
                    Comp #{comp.comp_number}: {comp.property_name}
                  </td>
                  <td className="py-2 px-3 text-right" style={{ color: 'var(--cui-body-color)' }}>
                    {formatCurrency(Number(comp.price_per_unit))}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                    {formatCurrency(Number(comp.adjusted_price_per_unit))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Weighted Average */}
      <div
        className="p-4 rounded mb-6"
        style={{
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderLeft: '4px solid var(--cui-primary)'
        }}
      >
        <div className="flex justify-between items-center">
          <span
            className="text-base font-medium"
            style={{ color: 'var(--cui-body-color)' }}
          >
            Weighted Average Price/Unit
          </span>
          <span
            className="text-lg font-bold"
            style={{ color: 'var(--cui-primary)' }}
          >
            {formatCurrency(weightedAvg)}/unit
          </span>
        </div>
        <div
          className="text-xs mt-2"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          Based on {comparables.filter(c => c.adjusted_price_per_unit).length} adjusted comparables
        </div>
      </div>

      {/* Total Indicated Value */}
      <div
        className="p-5 rounded mb-6"
        style={{
          backgroundColor: 'var(--cui-success-bg)',
          border: '2px solid var(--cui-success)'
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <span
            className="text-lg font-bold"
            style={{ color: 'var(--cui-body-color)' }}
          >
            Total Indicated Value
          </span>
          <span
            className="text-2xl font-bold"
            style={{ color: 'var(--cui-success)' }}
          >
            {formatLargeCurrency(indicatedValue)}
          </span>
        </div>
        <div
          className="text-sm"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          {formatCurrency(weightedAvg)}/unit × {subjectUnits} units
        </div>
      </div>

      {/* Subject Comparison */}
      <div className="space-y-3">
        <div
          className="flex justify-between items-center text-sm"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          <span className="flex items-center gap-2">
            Subject {priceLabel}
            {priceSource === 'calculated' && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: 'var(--cui-success-bg)',
                  color: 'var(--cui-success)',
                }}
              >
                Closed
              </span>
            )}
          </span>
          <span style={{ color: 'var(--cui-body-color)', fontWeight: 600 }}>
            {effectivePrice > 0 ? formatLargeCurrency(effectivePrice) : '—'}
          </span>
        </div>

        {effectivePrice > 0 && indicatedValue > 0 && (
          <div
            className="flex justify-between items-center text-sm"
            style={{ color: 'var(--cui-secondary-color)' }}
          >
            <span>Variance</span>
            <span
              style={{
                color: variance > 0 ? 'var(--cui-warning)' : 'var(--cui-success)',
                fontWeight: 600
              }}
            >
              {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
              {variance > 0 ? ' above' : ' below'} indicated value
            </span>
          </div>
        )}
      </div>

      </div>
    </div>
  );
}
