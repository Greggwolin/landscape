'use client';

import React, { useMemo, useState } from 'react';
import { X, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
import type { LocationBriefArtifactConfig } from '@/contexts/WrapperUIContext';
import { CreateProjectCTA } from './CreateProjectCTA';

interface LocationBriefArtifactProps {
  config: LocationBriefArtifactConfig;
  onClose: () => void;
}

/**
 * Renders a generate_location_brief tool result in the right artifacts panel.
 *
 * Visual pattern ported from LocationSubTab (alpha19/main econ-indicators widget):
 * - Metric-grouped cards with Geography | Value | YoY tables
 * - Green up-arrow / red down-arrow for YoY direction
 * - Executive summary renders BELOW the tiles, condensed by default
 * - "Show detail" toggle reveals the longer narrative sections
 *
 * Artifact uses a hardcoded LIGHT palette — it does NOT inherit the app theme.
 * Review-style companion doc aesthetic.
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
  accentSoft: '#e8f1ec',
  border: '#d9d9d4',
  borderSoft: '#ececea',
  up: '#2e6f40',
  down: '#b64040',
} as const;

type FredEntry = {
  series_id?: string;
  value: number | null;
  date?: string;
  yoy_pct?: number | null;
};

type Row = {
  geoName: string;
  value: string;
  yoy: number | null;
  asOf?: string;
};

type CardSpec = {
  title: string;
  rows: Row[];
};

export function LocationBriefArtifact({ config, onClose }: LocationBriefArtifactProps) {
  const {
    location_display,
    property_type_label,
    depth,
    geo_hierarchy,
    summary,
    sections,
    indicators,
    data_as_of,
    cached,
    project_ready,
  } = config;

  const [showDetail, setShowDetail] = useState(false);

  const fred = (indicators?.fred || {}) as Record<string, FredEntry>;
  const census = indicators?.census || {};
  const stateName = geo_hierarchy?.state || geo_hierarchy?.state_abbrev || 'State';
  const cityLabel =
    geo_hierarchy?.city && geo_hierarchy?.state_abbrev
      ? `${geo_hierarchy.city}, ${geo_hierarchy.state_abbrev}`
      : geo_hierarchy?.city || location_display;

  const cards = useMemo<CardSpec[]>(() => {
    return buildCards(fred, census, stateName, cityLabel);
  }, [fred, census, stateName, cityLabel]);

  const hasAnyTiles = cards.some((c) => c.rows.length > 0);

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
      {/* Header — sticky, minimal */}
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
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Pill>{property_type_label}</Pill>
            <Pill muted>{capitalize(depth)}</Pill>
            <span style={{ fontSize: 11, color: P.muted }}>
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
          {/* Indicator tiles (always expanded, at top) */}
          {hasAnyTiles &&
            cards.map(
              (card) =>
                card.rows.length > 0 && <IndicatorCard key={card.title} card={card} />,
            )}

          {/* Executive Summary — BELOW tiles, condensed, with detail toggle */}
          {summary && (
            <section
              style={{
                background: P.card,
                border: `1px solid ${P.border}`,
                borderRadius: 8,
                padding: '18px 22px',
                marginBottom: 14,
              }}
            >
              <SectionHeader>Executive Summary</SectionHeader>
              <div
                style={{
                  background: P.accentSoft,
                  borderLeft: `3px solid ${P.accent}`,
                  padding: '10px 14px',
                  borderRadius: 4,
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
                    marginTop: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    border: `1px solid ${P.border}`,
                    borderRadius: 6,
                    background: P.card,
                    color: P.accent,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {showDetail ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {showDetail ? 'Hide detail' : 'Show detail'}
                </button>
              )}

              {showDetail && sections.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {sections.map((section, idx) => (
                    <div key={idx}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: P.accent,
                          marginBottom: 6,
                          paddingBottom: 4,
                          borderBottom: `1px solid ${P.borderSoft}`,
                        }}
                      >
                        {section.title}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          lineHeight: 1.6,
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

          {/* Project creation CTA — only when we have enough info */}
          {project_ready && (
            <section
              style={{
                background: P.card,
                border: `1px solid ${P.border}`,
                borderRadius: 8,
                padding: '18px 22px',
                marginBottom: 14,
              }}
            >
              <CreateProjectCTA config={config} />
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

          {/* Footer */}
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: `1px solid ${P.border}`,
              fontSize: 11,
              color: P.muted,
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Data sources: FRED · US Census Bureau ACS 5-Year
            <br />
            Refreshed {data_as_of}
            {cached ? ' (cached)' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Tile card (LocationSubTab-style table) ─────────────────────────── */

function IndicatorCard({ card }: { card: CardSpec }) {
  return (
    <section
      style={{
        background: P.card,
        border: `1px solid ${P.border}`,
        borderRadius: 8,
        marginBottom: 14,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 16px',
          borderBottom: `1px solid ${P.borderSoft}`,
          fontSize: 13,
          fontWeight: 600,
          color: P.accent,
          background: P.card,
        }}
      >
        {card.title}
      </div>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
          color: P.ink,
        }}
      >
        <tbody>
          {card.rows.map((row, i) => {
            const direction: 'up' | 'down' | 'flat' =
              row.yoy == null
                ? 'flat'
                : row.yoy > 0.05
                  ? 'up'
                  : row.yoy < -0.05
                    ? 'down'
                    : 'flat';
            const yoyColor =
              direction === 'up' ? P.up : direction === 'down' ? P.down : P.mutedSoft;
            return (
              <tr
                key={`${row.geoName}-${i}`}
                style={{
                  borderBottom:
                    i < card.rows.length - 1 ? `1px solid ${P.borderSoft}` : undefined,
                }}
              >
                <td
                  style={{
                    padding: '8px 16px',
                    color: P.muted,
                    width: '45%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={`${row.geoName}${row.asOf ? ` · ${row.asOf}` : ''}`}
                >
                  {row.geoName}
                  {row.asOf && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: P.mutedSoft }}>
                      {row.asOf}
                    </span>
                  )}
                </td>
                <td
                  style={{
                    padding: '8px 10px',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 500,
                    color: P.ink,
                    width: '30%',
                  }}
                >
                  {row.value}
                </td>
                <td
                  style={{
                    padding: '8px 16px 8px 10px',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 500,
                    width: '25%',
                    color: yoyColor,
                  }}
                >
                  {row.yoy == null ? (
                    <span style={{ color: P.mutedSoft }}>—</span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      {direction === 'up' && <ArrowUp size={11} />}
                      {direction === 'down' && <ArrowDown size={11} />}
                      {row.yoy > 0 ? '+' : ''}
                      {row.yoy.toFixed(1)}%
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/* ─── Shared subcomponents ───────────────────────────────────────────── */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 15,
        margin: '0 0 10px',
        paddingBottom: 6,
        color: P.accent,
        borderBottom: `2px solid ${P.borderSoft}`,
        fontWeight: 600,
        lineHeight: 1.3,
      }}
    >
      {children}
    </h2>
  );
}

function Pill({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: muted ? P.borderSoft : P.accent,
        color: muted ? P.muted : '#ffffff',
        padding: '2px 9px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.2,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/* ─── Card builders — organize fred/census into tabular groups ───────── */

function buildCards(
  fred: Record<string, FredEntry>,
  census: LocationBriefArtifactConfig['indicators']['census'] | undefined,
  stateName: string,
  cityLabel: string,
): CardSpec[] {
  const c = census || {};

  // Unemployment Rate — US + State rows
  const unemploymentRows: Row[] = [];
  const usUnemp = pickFred(fred, ['us unemployment', 'unemployment rate']);
  if (usUnemp) {
    unemploymentRows.push({
      geoName: 'United States',
      value: formatPercent(usUnemp.value),
      yoy: usUnemp.yoy_pct ?? null,
      asOf: usUnemp.date,
    });
  }
  const stateUnemp = pickFred(fred, [
    `${stateName.toLowerCase()} unemployment`,
    'state unemployment',
  ]);
  if (stateUnemp) {
    unemploymentRows.push({
      geoName: stateName,
      value: formatPercent(stateUnemp.value),
      yoy: stateUnemp.yoy_pct ?? null,
      asOf: stateUnemp.date,
    });
  }

  // Interest Rates — national
  const rateRows: Row[] = [];
  const fedFunds = pickFred(fred, ['fed funds']);
  if (fedFunds) {
    rateRows.push({
      geoName: 'Fed Funds Rate',
      value: formatPercent(fedFunds.value),
      yoy: fedFunds.yoy_pct ?? null,
      asOf: fedFunds.date,
    });
  }
  const mortgage = pickFred(fred, ['30-yr', '30-year', 'mortgage']);
  if (mortgage) {
    rateRows.push({
      geoName: '30-Yr Fixed Mortgage',
      value: formatPercent(mortgage.value),
      yoy: mortgage.yoy_pct ?? null,
      asOf: mortgage.date,
    });
  }

  // Inflation — national
  const inflationRows: Row[] = [];
  const cpi = pickFred(fred, ['cpi']);
  if (cpi) {
    inflationRows.push({
      geoName: 'CPI (All Items, SA)',
      value: formatIndex(cpi.value),
      yoy: cpi.yoy_pct ?? null,
      asOf: cpi.date,
    });
  }

  // Housing Market — mix of national + city
  const housingRows: Row[] = [];
  const housingStarts = pickFred(fred, ['housing starts']);
  if (housingStarts) {
    housingRows.push({
      geoName: 'Housing Starts (US, annualized)',
      value: formatThousands(housingStarts.value),
      yoy: housingStarts.yoy_pct ?? null,
      asOf: housingStarts.date,
    });
  }
  const caseShiller = pickFred(fred, ['case-shiller', 'case shiller']);
  if (caseShiller) {
    housingRows.push({
      geoName: 'Case-Shiller US Home Price Index',
      value: formatIndex(caseShiller.value),
      yoy: caseShiller.yoy_pct ?? null,
      asOf: caseShiller.date,
    });
  }
  if (c.median_home_value != null) {
    housingRows.push({
      geoName: `${cityLabel} Median Home Value`,
      value: formatCurrency(c.median_home_value),
      yoy: null,
      asOf: c.vintage || 'ACS 5-Yr',
    });
  }

  // Demographics — census city-level
  const demoRows: Row[] = [];
  if (c.population != null) {
    demoRows.push({
      geoName: `${cityLabel} Population`,
      value: formatNumber(c.population),
      yoy: null,
      asOf: c.vintage || 'ACS 5-Yr',
    });
  }
  if (c.median_hh_income != null) {
    demoRows.push({
      geoName: `${cityLabel} Median HH Income`,
      value: formatCurrency(c.median_hh_income),
      yoy: null,
      asOf: c.vintage || 'ACS 5-Yr',
    });
  }
  if (c.owner_occ_pct != null) {
    demoRows.push({
      geoName: `${cityLabel} Owner-Occupied`,
      value: `${c.owner_occ_pct.toFixed(1)}%`,
      yoy: null,
      asOf: c.vintage || 'ACS 5-Yr',
    });
  }

  return [
    { title: 'Unemployment Rate', rows: unemploymentRows },
    { title: 'Interest Rates', rows: rateRows },
    { title: 'Inflation', rows: inflationRows },
    { title: 'Housing Market', rows: housingRows },
    { title: 'Demographics', rows: demoRows },
  ];
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
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
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

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
