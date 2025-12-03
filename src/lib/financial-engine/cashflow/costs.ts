/**
 * Cost allocation module for land development cash flow
 *
 * Fetches budget items and distributes costs across periods
 * using existing S-curve allocation engine.
 */

import { sql } from '@/lib/db';
import type {
  BudgetAllocation,
  CostSchedule,
  PeriodValue,
  CategoryMapping,
} from './types';

// ============================================================================
// DATABASE TYPES
// ============================================================================

interface BudgetItemRow {
  fact_id: number;
  project_id: number;
  container_id: number | null;
  container_label: string | null;  // Display name from tbl_division

  // Category hierarchy
  category_l1_id: number | null;
  category_l2_id: number | null;
  category_l3_id: number | null;
  category_l4_id: number | null;

  // Description
  description: string;
  notes: string | null; // Notes/description for the line item
  activity: string | null; // Lifecycle stage

  // Amounts
  qty: number;
  rate: number;
  amount: number;

  // Timing
  start_period: number | null;
  periods_to_complete: number | null;
  end_period: number | null;
  start_date: string | null;
  end_date: string | null;
  timing_method: string | null;

  // S-curve configuration
  curve_id: string | null;
  curve_steepness: number | null;

  // Other
  escalation_rate: number | null;
  contingency_pct: number | null;
}

interface BudgetTimingRow {
  fact_id: number;
  period_id: number;
  period_sequence: number;
  amount: number;
}

interface CategoryRow {
  category_id: number;
  category_name: string;
  category_level: number;
}

// ============================================================================
// CATEGORY MAPPING
// ============================================================================

/**
 * Map activity to standardized category for cash flow display
 */
const ACTIVITY_CATEGORY_MAP: Record<string, CategoryMapping> = {
  'Acquisition': {
    activity: 'Acquisition',
    category: 'Land Acquisition',
    sortOrder: 1,
  },
  'Planning & Engineering': {
    activity: 'Planning & Engineering',
    category: 'Planning & Engineering',
    sortOrder: 2,
  },
  'Development': {
    activity: 'Development',
    category: 'Development Costs',
    sortOrder: 3,
  },
  'Operations': {
    activity: 'Operations',
    category: 'Operating Costs',
    sortOrder: 4,
  },
  'Financing': {
    activity: 'Financing',
    category: 'Financing Costs',
    sortOrder: 5,
  },
  'Disposition': {
    activity: 'Disposition',
    category: 'Disposition Costs',
    sortOrder: 6,
  },
};

/**
 * Get standardized category from activity and description
 * Contingency items are grouped separately at the bottom
 */
function getCategoryFromActivity(activity: string | null, description?: string): CategoryMapping {
  // Check if this is a Contingency item (by description or notes)
  if (description && description.toLowerCase().includes('contingency')) {
    return {
      activity: 'Contingency',
      category: 'Contingency',
      sortOrder: 98, // Just before Other Costs
    };
  }

  if (!activity) {
    return {
      activity: 'Other',
      category: 'Other Costs',
      sortOrder: 99,
    };
  }

  return (
    ACTIVITY_CATEGORY_MAP[activity] || {
      activity,
      category: activity.toUpperCase(),
      sortOrder: 50,
    }
  );
}

// ============================================================================
// BUDGET DATA FETCHING
// ============================================================================

/**
 * Fetch all budget items for a project
 */
export async function fetchBudgetItems(
  projectId: number,
  containerIds?: number[]
): Promise<BudgetItemRow[]> {
  let query;

  if (containerIds && containerIds.length > 0) {
    query = sql<BudgetItemRow>`
      SELECT
        b.fact_id,
        b.project_id,
        b.division_id as container_id,
        CASE
          WHEN d.tier = 1 THEN COALESCE(pc.tier_1_label, 'Area') || ' ' || d.display_name
          WHEN d.tier = 2 THEN COALESCE(pc.tier_2_label, 'Phase') || ' ' || d.display_name
          WHEN d.tier = 3 THEN COALESCE(pc.tier_3_label, 'Parcel') || ' ' || d.display_name
          ELSE d.display_name
        END as container_label,
        NULL::integer as category_l1_id,
        NULL::integer as category_l2_id,
        NULL::integer as category_l3_id,
        NULL::integer as category_l4_id,
        COALESCE(c.category_name, 'Uncategorized') as description,
        b.notes,
        b.activity,
        b.qty,
        b.rate,
        b.amount,
        b.start_period,
        b.periods_to_complete,
        b.end_period,
        b.start_date,
        b.end_date,
        b.timing_method,
        b.curve_id,
        b.curve_steepness,
        b.escalation_rate,
        b.contingency_pct
      FROM landscape.core_fin_fact_budget b
      LEFT JOIN landscape.core_unit_cost_category c ON b.category_id = c.category_id
      LEFT JOIN landscape.tbl_division d ON b.division_id = d.division_id
      LEFT JOIN landscape.tbl_project_config pc ON b.project_id = pc.project_id
      WHERE b.project_id = ${projectId}
        AND b.division_id = ANY(${containerIds})
        AND b.amount > 0
      ORDER BY b.activity, b.fact_id
    `;
  } else {
    query = sql<BudgetItemRow>`
      SELECT
        b.fact_id,
        b.project_id,
        b.division_id as container_id,
        CASE
          WHEN d.tier = 1 THEN COALESCE(pc.tier_1_label, 'Area') || ' ' || d.display_name
          WHEN d.tier = 2 THEN COALESCE(pc.tier_2_label, 'Phase') || ' ' || d.display_name
          WHEN d.tier = 3 THEN COALESCE(pc.tier_3_label, 'Parcel') || ' ' || d.display_name
          ELSE d.display_name
        END as container_label,
        NULL::integer as category_l1_id,
        NULL::integer as category_l2_id,
        NULL::integer as category_l3_id,
        NULL::integer as category_l4_id,
        COALESCE(c.category_name, 'Uncategorized') as description,
        b.notes,
        b.activity,
        b.qty,
        b.rate,
        b.amount,
        b.start_period,
        b.periods_to_complete,
        b.end_period,
        b.start_date,
        b.end_date,
        b.timing_method,
        b.curve_id,
        b.curve_steepness,
        b.escalation_rate,
        b.contingency_pct
      FROM landscape.core_fin_fact_budget b
      LEFT JOIN landscape.core_unit_cost_category c ON b.category_id = c.category_id
      LEFT JOIN landscape.tbl_division d ON b.division_id = d.division_id
      LEFT JOIN landscape.tbl_project_config pc ON b.project_id = pc.project_id
      WHERE b.project_id = ${projectId}
        AND b.amount > 0
      ORDER BY b.activity, b.fact_id
    `;
  }

  return await query;
}

/**
 * Fetch existing period allocations from tbl_budget_timing
 * If allocations already exist, use them instead of recalculating
 */
export async function fetchBudgetTiming(
  projectId: number,
  factIds?: number[]
): Promise<Map<number, BudgetTimingRow[]>> {
  let query;

  if (factIds && factIds.length > 0) {
    query = sql<BudgetTimingRow>`
      SELECT
        bt.fact_id,
        bt.period_id,
        cp.period_sequence,
        bt.amount
      FROM landscape.tbl_budget_timing bt
      JOIN landscape.core_fin_fact_budget fb ON bt.fact_id = fb.fact_id
      JOIN landscape.tbl_calculation_period cp ON bt.period_id = cp.period_id
      WHERE fb.project_id = ${projectId}
        AND bt.fact_id = ANY(${factIds})
      ORDER BY bt.fact_id, cp.period_sequence
    `;
  } else {
    query = sql<BudgetTimingRow>`
      SELECT
        bt.fact_id,
        bt.period_id,
        cp.period_sequence,
        bt.amount
      FROM landscape.tbl_budget_timing bt
      JOIN landscape.core_fin_fact_budget fb ON bt.fact_id = fb.fact_id
      JOIN landscape.tbl_calculation_period cp ON bt.period_id = cp.period_id
      WHERE fb.project_id = ${projectId}
      ORDER BY bt.fact_id, cp.period_sequence
    `;
  }

  const rows = await query;

  // Group by fact_id
  const timingMap = new Map<number, BudgetTimingRow[]>();

  for (const row of rows) {
    if (!timingMap.has(row.fact_id)) {
      timingMap.set(row.fact_id, []);
    }
    timingMap.get(row.fact_id)!.push(row);
  }

  return timingMap;
}

// ============================================================================
// COST ALLOCATION
// ============================================================================

/**
 * Distribute budget item across periods based on timing method
 */
export function distributeBudgetItem(
  item: BudgetItemRow,
  maxPeriods: number
): PeriodValue[] {
  const startPeriod = item.start_period || 1;
  const duration = item.periods_to_complete || 1;
  const timingMethod = item.timing_method || 'distributed';

  // Validate period range
  if (startPeriod < 1 || startPeriod > maxPeriods) {
    console.warn(`Budget item ${item.fact_id} has invalid start_period ${startPeriod}`);
    return [];
  }

  const endPeriod = Math.min(startPeriod + duration - 1, maxPeriods);
  const actualDuration = endPeriod - startPeriod + 1;

  if (actualDuration <= 0) {
    return [];
  }

  const periods: PeriodValue[] = [];

  switch (timingMethod.toLowerCase()) {
    case 'milestone':
    case 'lump':
      // All in first period
      periods.push({
        periodIndex: startPeriod - 1,
        periodSequence: startPeriod,
        amount: item.amount,
        source: 'budget',
      });
      break;

    case 'distributed':
    case 'linear':
      // Even distribution
      const perPeriod = item.amount / actualDuration;
      for (let i = 0; i < actualDuration; i++) {
        periods.push({
          periodIndex: startPeriod + i - 1,
          periodSequence: startPeriod + i,
          amount: perPeriod,
          source: 'budget',
        });
      }
      break;

    case 'curve':
      // Use S-curve distribution
      const curveAllocations = distributeByCurve(
        item.amount,
        startPeriod,
        actualDuration,
        item.curve_id || 'S',
        item.curve_steepness || 50
      );
      periods.push(...curveAllocations);
      break;

    default:
      // Default to linear
      console.warn(
        `Unknown timing method '${timingMethod}' for budget item ${item.fact_id}, using linear`
      );
      const defaultPerPeriod = item.amount / actualDuration;
      for (let i = 0; i < actualDuration; i++) {
        periods.push({
          periodIndex: startPeriod + i - 1,
          periodSequence: startPeriod + i,
          amount: defaultPerPeriod,
          source: 'budget',
        });
      }
  }

  return periods;
}

/**
 * Distribute amount using S-curve profile
 * Replicates logic from existing scurve-allocation.ts
 */
function distributeByCurve(
  amount: number,
  startPeriod: number,
  duration: number,
  curveId: string,
  steepness: number
): PeriodValue[] {
  // Standard ARGUS S-curve profiles (cumulative percentages)
  const BUILTIN_CURVES: Record<string, number[]> = {
    S: [5, 11, 19, 30, 50, 70, 81, 89, 95, 100], // Standard
    S1: [15, 28, 40, 52, 64, 75, 84, 91, 96, 100], // Front-loaded
    S2: [4, 9, 16, 25, 36, 48, 60, 72, 85, 100], // Back-loaded
    S3: [3, 8, 15, 25, 50, 75, 85, 92, 97, 100], // Bell curve
    S4: [8, 15, 23, 32, 50, 68, 77, 85, 92, 100], // Custom
  };

  // Get curve profile
  const curve = BUILTIN_CURVES[curveId] || BUILTIN_CURVES['S'];

  // Apply steepness modifier (0-100 scale)
  const modifiedCurve = applySteepness(curve, steepness);

  // Distribute amount across periods
  const periods: PeriodValue[] = [];
  let previousCumulative = 0;

  for (let i = 0; i < duration; i++) {
    // Interpolate cumulative percentage for this period
    const progress = (i + 1) / duration;
    const cumulativePct = interpolateCurve(modifiedCurve, progress);

    // Calculate incremental amount
    const incrementalPct = cumulativePct - previousCumulative;
    const periodAmount = (amount * incrementalPct) / 100;

    periods.push({
      periodIndex: startPeriod + i - 1,
      periodSequence: startPeriod + i,
      amount: periodAmount,
      source: 'budget',
    });

    previousCumulative = cumulativePct;
  }

  // Ensure total equals amount (handle rounding)
  const total = periods.reduce((sum, p) => sum + p.amount, 0);
  if (total !== amount && periods.length > 0) {
    const variance = amount - total;
    periods[periods.length - 1].amount += variance;
  }

  return periods;
}

/**
 * Apply steepness modifier to curve
 */
function applySteepness(curve: number[], steepness: number): number[] {
  // Steepness 50 = no change
  // Steepness 0 = more gradual (linear)
  // Steepness 100 = more aggressive

  if (steepness === 50) {
    return curve;
  }

  const factor = steepness / 50; // 0-2 range
  return curve.map((pct) => {
    // Apply power function to adjust curvature
    const normalized = pct / 100;
    const adjusted = Math.pow(normalized, 1 / factor);
    return adjusted * 100;
  });
}

/**
 * Interpolate cumulative percentage at a given progress point
 */
function interpolateCurve(curve: number[], progress: number): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return 100;

  // Find decile boundaries
  const decileIndex = progress * 10;
  const lowerIndex = Math.floor(decileIndex);
  const upperIndex = Math.ceil(decileIndex);

  if (lowerIndex === upperIndex) {
    return curve[lowerIndex] || 100;
  }

  // Linear interpolation between deciles
  const lowerPct = lowerIndex === 0 ? 0 : curve[lowerIndex - 1] || 0;
  const upperPct = curve[upperIndex - 1] || 100;
  const fraction = decileIndex - lowerIndex;

  return lowerPct + (upperPct - lowerPct) * fraction;
}

// ============================================================================
// COST SCHEDULE GENERATION
// ============================================================================

/**
 * Generate complete cost schedule for a project
 * @param projectId - Project ID
 * @param maxPeriods - Maximum number of periods
 * @param containerIds - Optional filter by container IDs
 * @param projectInflationRate - Project-level cost inflation rate (decimal, e.g., 0.03 for 3%)
 */
export async function generateCostSchedule(
  projectId: number,
  maxPeriods: number,
  containerIds?: number[],
  projectInflationRate?: number
): Promise<CostSchedule> {
  // Fetch budget items
  const budgetItems = await fetchBudgetItems(projectId, containerIds);

  if (budgetItems.length === 0) {
    return {
      projectId,
      totalCosts: 0,
      categorySummary: {},
      periodTotals: [],
    };
  }

  // Check if allocations already exist in database
  const existingTiming = await fetchBudgetTiming(
    projectId,
    budgetItems.map((item) => item.fact_id)
  );

  // Convert budget items to allocations
  const allocations: BudgetAllocation[] = [];

  for (const item of budgetItems) {
    // Pass notes to detect Contingency items (notes field contains "Contingency")
    const categoryMapping = getCategoryFromActivity(item.activity, item.notes || item.description);

    // Use existing timing if available, otherwise calculate
    let periods: PeriodValue[];

    if (existingTiming.has(item.fact_id)) {
      // Use existing allocations
      const timingRows = existingTiming.get(item.fact_id)!;
      periods = timingRows.map((row) => ({
        periodIndex: row.period_sequence - 1,
        periodSequence: row.period_sequence,
        amount: typeof row.amount === 'number' ? row.amount : parseFloat(row.amount),
        source: 'budget' as const,
      }));
    } else {
      // Calculate new allocations
      periods = distributeBudgetItem(item, maxPeriods);
    }

    // Calculate escalated amount using item-level or project-level inflation rate
    const baseAmount = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount);
    const startPeriod = item.start_period || 1;

    // Use item-level escalation rate if set, otherwise fall back to project-level
    // Item rates are stored as percentage (e.g., 3.0 for 3%), project rate is decimal (0.03)
    let effectiveRate: number | undefined;
    if (item.escalation_rate && item.escalation_rate > 0) {
      effectiveRate = item.escalation_rate / 100; // Convert percentage to decimal
    } else if (projectInflationRate && projectInflationRate > 0) {
      effectiveRate = projectInflationRate; // Already decimal
    }

    let totalAmount = baseAmount;
    if (effectiveRate && effectiveRate > 0) {
      // Calculate years from project start (period 1 = month 0)
      const yearsFromStart = Math.max(0, (startPeriod - 1) / 12);
      totalAmount = baseAmount * Math.pow(1 + effectiveRate, yearsFromStart);
    }

    // Also scale the period allocations by the same factor
    const escalationFactor = totalAmount / baseAmount;
    const escalatedPeriods = periods.map((p) => ({
      ...p,
      amount: p.amount * escalationFactor,
    }));

    allocations.push({
      factId: item.fact_id,
      budgetItemId: item.fact_id,
      projectId: item.project_id,
      containerId: item.container_id || undefined,
      containerLabel: item.container_label || undefined,
      category: categoryMapping.category,
      subcategory: item.description,
      description: item.description,
      totalAmount,
      startPeriod,
      periodsToComplete: item.periods_to_complete || 1,
      endPeriod: item.end_period || item.start_period || 1,
      timingMethod: (item.timing_method || 'distributed') as any,
      curveId: item.curve_id || undefined,
      curveSteepness: item.curve_steepness || undefined,
      periods: escalatedPeriods,
    });
  }

  // Group by category
  const categorySummary: CostSchedule['categorySummary'] = {};

  for (const allocation of allocations) {
    if (!categorySummary[allocation.category]) {
      categorySummary[allocation.category] = {
        total: 0,
        items: [],
      };
    }

    categorySummary[allocation.category].items.push(allocation);
    categorySummary[allocation.category].total += allocation.totalAmount;
  }

  // Calculate period totals
  const periodTotals: PeriodValue[] = [];
  const periodMap = new Map<number, number>();

  for (const allocation of allocations) {
    for (const periodValue of allocation.periods) {
      const current = periodMap.get(periodValue.periodSequence) || 0;
      periodMap.set(periodValue.periodSequence, current + periodValue.amount);
    }
  }

  // Convert map to sorted array
  for (const [periodSequence, amount] of periodMap.entries()) {
    periodTotals.push({
      periodIndex: periodSequence - 1,
      periodSequence,
      amount,
      source: 'budget',
    });
  }

  periodTotals.sort((a, b) => a.periodSequence - b.periodSequence);

  // Calculate total costs
  const totalCosts = allocations.reduce((sum, a) => sum + a.totalAmount, 0);

  return {
    projectId,
    totalCosts,
    categorySummary,
    periodTotals,
  };
}

/**
 * Get cost period values for specific category
 */
export function getCategoryPeriodValues(
  costSchedule: CostSchedule,
  category: string,
  maxPeriods: number
): PeriodValue[] {
  const categoryData = costSchedule.categorySummary[category];
  if (!categoryData) {
    return [];
  }

  const periodMap = new Map<number, number>();

  for (const item of categoryData.items) {
    for (const periodValue of item.periods) {
      const current = periodMap.get(periodValue.periodSequence) || 0;
      periodMap.set(periodValue.periodSequence, current + periodValue.amount);
    }
  }

  const periods: PeriodValue[] = [];
  for (const [periodSequence, amount] of periodMap.entries()) {
    if (periodSequence <= maxPeriods) {
      periods.push({
        periodIndex: periodSequence - 1,
        periodSequence,
        amount,
        source: 'budget',
      });
    }
  }

  return periods.sort((a, b) => a.periodSequence - b.periodSequence);
}
