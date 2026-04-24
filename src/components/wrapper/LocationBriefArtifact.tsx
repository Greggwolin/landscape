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
 * Round 3 refinements (Apr 2026):
 *   1. No green "Multifamily" pill, no "Standard" badge — property type is a
 *      small neutral inline badge; depth tier is dropped from the header.
 *   2. Data cards remain tabular (5 groups), but rows now reflect tiered
 *      Census geography (United States / State / County / City) so the city
 *      label can't mask state-level numbers.
 *   3. Source labels on each row are gone — the footer says it once.
 *   4. Executive Summary is plain prose (no green shading callout).
 *   5. "Show detail" is compressed (smaller type, tighter spacing, no
 *      oversize section headers).
 *   6. No "Create Project" CTA. A location brief alone is not project
 *      scaffolding; Landscaper decides when to offer that path.
 *
 * Artifact still uses a hardcoded LIGHT palette — does NOT inherit app theme.
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
  badgeBg: '#f0efec',
  badgeInk: '#3a3a3a',
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
};

type CardSpec = {
  title: string;
  rows: Row[];
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
    geo_hierarchy?.county ||
    (countyTier?.tier_label ? countyTier.tier_label.replace(/ County$/, '') : null);
  const cityLabel = geo_hierarchy?.city || cityTier?.tier_label;
  const msaLabel = geo_hierarchy?.cbsa_name?.replace(/\s+Metro(politan)? Area$/, '') || null;

  const cards = useMemo<CardSpec[]>(
    () =>
      buildCards(fred, {
        stateLabel,
        countyLabel,
        cityLabel,
        msaLabel,
        stateTier,
        countyTier,
        cityTier,
      }),
    [fred, stateLabel, countyLabel, cityLabel, msaLabel, stateTier, countyTier, cityTier],
  );

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
          {/* Indicator tiles */}
          {hasAnyTiles &&
            cards.map(
              (card) =>
                card.rows.length > 0 && <IndicatorCard key={card.title} card={card} />,
            )}

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

/* ─── Tile card (LocationSubTab-style table) ─────────────────────────── */

function IndicatorCard({ card }: { card: CardSpec }) {
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
          color: P.badgeInk,
          background: P.card,
          letterSpacing: 0.2,
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
                    padding: '7px 14px',
                    color: P.muted,
                    width: '50%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={row.geoName}
                >
                  {row.geoName}
                </td>
                <td
                  style={{
                    padding: '7px 10px',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 500,
                    color: P.ink,
                    width: '27%',
                  }}
                >
                  {row.value}
                </td>
                <td
                  style={{
                    padding: '7px 14px 7px 10px',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 500,
                    width: '23%',
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

/* ─── Card builders — organize fred/census into tabular groups ───────── */

interface BuildContext {
  stateLabel: string;
  countyLabel: string | null;
  cityLabel?: string | null;
  msaLabel: string | null;
  stateTier?: CensusTier;
  countyTier?: CensusTier;
  cityTier?: CensusTier;
}

function buildCards(fred: Record<string, FredEntry>, ctx: BuildContext): CardSpec[] {
  const { stateLabel, countyLabel, cityLabel, msaLabel, stateTier, countyTier, cityTier } = ctx;

  /* ─── Unemployment Rate ─── US + State (metro-level FRED deferred) */
  const unemploymentRows: Row[] = [];
  const usUnemp = pickFred(fred, ['us unemployment', 'unemployment rate']);
  if (usUnemp) {
    unemploymentRows.push({
      geoName: 'United States',
      value: formatPercent(usUnemp.value),
      yoy: usUnemp.yoy_pct ?? null,
    });
  }
  const stateUnemp = pickFred(fred, [
    `${stateLabel.toLowerCase()} unemployment`,
    'state unemployment',
  ]);
  if (stateUnemp) {
    unemploymentRows.push({
      geoName: stateLabel,
      value: formatPercent(stateUnemp.value),
      yoy: stateUnemp.yoy_pct ?? null,
    });
  }

  /* ─── Interest Rates — national */
  const rateRows: Row[] = [];
  const fedFunds = pickFred(fred, ['fed funds']);
  if (fedFunds) {
    rateRows.push({
      geoName: 'Fed Funds Rate',
      value: formatPercent(fedFunds.value),
      yoy: fedFunds.yoy_pct ?? null,
    });
  }
  const mortgage = pickFred(fred, ['30-yr', '30-year', 'mortgage']);
  if (mortgage) {
    rateRows.push({
      geoName: '30-Yr Fixed Mortgage',
      value: formatPercent(mortgage.value),
      yoy: mortgage.yoy_pct ?? null,
    });
  }

  /* ─── Inflation — national */
  const inflationRows: Row[] = [];
  const cpi = pickFred(fred, ['cpi']);
  if (cpi) {
    inflationRows.push({
      geoName: 'CPI (All Items, SA)',
      value: formatIndex(cpi.value),
      yoy: cpi.yoy_pct ?? null,
    });
  }

  /* ─── Housing Market — US Case-Shiller + FHFA HPI tiered (US / State / MSA) */
  const housingRows: Row[] = [];
  const housingStarts = pickFred(fred, ['housing starts']);
  if (housingStarts) {
    housingRows.push({
      geoName: 'Housing Starts (US, annualized)',
      value: formatThousands(housingStarts.value),
      yoy: housingStarts.yoy_pct ?? null,
    });
  }
  const caseShiller = pickFred(fred, ['case-shiller', 'case shiller']);
  if (caseShiller) {
    housingRows.push({
      geoName: 'Case-Shiller Home Price Index (US)',
      value: formatIndex(caseShiller.value),
      yoy: caseShiller.yoy_pct ?? null,
    });
  }
  const usHpi = pickFred(fred, ['us house price', 'fhfa us', 'ussthpi']);
  if (usHpi) {
    housingRows.push({
      geoName: 'FHFA Home Price Index — United States',
      value: formatIndex(usHpi.value),
      yoy: usHpi.yoy_pct ?? null,
    });
  }
  const stateHpi = pickFred(fred, [
    `${stateLabel.toLowerCase()} house price`,
    'state house price',
    'sthpi',
  ]);
  if (stateHpi) {
    housingRows.push({
      geoName: `FHFA Home Price Index — ${stateLabel}`,
      value: formatIndex(stateHpi.value),
      yoy: stateHpi.yoy_pct ?? null,
    });
  }
  const msaHpi = msaLabel
    ? pickFred(fred, [msaLabel.toLowerCase(), 'atnhpi'])
    : pickFred(fred, ['atnhpi']);
  if (msaHpi) {
    housingRows.push({
      geoName: `FHFA Home Price Index — ${msaLabel || 'Metro Area'}`,
      value: formatIndex(msaHpi.value),
      yoy: msaHpi.yoy_pct ?? null,
    });
  }

  /* ─── Median Home Value — tiered Census */
  const homeValueRows: Row[] = [];
  if (stateTier?.median_home_value != null) {
    homeValueRows.push({
      geoName: stateLabel,
      value: formatCurrency(stateTier.median_home_value),
      yoy: null,
    });
  }
  if (countyTier?.median_home_value != null) {
    homeValueRows.push({
      geoName: countyLabel ? `${countyLabel} County` : 'County',
      value: formatCurrency(countyTier.median_home_value),
      yoy: null,
    });
  }
  if (cityTier?.median_home_value != null) {
    homeValueRows.push({
      geoName: cityLabel || 'City',
      value: formatCurrency(cityTier.median_home_value),
      yoy: null,
    });
  }

  /* ─── Median Gross Rent — tiered Census */
  const rentRows: Row[] = [];
  if (stateTier?.median_gross_rent != null) {
    rentRows.push({
      geoName: stateLabel,
      value: formatCurrency(stateTier.median_gross_rent),
      yoy: null,
    });
  }
  if (countyTier?.median_gross_rent != null) {
    rentRows.push({
      geoName: countyLabel ? `${countyLabel} County` : 'County',
      value: formatCurrency(countyTier.median_gross_rent),
      yoy: null,
    });
  }
  if (cityTier?.median_gross_rent != null) {
    rentRows.push({
      geoName: cityLabel || 'City',
      value: formatCurrency(cityTier.median_gross_rent),
      yoy: null,
    });
  }

  /* ─── Population — tiered Census */
  const popRows: Row[] = [];
  if (stateTier?.population != null) {
    popRows.push({
      geoName: stateLabel,
      value: formatNumber(stateTier.population),
      yoy: null,
    });
  }
  if (countyTier?.population != null) {
    popRows.push({
      geoName: countyLabel ? `${countyLabel} County` : 'County',
      value: formatNumber(countyTier.population),
      yoy: null,
    });
  }
  if (cityTier?.population != null) {
    popRows.push({
      geoName: cityLabel || 'City',
      value: formatNumber(cityTier.population),
      yoy: null,
    });
  }

  /* ─── Median HH Income — tiered Census */
  const incomeRows: Row[] = [];
  if (stateTier?.median_hh_income != null) {
    incomeRows.push({
      geoName: stateLabel,
      value: formatCurrency(stateTier.median_hh_income),
      yoy: null,
    });
  }
  if (countyTier?.median_hh_income != null) {
    incomeRows.push({
      geoName: countyLabel ? `${countyLabel} County` : 'County',
      value: formatCurrency(countyTier.median_hh_income),
      yoy: null,
    });
  }
  if (cityTier?.median_hh_income != null) {
    incomeRows.push({
      geoName: cityLabel || 'City',
      value: formatCurrency(cityTier.median_hh_income),
      yoy: null,
    });
  }

  /* ─── Median Age — tiered Census */
  const ageRows: Row[] = [];
  if (stateTier?.median_age != null) {
    ageRows.push({
      geoName: stateLabel,
      value: `${stateTier.median_age.toFixed(1)}`,
      yoy: null,
    });
  }
  if (countyTier?.median_age != null) {
    ageRows.push({
      geoName: countyLabel ? `${countyLabel} County` : 'County',
      value: `${countyTier.median_age.toFixed(1)}`,
      yoy: null,
    });
  }
  if (cityTier?.median_age != null) {
    ageRows.push({
      geoName: cityLabel || 'City',
      value: `${cityTier.median_age.toFixed(1)}`,
      yoy: null,
    });
  }

  /* ─── Owner-Occupied — tiered Census */
  const ownerOccRows: Row[] = [];
  if (stateTier?.owner_occ_pct != null) {
    ownerOccRows.push({
      geoName: stateLabel,
      value: `${stateTier.owner_occ_pct.toFixed(1)}%`,
      yoy: null,
    });
  }
  if (countyTier?.owner_occ_pct != null) {
    ownerOccRows.push({
      geoName: countyLabel ? `${countyLabel} County` : 'County',
      value: `${countyTier.owner_occ_pct.toFixed(1)}%`,
      yoy: null,
    });
  }
  if (cityTier?.owner_occ_pct != null) {
    ownerOccRows.push({
      geoName: cityLabel || 'City',
      value: `${cityTier.owner_occ_pct.toFixed(1)}%`,
      yoy: null,
    });
  }

  return [
    { title: 'Unemployment Rate', rows: unemploymentRows },
    { title: 'Interest Rates', rows: rateRows },
    { title: 'Inflation', rows: inflationRows },
    { title: 'Housing Market', rows: housingRows },
    { title: 'Median Home Value', rows: homeValueRows },
    { title: 'Median Gross Rent', rows: rentRows },
    { title: 'Population', rows: popRows },
    { title: 'Median Household Income', rows: incomeRows },
    { title: 'Median Age', rows: ageRows },
    { title: 'Owner-Occupied Housing', rows: ownerOccRows },
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
