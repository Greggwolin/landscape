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
 * Sections are expandable accordion-style. Key indicators shown above the
 * narrative. Create-project CTA only appears when project_ready = true.
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

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: 'var(--w-text-primary, var(--cui-body-color))',
        background: 'var(--w-bg-primary, var(--cui-body-bg))',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--cui-border-color)',
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.2 }}>
            {location_display}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--w-text-tertiary, var(--cui-tertiary-color))',
              marginTop: 2,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <span>{property_type_label}</span>
            <span>·</span>
            <span style={{ textTransform: 'capitalize' }}>{depth}</span>
            <span>·</span>
            <span>as of {data_as_of}</span>
            {cached && (
              <>
                <span>·</span>
                <span style={{ opacity: 0.7 }}>cached</span>
              </>
            )}
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

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* Executive summary */}
        {summary && (
          <div
            style={{
              padding: '12px',
              background: 'var(--cui-secondary-bg)',
              borderRadius: 4,
              fontSize: '13px',
              lineHeight: 1.5,
              marginBottom: 16,
              borderLeft: '3px solid var(--cui-primary)',
            }}
          >
            {summary}
          </div>
        )}

        {/* Project creation CTA */}
        {project_ready && <CreateProjectCTA config={config} />}

        {/* Key indicators */}
        {(Object.keys(fred).length > 0 || Object.keys(census).length > 0) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--w-text-tertiary, var(--cui-tertiary-color))', marginBottom: 6 }}>
              Key Indicators
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 8,
              }}
            >
              {Object.entries(fred).map(([label, v]) => {
                if (!v || v.value === null) return null;
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
          </div>
        )}

        {/* Narrative sections */}
        {sections.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sections.map((section, idx) => (
              <BriefSection
                key={idx}
                title={section.title}
                content={section.content}
                defaultOpen={idx < 2}
              />
            ))}
          </div>
        )}

        {sections.length === 0 && !summary && (
          <div style={{ fontSize: '13px', color: 'var(--w-text-muted, var(--cui-secondary-color))', textAlign: 'center', padding: '32px 16px' }}>
            No narrative generated. Check Anthropic API key and indicator availability.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────

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
        borderRadius: 4,
        background: 'var(--cui-body-bg)',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: '10px',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
          color: 'var(--w-text-tertiary, var(--cui-tertiary-color))',
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
          YoY {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%
        </div>
      )}
      {asOf && (
        <div style={{ fontSize: '9px', color: 'var(--w-text-tertiary, var(--cui-tertiary-color))', marginTop: 1 }}>
          {asOf}
        </div>
      )}
      {source && !asOf && (
        <div style={{ fontSize: '9px', color: 'var(--w-text-tertiary, var(--cui-tertiary-color))', marginTop: 1 }}>
          {source}
        </div>
      )}
    </div>
  );
}

function BriefSection({
  title,
  content,
  defaultOpen = false,
}: {
  title: string;
  content: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div
      style={{
        border: '1px solid var(--cui-border-color)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'var(--cui-secondary-bg)',
          border: 'none',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--cui-body-color)',
          textAlign: 'left',
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: '10px', opacity: 0.6 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div
          style={{
            padding: '10px 12px',
            fontSize: '12.5px',
            lineHeight: 1.55,
            color: 'var(--cui-body-color)',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatFredValue(label: string, value: number): string {
  // Basic heuristics by label content
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
  if (Math.abs(value) >= 100) return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return value.toFixed(2);
}
