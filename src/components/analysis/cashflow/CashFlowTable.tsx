/**
 * Cash Flow Table
 * Displays cash flow schedule in a scrollable table with sticky columns
 */

'use client';

import React, { useMemo } from 'react';
import type { AggregatedSchedule, AggregatedSection, AggregatedLineItem } from '@/lib/financial-engine/cashflow/aggregation';

interface Props {
  schedule: AggregatedSchedule;
  showLineItems?: boolean;
}

/**
 * Format currency for display
 */
function formatCurrency(value: number, compact: boolean = false): string {
  if (value === 0) return '$0';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (compact) {
    if (absValue >= 1000000) {
      return `${sign}$${(absValue / 1000000).toFixed(1)}M`;
    }
    if (absValue >= 1000) {
      return `${sign}$${(absValue / 1000).toFixed(0)}K`;
    }
  }

  return `${sign}$${Math.round(absValue).toLocaleString()}`;
}

/**
 * Get cell style based on value (positive/negative)
 */
function getCellStyle(value: number, isTotal: boolean = false): React.CSSProperties {
  const base: React.CSSProperties = {
    textAlign: 'right',
    padding: '6px 12px',
    fontVariantNumeric: 'tabular-nums',
    fontSize: '0.875rem',
  };

  if (isTotal) {
    base.fontWeight = 600;
    base.backgroundColor = 'var(--cui-tertiary-bg)';
  }

  if (value < 0) {
    base.color = 'var(--cui-danger)';
  } else if (value > 0) {
    base.color = 'var(--cui-success)';
  }

  return base;
}

/**
 * Section header row with inline subtotals
 * Shows phase name in first column with period totals across
 */
function SectionHeader({
  section,
  showTotals = false,
  useCompact = false,
}: {
  section: AggregatedSection;
  showTotals?: boolean;
  useCompact?: boolean;
}) {
  const isRevenue = section.sectionName.toLowerCase().includes('revenue');
  const bgColor = isRevenue ? 'var(--cui-success-bg-subtle)' : 'var(--cui-primary-bg-subtle)';
  const textColor = isRevenue ? 'var(--cui-success)' : 'var(--cui-primary)';

  // If not showing totals, use colspan for simple header
  if (!showTotals) {
    return (
      <tr style={{ backgroundColor: bgColor }}>
        <td
          colSpan={100}
          style={{
            fontWeight: 700,
            fontSize: '0.875rem',
            padding: '10px 12px',
            color: textColor,
            position: 'sticky',
            left: 0,
            backgroundColor: bgColor,
            zIndex: 1,
          }}
        >
          {section.sectionName}
        </td>
      </tr>
    );
  }

  // Show totals inline with header
  return (
    <tr style={{ backgroundColor: bgColor }}>
      <td
        style={{
          fontWeight: 700,
          fontSize: '0.875rem',
          padding: '10px 12px',
          color: textColor,
          position: 'sticky',
          left: 0,
          backgroundColor: bgColor,
          zIndex: 1,
          borderRight: '1px solid var(--cui-border-color)',
        }}
      >
        {section.sectionName}
      </td>
      {section.subtotals.map((value, idx) => (
        <td
          key={idx}
          style={{
            ...getCellStyle(value, true),
            backgroundColor: bgColor,
            color: textColor,
          }}
        >
          {formatCurrency(value, useCompact)}
        </td>
      ))}
      <td
        style={{
          ...getCellStyle(section.sectionTotal, true),
          backgroundColor: bgColor,
          color: textColor,
          fontWeight: 700,
        }}
      >
        {formatCurrency(section.sectionTotal, useCompact)}
      </td>
    </tr>
  );
}

/**
 * Stage row - shows stage subtotals (always visible in standard mode)
 */
function StageRow({
  item,
  useCompact,
}: {
  item: AggregatedLineItem;
  useCompact: boolean;
}) {
  return (
    <tr style={{ backgroundColor: 'var(--cui-light-bg-subtle)' }}>
      <td
        style={{
          padding: '8px 12px',
          paddingLeft: '24px',
          fontSize: '0.875rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          position: 'sticky',
          left: 0,
          backgroundColor: 'var(--cui-light-bg-subtle)',
          zIndex: 1,
          borderRight: '1px solid var(--cui-border-color)',
        }}
      >
        {item.description}
      </td>
      {item.values.map((value, idx) => (
        <td key={idx} style={{ ...getCellStyle(value), backgroundColor: 'var(--cui-light-bg-subtle)', fontWeight: 500 }}>
          {formatCurrency(value, useCompact)}
        </td>
      ))}
      <td style={{ ...getCellStyle(item.total, true), backgroundColor: 'var(--cui-light-bg-subtle)' }}>
        {formatCurrency(item.total, useCompact)}
      </td>
    </tr>
  );
}

/**
 * Category row - shows individual cost categories (detail view only)
 */
function CategoryRow({
  item,
  useCompact,
}: {
  item: AggregatedLineItem;
  useCompact: boolean;
}) {
  return (
    <tr>
      <td
        style={{
          padding: '6px 12px',
          paddingLeft: '48px',
          fontSize: '0.875rem',
          whiteSpace: 'nowrap',
          position: 'sticky',
          left: 0,
          backgroundColor: 'var(--cui-body-bg)',
          zIndex: 1,
          borderRight: '1px solid var(--cui-border-color)',
          color: 'var(--cui-secondary-color)',
        }}
      >
        {item.description}
      </td>
      {item.values.map((value, idx) => (
        <td key={idx} style={{ ...getCellStyle(value), fontSize: '0.8125rem' }}>
          {formatCurrency(value, useCompact)}
        </td>
      ))}
      <td style={{ ...getCellStyle(item.total, true), fontSize: '0.8125rem' }}>
        {formatCurrency(item.total, useCompact)}
      </td>
    </tr>
  );
}

/**
 * Line item row (legacy - for non-phase groupings)
 */
function LineItemRow({
  item,
  periodCount,
  useCompact,
}: {
  item: AggregatedLineItem;
  periodCount: number;
  useCompact: boolean;
}) {
  return (
    <tr>
      <td
        style={{
          padding: '6px 12px',
          paddingLeft: '24px',
          fontSize: '0.875rem',
          whiteSpace: 'nowrap',
          position: 'sticky',
          left: 0,
          backgroundColor: 'var(--cui-body-bg)',
          zIndex: 1,
          borderRight: '1px solid var(--cui-border-color)',
        }}
      >
        {item.description}
      </td>
      {item.values.map((value, idx) => (
        <td key={idx} style={getCellStyle(value)}>
          {formatCurrency(value, useCompact)}
        </td>
      ))}
      <td style={getCellStyle(item.total, true)}>{formatCurrency(item.total, useCompact)}</td>
    </tr>
  );
}

/**
 * Section subtotal row
 */
function SubtotalRow({
  section,
  useCompact,
}: {
  section: AggregatedSection;
  useCompact: boolean;
}) {
  const isRevenue = section.sectionName.toLowerCase().includes('revenue');

  return (
    <tr style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
      <td
        style={{
          padding: '8px 12px',
          fontWeight: 600,
          fontSize: '0.875rem',
          position: 'sticky',
          left: 0,
          backgroundColor: 'var(--cui-tertiary-bg)',
          zIndex: 1,
          borderRight: '1px solid var(--cui-border-color)',
        }}
      >
        Total {section.sectionName}
      </td>
      {section.subtotals.map((value, idx) => (
        <td key={idx} style={getCellStyle(value, true)}>
          {formatCurrency(value, useCompact)}
        </td>
      ))}
      <td
        style={{
          ...getCellStyle(section.sectionTotal, true),
          color: isRevenue ? 'var(--cui-success)' : 'var(--cui-primary)',
        }}
      >
        {formatCurrency(section.sectionTotal, useCompact)}
      </td>
    </tr>
  );
}

export default function CashFlowTable({ schedule, showLineItems = true }: Props) {
  const { periods, sections, summary } = schedule;

  // Use compact format when there are many periods
  const useCompact = periods.length > 6;

  // Check if we're in by_phase mode (any section has hierarchical items)
  // If so, ALL sections should show totals inline (including revenue)
  const isPhaseMode = useMemo(() => {
    return sections.some(section =>
      section.lineItems.some(item => item.childItems && item.childItems.length > 0)
    );
  }, [sections]);

  // Calculate net cash flow per period
  const netCashFlowPerPeriod = useMemo(() => {
    return periods.map((_, idx) => {
      let net = 0;
      sections.forEach((section) => {
        const isRevenue = section.sectionName.toLowerCase().includes('revenue');
        const value = section.subtotals[idx] || 0;
        net += isRevenue ? value : -value;
      });
      return net;
    });
  }, [sections, periods]);

  // Total net cash flow
  const totalNetCashFlow = netCashFlowPerPeriod.reduce((sum, val) => sum + val, 0);

  // Calculate cumulative cash flow
  const cumulativeCashFlow = useMemo(() => {
    let cumulative = 0;
    return netCashFlowPerPeriod.map((net) => {
      cumulative += net;
      return cumulative;
    });
  }, [netCashFlowPerPeriod]);

  if (!sections || sections.length === 0) {
    return (
      <div
        className="p-8 text-center rounded-lg border"
        style={{
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderColor: 'var(--cui-border-color)',
        }}
      >
        <p style={{ color: 'var(--cui-secondary-color)' }}>No cash flow data available</p>
      </div>
    );
  }

  return (
    <div
      className="overflow-auto border rounded-lg"
      style={{
        maxHeight: '600px',
        borderColor: 'var(--cui-border-color)',
      }}
    >
      <table
        className="w-full"
        style={{
          borderCollapse: 'collapse',
          fontSize: '0.875rem',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: 'var(--cui-body-bg)' }}>
            <th
              style={{
                padding: '10px 12px',
                fontWeight: 600,
                textAlign: 'left',
                position: 'sticky',
                top: 0,
                left: 0,
                zIndex: 3,
                backgroundColor: 'var(--cui-body-bg)',
                borderBottom: '2px solid var(--cui-border-color)',
                borderRight: '1px solid var(--cui-border-color)',
                minWidth: '200px',
              }}
            >
              Category
            </th>
            {periods.map((period, idx) => (
              <th
                key={idx}
                style={{
                  padding: '10px 12px',
                  fontWeight: 600,
                  textAlign: 'right',
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  backgroundColor: 'var(--cui-body-bg)',
                  borderBottom: '2px solid var(--cui-border-color)',
                  whiteSpace: 'nowrap',
                  minWidth: useCompact ? '80px' : '100px',
                }}
              >
                {period.label}
              </th>
            ))}
            <th
              style={{
                padding: '10px 12px',
                fontWeight: 700,
                textAlign: 'right',
                position: 'sticky',
                top: 0,
                zIndex: 2,
                backgroundColor: 'var(--cui-tertiary-bg)',
                borderBottom: '2px solid var(--cui-border-color)',
                minWidth: '100px',
              }}
            >
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => {
            // Check if this section has hierarchical line items
            const hasHierarchy = section.lineItems.some(item => item.childItems && item.childItems.length > 0);
            // In phase mode, all sections (including revenue) show totals inline
            const showTotalsInHeader = isPhaseMode;

            return (
              <React.Fragment key={section.sectionId}>
                {/* Section header - show totals inline in phase mode */}
                <SectionHeader
                  section={section}
                  showTotals={showTotalsInHeader}
                  useCompact={useCompact}
                />
                {/* Show line items based on hierarchy */}
                {section.lineItems.map((item) => (
                  <React.Fragment key={item.lineId}>
                    {/* Stage subtotal row - always visible for hierarchical items */}
                    {item.childItems && item.childItems.length > 0 ? (
                      <>
                        <StageRow item={item} useCompact={useCompact} />
                        {/* Category rows - only show when details enabled */}
                        {showLineItems &&
                          item.childItems.map((childItem) => (
                            <CategoryRow
                              key={childItem.lineId}
                              item={childItem}
                              useCompact={useCompact}
                            />
                          ))}
                      </>
                    ) : (
                      /* Non-hierarchical line item - show when details enabled OR not in phase mode */
                      (!isPhaseMode || showLineItems) && (
                        <LineItemRow
                          item={item}
                          periodCount={periods.length}
                          useCompact={useCompact}
                        />
                      )
                    )}
                  </React.Fragment>
                ))}
                {/* Only show subtotal row when NOT in phase mode */}
                {!isPhaseMode && <SubtotalRow section={section} useCompact={useCompact} />}
              </React.Fragment>
            );
          })}

          {/* Net Cash Flow row */}
          <tr style={{ backgroundColor: 'var(--cui-dark-bg-subtle)' }}>
            <td
              style={{
                padding: '10px 12px',
                fontWeight: 700,
                fontSize: '0.875rem',
                position: 'sticky',
                left: 0,
                backgroundColor: 'var(--cui-dark-bg-subtle)',
                zIndex: 1,
                borderRight: '1px solid var(--cui-border-color)',
                borderTop: '2px solid var(--cui-border-color)',
              }}
            >
              NET CASH FLOW
            </td>
            {netCashFlowPerPeriod.map((value, idx) => (
              <td
                key={idx}
                style={{
                  ...getCellStyle(value, true),
                  backgroundColor: 'var(--cui-dark-bg-subtle)',
                  borderTop: '2px solid var(--cui-border-color)',
                }}
              >
                {formatCurrency(value, useCompact)}
              </td>
            ))}
            <td
              style={{
                ...getCellStyle(totalNetCashFlow, true),
                backgroundColor: 'var(--cui-dark-bg-subtle)',
                borderTop: '2px solid var(--cui-border-color)',
                fontWeight: 700,
              }}
            >
              {formatCurrency(totalNetCashFlow, useCompact)}
            </td>
          </tr>

          {/* Cumulative Cash Flow row */}
          <tr style={{ backgroundColor: 'var(--cui-body-bg)' }}>
            <td
              style={{
                padding: '10px 12px',
                fontWeight: 600,
                fontSize: '0.875rem',
                fontStyle: 'italic',
                position: 'sticky',
                left: 0,
                backgroundColor: 'var(--cui-body-bg)',
                zIndex: 1,
                borderRight: '1px solid var(--cui-border-color)',
              }}
            >
              Cumulative
            </td>
            {cumulativeCashFlow.map((value, idx) => (
              <td key={idx} style={{ ...getCellStyle(value), fontStyle: 'italic' }}>
                {formatCurrency(value, useCompact)}
              </td>
            ))}
            <td style={{ ...getCellStyle(totalNetCashFlow), fontStyle: 'italic', fontWeight: 600 }}>
              {formatCurrency(totalNetCashFlow, useCompact)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
