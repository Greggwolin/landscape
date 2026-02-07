'use client';

import React, { useState, useMemo } from 'react';

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
  emxHurdle?: number | null;
  irrHurdle?: number | null;
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

type PeriodType = 'months' | 'quarters' | 'years';

interface AggregatedPeriod extends PeriodDistribution {
  displayPeriod: string;
  displayDate: string;
}

const WaterfallResults: React.FC<WaterfallResultsProps> = ({
  data,
  error,
  loading,
  onRun,
  showPeriodTable = true,
  showPeriodTableOnly = false,
}) => {
  const [periodType, setPeriodType] = useState<PeriodType>('months');
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [periodsOpen, setPeriodsOpen] = useState(true);

  const tierSummaries = data?.tierSummaries ?? [];
  const partnerSummaries = data?.partnerSummaries ?? [];
  const projectSummary = data?.projectSummary;
  const tierDefinitions = data?.tierDefinitions ?? [];
  const periodDistributions = data?.periodDistributions ?? [];

  // Detect if we're in EM mode by checking if all tiers have equity_multiple hurdle type
  const isEmMode = tierDefinitions.length > 0 && tierDefinitions.every(
    (t) => t.hurdleType === 'equity_multiple' || t.hurdleType === null
  );

  // Aggregate periods based on selected period type
  const aggregatedDistributions = useMemo((): AggregatedPeriod[] => {
    if (!periodDistributions.length) return [];

    // Helper to safely parse date
    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    };

    if (periodType === 'months') {
      // No aggregation - just add display fields
      return periodDistributions.map((row) => {
        const date = parseDate(row.date);
        const month = date ? String(date.getMonth() + 1).padStart(2, '0') : '??';
        const year = date ? date.getFullYear() : '????';
        return {
          ...row,
          displayPeriod: String(row.periodId),
          displayDate: `${month}-${year}`,
        };
      });
    }

    const useDistributionsForCashFlow = true;

    // Group periods by quarter or year
    const groups = new Map<string, PeriodDistribution[]>();

    periodDistributions.forEach((row) => {
      const date = parseDate(row.date);
      if (!date) return; // Skip rows with invalid dates
      const year = date.getFullYear();
      let key: string;

      if (periodType === 'quarters') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `${year}-Q${quarter}`;
      } else {
        key = String(year);
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    });

    // Aggregate each group
    let periodCounter = 1;
    const result: AggregatedPeriod[] = [];

    groups.forEach((rows, key) => {
      const lastRow = rows[rows.length - 1];

      // Build aggregated tiers - need to collect all unique tier numbers first
      const tierNumbers = new Set<number>();
      rows.forEach(r => r.tiers.forEach(t => tierNumbers.add(t.tierNumber)));

      const aggregatedTiers: TierDistribution[] = Array.from(tierNumbers).map((tierNum) => {
        const tiersForNum = rows.map(r => r.tiers.find(t => t.tierNumber === tierNum)).filter(Boolean) as TierDistribution[];
        const firstTier = tiersForNum[0];
        return {
          tierNumber: tierNum,
          tierName: firstTier?.tierName ?? '',
          lpSplitPct: firstTier?.lpSplitPct ?? 0,
          gpSplitPct: firstTier?.gpSplitPct ?? 0,
          lpShare: tiersForNum.reduce((sum, t) => sum + (t.lpShare || 0), 0),
          gpShare: tiersForNum.reduce((sum, t) => sum + (t.gpShare || 0), 0),
        };
      });

      let displayPeriod: string;
      let displayDate: string;

      if (periodType === 'quarters') {
        const [year, q] = key.split('-');
        displayPeriod = String(periodCounter);
        displayDate = `${q} ${year}`;
      } else {
        displayPeriod = String(periodCounter);
        displayDate = key;
      }

      const aggregatedCashFlow = useDistributionsForCashFlow
        ? rows.reduce((sum, r) => sum + (r.lpDist || 0) + (r.gpDist || 0), 0)
        : rows.reduce((sum, r) => sum + (r.cashFlow || 0), 0);

      result.push({
        periodId: periodCounter,
        date: lastRow.date,
        displayPeriod,
        displayDate,
        // SUM columns
        cashFlow: aggregatedCashFlow,
        lpDist: rows.reduce((sum, r) => sum + (r.lpDist || 0), 0),
        gpDist: rows.reduce((sum, r) => sum + (r.gpDist || 0), 0),
        // LAST value columns
        cumulativeCashFlow: lastRow.cumulativeCashFlow,
        lpIrr: lastRow.lpIrr,
        gpIrr: lastRow.gpIrr,
        accruedPref: lastRow.accruedPref,
        accruedHurdle: lastRow.accruedHurdle,
        tiers: aggregatedTiers,
      });

      periodCounter++;
    });

    return result;
  }, [isEmMode, periodDistributions, periodType]);

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

  const summaryWrapperStyle: React.CSSProperties = {
    border: '1px solid var(--cui-border-color)',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  };

  const summaryTableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'var(--cui-card-bg)',
    fontSize: '0.8rem',
  };

  const summaryHeaderCell: React.CSSProperties = {
    padding: '4px 10px',
    backgroundColor: 'var(--cui-tertiary-bg)',
    color: 'var(--cui-secondary-color)',
    fontWeight: 600,
    textAlign: 'center',
    border: '1px solid var(--cui-border-color)',
    height: '32px',
  };

  const summaryCell: React.CSSProperties = {
    padding: '4px 10px',
    textAlign: 'center',
    border: '1px solid var(--cui-border-color)',
    backgroundColor: 'var(--cui-card-bg)',
    height: '32px',
  };
  const summaryRowStyle: React.CSSProperties = { height: '32px' };

  const formatHurdle = (tierNumber: number): string => {
    const tier = tierDefinitions.find((t) => t.tierNumber === tierNumber);
    if (!tier || tier.hurdleRate === null || tier.hurdleRate === undefined) return '—';
    if (tier.hurdleType === 'equity_multiple') {
      const formatted = tier.hurdleRate % 1 === 0 ? tier.hurdleRate.toFixed(0) : tier.hurdleRate.toFixed(2);
      return `${formatted}x`;
    }
    const rate = tier.hurdleRate;
    const display = rate % 1 === 0 ? rate.toFixed(0) : rate.toFixed(1);
    return `${display}%`;
  };

  const getTierColSpan = (tier: TierDefinition): number => {
    const isPrefTier = tier.tierNumber === 1;
    const isHurdleTier = tier.tierNumber === 2;
    if (isPrefTier || isHurdleTier) {
      return isEmMode ? 3 : 4;
    }
    return 2;
  };

  const totalPeriodColumns = 4 + tierDefinitions.reduce((sum, tier) => sum + getTierColSpan(tier), 0);

  // Get tier display name based on mode
  const getTierDisplayName = (tier: TierSummary): string => {
    if (tier.tierNumber === 0) return 'Capital';
    // In EM mode, rename "Preferred Return + Capital" to "Return Capital"
    if (isEmMode && tier.tierNumber === 1) return 'Return Capital';
    return tier.tierName;
  };

  return (
    <>
      {/* Summary Card */}
      {!showPeriodTableOnly && (
        <div className="card">
          <div className="card-header d-flex align-items-center gap-2">
            <h5 className="mb-0">Waterfall Results</h5>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm ms-auto"
              onClick={onRun}
              disabled={loading}
            >
              {loading ? 'Running…' : 'Run Waterfall'}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setSummaryOpen(!summaryOpen)}
              aria-expanded={summaryOpen}
              aria-label="Toggle Waterfall Results"
            >
              {summaryOpen ? '▾' : '▸'}
            </button>
          </div>

          {summaryOpen && (
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
              <div style={summaryWrapperStyle}>
                <table style={summaryTableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...summaryHeaderCell, textAlign: 'left' }}>Tier</th>
                      <th style={summaryHeaderCell}>Hurdle</th>
                      <th style={{ ...summaryHeaderCell, textAlign: 'right' }}>Project</th>
                      <th style={{ ...summaryHeaderCell, textAlign: 'right' }}>LP</th>
                      <th style={{ ...summaryHeaderCell, textAlign: 'right' }}>GP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tierSummaries.map((tier) => {
                      const displayName = getTierDisplayName(tier);
                      return (
                        <tr key={tier.tierNumber} style={summaryRowStyle}>
                          <td style={{ ...summaryCell, textAlign: 'left' }}>{displayName}</td>
                          <td style={summaryCell}>{formatHurdle(tier.tierNumber)}</td>
                          <td style={{ ...summaryCell, textAlign: 'right' }}>{formatCurrency(tier.totalAmount)}</td>
                          <td style={{ ...summaryCell, textAlign: 'right' }}>{formatCurrency(tier.lpAmount)}</td>
                          <td style={{ ...summaryCell, textAlign: 'right' }}>{formatCurrency(tier.gpAmount)}</td>
                        </tr>
                      );
                    })}
                    <tr style={{ ...summaryRowStyle, fontWeight: 600 }}>
                      <td style={{ ...summaryCell, textAlign: 'left' }}>Total</td>
                      <td style={summaryCell}> </td>
                      <td style={{ ...summaryCell, textAlign: 'right' }}>{formatCurrency(projectSummary?.totalDistributed)}</td>
                      <td style={{ ...summaryCell, textAlign: 'right' }}>
                        {formatCurrency(partnerSummaries.find(p => p.partnerType === 'LP')?.totalDistributed)}
                      </td>
                      <td style={{ ...summaryCell, textAlign: 'right' }}>
                        {formatCurrency(partnerSummaries.find(p => p.partnerType === 'GP')?.totalDistributed)}
                      </td>
                    </tr>
                    <tr style={{ ...summaryRowStyle, color: 'var(--cui-secondary-color)' }}>
                      <td style={{ ...summaryCell, textAlign: 'left' }}>IRR</td>
                      <td style={summaryCell}> </td>
                      <td style={{ ...summaryCell, textAlign: 'right' }}>{formatPct(projectSummary?.projectIrr)}</td>
                      <td style={{ ...summaryCell, textAlign: 'right' }}>
                        {formatPct(partnerSummaries.find(p => p.partnerType === 'LP')?.irr)}
                      </td>
                      <td style={{ ...summaryCell, textAlign: 'right' }}>
                        {formatPct(partnerSummaries.find(p => p.partnerType === 'GP')?.irr)}
                      </td>
                    </tr>
                    <tr style={{ ...summaryRowStyle, color: 'var(--cui-secondary-color)' }}>
                      <td style={{ ...summaryCell, textAlign: 'left' }}>Equity Multiple</td>
                      <td style={summaryCell}> </td>
                      <td style={{ ...summaryCell, textAlign: 'right' }}>{formatMultiple(projectSummary?.equityMultiple)}</td>
                      <td style={{ ...summaryCell, textAlign: 'right' }}>
                        {formatMultiple(partnerSummaries.find(p => p.partnerType === 'LP')?.equityMultiple)}
                      </td>
                      <td style={{ ...summaryCell, textAlign: 'right' }}>
                        {formatMultiple(partnerSummaries.find(p => p.partnerType === 'GP')?.equityMultiple)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* Period-by-Period Table - renders as separate card */}
      {data && showPeriodTable && (
        <div className="card">
          <div className="card-header d-flex align-items-center gap-2">
            <h6 className="mb-0">Period-by-Period Distributions</h6>
            <div className="btn-group btn-group-sm ms-auto" role="group" aria-label="Period type toggle">
              <button
                type="button"
                className={`btn ${periodType === 'months' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setPeriodType('months')}
              >
                Months
              </button>
              <button
                type="button"
                className={`btn ${periodType === 'quarters' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setPeriodType('quarters')}
              >
                Quarters
              </button>
              <button
                type="button"
                className={`btn ${periodType === 'years' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setPeriodType('years')}
              >
                Years
              </button>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setPeriodsOpen(!periodsOpen)}
              aria-expanded={periodsOpen}
              aria-label="Toggle Period-by-Period Distributions"
            >
              {periodsOpen ? '▾' : '▸'}
            </button>
          </div>
          {periodsOpen && (
          <div className="card-body py-2" style={{ fontSize: '0.8rem' }}>
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
                        Project<br />Cash Flow
                      </th>
                      <th
                        rowSpan={2}
                        className="align-middle text-end"
                        style={{ backgroundColor: 'rgba(255, 193, 7, 0.15)', whiteSpace: 'nowrap' }}
                      >
                        Cume<br />Net Income
                      </th>
                      {tierDefinitions.map((tier) => {
                        const colSpan = getTierColSpan(tier);
                        let displayName = tier.tierName;
                        if (displayName.toLowerCase().includes('promote')) {
                          displayName = displayName.replace(/promote/i, 'Hurdle');
                        }
                        if (isEmMode && tier.tierNumber === 1) {
                          displayName = 'Return Capital';
                        }
                        const hurdleSuffix = tier.hurdleType === 'equity_multiple' ? 'x' : '%';
                        return (
                          <th
                            key={tier.tierNumber}
                            colSpan={colSpan}
                            className="text-center"
                            style={{ borderBottom: 'none' }}
                          >
                            {displayName}
                            {tier.hurdleRate !== null && ` - ${tier.hurdleRate}${hurdleSuffix}`}
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
                            {isPrefTier && !isEmMode && (
                              <th className="text-end" style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                                Accrued<br />Pref
                              </th>
                            )}
                            {isHurdleTier && !isEmMode && (
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
                    {aggregatedDistributions.map((row, rowIdx) => {
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
                        <tr key={`${row.displayPeriod}-${rowIdx}`}>
                          <td className="text-start">{row.displayPeriod}</td>
                          <td className="text-start">{row.displayDate}</td>
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
                                {isPrefTier && !isEmMode && (
                                  <td className="text-end" style={{ color: 'var(--cui-secondary-color)' }}>
                                    {fmt(row.accruedPref)}
                                  </td>
                                )}
                                {isHurdleTier && !isEmMode && (
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
                    {aggregatedDistributions.length === 0 && (
                      <tr>
                        <td
                          colSpan={totalPeriodColumns}
                          className="text-muted"
                        >
                          No distributions calculated.
                        </td>
                      </tr>
                    )}
                    {/* Totals row */}
                    {aggregatedDistributions.length > 0 && (
                      <tr className="fw-semibold" style={{ borderTop: '2px solid var(--cui-border-color)' }}>
                        <td colSpan={2} className="text-end">Total</td>
                        <td className="text-end" style={{ backgroundColor: 'rgba(255, 193, 7, 0.08)' }}>
                          {formatCurrency(
                            aggregatedDistributions.reduce((sum, r) => sum + (r.cashFlow || 0), 0)
                          )}
                        </td>
                        <td className="text-end" style={{ backgroundColor: 'rgba(255, 193, 7, 0.08)' }}>
                          {formatCurrency(
                            aggregatedDistributions[aggregatedDistributions.length - 1]?.cumulativeCashFlow
                          )}
                        </td>
                        {tierDefinitions.map((tier) => {
                          const lpTotal = aggregatedDistributions.reduce((sum, r) => {
                            const t = r.tiers.find((td) => td.tierNumber === tier.tierNumber);
                            return sum + (t?.lpShare || 0);
                          }, 0);
                          const gpTotal = aggregatedDistributions.reduce((sum, r) => {
                            const t = r.tiers.find((td) => td.tierNumber === tier.tierNumber);
                            return sum + (t?.gpShare || 0);
                          }, 0);
                          const isPrefTier = tier.tierNumber === 1;
                          const isHurdleTier = tier.tierNumber === 2;
                          // Calculate totals for residual columns
                          const tier2Total = aggregatedDistributions.reduce((sum, r) => {
                            const t2 = r.tiers.find((td) => td.tierNumber === 2);
                            const t3 = r.tiers.find((td) => td.tierNumber === 3);
                            return sum + (t2?.lpShare || 0) + (t2?.gpShare || 0) + (t3?.lpShare || 0) + (t3?.gpShare || 0);
                          }, 0);
                          const tier3Total = aggregatedDistributions.reduce((sum, r) => {
                            const t3 = r.tiers.find((td) => td.tierNumber === 3);
                            return sum + (t3?.lpShare || 0) + (t3?.gpShare || 0);
                          }, 0);
                          return (
                            <React.Fragment key={tier.tierNumber}>
                              {isPrefTier && !isEmMode && (
                                <td className="text-end" style={{ color: 'var(--cui-secondary-color)' }}>—</td>
                              )}
                              {isHurdleTier && !isEmMode && (
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
          )}
        </div>
      )}
    </>
  );
};

export default WaterfallResults;
