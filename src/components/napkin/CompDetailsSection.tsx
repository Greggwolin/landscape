/**
 * Expandable Comp Details Section for SFD Pricing Panel
 * Shows individual comps grouped/filtered by lot product band
 */
'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatMoney } from '@/utils/formatters/number';
import {
  DEFAULT_SFD_PRODUCTS,
  getProductBand,
  type SfdProductConfig
} from '@/lib/napkin/sfdCompStats';
import type { SfComp } from '@/hooks/analysis/useSfComps';

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

function getLotBandColors(lotSqft: number | null) {
  if (!lotSqft) return { bg: 'rgba(156, 163, 175, 0.15)', border: 'rgba(156, 163, 175, 0.4)', text: '#6b7280', dot: '#9ca3af' };
  // Map lot sqft to approximate product band for color
  if (lotSqft < 5175) return BAND_COLOR_RAMP[0];  // 40'
  if (lotSqft < 5750) return BAND_COLOR_RAMP[1];  // 45'
  if (lotSqft < 6325) return BAND_COLOR_RAMP[2];  // 50'
  if (lotSqft < 6900) return BAND_COLOR_RAMP[3];  // 55'
  if (lotSqft < 7500) return BAND_COLOR_RAMP[4];  // 60'
  if (lotSqft < 8100) return BAND_COLOR_RAMP[5];  // 65'
  if (lotSqft < 9200) return BAND_COLOR_RAMP[6];  // 70'
  return BAND_COLOR_RAMP[7];                       // 80'
}

interface CompDetailsSectionProps {
  comps: SfComp[];
  products?: SfdProductConfig[];
}

type SortField = 'saleDate' | 'lotSqft' | 'salePrice' | 'pricePerSqft';
type SortDirection = 'asc' | 'desc';

function formatCurrencyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}k`;
  }
  return formatMoney(value, { maximumFractionDigits: 0 });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'MMM yy');
  } catch {
    return value;
  }
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

export function CompDetailsSection({
  comps,
  products = DEFAULT_SFD_PRODUCTS
}: CompDetailsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedBands, setSelectedBands] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('saleDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Compute product band for each comp
  const compsWithBand = useMemo(() => {
    return comps.map(comp => ({
      ...comp,
      productBand: getProductBand(comp.lotSqft, products)
    }));
  }, [comps, products]);

  // Get unique product bands that have comps with their configs
  const availableBands = useMemo(() => {
    const bandsWithComps = new Set<string>();
    compsWithBand.forEach(comp => {
      if (comp.productBand) {
        bandsWithComps.add(comp.productBand);
      }
    });
    // Return products that have comps, in order
    return products.filter(p => bandsWithComps.has(p.product));
  }, [compsWithBand, products]);

  // Check if there are unmatched comps
  const hasUnmatched = useMemo(() => {
    return compsWithBand.some(c => c.lotSqft && !c.productBand);
  }, [compsWithBand]);

  // Toggle band selection
  const toggleBand = (band: string) => {
    setSelectedBands(prev => {
      const next = new Set(prev);
      if (next.has(band)) {
        next.delete(band);
      } else {
        next.add(band);
      }
      return next;
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedBands(new Set());
  };

  // Filter comps by selected product bands
  const filteredComps = useMemo(() => {
    // If no bands selected, show all comps with lot size
    if (selectedBands.size === 0) {
      return compsWithBand.filter(c => c.lotSqft !== null);
    }
    // Filter by selected bands
    return compsWithBand.filter(c => c.productBand && selectedBands.has(c.productBand));
  }, [compsWithBand, selectedBands]);

  // Sort comps
  const sortedComps = useMemo(() => {
    const sorted = [...filteredComps].sort((a, b) => {
      let aVal: number | null = null;
      let bVal: number | null = null;

      switch (sortField) {
        case 'saleDate':
          aVal = new Date(a.saleDate).getTime();
          bVal = new Date(b.saleDate).getTime();
          break;
        case 'lotSqft':
          aVal = a.lotSqft;
          bVal = b.lotSqft;
          break;
        case 'salePrice':
          aVal = a.salePrice;
          bVal = b.salePrice;
          break;
        case 'pricePerSqft':
          aVal = a.pricePerSqft;
          bVal = b.pricePerSqft;
          break;
      }

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [filteredComps, sortField, sortDirection]);

  // Count comps with lot size
  const compsWithLotSize = comps.filter(c => c.lotSqft !== null).length;

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'saleDate' ? 'desc' : 'desc');
    }
  };

  // Sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <span className="ms-1" style={{ fontSize: '10px' }}>
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  if (compsWithLotSize === 0) {
    return null; // Don't show section if no comps with lot data
  }

  // Get color for a product by its name
  const getProductColors = (productName: string) => {
    return getBandColorByProduct(productName);
  };

  return (
    <div className="mt-3">
      {/* Toggle Row */}
      <div
        className="d-flex justify-content-between align-items-center pt-2"
        style={{ borderTop: '1px solid var(--cui-border-color)' }}
      >
        {/* Left: toggle button */}
        <button
          type="button"
          className="btn btn-link p-0 d-flex align-items-center gap-1 text-decoration-none"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span className="small">{isExpanded ? 'Hide' : 'Show'} Comparable Details</span>
        </button>
      </div>

      {/* Filter Pills - spans full width when expanded */}
      {isExpanded && availableBands.length > 0 && (
        <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
          {availableBands.map((product) => {
            const count = compsWithBand.filter(c => c.productBand === product.product).length;
            const isSelected = selectedBands.has(product.product);
            const hasActiveFilters = selectedBands.size > 0;
            const colors = getProductColors(product.product);
            return (
              <button
                key={product.product}
                type="button"
                className="btn btn-sm flex-grow-1"
                onClick={() => toggleBand(product.product)}
                style={{
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  minWidth: 0,
                  transition: 'all 0.15s ease',
                  opacity: hasActiveFilters && !isSelected ? 0.5 : 1,
                  fontWeight: isSelected ? 600 : 400
                }}
              >
                {product.product}
                <span className="ms-1 opacity-75">({count})</span>
              </button>
            );
          })}
          {selectedBands.size > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-link text-decoration-none p-0"
              onClick={clearFilters}
              style={{ color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3">
          {sortedComps.length === 0 ? (
            <div className="py-2">
              <div className="text-muted">
                No comparable sales found with lot size information.
              </div>
              <div className="text-muted small">
                Try increasing the search radius or date range.
              </div>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ color: 'var(--cui-secondary-color)' }}>
                      <th
                        style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onClick={() => handleSort('saleDate')}
                      >
                        Sold<SortIndicator field="saleDate" />
                      </th>
                      <th>Address</th>
                      <th>City</th>
                      <th
                        className="text-end"
                        style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onClick={() => handleSort('lotSqft')}
                      >
                        Lot SF<SortIndicator field="lotSqft" />
                      </th>
                      <th className="text-center">Band</th>
                      <th className="text-center">Bd</th>
                      <th className="text-center">Ba</th>
                      <th className="text-end">SqFt</th>
                      <th
                        className="text-end"
                        style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onClick={() => handleSort('salePrice')}
                      >
                        Price<SortIndicator field="salePrice" />
                      </th>
                      <th
                        className="text-end"
                        style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onClick={() => handleSort('pricePerSqft')}
                      >
                        $/SF<SortIndicator field="pricePerSqft" />
                      </th>
                      <th className="text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedComps.map((comp) => (
                      <tr key={comp.mlsId}>
                        <td className="text-muted">{formatDate(comp.saleDate)}</td>
                        <td className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
                          <span title={comp.address}>{truncate(comp.address, 25)}</span>
                        </td>
                        <td className="text-muted">{comp.city}</td>
                        <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                          {comp.lotSqft?.toLocaleString() ?? '—'}
                        </td>
                        <td className="text-center">
                          {comp.productBand ? (
                            (() => {
                              const colors = getLotBandColors(comp.lotSqft);
                              return (
                                <span
                                  className="badge"
                                  style={{
                                    fontSize: '0.7rem',
                                    backgroundColor: colors.bg,
                                    border: `1px solid ${colors.border}`,
                                    color: colors.text
                                  }}
                                >
                                  {comp.productBand}
                                </span>
                              );
                            })()
                          ) : (
                            <span style={{ color: 'var(--cui-secondary-color)' }}>—</span>
                          )}
                        </td>
                        <td className="text-center text-muted">{comp.beds ?? '—'}</td>
                        <td className="text-center text-muted">{comp.baths ?? '—'}</td>
                        <td className="text-end text-muted">
                          {comp.sqft?.toLocaleString() ?? '—'}
                        </td>
                        <td className="text-end fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
                          {formatCurrencyCompact(comp.salePrice)}
                        </td>
                        <td className="text-end text-muted">
                          {comp.pricePerSqft ? `$${comp.pricePerSqft}` : '—'}
                        </td>
                        <td className="text-center">
                          {comp.url ? (
                            <a
                              href={comp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--cui-primary)' }}
                              title="View on Redfin"
                            >
                              <ExternalLink size={14} />
                            </a>
                          ) : (
                            <span style={{ color: 'var(--cui-secondary-color)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div
                className="mt-2 pt-2 text-end"
                style={{ borderTop: '1px solid var(--cui-border-color)' }}
              >
                <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>
                  Showing {sortedComps.length} of {compsWithLotSize} comps with lot size
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default CompDetailsSection;
