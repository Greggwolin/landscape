'use client';

import React, { useState } from 'react';
import { SectionCard } from './SectionCard';
import { DetailSummaryToggle, ViewMode } from './DetailSummaryToggle';
import { InputCell } from './InputCell';
import { EvidenceCell } from './EvidenceCell';
import { GrowthBadge } from './GrowthBadge';
import { AddButton } from './AddButton';
import { LineItemRow, formatCurrency } from './types';

interface OtherIncomeSectionProps {
  rows: LineItemRow[];
  unitCount: number;
  availableScenarios: string[];
  preferredScenario: string;
  valueAddEnabled: boolean;
  onUpdateRow: (lineItemKey: string, field: string, value: number | null) => void;
  onAddItem?: (parentKey?: string) => void;
  onToggleExpand?: (lineItemKey: string) => void;
}

/**
 * OtherIncomeSection - Hierarchical table for other income categories
 *
 * Shows parent categories (Utility Reimbursements, Amenity Income, Fees & Charges)
 * with expandable child items. Supports Detail/Summary view toggle.
 */
export function OtherIncomeSection({
  rows,
  unitCount,
  availableScenarios,
  preferredScenario,
  valueAddEnabled,
  onUpdateRow,
  onAddItem,
  onToggleExpand
}: OtherIncomeSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('detail');
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);

  // Calculate totals
  const totals = rows.reduce(
    (acc, row) => {
      // Only count leaf rows (not parents)
      if (!row.is_calculated) {
        return {
          as_is_total: acc.as_is_total + (row.as_is.total || 0),
          post_reno_total: acc.post_reno_total + (row.post_reno?.total || 0)
        };
      }
      return acc;
    },
    { as_is_total: 0, post_reno_total: 0 }
  );

  // Determine if there are extra scenarios beyond the preferred one
  const hasExtraScenarios = availableScenarios.length > 1;
  const extraScenarios = availableScenarios.filter(s => s !== preferredScenario);

  // Filter rows based on view mode
  const visibleRows = viewMode === 'summary'
    ? rows.filter(row => !row.is_calculated) // Only leaf items
    : rows; // All rows including parents

  // Flatten hierarchical rows for display with unique keys
  const flattenRows = (items: LineItemRow[], parentKey = ''): Array<LineItemRow & { _uniqueKey: string }> => {
    const result: Array<LineItemRow & { _uniqueKey: string }> = [];
    items.forEach((row, idx) => {
      const uniqueKey = parentKey ? `${parentKey}_${row.line_item_key}_${idx}` : `${row.line_item_key}_${idx}`;
      result.push({ ...row, _uniqueKey: uniqueKey });
      if (row.children && row.is_expanded !== false && viewMode === 'detail') {
        result.push(...flattenRows(row.children, uniqueKey));
      }
    });
    return result;
  };

  const displayRows = flattenRows(visibleRows);

  const controls = (
    <DetailSummaryToggle value={viewMode} onChange={setViewMode} />
  );

  return (
    <SectionCard
      title="Other Income"
      controls={controls}
      evidenceExpanded={evidenceExpanded}
    >
      <table className="ops-table">
        <thead>
          <tr>
            <th style={{ width: '18%' }}>Income Category</th>
            <th className="num" style={{ width: '6%' }}>Count</th>
            <th className="num" style={{ width: '9%' }}>Rate/Mo</th>
            <th className="num" style={{ width: '7%' }}>—</th>
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
          {displayRows.map((row) => {
            const isParent = row.is_calculated;
            const rowClass = isParent ? 'ops-parent-row' : (row.level > 0 ? 'ops-child-row' : '');

            return (
              <tr key={row._uniqueKey} className={rowClass}>
                <td>
                  {isParent && (
                    <>
                      <span
                        className={`ops-expand-icon ${row.is_expanded === false ? 'collapsed' : ''}`}
                        onClick={() => onToggleExpand?.(row.line_item_key)}
                      >
                        ▼
                      </span>
                      {row.label}
                      {onAddItem && (
                        <AddButton
                          label="Add"
                          onClick={() => onAddItem(row.line_item_key)}
                          inline
                        />
                      )}
                    </>
                  )}
                  {!isParent && row.label}
                </td>
                <td className="num">{row.as_is.count ?? '—'}</td>
                <td className="num">
                  {isParent ? (
                    <span className="ops-calc">—</span>
                  ) : (
                    <InputCell
                      value={row.as_is.rate}
                      variant="as-is"
                      format="currency"
                      onChange={(val) => onUpdateRow(row.line_item_key, 'as_is_rate', val)}
                    />
                  )}
                </td>
                <td className="num">—</td>
                <td className={`num ${isParent ? 'ops-calc' : 'ops-calc'}`}>
                  {formatCurrency(row.as_is.total)}
                </td>
                <td className="num">
                  {!isParent && (
                    <GrowthBadge
                      value={row.as_is.growth_rate}
                      type={row.as_is.growth_type || 'global'}
                    />
                  )}
                </td>
                {valueAddEnabled && (
                  <>
                    <td className="num post-reno">
                      {isParent ? (
                        <span className="ops-calc"></span>
                      ) : (
                        <InputCell
                          value={row.post_reno?.rate}
                          variant="post-reno"
                          format="currency"
                          onChange={(val) => onUpdateRow(row.line_item_key, 'post_reno_rate', val)}
                        />
                      )}
                    </td>
                    <td className="num post-reno ops-calc">
                      {formatCurrency(row.post_reno?.total)}
                    </td>
                  </>
                )}
                {availableScenarios.length > 0 && (
                  <td className="num evidence ops-evidence-group">
                    <EvidenceCell
                      value={row.evidence[preferredScenario]?.total}
                      format="currency"
                    />
                  </td>
                )}
                {evidenceExpanded && extraScenarios.map(scenario => (
                  <td key={scenario} className="num evidence ops-evidence-extra">
                    <EvidenceCell
                      value={row.evidence[scenario]?.total}
                      format="currency"
                    />
                  </td>
                ))}
              </tr>
            );
          })}

          {/* Subtotal Row */}
          <tr className="ops-subtotal-row">
            <td>Total Other Income</td>
            <td className="num"></td>
            <td className="num"></td>
            <td className="num"></td>
            <td className="num">{formatCurrency(totals.as_is_total)}</td>
            <td className="num"></td>
            {valueAddEnabled && (
              <>
                <td className="num post-reno"></td>
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

export default OtherIncomeSection;
