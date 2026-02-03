'use client';

import React, { useState, useMemo, useRef } from 'react';
import { CButton, CCard, CCardHeader, CCardBody, CCollapse, CFormInput, CSpinner } from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
import { ChevronDown, ChevronUp, Upload, RefreshCw, AlertCircle } from 'lucide-react';
import { type SfCompsResponse } from '@/hooks/analysis/useSfComps';
import {
  analyzeSfdComps,
  calculateFlvMetrics,
  DEFAULT_SFD_PRODUCTS,
  type SfdProductStats
} from '@/lib/napkin/sfdCompStats';
import { SemanticBadge } from '@/components/ui/landscape';

interface SfdPricingPanelProps {
  projectId: number;
  latitude: number | null;
  longitude: number | null;
  hasData?: boolean;
  // Data from parent (lifted state)
  compsData?: SfCompsResponse;
  compsLoading: boolean;
  compsFetching: boolean;
  compsError: Error | null;
  compsRefetch: () => void;
  radius: number;
  setRadius: (value: number) => void;
  daysBack: number;
  setDaysBack: (value: number) => void;
}

const SOURCE_INDICATORS: Record<string, { icon: string; color: string; label: string }> = {
  redfin: { icon: '🔵', color: '#3b82f6', label: 'Redfin' },
  benchmark: { icon: '🟡', color: '#eab308', label: 'Benchmark' },
  user: { icon: '⚪', color: '#9ca3af', label: 'User Override' }
};

// Row with calculated FLV metrics
interface ProductRow {
  product: string;
  lotSfBand: string;
  compCount: number;
  medianPrice: number | null;
  flf: number;
  flvPerLot: number | null;
  subImpPerLot: number;
  residualPerLot: number | null;
  source: 'redfin' | 'benchmark' | 'user';
  dataQuality: string;
  lotWidthFt: number;
}

export default function SfdPricingPanel({
  projectId,
  latitude,
  longitude,
  compsData,
  compsLoading,
  compsFetching,
  compsError,
  compsRefetch,
  radius,
  setRadius,
  daysBack,
  setDaysBack
}: SfdPricingPanelProps) {
  const renderCount = useRef(0);
  renderCount.current++;

  const [isExpanded, setIsExpanded] = useState(true);
  const [subImpPerFf, setSubImpPerFf] = useState(1300);
  const [defaultFlf, setDefaultFlf] = useState(23);

  // User price overrides (keyed by product name)
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number | null>>({});

  // Check if we have valid coordinates
  const hasValidLocation = latitude !== null && longitude !== null &&
    Number.isFinite(latitude) && Number.isFinite(longitude);

  // Use compsLoading for initial load state
  const isLoading = compsLoading;

  // Debug logging
  console.log(`[SfdPricingPanel] render #${renderCount.current}:`, {
    projectId,
    hasValidLocation,
    isLoading,
    compsFetching,
    compsDataExists: !!compsData,
    compsExists: !!compsData?.comps,
    compsCount: compsData?.comps?.length ?? 0,
    compsWithLotSize: compsData?.comps?.filter(c => c.lotSqft != null).length ?? 0,
  });

  // Analyze comps and calculate stats per product
  const analysis = useMemo(() => {
    if (!compsData?.comps) return null;
    const result = analyzeSfdComps(compsData.comps, DEFAULT_SFD_PRODUCTS, radius, daysBack);
    console.log('[SfdPricingPanel] analysis:', {
      totalComps: result.totalComps,
      compsWithLotSize: result.compsWithLotSize,
      productsWithData: result.products.filter(p => p.compCount > 0).length,
    });
    return result;
  }, [compsData?.comps, radius, daysBack]);

  // Build display rows with FLV calculations
  const productRows: ProductRow[] = useMemo(() => {
    if (!analysis) return [];

    return analysis.products.map((stats: SfdProductStats) => {
      const config = DEFAULT_SFD_PRODUCTS.find(p => p.product === stats.product);
      const lotWidthFt = config?.lotWidthFt || 50;

      // Use override if set, otherwise use Redfin median
      const overridePrice = priceOverrides[stats.product];
      const effectivePrice = overridePrice !== undefined && overridePrice !== null
        ? overridePrice
        : stats.medianPrice;

      const flvMetrics = calculateFlvMetrics(effectivePrice, defaultFlf, subImpPerFf, lotWidthFt);

      // Determine source
      let source: 'redfin' | 'benchmark' | 'user' = stats.source;
      if (overridePrice !== undefined && overridePrice !== null) {
        source = 'user';
      } else if (stats.compCount < 2) {
        source = 'benchmark';
      }

      return {
        product: stats.product,
        lotSfBand: stats.lotSfBand,
        compCount: stats.compCount,
        medianPrice: effectivePrice,
        flf: defaultFlf,
        flvPerLot: flvMetrics.flvPerLot,
        subImpPerLot: flvMetrics.subImpPerLot,
        residualPerLot: flvMetrics.residualPerLot,
        source,
        dataQuality: stats.dataQuality,
        lotWidthFt
      };
    });
  }, [analysis, priceOverrides, defaultFlf, subImpPerFf]);

  // Log render decision
  console.log('[SfdPricingPanel] render decision:', {
    hasAnalysis: !!analysis,
    productRowsLength: productRows.length,
    willShowEmptyState: !analysis && !isLoading,
    willShowTable: (!!analysis || productRows.length > 0) && !isLoading,
    isExpanded,
  });

  const formatCurrency = (value: number | null) => {
    if (value === null) return '—';
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

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

  // If no location, show message
  if (!hasValidLocation) {
    return (
      <CCard style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)' }}>
        <CCardHeader
          className="d-flex justify-content-between align-items-center cursor-pointer py-3"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ backgroundColor: 'var(--surface-card-header)', cursor: 'pointer' }}
        >
          <h6 className="mb-0 fw-bold" style={{ color: 'var(--cui-body-color)' }}>
            SFD Product Pricing
          </h6>
          <div className="d-flex align-items-center gap-2">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </CCardHeader>
        <CCollapse visible={isExpanded}>
          <CCardBody className="py-4 text-center">
            <AlertCircle size={32} className="mb-2 text-warning" />
            <p className="mb-1" style={{ color: 'var(--cui-secondary-color)' }}>
              Project location required for Redfin comps.
            </p>
            <p className="small mb-0" style={{ color: 'var(--cui-secondary-color)' }}>
              Add latitude/longitude coordinates to fetch comparable sales data.
            </p>
          </CCardBody>
        </CCollapse>
      </CCard>
    );
  }

  return (
    <CCard style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)' }}>
      <CCardHeader
        className="d-flex justify-content-between align-items-center cursor-pointer py-3"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ backgroundColor: 'var(--surface-card-header)', cursor: 'pointer' }}
      >
        <h6 className="mb-0 fw-bold" style={{ color: 'var(--cui-body-color)' }}>
          SFD Product Pricing
        </h6>
        <div className="d-flex align-items-center gap-2">
          {isLoading && <CSpinner size="sm" />}
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
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </CCardHeader>

      <CCollapse visible={isExpanded}>
        <CCardBody className="py-3">
          {!analysis && !isLoading ? (
            // Empty state - no data fetched yet
            <div className="text-center py-4">
              <p className="mb-2" style={{ color: 'var(--cui-secondary-color)' }}>
                No lot products defined yet.
              </p>
              <p className="small mb-3" style={{ color: 'var(--cui-secondary-color)' }}>
                Tell Landscaper about your land use mix, or upload a parcel table to get started.
              </p>
              <SemanticButton intent="primary-action" variant="outline">
                <Upload size={16} className="me-2" />
                Upload Parcel Table
              </SemanticButton>
            </div>
          ) : (
            <>
              {/* Global Settings Row */}
              <div className="d-flex flex-wrap gap-3 mb-4 p-3 rounded" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
                <div className="d-flex align-items-center gap-2">
                  <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>Radius:</span>
                  <CFormInput
                    type="number"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    style={{ width: '60px' }}
                    size="sm"
                    min={1}
                    max={25}
                  />
                  <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>mi</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>Days Back:</span>
                  <CFormInput
                    type="number"
                    value={daysBack}
                    onChange={(e) => setDaysBack(Number(e.target.value))}
                    style={{ width: '80px' }}
                    size="sm"
                    min={30}
                    max={365}
                  />
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>SubImp $/FF:</span>
                  <CFormInput
                    type="number"
                    value={subImpPerFf}
                    onChange={(e) => setSubImpPerFf(Number(e.target.value))}
                    style={{ width: '90px' }}
                    size="sm"
                  />
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>Default FLF:</span>
                  <CFormInput
                    type="number"
                    value={defaultFlf}
                    onChange={(e) => setDefaultFlf(Number(e.target.value))}
                    style={{ width: '60px' }}
                    size="sm"
                  />
                  <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>%</span>
                </div>
                <CButton
                  color="secondary"
                  variant="ghost"
                  size="sm"
                  onClick={() => compsRefetch()}
                  disabled={isLoading || compsFetching}
                  title="Refresh comps"
                >
                  <RefreshCw size={14} className={compsFetching ? 'spin' : ''} />
                </CButton>
              </div>

              {/* Error state */}
              {compsError && (
                <div className="alert alert-warning mb-3 py-2">
                  <small>Failed to load Redfin comps: {compsError.message}</small>
                </div>
              )}

              {/* Loading state */}
              {isLoading && productRows.length === 0 && (
                <div className="text-center py-4">
                  <CSpinner className="mb-2" />
                  <p className="small mb-0" style={{ color: 'var(--cui-secondary-color)' }}>
                    Fetching Redfin comps...
                  </p>
                </div>
              )}

              {/* Data Table - show if we have analysis data (even with 0 matching comps) */}
              {(analysis || productRows.length > 0) && !isLoading && (
                <div className="table-responsive">
                  <table className="table table-sm mb-0" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--cui-border-color)' }}>
                        <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }}>Product</th>
                        <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }}>Lot SF Band</th>
                        <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">Comps</th>
                        <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">Median Price</th>
                        <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">FLF %</th>
                        <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">FLV/Lot</th>
                        <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">SubImp/Lot</th>
                        <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">Residual/Lot</th>
                        <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-center">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productRows.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                          <td className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>{row.product}</td>
                          <td style={{ color: 'var(--cui-body-color)' }}>{row.lotSfBand}</td>
                          <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                            <span className={row.dataQuality === 'insufficient' ? 'text-warning' : ''}>
                              {row.compCount}
                            </span>
                          </td>
                          <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                            <CFormInput
                              type="text"
                              value={row.medianPrice !== null ? `$${row.medianPrice.toLocaleString()}` : ''}
                              onChange={(e) => handlePriceOverride(row.product, e.target.value)}
                              placeholder="Enter price"
                              size="sm"
                              style={{
                                width: '110px',
                                textAlign: 'right',
                                display: 'inline-block',
                                backgroundColor: row.source === 'user' ? 'var(--cui-warning-bg-subtle)' : undefined
                              }}
                            />
                          </td>
                          <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>{row.flf}%</td>
                          <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>{formatCurrency(row.flvPerLot)}</td>
                          <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>{formatCurrency(row.subImpPerLot)}</td>
                          <td className="text-end fw-semibold" style={{ color: row.residualPerLot && row.residualPerLot > 0 ? '#57c68a' : '#ef4444' }}>
                            {formatCurrency(row.residualPerLot)}
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

              {/* Summary stats */}
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
            </>
          )}
        </CCardBody>
      </CCollapse>
    </CCard>
  );
}
