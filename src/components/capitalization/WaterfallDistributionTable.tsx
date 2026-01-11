'use client';

import React, { useState, useMemo } from 'react';
import { WaterfallApiResponse } from './WaterfallResults';

interface WaterfallDistributionTableProps {
  data: WaterfallApiResponse;
  periodType: 'months' | 'quarters' | 'years';
}

type ViewMode = 'lp' | 'gp' | 'combined';

const formatCurrency = (value: number | undefined): string => {
  if (value === undefined || value === null || value === 0) return '—';
  return '$' + value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const formatNumber = (value: number | undefined): string => {
  if (value === undefined || value === null || value === 0) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const formatPct = (value: number | undefined): string => {
  if (value === undefined || value === null) return '—';
  return `${(value * 100).toFixed(1)}%`;
};

const formatMultiple = (value: number | undefined): string => {
  if (value === undefined || value === null) return '—';
  return `${value.toFixed(2)}x`;
};

const WaterfallDistributionTable: React.FC<WaterfallDistributionTableProps> = ({
  data,
  periodType,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('combined');

  // Aggregate periods based on periodType
  const aggregatedPeriods = useMemo(() => {
    const periods = data.periodDistributions;
    if (periodType === 'months') {
      return periods.map((p, idx) => ({
        ...p,
        displayPeriod: `${idx + 1}`,
        displayDate: new Date(p.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      }));
    }

    // Group by quarter or year
    const grouped = new Map<string, typeof periods>();
    periods.forEach((p) => {
      const date = new Date(p.date);
      const key = periodType === 'quarters'
        ? `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`
        : `${date.getFullYear()}`;
      const existing = grouped.get(key) || [];
      existing.push(p);
      grouped.set(key, existing);
    });

    // Aggregate each group - take last period's balances, sum distributions
    return Array.from(grouped.entries()).map(([key, periodsList], idx) => {
      const lastPeriod = periodsList[periodsList.length - 1];
      const sumDist = (field: keyof typeof lastPeriod) =>
        periodsList.reduce((sum, p) => sum + (Number(p[field]) || 0), 0);

      return {
        ...lastPeriod,
        displayPeriod: `${idx + 1}`,
        displayDate: key,
        cashFlow: sumDist('cashFlow'),
        lpDist: sumDist('lpDist'),
        gpDist: sumDist('gpDist'),
        // Use last period's balance values (end-of-period state)
        t1LpBegBal: periodsList[0].t1LpBegBal,
        t1GpBegBal: periodsList[0].t1GpBegBal,
        t2LpBegBal: periodsList[0].t2LpBegBal,
        // Sum tier distributions
        tiers: lastPeriod.tiers.map((tier, tierIdx) => ({
          ...tier,
          lpShare: periodsList.reduce((sum, p) => sum + (p.tiers[tierIdx]?.lpShare || 0), 0),
          gpShare: periodsList.reduce((sum, p) => sum + (p.tiers[tierIdx]?.gpShare || 0), 0),
        })),
      };
    });
  }, [data.periodDistributions, periodType]);

  // Calculate totals
  const totals = useMemo(() => {
    const lpSummary = data.partnerSummaries.find((p) => p.partnerType === 'LP');
    const gpSummary = data.partnerSummaries.find((p) => p.partnerType === 'GP');

    // Calculate LP and GP net cash flows (contributions are negative, distributions positive)
    const lpNetCf = data.periodDistributions.reduce((sum, p) => {
      const lpContrib = (p as any).lpContribution || 0;
      const lpDist = (p.tiers[0]?.lpShare || 0) + (p.tiers[1]?.lpShare || 0) + (p.tiers[2]?.lpShare || 0);
      return sum + lpContrib + lpDist;
    }, 0);
    const gpNetCf = data.periodDistributions.reduce((sum, p) => {
      const gpContrib = (p as any).gpContribution || 0;
      const gpDist = (p.tiers[0]?.gpShare || 0) + (p.tiers[1]?.gpShare || 0) + (p.tiers[2]?.gpShare || 0);
      return sum + gpContrib + gpDist;
    }, 0);

    return {
      netCf: data.periodDistributions.reduce((sum, p) => sum + p.cashFlow, 0),
      tier1Lp: lpSummary?.tierBreakdown[0]?.amount || 0,
      tier1Gp: gpSummary?.tierBreakdown[0]?.amount || 0,
      tier2Lp: lpSummary?.tierBreakdown[1]?.amount || 0,
      tier2Gp: gpSummary?.tierBreakdown[1]?.amount || 0,
      tier3Lp: lpSummary?.tierBreakdown[2]?.amount || 0,
      tier3Gp: gpSummary?.tierBreakdown[2]?.amount || 0,
      lpTotal: lpSummary?.totalDistributed || 0,
      gpTotal: gpSummary?.totalDistributed || 0,
      lpIrr: lpSummary?.irr || 0,
      gpIrr: gpSummary?.irr || 0,
      lpEmx: lpSummary?.equityMultiple || 0,
      gpEmx: gpSummary?.equityMultiple || 0,
      lpNetCf,
      gpNetCf,
    };
  }, [data]);

  // Get tier definitions for headers
  const tiers = data.tierDefinitions.slice(0, 3);

  // Header style matching Periodic Distributions
  const headerStyle: React.CSSProperties = {
    color: 'var(--cui-secondary-color)',
  };

  return (
    <div className="waterfall-distribution-table" style={{ fontSize: '0.8rem' }}>
      {/* View Toggle Buttons */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="btn-group btn-group-sm">
          <button
            type="button"
            className={`btn ${viewMode === 'lp' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setViewMode('lp')}
          >
            LP View
          </button>
          <button
            type="button"
            className={`btn ${viewMode === 'gp' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setViewMode('gp')}
          >
            GP View
          </button>
          <button
            type="button"
            className={`btn ${viewMode === 'combined' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setViewMode('combined')}
          >
            Combined
          </button>
        </div>
        <small className="text-muted">
          {aggregatedPeriods.length} {periodType === 'months' ? 'months' : periodType === 'quarters' ? 'quarters' : 'years'}
        </small>
      </div>

      {/* Table Container with Horizontal Scroll */}
      <div className="table-responsive">
        <table
          className="table table-sm align-middle mb-0 text-center"
          style={{ fontSize: '0.75rem' }}
        >
          <thead>
            {/* Tier Header Row */}
            <tr style={headerStyle}>
              <th rowSpan={2} className="align-middle text-start">Period</th>
              <th rowSpan={2} className="align-middle text-start">Date</th>
              <th
                rowSpan={2}
                className="align-middle text-end"
                style={{ backgroundColor: 'rgba(255, 193, 7, 0.15)', whiteSpace: 'nowrap' }}
              >
                Net CF
              </th>
              {/* Tier 1 header */}
              <th
                colSpan={viewMode === 'combined' ? 7 : viewMode === 'lp' ? 4 : 4}
                className="text-center"
                style={{ borderBottom: 'none', borderLeft: '2px solid var(--cui-border-color)' }}
              >
                {tiers[0]?.tierName || 'Pref + Capital'} - {tiers[0]?.hurdleRate || 8}%
              </th>
              {/* Tier 2 header */}
              <th
                colSpan={viewMode === 'combined' ? 5 : viewMode === 'lp' ? 5 : 3}
                className="text-center"
                style={{ borderBottom: 'none', borderLeft: '2px solid var(--cui-border-color)' }}
              >
                {tiers[1]?.tierName || 'Hurdle'} - {tiers[1]?.hurdleRate || 15}%
              </th>
              {/* Tier 3 header */}
              <th
                colSpan={viewMode === 'combined' ? 3 : viewMode === 'lp' ? 3 : 3}
                className="text-center"
                style={{ borderBottom: 'none', borderLeft: '2px solid var(--cui-border-color)' }}
              >
                {tiers[2]?.tierName || 'Residual'}
              </th>
              {/* Net Cash Flow header */}
              <th
                colSpan={2}
                className="text-center"
                style={{ borderBottom: 'none', borderLeft: '2px solid var(--cui-border-color)', backgroundColor: 'rgba(40, 167, 69, 0.1)' }}
              >
                Net Cash Flow
              </th>
            </tr>

            {/* Sub-header Row with LP/GP splits */}
            <tr style={{ ...headerStyle, fontSize: '0.65rem' }}>
              {/* Tier 1 sub-headers */}
              {viewMode === 'combined' && (
                <>
                  <th className="text-end" style={{ fontWeight: 'normal', borderLeft: '2px solid var(--cui-border-color)' }}>
                    LP Beg
                  </th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>LP Dist</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>LP End</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>GP Beg</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>GP Dist</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>GP End</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Resid</th>
                </>
              )}
              {viewMode === 'lp' && (
                <>
                  <th className="text-end" style={{ fontWeight: 'normal', borderLeft: '2px solid var(--cui-border-color)' }}>
                    Beg
                  </th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Dist</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>End</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Resid</th>
                </>
              )}
              {viewMode === 'gp' && (
                <>
                  <th className="text-end" style={{ fontWeight: 'normal', borderLeft: '2px solid var(--cui-border-color)' }}>
                    Beg
                  </th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Dist</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>End</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Resid</th>
                </>
              )}

              {/* Tier 2 sub-headers */}
              {viewMode === 'combined' && (
                <>
                  <th className="text-end" style={{ fontWeight: 'normal', borderLeft: '2px solid var(--cui-border-color)' }}>
                    LP Beg
                  </th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Prior</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>LP Dist</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>GP Dist</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Resid</th>
                </>
              )}
              {viewMode === 'lp' && (
                <>
                  <th className="text-end" style={{ fontWeight: 'normal', borderLeft: '2px solid var(--cui-border-color)' }}>
                    Beg
                  </th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Prior</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Dist</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>End</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Resid</th>
                </>
              )}
              {viewMode === 'gp' && (
                <>
                  <th className="text-end" style={{ fontWeight: 'normal', borderLeft: '2px solid var(--cui-border-color)' }}>
                    Prior
                  </th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Dist</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Resid</th>
                </>
              )}

              {/* Tier 3 sub-headers */}
              {viewMode === 'combined' && (
                <>
                  <th className="text-end" style={{ fontWeight: 'normal', borderLeft: '2px solid var(--cui-border-color)' }}>
                    LP Dist
                  </th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>GP Dist</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Resid</th>
                </>
              )}
              {viewMode === 'lp' && (
                <>
                  <th className="text-end" style={{ fontWeight: 'normal', borderLeft: '2px solid var(--cui-border-color)' }}>
                    Prior
                  </th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Dist</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Resid</th>
                </>
              )}
              {viewMode === 'gp' && (
                <>
                  <th className="text-end" style={{ fontWeight: 'normal', borderLeft: '2px solid var(--cui-border-color)' }}>
                    Prior
                  </th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Dist</th>
                  <th className="text-end" style={{ fontWeight: 'normal' }}>Resid</th>
                </>
              )}

              {/* Net Cash Flow sub-headers - always shown */}
              <th className="text-end" style={{ fontWeight: 'normal', borderLeft: '2px solid var(--cui-border-color)', backgroundColor: 'rgba(40, 167, 69, 0.05)' }}>
                LP
              </th>
              <th className="text-end" style={{ fontWeight: 'normal', backgroundColor: 'rgba(40, 167, 69, 0.05)' }}>
                GP
              </th>
            </tr>
          </thead>

          <tbody>
            {aggregatedPeriods.map((period, rowIdx) => {
              // First row uses $, middle rows use plain numbers
              const isFirstRow = rowIdx === 0;
              const fmt = isFirstRow ? formatCurrency : formatNumber;
              return (
                <tr key={period.periodId}>
                  {/* Fixed columns */}
                  <td className="text-start">{period.displayPeriod}</td>
                  <td className="text-start">{period.displayDate}</td>
                  <td className="text-end" style={{ backgroundColor: 'rgba(255, 193, 7, 0.08)' }}>
                    {fmt(period.cashFlow)}
                  </td>

                  {/* Tier 1 columns */}
                  {viewMode === 'combined' && (
                    <>
                      <td className="text-end" style={{ borderLeft: '2px solid var(--cui-border-color)' }}>
                        {fmt(period.t1LpBegBal)}
                      </td>
                      <td className="text-end">{fmt(period.tiers[0]?.lpShare)}</td>
                      <td className="text-end">{fmt(period.t1LpEndBal)}</td>
                      <td className="text-end">{fmt(period.t1GpBegBal)}</td>
                      <td className="text-end">{fmt(period.tiers[0]?.gpShare)}</td>
                      <td className="text-end">{fmt(period.t1GpEndBal)}</td>
                      <td className="text-end" style={{ color: 'var(--cui-info-color)' }}>
                        {fmt(period.t1Residual)}
                      </td>
                    </>
                  )}
                  {viewMode === 'lp' && (
                    <>
                      <td className="text-end" style={{ borderLeft: '2px solid var(--cui-border-color)' }}>
                        {fmt(period.t1LpBegBal)}
                      </td>
                      <td className="text-end">{fmt(period.tiers[0]?.lpShare)}</td>
                      <td className="text-end">{fmt(period.t1LpEndBal)}</td>
                      <td className="text-end" style={{ color: 'var(--cui-info-color)' }}>
                        {fmt(period.t1Residual)}
                      </td>
                    </>
                  )}
                  {viewMode === 'gp' && (
                    <>
                      <td className="text-end" style={{ borderLeft: '2px solid var(--cui-border-color)' }}>
                        {fmt(period.t1GpBegBal)}
                      </td>
                      <td className="text-end">{fmt(period.tiers[0]?.gpShare)}</td>
                      <td className="text-end">{fmt(period.t1GpEndBal)}</td>
                      <td className="text-end" style={{ color: 'var(--cui-info-color)' }}>
                        {fmt(period.t1Residual)}
                      </td>
                    </>
                  )}

                  {/* Tier 2 columns */}
                  {viewMode === 'combined' && (
                    <>
                      <td className="text-end" style={{ borderLeft: '2px solid var(--cui-border-color)' }}>
                        {fmt(period.t2LpBegBal)}
                      </td>
                      <td className="text-end" style={{ color: 'var(--cui-secondary-color)' }}>
                        {fmt(period.t2LpPriorDist)}
                      </td>
                      <td className="text-end">{fmt(period.tiers[1]?.lpShare)}</td>
                      <td className="text-end">{fmt(period.tiers[1]?.gpShare)}</td>
                      <td className="text-end" style={{ color: 'var(--cui-info-color)' }}>
                        {fmt(period.t2Residual)}
                      </td>
                    </>
                  )}
                  {viewMode === 'lp' && (
                    <>
                      <td className="text-end" style={{ borderLeft: '2px solid var(--cui-border-color)' }}>
                        {fmt(period.t2LpBegBal)}
                      </td>
                      <td className="text-end" style={{ color: 'var(--cui-secondary-color)' }}>
                        {fmt(period.t2LpPriorDist)}
                      </td>
                      <td className="text-end">{fmt(period.tiers[1]?.lpShare)}</td>
                      <td className="text-end">{fmt(period.t2LpEndBal)}</td>
                      <td className="text-end" style={{ color: 'var(--cui-info-color)' }}>
                        {fmt(period.t2Residual)}
                      </td>
                    </>
                  )}
                  {viewMode === 'gp' && (
                    <>
                      <td className="text-end" style={{ borderLeft: '2px solid var(--cui-border-color)', color: 'var(--cui-secondary-color)' }}>
                        {fmt(period.t2GpPriorDist)}
                      </td>
                      <td className="text-end">{fmt(period.tiers[1]?.gpShare)}</td>
                      <td className="text-end" style={{ color: 'var(--cui-info-color)' }}>
                        {fmt(period.t2Residual)}
                      </td>
                    </>
                  )}

                  {/* Tier 3 columns */}
                  {viewMode === 'combined' && (
                    <>
                      <td className="text-end" style={{ borderLeft: '2px solid var(--cui-border-color)' }}>
                        {fmt(period.tiers[2]?.lpShare)}
                      </td>
                      <td className="text-end">{fmt(period.tiers[2]?.gpShare)}</td>
                      <td className="text-end" style={{ color: 'var(--cui-info-color)' }}>
                        {fmt(period.t3Residual)}
                      </td>
                    </>
                  )}
                  {viewMode === 'lp' && (
                    <>
                      <td className="text-end" style={{ borderLeft: '2px solid var(--cui-border-color)', color: 'var(--cui-secondary-color)' }}>
                        {fmt(period.t3LpPriorDist)}
                      </td>
                      <td className="text-end">{fmt(period.tiers[2]?.lpShare)}</td>
                      <td className="text-end" style={{ color: 'var(--cui-info-color)' }}>
                        {fmt(period.t3Residual)}
                      </td>
                    </>
                  )}
                  {viewMode === 'gp' && (
                    <>
                      <td className="text-end" style={{ borderLeft: '2px solid var(--cui-border-color)', color: 'var(--cui-secondary-color)' }}>
                        {fmt(period.t3GpPriorDist)}
                      </td>
                      <td className="text-end">{fmt(period.tiers[2]?.gpShare)}</td>
                      <td className="text-end" style={{ color: 'var(--cui-info-color)' }}>
                        {fmt(period.t3Residual)}
                      </td>
                    </>
                  )}

                  {/* Net Cash Flow columns - LP and GP totals for the period */}
                  <td className="text-end" style={{ borderLeft: '2px solid var(--cui-border-color)', backgroundColor: 'rgba(40, 167, 69, 0.05)' }}>
                    {fmt(
                      (period.lpContribution || 0) +
                      (period.tiers[0]?.lpShare || 0) +
                      (period.tiers[1]?.lpShare || 0) +
                      (period.tiers[2]?.lpShare || 0)
                    )}
                  </td>
                  <td className="text-end" style={{ backgroundColor: 'rgba(40, 167, 69, 0.05)' }}>
                    {fmt(
                      (period.gpContribution || 0) +
                      (period.tiers[0]?.gpShare || 0) +
                      (period.tiers[1]?.gpShare || 0) +
                      (period.tiers[2]?.gpShare || 0)
                    )}
                  </td>
                </tr>
              );
            })}

            {aggregatedPeriods.length === 0 && (
              <tr>
                <td colSpan={20} className="text-muted">
                  No distributions calculated.
                </td>
              </tr>
            )}
          </tbody>

          {/* Totals Row */}
          {aggregatedPeriods.length > 0 && (
            <tfoot>
              <tr className="fw-semibold" style={{ borderTop: '2px solid var(--cui-border-color)' }}>
                <td colSpan={2} className="text-end">Total</td>
                <td className="text-end" style={{ backgroundColor: 'rgba(255, 193, 7, 0.08)' }}>
                  {formatCurrency(totals.netCf)}
                </td>

                {/* Tier 1 totals */}
                {viewMode === 'combined' && (
                  <>
                    <td style={{ borderLeft: '2px solid var(--cui-border-color)' }}></td>
                    <td className="text-end">{formatCurrency(totals.tier1Lp)}</td>
                    <td></td>
                    <td></td>
                    <td className="text-end">{formatCurrency(totals.tier1Gp)}</td>
                    <td></td>
                    <td></td>
                  </>
                )}
                {viewMode === 'lp' && (
                  <>
                    <td style={{ borderLeft: '2px solid var(--cui-border-color)' }}></td>
                    <td className="text-end">{formatCurrency(totals.tier1Lp)}</td>
                    <td></td>
                    <td></td>
                  </>
                )}
                {viewMode === 'gp' && (
                  <>
                    <td style={{ borderLeft: '2px solid var(--cui-border-color)' }}></td>
                    <td className="text-end">{formatCurrency(totals.tier1Gp)}</td>
                    <td></td>
                    <td></td>
                  </>
                )}

                {/* Tier 2 totals */}
                {viewMode === 'combined' && (
                  <>
                    <td style={{ borderLeft: '2px solid var(--cui-border-color)' }}></td>
                    <td></td>
                    <td className="text-end">{formatCurrency(totals.tier2Lp)}</td>
                    <td className="text-end">{formatCurrency(totals.tier2Gp)}</td>
                    <td></td>
                  </>
                )}
                {viewMode === 'lp' && (
                  <>
                    <td style={{ borderLeft: '2px solid var(--cui-border-color)' }}></td>
                    <td></td>
                    <td className="text-end">{formatCurrency(totals.tier2Lp)}</td>
                    <td></td>
                    <td></td>
                  </>
                )}
                {viewMode === 'gp' && (
                  <>
                    <td style={{ borderLeft: '2px solid var(--cui-border-color)' }}></td>
                    <td className="text-end">{formatCurrency(totals.tier2Gp)}</td>
                    <td></td>
                  </>
                )}

                {/* Tier 3 totals */}
                {viewMode === 'combined' && (
                  <>
                    <td className="text-end" style={{ borderLeft: '2px solid var(--cui-border-color)' }}>
                      {formatCurrency(totals.tier3Lp)}
                    </td>
                    <td className="text-end">{formatCurrency(totals.tier3Gp)}</td>
                    <td></td>
                  </>
                )}
                {viewMode === 'lp' && (
                  <>
                    <td style={{ borderLeft: '2px solid var(--cui-border-color)' }}></td>
                    <td className="text-end">{formatCurrency(totals.tier3Lp)}</td>
                    <td></td>
                  </>
                )}
                {viewMode === 'gp' && (
                  <>
                    <td style={{ borderLeft: '2px solid var(--cui-border-color)' }}></td>
                    <td className="text-end">{formatCurrency(totals.tier3Gp)}</td>
                    <td></td>
                  </>
                )}

                {/* Net Cash Flow totals */}
                <td className="text-end" style={{ borderLeft: '2px solid var(--cui-border-color)', backgroundColor: 'rgba(40, 167, 69, 0.05)' }}>
                  {formatCurrency(totals.lpNetCf)}
                </td>
                <td className="text-end" style={{ backgroundColor: 'rgba(40, 167, 69, 0.05)' }}>
                  {formatCurrency(totals.gpNetCf)}
                </td>
              </tr>

              {/* Summary Metrics Row */}
              <tr style={{ color: 'var(--cui-secondary-color)' }}>
                <td colSpan={3} className="text-start">
                  LP: {formatPct(totals.lpIrr)} IRR | {formatMultiple(totals.lpEmx)} &nbsp;&nbsp;
                  GP: {formatPct(totals.gpIrr)} IRR | {formatMultiple(totals.gpEmx)}
                </td>
                <td
                  colSpan={viewMode === 'combined' ? 14 : viewMode === 'lp' ? 11 : 10}
                  className="text-end"
                >
                  LP Total: {formatCurrency(totals.lpTotal)} &nbsp;&nbsp;
                  GP Total: {formatCurrency(totals.gpTotal)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default WaterfallDistributionTable;
