'use client';

import React, { useMemo, useState } from 'react';
import { X, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
import type { LocationBriefArtifactConfig, CensusTier } from '@/contexts/WrapperUIContext';

interface LocationBriefArtifactProps {
  config: LocationBriefArtifactConfig;
  onClose: () => void;
}

/**
 * Renders a generate_location_brief tool result in the right artifacts panel.
 *
 * Preserves R3: flat header, plain Exec Summary, compressed Show-Detail,
 * consolidated footer, no CreateProjectCTA, hardcoded light palette.
 */

/* ─── Light palette (artifact-scoped, does NOT inherit app theme) ────── */
const P = {
  bg: '#f7f7f5',
  card: '#ffffff',
  ink: '#1a1a1a',
  inkSoft: '#2a2a2a',
  muted: '#5a5a5a',
  mutedSoft: '#8a8a8a',
  accent: '#2e6f40',
  border: '#d9d9d4',
  borderSoft: '#ececea',
  headerBg: '#f4f3f0',
  up: '#2e6f40',
  down: '#b64040',
} as const;

type FredEntry = {
  series_id?: string;
  value: number | null;
  date?: string;
  yoy_pct?: number | null;
};

/** One value cell in a matrix: a display value + optional YoY delta. */
type Cell = {
  value: string;
  yoy: number | null;
};

/** A matrix row: indicator label + one cell per geo column. */
type MatrixRow = {
  indicator: string;
  cells: (Cell | null)[];
};

/** A full matrix table spec. */
type Matrix = {
  title: string;
  columns: string[];
  rows: MatrixRow[];
};

export function LocationBriefArtifact({ config, onClose }: LocationBriefArtifactProps) {
  const {
    location_display,
    property_type_label,
    geo_hierarchy,
    summary,
    sections,
    indicators,
    data_as_of,
    cached,
  } = config;

  const [showDetail, setShowDetail] = useState(false);

  const fred = (indicators?.fred || {}) as Record<string, FredEntry>;

  // Tiered census, with single-tier fallback for pre-R3 cached briefs.
  const tiers = indicators?.census_tiers || {};
  const legacyCensus = indicators?.census;
  const stateTier: CensusTier | undefined =
    tiers.state || (legacyCensus?.tier === 'state' ? legacyCensus : undefined);
  const countyTier: CensusTier | undefined =
    tiers.county || (legacyCensus?.tier === 'county' ? legacyCensus : undefined);
  const cityTier: CensusTier | undefined =
    tiers.city || (legacyCensus?.tier === 'place' ? legacyCensus : undefined);

  const stateLabel = geo_hierarchy?.state || geo_hierarchy?.state_abbrev || 'State';
  const countyLabel =
    (geo_hierarchy?.county ||
      (countyTier?.tier_label
        ? countyTier.tier_label.replace(/ County$/, '')
        : null)) ?? null;
  const cityLabel = geo_hierarchy?.city || cityTier?.tier_label || null;
  const msaLabel =
    geo_hierarchy?.cbsa_name?.replace(/\s+Metro(politan)? Area$/, '') || null;

  const economicMatrix = useMemo(
    () => buildEconomicMatrix(fred, { stateLabel, msaLabel }),
    [fred, stateLabel, msaLabel],
  );

  const demographicsMatrix = useMemo(
    () =>
      buildDemographicsMatrix({
        stateLabel,
        countyLabel,
        cityLabel,
        stateTier,
        countyTier,
        cityTier,
      }),
    [stateLabel, countyLabel, cityLabel, stateTier, countyTier, cityTier],
  );

  const hasAnyTiles =
    economicMatrix.rows.length > 0 || demographicsMatrix.rows.length > 0;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: P.ink,
        background: P.bg,
      }}
    >
      {/* Header — flat, no green pill, no depth badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: `1px solid ${P.border}`,
          background: P.card,
          flexShrink: 0,
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.2,
              color: P.ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={location_display}
          >
            {location_display}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              color: P.muted,
            }}
          >
            <span>{property_type_label}</span>
            <span style={{ color: P.borderSoft }}>·</span>
            <span>
              as of {data_as_of}
              {cached ? ' · cached' : ''}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close location brief"
          style={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            padding: 0,
            border: `1px solid ${P.border}`,
            borderRadius: 6,
            background: P.card,
            color: P.muted,
            cursor: 'pointer',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body — scrollable, 820px inner wrap */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 16px 32px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {economicMatrix.rows.length > 0 && <MatrixTable matrix={economicMatrix} />}
          {demographicsMatrix.rows.length > 0 && <MatrixTable matrix={demographicsMatrix} />}

          {/* Executive Summary — plain prose, no green shading */}
          {summary && (
            <section
              style={{
                background: P.card,
                border: `1px solid ${P.border}`,
                borderRadius: 8,
                padding: '14px 18px',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  color: P.muted,
                  marginBottom: 6,
                }}
              >
                Executive Summary
              </div>
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: P.inkSoft,
                }}
              >
                {summary}
              </div>

              {sections.length > 0 && (
                <button
                  onClick={() => setShowDetail((v) => !v)}
                  style={{
                    marginTop: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    border: 'none',
                    background: 'transparent',
                    color: P.accent,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {showDetail ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showDetail ? 'Hide detail' : 'Show detail'}
                </button>
              )}

              {showDetail && sections.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: `1px solid ${P.borderSoft}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {sections.map((section, idx) => (
                    <div key={idx}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: P.muted,
                          textTransform: 'uppercase',
                          letterSpacing: 0.3,
                          marginBottom: 3,
                        }}
                      >
                        {section.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: P.inkSoft,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {section.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Empty state */}
          {!hasAnyTiles && !summary && (
            <section
              style={{
                background: P.card,
                border: `1px solid ${P.border}`,
                borderRadius: 8,
                padding: '18px 22px',
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: P.muted,
                  textAlign: 'center',
                  padding: '12px 8px',
                }}
              >
                No indicators or narrative available. Check FRED + Anthropic API keys.
              </div>
            </section>
          )}

          {/* Footer — sources listed once, not per row */}
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: `1px solid ${P.border}`,
              fontSize: 11,
              color: P.muted,
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Sources: FRED · Federal Reserve · BLS · US Census Bureau ACS 5-Year 2023
            <br />
            Refreshed {data_as_of}
            {cached ? ' (cached)' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Matrix table — indicator rows × geo columns ────────────────────── */

function MatrixTable({ matrix }: { matrix: Matrix }) {
  return (
    <section
      style={{
        background: P.card,
        border: `1px solid ${P.border}`,
        borderRadius: 8,
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '8px 14px',
          borderBottom: `1px solid ${P.borderSoft}`,
          fontSize: 12,
          fontWeight: 600,
          color: P.ink,
          background: P.card,
          letterSpacing: 0.2,
        }}
      >
        {matrix.title}
      </div>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'auto',
          fontSize: 13,
          color: P.ink,
        }}
      >
        <thead>
          <tr style={{ background: P.headerBg }}>
            <th
              style={{
                padding: '7px 14px',
                textAlign: 'left',
                fontSize: 11,
                fontWeight: 600,
                color: P.muted,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                borderBottom: `1px solid ${P.borderSoft}`,
                whiteSpace: 'normal',
                verticalAlign: 'bottom',
              }}
            >
              Indicator
            </th>
            {matrix.columns.map((col) => (
              <th
                key={col}
                style={{
                  padding: '7px 12px',
                  textAlign: 'right',
                  fontSize: 11,
                  fontWeight: 600,
                  color: P.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.3,
                  borderBottom: `1px solid ${P.borderSoft}`,
                  whiteSpace: 'normal',
                  verticalAlign: 'bottom',
                  lineHeight: 1.25,
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row, i) => (
            <tr
              key={`${row.indicator}-${i}`}
              style={{
                borderBottom:
                  i < matrix.rows.length - 1 ? `1px solid ${P.borderSoft}` : undefined,
              }}
            >
              <td
                style={{
                  padding: '8px 14px',
                  color: P.inkSoft,
                  whiteSpace: 'nowrap',
                }}
              >
                {row.indicator}
              </td>
              {row.cells.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <CellContent cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CellContent({ cell }: { cell: Cell | null }) {
  if (!cell || cell.value === '—') {
    return <span style={{ color: P.mutedSoft }}>—</span>;
  }
  const direction: 'up' | 'down' | 'flat' =
    cell.yoy == null
      ? 'flat'
      : cell.yoy > 0.05
        ? 'up'
        : cell.yoy < -0.05
          ? 'down'
          : 'flat';
  const yoyColor =
    direction === 'up' ? P.up : direction === 'down' ? P.down : P.mutedSoft;

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <span style={{ fontWeight: 500, color: P.ink, lineHeight: 1.2 }}>{cell.value}</span>
      {cell.yoy != null && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            fontSize: 10,
            fontWeight: 500,
            color: yoyColor,
            marginTop: 1,
            lineHeight: 1.1,
          }}
        >
          {direction === 'up' && <ArrowUp size={9} />}
          {direction === 'down' && <ArrowDown size={9} />}
          {cell.yoy > 0 ? '+' : ''}
          {cell.yoy.toFixed(1)}%
        </span>
      )}
    </span>
  );
}

/* ─── Matrix builders ────────────────────────────────────────────────── */

function buildEconomicMatrix(
  fred: Record<string, FredEntry>,
  ctx: { stateLabel: string; msaLabel: string | null },
): Matrix {
  const { stateLabel, msaLabel } = ctx;

  // Column 0: United States. Column 1: State. Column 2: Metro (if resolvable).
  const includeMetro = !!msaLabel;
  const columns = includeMetro
    ? ['United States', stateLabel, msaLabel as string]
    : ['United States', stateLabel];

  const rowSpecs: Array<{
    indicator: string;
    us: FredEntry | null;
    state: FredEntry | null;
    metro: FredEntry | null;
    fmt: (n: number | null | undefined) => string;
  }> = [
    {
      indicator: 'Unemployment Rate',
      us: pickFred(fred, ['us unemployment', 'unemployment rate']),
      state: pickFred(fred, [
        `${stateLabel.toLowerCase()} unemployment`,
        'state unemployment',
      ]),
      metro: null,
      fmt: formatPercent,
    },
    {
      indicator: 'Fed Funds Rate',
      us: pickFred(fred, ['fed funds']),
      state: null,
      metro: null,
      fmt: formatPercent,
    },
    {
      indicator: '30-Yr Fixed Mortgage',
      us: pickFred(fred, ['30-yr', '30-year', 'mortgage']),
      state: null,
      metro: null,
      fmt: formatPercent,
    },
    {
      indicator: 'CPI (All Items)',
      us: pickFred(fred, ['cpi']),
      state: null,
      metro: null,
      fmt: formatIndex,
    },
    {
      indicator: 'FHFA Home Price Index',
      us: pickFred(fred, ['us house price', 'fhfa us', 'ussthpi']),
      state: pickFred(fred, [
        `${stateLabel.toLowerCase()} house price`,
        'state house price',
        'sthpi',
      ]),
      metro: msaLabel
        ? pickFred(fred, [msaLabel.toLowerCase(), 'atnhpi'])
        : pickFred(fred, ['atnhpi']),
      fmt: formatIndex,
    },
    {
      indicator: 'Case-Shiller HPI',
      us: pickFred(fred, ['case-shiller', 'case shiller']),
      state: null,
      metro: null,
      fmt: formatIndex,
    },
    {
      indicator: 'Housing Starts (annualized)',
      us: pickFred(fred, ['housing starts']),
      state: null,
      metro: null,
      fmt: formatThousands,
    },
  ];

  const rows: MatrixRow[] = rowSpecs
    .map((spec) => {
      const cells: (Cell | null)[] = [
        entryToCell(spec.us, spec.fmt),
        entryToCell(spec.state, spec.fmt),
      ];
      if (includeMetro) cells.push(entryToCell(spec.metro, spec.fmt));
      // Drop row if every cell is null/blank
      const hasAny = cells.some((c) => c && c.value !== '—');
      return hasAny ? { indicator: spec.indicator, cells } : null;
    })
    .filter((r): r is MatrixRow => r !== null);

  return {
    title: 'Economic Indicators',
    columns,
    rows,
  };
}

function buildDemographicsMatrix(ctx: {
  stateLabel: string;
  countyLabel: string | null;
  cityLabel: string | null;
  stateTier?: CensusTier;
  countyTier?: CensusTier;
  cityTier?: CensusTier;
}): Matrix {
  const { stateLabel, countyLabel, cityLabel, stateTier, countyTier, cityTier } = ctx;

  // Only include columns that have a resolvable tier.
  const cols: Array<{ label: string; tier: CensusTier | undefined }> = [];
  if (stateTier) cols.push({ label: stateLabel, tier: stateTier });
  if (countyTier)
    cols.push({
      label: countyLabel ? `${countyLabel} County` : 'County',
      tier: countyTier,
    });
  if (cityTier) cols.push({ label: cityLabel || 'City', tier: cityTier });

  const columns = cols.map((c) => c.label);

  const rowSpecs: Array<{
    indicator: string;
    field: keyof CensusTier;
    fmt: (n: number | null | undefined) => string;
  }> = [
    { indicator: 'Population', field: 'population', fmt: formatNumber },
    { indicator: 'Median Household Income', field: 'median_hh_income', fmt: formatCurrency },
    { indicator: 'Median Home Value', field: 'median_home_value', fmt: formatCurrency },
    { indicator: 'Median Gross Rent', field: 'median_gross_rent', fmt: formatCurrency },
    { indicator: 'Median Age', field: 'median_age', fmt: (n) => (n == null ? '—' : n.toFixed(1)) },
    {
      indicator: 'Owner-Occupied',
      field: 'owner_occ_pct',
      fmt: (n) => (n == null ? '—' : `${n.toFixed(1)}%`),
    },
  ];

  const rows: MatrixRow[] = rowSpecs
    .map((spec) => {
      const cells: (Cell | null)[] = cols.map((c) => {
        const raw = c.tier?.[spec.field] as number | null | undefined;
        if (raw == null) return { value: '—', yoy: null };
        return { value: spec.fmt(raw), yoy: null };
      });
      const hasAny = cells.some((c) => c && c.value !== '—');
      return hasAny ? { indicator: spec.indicator, cells } : null;
    })
    .filter((r): r is MatrixRow => r !== null);

  return {
    title: 'Demographics',
    columns,
    rows,
  };
}

function entryToCell(
  entry: FredEntry | null,
  fmt: (n: number | null | undefined) => string,
): Cell | null {
  if (!entry || entry.value == null) return { value: '—', yoy: null };
  return { value: fmt(entry.value), yoy: entry.yoy_pct ?? null };
}

/** Fuzzy-find a FRED entry whose key contains any of the given needles (case-insensitive). */
function pickFred(
  fred: Record<string, FredEntry>,
  needles: string[],
): FredEntry | null {
  const entries = Object.entries(fred);
  for (const needle of needles) {
    const n = needle.toLowerCase();
    const hit = entries.find(
      ([k, v]) => k.toLowerCase().includes(n) && v && v.value != null,
    );
    if (hit) return hit[1];
  }
  return null;
}

/* ─── Formatters ─────────────────────────────────────────────────────── */

function formatNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString('en-US');
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toLocaleString('en-US')}`;
}

function formatPercent(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toFixed(2)}%`;
}

function formatIndex(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(1);
}

function formatThousands(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toFixed(0)}K`;
}
