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
  net_reversion: number;      // 0 for all months except last, which has the reversion
  total_cash_flow: number;    // NOI + net_reversion
  pv_factor: number;
  pv_cash_flow: number;       // total_cash_flow × pv_factor
  // Value-add renovation fields (present only when value_add_enabled)
  reno_vacancy_loss?: number;
  reno_rent_premium?: number;
  reno_capex?: number;
  relocation_cost?: number;
}

export interface MFDcfMonthlyApiResponse {
  project_id: number;
  period_type: 'monthly';
  start_date: string;
  total_periods: number;
  value_add_enabled?: boolean;
  analysis_purpose?: string;  // 'VALUATION' | 'UNDERWRITING'
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
    terminal_is_post_reno?: boolean;
    terminal_reno_premium?: number;
  };
  terminal_year?: {
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
    reno_vacancy_loss?: number;
    reno_rent_premium?: number;
    reno_capex?: number;
    relocation_cost?: number;
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
  renovation_schedule?: {
    units_to_renovate: number;
    total_reno_cost: number;
    total_relocation_cost: number;
    total_vacancy_loss: number;
    total_rent_premium: number;
    program_duration_months: number;
  };
}

// ============================================================================
// TRANSFORM TO GRID FORMAT
// ============================================================================

const toNumber = (value: number | null | undefined): number => {
  if (value == null) return 0;
  return Number.isFinite(value) ? value : 0;
};

const toNegative = (value: number | null | undefined): number => {
  const num = toNumber(value);
  return num === 0 ? 0 : -Math.abs(num);
};

const computeEgiValue = (projection: {
  gpr?: number;
  vacancy_loss?: number;
  credit_loss?: number;
  other_income?: number;
}): number => {
  return (
    toNumber(projection.gpr) +
    toNegative(projection.vacancy_loss) +
    toNegative(projection.credit_loss) +
    toNumber(projection.other_income)
  );
};

/**
 * Build the display projection window from hold period assumptions.
 * Backend may include a forward year for terminal NOI/reversion calculations;
 * the grid should only render hold period months.
 */
function getDisplayProjections(data: MFDcfMonthlyApiResponse): MFDcfProjection[] {
  const holdPeriodYears = data.assumptions?.hold_period_years ?? 10;
  const holdPeriodMonths = Math.max(1, holdPeriodYears) * 12;

  const filtered = data.projections.filter((p) => p.periodIndex <= holdPeriodMonths);

  // Fallback to all projections if periodIndex is unavailable/unexpected.
  return filtered.length > 0 ? filtered : data.projections;
}

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
    field: keyof MFDcfProjection,
    transform?: (value: number | null | undefined, projection: MFDcfProjection) => number
  ): Record<string, number> => {
    const values: Record<string, number> = {};
    projections.forEach((p) => {
      const rawValue = (p[field] as number) ?? 0;
      values[p.periodId] = transform ? transform(rawValue, p) : rawValue;
    });
    return values;
  };

  const buildComputedRowValues = (
    projections: MFDcfProjection[],
    compute: (projection: MFDcfProjection) => number
  ): Record<string, number> => {
    const values: Record<string, number> = {};
    projections.forEach((p) => {
      values[p.periodId] = compute(p);
    });
    return values;
  };

  const isValueAdd = data.value_add_enabled === true;

  // Revenue Section
  const revenueRows: CashFlowRow[] = [
    {
      id: 'gpr',
      label: 'Gross Potential Rent',
      values: buildRowValues(data.projections, 'gpr'),
    },
  ];

  // When value-add is active, GPR already reflects renovation adjustments
  // (base rent minus renovation vacancy plus renovation premium).
  // Show the components as informational sub-items.
  if (isValueAdd) {
    revenueRows.push(
      {
        id: 'reno_vacancy_loss',
        label: 'Less: Renovation Vacancy',
        values: buildRowValues(data.projections, 'reno_vacancy_loss', toNegative),
        indent: 1,
        isInformational: true,
      },
      {
        id: 'reno_rent_premium',
        label: 'Plus: Renovation Premium',
        values: buildRowValues(data.projections, 'reno_rent_premium'),
        indent: 1,
        isInformational: true,
      }
    );
  }

  revenueRows.push(
    {
      id: 'vacancy_loss',
      label: 'Less: Vacancy',
      values: buildRowValues(data.projections, 'vacancy_loss', toNegative),
      indent: 1,
    },
    {
      id: 'credit_loss',
      label: 'Less: Credit Loss',
      values: buildRowValues(data.projections, 'credit_loss', toNegative),
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
      values: buildComputedRowValues(data.projections, computeEgiValue),
      isSubtotal: true,
    }
  );

  const revenueSection: CashFlowSection = {
    id: 'revenue',
    label: 'Revenue',
    rows: revenueRows,
  };

  // Expenses Section
  const expenseRows: CashFlowRow[] = [
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
  ];

  // Insert renovation capex rows when value-add is active
  if (isValueAdd) {
    expenseRows.push(
      {
        id: 'reno_capex',
        label: 'Renovation CapEx',
        values: buildRowValues(data.projections, 'reno_capex'),
        indent: 1,
      },
      {
        id: 'relocation_cost',
        label: 'Relocation Costs',
        values: buildRowValues(data.projections, 'relocation_cost'),
        indent: 1,
      }
    );
  }

  expenseRows.push({
    id: 'total_opex',
    label: 'Total Operating Expenses',
    values: buildRowValues(data.projections, 'total_opex'),
    isSubtotal: true,
  });

  const expenseSection: CashFlowSection = {
    id: 'expenses',
    label: 'Operating Expenses',
    rows: expenseRows,
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

  // Reversion Section — Net Reversion shows only in last period
  const reversionSection: CashFlowSection = {
    id: 'reversion',
    label: 'Reversion',
    rows: [
      {
        id: 'net_reversion',
        label: 'Net Reversion',
        values: buildRowValues(data.projections, 'net_reversion'),
      },
    ],
  };

  // Total Cash Flow Section — NOI + Net Reversion
  // Label varies by analysis_purpose
  const isValuation = (data.analysis_purpose ?? 'VALUATION').toUpperCase() === 'VALUATION';
  const totalCashFlowLabel = isValuation ? 'Total Cash Flow' : 'Cash Flow Before Debt';

  const totalCashFlowSection: CashFlowSection = {
    id: 'total_cash_flow',
    label: totalCashFlowLabel,
    rows: [
      {
        id: 'total_cash_flow',
        label: totalCashFlowLabel,
        values: buildRowValues(data.projections, 'total_cash_flow'),
        isTotal: true,
      },
    ],
  };

  // Present Value Analysis Section
  const dcfSection: CashFlowSection = {
    id: 'dcf',
    label: 'Present Value Analysis',
    rows: [
      {
        id: 'pv_factor',
        label: 'PV Factor',
        values: buildRowValues(data.projections, 'pv_factor'),
        hideTotal: true,
      },
      {
        id: 'pv_cash_flow',
        label: 'PV of Cash Flow',
        values: buildRowValues(data.projections, 'pv_cash_flow'),
        isSubtotal: true,
      },
    ],
  };

  return {
    periods,
    sections: [revenueSection, expenseSection, noiSection, reversionSection, totalCashFlowSection, dcfSection],
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
 * Group periods by fiscal year and aggregate values.
 *
 * Fiscal years are 12-month spans anchored to the analysis start date
 * (valuation date). For example, a Feb 2026 start date produces:
 *   Year 1 = Feb 2026 – Jan 2027, labeled "2027" (calendar year of end)
 *   Year 2 = Feb 2027 – Jan 2028, labeled "2028"
 *   ...etc.
 *
 * This prevents partial/stub year columns that occur when grouping
 * by calendar year with a non-January start date.
 */
function aggregateToYears(
  projections: MFDcfProjection[],
  sections: CashFlowSection[]
): { periods: CashFlowPeriod[]; sections: CashFlowSection[] } {
  // Group projections by fiscal year (12-month spans from start date)
  const yearMap = new Map<
    string,
    { period: CashFlowPeriod; sourceIds: string[]; fiscalYear: number }
  >();

  projections.forEach((p) => {
    // p.year is the fiscal year number (1, 2, 3...) assigned by the backend
    // based on month index: year = Math.ceil(month / 12)
    const fiscalYear = p.year;
    const yearKey = `FY${fiscalYear}`;

    // Label: the calendar year in which the fiscal year ENDS
    // For a start month of Feb (2) with Year 1: ends Jan of next calendar year
    // End month of fiscal year N = start_month - 1 (or 12 if start_month is 1)
    // End calendar year = start_year + N if start_month > 1, else start_year + N - 1
    // Simpler: derive from the last projection in each fiscal year group
    if (!yearMap.has(yearKey)) {
      yearMap.set(yearKey, {
        period: {
          id: yearKey,
          label: '', // Will be set after grouping
          startDate: p.periodId,
          endDate: p.periodId,
        },
        sourceIds: [],
        fiscalYear,
      });
    }
    yearMap.get(yearKey)!.sourceIds.push(p.periodId);
    yearMap.get(yearKey)!.period.endDate = p.periodId;
  });

  // Now set the label for each fiscal year based on the end date
  yearMap.forEach((entry) => {
    // The endDate is the last month's periodId (e.g., "2027-01")
    // Extract calendar year from endDate for the column label
    const endYear = parseInt(entry.period.endDate!.split('-')[0], 10);
    entry.period.id = String(endYear);
    entry.period.label = String(endYear);
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
// TERMINAL YEAR (Yr N+1) COLUMN
// ============================================================================

/** Period ID used for the terminal year reference column */
const TERMINAL_PERIOD_ID = '__terminal__';

/**
 * Row-to-field mapping for the terminal_year object.
 * Maps grid row IDs to keys in the API terminal_year response.
 *
 * NOTE: net_reversion, total_cash_flow, pv_factor, and pv_cash_flow are
 * intentionally EXCLUDED — the Yr N+1 column is a reference for the terminal
 * year's revenue/expense/NOI breakdown only. Reversion is a Year N cash flow
 * event, not a Year N+1 item.
 */
const TERMINAL_ROW_FIELD_MAP: Record<string, string> = {
  gpr: 'gpr',
  reno_vacancy_loss: 'reno_vacancy_loss',
  reno_rent_premium: 'reno_rent_premium',
  vacancy_loss: 'vacancy_loss',
  credit_loss: 'credit_loss',
  other_income: 'other_income',
  egi: 'egi',
  base_opex: 'base_opex',
  management_fee: 'management_fee',
  replacement_reserves: 'replacement_reserves',
  reno_capex: 'reno_capex',
  relocation_cost: 'relocation_cost',
  total_opex: 'total_opex',
  noi: 'noi',
};

/**
 * Append the Year N+1 (terminal) reference column to aggregated grid data.
 *
 * - Adds a "Yr N+1" period at the end of the periods array.
 * - Injects the terminal_year line-item values into each row's values map.
 * - Sets explicit `row.total` excluding the terminal period so TOTAL column
 *   only reflects the hold period.
 * - Rows that don't map to a terminal field (e.g., pv_factor, pv_noi,
 *   net_reversion, pv_reversion) get no terminal value and show "—".
 */
function appendTerminalYear(
  result: { periods: CashFlowPeriod[]; sections: CashFlowSection[] },
  terminalYear: MFDcfMonthlyApiResponse['terminal_year'],
  holdPeriodYears: number,
): { periods: CashFlowPeriod[]; sections: CashFlowSection[] } {
  if (!terminalYear) return result;

  const terminalData = terminalYear as Record<string, number | undefined>;

  // Add terminal period with reference styling
  const terminalPeriod: CashFlowPeriod = {
    id: TERMINAL_PERIOD_ID,
    label: `Yr ${holdPeriodYears + 1}`,
    startDate: undefined,
    endDate: undefined,
    isReference: true,
  };

  const periods = [...result.periods, terminalPeriod];

  // Update sections: inject terminal values and pre-compute totals
  const sections = result.sections.map((section) => ({
    ...section,
    rows: section.rows.map((row) => {
      const fieldKey = TERMINAL_ROW_FIELD_MAP[row.id];

      // Compute hold-period total BEFORE adding terminal values
      const holdPeriodTotal = Object.entries(row.values)
        .filter(([key]) => key !== TERMINAL_PERIOD_ID)
        .reduce((sum, [, val]) => sum + (val || 0), 0);

      // Get terminal value (if this row maps to a terminal field)
      const terminalValue = fieldKey !== undefined
        ? (row.id === 'egi'
            ? computeEgiValue({
                gpr: terminalData.gpr,
                vacancy_loss: terminalData.vacancy_loss,
                credit_loss: terminalData.credit_loss,
                other_income: terminalData.other_income,
              })
            : ['vacancy_loss', 'credit_loss', 'reno_vacancy_loss'].includes(row.id)
              ? toNegative(terminalData[fieldKey])
              : toNumber(terminalData[fieldKey]))
        : undefined;

      const newValues = { ...row.values };
      if (terminalValue !== undefined) {
        newValues[TERMINAL_PERIOD_ID] = terminalValue;
      }

      return {
        ...row,
        values: newValues,
        // Set explicit total to exclude terminal year
        total: holdPeriodTotal,
      };
    }),
  }));

  return { periods, sections };
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
  const displayProjections = getDisplayProjections(data);
  const displayData: MFDcfMonthlyApiResponse = {
    ...data,
    projections: displayProjections,
  };

  // First transform to grid format
  const { sections } = transformMFDcfToGrid(displayData);

  let result: { periods: CashFlowPeriod[]; sections: CashFlowSection[] };

  switch (timeScale) {
    case 'monthly':
      // Return as-is (just transform format)
      result = transformMFDcfToGrid(displayData);
      break;

    case 'quarterly':
      result = aggregateToQuarters(displayProjections, sections);
      break;

    case 'annual':
      result = aggregateToYears(displayProjections, sections);
      break;

    case 'overall':
      result = aggregateToOverall(displayProjections, sections);
      break;

    default:
      result = transformMFDcfToGrid(displayData);
  }

  // Append Year N+1 terminal column for annual and quarterly views
  // (Skip for monthly — too many columns already; skip for overall — single total)
  if (
    data.terminal_year &&
    (timeScale === 'annual' || timeScale === 'quarterly')
  ) {
    result = appendTerminalYear(
      result,
      data.terminal_year,
      data.assumptions?.hold_period_years ?? 10,
    );
  }

  return result;
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
