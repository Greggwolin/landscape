/**
 * AdjustmentMatrix Component
 *
 * Displays a collapsible table showing all adjustments applied to comparables
 */

'use client';

import { useState } from 'react';
import type { SalesComparable } from '@/types/valuation';
import { LandscapeButton } from '@/components/ui/landscape';

interface AdjustmentMatrixProps {
  comparables: SalesComparable[];
}

export function AdjustmentMatrix({ comparables }: AdjustmentMatrixProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatPercent = (value: number | null | undefined) => {
    if (!value) return '0.0%';
    const pct = Number(value) * 100;
    return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '$0';
    return `$${Number(value).toLocaleString()}`;
  };

  // Get all unique adjustment types across all comparables
  const adjustmentTypes = new Set<string>();
  comparables.forEach(comp => {
    comp.adjustments?.forEach(adj => {
      adjustmentTypes.add(adj.adjustment_type_display);
    });
  });

  const adjustmentTypesList = Array.from(adjustmentTypes);

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)'
      }}
    >
      {/* Header */}
      <LandscapeButton
        variant="ghost"
        color="secondary"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between"
        style={{
          backgroundColor: 'var(--cui-tertiary-bg)'
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-lg font-semibold"
            style={{ color: 'var(--cui-body-color)' }}
          >
            Adjustment Matrix
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--cui-card-bg)',
              color: 'var(--cui-secondary-color)'
            }}
          >
            {adjustmentTypesList.length} adjustment types
          </span>
        </div>
        <svg
          className="transition-transform"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            fill: 'var(--cui-body-color)'
          }}
          width="20"
          height="20"
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </LandscapeButton>

      {/* Content */}
      {isExpanded && (
        <div className="p-5">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b"
                  style={{ borderColor: 'var(--cui-border-color)' }}
                >
                  <th
                    className="text-left py-3 px-3 font-semibold"
                    style={{ color: 'var(--cui-body-color)' }}
                  >
                    Adjustment Type
                  </th>
                  {comparables.map((comp) => (
                    <th
                      key={comp.comparable_id}
                      className="text-center py-3 px-3 font-semibold"
                      style={{ color: 'var(--cui-body-color)' }}
                    >
                      Comp #{comp.comp_number}
                      <div
                        className="text-xs font-normal mt-1"
                        style={{ color: 'var(--cui-secondary-color)' }}
                      >
                        {comp.property_name}
                      </div>
                    </th>
                  ))}
                  <th
                    className="text-center py-3 px-3 font-semibold"
                    style={{ color: 'var(--cui-body-color)' }}
                  >
                    Subject
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Base Price/Unit Row */}
                <tr
                  className="border-b"
                  style={{
                    backgroundColor: 'var(--cui-tertiary-bg)',
                    borderColor: 'var(--cui-border-color)'
                  }}
                >
                  <td
                    className="py-3 px-3 font-medium"
                    style={{ color: 'var(--cui-body-color)' }}
                  >
                    Base Price/Unit
                  </td>
                  {comparables.map((comp) => (
                    <td
                      key={comp.comparable_id}
                      className="text-center py-3 px-3"
                      style={{ color: 'var(--cui-body-color)' }}
                    >
                      {formatCurrency(comp.price_per_unit ? Number(comp.price_per_unit) : null)}
                    </td>
                  ))}
                  <td
                    className="text-center py-3 px-3"
                    style={{ color: 'var(--cui-secondary-color)' }}
                  >
                    -
                  </td>
                </tr>

                {/* Adjustment Rows */}
                {adjustmentTypesList.map((adjustmentType) => (
                  <tr
                    key={adjustmentType}
                    className="border-b"
                    style={{ borderColor: 'var(--cui-border-color)' }}
                  >
                    <td
                      className="py-3 px-3"
                      style={{ color: 'var(--cui-body-color)' }}
                    >
                      {adjustmentType}
                    </td>
                    {comparables.map((comp) => {
                      const adjustment = comp.adjustments?.find(
                        (adj) => adj.adjustment_type_display === adjustmentType
                      );
                      return (
                        <td
                          key={comp.comparable_id}
                          className="text-center py-3 px-3"
                          style={{
                            color: adjustment
                              ? Number(adjustment.adjustment_pct) < 0
                                ? 'var(--cui-danger)'
                                : 'var(--cui-success)'
                              : 'var(--cui-secondary-color)'
                          }}
                        >
                          {adjustment
                            ? formatPercent(adjustment.adjustment_pct ? Number(adjustment.adjustment_pct) : null)
                            : '-'}
                          {adjustment && adjustment.justification && (
                            <div
                              className="text-xs mt-1"
                              style={{ color: 'var(--cui-secondary-color)' }}
                              title={adjustment.justification}
                            >
                              {adjustment.justification.substring(0, 30)}
                              {adjustment.justification.length > 30 ? '...' : ''}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td
                      className="text-center py-3 px-3"
                      style={{ color: 'var(--cui-secondary-color)' }}
                    >
                      -
                    </td>
                  </tr>
                ))}

                {/* Total Adjustments Row */}
                <tr
                  className="border-b"
                  style={{
                    backgroundColor: 'var(--cui-tertiary-bg)',
                    borderColor: 'var(--cui-border-color)'
                  }}
                >
                  <td
                    className="py-3 px-3 font-semibold"
                    style={{ color: 'var(--cui-body-color)' }}
                  >
                    Total Adjustments
                  </td>
                  {comparables.map((comp) => (
                    <td
                      key={comp.comparable_id}
                      className="text-center py-3 px-3 font-semibold"
                      style={{
                        color:
                          comp.total_adjustment_pct < 0
                            ? 'var(--cui-danger)'
                            : comp.total_adjustment_pct > 0
                            ? 'var(--cui-success)'
                            : 'var(--cui-body-color)'
                      }}
                    >
                      {formatPercent(comp.total_adjustment_pct)}
                    </td>
                  ))}
                  <td
                    className="text-center py-3 px-3"
                    style={{ color: 'var(--cui-secondary-color)' }}
                  >
                    -
                  </td>
                </tr>

                {/* Adjusted Price/Unit Row */}
                <tr
                  style={{
                    backgroundColor: 'var(--cui-success-bg)',
                  }}
                >
                  <td
                    className="py-3 px-3 font-bold"
                    style={{ color: 'var(--cui-body-color)' }}
                  >
                    Adjusted Price/Unit
                  </td>
                  {comparables.map((comp) => (
                    <td
                      key={comp.comparable_id}
                      className="text-center py-3 px-3 font-bold"
                      style={{ color: 'var(--cui-body-color)' }}
                    >
                      {formatCurrency(comp.adjusted_price_per_unit ? Number(comp.adjusted_price_per_unit) : null)}
                    </td>
                  ))}
                  <td
                    className="text-center py-3 px-3"
                    style={{ color: 'var(--cui-secondary-color)' }}
                  >
                    -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div
            className="mt-4 p-3 rounded text-xs"
            style={{
              backgroundColor: 'var(--cui-tertiary-bg)',
              color: 'var(--cui-secondary-color)'
            }}
          >
            <strong style={{ color: 'var(--cui-body-color)' }}>Note:</strong> Negative
            adjustments (red) indicate the comparable is superior to the subject in that category.
            Positive adjustments (green) indicate the comparable is inferior.
          </div>
        </div>
      )}
    </div>
  );
}
