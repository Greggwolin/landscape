/**
 * PropertyLocation
 *
 * Location pill view under the Property tab.
 * Map accordion + Economy accordion with EconIndicators.
 *
 * @version 1.1
 * @created 2026-04-05
 * @updated 2026-04-05 — Inline styles → CSS classes
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
        <div className="map-placeholder">
          <div className="map-pin">📍</div>
          <div className="map-address">14105 Chadron Ave, Hawthorne CA</div>
          <div className="map-grid-overlay" />
        </div>
        {/* Map mode toggles */}
        <div className="map-toggle-row">
          {['Satellite', 'Street', 'Comps'].map((mode) => (
            <button
              key={mode}
              className={`map-toggle-btn${mode === 'Street' ? ' active' : ''}`}
            >
              {mode}
            </button>
          ))}
          <div className="appraisal-flex-spacer" />
          <span className="map-link">Open full map →</span>
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
