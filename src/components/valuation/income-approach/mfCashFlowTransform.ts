/**
 * MF Cash Flow Transform
 *
 * Transforms Multifamily DCF monthly data from the Django API into
 * the shared CashFlowGrid format, and provides aggregation functions
 * for converting monthly → quarterly → annual → overall.
 *
 * @created 2026-01-31
 */

import type {
  TimeScale,
  CashFlowPeriod,
  CashFlowRow,
  CashFlowSection,
} from '@/components/analysis/shared';

// ============================================================================
// API RESPONSE TYPES (from Django DCF monthly endpoint)
// ============================================================================

export interface MFDcfProjection {
  periodId: string;        // "2026-01", "2026-02", etc.
  periodLabel: string;     // "Jan 2026", "Feb 2026", etc.
  periodIndex: number;     // 1-based index
  month: number;           // 1-120 (for 10 year hold)
  year: number;            // Year number (1, 2, 3...)
  quarter: number;         // Quarter number (1-4)
  gpr: number;
  vacancy_loss: number;
  credit_loss: number;
  other_income: number;
  egi: number;
  base_opex: number;
  management_fee: number;
  replacement_reserves: number;
  total_opex: number;
  noi: number;
  pv_factor: number;
  pv_noi: number;
}

export interface MFDcfMonthlyApiResponse {
  project_id: number;
  period_type: 'monthly';
  start_date: string;
  total_periods: number;
  assumptions: {
    hold_period_years: number;
    discount_rate: number;
    terminal_cap_rate: number;
    selling_costs_pct: number;
    income_growth_rate: number;
    expense_growth_rate: number;
    vacancy_rate: number;
    credit_loss_rate: number;
    management_fee_pct: number;
    replacement_reserves_per_unit: number;
  };
  property_summary: {
    unit_count: number;
    total_sf: number;
    current_annual_rent: number;
    base_opex: number;
  };
  projections: MFDcfProjection[];
  exit_analysis: {
    terminal_noi: number;
    exit_value: number;
    selling_costs: number;
    net_reversion: number;
    pv_reversion: number;
  };
  metrics: {
    present_value: number;
    irr: number | null;
    npv: number | null;
    equity_multiple: number | null;
    price_per_unit: number | null;
    price_per_sf: number | null;
  };
  sensitivity_matrix: Array<{
    discount_rate: number;
    exit_cap_rates: number[];
    values: number[];
    is_base_discount: boolean;
  }>;
}

// ============================================================================
// TRANSFORM TO GRID FORMAT
// ============================================================================

/**
 * Transform MF DCF monthly API response to CashFlowGrid format
 */
export function transformMFDcfToGrid(
  data: MFDcfMonthlyApiResponse
): { periods: CashFlowPeriod[]; sections: CashFlowSection[] } {
  // Transform projections to periods
  const periods: CashFlowPeriod[] = data.projections.map((p) => ({
    id: p.periodId,
    label: p.periodLabel,
    startDate: p.periodId, // Use periodId as date reference
    endDate: p.periodId,
  }));

  // Build Income Statement rows from projections
  const buildRowValues = (
    projections: MFDcfProjection[],
    field: keyof MFDcfProjection
  ): Record<string, number> => {
    const values: Record<string, number> = {};
    projections.forEach((p) => {
      values[p.periodId] = p[field] as number;
    });
    return values;
  };

  // Revenue Section
  const revenueSection: CashFlowSection = {
    id: 'revenue',
    label: 'Revenue',
    rows: [
      {
        id: 'gpr',
        label: 'Gross Potential Rent',
        values: buildRowValues(data.projections, 'gpr'),
      },
      {
        id: 'vacancy_loss',
        label: 'Less: Vacancy',
        values: buildRowValues(data.projections, 'vacancy_loss'),
        indent: 1,
      },
      {
        id: 'credit_loss',
        label: 'Less: Credit Loss',
        values: buildRowValues(data.projections, 'credit_loss'),
        indent: 1,
      },
      {
        id: 'other_income',
        label: 'Plus: Other Income',
        values: buildRowValues(data.projections, 'other_income'),
        indent: 1,
      },
      {
        id: 'egi',
        label: 'Effective Gross Income',
        values: buildRowValues(data.projections, 'egi'),
        isSubtotal: true,
      },
    ],
  };

  // Expenses Section
  const expenseSection: CashFlowSection = {
    id: 'expenses',
    label: 'Operating Expenses',
    rows: [
      {
        id: 'base_opex',
        label: 'Operating Expenses',
        values: buildRowValues(data.projections, 'base_opex'),
      },
      {
        id: 'management_fee',
        label: 'Management Fee',
        values: buildRowValues(data.projections, 'management_fee'),
        indent: 1,
      },
      {
        id: 'replacement_reserves',
        label: 'Replacement Reserves',
        values: buildRowValues(data.projections, 'replacement_reserves'),
        indent: 1,
      },
      {
        id: 'total_opex',
        label: 'Total Operating Expenses',
        values: buildRowValues(data.projections, 'total_opex'),
        isSubtotal: true,
      },
    ],
  };

  // NOI Section
  const noiSection: CashFlowSection = {
    id: 'noi',
    label: 'Net Operating Income',
    rows: [
      {
        id: 'noi',
        label: 'NOI',
        values: buildRowValues(data.projections, 'noi'),
        isTotal: true,
      },
    ],
  };

  // DCF Section (PV calculations)
  const dcfSection: CashFlowSection = {
    id: 'dcf',
    label: 'Present Value Analysis',
    rows: [
      {
        id: 'pv_factor',
        label: 'PV Factor',
        values: buildRowValues(data.projections, 'pv_factor'),
      },
      {
        id: 'pv_noi',
        label: 'PV of NOI',
        values: buildRowValues(data.projections, 'pv_noi'),
        isSubtotal: true,
      },
    ],
  };

  // Add reversion to final period in DCF section
  if (data.projections.length > 0) {
    const lastPeriodId = data.projections[data.projections.length - 1].periodId;

    // Add reversion rows
    const reversionValues: Record<string, number> = {};
    reversionValues[lastPeriodId] = data.exit_analysis.net_reversion;

    const pvReversionValues: Record<string, number> = {};
    pvReversionValues[lastPeriodId] = data.exit_analysis.pv_reversion;

    dcfSection.rows.push(
      {
        id: 'net_reversion',
        label: 'Net Reversion',
        values: reversionValues,
      },
      {
        id: 'pv_reversion',
        label: 'PV of Reversion',
        values: pvReversionValues,
      }
    );
  }

  return {
    periods,
    sections: [revenueSection, expenseSection, noiSection, dcfSection],
  };
}

// ============================================================================
// AGGREGATION FUNCTIONS
// ============================================================================

interface PeriodWithMetadata extends CashFlowPeriod {
  year?: number;
  quarter?: number;
}

/**
 * Group periods by quarter and aggregate values
 */
function aggregateToQuarters(
  projections: MFDcfProjection[],
  sections: CashFlowSection[]
): { periods: CashFlowPeriod[]; sections: CashFlowSection[] } {
  // Group projections by quarter
  const quarterMap = new Map<
    string,
    { period: PeriodWithMetadata; sourceIds: string[] }
  >();

  projections.forEach((p) => {
    // Calculate fiscal quarter from month index
    const calendarQuarter = Math.ceil((((p.month - 1) % 12) + 1) / 3);
    const calendarYear = parseInt(p.periodId.split('-')[0], 10);
    const quarterKey = `${calendarYear}-Q${calendarQuarter}`;

    if (!quarterMap.has(quarterKey)) {
      quarterMap.set(quarterKey, {
        period: {
          id: quarterKey,
          label: `Q${calendarQuarter} ${calendarYear}`,
          startDate: p.periodId,
          endDate: p.periodId,
        },
        sourceIds: [],
      });
    }
    quarterMap.get(quarterKey)!.sourceIds.push(p.periodId);
    // Update end date to last month in quarter
    quarterMap.get(quarterKey)!.period.endDate = p.periodId;
  });

  const aggregatedPeriods = Array.from(quarterMap.values()).map((q) => q.period);
  const periodGroupings = Array.from(quarterMap.values()).map((q) => ({
    targetId: q.period.id,
    sourceIds: q.sourceIds,
  }));

  // Aggregate section values
  const aggregatedSections = sections.map((section) =>
    aggregateSectionValues(section, periodGroupings)
  );

  return { periods: aggregatedPeriods, sections: aggregatedSections };
}

/**
 * Group periods by year and aggregate values
 */
function aggregateToYears(
  projections: MFDcfProjection[],
  sections: CashFlowSection[]
): { periods: CashFlowPeriod[]; sections: CashFlowSection[] } {
  // Group projections by calendar year
  const yearMap = new Map<
    number,
    { period: CashFlowPeriod; sourceIds: string[] }
  >();

  projections.forEach((p) => {
    const calendarYear = parseInt(p.periodId.split('-')[0], 10);

    if (!yearMap.has(calendarYear)) {
      yearMap.set(calendarYear, {
        period: {
          id: String(calendarYear),
          label: String(calendarYear),
          startDate: p.periodId,
          endDate: p.periodId,
        },
        sourceIds: [],
      });
    }
    yearMap.get(calendarYear)!.sourceIds.push(p.periodId);
    // Update end date to last month in year
    yearMap.get(calendarYear)!.period.endDate = p.periodId;
  });

  const aggregatedPeriods = Array.from(yearMap.values()).map((y) => y.period);
  const periodGroupings = Array.from(yearMap.values()).map((y) => ({
    targetId: y.period.id,
    sourceIds: y.sourceIds,
  }));

  // Aggregate section values
  const aggregatedSections = sections.map((section) =>
    aggregateSectionValues(section, periodGroupings)
  );

  return { periods: aggregatedPeriods, sections: aggregatedSections };
}

/**
 * Sum all periods into a single "Total" column
 */
function aggregateToOverall(
  projections: MFDcfProjection[],
  sections: CashFlowSection[]
): { periods: CashFlowPeriod[]; sections: CashFlowSection[] } {
  const allSourceIds = projections.map((p) => p.periodId);

  const overallPeriod: CashFlowPeriod = {
    id: 'total',
    label: 'Total',
    startDate: projections[0]?.periodId,
    endDate: projections[projections.length - 1]?.periodId,
  };

  const periodGroupings = [{ targetId: 'total', sourceIds: allSourceIds }];

  // Aggregate section values
  const aggregatedSections = sections.map((section) =>
    aggregateSectionValues(section, periodGroupings)
  );

  return { periods: [overallPeriod], sections: aggregatedSections };
}

/**
 * Helper: Aggregate row values based on period groupings
 */
function aggregateSectionValues(
  section: CashFlowSection,
  periodGroupings: { targetId: string; sourceIds: string[] }[]
): CashFlowSection {
  const aggregatedRows: CashFlowRow[] = section.rows.map((row) => {
    const newValues: Record<string, number> = {};

    periodGroupings.forEach(({ targetId, sourceIds }) => {
      // For PV Factor, use average instead of sum
      if (row.id === 'pv_factor') {
        const values = sourceIds
          .map((id) => row.values[id])
          .filter((v) => v !== undefined && v !== 0);
        newValues[targetId] =
          values.length > 0
            ? values.reduce((sum, v) => sum + v, 0) / values.length
            : 0;
      } else {
        // Sum values from all source periods
        const sum = sourceIds.reduce((acc, sourceId) => {
          return acc + (row.values[sourceId] || 0);
        }, 0);
        newValues[targetId] = sum;
      }
    });

    return {
      ...row,
      values: newValues,
    };
  });

  return {
    ...section,
    rows: aggregatedRows,
  };
}

// ============================================================================
// MAIN AGGREGATION FUNCTION
// ============================================================================

/**
 * Aggregate MF DCF data based on selected time scale
 *
 * @param data - Raw API response with monthly periods
 * @param timeScale - Target time scale (monthly, quarterly, annual, overall)
 * @returns Transformed data for CashFlowGrid
 */
export function aggregateMFCashFlow(
  data: MFDcfMonthlyApiResponse,
  timeScale: TimeScale
): { periods: CashFlowPeriod[]; sections: CashFlowSection[] } {
  // First transform to grid format
  const { sections } = transformMFDcfToGrid(data);

  switch (timeScale) {
    case 'monthly':
      // Return as-is (just transform format)
      return transformMFDcfToGrid(data);

    case 'quarterly':
      return aggregateToQuarters(data.projections, sections);

    case 'annual':
      return aggregateToYears(data.projections, sections);

    case 'overall':
      return aggregateToOverall(data.projections, sections);

    default:
      return transformMFDcfToGrid(data);
  }
}

// ============================================================================
// VALUE FORMATTING
// ============================================================================

/**
 * Format value based on row type
 * - Currency for most values
 * - Decimal for PV Factor
 */
export function formatMFDcfValue(value: number, row: CashFlowRow): string {
  if (value === 0 || value === null || value === undefined) return '—';

  // PV Factor row shows as decimal
  if (row.id === 'pv_factor' || row.label.toLowerCase().includes('pv factor')) {
    return value.toFixed(4);
  }

  // All other values as currency
  const absValue = Math.abs(value);
  const rounded = Math.round(absValue);
  const formatted = `$${rounded.toLocaleString()}`;

  return value < 0 ? `(${formatted})` : formatted;
}

export default aggregateMFCashFlow;
