/**
 * PropertyLocation
 *
 * Location pill view under the Property tab.
 * Map accordion + Economy accordion with EconIndicators.
 *
 * @version 1.0
 * @created 2026-04-05
 */

'use client';

import React from 'react';
import type { DetailId } from '../appraisal.types';
import { AccordionSection } from '../shared/AccordionSection';
import { EconIndicators } from '../shared/EconIndicators';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

const POPULATION = [
  { geo: 'United States', value: '340.21M', change: '+0.9%', direction: 'pos' as const },
  { geo: 'California', value: '39.43M', change: '+0.6%', direction: 'pos' as const },
  { geo: 'LA-LB-Ana MSA', value: '12.93M', change: '+0.3%', direction: 'pos' as const },
  { geo: 'Los Angeles Co', value: '9.76M', change: '+0.3%', direction: 'pos' as const },
  { geo: 'Hawthorne city', value: '158.4k', change: '+1.8%', direction: 'pos' as const },
];

const EMPLOYMENT = [
  { geo: 'United States', value: '158.47M', change: '+0.1%', direction: 'pos' as const },
  { geo: 'California', value: '18.02M', change: '-0.1%', direction: 'neg' as const },
  { geo: 'LA-LB-Ana MSA', value: '6.36M', change: '-0.1%', direction: 'neg' as const },
  { geo: 'Los Angeles Co', value: '5.15M', change: '+1.1%', direction: 'pos' as const },
];

const UNEMPLOYMENT = [
  { geo: 'United States', value: '4.1%', change: '+7.9%', direction: 'pos' as const },
  { geo: 'California', value: '5.5%', change: '0.0%', direction: 'flat' as const },
  { geo: 'LA-LB-Ana MSA', value: '5.5%', change: '-1.8%', direction: 'neg' as const },
  { geo: 'Los Angeles Co', value: '5.0%', change: '-12.3%', direction: 'neg' as const },
];

const MEDIAN_HH_INCOME = [
  { geo: 'United States', value: '$83.7k', change: '+3.9%', direction: 'pos' as const },
  { geo: 'California', value: '$100.6k', change: '+11.9%', direction: 'pos' as const },
  { geo: 'Los Angeles Co', value: '$76.4k', change: '+4.2%', direction: 'pos' as const },
  { geo: 'Hawthorne city', value: '$72.4k', change: '+2.8%', direction: 'pos' as const },
];

export function PropertyLocation({ onOpenDetail }: Props) {
  return (
    <>
      {/* Map accordion */}
      <AccordionSection title="Map" defaultOpen={true}>
        <div
          style={{
            height: 180,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--cui-tertiary-bg) 0%, var(--cui-secondary-bg) 100%)',
            border: '1px solid var(--cui-border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 20, marginBottom: 4, opacity: 0.3 }}>📍</div>
          <div style={{ fontSize: 10, color: 'var(--cui-tertiary-color)' }}>
            14105 Chadron Ave, Hawthorne CA
          </div>
          {/* Fake grid overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(var(--cui-border-color) 1px, transparent 1px), linear-gradient(90deg, var(--cui-border-color) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              opacity: 0.08,
              pointerEvents: 'none',
            }}
          />
        </div>
        {/* Map mode toggles */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          {['Satellite', 'Street', 'Comps'].map((mode) => (
            <button
              key={mode}
              style={{
                fontSize: 9,
                padding: '3px 8px',
                borderRadius: 4,
                border: '1px solid var(--cui-border-color)',
                background: mode === 'Street' ? 'color-mix(in srgb, var(--cui-primary) 15%, transparent)' : 'transparent',
                color: mode === 'Street' ? 'var(--cui-primary)' : 'var(--cui-tertiary-color)',
                cursor: 'pointer',
              }}
            >
              {mode}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 9, color: 'var(--cui-primary)', cursor: 'pointer' }}>
            Open full map →
          </span>
        </div>
      </AccordionSection>

      {/* Economy accordion */}
      <AccordionSection title="Economy" defaultOpen={true}>
        <EconIndicators title="Population" rows={POPULATION} />
        <EconIndicators title="Employment" rows={EMPLOYMENT} />
        <EconIndicators title="Unemployment Rate" rows={UNEMPLOYMENT} />
        <EconIndicators title="Median HH Income" rows={MEDIAN_HH_INCOME} />

        {/* View narrative link */}
        <div
          className="econ-narrative-link"
          onClick={() => onOpenDetail('narrative', 'Location & Market Narrative')}
        >
          <span>📝</span>
          <span>View narrative ↗</span>
        </div>
      </AccordionSection>
    </>
  );
}
