'use client';

import React, { useState } from 'react';
import { SectionCard } from './SectionCard';
import { DetailSummaryToggle, ViewMode } from './DetailSummaryToggle';
import { InputCell } from './InputCell';
import { EvidenceCell } from './EvidenceCell';
import { GrowthBadge, FeeBadge } from './GrowthBadge';
import { AddButton } from './AddButton';
import { LineItemRow, formatCurrency, formatPerSF } from './types';

interface OperatingExpensesSectionProps {
  rows: LineItemRow[];
  unitCount: number;
  totalSF: number;
  availableScenarios: string[];
  preferredScenario: string;
  valueAddEnabled: boolean;
  onUpdateRow: (lineItemKey: string, field: string, value: number | null) => void;
  onAddItem?: (parentKey?: string) => void;
  onToggleExpand?: (lineItemKey: string) => void;
}

/**
 * OperatingExpensesSection - Hierarchical table for operating expenses
 *
 * Shows parent categories (Taxes, Insurance, Utilities, R&M, Management, Other)
 * with expandable child items. Uses CoA hierarchy (5100-5900 series).
 */
export function OperatingExpensesSection({
  rows,
  unitCount,
  totalSF,
  availableScenarios,
  preferredScenario,
  valueAddEnabled,
  onUpdateRow,
  onAddItem,
  onToggleExpand
}: OperatingExpensesSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('detail');
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);

  // Calculate totals (expenses are positive in input, displayed as negative)
  // Recursively sum leaf rows (children) since top-level rows are parent categories
  const sumRowsRecursive = (items: LineItemRow[]): { as_is_total: number; post_reno_total: number } => {
    return items.reduce(
      (acc, row) => {
        // If row has children, sum the children instead
        if (row.children && row.children.length > 0) {
          const childTotals = sumRowsRecursive(row.children);
          return {
            as_is_total: acc.as_is_total + childTotals.as_is_total,
            post_reno_total: acc.post_reno_total + childTotals.post_reno_total
          };
        }
        // Leaf row - add its total
        return {
          as_is_total: acc.as_is_total + (row.as_is?.total || 0),
          post_reno_total: acc.post_reno_total + (row.post_reno?.total || 0)
        };
      },
      { as_is_total: 0, post_reno_total: 0 }
    );
  };

  const totals = sumRowsRecursive(rows);

  // Calculate per-unit totals
  const asIsPerUnit = unitCount > 0 ? totals.as_is_total / unitCount : 0;
  const postRenoPerUnit = unitCount > 0 ? totals.post_reno_total / unitCount : 0;
  const asIsPerSF = totalSF > 0 ? totals.as_is_total / totalSF : 0;
  const postRenoPerSF = totalSF > 0 ? totals.post_reno_total / totalSF : 0;

  // Determine if there are extra scenarios beyond the preferred one
  const hasExtraScenarios = availableScenarios.length > 1;
  const extraScenarios = availableScenarios.filter(s => s !== preferredScenario);

  // Flatten hierarchical rows for display with unique keys
  // In summary mode, show parent categories collapsed (with totals)
  // In detail mode, show parent categories with their expanded children
  const flattenRows = (items: LineItemRow[], parentKey = ''): Array<LineItemRow & { _uniqueKey: string }> => {
    const result: Array<LineItemRow & { _uniqueKey: string }> = [];
    items.forEach((row, idx) => {
      const uniqueKey = parentKey ? `${parentKey}_${row.line_item_key}_${idx}` : `${row.line_item_key}_${idx}`;

      // In summary mode, show parent rows collapsed (with totals)
      if (viewMode === 'summary') {
        if (row.is_calculated) {
          // Parent row - show it collapsed with totals
          result.push({ ...row, _uniqueKey: uniqueKey, is_expanded: false });
        }
        // Don't show children in summary mode
        return;
      }

      // Detail mode - show all rows with normal expansion
      result.push({ ...row, _uniqueKey: uniqueKey });
      if (row.children && row.is_expanded !== false) {
        result.push(...flattenRows(row.children, uniqueKey));
      }
    });
    return result;
  };

  const displayRows = flattenRows(rows);

  const controls = (
    <DetailSummaryToggle value={viewMode} onChange={setViewMode} />
  );

  // Check if row is a percentage-based item (like management fee)
  const isPercentageBased = (row: LineItemRow) => {
    return row.is_percentage || row.calculation_base === 'egi';
  };

  return (
    <SectionCard
      title="Operating Expenses"
      controls={controls}
      evidenceExpanded={evidenceExpanded}
    >
      <table className="ops-table">
        <thead>
          <tr>
            <th style={{ width: '18%' }}>Expense Category</th>
            <th className="num" style={{ width: '6%' }}>Count</th>
            <th className="num" style={{ width: '9%' }}>$/Unit</th>
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
          {displayRows.map((row) => {
            const isParent = row.is_calculated;
            const isPercent = isPercentageBased(row);
            const rowClass = isParent ? 'ops-parent-row' : (row.level > 0 ? 'ops-child-row' : '');

            // Calculate per-unit and per-SF for this row
            const rowPerUnit = unitCount > 0 && row.as_is.total
              ? row.as_is.total / unitCount
              : row.as_is.rate;
            const rowPerSF = totalSF > 0 && row.as_is.total
              ? row.as_is.total / totalSF
              : null;
            const postRenoRowPerUnit = unitCount > 0 && row.post_reno?.total
              ? row.post_reno.total / unitCount
              : row.post_reno?.rate;

            // Parent rows only show totals when collapsed
            const isCollapsed = row.is_expanded === false;
            const showParentTotals = isParent && isCollapsed;

            return (
              <tr key={row._uniqueKey} className={rowClass}>
                <td>
                  {isParent && (
                    <>
                      <span
                        className={`ops-expand-icon ${isCollapsed ? 'collapsed' : ''}`}
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
                <td className="num">{isPercent ? '—' : (isParent && !isCollapsed ? '' : (unitCount || '—'))}</td>
                <td className="num">
                  {isParent ? (
                    showParentTotals ? (
                      <span className="ops-calc">{formatCurrency(rowPerUnit)}</span>
                    ) : null
                  ) : isPercent ? (
                    <InputCell
                      value={row.as_is.rate}
                      variant="as-is"
                      format="percent"
                      onChange={(val) => onUpdateRow(row.line_item_key, 'as_is_rate', val)}
                    />
                  ) : (
                    <InputCell
                      value={row.as_is.rate ?? rowPerUnit}
                      variant="as-is"
                      format="currency"
                      onChange={(val) => onUpdateRow(row.line_item_key, 'as_is_rate', val)}
                    />
                  )}
                </td>
                <td className="num ops-calc">
                  {isPercent ? '—' : (isParent && !isCollapsed ? '' : formatPerSF(rowPerSF))}
                </td>
                <td className="num ops-calc">
                  {isParent && !isCollapsed ? '' : formatCurrency(row.as_is.total)}
                </td>
                <td className="num">
                  {!isParent && (
                    isPercent ? (
                      <FeeBadge label="% of EGI" />
                    ) : (
                      <GrowthBadge
                        value={row.as_is.growth_rate}
                        type={row.as_is.growth_type || 'global'}
                      />
                    )
                  )}
                </td>
                {valueAddEnabled && (
                  <>
                    <td className="num post-reno">
                      {isParent ? (
                        showParentTotals ? (
                          <span className="ops-calc">{formatCurrency(postRenoRowPerUnit)}</span>
                        ) : null
                      ) : isPercent ? (
                        <InputCell
                          value={row.post_reno?.rate}
                          variant="post-reno"
                          format="percent"
                          onChange={(val) => onUpdateRow(row.line_item_key, 'post_reno_rate', val)}
                        />
                      ) : (
                        <InputCell
                          value={row.post_reno?.rate ?? postRenoRowPerUnit}
                          variant="post-reno"
                          format="currency"
                          onChange={(val) => onUpdateRow(row.line_item_key, 'post_reno_rate', val)}
                        />
                      )}
                    </td>
                    <td className="num post-reno ops-calc">
                      {isParent && !isCollapsed ? '' : formatCurrency(row.post_reno?.total)}
                    </td>
                  </>
                )}
                {availableScenarios.length > 0 && (
                  <td className="num evidence ops-evidence-group">
                    <EvidenceCell
                      value={isPercent
                        ? row.evidence[preferredScenario]?.rate
                        : row.evidence[preferredScenario]?.per_unit
                      }
                      format={isPercent ? 'percent' : 'per_unit'}
                    />
                  </td>
                )}
                {evidenceExpanded && extraScenarios.map(scenario => (
                  <td key={scenario} className="num evidence ops-evidence-extra">
                    <EvidenceCell
                      value={isPercent
                        ? row.evidence[scenario]?.rate
                        : row.evidence[scenario]?.per_unit
                      }
                      format={isPercent ? 'percent' : 'per_unit'}
                    />
                  </td>
                ))}
              </tr>
            );
          })}

          {/* Subtotal Row */}
          <tr className="ops-subtotal-row">
            <td>Total Operating Expenses</td>
            <td className="num">{unitCount}</td>
            <td className="num ops-calc">{formatCurrency(asIsPerUnit)}</td>
            <td className="num ops-calc">{formatPerSF(asIsPerSF)}</td>
            <td className="num ops-negative">({formatCurrency(totals.as_is_total)})</td>
            <td className="num"></td>
            {valueAddEnabled && (
              <>
                <td className="num post-reno ops-calc">{formatCurrency(postRenoPerUnit)}</td>
                <td className="num post-reno ops-negative">({formatCurrency(totals.post_reno_total)})</td>
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

export default OperatingExpensesSection;
