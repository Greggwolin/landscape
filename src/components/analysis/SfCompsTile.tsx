/* Housing Price Comparables tile for Land projects */
'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useSfComps } from '@/hooks/analysis/useSfComps';
import { formatMoney, formatNumber } from '@/utils/formatters/number';

type SfCompsTileProps = {
  projectId: number;
};

function formatCurrencyCompact(value: number | null | undefined, fractionDigits = 0): string {
  if (value === null || value === undefined) return '—';
  return formatMoney(value, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'MMM yy');
  } catch (_err) {
    return value;
  }
}

export function SfCompsTile({ projectId }: SfCompsTileProps) {
  // Committed values used for the API query
  const [radiusMiles, setRadiusMiles] = useState<number>(3);
  const [soldWithinDays, setSoldWithinDays] = useState<number>(180);

  // Draft values for the input fields (updated on every keystroke)
  const [draftRadius, setDraftRadius] = useState<string>('3');
  const [draftDays, setDraftDays] = useState<string>('180');

  const { data, isLoading, isError, error, refetch, isFetching } = useSfComps(projectId, {
    radiusMiles,
    soldWithinDays
  });

  // Commit radius value on blur or Enter
  const commitRadius = useCallback(() => {
    const value = parseFloat(draftRadius);
    if (Number.isFinite(value) && value >= 0.5) {
      setRadiusMiles(value);
    } else {
      // Reset to current value if invalid
      setDraftRadius(String(radiusMiles));
    }
  }, [draftRadius, radiusMiles]);

  // Commit days value on blur or Enter
  const commitDays = useCallback(() => {
    const value = parseInt(draftDays, 10);
    if (Number.isFinite(value) && value >= 30) {
      setSoldWithinDays(value);
    } else {
      // Reset to current value if invalid
      setDraftDays(String(soldWithinDays));
    }
  }, [draftDays, soldWithinDays]);

  const handleRadiusKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitRadius();
      (e.target as HTMLInputElement).blur();
    }
  }, [commitRadius]);

  const handleDaysKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitDays();
      (e.target as HTMLInputElement).blur();
    }
  }, [commitDays]);

  const sortedComps = useMemo(() => {
    if (!data?.comps) return [];
    return [...data.comps]
      .sort((a, b) => {
        const aDate = new Date(a.saleDate).getTime();
        const bDate = new Date(b.saleDate).getTime();
        return Number.isFinite(bDate) && Number.isFinite(aDate) ? bDate - aDate : 0;
      })
      .slice(0, 10);
  }, [data?.comps]);

  const renderLoading = () => (
    <div className="d-flex align-items-center gap-3 py-3">
      <div className="spinner-border text-primary" role="status" aria-hidden />
      <div>
        <div className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
          Loading price comparables…
        </div>
        <div className="text-muted small">Fetching recent single-family sales near this project.</div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="py-3">
      <div className="fw-semibold mb-1" style={{ color: 'var(--cui-body-color)' }}>
        Unable to load comparables right now.
      </div>
      <div className="text-muted small mb-2">
        {error?.message || 'Please try again later.'}
      </div>
      <button
        type="button"
        className="btn btn-link p-0"
        onClick={() => refetch()}
        style={{ color: 'var(--cui-primary)' }}
      >
        Retry
      </button>
    </div>
  );

  const renderEmpty = () => (
    <div className="py-2">
      <div className="text-muted">
        No qualifying comps found within {data?.searchRadiusMiles ?? '—'} miles.
      </div>
      <div className="text-muted small">
        Try widening the search radius or extending the sold-within period.
      </div>
    </div>
  );

  const renderStats = () => {
    if (!data) return null;
    const stats = data.stats;

    return (
                  <div className="row gy-2">
                    <div className="col-md-3 col-sm-6">
          <div className="text-muted small">Median Price</div>
          <div className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
            {formatCurrencyCompact(stats.medianPrice)}
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="text-muted small">Median $/SF</div>
          <div className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
            {stats.medianPricePerSqft != null
              ? formatCurrencyCompact(stats.medianPricePerSqft)
              : '—'}
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="text-muted small">25th–75th Percentile</div>
          <div className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
            {stats.p25Price != null || stats.p75Price != null
              ? `${formatCurrencyCompact(stats.p25Price)} – ${formatCurrencyCompact(stats.p75Price)}`
              : '—'}
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="text-muted small">Avg Year Built</div>
          <div className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
            {stats.avgYearBuilt ?? '—'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="card h-100">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Housing Price Comparables</h5>
        {data?.asOfDate && (
          <span className="text-muted small">As of {formatDate(data.asOfDate)}</span>
        )}
      </div>
      <div className="card-body">
        {isLoading && renderLoading()}
        {isError && !isLoading && renderError()}

        {!isLoading && !isError && data && (
          <>
            <div className="d-flex flex-wrap gap-3 align-items-center mb-3">
              <div>
                <label className="text-muted small d-block mb-1">Radius (mi)</label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={draftRadius}
                  onChange={(e) => setDraftRadius(e.target.value)}
                  onBlur={commitRadius}
                  onKeyDown={handleRadiusKeyDown}
                  className="form-control form-control-sm"
                  style={{ width: 70 }}
                />
              </div>
              <div>
                <label className="text-muted small d-block mb-1">Days</label>
                <input
                  type="number"
                  min={30}
                  max={365}
                  step={30}
                  value={draftDays}
                  onChange={(e) => setDraftDays(e.target.value)}
                  onBlur={commitDays}
                  onKeyDown={handleDaysKeyDown}
                  className="form-control form-control-sm"
                  style={{ width: 70 }}
                />
              </div>
              <div className="text-muted small" style={{ alignSelf: 'flex-end', paddingBottom: 6 }}>
                {isFetching ? 'Updating…' : `${data.stats.count} comps`}
              </div>
            </div>

            {renderStats()}

            {data.stats.count === 0 ? (
              renderEmpty()
            ) : (
              <div className="mt-3">
                <table className="table table-sm align-middle mb-0" style={{ fontSize: '0.8125rem', tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr style={{ color: 'var(--cui-secondary-color)' }}>
                      <th className="text-center" style={{ width: 55 }}>Sold</th>
                      <th style={{ width: 200 }}>Address</th>
                      <th className="text-center" style={{ width: 50 }}>Year</th>
                      <th className="text-center" style={{ width: 35 }}>Bd</th>
                      <th className="text-center" style={{ width: 35 }}>Ba</th>
                      <th className="text-end" style={{ width: 55 }}>SqFt</th>
                      <th className="text-end" style={{ width: 55 }}>Lot</th>
                      <th className="text-end" style={{ width: 75 }}>Price</th>
                      <th className="text-end" style={{ width: 50 }}>$/SF</th>
                      <th className="text-center" style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedComps.map((comp) => (
                      <tr key={comp.mlsId}>
                        <td className="text-center text-muted">{formatDate(comp.saleDate)}</td>
                        <td>
                          <div
                            className="text-truncate"
                            title={`${comp.address || ''}, ${[comp.city, comp.state].filter(Boolean).join(', ')}`}
                            style={{ maxWidth: 210, whiteSpace: 'nowrap' }}
                          >
                            <span className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>{comp.address || '—'}</span>
                            <span className="text-muted">, {[comp.city, comp.state].filter(Boolean).join(', ')}</span>
                          </div>
                        </td>
                        <td className="text-center text-muted">{comp.yearBuilt ?? '—'}</td>
                        <td className="text-center text-muted">{comp.beds ?? '—'}</td>
                        <td className="text-center text-muted">{comp.baths ?? '—'}</td>
                        <td className="text-end text-muted">
                          {comp.sqft != null ? formatNumber(comp.sqft) : '—'}
                        </td>
                        <td className="text-end text-muted">
                          {comp.lotSqft != null ? formatNumber(comp.lotSqft) : '—'}
                        </td>
                        <td className="text-end fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
                          {formatCurrencyCompact(comp.salePrice)}
                        </td>
                        <td className="text-end text-muted">
                          {comp.pricePerSqft != null ? `$${comp.pricePerSqft}` : '—'}
                        </td>
                        <td className="text-center">
                          {comp.url ? (
                            <a
                              href={comp.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'var(--cui-primary)' }}
                              title="View on Redfin"
                            >
                              <ExternalLink size={14} />
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SfCompsTile;
