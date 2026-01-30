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
// DCF ASSUMPTIONS (from tbl_dcf_analysis)
// ============================================================================

interface DcfAssumptions {
  projectId: number;
  discountRate: number;
  priceGrowthRate: number;      // Annual rate (decimal, e.g., 0.03 for 3%)
  costInflationRate: number;    // Annual rate (decimal, e.g., 0.03 for 3%)
  sellingCostsPct: number;      // As decimal (e.g., 0.03 for 3%)
  priceGrowthSetId?: number | null;
  costInflationSetId?: number | null;
}

/**
 * Fetch DCF assumptions from tbl_dcf_analysis.
 * Returns null if no DCF record exists.
 */
async function fetchDcfAssumptions(projectId: number): Promise<DcfAssumptions | null> {
  const djangoApiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

  try {
    const response = await fetch(
      `${djangoApiUrl}/api/valuation/dcf-analysis/${projectId}/`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      console.log(`[CashFlow] No DCF assumptions for project ${projectId}, using fallbacks`);
      return null;
    }

    const data = await response.json();

    return {
      projectId,
      discountRate: parseFloat(data.discount_rate) || 0,
      priceGrowthRate: parseFloat(data.price_growth_rate) || 0,
      costInflationRate: parseFloat(data.cost_inflation_rate) || 0,
      sellingCostsPct: parseFloat(data.selling_costs_pct) || 0,
      priceGrowthSetId: data.price_growth_set_id,
      costInflationSetId: data.cost_inflation_set_id,
    };
  } catch (err) {
    console.warn(`[CashFlow] Error fetching DCF assumptions for project ${projectId}:`, err);
    return null;
  }
}

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
  priceGrowthRate?: number;   // Price growth rate from DCF (decimal, e.g., 0.03 for 3%)
  discountRate?: number;      // Discount rate from DCF (decimal, e.g., 0.18 for 18%)
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
      p.analysis_start_date
    FROM landscape.tbl_project p
    WHERE p.project_id = ${projectId}
  `;

  if (result.length === 0) {
    throw new Error(`Project ${projectId} not found`);
  }

  const project = result[0];

  // Use project settings start date if set, otherwise default to Jan 1, 2025
  // IMPORTANT: Use explicit year/month/day constructor to avoid timezone issues
  // new Date('2025-01-01') creates UTC midnight which becomes Dec 31 in Pacific time
  let startDate: Date;
  if (project.analysis_start_date) {
    const rawDate = project.analysis_start_date;

    // Handle Date object, string, or other formats from database
    if (rawDate instanceof Date) {
      startDate = rawDate;
    } else if (typeof rawDate === 'string') {
      // Handle both ISO timestamp and date-only string formats
      if (rawDate.includes('T')) {
        startDate = new Date(rawDate);
      } else {
        startDate = new Date(rawDate + 'T12:00:00');
      }
    } else {
      // Try to coerce to Date
      startDate = new Date(rawDate);
    }

    // Validate the parsed date
    if (isNaN(startDate.getTime())) {
      console.warn(`[CashFlow] Invalid analysis_start_date "${rawDate}", falling back to default`);
      startDate = new Date(2025, 0, 1, 12, 0, 0);
    }
  } else {
    startDate = new Date(2025, 0, 1, 12, 0, 0); // Jan 1, 2025 at noon local time
  }

  // PRIORITY 1: Try to get inflation rates from DCF assumptions (tbl_dcf_analysis)
  let costInflationRate: number | undefined;
  let priceGrowthRate: number | undefined;
  let discountRate: number | undefined;

  const dcfAssumptions = await fetchDcfAssumptions(projectId);

  if (dcfAssumptions) {
    // Use DCF assumptions as primary source
    // Check for set_id to determine if rate was explicitly configured (even if 0%)
    if (dcfAssumptions.costInflationSetId !== null && dcfAssumptions.costInflationSetId !== undefined) {
      costInflationRate = dcfAssumptions.costInflationRate;
    }
    if (dcfAssumptions.priceGrowthSetId !== null && dcfAssumptions.priceGrowthSetId !== undefined) {
      priceGrowthRate = dcfAssumptions.priceGrowthRate;
    }
    // Always use discount rate from DCF assumptions if present
    if (dcfAssumptions.discountRate !== undefined && dcfAssumptions.discountRate > 0) {
      discountRate = dcfAssumptions.discountRate;
    }
  }

  // PRIORITY 2: Fallback to tbl_project_settings if DCF doesn't have cost inflation
  if (costInflationRate === undefined) {
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
      console.warn('Could not fetch cost inflation rate from project settings:', err);
    }
  }

  return {
    projectId: project.project_id,
    projectName: project.project_name,
    startDate,
    durationMonths: 0, // Will be determined dynamically
    periodCount: 0, // Will be determined dynamically
    costInflationRate,
    priceGrowthRate,
    discountRate,
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
          AND division_id = ANY(${containerIds})
      `
    : sql<{ max_period: number | null }>`
        SELECT MAX(COALESCE(end_period, start_period + COALESCE(periods_to_complete, 1) - 1)) as max_period
        FROM landscape.core_fin_fact_budget
        WHERE project_id = ${projectId}
      `;

  const budgetResult = await budgetQuery;
  const maxBudgetPeriod = budgetResult[0]?.max_period || 0;

  // Get max period from parcel sales
  // containerIds are division_ids (tier 2 = phases) - need to join through tbl_phase to match
  const parcelQuery = containerIds && containerIds.length > 0
    ? sql<{ max_period: number | null }>`
        SELECT MAX(p.sale_period) as max_period
        FROM landscape.tbl_parcel p
        LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
        LEFT JOIN landscape.tbl_division d_phase
          ON ph.phase_name = d_phase.display_name
          AND ph.project_id = d_phase.project_id
          AND d_phase.tier = 2
        WHERE p.project_id = ${projectId}
          AND d_phase.division_id = ANY(${containerIds})
          AND p.sale_period IS NOT NULL
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
    discountRate: optionsDiscountRate,
    includeFinancing = false,
    containerIds,
  } = options;

  // Step 1: Load project configuration
  const projectConfig = await fetchProjectConfig(projectId);

  // Use discount rate from options, or fallback to DCF assumptions
  const discountRate = optionsDiscountRate ?? projectConfig.discountRate;

  // Step 2: Determine required periods and generate them dynamically
  const requiredPeriods = await determineRequiredPeriods(projectId, containerIds);

  // Generate periods from project start date
  const { generatePeriods } = await import('./periods');
  const endDate = new Date(projectConfig.startDate);
  endDate.setMonth(endDate.getMonth() + requiredPeriods);

  let periods = generatePeriods(projectConfig.startDate, endDate, 'month');
  const totalPeriods = periods.length;

  // Step 3: Aggregate periods if requested
  if (periodType !== 'month' && periods[0]?.periodType === 'month') {
    periods = aggregatePeriods(periods, periodType);
  }

  // Step 4: Generate cost schedule (with project-level inflation rate)
  const costSchedule = await generateCostSchedule(
    projectId,
    totalPeriods,
    containerIds,
    projectConfig.costInflationRate
  );

  // Step 5: Generate revenue schedule
  const absorptionSchedule = await generateAbsorptionSchedule(
    projectId,
    projectConfig.startDate,
    containerIds,
    projectConfig.priceGrowthRate,
    projectConfig.costInflationRate
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

  // Revenue sections - create line items by container for phase grouping
  // Group parcel sales by container (phase)
  const revenueByContainer = new Map<number | undefined, {
    containerId?: number;
    containerLabel?: string;
    grossRevenue: number;
    netRevenue: number;
    subdivisionCosts: number;
    periodValues: Map<number, { gross: number; net: number; subdivision: number }>;
  }>();

  for (const periodSale of absorptionSchedule.periodSales) {
    for (const parcel of periodSale.parcels) {
      const containerId = parcel.containerId;

      if (!revenueByContainer.has(containerId)) {
        revenueByContainer.set(containerId, {
          containerId,
          containerLabel: undefined, // Will be fetched later if needed
          grossRevenue: 0,
          netRevenue: 0,
          subdivisionCosts: 0,
          periodValues: new Map(),
        });
      }

      const containerData = revenueByContainer.get(containerId)!;
      containerData.grossRevenue += parcel.grossRevenue;
      containerData.netRevenue += parcel.netRevenue;
      containerData.subdivisionCosts += parcel.subdivisionCosts;

      // Add to period values
      const periodIdx = periodSale.periodIndex;
      if (!containerData.periodValues.has(periodIdx)) {
        containerData.periodValues.set(periodIdx, { gross: 0, net: 0, subdivision: 0 });
      }
      const pv = containerData.periodValues.get(periodIdx)!;
      pv.gross += parcel.grossRevenue;
      pv.net += parcel.netRevenue;
      pv.subdivision += parcel.subdivisionCosts;
    }
  }

  // Fetch container labels (phase names)
  const containerIds_list = Array.from(revenueByContainer.keys()).filter((id): id is number => id !== undefined);
  if (containerIds_list.length > 0) {
    const containerLabels = await sql<{ phase_id: number; phase_name: string }>`
      SELECT phase_id, phase_name
      FROM landscape.tbl_phase
      WHERE phase_id = ANY(${containerIds_list})
    `;
    for (const row of containerLabels) {
      const containerData = revenueByContainer.get(row.phase_id);
      if (containerData) {
        containerData.containerLabel = row.phase_name;
      }
    }
  }

  // Create gross revenue line items by container
  const grossRevenueLineItems: CashFlowLineItem[] = [];
  for (const [containerId, data] of revenueByContainer) {
    const periods: PeriodValue[] = [];
    for (const [periodIdx, values] of data.periodValues) {
      periods.push({
        periodIndex: periodIdx,
        periodSequence: periodIdx + 1,
        amount: values.gross,
        source: 'absorption',
      });
    }
    periods.sort((a, b) => a.periodIndex - b.periodIndex);

    grossRevenueLineItems.push({
      lineId: `revenue-gross-${containerId ?? 'project'}`,
      category: 'revenue',
      subcategory: 'Parcel Sales',
      description: data.containerLabel || 'Project Level',
      containerId: data.containerId,
      containerLabel: data.containerLabel,
      periods,
      total: data.grossRevenue,
      sourceType: 'parcel',
    });
  }

  // Sort by container label
  grossRevenueLineItems.sort((a, b) => (a.containerLabel || '').localeCompare(b.containerLabel || ''));

  sections.push({
    sectionId: 'revenue-gross',
    sectionName: 'GROSS REVENUE',
    lineItems: grossRevenueLineItems,
    subtotals: revenuePeriodValues.grossRevenue,
    sectionTotal: absorptionSchedule.totalGrossRevenue,
    sortOrder: sortOrder++,
  });

  // Revenue Deductions = Subdivision Costs ONLY
  // Commissions and closing costs are already deducted in net_sale_proceeds
  const subdivisionCosts = absorptionSchedule.totalSubdivisionCosts;

  // Create period values for subdivision costs proportional to gross revenue
  const deductionPeriods: PeriodValue[] = [];
  if (subdivisionCosts > 0 && absorptionSchedule.totalGrossRevenue > 0) {
    for (const grossPeriod of revenuePeriodValues.grossRevenue) {
      const proportion = grossPeriod.amount / absorptionSchedule.totalGrossRevenue;
      deductionPeriods.push({
        periodIndex: grossPeriod.periodIndex,
        periodSequence: grossPeriod.periodSequence,
        amount: -(subdivisionCosts * proportion), // negative because it's a deduction
        source: 'calculated',
      });
    }
  }

  // Create deduction line items by container
  const deductionLineItems: CashFlowLineItem[] = [];
  for (const [containerId, data] of revenueByContainer) {
    if (data.subdivisionCosts > 0) {
      const periods: PeriodValue[] = [];
      for (const [periodIdx, values] of data.periodValues) {
        if (values.subdivision > 0) {
          periods.push({
            periodIndex: periodIdx,
            periodSequence: periodIdx + 1,
            amount: -values.subdivision, // negative because it's a deduction
            source: 'calculated',
          });
        }
      }
      periods.sort((a, b) => a.periodIndex - b.periodIndex);

      deductionLineItems.push({
        lineId: `revenue-deduction-${containerId ?? 'project'}`,
        category: 'revenue',
        subcategory: 'Revenue Deductions',
        description: data.containerLabel || 'Project Level',
        containerId: data.containerId,
        containerLabel: data.containerLabel,
        periods,
        total: -data.subdivisionCosts,
        sourceType: 'calculated',
      });
    }
  }

  // Sort by container label
  deductionLineItems.sort((a, b) => (a.containerLabel || '').localeCompare(b.containerLabel || ''));

  sections.push({
    sectionId: 'revenue-deductions',
    sectionName: 'REVENUE DEDUCTIONS',
    lineItems: deductionLineItems,
    subtotals: deductionPeriods,
    sectionTotal: -subdivisionCosts,
    sortOrder: sortOrder++,
  });

  // Net Revenue = Gross Revenue - Subdivision Costs
  const netRevenue = absorptionSchedule.totalGrossRevenue - subdivisionCosts;

  // Create period values for net revenue (gross - subdivision costs per period)
  const netRevenuePeriods: PeriodValue[] = [];
  for (let i = 0; i < revenuePeriodValues.grossRevenue.length; i++) {
    const grossPeriod = revenuePeriodValues.grossRevenue[i];
    const deductionPeriod = deductionPeriods[i];
    netRevenuePeriods.push({
      periodIndex: grossPeriod.periodIndex,
      periodSequence: grossPeriod.periodSequence,
      amount: grossPeriod.amount + (deductionPeriod?.amount || 0), // deduction is already negative
      source: 'calculated',
    });
  }

  // Create net revenue line items by container
  const netRevenueLineItems: CashFlowLineItem[] = [];
  for (const [containerId, data] of revenueByContainer) {
    const periods: PeriodValue[] = [];
    for (const [periodIdx, values] of data.periodValues) {
      periods.push({
        periodIndex: periodIdx,
        periodSequence: periodIdx + 1,
        amount: values.gross - values.subdivision, // net = gross - subdivision costs
        source: 'calculated',
      });
    }
    periods.sort((a, b) => a.periodIndex - b.periodIndex);

    netRevenueLineItems.push({
      lineId: `revenue-net-${containerId ?? 'project'}`,
      category: 'revenue',
      subcategory: 'Net Revenue',
      description: data.containerLabel || 'Project Level',
      containerId: data.containerId,
      containerLabel: data.containerLabel,
      periods,
      total: data.grossRevenue - data.subdivisionCosts,
      sourceType: 'calculated',
    });
  }

  // Sort by container label
  netRevenueLineItems.sort((a, b) => (a.containerLabel || '').localeCompare(b.containerLabel || ''));

  sections.push({
    sectionId: 'revenue-net',
    sectionName: 'NET REVENUE',
    lineItems: netRevenueLineItems,
    subtotals: netRevenuePeriods,
    sectionTotal: netRevenue,
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
  // Revenue Deductions = Subdivision Costs ONLY
  const totalRevenueDeductions = absorptionSchedule.totalSubdivisionCosts;
  // Net Revenue = Gross Revenue - Subdivision Costs
  const totalNetRevenue = totalGrossRevenue - totalRevenueDeductions;

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
    const categoryUpper = category.toUpperCase();

    if (categoryUpper.includes('ACQUISITION')) {
      costsByCategory.acquisition += amount;
    } else if (categoryUpper.includes('PLANNING') || categoryUpper.includes('ENGINEERING')) {
      costsByCategory.planning += amount;
    } else if (categoryUpper.includes('DEVELOPMENT')) {
      costsByCategory.development += amount;
    } else if (categoryUpper.includes('FINANCING')) {
      costsByCategory.financing += amount;
    } else if (categoryUpper.includes('CONTINGENCY')) {
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

  // Build net cash flow array using only cost items + net revenue (avoids double-counting gross/deductions)
  const netCashFlowByPeriod = buildNetCashFlowArray(
    sections,
    periods.length,
    (lineItem) =>
      lineItem.category === 'cost' ||
      (lineItem.category === 'revenue' && lineItem.subcategory === 'Net Revenue')
  );
  const cashFlowArray = extractCashFlows(netCashFlowByPeriod);
  const logFlag = (process.env.CASH_FLOW_DEBUG ?? '').toLowerCase();
  const shouldLogCashFlows = logFlag === 'true' || logFlag === '1';
  if (shouldLogCashFlows) {
    logCashFlowComparisons(periods, netCashFlowByPeriod);
  }

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
  periodCount: number,
  lineFilter: (lineItem: CashFlowLineItem) => boolean = () => true
): PeriodValue[] {
  const periodMap = new Map<number, number>();

  // Initialize all periods to zero
  for (let i = 0; i < periodCount; i++) {
    periodMap.set(i + 1, 0); // 1-based sequence
  }

  // Sum all line items across all sections
  for (const section of sections) {
    for (const lineItem of section.lineItems) {
      if (!lineFilter(lineItem)) {
        continue;
      }
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

function logCashFlowComparisons(
  periods: CalculationPeriod[],
  periodValues: PeriodValue[]
) {
  const monthlyData = periodValues.map((pv) => ({
    periodSequence: pv.periodSequence,
    label: periods[pv.periodIndex]?.label ?? `Period ${pv.periodSequence}`,
    amount: pv.amount,
  }));

  const annualMap = new Map<number, number>();

  periodValues.forEach((pv) => {
    const period = periods[pv.periodIndex];
    if (!period) return;
    const year = period.startDate.getFullYear();
    annualMap.set(year, (annualMap.get(year) || 0) + pv.amount);
  });

  const annualData = Array.from(annualMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, amount]) => ({ year, amount }));

  console.log('[CashFlow][DEBUG] Monthly net cash flows:', monthlyData);
  console.log('[CashFlow][DEBUG] Annual net cash flows:', annualData);
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
