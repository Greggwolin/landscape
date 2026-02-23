/**
 * MarketSupplySubTab Component
 *
 * Second sub-tab under Property for income properties.
 * Property-type-specific supply & demand overview.
 *
 * For Multifamily (MF): Rental market analysis
 * - KPI metrics strip (avg rent, vacancy, absorption, pipeline)
 * - Competitive rental supply table (no address column)
 * - Integrated map below table showing comp locations with popups (address + all floorplans)
 * - Narrative analysis blocks (5-6 blocks covering supply, demand, rent trends, etc.)
 * - Demand conclusion
 *
 * Data sources:
 * - Rental comparables from /api/projects/{id}/rental-comparables (or PropertyTab data)
 * - Market activity from /api/market/activity
 * - LocationMap component for competitive supply map
 *
 * @version 1.0
 * @created 2026-02-22
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
  CBadge,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilBuilding,
  cilChartLine,
  cilLocationPin,
  cilArrowThickToTop,
  cilArrowThickToBottom,
} from '@coreui/icons';
import {
  LocationMap,
  DEFAULT_LAYER_VISIBILITY,
} from '@/components/location-intelligence';
import type { LayerVisibility, UserMapPoint } from '@/components/location-intelligence';
import { escapeHtml, splitAddressLines } from '@/lib/maps/addressFormat';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Format a number as integer unless it has a fractional part (e.g. 2.5 → "2.5", 2.0 → "2") */
function fmtInt(n: number | string | null | undefined): string {
  if (n == null) return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '—';
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
  project_type?: string;
  property_subtype?: string;
  location_lat?: number | string | null;
  location_lon?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  [key: string]: unknown;
}

interface MarketSupplySubTabProps {
  project: Project;
}

interface RentalComparable {
  comparable_id: number;
  property_name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  distance_miles?: number;
  year_built?: number;
  total_units?: number;
  unit_mix?: string;
  avg_rent?: number;
  occupancy_pct?: number;
  bedrooms?: number;
  bathrooms?: number;
  avg_sqft?: number;
  asking_rent?: number;
}

interface MarketKPI {
  label: string;
  value: string;
  change?: string;
  direction?: 'up' | 'down' | 'flat';
  note?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COMPARABLE_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#06b6d4',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const parseCoordinate = (value?: number | string | null): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

function getCompColor(index: number): string {
  return COMPARABLE_COLORS[index % COMPARABLE_COLORS.length];
}

// PropertyGroup type used by popup builder (full interface defined in Sub-components section)
interface PropertyGroupForPopup {
  name: string;
  floorplans: RentalComparable[];
  yearBuilt: number | undefined;
  totalUnits: number;
  avgRent: number | null;
  avgOcc: number | null;
  distance: number | undefined;
  address: string | undefined;
}

function buildPropertyPopupHtml(group: PropertyGroupForPopup, color: string): string {
  const addressLines = group.address ? splitAddressLines(group.address) : null;
  const addressHtml = addressLines
    ? `<div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">${escapeHtml(addressLines.line1)}${
        addressLines.line2 ? `<br/>${escapeHtml(addressLines.line2)}` : ''
      }</div>`
    : '';

  const avgRentStr = group.avgRent ? `$${Math.round(group.avgRent).toLocaleString()}/mo` : '—';
  const occStr = group.avgOcc ? `${group.avgOcc.toFixed(1)}%` : '—';

  // Build floorplan rows
  const fpRows = group.floorplans.map((fp) => {
    const brLabel = fp.bedrooms === 0 ? 'Studio' : fp.bedrooms != null ? `${fmtInt(fp.bedrooms)}BR` : '?';
    const baLabel = fp.bathrooms ? `/${fmtInt(fp.bathrooms)}BA` : '';
    const sqft = fp.avg_sqft ? `${Math.round(fp.avg_sqft).toLocaleString()} SF` : '';
    const rent = fp.avg_rent || fp.asking_rent;
    const rentStr = rent ? `$${Math.round(rent).toLocaleString()}` : '—';
    return `<div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;color:#cbd5e1;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <span>${brLabel}${baLabel}${sqft ? ` · ${sqft}` : ''}</span>
      <span style="font-weight:600;color:#e2e8f0;">${rentStr}</span>
    </div>`;
  }).join('');

  return `<div style="min-width:220px;padding:10px 12px;">
    <div style="font-weight:700;font-size:13px;color:${color};margin-bottom:4px;">${escapeHtml(group.name)}</div>
    ${addressHtml}
    <div style="font-size:11px;color:#e2e8f0;margin-bottom:6px;">
      ${group.yearBuilt || '—'} · ${group.totalUnits} units · Avg: ${avgRentStr} · Occ: ${occStr}
    </div>
    ${group.distance ? `<div style="font-size:10px;color:#64748b;margin-bottom:6px;">${group.distance} mi from subject</div>` : ''}
    <div style="border-top:1px solid rgba(255,255,255,0.15);padding-top:6px;margin-top:4px;">
      <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;font-weight:600;">Floorplans (${group.floorplans.length})</div>
      ${fpRows}
    </div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function KPIStrip({ kpis }: { kpis: MarketKPI[] }) {
  return (
    <div
      className="d-flex gap-2 mb-3"
      style={{ overflowX: 'auto' }}
    >
      {kpis.map((kpi) => (
        <CCard
          key={kpi.label}
          className="flex-fill"
          style={{
            minWidth: 140,
            background: 'var(--cui-card-bg)',
            borderColor: 'var(--cui-border-color)',
          }}
        >
          <CCardBody className="p-2">
            <div
              style={{
                fontSize: '0.7rem',
                color: 'var(--cui-secondary-color)',
                marginBottom: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {kpi.label}
            </div>
            <div className="d-flex align-items-baseline gap-1">
              <span
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--cui-body-color)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {kpi.value}
              </span>
              {kpi.direction === 'up' && (
                <CIcon icon={cilArrowThickToTop} size="sm" style={{ color: 'var(--cui-success)' }} />
              )}
              {kpi.direction === 'down' && (
                <CIcon icon={cilArrowThickToBottom} size="sm" style={{ color: 'var(--cui-danger)' }} />
              )}
            </div>
            {kpi.note && (
              <div
                style={{
                  fontSize: '0.65rem',
                  color: kpi.direction === 'up' ? 'var(--cui-success)' : 'var(--cui-secondary-color)',
                }}
              >
                {kpi.note}
              </div>
            )}
          </CCardBody>
        </CCard>
      ))}
    </div>
  );
}

/** Aggregate floorplan rows into property-level groups */
interface PropertyGroup {
  name: string;
  floorplans: RentalComparable[];
  yearBuilt: number | undefined;
  totalUnits: number;
  floorplanCount: number;
  unitMix: string;
  avgRent: number | null;
  avgOcc: number | null;
  distance: number | undefined;
  address: string | undefined;
  latitude: number | undefined;
  longitude: number | undefined;
}

function groupByProperty(comparables: RentalComparable[]): PropertyGroup[] {
  const map = new Map<string, RentalComparable[]>();
  for (const comp of comparables) {
    const key = comp.property_name || `Unknown-${comp.comparable_id}`;
    const existing = map.get(key);
    if (existing) {
      existing.push(comp);
    } else {
      map.set(key, [comp]);
    }
  }

  const groups: PropertyGroup[] = [];
  for (const [name, floorplans] of map) {
    const rents = floorplans
      .map((fp) => fp.avg_rent || fp.asking_rent || 0)
      .filter((r) => r > 0);
    const occs = floorplans
      .map((fp) => fp.occupancy_pct || 0)
      .filter((o) => o > 0);
    const first = floorplans[0];

    // Build unit mix summary from bedroom counts
    const brCounts = new Map<number, number>();
    for (const fp of floorplans) {
      const br = fp.bedrooms ?? -1;
      brCounts.set(br, (brCounts.get(br) || 0) + 1);
    }
    const mixParts: string[] = [];
    for (const br of [...brCounts.keys()].sort()) {
      mixParts.push(br === 0 ? 'S' : br === -1 ? '?' : fmtInt(br));
    }
    const unitMix = mixParts.join('/');

    groups.push({
      name,
      floorplans,
      yearBuilt: first.year_built,
      totalUnits: first.total_units || floorplans.length,
      floorplanCount: floorplans.length,
      unitMix,
      avgRent: rents.length > 0 ? rents.reduce((a, b) => a + b, 0) / rents.length : null,
      avgOcc: occs.length > 0 ? occs.reduce((a, b) => a + b, 0) / occs.length : null,
      distance: first.distance_miles,
      address: first.address,
      latitude: first.latitude,
      longitude: first.longitude,
    });
  }

  return groups;
}

function CompetitiveSupplyTable({
  comparables,
  project,
}: {
  comparables: RentalComparable[];
  project: Project;
}) {
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const groups = useMemo(() => groupByProperty(comparables), [comparables]);

  const thStyle = (align: 'left' | 'right'): React.CSSProperties => ({
    padding: '6px 10px',
    textAlign: align,
    color: 'var(--cui-secondary-color)',
    fontWeight: 600,
    fontSize: '0.72rem',
    whiteSpace: 'nowrap',
  });

  const tdNum: React.CSSProperties = {
    padding: '6px 8px',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--cui-border-color)', background: 'color-mix(in srgb, var(--cui-card-cap-bg, #f0f1f2) 40%, var(--cui-card-bg, #fff))' }}>
            <th style={thStyle('left')}>Property</th>
            <th style={thStyle('right')}>Year</th>
            <th style={thStyle('right')}>Units</th>
            <th style={thStyle('right')}>Plans</th>
            <th style={thStyle('right')}>Avg Rent</th>
            <th style={thStyle('right')}>Occ</th>
            <th style={thStyle('right')}>Distance</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, gi) => {
            const isExpanded = expandedProperty === group.name;
            return (
              <React.Fragment key={group.name}>
                {/* Property summary row */}
                <tr
                  onClick={() => setExpandedProperty(isExpanded ? null : group.name)}
                  style={{
                    borderBottom: isExpanded ? undefined : '1px solid var(--cui-border-color)',
                    background: gi % 2 === 0 ? 'transparent' : 'var(--cui-tertiary-bg)',
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ padding: '6px 8px', color: 'var(--cui-body-color)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: getCompColor(gi),
                        marginRight: 6,
                      }}
                    />
                    <span style={{ marginRight: 4 }}>{isExpanded ? '▾' : '▸'}</span>
                    {group.name}
                  </td>
                  <td style={{ ...tdNum, color: 'var(--cui-secondary-color)' }}>
                    {group.yearBuilt || '—'}
                  </td>
                  <td style={{ ...tdNum, color: 'var(--cui-body-color)' }}>
                    {group.totalUnits || '—'}
                  </td>
                  <td style={{ ...tdNum, color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}>
                    {group.unitMix}
                  </td>
                  <td style={{ ...tdNum, color: 'var(--cui-body-color)', fontWeight: 500 }}>
                    {group.avgRent ? `$${Math.round(group.avgRent).toLocaleString()}` : '—'}
                  </td>
                  <td style={tdNum}>
                    <span
                      style={{
                        color: group.avgOcc && group.avgOcc >= 95
                          ? 'var(--cui-success)'
                          : group.avgOcc && group.avgOcc >= 92
                            ? 'var(--cui-warning)'
                            : 'var(--cui-danger)',
                        fontWeight: 500,
                      }}
                    >
                      {group.avgOcc ? `${group.avgOcc.toFixed(1)}%` : '—'}
                    </span>
                  </td>
                  <td style={{ ...tdNum, color: 'var(--cui-secondary-color)' }}>
                    {group.distance ? `${group.distance} mi` : '—'}
                  </td>
                </tr>

                {/* Expanded floorplan rows */}
                {isExpanded && group.floorplans.map((fp, fi) => {
                  const rent = fp.avg_rent || fp.asking_rent;
                  const brLabel = fp.bedrooms === 0 ? 'Studio' : fp.bedrooms != null ? `${fmtInt(fp.bedrooms)}BR` : '—';
                  const baLabel = fp.bathrooms ? `/${fmtInt(fp.bathrooms)}BA` : '';
                  const sqftLabel = fp.avg_sqft ? ` · ${Math.round(fp.avg_sqft).toLocaleString()} SF` : '';
                  return (
                    <tr
                      key={fp.comparable_id || fi}
                      style={{
                        borderBottom: fi < group.floorplans.length - 1
                          ? '1px solid var(--cui-border-color-translucent, rgba(128,128,128,0.15))'
                          : '1px solid var(--cui-border-color)',
                        background: 'var(--cui-tertiary-bg)',
                      }}
                    >
                      <td
                        style={{
                          padding: '4px 8px 4px 36px',
                          color: 'var(--cui-secondary-color)',
                          fontSize: '0.75rem',
                        }}
                      >
                        {brLabel}{baLabel}{sqftLabel}
                      </td>
                      <td style={{ ...tdNum, color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}>—</td>
                      <td style={{ ...tdNum, color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}>—</td>
                      <td style={{ ...tdNum, color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}>—</td>
                      <td style={{ ...tdNum, color: 'var(--cui-body-color)', fontSize: '0.75rem', fontWeight: 500 }}>
                        {rent ? `$${Math.round(rent).toLocaleString()}` : '—'}
                      </td>
                      <td style={{ ...tdNum, fontSize: '0.75rem' }}>—</td>
                      <td style={{ ...tdNum, fontSize: '0.75rem' }}>—</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Subject property summary row */}
      <div
        style={{
          padding: '6px 12px',
          borderTop: '2px solid var(--cui-primary)',
          background: 'rgba(var(--cui-primary-rgb), 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.8rem',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--cui-primary)' }}>
          Subject — {project.project_name}
        </span>
        <span style={{ color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}>
          {groups.length} competitive properties · {comparables.length} floorplans
        </span>
      </div>
    </div>
  );
}

/** Narrative block for analysis content */
function NarrativeBlock({
  number,
  title,
  text,
}: {
  number: number;
  title: string;
  text: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <CCard
      style={{
        background: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)',
      }}
    >
      <CCardBody className="p-3">
        <div className="d-flex align-items-center gap-2 mb-2">
          <CBadge
            color="primary"
            style={{
              fontSize: '0.65rem',
              minWidth: 20,
              textAlign: 'center',
            }}
          >
            {number}
          </CBadge>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>
            {title}
          </span>
        </div>
        <p
          style={{
            fontSize: '0.8rem',
            lineHeight: 1.6,
            color: 'var(--cui-secondary-color)',
            margin: 0,
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: expanded ? undefined : 4,
            WebkitBoxOrient: 'vertical' as const,
            overflow: expanded ? 'visible' : 'hidden',
          }}
        >
          {text}
        </p>
        {text.length > 200 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--cui-primary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              padding: '4px 0 0',
              fontWeight: 500,
            }}
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </CCardBody>
    </CCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function MarketSupplySubTab({ project }: MarketSupplySubTabProps) {
  const [comparables, setComparables] = useState<RentalComparable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  const [mapMounted, setMapMounted] = useState(false);

  // Resolve project center
  const projectCenter = useMemo<[number, number] | null>(() => {
    const lat = parseCoordinate(project.location_lat ?? project.latitude);
    const lon = parseCoordinate(project.location_lon ?? project.longitude);
    if (lat === null || lon === null) return null;
    return [lon, lat];
  }, [project.location_lat, project.location_lon, project.latitude, project.longitude]);

  // Fetch rental comparables
  // API returns: { success: boolean, data: RentalComparable[], count: number }
  useEffect(() => {
    let cancelled = false;

    const extractArray = (json: Record<string, unknown>): RentalComparable[] => {
      // Handle { data: [...] } envelope
      if (Array.isArray(json.data)) return json.data as RentalComparable[];
      // Handle { comparables: [...] } envelope
      if (Array.isArray(json.comparables)) return json.comparables as RentalComparable[];
      // Handle { results: [...] } envelope
      if (Array.isArray(json.results)) return json.results as RentalComparable[];
      // Handle bare array (shouldn't happen with our API but defensive)
      if (Array.isArray(json)) return json as unknown as RentalComparable[];
      return [];
    };

    const fetchComparables = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/projects/${project.project_id}/rental-comparables`);
        if (!res.ok) {
          setError('Rental comparable data not available');
          return;
        }
        const json = await res.json();
        if (!cancelled) setComparables(extractArray(json));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load comparables');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchComparables();
    return () => { cancelled = true; };
  }, [project.project_id]);

  // Mount map after initial render
  useEffect(() => {
    const timeout = window.setTimeout(() => setMapMounted(true), 400);
    return () => window.clearTimeout(timeout);
  }, []);

  // Build one map point per property (grouped), with all floorplans in popup
  const propertyGroups = useMemo(() => groupByProperty(comparables), [comparables]);

  const mapPoints = useMemo<UserMapPoint[]>(() => {
    const points: UserMapPoint[] = [];
    propertyGroups.forEach((group, index) => {
      const lat = parseCoordinate(group.latitude);
      const lon = parseCoordinate(group.longitude);
      if (lat === null || lon === null) return;

      const color = getCompColor(index);
      points.push({
        id: `prop-${index}`,
        label: group.name,
        category: 'competitor',
        coordinates: [lon, lat] as [number, number],
        markerColor: color,
        markerLabel: String(index + 1),
        popupHtml: buildPropertyPopupHtml(group, color),
      });
    });
    return points;
  }, [propertyGroups]);

  // Basemap mode is set directly by buttons in the map overlay

  // KPIs computed from property-level groups (not individual floorplans)
  const kpis = useMemo<MarketKPI[]>(() => {
    if (propertyGroups.length === 0) return [];

    const rents = propertyGroups.filter((g) => g.avgRent).map((g) => g.avgRent as number);
    const occs = propertyGroups.filter((g) => g.avgOcc).map((g) => g.avgOcc as number);
    const avgRent = rents.length > 0 ? rents.reduce((a, b) => a + b, 0) / rents.length : 0;
    const avgOcc = occs.length > 0 ? occs.reduce((a, b) => a + b, 0) / occs.length : 0;
    const totalUnits = propertyGroups.reduce((sum, g) => sum + g.totalUnits, 0);

    return [
      {
        label: 'Avg Market Rent',
        value: avgRent > 0 ? `$${Math.round(avgRent).toLocaleString()}` : '—',
        direction: 'up' as const,
        note: 'Comp set average',
      },
      {
        label: 'Avg Occupancy',
        value: avgOcc > 0 ? `${avgOcc.toFixed(1)}%` : '—',
        direction: avgOcc >= 94 ? 'up' as const : 'down' as const,
        note: `${propertyGroups.length} properties`,
      },
      {
        label: 'Competitive Units',
        value: totalUnits > 0 ? totalUnits.toLocaleString() : '—',
        note: `${propertyGroups.length} properties in comp set`,
      },
      {
        label: 'Pipeline',
        value: '—',
        note: 'Under construction / planned',
      },
    ];
  }, [propertyGroups]);

  // Placeholder narrative blocks
  const narratives = useMemo(() => [
    {
      num: 1,
      title: 'Supply Overview',
      text: 'Analysis of current and planned multifamily supply within the competitive radius. Includes new construction pipeline, deliveries over the past 12 months, and projected completions. This section will be generated by Landscaper based on market data and local research.',
    },
    {
      num: 2,
      title: 'Demand Drivers',
      text: 'Key demand factors including employment growth, population migration, household formation rates, and affordability relative to homeownership. Analysis of demographic trends supporting rental demand in the subject\'s submarket.',
    },
    {
      num: 3,
      title: 'Rent Trends',
      text: 'Historical and projected rent growth analysis across unit types. Year-over-year rent changes, concession trends, and effective vs. asking rent differentials across the competitive set.',
    },
    {
      num: 4,
      title: 'Absorption & Vacancy',
      text: 'Net absorption trends, seasonal patterns, and stabilization timelines for new deliveries. Current vacancy rates contextualized against historical norms and submarket benchmarks.',
    },
    {
      num: 5,
      title: 'Competitive Positioning',
      text: 'Subject property positioning relative to the competitive set. Analysis of unit mix advantages, amenity packages, age/condition premiums, and location accessibility that influence rental performance.',
    },
  ], []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center py-5">
        <CSpinner color="primary" size="sm" className="me-2" />
        <span style={{ color: 'var(--cui-secondary-color)' }}>Loading market supply data...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <CIcon icon={cilChartLine} style={{ color: 'var(--cui-primary)' }} />
        <div>
          <h5 className="mb-0" style={{ fontSize: '1rem', fontWeight: 600 }}>
            {project.project_type_code === 'RET' ? 'Retail' :
             project.project_type_code === 'OFF' ? 'Office' :
             project.project_type_code === 'IND' ? 'Industrial' :
             project.project_type_code === 'HTL' ? 'Hospitality' :
             project.project_type_code === 'MXU' ? 'Mixed-Use' :
             'Multifamily'} {project.project_type_code === 'RET' ? 'Property' : 'Rental'} Market
          </h5>
          <span style={{ fontSize: '0.8rem', color: 'var(--cui-secondary-color)' }}>
            Supply &amp; Demand Overview — {project.project_name}
          </span>
        </div>
      </div>

      {/* KPI Summary Tiles */}
      {kpis.length > 0 && <KPIStrip kpis={kpis} />}

      {/* Supply Overview — full-width narrative tile */}
      {narratives.length > 0 && (
        <div className="mb-3">
          <NarrativeBlock
            number={narratives[0].num}
            title={narratives[0].title}
            text={narratives[0].text}
          />
        </div>
      )}

      {/* Table + Map — side-by-side in separate cards */}
      <div
        className="mb-3"
        style={{
          display: 'grid',
          gridTemplateColumns: projectCenter && comparables.length > 0 ? '1fr 1fr' : '1fr',
          gap: 12,
        }}
      >
        {/* Competitive Supply Table Card */}
        <CCard
          style={{
            background: 'var(--cui-card-bg)',
            borderColor: 'var(--cui-border-color)',
            overflow: 'hidden',
          }}
        >
          <CCardHeader
            className="d-flex align-items-center gap-2"
            style={{ padding: '8px 12px' }}
          >
            <CIcon icon={cilBuilding} size="sm" style={{ color: 'var(--cui-primary)' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Competitive Rental Supply</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--cui-secondary-color)' }}>
              {propertyGroups.length} properties · {comparables.length} floorplans
            </span>
          </CCardHeader>
          <CCardBody style={{ padding: '0.35rem' }}>
            <div style={{ overflowY: 'auto', maxHeight: 420 }}>
              {comparables.length > 0 ? (
                <CompetitiveSupplyTable comparables={comparables} project={project} />
              ) : (
                <div
                  className="text-center py-4"
                  style={{ color: 'var(--cui-secondary-color)', fontSize: '0.85rem' }}
                >
                  {error || 'No rental comparables found. Add comparables from the Market Comps tab in Valuation.'}
                </div>
              )}
            </div>
          </CCardBody>
        </CCard>

        {/* Competition Map Card */}
        {projectCenter && comparables.length > 0 && (
          <CCard
            style={{
              background: 'var(--cui-card-bg)',
              borderColor: 'var(--cui-border-color)',
              overflow: 'hidden',
            }}
          >
            <CCardHeader
              className="d-flex align-items-center gap-2"
              style={{ padding: '8px 12px' }}
            >
              <CIcon icon={cilLocationPin} size="sm" style={{ color: 'var(--cui-primary)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Competition Map</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--cui-secondary-color)' }}>
                {mapPoints.length} locations
              </span>
            </CCardHeader>
            <CCardBody style={{ padding: '0.35rem', position: 'relative', minHeight: 360 }}>
              {mapMounted ? (
                <LocationMap
                  center={projectCenter}
                  rings={[]}
                  userPoints={mapPoints}
                  layers={layers}
                  selectedRadius={null}
                  onRingClick={() => {}}
                  isAddingPoint={false}
                  resizeToken={0}
                />
              ) : (
                <div
                  className="d-flex align-items-center justify-content-center h-100"
                  style={{ color: 'var(--cui-secondary-color)' }}
                >
                  Initializing map...
                </div>
              )}

              {/* Basemap toggle buttons — bottom-left */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  zIndex: 20,
                  display: 'flex',
                  gap: 2,
                }}
              >
                {(['map', 'satellite', 'hybrid'] as const).map((mode) => {
                  const isActive =
                    mode === 'map' ? !layers.satellite && !layers.hybrid
                    : mode === 'satellite' ? layers.satellite
                    : layers.hybrid;
                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        if (mode === 'map') {
                          setLayers((prev) => ({ ...prev, satellite: false, hybrid: false }));
                        } else if (mode === 'satellite') {
                          setLayers((prev) => ({ ...prev, satellite: true, hybrid: false }));
                        } else {
                          setLayers((prev) => ({ ...prev, satellite: false, hybrid: true }));
                        }
                      }}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.65rem',
                        fontWeight: isActive ? 600 : 400,
                        border: '1px solid var(--cui-border-color)',
                        borderRadius: 4,
                        background: isActive ? 'var(--cui-primary)' : 'var(--cui-card-bg)',
                        color: isActive ? '#fff' : 'var(--cui-secondary-color)',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        lineHeight: 1.4,
                      }}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </CCardBody>
          </CCard>
        )}
      </div>

      {/* Narrative Analysis Blocks — 2×2 grid (Supply Overview already rendered above) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 16,
        }}
      >
        {narratives.filter((b) => b.num > 1).map((block) => (
          <NarrativeBlock
            key={block.num}
            number={block.num}
            title={block.title}
            text={block.text}
          />
        ))}
      </div>

      {/* Demand Conclusion */}
      <CCard
        className="mb-3"
        style={{
          borderColor: 'var(--cui-success)',
          borderLeftWidth: 4,
          background: 'rgba(var(--cui-success-rgb), 0.04)',
        }}
      >
        <CCardBody className="p-3">
          <div
            className="d-flex align-items-center gap-2 mb-2"
            style={{ color: 'var(--cui-success)' }}
          >
            <CBadge
              color="success"
              style={{ fontSize: '0.65rem' }}
            >
              6
            </CBadge>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Demand Conclusion
            </span>
          </div>
          <p
            style={{
              fontSize: '0.85rem',
              lineHeight: 1.7,
              color: 'var(--cui-body-color)',
              margin: 0,
            }}
          >
            Demand conclusion will be generated by Landscaper based on comprehensive analysis of supply pipeline,
            absorption trends, demographic drivers, and competitive positioning. The conclusion synthesizes all
            preceding analysis blocks into an actionable assessment of market conditions for the subject property.
          </p>
        </CCardBody>
      </CCard>
    </div>
  );
}
