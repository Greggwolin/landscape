/**
 * Cash Flow Table
 * Simple project cash flow statement
 * - Time periods as columns
 * - Categories as rows
 * - Full number formatting ($39,372,000)
 * - No collapsible sections, no colored fonts
 */

'use client';

import React, { useMemo } from 'react';
import { CTable } from '@coreui/react';
import type { AggregatedSchedule } from '@/lib/financial-engine/cashflow/aggregation';

interface Props {
  schedule: AggregatedSchedule;
}

// Indentation levels (in pixels)
const INDENT = {
  SECTION_HEADER: 12,
  LINE_ITEM: 24,
};

// Column widths
const DEFAULT_LABEL_WIDTH = 200;
const DEFAULT_DATA_WIDTH = 120;

// Check if we're in "overall" mode (single period that is the total)
function isOverallMode(schedule: AggregatedSchedule): boolean {
  return schedule.periods.length === 1 && schedule.periods[0].label === 'Total';
}

/**
 * Format currency - full numbers ($39,372,000)
 * Negative values shown in parentheses: ($39,372,000)
 */
function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const rounded = Math.round(absValue);

  if (rounded === 0) return '-';

  const formatted = `$${rounded.toLocaleString()}`;

  if (value < 0) {
    return `(${formatted})`;
  }

  return formatted;
}

// ============================================================================
// TABLE ROW COMPONENTS
// ============================================================================

interface DataRowProps {
  label: string;
  values: number[];
  total: number;
  hideTotal?: boolean;
  indent?: boolean;
  bold?: boolean;
  bottomBorder?: boolean; // Line below this row (accounting-style underline before totals)
}

function DataRow({
  label,
  values,
  total,
  hideTotal = false,
  indent = false,
  bold = false,
  bottomBorder = false,
}: DataRowProps) {
  const textDecoration = bottomBorder ? 'underline' : undefined;

  return (
    <tr>
      <td
        style={{
          paddingLeft: indent ? `${INDENT.LINE_ITEM}px` : `${INDENT.SECTION_HEADER}px`,
          fontWeight: bold ? 600 : 400,
          whiteSpace: 'nowrap',
          borderRight: '2px solid var(--cui-border-color)',
        }}
      >
        {label}
      </td>
      {values.map((value, idx) => (
        <td
          key={idx}
          style={{
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: bold ? 600 : 400,
            color: value < 0 ? 'var(--cui-danger)' : undefined,
            textDecoration,
          }}
        >
          {formatCurrency(value)}
        </td>
      ))}
      {!hideTotal && (
        <td
          style={{
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
            backgroundColor: 'var(--cui-light-bg-subtle)',
            borderLeft: '2px solid var(--cui-border-color)',
            color: total < 0 ? 'var(--cui-danger)' : undefined,
            textDecoration,
          }}
        >
          {formatCurrency(total)}
        </td>
      )}
    </tr>
  );
}

interface SectionLabelProps {
  label: string;
  colSpan: number;
}

function SectionLabel({ label, colSpan }: SectionLabelProps) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          fontWeight: 700,
          fontSize: '0.8125rem',
          paddingLeft: `${INDENT.SECTION_HEADER}px`,
          paddingTop: '12px',
          paddingBottom: '4px',
          borderBottom: 'none',
        }}
      >
        {label}
      </td>
    </tr>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CashFlowTable({ schedule }: Props) {
  const { periods, sections } = schedule;

  // Check if we're in overall mode (single "Total" period - no need for extra Total column)
  const overallMode = isOverallMode(schedule);

  // Detect "By Phase" mode: sections have phase-revenue-* or phase-costs IDs
  const isByPhaseMode = useMemo(() => {
    return sections.some(s => s.sectionId.startsWith('phase-revenue-') || s.sectionId === 'phase-costs');
  }, [sections]);

  // Group sections by type (for standard mode)
  // Revenue sections: GROSS REVENUE, REVENUE DEDUCTIONS (but NOT NET REVENUE since it's the result)
  const grossRevenueSection = useMemo(() =>
    sections.find(s => s.sectionId === 'revenue-gross'),
    [sections]
  );

  const revenueDeductionsSection = useMemo(() =>
    sections.find(s => s.sectionId === 'revenue-deductions'),
    [sections]
  );

  const netRevenueSection = useMemo(() =>
    sections.find(s => s.sectionId === 'revenue-net'),
    [sections]
  );

  const costSections = useMemo(() =>
    sections.filter(s => !s.sectionName.toLowerCase().includes('revenue') && !s.sectionId.startsWith('phase-')),
    [sections]
  );

  // For By Phase mode, get the phase-specific sections
  const phaseGrossRevenueSection = useMemo(() =>
    sections.find(s => s.sectionId === 'phase-revenue-gross'),
    [sections]
  );
  const phaseDeductionsSection = useMemo(() =>
    sections.find(s => s.sectionId === 'phase-revenue-deductions'),
    [sections]
  );
  const phaseNetRevenueSection = useMemo(() =>
    sections.find(s => s.sectionId === 'phase-revenue-net'),
    [sections]
  );
  const phaseCostsSection = useMemo(() =>
    sections.find(s => s.sectionId === 'phase-costs'),
    [sections]
  );

  // Calculate totals across all sections (works for both modes)
  const { totalRevenuePerPeriod, totalRevenue, totalCostsPerPeriod, totalCosts } = useMemo(() => {
    if (isByPhaseMode) {
      // By Phase mode: use the phase section totals
      const revenuePerPeriod = phaseNetRevenueSection?.subtotals || periods.map(() => 0);
      const revenue = phaseNetRevenueSection?.sectionTotal || 0;
      const costsPerPeriod = phaseCostsSection?.subtotals || periods.map(() => 0);
      const costs = phaseCostsSection?.sectionTotal || 0;

      return {
        totalRevenuePerPeriod: revenuePerPeriod,
        totalRevenue: revenue,
        totalCostsPerPeriod: costsPerPeriod,
        totalCosts: costs,
      };
    } else {
      // Standard mode
      const revenuePerPeriod = netRevenueSection ? netRevenueSection.subtotals : periods.map(() => 0);
      const revenue = netRevenueSection?.sectionTotal || 0;

      const costsPerPeriod = periods.map((_, idx) => {
        return costSections.reduce((sum, section) => sum + (section.subtotals[idx] || 0), 0);
      });
      const costs = costsPerPeriod.reduce((sum, val) => sum + val, 0);

      return {
        totalRevenuePerPeriod: revenuePerPeriod,
        totalRevenue: revenue,
        totalCostsPerPeriod: costsPerPeriod,
        totalCosts: costs,
      };
    }
  }, [isByPhaseMode, phaseNetRevenueSection, phaseCostsSection, netRevenueSection, costSections, periods]);

  // Calculate net cash flow per period (revenue + costs, since costs are already negative)
  const netCashFlowPerPeriod = useMemo(() => {
    return periods.map((_, idx) => {
      const revenue = totalRevenuePerPeriod[idx] || 0;
      const costs = totalCostsPerPeriod[idx] || 0; // Already negative
      return revenue + costs;
    });
  }, [totalRevenuePerPeriod, totalCostsPerPeriod, periods]);

  // Total net cash flow (costs are already negative)
  const totalNetCashFlow = totalRevenue + totalCosts;

  // Calculate cumulative cash flow
  const cumulativeCashFlow = useMemo(() => {
    let cumulative = 0;
    return netCashFlowPerPeriod.map((net) => {
      cumulative += net;
      return cumulative;
    });
  }, [netCashFlowPerPeriod]);

  // Column count: label + periods + total (unless overall mode)
  const colCount = 1 + periods.length + (overallMode ? 0 : 1);

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

  const tableStyle: React.CSSProperties = {
    fontSize: '0.8125rem',
    marginBottom: 0,
    tableLayout: 'fixed',
    width: 'auto',
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: 'var(--cui-dark-bg-subtle)',
    fontWeight: 600,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    borderBottom: '3px solid var(--cui-border-color)',
  };

  return (
    <div style={{ maxHeight: '80vh', overflowX: 'auto', overflowY: 'auto' }}>
      <CTable small bordered hover style={tableStyle}>
        <colgroup>
          <col style={{ width: `${DEFAULT_LABEL_WIDTH}px` }} />
          {periods.map((_, idx) => (
            <col key={idx} style={{ width: `${DEFAULT_DATA_WIDTH}px` }} />
          ))}
          {!overallMode && <col style={{ width: `${DEFAULT_DATA_WIDTH}px` }} />}
        </colgroup>
        <thead>
          <tr>
            <th
              style={{
                ...headerStyle,
                textAlign: 'left',
                paddingLeft: `${INDENT.SECTION_HEADER}px`,
                borderRight: '2px solid var(--cui-border-color)',
              }}
            >
              Category
            </th>
            {periods.map((period, idx) => (
              <th key={idx} style={headerStyle}>
                {period.label}
              </th>
            ))}
            {!overallMode && (
              <th
                style={{
                  ...headerStyle,
                  borderLeft: '2px solid var(--cui-border-color)',
                }}
              >
                TOTAL
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {isByPhaseMode ? (
            /* BY PHASE MODE - Flat sections with phase suffixes on labels */
            <>
              {/* GROSS REVENUE */}
              {phaseGrossRevenueSection && phaseGrossRevenueSection.lineItems.length > 0 && (
                <>
                  <SectionLabel label="GROSS REVENUE" colSpan={colCount} />
                  {phaseGrossRevenueSection.lineItems.map((item, idx) => (
                    <DataRow
                      key={item.lineId}
                      label={item.description}
                      values={item.values}
                      total={item.total}
                      hideTotal={overallMode}
                      indent
                      bottomBorder={idx === phaseGrossRevenueSection.lineItems.length - 1 && !phaseDeductionsSection}
                    />
                  ))}
                </>
              )}
              {/* REVENUE DEDUCTIONS (Subdivision Costs) */}
              {phaseDeductionsSection && phaseDeductionsSection.lineItems.length > 0 && (
                <>
                  <SectionLabel label="REVENUE DEDUCTIONS" colSpan={colCount} />
                  {phaseDeductionsSection.lineItems.map((item, idx) => (
                    <DataRow
                      key={item.lineId}
                      label={item.description}
                      values={item.values}
                      total={item.total}
                      hideTotal={overallMode}
                      indent
                      bottomBorder={idx === phaseDeductionsSection.lineItems.length - 1}
                    />
                  ))}
                </>
              )}
              {/* NET REVENUE */}
              {phaseNetRevenueSection && phaseNetRevenueSection.lineItems.length > 0 && (
                <>
                  <SectionLabel label="NET REVENUE" colSpan={colCount} />
                  {phaseNetRevenueSection.lineItems.map((item) => (
                    <DataRow
                      key={item.lineId}
                      label={item.description}
                      values={item.values}
                      total={item.total}
                      hideTotal={overallMode}
                      indent
                    />
                  ))}
                  <DataRow
                    label="Total Net Revenue"
                    values={phaseNetRevenueSection.subtotals}
                    total={phaseNetRevenueSection.sectionTotal}
                    hideTotal={overallMode}
                    bold
                  />
                </>
              )}
              {/* PROJECT COSTS */}
              {phaseCostsSection && phaseCostsSection.lineItems.length > 0 && (
                <>
                  <SectionLabel label="PROJECT COSTS" colSpan={colCount} />
                  {phaseCostsSection.lineItems.map((item, idx) => (
                    <DataRow
                      key={item.lineId}
                      label={item.description}
                      values={item.values}
                      total={item.total}
                      hideTotal={overallMode}
                      indent
                      bottomBorder={idx === phaseCostsSection.lineItems.length - 1}
                    />
                  ))}
                  <DataRow
                    label="Total Project Costs"
                    values={phaseCostsSection.subtotals}
                    total={phaseCostsSection.sectionTotal}
                    hideTotal={overallMode}
                    bold
                  />
                </>
              )}
            </>
          ) : (
            /* STANDARD MODE */
            <>
              {/* REVENUE */}
              <SectionLabel label="REVENUE" colSpan={colCount} />
              {(() => {
                // Get individual deduction line items (Commissions, Transaction Costs, Subdivision Costs)
                const deductionItems = revenueDeductionsSection?.lineItems || [];
                const commissionsItem = deductionItems.find(item => item.description === 'Commissions');
                const transactionCostsItem = deductionItems.find(item => item.description === 'Transaction Costs');
                const subdivisionCostsItem = deductionItems.find(item => item.description === 'Subdivision Costs');
                const hasAnyDeductions = deductionItems.length > 0;

                return (
                  <>
                    {grossRevenueSection && (
                      <DataRow
                        label="Gross Revenue"
                        values={grossRevenueSection.subtotals}
                        total={grossRevenueSection.sectionTotal}
                        hideTotal={overallMode}
                        indent
                        bottomBorder={!hasAnyDeductions}
                      />
                    )}
                    {commissionsItem && commissionsItem.values && (
                      <DataRow
                        label="Less: Commissions"
                        values={commissionsItem.values}
                        total={commissionsItem.total}
                        hideTotal={overallMode}
                        indent
                      />
                    )}
                    {transactionCostsItem && transactionCostsItem.values && (
                      <DataRow
                        label="Less: Transaction Costs"
                        values={transactionCostsItem.values}
                        total={transactionCostsItem.total}
                        hideTotal={overallMode}
                        indent
                      />
                    )}
                    {subdivisionCostsItem && subdivisionCostsItem.values && (
                      <DataRow
                        label="Less: Subdivision Costs"
                        values={subdivisionCostsItem.values}
                        total={subdivisionCostsItem.total}
                        hideTotal={overallMode}
                        indent
                        bottomBorder={true}
                      />
                    )}
                  </>
                );
              })()}
              <DataRow
                label="Net Revenue"
                values={totalRevenuePerPeriod}
                total={totalRevenue}
                hideTotal={overallMode}
                bold
              />

              {/* PROJECT COSTS */}
              <SectionLabel label="PROJECT COSTS" colSpan={colCount} />
              {costSections.length > 0 ? (
                costSections.map((section, idx) => (
                  <DataRow
                    key={section.sectionId}
                    label={section.sectionName}
                    values={section.subtotals}
                    total={section.sectionTotal}
                    hideTotal={overallMode}
                    indent
                    bottomBorder={idx === costSections.length - 1}
                  />
                ))
              ) : (
                <DataRow
                  label="No costs"
                  values={periods.map(() => 0)}
                  total={0}
                  hideTotal={overallMode}
                  indent
                  bottomBorder={true}
                />
              )}
            </>
          )}

          {/* PROJECT TOTALS - shown in both modes */}
          <SectionLabel label="PROJECT TOTALS" colSpan={colCount} />
          <DataRow
            label="Total Net Revenue"
            values={totalRevenuePerPeriod}
            total={totalRevenue}
            hideTotal={overallMode}
            indent
          />
          <DataRow
            label="Total Project Costs"
            values={totalCostsPerPeriod}
            total={totalCosts}
            hideTotal={overallMode}
            indent
            bottomBorder
          />
          <DataRow
            label="Net Cash Flow"
            values={netCashFlowPerPeriod}
            total={totalNetCashFlow}
            hideTotal={overallMode}
            bold
          />
          <DataRow
            label="Cumulative"
            values={cumulativeCashFlow}
            total={totalNetCashFlow}
            hideTotal={overallMode}
            indent
          />
        </tbody>
      </CTable>
    </div>
  );
}
