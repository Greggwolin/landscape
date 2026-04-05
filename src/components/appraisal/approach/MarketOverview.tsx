/**
 * MarketOverview
 *
 * Enriched market overview with MF market data, supply pipeline,
 * cap rate survey, and narrative link.
 *
 * @version 1.1
 * @created 2026-04-04
 * @updated 2026-04-05 — Enriched from flat KPI list to grouped sections
 */

'use client';

import React from 'react';
import type { DetailId } from '../appraisal.types';
import { EconIndicators } from '../shared/EconIndicators';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

const MF_MARKET = [
  { geo: 'Vacancy rate', value: '4.8%', change: '-0.4%', direction: 'neg' as const },
  { geo: 'Avg asking rent', value: '$1,340', change: '+3.2%', direction: 'pos' as const },
  { geo: 'Rent growth', value: '+3.2%', change: '', direction: 'pos' as const },
  { geo: 'Absorption', value: '4,200', change: '', direction: 'pos' as const },
  { geo: 'Inventory', value: '48,600', change: '', direction: 'flat' as const },
];

const SUPPLY_PIPELINE = [
  { geo: 'MF permits', value: '3,840', change: '', direction: 'flat' as const },
  { geo: 'Under construction', value: '2,100', change: '', direction: 'flat' as const },
  { geo: 'Pipeline as % of stock', value: '4.3%', change: '', direction: 'flat' as const },
];

const CAP_RATE = [
  { geo: 'Median cap rate', value: '5.1%', change: '', direction: 'flat' as const },
  { geo: 'CBRE Q4 2025 range', value: '4.75–5.50%', change: '', direction: 'flat' as const },
  { geo: '1990s vintage', value: '~5.25%', change: '', direction: 'flat' as const },
];

export function MarketOverview({ onOpenDetail }: Props) {
  return (
    <>
      <EconIndicators title="Multifamily Market — South Bay" rows={MF_MARKET} />
      <EconIndicators title="Supply Pipeline" rows={SUPPLY_PIPELINE} />
      <EconIndicators title="Cap Rate Survey" rows={CAP_RATE} />

      {/* View narrative link */}
      <div
        className="econ-narrative-link"
        onClick={() => onOpenDetail('narrative', 'Location & Market Narrative')}
      >
        <span>📝</span>
        <span>View narrative ↗</span>
      </div>
    </>
  );
}
