/**
 * CashFlowGrid - Shared Cash Flow Table Component
 *
 * A generic, property-type agnostic cash flow grid that renders:
 * - Time periods as columns
 * - Categories/line items as rows
 * - Supports periodicity toggle (Monthly/Quarterly/Annual/Overall)
 *
 * Used by both Land Development and Multifamily DCF views.
 * Each property type transforms its data into the common format before passing to this component.
 *
 * @created 2026-01-31
 */

'use client';

import React from 'react';
import { CTable, CButtonGroup, CButton } from '@coreui/react';

// ============================================================================
// TYPES
// ============================================================================

export type TimeScale = 'monthly' | 'quarterly' | 'annual' | 'overall';

export interface CashFlowPeriod {
  id: string;
  label: string; // "Jan 2026", "Q1 2026", "2026", "TOTAL"
  startDate?: string; // ISO date (optional for display)
  endDate?: string; // ISO date (optional for display)
  /** Reference column (e.g., Yr N+1 terminal year) — renders with lighter bg and italic header */
  isReference?: boolean;
}

export interface CashFlowRow {
  id: string;
  label: string; // "Gross Potential Rent", "Vacancy", etc.
  category?: string; // For grouping: "revenue", "expenses", "noi", etc.
  isHeader?: boolean; // Section header row (spans all columns)
  isSubtotal?: boolean; // Subtotal row (bold)
  isTotal?: boolean; // Grand total row (bold + border)
  indent?: number; // 0, 1, 2 for nesting (default 0)
  values: Record<string, number>; // periodId → value
  total?: number; // Row total (sum across all periods)
  hideTotal?: boolean; // Don't show total column for this row
  bottomBorder?: boolean; // Show underline below this row (accounting style)
}

export interface CashFlowSection {
  id: string;
  label: string; // "REVENUE", "EXPENSES", etc.
  rows: CashFlowRow[];
  hideHeader?: boolean; // Skip rendering the section header row
}

export interface CashFlowGridProps {
  sections: CashFlowSection[];
  periods: CashFlowPeriod[];
  timeScale?: TimeScale;
  onTimeScaleChange?: (scale: TimeScale) => void;
  showTimeScaleToggle?: boolean; // default true
  showTotalColumn?: boolean; // default true, set false for 'overall' mode
  formatValue?: (value: number, row: CashFlowRow) => string;
  className?: string;
  /** Title to display above the grid */
  title?: string;
  /** Header content to render in the controls row (e.g., export button) */
  headerActions?: React.ReactNode;
  /** Label for the first column header (default: "Category") */
  labelColumnHeader?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIME_SCALES: { value: TimeScale; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'overall', label: 'Overall' },
];

// Indentation levels (in pixels)
const INDENT = {
  SECTION_HEADER: 12,
  LEVEL_0: 12,
  LEVEL_1: 24,
  LEVEL_2: 36,
};

// Column widths
const DEFAULT_LABEL_WIDTH = 200;
const DEFAULT_DATA_WIDTH = 110;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Default currency formatter
 * Shows full numbers with commas, negatives in parentheses
 */
function defaultFormatValue(value: number): string {
  if (value === 0 || value === null || value === undefined) return '—';

  const absValue = Math.abs(value);
  const rounded = Math.round(absValue);
  const formatted = `$${rounded.toLocaleString()}`;

  return value < 0 ? `(${formatted})` : formatted;
}

/**
 * Get indentation in pixels based on indent level
 */
function getIndent(level?: number): number {
  if (level === undefined || level === 0) return INDENT.LEVEL_0;
  if (level === 1) return INDENT.LEVEL_1;
  return INDENT.LEVEL_2;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TimeScaleSelectorProps {
  value: TimeScale;
  onChange: (scale: TimeScale) => void;
  disabled?: boolean;
}

function TimeScaleSelector({ value, onChange, disabled = false }: TimeScaleSelectorProps) {
  return (
    <CButtonGroup size="sm" role="group" aria-label="Time scale selector">
      {TIME_SCALES.map((scale) => (
        <CButton
          key={scale.value}
          color={value === scale.value ? 'primary' : 'secondary'}
          variant={value === scale.value ? undefined : 'outline'}
          onClick={() => onChange(scale.value)}
          disabled={disabled}
        >
          {scale.label}
        </CButton>
      ))}
    </CButtonGroup>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CashFlowGrid({
  sections,
  periods,
  timeScale = 'annual',
  onTimeScaleChange,
  showTimeScaleToggle = true,
  showTotalColumn = true,
  formatValue = defaultFormatValue,
  className,
  title,
  headerActions,
  labelColumnHeader = 'Category',
}: CashFlowGridProps) {
  // Determine if we should hide total column (e.g., in 'overall' mode where there's only one period)
  const hideTotalColumn = !showTotalColumn || (periods.length === 1 && periods[0].label === 'Total');

  // Calculate column count: label + periods + optional total
  const colCount = 1 + periods.length + (hideTotalColumn ? 0 : 1);

  // No data state
  if (!sections || sections.length === 0 || periods.length === 0) {
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

  const headerCellStyle: React.CSSProperties = {
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
    <div className={className}>
      {/* Controls Row */}
      {(title || showTimeScaleToggle || headerActions) && (
        <div
          className="d-flex align-items-center justify-content-between gap-3 px-3 py-2 rounded-top"
          style={{
            backgroundColor: 'var(--cui-tertiary-bg)',
            borderBottom: '1px solid var(--cui-border-color)',
          }}
        >
          <div className="d-flex align-items-center gap-3">
            {title && (
              <h4
                className="mb-0 font-semibold"
                style={{ fontSize: '0.9375rem', color: 'var(--cui-body-color)' }}
              >
                {title}
              </h4>
            )}
            {showTimeScaleToggle && onTimeScaleChange && (
              <div className="d-flex align-items-center gap-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--cui-secondary-color)' }}
                >
                  Time:
                </span>
                <TimeScaleSelector value={timeScale} onChange={onTimeScaleChange} />
              </div>
            )}
          </div>
          {headerActions && <div className="d-flex align-items-center">{headerActions}</div>}
        </div>
      )}

      {/* Table */}
      <div
        style={{
          maxHeight: '70vh',
          overflowX: 'auto',
          overflowY: 'auto',
          border: '1px solid var(--cui-border-color)',
          borderRadius: showTimeScaleToggle || headerActions ? '0 0 0.375rem 0.375rem' : '0.375rem',
        }}
      >
        <CTable small borderless style={tableStyle}>
          <colgroup>
            <col style={{ width: `${DEFAULT_LABEL_WIDTH}px` }} />
            {periods.map((_, idx) => (
              <col key={idx} style={{ width: `${DEFAULT_DATA_WIDTH}px` }} />
            ))}
            {!hideTotalColumn && <col style={{ width: `${DEFAULT_DATA_WIDTH}px` }} />}
          </colgroup>
          <thead>
            <tr>
              <th
                style={{
                  ...headerCellStyle,
                  textAlign: 'left',
                  paddingLeft: `${INDENT.SECTION_HEADER}px`,
                  borderRight: '2px solid var(--cui-border-color)',
                }}
              >
                {labelColumnHeader}
              </th>
              {periods.map((period) => (
                <th
                  key={period.id}
                  style={{
                    ...headerCellStyle,
                    ...(period.isReference
                      ? {
                          fontStyle: 'italic',
                          backgroundColor: 'var(--cui-tertiary-bg)',
                          borderLeft: '2px solid var(--cui-border-color)',
                        }
                      : {}),
                  }}
                >
                  {period.label}
                </th>
              ))}
              {!hideTotalColumn && (
                <th
                  style={{
                    ...headerCellStyle,
                    borderLeft: '2px solid var(--cui-border-color)',
                  }}
                >
                  TOTAL
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <React.Fragment key={section.id}>
                {/* Section Header Row */}
                {!section.hideHeader && (
                  <tr>
                    <td
                      colSpan={colCount}
                      style={{
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        paddingLeft: `${INDENT.SECTION_HEADER}px`,
                        paddingTop: '12px',
                        paddingBottom: '4px',
                        borderBottom: 'none',
                        backgroundColor: 'var(--cui-body-bg)',
                      }}
                    >
                      {section.label}
                    </td>
                  </tr>
                )}

                {/* Section Rows */}
                {section.rows.map((row, rowIdx) => {
                  // Underline rows immediately before a subtotal or total row
                  const nextRow = section.rows[rowIdx + 1];
                  const isBeforeTotal = !!nextRow && (nextRow.isSubtotal || nextRow.isTotal);
                  return (
                    <DataRow
                      key={row.id}
                      row={row}
                      periods={periods}
                      formatValue={formatValue}
                      hideTotalColumn={hideTotalColumn}
                      isBeforeTotal={isBeforeTotal}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </CTable>
      </div>
    </div>
  );
}

// ============================================================================
// DATA ROW COMPONENT
// ============================================================================

interface DataRowProps {
  row: CashFlowRow;
  periods: CashFlowPeriod[];
  formatValue: (value: number, row: CashFlowRow) => string;
  hideTotalColumn: boolean;
  isBeforeTotal?: boolean;
}

function DataRow({ row, periods, formatValue, hideTotalColumn, isBeforeTotal }: DataRowProps) {
  const isSubtotalOrTotal = row.isSubtotal || row.isTotal;
  // Accounting-style underline: black, 0.5rem left margin (right-justified), value cells only
  const showUnderline = row.bottomBorder || isBeforeTotal;

  // Calculate row total if not provided
  const rowTotal =
    row.total !== undefined
      ? row.total
      : Object.values(row.values).reduce((sum, val) => sum + (val || 0), 0);

  // Row background for totals
  const rowBg = row.isTotal
    ? 'var(--cui-light-bg-subtle)'
    : row.isSubtotal
      ? undefined
      : undefined;

  // Border top for total rows
  const borderTop = row.isTotal ? '2px solid var(--cui-border-color)' : undefined;

  return (
    <tr style={{ backgroundColor: rowBg }}>
      {/* Label Cell — no underline */}
      <td
        style={{
          paddingLeft: `${getIndent(row.indent)}px`,
          fontWeight: isSubtotalOrTotal ? 600 : 400,
          whiteSpace: 'nowrap',
          borderRight: '2px solid var(--cui-border-color)',
          borderTop,
        }}
      >
        {row.label}
      </td>

      {/* Period Value Cells */}
      {periods.map((period) => {
        const value = row.values[period.id] ?? 0;
        const isRef = period.isReference === true;
        return (
          <td
            key={period.id}
            style={{
              position: 'relative',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: isSubtotalOrTotal ? 600 : 400,
              color: value < 0 ? 'var(--cui-danger)' : undefined,
              borderTop,
              ...(isRef
                ? {
                    backgroundColor: 'var(--cui-tertiary-bg)',
                    borderLeft: '2px solid var(--cui-border-color)',
                    fontStyle: 'italic',
                    opacity: 0.85,
                  }
                : {}),
            }}
          >
            {formatValue(value, row)}
            {showUnderline && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  left: '0.5rem',
                  height: '1px',
                  backgroundColor: 'var(--cui-body-color)',
                }}
              />
            )}
          </td>
        );
      })}

      {/* Total Cell */}
      {!hideTotalColumn && !row.hideTotal && (
        <td
          style={{
            position: 'relative',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
            backgroundColor: 'var(--cui-light-bg-subtle)',
            borderLeft: '2px solid var(--cui-border-color)',
            color: rowTotal < 0 ? 'var(--cui-danger)' : undefined,
            borderTop,
          }}
        >
          {formatValue(rowTotal, row)}
          {showUnderline && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                left: '0.5rem',
                height: '1px',
                backgroundColor: 'var(--cui-body-color)',
              }}
            />
          )}
        </td>
      )}

      {/* Empty total cell if hideTotal is true for this row */}
      {!hideTotalColumn && row.hideTotal && (
        <td
          style={{
            backgroundColor: 'var(--cui-light-bg-subtle)',
            borderLeft: '2px solid var(--cui-border-color)',
            borderTop,
          }}
        >
          —
        </td>
      )}
    </tr>
  );
}

export default CashFlowGrid;
