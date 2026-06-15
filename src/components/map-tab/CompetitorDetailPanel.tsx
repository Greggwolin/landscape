/**
 * CompetitorDetailPanel
 *
 * FB-323: in-map right-side drawer showing the full detail for a clicked
 * competitor marker. Field set + helpers reuse the legacy MarketMapView
 * detail (address, lot/size, units, price range, last sale, status) so the
 * /w/ shell matches the proven legacy UX without a cross-shell prop chain.
 */

'use client';

import React from 'react';
import { splitAddressLines } from '@/lib/maps/addressFormat';
import type { MarketCompetitiveProject } from '@/hooks/useMarketData';

interface CompetitorDetailPanelProps {
  competitor: MarketCompetitiveProject | null;
  onClose: () => void;
}

// Compact currency (reused from legacy MarketMapView).
function formatShortCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value >= 1_000_000) return `$${Math.round(value / 1000).toLocaleString()}k`;
  if (value >= 1_000) return `$${Math.round(value / 1000)}k`;
  return `$${Math.round(value)}`;
}

// Lot / unit-size display (reused from legacy MarketMapView).
function getLotDisplay(comp: MarketCompetitiveProject): { label: string; value: string } {
  const product = comp.products?.find(
    (p) =>
      p.lot_dimensions || p.lot_width_ft || p.unit_size_avg_sf || p.unit_size_min_sf || p.unit_size_max_sf
  );
  if (!product) return { label: 'Lot', value: '—' };
  if (product.lot_dimensions) return { label: 'Lot', value: product.lot_dimensions };
  if (Number.isFinite(Number(product.lot_width_ft))) {
    return { label: 'Lot', value: `${Number(product.lot_width_ft)}'` };
  }
  if (Number.isFinite(Number(product.unit_size_avg_sf))) {
    return { label: 'Size', value: `${Number(product.unit_size_avg_sf).toLocaleString()} SF` };
  }
  const min = Number(product.unit_size_min_sf);
  const max = Number(product.unit_size_max_sf);
  if (Number.isFinite(min) && Number.isFinite(max)) {
    return { label: 'Size', value: `${min.toLocaleString()}-${max.toLocaleString()} SF` };
  }
  return { label: 'Lot', value: '—' };
}

// Last sale price (reused from legacy MarketMapView).
function getLastSalePrice(comp: MarketCompetitiveProject): number | null {
  const product = comp.products?.find((p) => p.price_avg || p.price_max || p.price_min);
  return product?.price_avg ?? product?.price_max ?? product?.price_min ?? null;
}

function formatPriceRange(comp: MarketCompetitiveProject): string {
  const min = comp.price_min ? Number(comp.price_min) : null;
  const max = comp.price_max ? Number(comp.price_max) : null;
  if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  return '—';
}

export function CompetitorDetailPanel({ competitor, onClose }: CompetitorDetailPanelProps) {
  if (!competitor) return null;

  const addressLines = competitor.comp_address ? splitAddressLines(competitor.comp_address) : null;
  const lotDisplay = getLotDisplay(competitor);
  const lastSale = getLastSalePrice(competitor);
  const statusLabel = competitor.status ? competitor.status.replace('_', ' ') : '—';

  const detailRows: Array<{ label: string; value: string }> = [
    { label: lotDisplay.label, value: lotDisplay.value },
    { label: 'Units', value: competitor.total_units ? competitor.total_units.toLocaleString() : '—' },
    { label: 'Price Range', value: formatPriceRange(competitor) },
    { label: 'Last Sale', value: lastSale ? formatShortCurrency(lastSale) : '—' },
    { label: 'Status', value: statusLabel },
  ];

  return (
    <div className="map-tab-competitor-detail" role="dialog" aria-label="Competitor detail">
      <div className="map-tab-competitor-detail-header">
        <div className="map-tab-competitor-detail-title">
          <div className="map-tab-competitor-detail-name">{competitor.comp_name}</div>
          {competitor.builder_name && (
            <div className="map-tab-competitor-detail-builder">{competitor.builder_name}</div>
          )}
        </div>
        <button
          type="button"
          className="map-tab-competitor-detail-close"
          onClick={onClose}
          aria-label="Close competitor detail"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {addressLines && (
        <div className="map-tab-competitor-detail-address">
          <div>{addressLines.line1}</div>
          {addressLines.line2 && <div>{addressLines.line2}</div>}
        </div>
      )}

      <div className="map-tab-competitor-detail-grid">
        {detailRows.map((row) => (
          <div className="map-tab-competitor-detail-row" key={row.label}>
            <span className="map-tab-competitor-detail-label">{row.label}</span>
            <span className="map-tab-competitor-detail-value">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CompetitorDetailPanel;
