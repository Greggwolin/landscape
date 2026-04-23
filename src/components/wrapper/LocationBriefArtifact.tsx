'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { LocationBriefArtifactConfig } from '@/contexts/WrapperUIContext';
import { CreateProjectCTA } from './CreateProjectCTA';

interface LocationBriefArtifactProps {
  config: LocationBriefArtifactConfig;
  onClose: () => void;
}

/**
 * Renders a generate_location_brief tool result in the right artifacts panel.
 *
 * Card-based layout modeled on the plain-English review companion doc:
 * - Stacked vertical cards (no accordions)
 * - h2 with green accent + border-bottom per card
 * - 820px max-width inner wrap, centered (scales up when panel is widened)
 * - Pills for property type + depth in the sticky header
 * - CreateProjectCTA surfaces only when project_ready = true
 */
export function LocationBriefArtifact({ config, onClose }: LocationBriefArtifactProps) {
  const {
    location_display,
    property_type_label,
    depth,
    summary,
    sections,
    indicators,
    data_as_of,
    cached,
    project_ready,
  } = config;

  const fred = indicators?.fred || {};
  const census = indicators?.census || {};
  const hasIndicators =
    Object.values(fred).some((v) => v && v.value !== null && v.value !== undefined) ||
    census.population != null ||
    census.median_hh_income != null ||
    census.median_home_value != null ||
    census.owner_occ_pct != null;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: 'var(--cui-body-color)',
        background: 'var(--cui-tertiary-bg, var(--cui-body-bg))',
      }}
    >
      {/* Header — sticky, minimal */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--cui-border-color)',
          background: 'var(--cui-body-bg)',
          flexShrink: 0,
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              lineHeight: 1.2,
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
            <span
              style={{
                fontSize: '11px',
                color: 'var(--cui-secondary-color)',
              }}
            >
              as of {data_as_of}
              {cached ? ' · cached' : ''}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-btn w-btn-icon"
          title="Close location brief"
          style={{ flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body — scrollable card column */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px 16px 32px',
        }}
      >
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {/* Executive Summary */}
          {summary && (
            <Card>
              <SectionHeader>Executive Summary</SectionHeader>
              <Callout>{summary}</Callout>
            </Card>
          )}

          {/* Project creation CTA — only when we have enough info */}
          {project_ready && (
            <Card>
              <CreateProjectCTA config={config} />
            </Card>
          )}

          {/* Key Indicators */}
          {hasIndicators && (
            <Card>
              <SectionHeader>Key Indicators</SectionHeader>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 10,
                  marginTop: 4,
                }}
              >
                {Object.entries(fred).map(([label, v]) => {
                  if (!v || v.value == null) return null;
                  return (
                    <IndicatorTile
                      key={label}
                      label={label}
                      value={formatFredValue(label, v.value as number)}
                      yoy={v.yoy_pct ?? null}
                      asOf={v.date}
                    />
                  );
                })}
                {census.population != null && (
                  <IndicatorTile
                    label="Population"
                    value={formatNumber(census.population)}
                    source={census.vintage}
                  />
                )}
                {census.median_hh_income != null && (
                  <IndicatorTile
                    label="Median HH Income"
                    value={`$${formatNumber(census.median_hh_income)}`}
                    source={census.vintage}
                  />
                )}
                {census.median_home_value != null && (
                  <IndicatorTile
                    label="Median Home Value"
                    value={`$${formatNumber(census.median_home_value)}`}
                    source={census.vintage}
                  />
                )}
                {census.owner_occ_pct != null && (
                  <IndicatorTile
                    label="Owner-Occupied"
                    value={`${census.owner_occ_pct.toFixed(1)}%`}
                    source={census.vintage}
                  />
                )}
              </div>
            </Card>
          )}

          {/* Narrative sections — one card each, always expanded */}
          {sections.map((section, idx) => (
            <Card key={idx}>
              <SectionHeader>{section.title}</SectionHeader>
              <div
                style={{
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: 'var(--cui-body-color)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {section.content}
              </div>
            </Card>
          ))}

          {/* Empty state */}
          {sections.length === 0 && !summary && (
            <Card>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--cui-secondary-color)',
                  textAlign: 'center',
                  padding: '12px 8px',
                }}
              >
                No narrative generated. Check Anthropic API key and indicator availability.
              </div>
            </Card>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--cui-border-color)',
              fontSize: '11px',
              color: 'var(--cui-secondary-color)',
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

/* ─── Subcomponents ──────────────────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--cui-body-bg)',
        border: '1px solid var(--cui-border-color)',
        borderRadius: 8,
        padding: '18px 22px',
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: '15px',
        margin: '0 0 10px',
        paddingBottom: 6,
        color: 'var(--cui-success, var(--cui-primary))',
        borderBottom: '2px solid var(--cui-border-color)',
        fontWeight: 600,
        lineHeight: 1.3,
      }}
    >
      {children}
    </h2>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--cui-secondary-bg)',
        borderLeft: '3px solid var(--cui-success, var(--cui-primary))',
        padding: '10px 14px',
        borderRadius: 4,
        fontSize: '13px',
        lineHeight: 1.55,
        color: 'var(--cui-body-color)',
      }}
    >
      {children}
    </div>
  );
}

function Pill({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: muted
          ? 'var(--cui-secondary-bg)'
          : 'var(--cui-success, var(--cui-primary))',
        color: muted ? 'var(--cui-secondary-color)' : '#fff',
        padding: '2px 9px',
        borderRadius: 12,
        fontSize: '11px',
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

function IndicatorTile({
  label,
  value,
  yoy,
  asOf,
  source,
}: {
  label: string;
  value: string;
  yoy?: number | null;
  asOf?: string;
  source?: string;
}) {
  const yoyColor =
    yoy == null ? undefined : yoy >= 0 ? 'var(--cui-success)' : 'var(--cui-danger)';
  return (
    <div
      style={{
        padding: '8px 10px',
        border: '1px solid var(--cui-border-color)',
        borderRadius: 6,
        background: 'var(--cui-secondary-bg)',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: '10px',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
          color: 'var(--cui-secondary-color)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={label}
      >
        {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, marginTop: 2 }}>{value}</div>
      {yoy != null && (
        <div style={{ fontSize: '10px', color: yoyColor, marginTop: 1 }}>
          YoY {yoy >= 0 ? '+' : ''}
          {yoy.toFixed(1)}%
        </div>
      )}
      {asOf && (
        <div
          style={{
            fontSize: '9px',
            color: 'var(--cui-secondary-color)',
            marginTop: 1,
          }}
        >
          {asOf}
        </div>
      )}
      {source && !asOf && (
        <div
          style={{
            fontSize: '9px',
            color: 'var(--cui-secondary-color)',
            marginTop: 1,
          }}
        >
          {source}
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatFredValue(label: string, value: number): string {
  const l = label.toLowerCase();
  if (l.includes('rate') || l.includes('unemployment')) {
    return `${value.toFixed(1)}%`;
  }
  if (l.includes('cpi') || l.includes('index') || l.includes('case-shiller')) {
    return value.toFixed(1);
  }
  if (l.includes('starts')) {
    return `${value.toFixed(0)}K`;
  }
  if (Math.abs(value) >= 100)
    return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return value.toFixed(2);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
