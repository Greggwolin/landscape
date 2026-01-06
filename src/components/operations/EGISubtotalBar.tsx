'use client';

import React from 'react';
import { formatCurrency } from './types';

interface EGISubtotalBarProps {
  asIsEGI: number;
  postRenoEGI: number;
  valueAddEnabled: boolean;
  availableScenarios: string[];
  evidenceExpanded?: boolean;
}

/**
 * EGISubtotalBar - Displays Effective Gross Income subtotal
 *
 * EGI = Net Rental Income + Total Other Income
 * Shown between Other Income section and Operating Expenses section.
 */
export function EGISubtotalBar({
  asIsEGI,
  postRenoEGI,
  valueAddEnabled,
  availableScenarios,
  evidenceExpanded = false
}: EGISubtotalBarProps) {
  // Calculate extra columns for evidence
  const extraScenarioCount = evidenceExpanded ? availableScenarios.length - 1 : 0;

  return (
    <div className="ops-egi-card">
      <table className="ops-table">
        <tbody>
          <tr className="ops-subtotal-row" style={{ border: 'none' }}>
            <td style={{ width: '18%', fontSize: '13px' }}>
              <b>Effective Gross Income</b>
            </td>
            <td className="num" style={{ width: '6%' }}></td>
            <td className="num" style={{ width: '9%' }}></td>
            <td className="num" style={{ width: '7%' }}></td>
            <td className="num" style={{ width: '10%', fontSize: '13px' }}>
              <b>{formatCurrency(asIsEGI)}</b>
            </td>
            <td className="num" style={{ width: '8%' }}></td>
            {valueAddEnabled && (
              <>
                <td className="num post-reno" style={{ width: '9%' }}></td>
                <td className="num post-reno" style={{ width: '10%', fontSize: '13px' }}>
                  <b>{formatCurrency(postRenoEGI)}</b>
                </td>
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

export default EGISubtotalBar;
