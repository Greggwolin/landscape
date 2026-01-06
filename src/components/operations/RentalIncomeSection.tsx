'use client';

import React, { useState } from 'react';
import { SectionCard } from './SectionCard';
import { InputCell } from './InputCell';
import { EvidenceCell } from './EvidenceCell';
import { GrowthBadge } from './GrowthBadge';
import { AddButton } from './AddButton';
import {
  LineItemRow,
  RENTAL_INCOME_COLUMNS,
  formatCurrency,
  formatPerSF
} from './types';

interface RentalIncomeSectionProps {
  rows: LineItemRow[];
  unitCount: number;
  availableScenarios: string[];
  preferredScenario: string;
  valueAddEnabled: boolean;
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
  unitCount,
  availableScenarios,
  preferredScenario,
  valueAddEnabled,
  onUpdateRow,
  onAddItem
}: RentalIncomeSectionProps) {
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);

  // Calculate totals
  const totals = rows.reduce(
    (acc, row) => ({
      as_is_total: acc.as_is_total + (row.as_is.total || 0),
      post_reno_total: acc.post_reno_total + (row.post_reno?.total || 0),
      count: acc.count + (row.as_is.count || 0)
    }),
    { as_is_total: 0, post_reno_total: 0, count: 0 }
  );

  // Calculate weighted average rates
  const avgAsIsRate = totals.count > 0 ? (totals.as_is_total / 12) / totals.count : 0;
  const avgPostRenoRate = totals.count > 0 ? (totals.post_reno_total / 12) / totals.count : 0;

  // Determine if there are extra scenarios beyond the preferred one
  const hasExtraScenarios = availableScenarios.length > 1;
  const extraScenarios = availableScenarios.filter(s => s !== preferredScenario);

  const controls = (
    <>
      {onAddItem && <AddButton label="Add Unit Type" onClick={onAddItem} />}
    </>
  );

  return (
    <SectionCard
      title="Rental Income"
      controls={controls}
      evidenceExpanded={evidenceExpanded}
    >
      <table className="ops-table">
        <thead>
          <tr>
            <th style={{ width: '18%' }}>Unit Type</th>
            <th className="num" style={{ width: '6%' }}>Count</th>
            <th className="num" style={{ width: '9%' }}>Rate/Mo</th>
            <th className="num" style={{ width: '7%' }}>$/SF</th>
            <th className="num" style={{ width: '10%' }}>Total</th>
            <th className="num" style={{ width: '8%' }}>Growth</th>
            {valueAddEnabled && (
              <>
                <th className="num post-reno" style={{ width: '9%' }}>Post-Reno</th>
                <th className="num post-reno" style={{ width: '10%' }}>Reno Total</th>
              </>
            )}
            {availableScenarios.length > 0 && (
              <th
                className={`num evidence ops-evidence-group ${evidenceExpanded ? 'expanded' : ''}`}
                style={{ width: '8%' }}
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
                style={{ width: '8%' }}
              >
                {scenario.replace('_', ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.line_item_key}>
              <td>{row.label}</td>
              <td className="num">{row.as_is.count ?? '—'}</td>
              <td className="num">
                <InputCell
                  value={row.as_is.rate}
                  variant="as-is"
                  format="currency"
                  onChange={(val) => onUpdateRow(row.line_item_key, 'as_is_rate', val)}
                />
              </td>
              <td className="num ops-calc">{formatPerSF(row.as_is.per_sf)}</td>
              <td className="num ops-calc">{formatCurrency(row.as_is.total)}</td>
              <td className="num">
                <GrowthBadge
                  value={row.as_is.growth_rate}
                  type={row.as_is.growth_type || 'global'}
                />
              </td>
              {valueAddEnabled && (
                <>
                  <td className="num post-reno">
                    <InputCell
                      value={row.post_reno?.rate}
                      variant="post-reno"
                      format="currency"
                      onChange={(val) => onUpdateRow(row.line_item_key, 'post_reno_rate', val)}
                    />
                  </td>
                  <td className="num post-reno ops-calc">
                    {formatCurrency(row.post_reno?.total)}
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
          ))}

          {/* Subtotal Row */}
          <tr className="ops-subtotal-row">
            <td>Potential Rental Income</td>
            <td className="num">{totals.count}</td>
            <td className="num ops-calc">{formatCurrency(avgAsIsRate)}</td>
            <td className="num ops-calc">—</td>
            <td className="num">{formatCurrency(totals.as_is_total)}</td>
            <td className="num"></td>
            {valueAddEnabled && (
              <>
                <td className="num post-reno ops-calc">{formatCurrency(avgPostRenoRate)}</td>
                <td className="num post-reno">{formatCurrency(totals.post_reno_total)}</td>
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
