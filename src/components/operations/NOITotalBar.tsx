'use client';

import React from 'react';
import { formatCurrency } from './types';

interface NOITotalBarProps {
  asIsNOI: number;
  postRenoNOI: number;
  valueAddEnabled: boolean;
  availableScenarios: string[];
  evidenceExpanded?: boolean;
}

/**
 * NOITotalBar - Displays Net Operating Income total
 *
 * NOI = EGI - Total Operating Expenses
 * Shown at the bottom of the P&L, highlighted with accent color.
 */
export function NOITotalBar({
  asIsNOI,
  postRenoNOI,
  valueAddEnabled,
  availableScenarios,
  evidenceExpanded = false
}: NOITotalBarProps) {
  // Calculate extra columns for evidence
  const extraScenarioCount = evidenceExpanded ? availableScenarios.length - 1 : 0;

  return (
    <div className="ops-noi-card">
      <table className="ops-table">
        <tbody>
          <tr className="ops-grand-total">
            <td style={{ width: '18%' }}>Net Operating Income</td>
            <td className="num" style={{ width: '6%' }}></td>
            <td className="num" style={{ width: '9%' }}></td>
            <td className="num" style={{ width: '7%' }}></td>
            <td className="num" style={{ width: '10%' }}>{formatCurrency(asIsNOI)}</td>
            <td className="num" style={{ width: '8%' }}></td>
            {valueAddEnabled && (
              <>
                <td className="num post-reno" style={{ width: '9%' }}></td>
                <td className="num post-reno" style={{ width: '10%' }}>{formatCurrency(postRenoNOI)}</td>
              </>
            )}
            {availableScenarios.length > 0 && (
              <td className="num evidence" style={{ width: '8%' }}></td>
            )}
            {evidenceExpanded && Array(extraScenarioCount).fill(0).map((_, i) => (
              <td key={i} className="num evidence" style={{ width: '8%' }}></td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default NOITotalBar;
