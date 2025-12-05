/**
 * Cash Flow Phase Table
 * Displays cash flow data by phase (columns) matching ValidationReport layout
 * Phases are columns, metrics are rows
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { CTable } from '@coreui/react';
import type { CashFlowSchedule, CashFlowSection } from '@/lib/financial-engine/cashflow/types';
import {
  formatValidationCurrency,
  formatValidationPercent,
  formatValidationNumber,
} from '@/types/validation-report';

interface Props {
  schedule: CashFlowSchedule;
  phaseLabel?: string;
}

// Indentation levels (in pixels) - matching ValidationReport
const INDENT = {
  SECTION_HEADER: 12,
  LINE_ITEM: 24,
  TOTAL: 36,
};

// Column widths
const DEFAULT_LABEL_WIDTH = 200;
const DEFAULT_DATA_WIDTH = 110;
const UNIT_COL_WIDTH = 85;

// Acres to square feet conversion
const SQFT_PER_ACRE = 43560;

// Section IDs for accordion state
type SectionId = 'revenue' | 'deductions' | 'costs' | 'cashflow' | 'metrics';

// All sections expanded by default
const ALL_SECTIONS: SectionId[] = ['revenue', 'deductions', 'costs', 'cashflow', 'metrics'];

/**
 * Format per-unit value
 */
function formatUnitValue(value: number, divisor: number): string {
  if (divisor === 0 || value === 0) return '-';
  const unitValue = value / divisor;
  return formatValidationCurrency(unitValue);
}

/**
 * Extract phase data from cash flow schedule
 * Groups all data by container (phase) for phase-column display
 */
interface PhaseColumnData {
  phaseId: number | string;
  phaseName: string;
  grossRevenue: number;
  subdivisionCosts: number;
  netRevenue: number;
  totalCosts: number;
  costsByCategory: {
    acquisition: number;
    planning: number;
    development: number;
    soft: number;
    financing: number;
  };
  netCashFlow: number;
  // Physical metrics (if available)
  units: number;
  frontFeet: number;
  acres: number;
}

function extractPhaseData(schedule: CashFlowSchedule): { phases: PhaseColumnData[]; totals: PhaseColumnData } {
  // For now, we'll use the summary data to create a single "total" column
  // The schedule structure doesn't inherently have phase-by-phase breakdown
  // This would need to be enhanced if we want actual phase columns

  const { summary } = schedule;

  // Create totals from summary
  const totals: PhaseColumnData = {
    phaseId: 'total',
    phaseName: 'TOTAL',
    grossRevenue: summary.totalGrossRevenue,
    subdivisionCosts: summary.totalRevenueDeductions,
    netRevenue: summary.totalNetRevenue,
    totalCosts: summary.totalCosts,
    costsByCategory: summary.costsByCategory,
    netCashFlow: summary.netCashFlow,
    units: 0, // Would need physical data
    frontFeet: 0,
    acres: 0,
  };

  // For phase-level breakdown, we need to aggregate from sections
  // Each section may have container-specific line items
  const phaseMap = new Map<string, PhaseColumnData>();

  // Iterate through sections to extract phase-level data
  for (const section of schedule.sections) {
    for (const lineItem of section.lineItems) {
      // Check if line item has container (phase) grouping
      const phaseKey = lineItem.containerLabel || (lineItem.containerId ? String(lineItem.containerId) : null);
      if (phaseKey) {
        if (!phaseMap.has(phaseKey)) {
          phaseMap.set(phaseKey, {
            phaseId: phaseKey,
            phaseName: phaseKey,
            grossRevenue: 0,
            subdivisionCosts: 0,
            netRevenue: 0,
            totalCosts: 0,
            costsByCategory: {
              acquisition: 0,
              planning: 0,
              development: 0,
              soft: 0,
              financing: 0,
            },
            netCashFlow: 0,
            units: 0,
            frontFeet: 0,
            acres: 0,
          });
        }

        const phaseData = phaseMap.get(phaseKey)!;

        // Categorize the line item based on section
        if (section.sectionId === 'revenue-gross') {
          phaseData.grossRevenue += lineItem.total;
        } else if (section.sectionId === 'revenue-deductions') {
          phaseData.subdivisionCosts += Math.abs(lineItem.total);
        } else if (section.sectionId === 'revenue-net') {
          phaseData.netRevenue = lineItem.total;
        } else if (section.sectionId.startsWith('costs-')) {
          phaseData.totalCosts += lineItem.total;
          // Categorize costs
          const category = lineItem.category?.toLowerCase() || '';
          if (category.includes('acquisition')) {
            phaseData.costsByCategory.acquisition += lineItem.total;
          } else if (category.includes('planning') || category.includes('engineering')) {
            phaseData.costsByCategory.planning += lineItem.total;
          } else if (category.includes('development')) {
            phaseData.costsByCategory.development += lineItem.total;
          } else if (category.includes('soft') || category.includes('operation')) {
            phaseData.costsByCategory.soft += lineItem.total;
          } else if (category.includes('financing')) {
            phaseData.costsByCategory.financing += lineItem.total;
          }
        }
      }
    }
  }

  // Calculate net cash flow for each phase
  phaseMap.forEach(phase => {
    phase.netCashFlow = phase.netRevenue - phase.totalCosts;
  });

  // Sort phases by name
  const phases = Array.from(phaseMap.values()).sort((a, b) =>
    a.phaseName.localeCompare(b.phaseName, undefined, { numeric: true })
  );

  return { phases, totals };
}

// ============================================================================
// TABLE ROW COMPONENTS
// ============================================================================

type IndentLevel = 'none' | 'line_item' | 'total';

interface DataRowProps {
  label: string;
  phases: PhaseColumnData[];
  totals: PhaseColumnData;
  getValue: (phase: PhaseColumnData) => number;
  format?: 'currency' | 'number' | 'percent';
  decimals?: number;
  highlight?: boolean;
  indent?: IndentLevel;
  textColor?: string;
  bottomBorder?: boolean;
  expandedPhases?: Record<string, boolean>;
  showUnitCols?: boolean;
}

function DataRow({
  label,
  phases,
  totals,
  getValue,
  format = 'currency',
  decimals = 0,
  highlight = false,
  indent = 'none',
  textColor,
  bottomBorder = false,
  expandedPhases = {},
  showUnitCols = false,
}: DataRowProps) {
  const formatValue = (value: number): string => {
    switch (format) {
      case 'currency':
        return formatValidationCurrency(value);
      case 'percent':
        return formatValidationPercent(value);
      case 'number':
        return formatValidationNumber(value, decimals);
      default:
        return String(value);
    }
  };

  const rowStyle: React.CSSProperties = {
    ...(highlight ? { backgroundColor: 'var(--cui-tertiary-bg)', fontWeight: 600 } : {}),
  };

  const textDecoration = bottomBorder ? 'underline' : undefined;

  const getPaddingLeft = (): number => {
    if (indent === 'line_item') return INDENT.LINE_ITEM;
    if (indent === 'total') return INDENT.TOTAL;
    return INDENT.SECTION_HEADER;
  };

  const labelStyle: React.CSSProperties = { paddingLeft: `${getPaddingLeft()}px` };

  const unitCellStyle: React.CSSProperties = {
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    fontSize: '0.7rem',
    color: 'var(--cui-secondary-color)',
    backgroundColor: 'var(--cui-tertiary-bg)',
    padding: '2px 6px',
  };

  const renderUnitCols = (phase: PhaseColumnData, phaseKey: string) => {
    if (!expandedPhases[phaseKey]) return null;

    const unitCellWithDecoration: React.CSSProperties = {
      ...unitCellStyle,
      textDecoration,
    };

    if (!showUnitCols || format === 'percent') {
      return (
        <>
          <td style={unitCellWithDecoration}>-</td>
          <td style={unitCellWithDecoration}>-</td>
          <td style={unitCellWithDecoration}>-</td>
          <td style={unitCellWithDecoration}>-</td>
        </>
      );
    }

    const value = getValue(phase);
    const totalUnits = phase.units;
    const totalAcres = phase.acres;
    const totalSF = totalAcres * SQFT_PER_ACRE;
    return (
      <>
        <td style={unitCellWithDecoration}>{formatUnitValue(value, totalUnits)}</td>
        <td style={unitCellWithDecoration}>{formatUnitValue(value, phase.frontFeet)}</td>
        <td style={unitCellWithDecoration}>{formatUnitValue(value, totalSF)}</td>
        <td style={unitCellWithDecoration}>{formatUnitValue(value, totalAcres)}</td>
      </>
    );
  };

  return (
    <tr style={rowStyle}>
      <td
        style={{
          ...labelStyle,
          fontWeight: highlight ? 600 : 400,
          whiteSpace: 'nowrap',
          borderRight: '2px solid var(--cui-border-color)',
        }}
      >
        {label}
      </td>
      {phases.map((phase, idx) => (
        <React.Fragment key={idx}>
          <td
            style={{
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              color: getValue(phase) < 0 ? 'var(--cui-danger)' : textColor,
              textDecoration,
            }}
          >
            {formatValue(getValue(phase))}
          </td>
          {renderUnitCols(phase, phase.phaseName)}
        </React.Fragment>
      ))}
      <td
        style={{
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 600,
          backgroundColor: 'var(--cui-light-bg-subtle)',
          borderLeft: '2px solid var(--cui-border-color)',
          color: getValue(totals) < 0 ? 'var(--cui-danger)' : textColor,
          textDecoration,
        }}
      >
        {formatValue(getValue(totals))}
      </td>
      {renderUnitCols(totals, 'total')}
    </tr>
  );
}

interface SectionHeaderProps {
  title: string;
  colSpan: number;
  isExpanded: boolean;
  onToggle: () => void;
  extraColSpan?: number;
}

function SectionHeader({ title, colSpan, isExpanded, onToggle, extraColSpan = 0 }: SectionHeaderProps) {
  return (
    <tr>
      <td
        colSpan={colSpan + extraColSpan}
        onClick={onToggle}
        style={{
          backgroundColor: 'var(--cui-dark-bg-subtle)',
          fontWeight: 700,
          fontSize: '0.8125rem',
          padding: `8px ${INDENT.SECTION_HEADER}px`,
          borderTop: '2px solid var(--cui-border-color)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ marginRight: '8px', display: 'inline-block', width: '12px' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
        {title}
      </td>
    </tr>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CashFlowPhaseTable({ schedule, phaseLabel = 'Phase' }: Props) {
  const { phases, totals } = useMemo(() => extractPhaseData(schedule), [schedule]);

  // State for accordion sections - all expanded by default
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set(ALL_SECTIONS));

  // State for expanded unit cost columns
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((sectionId: SectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const isSectionExpanded = (sectionId: SectionId) => expandedSections.has(sectionId);

  const togglePhaseExpanded = useCallback((phaseKey: string) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseKey]: !prev[phaseKey],
    }));
  }, []);

  // Calculate extra columns for expanded unit columns
  const expandedUnitColCount = useMemo(() => {
    let count = 0;
    phases.forEach(p => {
      if (expandedPhases[p.phaseName]) count += 4;
    });
    if (expandedPhases['total']) count += 4;
    return count;
  }, [phases, expandedPhases]);

  const colCount = phases.length + 2; // label + phases + total

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

  // If no phase breakdown, show message
  if (phases.length === 0) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--cui-secondary-color)' }}>
        <p>Phase-level cash flow breakdown is not available.</p>
        <p className="text-sm mt-2">Use the summary metrics above for project totals.</p>
      </div>
    );
  }

  return (
    <div style={{ maxHeight: '80vh', overflowX: 'auto', overflowY: 'auto' }}>
      <CTable small bordered hover style={tableStyle}>
        <colgroup>
          <col style={{ width: `${DEFAULT_LABEL_WIDTH}px` }} />
          {phases.map((phase) => (
            <React.Fragment key={phase.phaseName}>
              <col style={{ width: `${DEFAULT_DATA_WIDTH}px` }} />
              {expandedPhases[phase.phaseName] && (
                <>
                  <col style={{ width: `${UNIT_COL_WIDTH}px` }} />
                  <col style={{ width: `${UNIT_COL_WIDTH}px` }} />
                  <col style={{ width: `${UNIT_COL_WIDTH}px` }} />
                  <col style={{ width: `${UNIT_COL_WIDTH}px` }} />
                </>
              )}
            </React.Fragment>
          ))}
          <col style={{ width: `${DEFAULT_DATA_WIDTH}px` }} />
          {expandedPhases['total'] && (
            <>
              <col style={{ width: `${UNIT_COL_WIDTH}px` }} />
              <col style={{ width: `${UNIT_COL_WIDTH}px` }} />
              <col style={{ width: `${UNIT_COL_WIDTH}px` }} />
              <col style={{ width: `${UNIT_COL_WIDTH}px` }} />
            </>
          )}
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
              {phaseLabel} ID
            </th>
            {phases.map((phase) => {
              const phaseKey = phase.phaseName;
              const isExpanded = expandedPhases[phaseKey] || false;
              return (
                <React.Fragment key={phaseKey}>
                  <th
                    style={{
                      ...headerStyle,
                      textAlign: 'center',
                      minWidth: `${DEFAULT_DATA_WIDTH}px`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePhaseExpanded(phaseKey); }}
                        style={{
                          background: 'none',
                          border: '1px solid var(--cui-border-color)',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          padding: '0 4px',
                          fontSize: '0.75rem',
                          lineHeight: 1.2,
                          color: 'var(--cui-body-color)',
                        }}
                        title={isExpanded ? 'Hide unit columns' : 'Show $/Unit, $/FrFt, $/Acre'}
                      >
                        {isExpanded ? '−' : '+'}
                      </button>
                      <span>{`${phaseLabel} ${phaseKey}`}</span>
                    </div>
                  </th>
                  {isExpanded && (
                    <>
                      <th style={{ ...headerStyle, fontSize: '0.65rem', padding: '4px 2px', backgroundColor: 'var(--cui-tertiary-bg)' }}>$/Unit</th>
                      <th style={{ ...headerStyle, fontSize: '0.65rem', padding: '4px 2px', backgroundColor: 'var(--cui-tertiary-bg)' }}>$/FrFt</th>
                      <th style={{ ...headerStyle, fontSize: '0.65rem', padding: '4px 2px', backgroundColor: 'var(--cui-tertiary-bg)' }}>$/SF</th>
                      <th style={{ ...headerStyle, fontSize: '0.65rem', padding: '4px 2px', backgroundColor: 'var(--cui-tertiary-bg)' }}>$/Acre</th>
                    </>
                  )}
                </React.Fragment>
              );
            })}
            <th
              style={{
                ...headerStyle,
                textAlign: 'center',
                borderLeft: '2px solid var(--cui-border-color)',
                minWidth: `${DEFAULT_DATA_WIDTH}px`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePhaseExpanded('total'); }}
                  style={{
                    background: 'none',
                    border: '1px solid var(--cui-border-color)',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    padding: '0 4px',
                    fontSize: '0.75rem',
                    lineHeight: 1.2,
                    color: 'var(--cui-body-color)',
                  }}
                  title={expandedPhases['total'] ? 'Hide unit columns' : 'Show $/Unit, $/FrFt, $/Acre'}
                >
                  {expandedPhases['total'] ? '−' : '+'}
                </button>
                <span>TOTAL</span>
              </div>
            </th>
            {expandedPhases['total'] && (
              <>
                <th style={{ ...headerStyle, fontSize: '0.65rem', padding: '4px 2px', backgroundColor: 'var(--cui-tertiary-bg)' }}>$/Unit</th>
                <th style={{ ...headerStyle, fontSize: '0.65rem', padding: '4px 2px', backgroundColor: 'var(--cui-tertiary-bg)' }}>$/FrFt</th>
                <th style={{ ...headerStyle, fontSize: '0.65rem', padding: '4px 2px', backgroundColor: 'var(--cui-tertiary-bg)' }}>$/SF</th>
                <th style={{ ...headerStyle, fontSize: '0.65rem', padding: '4px 2px', backgroundColor: 'var(--cui-tertiary-bg)' }}>$/Acre</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {/* SECTION: Revenue */}
          <SectionHeader
            title="Revenue"
            colSpan={colCount}
            extraColSpan={expandedUnitColCount}
            isExpanded={isSectionExpanded('revenue')}
            onToggle={() => toggleSection('revenue')}
          />
          {isSectionExpanded('revenue') && (
            <>
              <DataRow
                label="Gross Revenue"
                phases={phases}
                totals={totals}
                getValue={(p) => p.grossRevenue}
                indent="line_item"
                expandedPhases={expandedPhases}
                showUnitCols
              />
            </>
          )}

          {/* SECTION: Deductions */}
          <SectionHeader
            title="Revenue Deductions"
            colSpan={colCount}
            extraColSpan={expandedUnitColCount}
            isExpanded={isSectionExpanded('deductions')}
            onToggle={() => toggleSection('deductions')}
          />
          {isSectionExpanded('deductions') && (
            <>
              <DataRow
                label="Subdivision Costs"
                phases={phases}
                totals={totals}
                getValue={(p) => -p.subdivisionCosts}
                indent="line_item"
                bottomBorder
                expandedPhases={expandedPhases}
                showUnitCols
              />
            </>
          )}

          {/* Net Revenue - always visible */}
          <DataRow
            label="Net Revenue"
            phases={phases}
            totals={totals}
            getValue={(p) => p.netRevenue}
            highlight
            expandedPhases={expandedPhases}
            showUnitCols
          />

          {/* SECTION: Costs */}
          <SectionHeader
            title="Project Costs"
            colSpan={colCount}
            extraColSpan={expandedUnitColCount}
            isExpanded={isSectionExpanded('costs')}
            onToggle={() => toggleSection('costs')}
          />
          {isSectionExpanded('costs') && (
            <>
              <DataRow
                label="Acquisition"
                phases={phases}
                totals={totals}
                getValue={(p) => p.costsByCategory.acquisition}
                indent="line_item"
                expandedPhases={expandedPhases}
                showUnitCols
              />
              <DataRow
                label="Planning & Engineering"
                phases={phases}
                totals={totals}
                getValue={(p) => p.costsByCategory.planning}
                indent="line_item"
                expandedPhases={expandedPhases}
                showUnitCols
              />
              <DataRow
                label="Development"
                phases={phases}
                totals={totals}
                getValue={(p) => p.costsByCategory.development}
                indent="line_item"
                expandedPhases={expandedPhases}
                showUnitCols
              />
              <DataRow
                label="Soft Costs / Operations"
                phases={phases}
                totals={totals}
                getValue={(p) => p.costsByCategory.soft}
                indent="line_item"
                expandedPhases={expandedPhases}
                showUnitCols
              />
              <DataRow
                label="Financing"
                phases={phases}
                totals={totals}
                getValue={(p) => p.costsByCategory.financing}
                indent="line_item"
                bottomBorder
                expandedPhases={expandedPhases}
                showUnitCols
              />
            </>
          )}

          {/* Total Costs - always visible */}
          <DataRow
            label="Total Costs"
            phases={phases}
            totals={totals}
            getValue={(p) => p.totalCosts}
            highlight
            expandedPhases={expandedPhases}
            showUnitCols
          />

          {/* SECTION: Cash Flow Metrics */}
          <SectionHeader
            title="Cash Flow"
            colSpan={colCount}
            extraColSpan={expandedUnitColCount}
            isExpanded={isSectionExpanded('cashflow')}
            onToggle={() => toggleSection('cashflow')}
          />
          {isSectionExpanded('cashflow') && (
            <>
              <DataRow
                label="Net Cash Flow"
                phases={phases}
                totals={totals}
                getValue={(p) => p.netCashFlow}
                highlight
                expandedPhases={expandedPhases}
                showUnitCols
              />
              <DataRow
                label="Profit Margin"
                phases={phases}
                totals={totals}
                getValue={(p) => p.grossRevenue > 0 ? p.netCashFlow / p.grossRevenue : 0}
                format="percent"
                indent="line_item"
                expandedPhases={expandedPhases}
              />
            </>
          )}
        </tbody>
      </CTable>
    </div>
  );
}
