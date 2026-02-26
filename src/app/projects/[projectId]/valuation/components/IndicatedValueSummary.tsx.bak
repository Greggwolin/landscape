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

/**
 * Calculate adjusted price per unit from base price + adjustment percentages.
 * Mirrors the logic in ComparablesGrid.getAdjustedPricePerUnit() so the
 * indicated value panel stays in sync with the grid display.
 */
function calcLiveAdjustedPrice(comp: SalesComparable): number | null {
  // Base price: prefer price_per_unit, fall back to sale_price / units
  let basePrice: number | null = null;
  if (comp.price_per_unit != null) {
    basePrice = Number(comp.price_per_unit);
    if (!Number.isFinite(basePrice)) basePrice = null;
  }
  if (basePrice == null && comp.sale_price != null && comp.units != null) {
    const sp = Number(comp.sale_price);
    const u = Number(comp.units);
    if (Number.isFinite(sp) && Number.isFinite(u) && u !== 0) {
      basePrice = sp / u;
    }
  }
  if (basePrice == null) return null;

  // Sum all adjustment percentages (user override takes priority)
  const totalAdj = (comp.adjustments || []).reduce((sum, adj) => {
    const pct = Number(adj.user_adjustment_pct ?? adj.adjustment_pct ?? 0);
    return sum + (Number.isFinite(pct) ? pct : 0);
  }, 0);

  const adjusted = basePrice * (1 + totalAdj);
  return Number.isFinite(adjusted) ? adjusted : null;
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

  // Pre-compute live adjusted prices for all comps (matches grid logic)
  const compsWithLiveAdj = comparables.map(comp => ({
    comp,
    liveAdjusted: calcLiveAdjustedPrice(comp),
  })).filter(({ liveAdjusted }) => liveAdjusted != null && liveAdjusted > 0);

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

  // Calculate weighted average from LIVE adjusted prices (not stale DB field)
  const calculateWeightedAverage = () => {
    if (compsWithLiveAdj.length === 0) return 0;
    const sum = compsWithLiveAdj.reduce((acc, { liveAdjusted }) => acc + liveAdjusted!, 0);
    return sum / compsWithLiveAdj.length;
  };

  // Always use live-calculated average here — reconciliation values
  // belong on the Reconciliation tab, not the Sales Comparison panel
  const weightedAvg = calculateWeightedAverage();
  const indicatedValue = weightedAvg * subjectUnits;

  // DEBUG: remove after verifying fix
  console.log('[IndicatedValueSummary] DEBUG', {
    totalComps: comparables.length,
    compsWithLiveAdj: compsWithLiveAdj.length,
    liveValues: compsWithLiveAdj.map(({ comp, liveAdjusted }) => ({
      name: comp.property_name,
      raw: comp.price_per_unit,
      adjDB: comp.adjusted_price_per_unit,
      adjLive: liveAdjusted,
      adjCount: (comp.adjustments || []).length,
    })),
    weightedAvg,
    indicatedValue,
  });

  const variance = effectivePrice > 0 && indicatedValue > 0
    ? ((effectivePrice - indicatedValue) / indicatedValue) * 100
    : 0;

  return (
    <div
      className="card"
      style={{
        backgroundColor: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)',
      }}
    >
      {/* Header */}
      <div
        className="card-header d-flex align-items-center justify-content-between"
        style={{ backgroundColor: 'var(--surface-card-header)' }}
      >
        <h5
          className="mb-0"
          style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--cui-body-color)' }}
        >
          Indicated Value - Sales Comparison
        </h5>
      </div>

      {/* Two-column layout: Landscaper narrative (left) + Value summary (right) */}
      <div className="d-flex" style={{ minHeight: '400px' }}>

        {/* Left: Landscaper Narrative */}
        <div
          style={{
            flex: 1,
            borderRight: '1px solid var(--cui-border-color)',
            padding: '1rem 1.25rem',
            overflowY: 'auto',
          }}
        >
          <div className="d-flex align-items-center mb-3" style={{ gap: '0.5rem' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--cui-primary), var(--cui-info))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>
              Value Conclusion Narrative
            </span>
          </div>
          <div
            style={{
              fontSize: '0.8125rem',
              lineHeight: 1.7,
              color: 'var(--cui-secondary-color)',
            }}
          >
            {compsWithLiveAdj.length > 0 ? (
              <>
                <p style={{ marginBottom: '0.75rem' }}>
                  The Sales Comparison Approach analyzed {compsWithLiveAdj.length} comparable
                  {compsWithLiveAdj.length !== 1 ? ' sales' : ' sale'} to derive an indicated value
                  for the subject property.
                </p>
                <p style={{ marginBottom: '0.75rem' }}>
                  After applying adjustments for location, condition, size, and market conditions,
                  the adjusted price per unit ranged from{' '}
                  <strong style={{ color: 'var(--cui-body-color)' }}>
                    {formatCurrency(Math.min(...compsWithLiveAdj.map(c => c.liveAdjusted!)))}
                  </strong>
                  {' '}to{' '}
                  <strong style={{ color: 'var(--cui-body-color)' }}>
                    {formatCurrency(Math.max(...compsWithLiveAdj.map(c => c.liveAdjusted!)))}
                  </strong>
                  {' '}per unit, yielding a weighted average of{' '}
                  <strong style={{ color: 'var(--cui-body-color)' }}>
                    {formatCurrency(weightedAvg)}
                  </strong>
                  {' '}per unit.
                </p>
                <p style={{ marginBottom: '0.75rem' }}>
                  Applied to the subject&apos;s {subjectUnits} units, the Sales Comparison
                  Approach indicates a value of{' '}
                  <strong style={{ color: 'var(--cui-success)' }}>
                    {formatLargeCurrency(indicatedValue)}
                  </strong>.
                </p>
                {effectivePrice > 0 && indicatedValue > 0 && (
                  <p>
                    The subject&apos;s {priceLabel.toLowerCase()} of {formatLargeCurrency(effectivePrice)} represents
                    a {Math.abs(variance).toFixed(1)}% {variance > 0 ? 'premium over' : 'discount to'} the
                    indicated value.
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontStyle: 'italic' }}>
                Add comparable sales and adjustments to generate the value conclusion narrative.
              </p>
            )}
          </div>
        </div>

        {/* Right: Value Summary */}
        <div
          style={{
            flex: 1,
            padding: '1rem 1.25rem',
            overflowY: 'auto',
          }}
        >

          {/* Comparables Table */}
          <div style={{ marginBottom: '1rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--cui-border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>
                    Property
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.375rem 0.5rem', fontWeight: 400, color: 'var(--cui-body-color)' }}>
                    Raw
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.375rem 0.5rem', fontWeight: 400, color: 'var(--cui-body-color)' }}>
                    Adjusted
                  </th>
                </tr>
              </thead>
              <tbody>
                {compsWithLiveAdj.map(({ comp, liveAdjusted }) => (
                  <tr
                    key={comp.comparable_id}
                    style={{ borderBottom: '1px solid var(--cui-border-color-translucent)' }}
                  >
                    <td style={{ padding: '0.375rem 0.5rem', color: 'var(--cui-body-color)' }}>
                      Comp #{comp.comp_number}: {comp.property_name}
                    </td>
                    <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right', color: 'var(--cui-body-color)' }}>
                      {formatCurrency(Number(comp.price_per_unit))}
                    </td>
                    <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontWeight: 600, color: 'var(--cui-body-color)' }}>
                      {formatCurrency(liveAdjusted)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Weighted Average */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              backgroundColor: 'var(--cui-tertiary-bg)',
              borderLeft: '4px solid var(--cui-primary)'
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--cui-body-color)' }}>
                Weighted Average Price/Unit
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--cui-primary)' }}>
                {formatCurrency(weightedAvg)}/unit
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--cui-secondary-color)' }}>
              Based on {compsWithLiveAdj.length} adjusted comparables
            </div>
          </div>

          {/* Total Indicated Value */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              backgroundColor: 'var(--cui-success-bg)',
              border: '2px solid var(--cui-success)'
            }}
          >
            <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--cui-body-color)' }}>
                Total Indicated Value
              </span>
              <span style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--cui-success)' }}>
                {formatLargeCurrency(indicatedValue)}
              </span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--cui-secondary-color)' }}>
              {formatCurrency(weightedAvg)}/unit × {subjectUnits} units
            </div>
          </div>

          {/* Subject Comparison */}
          <div className="d-flex flex-column" style={{ gap: '0.5rem' }}>
            <div
              className="d-flex justify-content-between align-items-center"
              style={{ fontSize: '0.8125rem', color: 'var(--cui-secondary-color)' }}
            >
              <span className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                Subject {priceLabel}
                {priceSource === 'calculated' && (
                  <span
                    style={{
                      fontSize: '0.625rem',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '0.25rem',
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
                className="d-flex justify-content-between align-items-center"
                style={{ fontSize: '0.8125rem', color: 'var(--cui-secondary-color)' }}
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
    </div>
  );
}
