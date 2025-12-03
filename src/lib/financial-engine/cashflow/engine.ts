/**
 * Main Cash Flow Engine for Land Development Projects
 *
 * Orchestrates cost allocation, revenue calculation, and financial metrics
 * to generate comprehensive period-by-period cash flow schedules.
 */

import { sql } from '@/lib/db';
import type {
  CashFlowSchedule,
  CashFlowEngineOptions,
  CashFlowSection,
  CashFlowLineItem,
  CashFlowSummary,
  PeriodValue,
  CalculationPeriod,
} from './types';

// Import sub-modules
import {
  fetchProjectPeriods,
  getProjectDateRange,
  aggregatePeriods,
} from './periods';
import { generateCostSchedule, getCategoryPeriodValues } from './costs';
import {
  generateAbsorptionSchedule,
  absorptionToPeriodValues,
} from './revenue';
import {
  calculateIRR,
  calculateNPV,
  calculateEquityAnalysis,
  calculateGrossProfit,
  extractCashFlows,
  combineCashFlows,
  annualizeIRR,
} from './metrics';

// ============================================================================
// PROJECT CONFIGURATION
// ============================================================================

interface ProjectConfig {
  projectId: number;
  projectName: string;
  startDate: Date;
  durationMonths: number;
  periodCount: number;
  costInflationRate?: number; // Project-level cost inflation rate (decimal, e.g., 0.03 for 3%)
}

/**
 * Fetch project configuration from database
 */
async function fetchProjectConfig(projectId: number): Promise<ProjectConfig> {
  const result = await sql<{
    project_id: number;
    project_name: string;
    analysis_start_date: string | null;
  }>`
    SELECT
      p.project_id,
      p.project_name,
      ps.analysis_start_date
    FROM landscape.tbl_project p
    LEFT JOIN landscape.tbl_project_settings ps ON p.project_id = ps.project_id
    WHERE p.project_id = ${projectId}
  `;

  if (result.length === 0) {
    throw new Error(`Project ${projectId} not found`);
  }

  const project = result[0];

  // Use project settings start date if set, otherwise default to today
  const startDate = project.analysis_start_date
    ? new Date(project.analysis_start_date)
    : new Date('2025-01-01'); // Default start date for projects without settings

  // Fetch project-level cost inflation rate from growth rate settings
  let costInflationRate: number | undefined;
  try {
    const inflationResult = await sql<{
      current_rate: number | null;
    }>`
      SELECT
        CASE
          WHEN COUNT(st.step_id) = 1 THEN MAX(st.rate)
          ELSE MAX(CASE WHEN st.step_number = 1 THEN st.rate END)
        END AS current_rate
      FROM landscape.tbl_project_settings ps
      JOIN landscape.core_fin_growth_rate_sets grs ON ps.cost_inflation_set_id = grs.set_id
      LEFT JOIN landscape.core_fin_growth_rate_steps st ON st.set_id = grs.set_id
      WHERE ps.project_id = ${projectId}
      GROUP BY grs.set_id
    `;
    if (inflationResult.length > 0 && inflationResult[0].current_rate !== null) {
      costInflationRate = Number(inflationResult[0].current_rate);
    }
  } catch (err) {
    console.warn('Could not fetch cost inflation rate:', err);
  }

  return {
    projectId: project.project_id,
    projectName: project.project_name,
    startDate,
    durationMonths: 0, // Will be determined dynamically
    periodCount: 0, // Will be determined dynamically
    costInflationRate,
  };
}

// ============================================================================
// DYNAMIC PERIOD GENERATION
// ============================================================================

/**
 * Determine required period count by scanning project data
 */
async function determineRequiredPeriods(
  projectId: number,
  containerIds?: number[]
): Promise<number> {
  // Get max period from budget items
  const budgetQuery = containerIds && containerIds.length > 0
    ? sql<{ max_period: number | null }>`
        SELECT MAX(COALESCE(end_period, start_period + COALESCE(periods_to_complete, 1) - 1)) as max_period
        FROM landscape.core_fin_fact_budget
        WHERE project_id = ${projectId}
          AND container_id = ANY(${containerIds})
      `
    : sql<{ max_period: number | null }>`
        SELECT MAX(COALESCE(end_period, start_period + COALESCE(periods_to_complete, 1) - 1)) as max_period
        FROM landscape.core_fin_fact_budget
        WHERE project_id = ${projectId}
      `;

  const budgetResult = await budgetQuery;
  const maxBudgetPeriod = budgetResult[0]?.max_period || 0;

  // Get max period from parcel sales
  const parcelQuery = containerIds && containerIds.length > 0
    ? sql<{ max_period: number | null }>`
        SELECT MAX(sale_period) as max_period
        FROM landscape.tbl_parcel
        WHERE project_id = ${projectId}
          AND (area_id = ANY(${containerIds}) OR phase_id = ANY(${containerIds}))
          AND sale_period IS NOT NULL
      `
    : sql<{ max_period: number | null }>`
        SELECT MAX(sale_period) as max_period
        FROM landscape.tbl_parcel
        WHERE project_id = ${projectId}
          AND sale_period IS NOT NULL
      `;

  const parcelResult = await parcelQuery;
  const maxSalePeriod = parcelResult[0]?.max_period || 0;

  // Return the maximum of the two, or default to 96 months
  const requiredPeriods = Math.max(maxBudgetPeriod, maxSalePeriod, 1);

  console.log(`Determined required periods: ${requiredPeriods} (budget: ${maxBudgetPeriod}, sales: ${maxSalePeriod})`);

  return requiredPeriods;
}

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Generate complete cash flow schedule for a land development project
 *
 * @param options - Configuration options for cash flow generation
 * @returns Complete cash flow schedule with periods, sections, and metrics
 */
export async function generateCashFlow(
  options: CashFlowEngineOptions
): Promise<CashFlowSchedule> {
  const {
    projectId,
    periodType = 'month',
    discountRate,
    includeFinancing = false,
    containerIds,
  } = options;

  // Step 1: Load project configuration
  const projectConfig = await fetchProjectConfig(projectId);

  // Step 2: Determine required periods and generate them dynamically
  const requiredPeriods = await determineRequiredPeriods(projectId, containerIds);

  // Generate periods from project start date
  const { generatePeriods } = await import('./periods');
  const endDate = new Date(projectConfig.startDate);
  endDate.setMonth(endDate.getMonth() + requiredPeriods);

  let periods = generatePeriods(projectConfig.startDate, endDate, 'month');
  const totalPeriods = periods.length;

  console.log(`Generated ${totalPeriods} periods from ${projectConfig.startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

  // Step 3: Aggregate periods if requested
  if (periodType !== 'month' && periods[0]?.periodType === 'month') {
    periods = aggregatePeriods(periods, periodType);
  }

  // Step 4: Generate cost schedule (with project-level inflation rate)
  console.log(`Generating cost schedule for project ${projectId} with inflation rate: ${projectConfig.costInflationRate ?? 'none'}...`);
  const costSchedule = await generateCostSchedule(
    projectId,
    totalPeriods,
    containerIds,
    projectConfig.costInflationRate
  );

  // Step 5: Generate revenue schedule
  console.log(`Generating revenue schedule for project ${projectId}...`);
  const absorptionSchedule = await generateAbsorptionSchedule(
    projectId,
    projectConfig.startDate,
    containerIds
  );

  const revenuePeriodValues = absorptionToPeriodValues(
    absorptionSchedule,
    totalPeriods
  );

  // Step 6: Build cash flow sections
  const sections: CashFlowSection[] = [];

  // Cost sections
  const costCategories = Object.keys(costSchedule.categorySummary).sort(
    (a, b) => {
      const aOrder =
        costSchedule.categorySummary[a].items[0]?.category === a ? 1 : 99;
      const bOrder =
        costSchedule.categorySummary[b].items[0]?.category === b ? 1 : 99;
      return aOrder - bOrder;
    }
  );

  let sortOrder = 1;
  for (const category of costCategories) {
    const categoryData = costSchedule.categorySummary[category];
    const categoryPeriodValues = getCategoryPeriodValues(
      costSchedule,
      category,
      totalPeriods
    );

    const lineItems: CashFlowLineItem[] = categoryData.items.map((item) => ({
      lineId: `cost-${item.factId}`,
      category: 'cost',
      subcategory: category,
      description: item.description,
      containerId: item.containerId,
      containerLabel: item.containerLabel,
      periods: item.periods.map((p) => ({
        ...p,
        amount: -p.amount, // Costs are negative
      })),
      total: -item.totalAmount,
      sourceId: item.factId,
      sourceType: 'budget',
    }));

    sections.push({
      sectionId: `cost-${category.toLowerCase().replace(/\s+/g, '-')}`,
      sectionName: category,
      lineItems,
      subtotals: categoryPeriodValues.map((p) => ({
        ...p,
        amount: -p.amount, // Costs are negative
      })),
      sectionTotal: -categoryData.total,
      sortOrder: sortOrder++,
    });
  }

  // Revenue sections
  sections.push({
    sectionId: 'revenue-gross',
    sectionName: 'GROSS REVENUE',
    lineItems: [
      {
        lineId: 'revenue-sales',
        category: 'revenue',
        subcategory: 'Parcel Sales',
        description: 'Gross Parcel Sales Revenue',
        periods: revenuePeriodValues.grossRevenue,
        total: absorptionSchedule.totalGrossRevenue,
        sourceType: 'parcel',
      },
    ],
    subtotals: revenuePeriodValues.grossRevenue,
    sectionTotal: absorptionSchedule.totalGrossRevenue,
    sortOrder: sortOrder++,
  });

  sections.push({
    sectionId: 'revenue-deductions',
    sectionName: 'REVENUE DEDUCTIONS',
    lineItems: [
      {
        lineId: 'revenue-commissions',
        category: 'revenue',
        subcategory: 'Sales Commissions',
        description: 'Sales Commissions (3%)',
        periods: revenuePeriodValues.commissions,
        total: -absorptionSchedule.totalCommissions,
        sourceType: 'calculated',
      },
      {
        lineId: 'revenue-closing-costs',
        category: 'revenue',
        subcategory: 'Closing Costs',
        description: 'Closing Costs',
        periods: revenuePeriodValues.closingCosts,
        total: -absorptionSchedule.totalClosingCosts,
        sourceType: 'calculated',
      },
    ],
    subtotals: combinePeriodValues([
      revenuePeriodValues.commissions,
      revenuePeriodValues.closingCosts,
    ]),
    sectionTotal: -(
      absorptionSchedule.totalCommissions + absorptionSchedule.totalClosingCosts
    ),
    sortOrder: sortOrder++,
  });

  sections.push({
    sectionId: 'revenue-net',
    sectionName: 'NET REVENUE',
    lineItems: [
      {
        lineId: 'revenue-net',
        category: 'revenue',
        subcategory: 'Net Revenue',
        description: 'Net Parcel Sales Revenue',
        periods: revenuePeriodValues.netRevenue,
        total: absorptionSchedule.totalNetRevenue,
        sourceType: 'calculated',
      },
    ],
    subtotals: revenuePeriodValues.netRevenue,
    sectionTotal: absorptionSchedule.totalNetRevenue,
    sortOrder: sortOrder++,
  });

  // Step 7: Calculate summary metrics
  const summary = calculateSummaryMetrics(
    sections,
    periods,
    absorptionSchedule,
    costSchedule,
    discountRate
  );

  // Step 8: Return complete schedule
  return {
    projectId,
    scenarioId: options.scenarioId,
    generatedAt: new Date(),
    periodType,
    startDate: periods[0]?.startDate || projectConfig.startDate,
    endDate: periods[periods.length - 1]?.endDate || new Date(),
    totalPeriods: periods.length,
    discountRate,
    includeFinancing,
    periods,
    sections,
    summary,
    calculationVersion: '1.0.0',
  };
}

// ============================================================================
// SUMMARY CALCULATIONS
// ============================================================================

/**
 * Calculate summary metrics for cash flow
 */
function calculateSummaryMetrics(
  sections: CashFlowSection[],
  periods: CalculationPeriod[],
  absorptionSchedule: any,
  costSchedule: any,
  discountRate?: number
): CashFlowSummary {
  // Revenue summary
  const totalGrossRevenue = absorptionSchedule.totalGrossRevenue;
  const totalRevenueDeductions =
    absorptionSchedule.totalCommissions + absorptionSchedule.totalClosingCosts;
  const totalNetRevenue = absorptionSchedule.totalNetRevenue;

  // Cost summary by category
  const costsByCategory = {
    acquisition: 0,
    planning: 0,
    development: 0,
    soft: 0,
    financing: 0,
    contingency: 0,
    other: 0,
  };

  for (const category in costSchedule.categorySummary) {
    const amount = costSchedule.categorySummary[category].total;

    if (category.includes('ACQUISITION')) {
      costsByCategory.acquisition += amount;
    } else if (category.includes('PLANNING') || category.includes('ENGINEERING')) {
      costsByCategory.planning += amount;
    } else if (category.includes('DEVELOPMENT')) {
      costsByCategory.development += amount;
    } else if (category.includes('FINANCING')) {
      costsByCategory.financing += amount;
    } else if (category.includes('CONTINGENCY')) {
      costsByCategory.contingency += amount;
    } else {
      costsByCategory.other += amount;
    }
  }

  const totalCosts = costSchedule.totalCosts;

  // Profitability
  const { grossProfit, grossMargin } = calculateGrossProfit(
    totalNetRevenue,
    totalCosts
  );

  // Build net cash flow array
  const netCashFlowByPeriod = buildNetCashFlowArray(sections, periods.length);
  const cashFlowArray = extractCashFlows(netCashFlowByPeriod);

  // Calculate IRR
  let irr: number | undefined;
  let npv: number | undefined;

  try {
    const irrResult = calculateIRR(cashFlowArray);
    if (irrResult.converged) {
      // Annualize if monthly periods
      irr = annualizeIRR(irrResult.irr, periods[0]?.periodType || 'month');
    }
  } catch (error) {
    console.warn('IRR calculation failed:', error);
  }

  // Calculate NPV if discount rate provided
  if (discountRate !== undefined) {
    try {
      const npvResult = calculateNPV(
        cashFlowArray,
        discountRate,
        periods[0]?.periodType || 'month'
      );
      npv = npvResult.npv;
    } catch (error) {
      console.warn('NPV calculation failed:', error);
    }
  }

  // Equity analysis
  const equityAnalysis = calculateEquityAnalysis(
    cashFlowArray,
    periods.map((p) => p.startDate)
  );

  return {
    totalGrossRevenue,
    totalRevenueDeductions,
    totalNetRevenue,
    totalCosts,
    costsByCategory,
    grossProfit,
    grossMargin,
    irr,
    npv,
    equityMultiple: equityAnalysis.equityMultiple,
    peakEquity: equityAnalysis.peakEquity,
    paybackPeriod:
      equityAnalysis.paybackPeriod >= 0 ? equityAnalysis.paybackPeriod : undefined,
    totalCashIn: equityAnalysis.totalProceeds,
    totalCashOut: equityAnalysis.totalInvestment,
    netCashFlow: equityAnalysis.totalProceeds - equityAnalysis.totalInvestment,
    cumulativeCashFlow: calculateCumulativeArray(netCashFlowByPeriod),
  };
}

/**
 * Build net cash flow array by period
 */
function buildNetCashFlowArray(
  sections: CashFlowSection[],
  periodCount: number
): PeriodValue[] {
  const periodMap = new Map<number, number>();

  // Initialize all periods to zero
  for (let i = 0; i < periodCount; i++) {
    periodMap.set(i + 1, 0); // 1-based sequence
  }

  // Sum all line items across all sections
  for (const section of sections) {
    for (const lineItem of section.lineItems) {
      for (const periodValue of lineItem.periods) {
        const current = periodMap.get(periodValue.periodSequence) || 0;
        periodMap.set(periodValue.periodSequence, current + periodValue.amount);
      }
    }
  }

  // Convert to array
  const netCashFlow: PeriodValue[] = [];
  for (const [periodSequence, amount] of periodMap.entries()) {
    netCashFlow.push({
      periodIndex: periodSequence - 1,
      periodSequence,
      amount,
      source: 'calculated',
    });
  }

  return netCashFlow.sort((a, b) => a.periodSequence - b.periodSequence);
}

/**
 * Calculate cumulative cash flow array
 */
function calculateCumulativeArray(periodValues: PeriodValue[]): number[] {
  const cumulative: number[] = [];
  let sum = 0;

  for (const pv of periodValues) {
    sum += pv.amount;
    cumulative.push(sum);
  }

  return cumulative;
}

/**
 * Combine multiple period value arrays
 */
function combinePeriodValues(arrays: PeriodValue[][]): PeriodValue[] {
  const periodMap = new Map<number, number>();

  for (const array of arrays) {
    for (const pv of array) {
      const current = periodMap.get(pv.periodSequence) || 0;
      periodMap.set(pv.periodSequence, current + pv.amount);
    }
  }

  const combined: PeriodValue[] = [];
  for (const [periodSequence, amount] of periodMap.entries()) {
    combined.push({
      periodIndex: periodSequence - 1,
      periodSequence,
      amount,
      source: 'calculated',
    });
  }

  return combined.sort((a, b) => a.periodSequence - b.periodSequence);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { fetchProjectConfig };
export type { ProjectConfig };
