'use client';

import React from 'react';

interface TierSummary {
  tierNumber: number;
  tierName: string;
  lpAmount: number;
  gpAmount: number;
  totalAmount: number;
}

interface TierDistribution {
  tierNumber: number;
  tierName: string;
  lpSplitPct: number;
  gpSplitPct: number;
  lpShare: number;
  gpShare: number;
}

interface PeriodDistribution {
  periodId: number;
  date: string;
  cashFlow: number;
  cumulativeCashFlow: number;
  lpDist: number;
  gpDist: number;
  lpIrr: number;
  gpIrr: number;
  accruedPref: number;
  accruedHurdle: number;
  tiers: TierDistribution[];
}

interface TierDefinition {
  tierNumber: number;
  tierName: string;
  hurdleType: 'IRR' | 'equity_multiple' | null;
  hurdleRate: number | null;
  lpSplitPct: number;
  gpSplitPct: number;
}

interface TierBreakdown {
  tierNumber: number;
  tierName: string;
  hurdleRate: number | null;
  lpSplitPct: number;
  gpSplitPct: number;
  amount: number;
}

interface PartnerSummary {
  partnerType: 'LP' | 'GP';
  totalContributed: number;
  totalDistributed: number;
  irr: number;
  equityMultiple: number;
  tierBreakdown: TierBreakdown[];
}

interface ProjectSummary {
  totalContributed: number;
  totalDistributed: number;
  equityMultiple: number;
  projectIrr?: number;
  tierTotals: TierBreakdown[];
}

export interface WaterfallApiResponse {
  projectSummary: ProjectSummary;
  partnerSummaries: PartnerSummary[];
  tierSummaries: TierSummary[];
  periodDistributions: PeriodDistribution[];
  tierDefinitions: TierDefinition[];
}

interface WaterfallResultsProps {
  data: WaterfallApiResponse | null;
  error: string | null;
  loading: boolean;
  onRun: () => void;
  showPeriodTable?: boolean;
  showPeriodTableOnly?: boolean;
}

const WaterfallResults: React.FC<WaterfallResultsProps> = ({
  data,
  error,
  loading,
  onRun,
  showPeriodTable = true,
  showPeriodTableOnly = false,
}) => {
  const tierSummaries = data?.tierSummaries ?? [];
  const partnerSummaries = data?.partnerSummaries ?? [];
  const projectSummary = data?.projectSummary;
  const tierDefinitions = data?.tierDefinitions ?? [];
  const periodDistributions = data?.periodDistributions ?? [];

  // Format with $ sign (for first row, totals row, and summary tables)
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined || Number.isNaN(value) || value === 0) return '—';
    return '$' + value.toLocaleString(undefined, {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });
  };

  // Format without $ sign (for middle rows)
  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || Number.isNaN(value) || value === 0) return '—';
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });
  };

  const formatPct = (value: number | null | undefined, digits = 1): string => {
    if (value === null || value === undefined || Number.isNaN(value) || value === 0) return '—';
    return `${(value * 100).toFixed(digits)}%`;
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${year}`;
  };

  const formatMultiple = (value: number | null | undefined): string => {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    return value.toFixed(2) + 'x';
  };

  return (
    <>
      {/* Summary Card */}
      {!showPeriodTableOnly && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Waterfall Results</h6>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={onRun}
              disabled={loading}
            >
              {loading ? 'Running…' : 'Run Waterfall'}
            </button>
          </div>

          <div className="card-body py-2" style={{ fontSize: '0.8rem' }}>
            {error && (
              <div className="alert alert-danger mb-2 py-1">
                {error}
              </div>
            )}

            {!data && !error && (
              <div className="text-muted small">
                Click &ldquo;Run Waterfall&rdquo; to calculate distributions.
              </div>
            )}

            {data && (
              <table className="table table-sm align-middle mb-0" style={{ fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ color: 'var(--cui-secondary-color)' }}>
                    <th className="text-start border-0 py-1 px-1"></th>
                    <th className="text-end border-0 py-1 px-1">Project</th>
                    <th className="text-end border-0 py-1 px-1">LP</th>
                    <th className="text-end border-0 py-1 px-1">GP</th>
                  </tr>
                </thead>
                <tbody>
                  {tierSummaries.map((tier) => {
                    const displayName = tier.tierNumber === 0 ? 'Capital' : tier.tierName;
                    return (
                      <tr key={tier.tierNumber}>
                        <td className="text-start border-0 py-0 px-1">{displayName}</td>
                        <td className="text-end border-0 py-0 px-1">{formatCurrency(tier.totalAmount)}</td>
                        <td className="text-end border-0 py-0 px-1">{formatCurrency(tier.lpAmount)}</td>
                        <td className="text-end border-0 py-0 px-1">{formatCurrency(tier.gpAmount)}</td>
                      </tr>
                    );
                  })}
                  <tr className="fw-semibold" style={{ borderTop: '1px solid var(--cui-border-color)' }}>
                    <td className="text-start border-0 py-1 px-1">Total</td>
                    <td className="text-end border-0 py-1 px-1">{formatCurrency(projectSummary?.totalDistributed)}</td>
                    <td className="text-end border-0 py-1 px-1">
                      {formatCurrency(partnerSummaries.find(p => p.partnerType === 'LP')?.totalDistributed)}
                    </td>
                    <td className="text-end border-0 py-1 px-1">
                      {formatCurrency(partnerSummaries.find(p => p.partnerType === 'GP')?.totalDistributed)}
                    </td>
                  </tr>
                  <tr style={{ borderTop: '1px solid var(--cui-border-color)' }}>
                    <td className="text-start border-0 py-0 px-1 text-medium-emphasis">IRR</td>
                    <td className="text-end border-0 py-0 px-1">{formatPct(projectSummary?.projectIrr)}</td>
                    <td className="text-end border-0 py-0 px-1">
                      {formatPct(partnerSummaries.find(p => p.partnerType === 'LP')?.irr)}
                    </td>
                    <td className="text-end border-0 py-0 px-1">
                      {formatPct(partnerSummaries.find(p => p.partnerType === 'GP')?.irr)}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-start border-0 py-0 px-1 text-medium-emphasis">Equity Multiple</td>
                    <td className="text-end border-0 py-0 px-1">{formatMultiple(projectSummary?.equityMultiple)}</td>
                    <td className="text-end border-0 py-0 px-1">
                      {formatMultiple(partnerSummaries.find(p => p.partnerType === 'LP')?.equityMultiple)}
                    </td>
                    <td className="text-end border-0 py-0 px-1">
                      {formatMultiple(partnerSummaries.find(p => p.partnerType === 'GP')?.equityMultiple)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Period-by-Period Table - renders as separate card */}
      {data && showPeriodTable && (
        <div className="card">
          <div className="card-body py-2" style={{ fontSize: '0.8rem' }}>
            <h6 className="mb-2">Period-by-Period Distributions</h6>
            <div className="table-responsive">
                <table
                  className="table table-sm align-middle mb-0 text-center"
                  style={{ fontSize: '0.75rem' }}
                >
                  <thead>
                    {/* Top header row with tier group names */}
                    <tr style={{ color: 'var(--cui-secondary-color)' }}>
                      <th rowSpan={2} className="align-middle text-start">Period</th>
                      <th rowSpan={2} className="align-middle text-start">Date</th>
                      <th
                        rowSpan={2}
                        className="align-middle text-end"
                        style={{ backgroundColor: 'rgba(255, 193, 7, 0.15)', whiteSpace: 'nowrap' }}
                      >
                        Project<br />Net Income
                      </th>
                      <th
                        rowSpan={2}
                        className="align-middle text-end"
                        style={{ backgroundColor: 'rgba(255, 193, 7, 0.15)', whiteSpace: 'nowrap' }}
                      >
                        Cume<br />Net Income
                      </th>
                      {tierDefinitions.map((tier) => {
                        // Determine number of columns for this tier
                        // Tier 1 (Pref): Accrued Pref + LP + GP + Residual to Hurdle = 4 cols
                        // Tier 2 (Hurdle): Accrued Hurdle + LP + GP + Residual = 4 cols
                        // Tier 3 (Residual): LP + GP = 2 cols
                        const isPrefTier = tier.tierNumber === 1;
                        const isHurdleTier = tier.tierNumber === 2;
                        const colSpan = isPrefTier || isHurdleTier ? 4 : 2;
                        // Rename "Promote" to "Hurdle" in display
                        let displayName = tier.tierName;
                        if (displayName.toLowerCase().includes('promote')) {
                          displayName = displayName.replace(/promote/i, 'Hurdle');
                        }
                        return (
                          <th
                            key={tier.tierNumber}
                            colSpan={colSpan}
                            className="text-center"
                            style={{ borderBottom: 'none' }}
                          >
                            {displayName}
                            {tier.hurdleRate !== null && ` - ${tier.hurdleRate}%`}
                          </th>
                        );
                      })}
                    </tr>
                    {/* Sub-header row with LP/GP split percentages */}
                    <tr style={{ color: 'var(--cui-secondary-color)', fontSize: '0.65rem' }}>
                      {data.tierDefinitions.map((tier) => {
                        const isPrefTier = tier.tierNumber === 1;
                        const isHurdleTier = tier.tierNumber === 2;
                        return (
                          <React.Fragment key={tier.tierNumber}>
                            {isPrefTier && (
                              <th className="text-end" style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                                Accrued<br />Pref
                              </th>
                            )}
                            {isHurdleTier && (
                              <th className="text-end" style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                                Accrued<br />Hurdle
                              </th>
                            )}
                            <th className="text-end" style={{ fontWeight: 'normal' }}>
                              LP ({tier.lpSplitPct}%)
                            </th>
                            <th className="text-end" style={{ fontWeight: 'normal' }}>
                              GP ({tier.gpSplitPct}%)
                            </th>
                            {isPrefTier && (
                              <th className="text-end" style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                                Residual<br />to Hurdle
                              </th>
                            )}
                            {isHurdleTier && (
                              <th className="text-end" style={{ fontWeight: 'normal' }}>
                                Residual
                              </th>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {periodDistributions.map((row, rowIdx) => {
                      const isFirstRow = rowIdx === 0;
                      const fmt = isFirstRow ? formatCurrency : formatNumber;
                      // Calculate residual amounts for this row
                      const tier2Dist = row.tiers.find((t) => t.tierNumber === 2);
                      const tier3Dist = row.tiers.find((t) => t.tierNumber === 3);
                      // Residual to Hurdle = cash that flows from Tier 1 to Tier 2
                      const residualToHurdle = (tier2Dist?.lpShare || 0) + (tier2Dist?.gpShare || 0) + (tier3Dist?.lpShare || 0) + (tier3Dist?.gpShare || 0);
                      // Residual = cash that flows from Tier 2 to Tier 3
                      const residualToTier3 = (tier3Dist?.lpShare || 0) + (tier3Dist?.gpShare || 0);
                      return (
                        <tr key={row.periodId}>
                          <td className="text-start">{row.periodId}</td>
                          <td className="text-start">{formatDate(row.date)}</td>
                          <td className="text-end" style={{ backgroundColor: 'rgba(255, 193, 7, 0.08)' }}>
                            {fmt(row.cashFlow)}
                          </td>
                          <td className="text-end" style={{ backgroundColor: 'rgba(255, 193, 7, 0.08)' }}>
                            {fmt(row.cumulativeCashFlow)}
                          </td>
                          {tierDefinitions.map((tier) => {
                            const tierDist = row.tiers.find(
                              (t) => t.tierNumber === tier.tierNumber
                            );
                            const isPrefTier = tier.tierNumber === 1;
                            const isHurdleTier = tier.tierNumber === 2;
                            return (
                              <React.Fragment key={tier.tierNumber}>
                                {isPrefTier && (
                                  <td className="text-end" style={{ color: 'var(--cui-secondary-color)' }}>
                                    {fmt(row.accruedPref)}
                                  </td>
                                )}
                                {isHurdleTier && (
                                  <td className="text-end" style={{ color: 'var(--cui-secondary-color)' }}>
                                    {fmt(row.accruedHurdle)}
                                  </td>
                                )}
                                <td className="text-end">{fmt(tierDist?.lpShare)}</td>
                                <td className="text-end">{fmt(tierDist?.gpShare)}</td>
                                {isPrefTier && (
                                  <td className="text-end" style={{ color: 'var(--cui-info-color)' }}>
                                    {fmt(residualToHurdle)}
                                  </td>
                                )}
                                {isHurdleTier && (
                                  <td className="text-end" style={{ color: 'var(--cui-info-color)' }}>
                                    {fmt(residualToTier3)}
                                  </td>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {periodDistributions.length === 0 && (
                      <tr>
                        <td
                          colSpan={4 + tierDefinitions.length * 4}
                          className="text-muted"
                        >
                          No distributions calculated.
                        </td>
                      </tr>
                    )}
                    {/* Totals row */}
                    {periodDistributions.length > 0 && (
                      <tr className="fw-semibold" style={{ borderTop: '2px solid var(--cui-border-color)' }}>
                        <td colSpan={2} className="text-end">Total</td>
                        <td className="text-end" style={{ backgroundColor: 'rgba(255, 193, 7, 0.08)' }}>
                          {formatCurrency(
                            periodDistributions.reduce((sum, r) => sum + (r.cashFlow || 0), 0)
                          )}
                        </td>
                        <td className="text-end" style={{ backgroundColor: 'rgba(255, 193, 7, 0.08)' }}>
                          {formatCurrency(
                            periodDistributions[periodDistributions.length - 1]?.cumulativeCashFlow
                          )}
                        </td>
                        {tierDefinitions.map((tier) => {
                          const lpTotal = periodDistributions.reduce((sum, r) => {
                            const t = r.tiers.find((td) => td.tierNumber === tier.tierNumber);
                            return sum + (t?.lpShare || 0);
                          }, 0);
                          const gpTotal = periodDistributions.reduce((sum, r) => {
                            const t = r.tiers.find((td) => td.tierNumber === tier.tierNumber);
                            return sum + (t?.gpShare || 0);
                          }, 0);
                          const isPrefTier = tier.tierNumber === 1;
                          const isHurdleTier = tier.tierNumber === 2;
                          // Calculate totals for residual columns
                          const tier2Total = periodDistributions.reduce((sum, r) => {
                            const t2 = r.tiers.find((td) => td.tierNumber === 2);
                            const t3 = r.tiers.find((td) => td.tierNumber === 3);
                            return sum + (t2?.lpShare || 0) + (t2?.gpShare || 0) + (t3?.lpShare || 0) + (t3?.gpShare || 0);
                          }, 0);
                          const tier3Total = periodDistributions.reduce((sum, r) => {
                            const t3 = r.tiers.find((td) => td.tierNumber === 3);
                            return sum + (t3?.lpShare || 0) + (t3?.gpShare || 0);
                          }, 0);
                          return (
                            <React.Fragment key={tier.tierNumber}>
                              {isPrefTier && (
                                <td className="text-end" style={{ color: 'var(--cui-secondary-color)' }}>—</td>
                              )}
                              {isHurdleTier && (
                                <td className="text-end" style={{ color: 'var(--cui-secondary-color)' }}>—</td>
                              )}
                              <td className="text-end">{formatCurrency(lpTotal)}</td>
                              <td className="text-end">{formatCurrency(gpTotal)}</td>
                              {isPrefTier && (
                                <td className="text-end" style={{ color: 'var(--cui-info-color)' }}>
                                  {formatCurrency(tier2Total)}
                                </td>
                              )}
                              {isHurdleTier && (
                                <td className="text-end" style={{ color: 'var(--cui-info-color)' }}>
                                  {formatCurrency(tier3Total)}
                                </td>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WaterfallResults;
