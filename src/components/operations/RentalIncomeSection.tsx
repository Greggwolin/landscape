'use client';

import React, { useState } from 'react';
import { SectionCard } from './SectionCard';
import { DetailSummaryToggle, ViewMode } from './DetailSummaryToggle';
import { AddButton } from './AddButton';
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
 * Displays unit types with count, current rent, $/SF, annual total, and loss to lease.
 * Includes subtotal row for Potential Rental Income.
 */
export function RentalIncomeSection({
  rows,
  unitCount: _unitCount,
  availableScenarios: _availableScenarios,
  preferredScenario: _preferredScenario,
  valueAddEnabled,
  rentPremiumPct,
  hasDetailedRentRoll = false,
  onUpdateRow: _onUpdateRow,
  onAddItem
}: RentalIncomeSectionProps) {
  // Mark unused props (kept for API compatibility)
  void _unitCount;
  void _onUpdateRow;
  void _availableScenarios;
  void _preferredScenario;
  const [viewMode, setViewMode] = useState<ViewMode>('detail');

  const roundToNearest5 = (value: number): number => Math.round(value / 5) * 5;
  const usePremiumCalc = valueAddEnabled && rentPremiumPct !== undefined && rentPremiumPct !== null;

  // Calculate totals for current rent, market rent (for LTL calc), and loss to lease
  const totals = rows.reduce(
    (acc, row) => {
      const count = row.as_is.count || 0;
      const currentRate = row.as_is.rate || 0;
      const marketRate = row.as_is.market_rate || currentRate;
      const currentTotal = row.as_is.total || 0;
      const marketTotal = row.as_is.market_total || currentTotal;
      // Loss to Lease = (Market Annual - Current Annual) per unit type
      const lossToLease = marketTotal - currentTotal;
      const postRenoRate = usePremiumCalc
        ? roundToNearest5(currentRate * (1 + rentPremiumPct))
        : (row.post_reno?.rate || marketRate);
      const postRenoTotal = usePremiumCalc
        ? postRenoRate * count * 12
        : (row.post_reno?.total || marketTotal);

      return {
        current_total: acc.current_total + currentTotal,
        market_total: acc.market_total + marketTotal,
        loss_to_lease: acc.loss_to_lease + lossToLease,
        post_reno_total: acc.post_reno_total + postRenoTotal,
        count: acc.count + count
      };
    },
    { current_total: 0, market_total: 0, loss_to_lease: 0, post_reno_total: 0, count: 0 }
  );

  // Calculate weighted average rates
  const avgCurrentRate = totals.count > 0 ? (totals.current_total / 12) / totals.count : 0;
  const avgPostRenoRate = totals.count > 0 ? (totals.post_reno_total / 12) / totals.count : 0;

  const controls = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {onAddItem && <AddButton label="Add Unit Type" onClick={onAddItem} />}
      <DetailSummaryToggle value={viewMode} onChange={setViewMode} />
    </div>
  );

  // Subtitle shows source of data
  const subtitle = hasDetailedRentRoll ? 'from Rent Roll' : 'from Floor Plan Matrix';

  return (
    <SectionCard
      title="Rental Income"
      subtitle={subtitle}
      controls={controls}
    >
      <table className="ops-table">
        <thead>
          <tr>
            <th style={{ width: '18%' }}>Unit Type</th>
            <th className="num" style={{ width: '8%' }}>Count</th>
            <th className="num" style={{ width: '12%' }}>Current</th>
            <th className="num" style={{ width: '10%' }}>$/SF</th>
            <th className="num" style={{ width: '14%' }}>Annual</th>
            <th className="num" style={{ width: '14%' }}>Loss to Lease</th>
            {valueAddEnabled && (
              <>
                <th className="num post-reno" style={{ width: '12%' }}>Post-Reno Rent</th>
                <th className="num post-reno" style={{ width: '12%' }}>Reno Total</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {viewMode === 'detail' && rows.map((row) => {
            const currentRate = row.as_is.rate || 0;
            const marketRate = row.as_is.market_rate || currentRate;
            const currentTotal = row.as_is.total || 0;
            const marketTotal = row.as_is.market_total || currentTotal;
            // Loss to Lease = Market Annual - Current Annual for this unit type
            const lossToLease = marketTotal - currentTotal;
            const postRenoRate = usePremiumCalc
              ? roundToNearest5(currentRate * (1 + rentPremiumPct))
              : (row.post_reno?.rate || marketRate);
            const postRenoTotal = usePremiumCalc
              ? postRenoRate * (row.as_is.count || 0) * 12
              : (row.post_reno?.total || marketTotal);

            return (
              <tr key={row.line_item_key}>
                <td>{row.label}</td>
                <td className="num">{row.as_is.count ?? '—'}</td>
                <td className="num ops-calc">
                  <span className="text-sm font-medium">{formatCurrency(currentRate)}</span>
                </td>
                <td className="num ops-calc">{formatPerSF(row.as_is.per_sf)}</td>
                <td className="num ops-calc">{formatCurrency(currentTotal)}</td>
                <td className={`num ops-calc ${lossToLease > 0 ? 'ops-loss-to-lease' : ''}`}>
                  {lossToLease > 0 ? formatCurrency(lossToLease) : '—'}
                </td>
                {valueAddEnabled && (
                  <>
                    <td className="num post-reno ops-calc">
                      {formatCurrency(postRenoRate)}
                    </td>
                    <td className="num post-reno ops-calc">
                      {formatCurrency(postRenoTotal)}
                    </td>
                  </>
                )}
              </tr>
            );
          })}

          {/* Subtotal Row - always visible */}
          <tr className="ops-subtotal-row">
            <td>Potential Rental Income</td>
            <td className="num">{totals.count}</td>
            <td className="num">
              <span className="ops-subtotal-value">{formatCurrency(avgCurrentRate)}</span>
            </td>
            <td className="num ops-calc">—</td>
            <td className="num ops-calc">{formatCurrency(totals.current_total)}</td>
            <td className={`num ops-calc ${totals.loss_to_lease > 0 ? 'ops-loss-to-lease' : ''}`}>
              {totals.loss_to_lease > 0 ? formatCurrency(totals.loss_to_lease) : '—'}
            </td>
            {valueAddEnabled && (
              <>
                <td className="num post-reno">
                  <span className="ops-subtotal-value">{formatCurrency(avgPostRenoRate)}</span>
                </td>
                <td className="num post-reno ops-calc">{formatCurrency(totals.post_reno_total)}</td>
              </>
            )}
          </tr>
        </tbody>
      </table>
    </SectionCard>
  );
}

export default RentalIncomeSection;
