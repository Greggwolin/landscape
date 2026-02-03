/* Attached Product Pricing tile for Napkin Analysis - townhomes & condos */
'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, Map, X } from 'lucide-react';
import { useSfComps } from '@/hooks/analysis/useSfComps';
import { formatMoney } from '@/utils/formatters/number';
import { NapkinCompsMap } from './NapkinCompsMap';
import { SemanticBadge } from '@/components/ui/landscape';

type NapkinAttachedPricingProps = {
  projectId: number;
};

function formatCurrencyCompact(value: number | null | undefined, fractionDigits = 0): string {
  if (value === null || value === undefined) return '—';
  return formatMoney(value, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
}

const SOURCE_INDICATORS: Record<string, { icon: string; label: string }> = {
  redfin: { icon: '🔵', label: 'Redfin' },
  benchmark: { icon: '🟡', label: 'Benchmark' },
  user: { icon: '⚪', label: 'User Override' }
};

// Attached product configurations by SF band
const ATTACHED_PRODUCTS = [
  { product: 'Townhome S', minSqft: 1200, maxSqft: 1600, label: '1,200-1,600 SF' },
  { product: 'Townhome M', minSqft: 1600, maxSqft: 2000, label: '1,600-2,000 SF' },
  { product: 'Townhome L', minSqft: 2000, maxSqft: 2500, label: '2,000-2,500 SF' },
  { product: 'Condo 1BR', minSqft: 600, maxSqft: 900, label: '600-900 SF' },
  { product: 'Condo 2BR', minSqft: 900, maxSqft: 1300, label: '900-1,300 SF' },
];

interface ProductRow {
  product: string;
  sqftBand: string;
  compCount: number;
  medianPrice: number | null;
  medianPpsf: number | null;
  flf: number;
  residualPerUnit: number | null;
  source: 'redfin' | 'benchmark' | 'user';
  dataQuality: string;
}

// Default to current year minus 2
const DEFAULT_MIN_YEAR = new Date().getFullYear() - 2;

export function NapkinAttachedPricing({ projectId }: NapkinAttachedPricingProps) {
  // Committed values used for the API query
  const [radiusMiles, setRadiusMiles] = useState<number>(5);
  const [soldWithinDays, setSoldWithinDays] = useState<number>(365);
  const [minYearBuilt, setMinYearBuilt] = useState<number>(DEFAULT_MIN_YEAR);

  // Draft values for the input fields (updated on every keystroke)
  const [draftRadius, setDraftRadius] = useState<string>('5');
  const [draftDays, setDraftDays] = useState<string>('365');
  const [draftMinYear, setDraftMinYear] = useState<string>(String(DEFAULT_MIN_YEAR));

  // FLV calculation param
  const [defaultFlf, setDefaultFlf] = useState(12);

  // User price overrides (keyed by product name)
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number | null>>({});

  // Accordion state
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMap, setShowMap] = useState(false);

  // Close map on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMap) {
        setShowMap(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showMap]);

  const { data, isLoading, isError, error, refetch } = useSfComps(projectId, {
    radiusMiles,
    soldWithinDays,
    minYearBuilt,
    propertyType: 'attached'
  });

  // Commit radius value on blur or Enter
  const commitRadius = useCallback(() => {
    const value = parseFloat(draftRadius);
    if (Number.isFinite(value) && value >= 0.5) {
      setRadiusMiles(value);
    } else {
      setDraftRadius(String(radiusMiles));
    }
  }, [draftRadius, radiusMiles]);

  // Commit days value on blur or Enter
  const commitDays = useCallback(() => {
    const value = parseInt(draftDays, 10);
    if (Number.isFinite(value) && value >= 30) {
      setSoldWithinDays(value);
    } else {
      setDraftDays(String(soldWithinDays));
    }
  }, [draftDays, soldWithinDays]);

  // Commit minYear value on blur or Enter
  const commitMinYear = useCallback(() => {
    const value = parseInt(draftMinYear, 10);
    if (Number.isFinite(value) && value >= 1990 && value <= new Date().getFullYear()) {
      setMinYearBuilt(value);
    } else {
      setDraftMinYear(String(minYearBuilt));
    }
  }, [draftMinYear, minYearBuilt]);

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

  const handleMinYearKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitMinYear();
      (e.target as HTMLInputElement).blur();
    }
  }, [commitMinYear]);

  // Analyze comps and calculate stats per product
  const productRows: ProductRow[] = useMemo(() => {
    if (!data?.comps) return [];

    return ATTACHED_PRODUCTS.map((config) => {
      // Filter comps by sqft band
      const matchingComps = data.comps.filter(comp => {
        if (!comp.sqft) return false;
        return comp.sqft >= config.minSqft && comp.sqft < config.maxSqft;
      });

      const prices = matchingComps.map(c => c.salePrice).filter(p => Number.isFinite(p));
      const ppsfs = matchingComps
        .map(c => c.pricePerSqft)
        .filter((p): p is number => p !== null && Number.isFinite(p));

      const medianPrice = prices.length > 0
        ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
        : null;

      const medianPpsf = ppsfs.length > 0
        ? ppsfs.sort((a, b) => a - b)[Math.floor(ppsfs.length / 2)]
        : null;

      const overridePrice = priceOverrides[config.product];
      const effectivePrice = overridePrice !== undefined && overridePrice !== null
        ? overridePrice
        : medianPrice;

      // Calculate residual: Price × FLF%
      const residualPerUnit = effectivePrice !== null
        ? Math.round(effectivePrice * (defaultFlf / 100))
        : null;

      let source: 'redfin' | 'benchmark' | 'user' = matchingComps.length >= 2 ? 'redfin' : 'benchmark';
      if (overridePrice !== undefined && overridePrice !== null) {
        source = 'user';
      }

      const dataQuality = matchingComps.length >= 5 ? 'good' : matchingComps.length >= 2 ? 'fair' : 'insufficient';

      return {
        product: config.product,
        sqftBand: config.label,
        compCount: matchingComps.length,
        medianPrice: effectivePrice,
        medianPpsf,
        flf: defaultFlf,
        residualPerUnit,
        source,
        dataQuality
      };
    });
  }, [data?.comps, priceOverrides, defaultFlf]);

  const handlePriceOverride = (product: string, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numValue) || value === '') {
      setPriceOverrides(prev => {
        const next = { ...prev };
        delete next[product];
        return next;
      });
    } else {
      setPriceOverrides(prev => ({ ...prev, [product]: numValue }));
    }
  };

  const totalComps = data?.comps?.length ?? 0;
  const compsWithSqft = data?.comps?.filter(c => c.sqft !== null).length ?? 0;

  const renderLoading = () => (
    <div className="d-flex align-items-center gap-3 py-3">
      <div className="spinner-border text-primary" role="status" aria-hidden />
      <div>
        <div className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
          Loading attached pricing data…
        </div>
        <div className="text-muted small">Fetching recent townhome &amp; condo sales.</div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="py-3">
      <div className="fw-semibold mb-1" style={{ color: 'var(--cui-body-color)' }}>
        Unable to load pricing data right now.
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

  return (
    <div className="card h-100 position-relative" style={{ overflow: 'visible' }}>
      <div
        className="card-header d-flex justify-content-between align-items-center"
        style={{ cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h5 className="mb-0">Attached Product Pricing</h5>
        <div className="d-flex align-items-center gap-2">
          {!isLoading && data && (
            <SemanticBadge intent="status" value="validated">
              {totalComps} comps
            </SemanticBadge>
          )}
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {isExpanded && (
        <div className="card-body">
          {isLoading && renderLoading()}
          {isError && !isLoading && renderError()}

          {!isLoading && !isError && data && (
            <>
              {/* Settings Row */}
              <div className="d-flex flex-wrap gap-3 align-items-end mb-3 justify-content-between">
                <div className="d-flex flex-wrap gap-3 align-items-end">
                  {/* Search Radius */}
                  <div className="text-center">
                    <label className="text-muted small d-block mb-1">Search<br/>Radius</label>
                    <input
                      type="text"
                      value={`${draftRadius} mi`}
                      onChange={(e) => {
                        const num = e.target.value.replace(/[^0-9.]/g, '');
                        setDraftRadius(num);
                      }}
                      onBlur={commitRadius}
                      onKeyDown={handleRadiusKeyDown}
                      className="form-control form-control-sm text-center"
                      style={{ width: 70 }}
                    />
                  </div>
                  {/* Year Built */}
                  <div className="text-center">
                    <label className="text-muted small d-block mb-1">Year<br/>Built</label>
                    <input
                      type="text"
                      value={`${draftMinYear}+`}
                      onChange={(e) => {
                        const num = e.target.value.replace(/[^0-9]/g, '');
                        setDraftMinYear(num);
                      }}
                      onBlur={commitMinYear}
                      onKeyDown={handleMinYearKeyDown}
                      className="form-control form-control-sm text-center"
                      style={{ width: 70 }}
                    />
                  </div>
                  {/* History Days */}
                  <div className="text-center">
                    <label className="text-muted small d-block mb-1">History<br/>Days</label>
                    <input
                      type="number"
                      min={30}
                      max={730}
                      step={30}
                      value={draftDays}
                      onChange={(e) => setDraftDays(e.target.value)}
                      onBlur={commitDays}
                      onKeyDown={handleDaysKeyDown}
                      className="form-control form-control-sm text-center"
                      style={{ width: 70 }}
                    />
                  </div>
                  {/* Land Residual % */}
                  <div className="text-center">
                    <label className="text-muted small d-block mb-1">Land<br/>Residual %</label>
                    <input
                      type="text"
                      value={`${defaultFlf}%`}
                      onChange={(e) => {
                        const num = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
                        if (!isNaN(num)) setDefaultFlf(num);
                      }}
                      className="form-control form-control-sm text-center"
                      style={{ width: 70 }}
                    />
                  </div>
                </div>
                {/* View/Hide Comps Map Button */}
                {data && data.comps.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
                    onClick={() => setShowMap(!showMap)}
                  >
                    <Map size={14} />
                    <span>{showMap ? 'Hide Comps Map' : 'View Comps Map'}</span>
                  </button>
                )}
              </div>

              {/* Product Table */}
              {productRows.every(r => r.compCount === 0) ? (
                <div className="py-2">
                  <div className="text-muted">
                    No attached comps found in this area.
                  </div>
                  <div className="text-muted small">
                    Try widening the search radius or extending the history period.
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <table className="table table-sm align-middle mb-0" style={{ fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ color: 'var(--cui-secondary-color)' }}>
                        <th>Product</th>
                        <th>SF Band</th>
                        <th className="text-end">Comps</th>
                        <th className="text-end">Median Price</th>
                        <th className="text-end">$/SF</th>
                        <th className="text-end">Land %</th>
                        <th className="text-end">Residual/Unit</th>
                        <th className="text-center">Src</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productRows.map((row) => (
                        <tr key={row.product}>
                          <td className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>{row.product}</td>
                          <td style={{ color: 'var(--cui-body-color)' }}>{row.sqftBand}</td>
                          <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                            <span className={row.dataQuality === 'insufficient' ? 'text-warning' : ''}>
                              {row.compCount}
                            </span>
                          </td>
                          <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                            <input
                              type="text"
                              value={row.medianPrice !== null ? `$${row.medianPrice.toLocaleString()}` : ''}
                              onChange={(e) => handlePriceOverride(row.product, e.target.value)}
                              placeholder="Enter price"
                              className="form-control form-control-sm"
                              style={{
                                width: '100px',
                                textAlign: 'right',
                                display: 'inline-block',
                                backgroundColor: row.source === 'user' ? 'var(--cui-warning-bg-subtle)' : undefined
                              }}
                            />
                          </td>
                          <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                            {row.medianPpsf !== null ? `$${row.medianPpsf}` : '—'}
                          </td>
                          <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>{row.flf}%</td>
                          <td className="text-end fw-semibold" style={{ color: row.residualPerUnit && row.residualPerUnit > 0 ? '#57c68a' : '#ef4444' }}>
                            {formatCurrencyCompact(row.residualPerUnit)}
                          </td>
                          <td className="text-center">
                            <span title={SOURCE_INDICATORS[row.source].label}>
                              {SOURCE_INDICATORS[row.source].icon}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer */}
              <div className="mt-3 pt-2 d-flex justify-content-between align-items-center" style={{ borderTop: '1px solid var(--cui-border-color)' }}>
                <div className="d-flex gap-3">
                  {Object.entries(SOURCE_INDICATORS).map(([key, value]) => (
                    <span key={key} className="small" style={{ color: 'var(--cui-secondary-color)' }}>
                      {value.icon} {value.label}
                    </span>
                  ))}
                </div>
                <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>
                  {totalComps} total comps • {compsWithSqft} with sqft
                </span>
              </div>

            </>
          )}
        </div>
      )}

      {/* Inline Map Flyout - slides out from the card */}
      {showMap && data && (
        <div
          className="position-absolute top-0 h-100 d-flex flex-column"
          style={{
            left: '100%',
            width: 'calc(50vw - 2rem)',
            maxWidth: '600px',
            minWidth: '400px',
            backgroundColor: 'var(--cui-body-bg)',
            borderLeft: '1px solid var(--cui-border-color)',
            boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)',
            zIndex: 10,
            animation: 'slideInFromCard 0.2s ease-out'
          }}
        >
          {/* Flyout Header */}
          <div
            className="card-header d-flex justify-content-between align-items-center py-2"
          >
            <h5 className="mb-0" style={{ fontSize: '1.09375rem' }}>
              Attached Comps Map
              <span className="ms-2 small fw-normal" style={{ color: 'var(--cui-secondary-color)' }}>
                {data.comps.length} comps within {radiusMiles} mi
              </span>
            </h5>
            <button
              type="button"
              className="btn btn-sm btn-link p-1"
              onClick={() => setShowMap(false)}
              style={{ color: 'var(--cui-secondary-color)' }}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Map Container */}
          <div className="flex-grow-1 p-3 d-flex flex-column" style={{ overflow: 'hidden' }}>
            <NapkinCompsMap
              projectId={projectId}
              comps={data.comps}
              height="100%"
              radiusMiles={radiusMiles}
            />
          </div>
        </div>
      )}

      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes slideInFromCard {
          from {
            transform: translateX(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default NapkinAttachedPricing;
