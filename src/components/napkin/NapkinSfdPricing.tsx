/* SFD Product Pricing tile for Napkin Analysis - follows SfCompsTile pattern exactly */
'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Map, X } from 'lucide-react';
import { useSfComps } from '@/hooks/analysis/useSfComps';
import { formatMoney } from '@/utils/formatters/number';
import {
  analyzeSfdComps,
  calculateFlvMetrics,
  DEFAULT_SFD_PRODUCTS,
  type SfdProductStats
} from '@/lib/napkin/sfdCompStats';
import { NapkinCompsMap } from './NapkinCompsMap';
import { CompDetailsSection } from './CompDetailsSection';
import { SemanticBadge } from '@/components/ui/landscape';

type NapkinSfdPricingProps = {
  projectId: number;
  showCompDetails?: boolean; // Show expandable comp details section (default: false for Napkin, true for Standard mode)
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

// 8-color progressive ramp for lot SF bands (one per product)
// Colors progress from cool (small lots) to warm (large lots)
const BAND_COLOR_RAMP: Array<{ bg: string; border: string; text: string; dot: string }> = [
  { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.5)', text: '#16a34a', dot: '#22c55e' },    // 40' - green
  { bg: 'rgba(74, 222, 128, 0.15)', border: 'rgba(74, 222, 128, 0.5)', text: '#15803d', dot: '#4ade80' },  // 45' - light green
  { bg: 'rgba(163, 230, 53, 0.15)', border: 'rgba(163, 230, 53, 0.5)', text: '#65a30d', dot: '#a3e635' },  // 50' - lime
  { bg: 'rgba(250, 204, 21, 0.15)', border: 'rgba(250, 204, 21, 0.5)', text: '#ca8a04', dot: '#facc15' },  // 55' - yellow
  { bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.5)', text: '#ea580c', dot: '#fb923c' },  // 60' - orange
  { bg: 'rgba(248, 113, 113, 0.15)', border: 'rgba(248, 113, 113, 0.5)', text: '#dc2626', dot: '#f87171' }, // 65' - light red
  { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.5)', text: '#b91c1c', dot: '#ef4444' },    // 70' - red
  { bg: 'rgba(190, 24, 93, 0.15)', border: 'rgba(190, 24, 93, 0.5)', text: '#9d174d', dot: '#be185d' },    // 80' - pink/magenta
];

// Map product names to color indices
const PRODUCT_COLOR_INDEX: Record<string, number> = {
  "40'": 0, "45'": 1, "50'": 2, "55'": 3,
  "60'": 4, "65'": 5, "70'": 6, "80'": 7,
};

function getBandColorByProduct(product: string) {
  const index = PRODUCT_COLOR_INDEX[product] ?? 0;
  return BAND_COLOR_RAMP[index];
}

interface ProductRow {
  product: string;
  lotSfBand: string;
  lotSfMin: number;
  compCount: number;
  medianPrice: number | null;
  flf: number;
  flvPerFf: number | null;
  subImpPerFf: number;
  residualPerFf: number | null;
  source: 'redfin' | 'benchmark' | 'user';
  dataQuality: string;
  lotWidthFt: number;
}

// Default to current year minus 2
const DEFAULT_MIN_YEAR = new Date().getFullYear() - 2;

export function NapkinSfdPricing({ projectId, showCompDetails = false }: NapkinSfdPricingProps) {
  // Committed values used for the API query
  const [radiusMiles, setRadiusMiles] = useState<number>(5);
  const [soldWithinDays, setSoldWithinDays] = useState<number>(180);
  const [minYearBuilt, setMinYearBuilt] = useState<number>(DEFAULT_MIN_YEAR);

  // Draft values for the input fields (updated on every keystroke)
  const [draftRadius, setDraftRadius] = useState<string>('5');
  const [draftDays, setDraftDays] = useState<string>('180');
  const [draftMinYear, setDraftMinYear] = useState<string>(String(DEFAULT_MIN_YEAR));

  // FLV calculation params
  const [subImpPerFf, setSubImpPerFf] = useState(1300);
  const [defaultFlf, setDefaultFlf] = useState(23);

  // User price overrides (keyed by product name)
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number | null>>({});

  // Map accordion state
  const [showMap, setShowMap] = useState(false);
  const [flyoutWidth, setFlyoutWidth] = useState<number>(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate flyout width when map opens or window resizes
  useEffect(() => {
    if (!showMap || !cardRef.current) return;

    const calculateWidth = () => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const rightEdge = rect.right;
        const viewportWidth = window.innerWidth;
        // Width from card's right edge to viewport right edge, minus some padding
        const width = viewportWidth - rightEdge - 16;
        setFlyoutWidth(Math.max(width, 300)); // Minimum 300px
      }
    };

    calculateWidth();
    window.addEventListener('resize', calculateWidth);
    return () => window.removeEventListener('resize', calculateWidth);
  }, [showMap]);

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

  const { data, isLoading, isError, error, refetch, isFetching } = useSfComps(projectId, {
    radiusMiles,
    soldWithinDays,
    minYearBuilt
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
  const analysis = useMemo(() => {
    if (!data?.comps) return null;
    return analyzeSfdComps(data.comps, DEFAULT_SFD_PRODUCTS, radiusMiles, soldWithinDays);
  }, [data?.comps, radiusMiles, soldWithinDays]);

  // Build display rows with FLV calculations
  const productRows: ProductRow[] = useMemo(() => {
    if (!analysis) return [];

    return analysis.products.map((stats: SfdProductStats) => {
      const config = DEFAULT_SFD_PRODUCTS.find(p => p.product === stats.product);
      const lotWidthFt = config?.lotWidthFt || 50;

      const overridePrice = priceOverrides[stats.product];
      const effectivePrice = overridePrice !== undefined && overridePrice !== null
        ? overridePrice
        : stats.medianPrice;

      const flvMetrics = calculateFlvMetrics(effectivePrice, defaultFlf, subImpPerFf, lotWidthFt);

      let source: 'redfin' | 'benchmark' | 'user' = stats.source;
      if (overridePrice !== undefined && overridePrice !== null) {
        source = 'user';
      } else if (stats.compCount < 2) {
        source = 'benchmark';
      }

      return {
        product: stats.product,
        lotSfBand: stats.lotSfBand,
        lotSfMin: config?.lotSfMin || 0,
        compCount: stats.compCount,
        medianPrice: effectivePrice,
        flf: defaultFlf,
        flvPerFf: flvMetrics.flvPerFf,
        subImpPerFf: flvMetrics.subImpPerFf,
        residualPerFf: flvMetrics.residualPerFf,
        source,
        dataQuality: stats.dataQuality,
        lotWidthFt
      };
    });
  }, [analysis, priceOverrides, defaultFlf, subImpPerFf]);

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

  const renderLoading = () => (
    <div className="d-flex align-items-center gap-3 py-3">
      <div className="spinner-border text-primary" role="status" aria-hidden />
      <div>
        <div className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
          Loading SFD pricing data…
        </div>
        <div className="text-muted small">Fetching recent single-family sales by lot size.</div>
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
    <div ref={cardRef} className="card h-100 position-relative" style={{ overflow: 'visible' }}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">SFD Product Pricing</h5>
        <div className="d-flex align-items-center gap-2">
          {!isLoading && analysis && (
            <SemanticBadge intent="status" value="validated">
              {analysis.compsWithLotSize} comps w/ lot size
            </SemanticBadge>
          )}
          {productRows.length > 0 && (
            <SemanticBadge intent="status" value="complete">
              {productRows.length} Products
            </SemanticBadge>
          )}
        </div>
      </div>
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
                    max={365}
                    step={30}
                    value={draftDays}
                    onChange={(e) => setDraftDays(e.target.value)}
                    onBlur={commitDays}
                    onKeyDown={handleDaysKeyDown}
                    className="form-control form-control-sm text-center"
                    style={{ width: 70 }}
                  />
                </div>
                {/* Subdiv Cost/FF */}
                <div className="text-center">
                  <label className="text-muted small d-block mb-1">Subdiv<br/>Cost / FF</label>
                  <input
                    type="text"
                    value={`$${subImpPerFf.toLocaleString()}`}
                    onChange={(e) => {
                      const num = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
                      if (!isNaN(num)) setSubImpPerFf(num);
                    }}
                    className="form-control form-control-sm text-center"
                    style={{ width: 90 }}
                  />
                </div>
                {/* FinLot Ratio */}
                <div className="text-center">
                  <label className="text-muted small d-block mb-1">FinLot<br/>Ratio</label>
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
            {productRows.length === 0 ? (
              <div className="py-2">
                <div className="text-muted">
                  No comps with lot size data found.
                </div>
                <div className="text-muted small">
                  Try widening the search radius or extending the sold-within period.
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <table className="table table-sm align-middle mb-0" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ color: 'var(--cui-secondary-color)' }}>
                      <th>Product</th>
                      <th>Lot SF Band</th>
                      <th className="text-center">Comps</th>
                      <th className="text-end">Median Price</th>
                      <th className="text-center">FLF %</th>
                      <th className="text-center">FLV/FF</th>
                      <th className="text-end">SubImp/FF</th>
                      <th className="text-end">Residual/FF</th>
                      <th className="text-center">Src</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productRows.map((row) => (
                      <tr key={row.product}>
                        <td className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>{row.product}</td>
                        <td style={{ color: 'var(--cui-body-color)' }}>
                          <span className="d-inline-flex align-items-center gap-1">
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: getBandColorByProduct(row.product).dot,
                                flexShrink: 0
                              }}
                            />
                            {row.lotSfBand}
                          </span>
                        </td>
                        <td className="text-center" style={{ color: 'var(--cui-body-color)' }}>
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
                        <td className="text-center" style={{ color: 'var(--cui-body-color)' }}>{row.flf}%</td>
                        <td className="text-center" style={{ color: 'var(--cui-body-color)' }}>{formatCurrencyCompact(row.flvPerFf)}</td>
                        <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>{formatCurrencyCompact(row.subImpPerFf)}</td>
                        <td className="text-end fw-semibold" style={{ color: row.residualPerFf && row.residualPerFf > 0 ? '#57c68a' : '#ef4444' }}>
                          {formatCurrencyCompact(row.residualPerFf)}
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
            {analysis && (
              <div className="mt-3 pt-2 d-flex justify-content-between align-items-center" style={{ borderTop: '1px solid var(--cui-border-color)' }}>
                <div className="d-flex gap-3">
                  {Object.entries(SOURCE_INDICATORS).map(([key, value]) => (
                    <span key={key} className="small" style={{ color: 'var(--cui-secondary-color)' }}>
                      {value.icon} {value.label}
                    </span>
                  ))}
                </div>
                <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>
                  {analysis.totalComps} total comps • {analysis.compsWithLotSize} with lot size
                </span>
              </div>
            )}

            {/* Comp Details Section - only shown when showCompDetails is true */}
            {showCompDetails && data && data.comps.length > 0 && (
              <CompDetailsSection
                comps={data.comps}
                products={DEFAULT_SFD_PRODUCTS}
              />
            )}

          </>
        )}
      </div>

      {/* Inline Map Flyout - slides out from the card, covers Landscaper panel */}
      {showMap && data && (
        <div
          className="position-absolute top-0 d-flex flex-column"
          style={{
            left: '100%',
            width: flyoutWidth > 0 ? `${flyoutWidth}px` : 'calc(40vw)',  // Dynamic width to viewport edge
            height: 'calc(100vh - 300px)',  // Fixed height, doesn't expand with comp details
            minHeight: '400px',
            maxHeight: '700px',
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
              SFD Comps Map
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

export default NapkinSfdPricing;
