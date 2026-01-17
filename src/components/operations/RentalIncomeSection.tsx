'use client';

import React, { useState } from 'react';
import { SectionCard } from './SectionCard';
import { DetailSummaryToggle, ViewMode } from './DetailSummaryToggle';
import { EvidenceCell } from './EvidenceCell';
import { GrowthBadge } from './GrowthBadge';
import { AddButton } from './AddButton';
import { LockClosedIcon } from '@heroicons/react/20/solid';
import {
  LineItemRow,
  formatCurrency,
  formatPerSF
} from './types';

interface RentalIncomeSectionProps {
  rows: LineItemRow[];
  unitCount: number;
  availableScenarios: string[];
  preferredScenario: string;
  valueAddEnabled: boolean;
  rentPremiumPct?: number;
  hasDetailedRentRoll?: boolean;
  onUpdateRow: (lineItemKey: string, field: string, value: number | null) => void;
  onAddItem?: () => void;
}

/**
 * RentalIncomeSection - Flat table for rental income by unit type
 *
 * Displays unit types with count, rate/mo, $/SF, total, growth, and evidence.
 * Includes subtotal row for Potential Rental Income.
 */
export function RentalIncomeSection({
  rows,
  unitCount: _unitCount,
  availableScenarios,
  preferredScenario,
  valueAddEnabled,
  rentPremiumPct,
  hasDetailedRentRoll = false,
  onUpdateRow: _onUpdateRow,
  onAddItem
}: RentalIncomeSectionProps) {
  // Mark unused props (kept for API compatibility)
  void _unitCount;
  void _onUpdateRow;
  const [viewMode, setViewMode] = useState<ViewMode>('detail');
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);

  const roundToNearest5 = (value: number): number => Math.round(value / 5) * 5;
  const usePremiumCalc = valueAddEnabled && rentPremiumPct !== undefined && rentPremiumPct !== null;

  // Calculate totals for both current and market rent
  const totals = rows.reduce(
    (acc, row) => {
      const count = row.as_is.count || 0;
      const currentRate = row.as_is.rate || 0;
      const marketRate = row.as_is.market_rate || currentRate;
      const currentTotal = row.as_is.total || 0;
      const marketTotal = row.as_is.market_total || currentTotal;
      const postRenoRate = usePremiumCalc
        ? roundToNearest5(currentRate * (1 + rentPremiumPct))
        : (row.post_reno?.rate || marketRate);
      const postRenoTotal = usePremiumCalc
        ? postRenoRate * count * 12
        : (row.post_reno?.total || marketTotal);

      return {
        current_total: acc.current_total + currentTotal,
        market_total: acc.market_total + marketTotal,
        post_reno_total: acc.post_reno_total + postRenoTotal,
        count: acc.count + count
      };
    },
    { current_total: 0, market_total: 0, post_reno_total: 0, count: 0 }
  );

  // Calculate weighted average rates
  const avgCurrentRate = totals.count > 0 ? (totals.current_total / 12) / totals.count : 0;
  const avgMarketRate = totals.count > 0 ? (totals.market_total / 12) / totals.count : 0;
  const avgPostRenoRate = totals.count > 0 ? (totals.post_reno_total / 12) / totals.count : 0;

  // Determine if there are extra scenarios beyond the preferred one
  const hasExtraScenarios = availableScenarios.length > 1;
  const extraScenarios = availableScenarios.filter(s => s !== preferredScenario);

  const controls = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {onAddItem && <AddButton label="Add Unit Type" onClick={onAddItem} />}
      <DetailSummaryToggle value={viewMode} onChange={setViewMode} />
    </div>
  );

  return (
    <SectionCard
      title="Rental Income"
      controls={controls}
      evidenceExpanded={evidenceExpanded}
    >
      {/* Source indicator for read-only rental income */}
      <div className="flex items-center gap-1 mb-2 text-xs text-gray-500">
        <LockClosedIcon className="w-3 h-3" />
        <span>from {hasDetailedRentRoll ? 'Rent Roll' : 'Floor Plan Matrix'}</span>
      </div>
      <table className="ops-table">
        <thead>
          <tr>
            <th style={{ width: '14%' }}>Unit Type</th>
            <th className="num" style={{ width: '5%' }}>Count</th>
            <th className="num" style={{ width: '8%' }}>Current Rent</th>
            <th className="num" style={{ width: '6%' }}>$/SF</th>
            <th className="num" style={{ width: '9%' }}>Current Total</th>
            <th className="num" style={{ width: '8%' }}>Market Rent</th>
            <th className="num" style={{ width: '9%' }}>Market Total</th>
            <th className="num" style={{ width: '6%' }}>Growth</th>
            {valueAddEnabled && (
              <>
                <th className="num post-reno" style={{ width: '8%' }}>Post-Reno Rent</th>
                <th className="num post-reno" style={{ width: '6%' }}>Rent/SF (Post)</th>
                <th className="num post-reno" style={{ width: '9%' }}>Reno Total</th>
              </>
            )}
            {availableScenarios.length > 0 && (
              <th
                className={`num evidence ops-evidence-group ${evidenceExpanded ? 'expanded' : ''}`}
                style={{ width: '7%' }}
                onClick={() => setEvidenceExpanded(!evidenceExpanded)}
              >
                {preferredScenario.replace('_', ' ')}
                {hasExtraScenarios && <span className="chevron">▶</span>}
              </th>
            )}
            {evidenceExpanded && extraScenarios.map(scenario => (
              <th
                key={scenario}
                className="num evidence ops-evidence-extra"
                style={{ width: '7%' }}
              >
                {scenario.replace('_', ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {viewMode === 'detail' && rows.map((row) => {
            const currentRate = row.as_is.rate || 0;
            const marketRate = row.as_is.market_rate || currentRate;
            const currentTotal = row.as_is.total || 0;
            const marketTotal = row.as_is.market_total || currentTotal;
            const postRenoRate = usePremiumCalc
              ? roundToNearest5(currentRate * (1 + rentPremiumPct))
              : (row.post_reno?.rate || marketRate);
            const postRenoTotal = usePremiumCalc
              ? postRenoRate * (row.as_is.count || 0) * 12
              : (row.post_reno?.total || marketTotal);
            const avgUnitSf = row.as_is.per_sf && currentRate
              ? currentRate / row.as_is.per_sf
              : null;
            const postRenoPerSf = avgUnitSf ? postRenoRate / avgUnitSf : null;

            return (
              <tr key={row.line_item_key}>
                <td>{row.label}</td>
                <td className="num">{row.as_is.count ?? '—'}</td>
                {/* Current Rent - Read-only */}
                <td className="num ops-calc">
                  <span className="text-sm font-medium">{formatCurrency(currentRate)}</span>
                </td>
                <td className="num ops-calc">{formatPerSF(row.as_is.per_sf)}</td>
                <td className="num ops-calc">{formatCurrency(currentTotal)}</td>
                {/* Market Rent - Read-only */}
                <td className="num ops-calc">
                  <span className="text-sm font-medium">{formatCurrency(marketRate)}</span>
                </td>
                <td className="num ops-calc">{formatCurrency(marketTotal)}</td>
                <td className="num">
                  <GrowthBadge
                    value={row.as_is.growth_rate}
                    type={row.as_is.growth_type || 'global'}
                  />
                </td>
                {valueAddEnabled && (
                  <>
                    <td className="num post-reno ops-calc">
                      {formatCurrency(postRenoRate)}
                    </td>
                    <td className="num post-reno ops-calc">
                      {formatPerSF(postRenoPerSf)}
                    </td>
                    <td className="num post-reno ops-calc">
                      {formatCurrency(postRenoTotal)}
                    </td>
                  </>
                )}
                {availableScenarios.length > 0 && (
                  <td className="num evidence ops-evidence-group">
                    <EvidenceCell
                      value={row.evidence[preferredScenario]?.per_unit}
                      format="currency"
                    />
                  </td>
                )}
                {evidenceExpanded && extraScenarios.map(scenario => (
                  <td key={scenario} className="num evidence ops-evidence-extra">
                    <EvidenceCell
                      value={row.evidence[scenario]?.per_unit}
                      format="currency"
                    />
                  </td>
                ))}
              </tr>
            );
          })}

          {/* Subtotal Row - always visible */}
          <tr className="ops-subtotal-row">
            <td>Potential Rental Income</td>
            <td className="num">{totals.count}</td>
            {/* Current Rent Subtotals */}
            <td className="num">
              <span className="ops-subtotal-value">{formatCurrency(avgCurrentRate)}</span>
            </td>
            <td className="num ops-calc">—</td>
            <td className="num ops-calc">{formatCurrency(totals.current_total)}</td>
            {/* Market Rent Subtotals */}
            <td className="num">
              <span className="ops-subtotal-value">{formatCurrency(avgMarketRate)}</span>
            </td>
            <td className="num ops-calc">{formatCurrency(totals.market_total)}</td>
            <td className="num"></td>
            {valueAddEnabled && (
              <>
                <td className="num post-reno">
                  <span className="ops-subtotal-value">{formatCurrency(avgPostRenoRate)}</span>
                </td>
                <td className="num post-reno ops-calc">—</td>
                <td className="num post-reno ops-calc">{formatCurrency(totals.post_reno_total)}</td>
              </>
            )}
            {availableScenarios.length > 0 && (
              <td className="num evidence ops-evidence-group">—</td>
            )}
            {evidenceExpanded && extraScenarios.map(scenario => (
              <td key={scenario} className="num evidence ops-evidence-extra">—</td>
            ))}
          </tr>
        </tbody>
      </table>
    </SectionCard>
  );
}

export default RentalIncomeSection;
