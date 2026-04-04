/**
 * ApproachSummary
 *
 * Router for approach summary views. Renders the correct view
 * based on the active pill ID.
 *
 * @version 1.0
 * @created 2026-04-04
 */

'use client';

import React from 'react';
import type { DetailId } from '../appraisal.types';

// Income views
import { IncomeProforma } from './IncomeProforma';
import { IncomeUnitMix } from './IncomeUnitMix';
import { IncomeExpenses } from './IncomeExpenses';
import { IncomeOtherIncome } from './IncomeOtherIncome';
import { IncomeDCF } from './IncomeDCF';

// Property views
import { PropertySummary } from './PropertySummary';
import { PropertySite } from './PropertySite';
import { PropertyImprovements } from './PropertyImprovements';

// Market views
import { MarketOverview } from './MarketOverview';
import { MarketSupply } from './MarketSupply';
import { MarketEconomic } from './MarketEconomic';

// Sales views
import { SalesComps } from './SalesComps';
import { SalesAdjustments } from './SalesAdjustments';
import { SalesConclusion } from './SalesConclusion';

// Cost views
import { CostSummary } from './CostSummary';
import { CostLandValue } from './CostLandValue';
import { CostReplacement } from './CostReplacement';
import { CostDepreciation } from './CostDepreciation';

// Reconciliation
import { ReconciliationSummary } from './ReconciliationSummary';

interface ApproachSummaryProps {
  activePill: string;
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

const VIEW_MAP: Record<string, React.FC<{ onOpenDetail: (id: DetailId | string, label?: string) => void }>> = {
  // Income
  'income-proforma': IncomeProforma,
  'income-unitmix': IncomeUnitMix,
  'income-expenses': IncomeExpenses,
  'income-otherinc': IncomeOtherIncome,
  'income-dcf': IncomeDCF,
  // Property
  'property-summary': PropertySummary,
  'property-site': PropertySite,
  'property-improvements': PropertyImprovements,
  // Market
  'market-overview': MarketOverview,
  'market-supply': MarketSupply,
  'market-econ': MarketEconomic,
  // Sales
  'sales-comps': SalesComps,
  'sales-adjustments': SalesAdjustments,
  'sales-conclusion': SalesConclusion,
  // Cost
  'cost-summary': CostSummary,
  'cost-land': CostLandValue,
  'cost-replacement': CostReplacement,
  'cost-depreciation': CostDepreciation,
  // Reconciliation
  'reconciliation-summary': ReconciliationSummary,
  'reconciliation-narrative': ReconciliationSummary, // Same component, different mode (future)
};

export function ApproachSummary({ activePill, onOpenDetail }: ApproachSummaryProps) {
  const ViewComponent = VIEW_MAP[activePill];

  if (!ViewComponent) {
    return (
      <div style={{ fontSize: 11, color: 'var(--cui-tertiary-color)', padding: '20px 0', textAlign: 'center' }}>
        Select a view from the pills above.
      </div>
    );
  }

  return <ViewComponent onOpenDetail={onOpenDetail} />;
}
