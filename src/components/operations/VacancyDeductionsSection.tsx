'use client';

import React, { useState } from 'react';
import { SectionCard } from './SectionCard';
import { InputCell } from './InputCell';
import { EvidenceCell } from './EvidenceCell';
import { AddButton } from './AddButton';
import { LineItemRow, formatCurrency } from './types';

interface VacancyDeductionsSectionProps {
  rows: LineItemRow[];
  grossPotentialRent: number;
  availableScenarios: string[];
  preferredScenario: string;
  valueAddEnabled: boolean;
  onUpdateRow: (lineItemKey: string, field: string, value: number | null) => void;
  onAddItem?: () => void;
}

/**
 * VacancyDeductionsSection - Flat table for vacancy and deductions
 *
 * Displays deduction types (Physical Vacancy, Credit Loss, Concessions, etc.)
 * with rate %, amount, and evidence. Shows Net Rental Income subtotal.
 */
export function VacancyDeductionsSection({
  rows,
  grossPotentialRent,
  availableScenarios,
  preferredScenario,
  valueAddEnabled,
  onUpdateRow,
  onAddItem
}: VacancyDeductionsSectionProps) {
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);

  // Calculate totals (all deductions are negative)
  const totals = rows.reduce(
    (acc, row) => ({
      as_is_total: acc.as_is_total + (row.as_is.total || 0),
      post_reno_total: acc.post_reno_total + (row.post_reno?.total || 0)
    }),
    { as_is_total: 0, post_reno_total: 0 }
  );

  // Net Rental Income = GPR - Total Deductions
  const netRentalIncomeAsIs = grossPotentialRent + totals.as_is_total; // totals are negative
  const netRentalIncomePostReno = grossPotentialRent + totals.post_reno_total;

  // Determine if there are extra scenarios beyond the preferred one
  const hasExtraScenarios = availableScenarios.length > 1;
  const extraScenarios = availableScenarios.filter(s => s !== preferredScenario);

  const controls = (
    <>
      {onAddItem && <AddButton label="Add" onClick={onAddItem} />}
    </>
  );

  return (
    <SectionCard
      title="Vacancy & Deductions"
      controls={controls}
      evidenceExpanded={evidenceExpanded}
    >
      <table className="ops-table">
        <thead>
          <tr>
            <th style={{ width: '18%' }}>Deduction</th>
            <th className="num" style={{ width: '6%' }}>Count</th>
            <th className="num" style={{ width: '9%' }}>Rate</th>
            <th className="num" style={{ width: '7%' }}>—</th>
            <th className="num" style={{ width: '10%' }}>Amount</th>
            <th className="num" style={{ width: '8%' }}>—</th>
            {valueAddEnabled && (
              <>
                <th className="num post-reno" style={{ width: '9%' }}>Post-Reno</th>
                <th className="num post-reno" style={{ width: '10%' }}>Reno Amt</th>
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
          {rows.map((row) => {
            // Calculate amount from rate if it's a percentage
            const isPercentage = row.is_percentage;
            const asIsAmount = row.as_is.total;
            const postRenoAmount = row.post_reno?.total;

            return (
              <tr key={row.line_item_key}>
                <td>{row.label}</td>
                <td className="num">{row.as_is.count ?? '—'}</td>
                <td className="num">
                  <InputCell
                    value={row.as_is.rate}
                    variant="as-is"
                    format={isPercentage ? 'percent' : 'currency'}
                    onChange={(val) => onUpdateRow(row.line_item_key, 'as_is_rate', val)}
                  />
                </td>
                <td className="num">—</td>
                <td className={`num ops-calc ${asIsAmount && asIsAmount < 0 ? 'ops-negative' : ''}`}>
                  {asIsAmount ? `(${formatCurrency(Math.abs(asIsAmount))})` : '—'}
                </td>
                <td className="num">—</td>
                {valueAddEnabled && (
                  <>
                    <td className="num post-reno">
                      <InputCell
                        value={row.post_reno?.rate}
                        variant="post-reno"
                        format={isPercentage ? 'percent' : 'currency'}
                        onChange={(val) => onUpdateRow(row.line_item_key, 'post_reno_rate', val)}
                      />
                    </td>
                    <td className={`num post-reno ops-calc ${postRenoAmount && postRenoAmount < 0 ? 'ops-negative' : ''}`}>
                      {postRenoAmount ? `(${formatCurrency(Math.abs(postRenoAmount))})` : '—'}
                    </td>
                  </>
                )}
                {availableScenarios.length > 0 && (
                  <td className="num evidence ops-evidence-group">
                    <EvidenceCell
                      value={row.evidence[preferredScenario]?.rate}
                      format={isPercentage ? 'percent' : 'currency'}
                    />
                  </td>
                )}
                {evidenceExpanded && extraScenarios.map(scenario => (
                  <td key={scenario} className="num evidence ops-evidence-extra">
                    <EvidenceCell
                      value={row.evidence[scenario]?.rate}
                      format={isPercentage ? 'percent' : 'currency'}
                    />
                  </td>
                ))}
              </tr>
            );
          })}

          {/* Subtotal Row - Net Rental Income */}
          <tr className="ops-subtotal-row">
            <td>Net Rental Income</td>
            <td className="num"></td>
            <td className="num"></td>
            <td className="num"></td>
            <td className="num">{formatCurrency(netRentalIncomeAsIs)}</td>
            <td className="num"></td>
            {valueAddEnabled && (
              <>
                <td className="num post-reno"></td>
                <td className="num post-reno">{formatCurrency(netRentalIncomePostReno)}</td>
              </>
            )}
            {availableScenarios.length > 0 && (
              <td className="num evidence ops-evidence-group"></td>
            )}
            {evidenceExpanded && extraScenarios.map(scenario => (
              <td key={scenario} className="num evidence ops-evidence-extra"></td>
            ))}
          </tr>
        </tbody>
      </table>
    </SectionCard>
  );
}

export default VacancyDeductionsSection;
