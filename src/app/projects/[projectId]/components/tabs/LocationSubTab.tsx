/**
 * LocationSubTab Component
 *
 * First sub-tab under Property for income properties.
 * Follows the analytical funnel: Macro Economy -> Local Economy -> Property Location
 *
 * Layout:
 * - Left column: Economic indicator cards (Population, Employment, Unemployment, Median HH Income)
 *   with geographic hierarchy (US -> State -> MSA -> County -> City)
 * - Right column: 3 accordion sections (Macro US/State, MSA, City/Neighborhood)
 *   with AI-generated economic analysis following the Appraisal Institute's
 *   methodology (The Appraisal of Real Estate, 14th Edition, Chs 10, 11, 15)
 *
 * Data sources:
 * - /api/market/geos -- geographic resolution from project city/state
 * - /api/market/series -- time-series economic indicators by geo_id
 * - /api/market/analysis -- AI-generated tier analyses (T1/T2/T3)
 *
 * @version 2.0
 * @created 2026-02-22
 * @updated 2026-02-23 -- Added AI-generated T1/T2/T3 analysis content
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
  CSpinner,
  CBadge,
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilChevronLeft,
  cilChevronRight,
  cilReload,
  cilArrowThickToTop,
  cilArrowThickToBottom,
  cilMediaPlay,
  cilWarning,
} from '@coreui/icons';
import {
  captureDataSnapshot,
  checkSnapshotStaleness,
  type DataSnapshot,
} from '@/lib/location-analysis-snapshot';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
  project_type?: string;
  property_subtype?: string;
  jurisdiction_city?: string;
  jurisdiction_state?: string;
  location_lat?: number | string | null;
  location_lon?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  [key: string]: unknown;
}

interface LocationSubTabProps {
  project: Project;
}

interface GeoTarget {
  geo_id: string;
  geo_level: string;
  geo_name: string;
}

interface GeoResponse {
  base: GeoTarget & { usps_city: string | null; usps_state: string | null };
  targets: GeoTarget[];
  notice?: string;
}

interface SeriesPoint {
  date: string;
  value: string | null;
  coverage_note: string | null;
}

interface MarketSeries {
  series_code: string;
  series_name: string;
  category: string;
  subcategory: string | null;
  geo_id: string;
  geo_level: string;
  geo_name: string;
  units: string | null;
  seasonal: string | null;
  data: SeriesPoint[];
}

interface IndicatorRow {
  geoLevel: string;
  geoName: string;
  value: string;
  change: string;
  direction: 'up' | 'down' | 'flat';
  fallback?: string;
}

interface IndicatorCard {
  id: string;
  label: string;
  seriesCode: string;
  format: 'number' | 'currency' | 'percent';
  rows: IndicatorRow[];
}

interface AnalysisSection {
  title: string;
  content: string;
}

interface TierAnalysis {
  tier: string;
  title: string;
  summary: string;
  sections: AnalysisSection[];
  generatedAt: string;
}

type TierKey = 't1' | 't2' | 't3';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GEO_LEVEL_ORDER = ['US', 'STATE', 'MSA', 'COUNTY', 'CITY'] as const;

const INDICATOR_CONFIG = [
  { id: 'population', label: 'Population', codes: ['POP_US', 'POP_STATE', 'POP_MSA', 'POP_COUNTY', 'ACS_POPULATION', 'ACS_COUNTY_POPULATION', 'POP_'], format: 'number' as const },
  { id: 'employment', label: 'Employment', codes: ['PAYEMS', 'PAYEMS_STATE', 'PAYEMS_MSA', 'LAUS_COUNTY_EMP', 'CES_STATE', 'LAUS_EMP', 'LAUS_STATE_EMP', 'LAUS_MSA_EMP', 'EMP_', 'CE_'], format: 'number' as const },
  { id: 'unemployment', label: 'Unemployment Rate', codes: ['LAUS_UNRATE', 'LAUS_STATE_UNRATE', 'LAUS_MSA_UNRATE', 'LAUS_COUNTY_UNRATE', 'LAUS_PLACE_UNRATE', 'UNRATE'], format: 'percent' as const },
  { id: 'income', label: 'Median HH Income', codes: ['MEHOINUSA', 'MEHI_STATE', 'ACS_MEDIAN_HH_INC', 'ACS_COUNTY_MEDIAN_HH_INC', 'ACS_MSA_MEDIAN_HH_INC', 'MEHI_', 'MHHI_'], format: 'currency' as const },
];

const TIER_CONFIG: Record<TierKey, { title: string; badge: string; placeholder: string }> = {
  t1: {
    title: 'National & State Economy',
    badge: 'T1',
    placeholder: 'Macroeconomic overview covering GDP growth, inflation trends, Federal Reserve policy, capital markets, and state-level economic conditions.',
  },
  t2: {
    title: 'Metropolitan Statistical Area (MSA)',
    badge: 'T2',
    placeholder: "Regional economic analysis covering the metro area's economic base, employment centers, demographic trends, and housing market dynamics.",
  },
  t3: {
    title: 'City & Neighborhood',
    badge: 'T3',
    placeholder: "Hyperlocal analysis of the subject's neighborhood covering demographics, property market conditions, zoning, infrastructure, and competitive position.",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scaleByUnits(value: number, units: string | null): number {
  if (!units) return value;
  const u = units.toLowerCase();
  if (u.startsWith('thousands')) return value * 1000;
  if (u.startsWith('millions')) return value * 1_000_000;
  return value;
}

function formatIndicatorValue(
  value: number | null,
  format: 'number' | 'currency' | 'percent',
): string {
  if (value === null || !Number.isFinite(value)) return '\u2014';
  switch (format) {
    case 'currency':
      return value >= 1_000_000
        ? `$${(value / 1_000_000).toFixed(2)}M`
        : value >= 1000
          ? `$${(value / 1000).toFixed(1)}k`
          : `$${value.toLocaleString()}`;
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'number':
    default:
      if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
      return value.toLocaleString();
  }
}

function computeYoYChange(
  data: SeriesPoint[],
): { value: number | null; change: string; direction: 'up' | 'down' | 'flat' } {
  if (data.length < 2) {
    const latestVal =
      data.length > 0 ? parseFloat(data[data.length - 1].value ?? '') : null;
    return { value: latestVal, change: '\u2014', direction: 'flat' };
  }

  const latest = data[data.length - 1];
  const latestVal = parseFloat(latest.value ?? '');

  const latestDate = new Date(latest.date);
  const targetDate = new Date(latestDate);
  targetDate.setFullYear(targetDate.getFullYear() - 1);

  let priorPoint = data[0];
  let minDiff = Infinity;
  for (const point of data) {
    const diff = Math.abs(
      new Date(point.date).getTime() - targetDate.getTime(),
    );
    if (diff < minDiff) {
      minDiff = diff;
      priorPoint = point;
    }
  }

  const priorVal = parseFloat(priorPoint.value ?? '');
  if (
    !Number.isFinite(latestVal) ||
    !Number.isFinite(priorVal) ||
    priorVal === 0
  ) {
    return {
      value: Number.isFinite(latestVal) ? latestVal : null,
      change: '\u2014',
      direction: 'flat',
    };
  }

  const pctChange = ((latestVal - priorVal) / Math.abs(priorVal)) * 100;
  const direction =
    pctChange > 0.05 ? 'up' : pctChange < -0.05 ? 'down' : 'flat';
  const sign = pctChange > 0 ? '+' : '';
  return {
    value: latestVal,
    change: `${sign}${pctChange.toFixed(1)}%`,
    direction,
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IndicatorCardComponent({ card }: { card: IndicatorCard }) {
  return (
    <CCard
      className="mb-2"
      style={{
        background: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)',
      }}
    >
      <CCardHeader className="sub-section-header py-1 px-3">
        {card.label}
      </CCardHeader>
      <CCardBody className="p-0">
        <table
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}
        >
          <tbody>
            {card.rows.map((row, i) => (
              <tr
                key={row.geoLevel}
                style={{
                  borderBottom:
                    i < card.rows.length - 1
                      ? '1px solid var(--cui-border-color)'
                      : undefined,
                }}
              >
                <td
                  className="py-1 px-3"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    width: '40%',
                  }}
                >
                  {row.geoName}
                  {row.fallback && (
                    <CBadge
                      color="warning"
                      shape="rounded-pill"
                      className="ms-1"
                      style={{ fontSize: '0.55rem', verticalAlign: 'middle' }}
                    >
                      {row.fallback}
                    </CBadge>
                  )}
                </td>
                <td
                  className="py-1 px-2 text-end"
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 500,
                    color: 'var(--cui-body-color)',
                    width: '30%',
                  }}
                >
                  {row.value}
                </td>
                <td
                  className="py-1 px-2 text-end"
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 500,
                    width: '30%',
                    color:
                      row.direction === 'up'
                        ? 'var(--cui-success)'
                        : row.direction === 'down'
                          ? 'var(--cui-danger)'
                          : 'var(--cui-secondary-color)',
                  }}
                >
                  {row.direction === 'up' && (
                    <CIcon icon={cilArrowThickToTop} size="sm" className="me-1" />
                  )}
                  {row.direction === 'down' && (
                    <CIcon
                      icon={cilArrowThickToBottom}
                      size="sm"
                      className="me-1"
                    />
                  )}
                  {row.change}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CCardBody>
    </CCard>
  );
}

function AnalysisAccordionSection({
  config,
  analysis,
  isGenerating,
  onGenerate,
  onViewDetail,
  itemKey,
  staleness,
}: {
  config: (typeof TIER_CONFIG)['t1'];
  analysis: TierAnalysis | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onViewDetail: () => void;
  itemKey: number;
  staleness?: { is_stale: boolean; reasons: string[] };
}) {
  return (
    <CAccordionItem itemKey={itemKey}>
      <CAccordionHeader>
        <div className="d-flex align-items-center gap-2 w-100">
          <CBadge
            color={staleness?.is_stale ? 'warning' : analysis ? 'success' : 'primary'}
            style={{ fontSize: '0.65rem', minWidth: 28, textAlign: 'center' }}
          >
            {config.badge}
          </CBadge>
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {config.title}
          </span>
          {analysis && (
            <span
              style={{
                fontSize: '0.65rem',
                color: 'var(--cui-secondary-color)',
                marginLeft: 'auto',
                marginRight: '0.5rem',
              }}
            >
              Generated {new Date(analysis.generatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </CAccordionHeader>
      <CAccordionBody>
        {/* Staleness notification */}
        {staleness?.is_stale && analysis && !isGenerating && (
          <div
            className="d-flex align-items-start gap-2 rounded mb-3 p-2"
            style={{
              fontSize: '0.8rem',
              background: 'rgba(var(--cui-warning-rgb), 0.08)',
              border: '1px solid var(--cui-warning)',
            }}
          >
            <CIcon icon={cilWarning} size="sm" className="mt-1 flex-shrink-0" style={{ color: 'var(--cui-warning)' }} />
            <div className="flex-grow-1">
              <div className="fw-semibold" style={{ color: 'var(--cui-warning)', fontSize: '0.8rem' }}>
                Analysis may be outdated
              </div>
              <div style={{ color: 'var(--cui-secondary-color)', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                {staleness.reasons.join('. ')}
              </div>
              <CButton
                color="warning"
                variant="outline"
                size="sm"
                onClick={onGenerate}
                style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
              >
                <CIcon icon={cilReload} size="sm" className="me-1" />
                Update Analysis
              </CButton>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="d-flex align-items-center gap-2 py-3">
            <CSpinner size="sm" color="primary" />
            <span
              style={{
                fontSize: '0.85rem',
                color: 'var(--cui-secondary-color)',
              }}
            >
              Generating {config.title.toLowerCase()} analysis...
            </span>
          </div>
        )}

        {!analysis && !isGenerating && (
          <div>
            <p
              style={{
                fontSize: '0.85rem',
                lineHeight: 1.6,
                color: 'var(--cui-secondary-color)',
                marginBottom: '0.75rem',
              }}
            >
              {config.placeholder}
            </p>
            <CButton
              color="primary"
              variant="outline"
              size="sm"
              onClick={onGenerate}
            >
              <CIcon icon={cilMediaPlay} className="me-1" />
              Generate Analysis
            </CButton>
          </div>
        )}

        {analysis && !isGenerating && (
          <div>
            <div
              style={{
                fontSize: '0.85rem',
                lineHeight: 1.7,
                color: 'var(--cui-body-color)',
                marginBottom: '1rem',
              }}
            >
              {analysis.summary.split('\n\n').map((para, i) => (
                <p key={i} style={{ marginBottom: '0.6rem' }}>
                  {para}
                </p>
              ))}
            </div>
            <div className="d-flex gap-2">
              <CButton
                color="primary"
                variant="outline"
                size="sm"
                onClick={onViewDetail}
              >
                View Full Analysis ({analysis.sections.length} sections)
              </CButton>
              <CButton
                color="secondary"
                variant="ghost"
                size="sm"
                onClick={onGenerate}
                title="Regenerate analysis"
              >
                <CIcon icon={cilReload} size="sm" />
              </CButton>
            </div>
          </div>
        )}
      </CAccordionBody>
    </CAccordionItem>
  );
}

function AnalysisDetailFlyout({
  visible,
  analysis,
  config,
  onClose,
}: {
  visible: boolean;
  analysis: TierAnalysis | null;
  config: (typeof TIER_CONFIG)['t1'];
  onClose: () => void;
}) {
  if (!analysis) return null;

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      size="xl"
      alignment="center"
      scrollable
    >
      <CModalHeader>
        <CModalTitle>
          <span className="d-flex align-items-center gap-2">
            <CBadge color="success" style={{ fontSize: '0.7rem' }}>
              {config.badge}
            </CBadge>
            {config.title} &mdash; Full Analysis
          </span>
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {/* Executive Summary */}
        <div
          className="rounded p-3 mb-4"
          style={{
            background: 'rgba(var(--cui-primary-rgb), 0.05)',
            border: '1px solid rgba(var(--cui-primary-rgb), 0.15)',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--cui-primary)',
              marginBottom: '0.5rem',
            }}
          >
            Executive Summary
          </div>
          <div
            style={{
              fontSize: '0.9rem',
              lineHeight: 1.7,
              color: 'var(--cui-body-color)',
            }}
          >
            {analysis.summary.split('\n\n').map((para, i) => (
              <p key={i} style={{ marginBottom: '0.6rem' }}>
                {para}
              </p>
            ))}
          </div>
        </div>

        {/* Detailed sections */}
        {analysis.sections.map((section, i) => (
          <div key={i} className="mb-4">
            <div
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--cui-body-color)',
                marginBottom: '0.5rem',
                paddingBottom: '0.35rem',
                borderBottom: '1px solid var(--cui-border-color)',
              }}
            >
              <span
                style={{
                  color: 'var(--cui-secondary-color)',
                  fontSize: '0.7rem',
                  marginRight: '0.5rem',
                }}
              >
                {i + 1}.
              </span>
              {section.title}
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                lineHeight: 1.7,
                color: 'var(--cui-body-color)',
              }}
            >
              {section.content.split('\n\n').map((para, j) => (
                <p key={j} style={{ marginBottom: '0.5rem' }}>
                  {para}
                </p>
              ))}
            </div>
          </div>
        ))}

        <div
          className="text-end mt-3 pt-2"
          style={{
            borderTop: '1px solid var(--cui-border-color)',
            fontSize: '0.7rem',
            color: 'var(--cui-secondary-color)',
          }}
        >
          Generated {new Date(analysis.generatedAt).toLocaleString()} |
          Methodology: Appraisal Institute, 14th Ed.
        </div>
      </CModalBody>
    </CModal>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function LocationSubTab({ project }: LocationSubTabProps) {
  const [geoData, setGeoData] = useState<GeoResponse | null>(null);
  const [seriesData, setSeriesData] = useState<MarketSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [detailFlyout, setDetailFlyout] = useState<TierKey | null>(null);

  const [analyses, setAnalyses] = useState<Record<TierKey, TierAnalysis | null>>(
    { t1: null, t2: null, t3: null },
  );
  const [generating, setGenerating] = useState<Record<TierKey, boolean>>(
    { t1: false, t2: false, t3: false },
  );
  const [analysisError, setAnalysisError] = useState<
    Record<TierKey, string | null>
  >({ t1: null, t2: null, t3: null });
  const [staleness, setStaleness] = useState<
    Record<TierKey, { is_stale: boolean; reasons: string[] }>
  >({
    t1: { is_stale: false, reasons: [] },
    t2: { is_stale: false, reasons: [] },
    t3: { is_stale: false, reasons: [] },
  });
  const t1AutoGenerated = useRef(false);
  const savedAnalysesLoaded = useRef(false);

  const handleSidebarResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsResizing(true);
      const startX = e.clientX;
      const startWidth = sidebarWidth;
      const onMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX;
        setSidebarWidth(Math.max(220, Math.min(600, startWidth + delta)));
      };
      const onUp = () => {
        setIsResizing(false);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [sidebarWidth],
  );

  const city = (project.jurisdiction_city as string) || '';
  const state = (project.jurisdiction_state as string) || '';

  // Fetch geo + series data
  useEffect(() => {
    if (!city || !state) {
      setError(
        'Project city/state not configured. Set jurisdiction_city and jurisdiction_state on the project.',
      );
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const geoRes = await fetch(
          `/api/market/geos?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`,
        );
        if (!geoRes.ok) {
          setError(
            geoRes.status === 404
              ? `Geography not found for ${city}, ${state}. Market data may not be available.`
              : `Failed to resolve geography (${geoRes.status})`,
          );
          setIsLoading(false);
          return;
        }
        const geoJson: GeoResponse = await geoRes.json();
        if (cancelled) return;
        setGeoData(geoJson);

        const geoIds = geoJson.targets.map((t) => t.geo_id).join(',');
        const seriesRes = await fetch(
          `/api/market/series?geo_ids=${encodeURIComponent(geoIds)}`,
        );
        if (seriesRes.ok) {
          const seriesJson = await seriesRes.json();
          if (!cancelled) setSeriesData(seriesJson.series || []);
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load location data',
          );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [city, state]);

  // Build indicator cards
  const indicatorCards = useMemo<IndicatorCard[]>(() => {
    if (!geoData) return [];
    return INDICATOR_CONFIG.map((config) => {
      const rows: IndicatorRow[] = [];
      for (const level of GEO_LEVEL_ORDER) {
        const target = geoData.targets.find((t) => t.geo_level === level);
        if (!target) continue;
        const matchingSeries = seriesData.find(
          (s) =>
            s.geo_id === target.geo_id &&
            config.codes.some((prefix) =>
              s.series_code.toUpperCase().startsWith(prefix.toUpperCase()),
            ),
        );
        if (matchingSeries && matchingSeries.data.length > 0) {
          const { value, change, direction } = computeYoYChange(
            matchingSeries.data,
          );
          const scaled =
            value !== null ? scaleByUnits(value, matchingSeries.units) : null;
          rows.push({
            geoLevel: level,
            geoName: target.geo_name,
            value: formatIndicatorValue(scaled, config.format),
            change,
            direction,
          });
        } else {
          rows.push({
            geoLevel: level,
            geoName: target.geo_name,
            value: '\u2014',
            change: '\u2014',
            direction: 'flat',
          });
        }
      }
      return {
        id: config.id,
        label: config.label,
        seriesCode: config.codes[0],
        format: config.format,
        rows,
      };
    });
  }, [geoData, seriesData]);

  // Generate analysis for a tier
  const generateAnalysis = useCallback(
    async (tier: TierKey) => {
      if (!geoData || generating[tier]) return;
      setGenerating((prev) => ({ ...prev, [tier]: true }));
      setAnalysisError((prev) => ({ ...prev, [tier]: null }));
      try {
        const payload = {
          tier,
          project: {
            name: project.project_name,
            type_code: project.project_type_code || 'MF',
            property_type: project.project_type || undefined,
            property_subtype: project.property_subtype || undefined,
            city,
            state,
          },
          geoTargets: geoData.targets,
          indicators: indicatorCards.map((card) => ({
            label: card.label,
            rows: card.rows,
          })),
        };
        const res = await fetch('/api/market/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errBody = await res
            .json()
            .catch(() => ({ error: 'Unknown error' }));
          throw new Error(
            errBody.error || `Analysis generation failed (${res.status})`,
          );
        }
        const result: TierAnalysis = await res.json();
        setAnalyses((prev) => ({ ...prev, [tier]: result }));

        // Save to database with data snapshot
        try {
          const snapshot = await captureDataSnapshot(seriesData, project.project_id);
          await fetch('/api/market/analysis/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: project.project_id,
              tier,
              analysis: result,
              dataSnapshot: snapshot,
            }),
          });
        } catch (saveErr) {
          console.warn(`Failed to save ${tier} analysis:`, saveErr);
        }

        // Clear staleness after regeneration
        setStaleness((prev) => ({
          ...prev,
          [tier]: { is_stale: false, reasons: [] },
        }));
      } catch (err) {
        setAnalysisError((prev) => ({
          ...prev,
          [tier]:
            err instanceof Error ? err.message : 'Failed to generate analysis',
        }));
      } finally {
        setGenerating((prev) => ({ ...prev, [tier]: false }));
      }
    },
    [geoData, generating, project, city, state, indicatorCards, seriesData],
  );

  // Load saved analyses from database on mount, then check staleness
  useEffect(() => {
    if (!project.project_id || !seriesData.length || savedAnalysesLoaded.current) return;
    savedAnalysesLoaded.current = true;

    let cancelled = false;
    const loadSaved = async () => {
      let anyLoaded = false;
      const savedSnapshots: Record<string, DataSnapshot | null> = {};

      for (const tier of ['t1', 't2', 't3'] as TierKey[]) {
        try {
          const res = await fetch(
            `/api/market/analysis/load?projectId=${project.project_id}&tier=${tier}`,
          );
          if (!res.ok) continue;
          const data = await res.json();
          if (data?.analysis && !cancelled) {
            setAnalyses((prev) => ({ ...prev, [tier]: data.analysis }));
            savedSnapshots[tier] = data.data_snapshot;
            anyLoaded = true;
            if (tier === 't1') t1AutoGenerated.current = true; // Prevent re-generation
          }
        } catch {
          // Non-critical — will fall back to generation
        }
      }

      // Check staleness for loaded analyses
      if (anyLoaded && !cancelled) {
        try {
          const currentSnapshot = await captureDataSnapshot(seriesData, project.project_id);
          for (const tier of ['t1', 't2', 't3'] as TierKey[]) {
            const saved = savedSnapshots[tier];
            if (saved) {
              const result = checkSnapshotStaleness(saved, currentSnapshot);
              if (!cancelled) {
                setStaleness((prev) => ({ ...prev, [tier]: result }));
              }
            }
          }
        } catch {
          // Staleness check is non-critical
        }
      }
    };

    loadSaved();
    return () => { cancelled = true; };
  }, [project.project_id, seriesData]);

  // Auto-generate T1 once indicator data loads (only if not loaded from DB)
  useEffect(() => {
    if (
      indicatorCards.length > 0 &&
      geoData &&
      !analyses.t1 &&
      !generating.t1 &&
      !t1AutoGenerated.current
    ) {
      t1AutoGenerated.current = true;
      generateAnalysis('t1');
    }
  }, [indicatorCards, geoData, analyses.t1, generating.t1, generateAnalysis]);

  const geoLabel = geoData
    ? `${geoData.base.usps_city || geoData.base.geo_name}, ${geoData.base.usps_state || ''}`
    : `${city}, ${state}`;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center py-5">
        <CSpinner color="primary" size="sm" className="me-2" />
        <span style={{ color: 'var(--cui-secondary-color)' }}>
          Loading location data for {city}, {state}...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <CCard style={{ borderColor: 'var(--cui-warning)' }}>
          <CCardBody>
            <div
              className="fw-semibold mb-1"
              style={{ color: 'var(--cui-warning)' }}
            >
              Location Data Unavailable
            </div>
            <div
              style={{
                color: 'var(--cui-secondary-color)',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          </CCardBody>
        </CCard>
      </div>
    );
  }

  return (
    <div className="d-flex h-100" style={{ overflow: 'hidden', padding: '0.5rem 0.5rem 0 0.5rem', gap: '0.5rem' }}>
      {/* Left: Economic Indicators CCard */}
      <CCard
        style={{
          width: sidebarCollapsed ? 40 : sidebarWidth,
          minWidth: sidebarCollapsed ? 40 : 220,
          maxWidth: sidebarCollapsed ? 40 : 600,
          transition: isResizing
            ? 'none'
            : 'width 0.2s ease, min-width 0.2s ease, max-width 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
          marginBottom: 0,
        }}
      >
        <CCardHeader className="d-flex align-items-center justify-content-between py-1 px-3" style={{ minHeight: 33 }}>
          {!sidebarCollapsed && (
            <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>Economic Indicators</span>
          )}
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            className="p-0"
            style={{ minWidth: 24, width: 24, height: 24 }}
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            <CIcon
              icon={sidebarCollapsed ? cilChevronRight : cilChevronLeft}
              size="sm"
            />
          </CButton>
        </CCardHeader>

        {!sidebarCollapsed && (
          <CCardBody className="p-2" style={{ overflowY: 'auto', flex: 1 }}>
            {geoData?.notice && (
              <div
                className="rounded p-2 mb-2"
                style={{
                  fontSize: '0.75rem',
                  background: 'rgba(var(--cui-warning-rgb), 0.1)',
                  border: '1px solid var(--cui-warning)',
                  color: 'var(--cui-warning)',
                }}
              >
                {geoData.notice}
              </div>
            )}
            {indicatorCards.map((card) => (
              <IndicatorCardComponent key={card.id} card={card} />
            ))}
            {indicatorCards.length === 0 && (
              <div
                className="text-center py-3"
                style={{
                  color: 'var(--cui-secondary-color)',
                  fontSize: '0.8rem',
                }}
              >
                No indicator data available for this geography.
              </div>
            )}
          </CCardBody>
        )}
      </CCard>

      {/* Resize handle */}
      {!sidebarCollapsed && (
        <div
          onPointerDown={handleSidebarResizeStart}
          style={{
            width: 8,
            cursor: 'col-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 2,
              height: 48,
              borderRadius: 1,
              backgroundColor: 'var(--cui-border-color)',
            }}
          />
        </div>
      )}

      {/* Right: Location Analysis CCard */}
      <CCard
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          marginBottom: 0,
        }}
      >
        <CCardHeader className="d-flex align-items-center justify-content-between py-1 px-3" style={{ minHeight: 33 }}>
          <div>
            <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>Location Analysis</span>
            <span
              className="ms-2"
              style={{
                fontSize: '0.8rem',
                color: 'var(--cui-secondary-color)',
              }}
            >
              {geoLabel}
            </span>
          </div>
          <CButton
            color="primary"
            variant="outline"
            size="sm"
            disabled={generating.t1 || generating.t2 || generating.t3}
            onClick={() => {
              generateAnalysis('t1');
              generateAnalysis('t2');
              generateAnalysis('t3');
            }}
          >
            <CIcon icon={cilReload} className="me-1" />
            Generate All
          </CButton>
        </CCardHeader>
        <CCardBody style={{ padding: '0.5rem', flex: 1, overflowY: 'auto' }}>
        <CAccordion activeItemKey={1} alwaysOpen className="sub-section-accordion">
          {(['t1', 't2', 't3'] as TierKey[]).map((tier, idx) => (
            <React.Fragment key={tier}>
              <AnalysisAccordionSection
                config={TIER_CONFIG[tier]}
                analysis={analyses[tier]}
                isGenerating={generating[tier]}
                onGenerate={() => generateAnalysis(tier)}
                onViewDetail={() => setDetailFlyout(tier)}
                itemKey={idx + 1}
                staleness={staleness[tier]}
              />
              {analysisError[tier] && (
                <div
                  className="rounded p-2 mx-3 mb-2"
                  style={{
                    fontSize: '0.8rem',
                    background: 'rgba(var(--cui-danger-rgb), 0.08)',
                    border: '1px solid var(--cui-danger)',
                    color: 'var(--cui-danger)',
                  }}
                >
                  {analysisError[tier]}
                </div>
              )}
            </React.Fragment>
          ))}
        </CAccordion>

        <div style={{ height: '2rem' }} />
        </CCardBody>
      </CCard>

      {/* Detail flyout modals */}
      {(['t1', 't2', 't3'] as TierKey[]).map((tier) => (
        <AnalysisDetailFlyout
          key={tier}
          visible={detailFlyout === tier}
          analysis={analyses[tier]}
          config={TIER_CONFIG[tier]}
          onClose={() => setDetailFlyout(null)}
        />
      ))}
    </div>
  );
}
