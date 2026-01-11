/**
 * GET /api/projects/[projectId]/validation-report
 *
 * Development debugging endpoint that returns project data in a format
 * that mirrors the Peoria Lakes Excel "Project Costs" layout.
 *
 * This is used for validating app calculations against the Excel source.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { ValidationReportData, PhaseData, OtherLandParcel } from '@/types/validation-report';


// ============================================================================
// DATABASE QUERY INTERFACES
// ============================================================================

interface ProjectRow {
  project_id: number;
  project_name: string;
}

interface PhaseStatsRow {
  phase_id: number | null;
  phase_name: string;
  total_acres: number;
  total_lots: number;
  total_front_feet: number;
  parcel_count: number;
}

interface PhasePricingRow {
  phase_id: number | null;
  avg_price_per_ff: number;
  gross_revenue: number;
  improvement_offset_total: number;
  total_commissions: number;
  closing_cost_per_lot: number;
  total_closing_costs: number;
  net_revenue: number;
}

interface OtherLandRow {
  phase_id: number | null;
  phase_name: string;
  parcel_code: string;
  type_code: string;
  units_total: number;
  acres_gross: number;
  price_per_unit: number;
  gross_parcel_price: number;
  improvement_offset_total: number;
  commission_amount: number;
  net_sale_proceeds: number;
}

interface PhaseScheduleRow {
  phase_id: number | null;
  first_sale_period: number | null;
  last_sale_period: number | null;
}

interface PhaseBudgetRow {
  phase_id: number | null;
  activity: string | null;
  total_amount: number;
  start_period: number | null;
  mid_period: number | null;
}

interface TransactionCostBenchmark {
  benchmark_type: string;
  rate_pct: number | null;
  fixed_amount: number | null;
}

interface AcquisitionRow {
  total_acquisition: number;
}

interface PhaseAcresRow {
  phase_id: number | null;
  phase_name: string;
  total_acres: number;
}

interface CostInflationRow {
  current_rate: number | null;
}

interface ParcelSalePeriodRow {
  parcel_id: number;
  phase_id: number | null;
  sale_period: number | null;
}

interface ParcelSubdivisionCostRow {
  phase_id: number | null;
  phase_name: string;
  price_uom: string | null;
  sale_period: number | null;
  lot_width: number | null;
  units_total: number | null;
  improvement_offset_per_uom: number | null;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

type Params = { params: Promise<{ projectId: string }> };

export async function GET(
  request: NextRequest,
  context: Params
) {
  const startTime = Date.now();

  try {
    const { projectId: projId } = await context.params;
    const projectId = parseInt(projId, 10);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // 1. Fetch project info
    const projectRows = await sql<ProjectRow>`
      SELECT project_id, project_name
      FROM landscape.tbl_project
      WHERE project_id = ${projectId}
    `;

    if (projectRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const project = projectRows[0];

    // 2. Fetch phase stats for SFD lots only (acres, lots, front feet, parcel count)
    const phaseStats = await sql<PhaseStatsRow>`
      SELECT
        ph.phase_id,
        COALESCE(ph.phase_name, 'Unassigned') as phase_name,
        COALESCE(SUM(p.acres_gross), 0)::numeric as total_acres,
        COALESCE(SUM(p.units_total), 0)::integer as total_lots,
        COALESCE(SUM(p.units_total * COALESCE(p.lot_width, 0)), 0)::numeric as total_front_feet,
        COUNT(DISTINCT p.parcel_id)::integer as parcel_count
      FROM landscape.tbl_parcel p
      LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
      WHERE p.project_id = ${projectId}
        AND p.units_total > 0
        AND p.type_code IN ('SFD', 'SFA')
      GROUP BY ph.phase_id, ph.phase_name
      ORDER BY ph.phase_id NULLS LAST
    `;

    // 3. Fetch phase pricing/revenue data for SFD lots only
    // Note: closing costs now come from global benchmarks, not parcel-level data
    // improvement_offset totals are recalculated below using base per-UOM values to respect current inflation settings
    const phasePricing = await sql<PhasePricingRow>`
      SELECT
        p.phase_id,
        CASE
          WHEN COALESCE(SUM(p.units_total * COALESCE(p.lot_width, 0)), 0) > 0
          THEN COALESCE(SUM(psa.gross_parcel_price), 0) / SUM(p.units_total * COALESCE(p.lot_width, 0))
          ELSE 0
        END::numeric as avg_price_per_ff,
        COALESCE(SUM(psa.gross_parcel_price), 0)::numeric as gross_revenue,
        COALESCE(SUM(psa.improvement_offset_total), 0)::numeric as improvement_offset_total,
        COALESCE(SUM(psa.commission_amount), 0)::numeric as total_commissions,
        0::numeric as closing_cost_per_lot,
        0::numeric as total_closing_costs,
        COALESCE(SUM(psa.net_sale_proceeds), 0)::numeric as net_revenue
      FROM landscape.tbl_parcel p
      LEFT JOIN landscape.tbl_parcel_sale_assumptions psa ON p.parcel_id = psa.parcel_id
      WHERE p.project_id = ${projectId}
        AND p.units_total > 0
        AND p.type_code IN ('SFD', 'SFA')
      GROUP BY p.phase_id
    `;

    // 3a. Fetch transaction cost benchmarks (global or project-specific)
    // Priority: project-specific > global, must be active
    const transactionBenchmarks = await sql<TransactionCostBenchmark>`
      SELECT DISTINCT ON (benchmark_type)
        benchmark_type,
        rate_pct,
        fixed_amount
      FROM landscape.tbl_sale_benchmarks
      WHERE is_active = true
        AND benchmark_type IN ('closing', 'legal', 'title_insurance')
        AND (project_id = ${projectId} OR project_id IS NULL)
      ORDER BY benchmark_type, project_id NULLS LAST
    `;

    // 3a1. Fetch improvement offset benchmark (used when per-UOM is not stored on parcel)
    // Priority: project-specific with value > project-specific without > global
    const improvementOffsetBenchmark = await sql`
      SELECT
        benchmark_id,
        amount_per_uom,
        fixed_amount,
        uom_code,
        scope_level
      FROM landscape.tbl_sale_benchmarks
      WHERE is_active = true
        AND benchmark_type = 'improvement_offset'
        AND (project_id = ${projectId} OR project_id IS NULL)
      ORDER BY
        project_id NULLS LAST,
        scope_level = 'project' DESC,
        amount_per_uom NULLS LAST
      LIMIT 1
    `;
    // Use amount_per_uom (primary) or fixed_amount (fallback)
    const benchmarkImprovementOffsetPerUom =
      Number(improvementOffsetBenchmark[0]?.amount_per_uom) ||
      Number(improvementOffsetBenchmark[0]?.fixed_amount) ||
      0;

    // 3a2. Fetch project cost inflation rate
    const costInflationRows = await sql<CostInflationRow>`
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
    const costInflationRate = Number(costInflationRows[0]?.current_rate) || 0;

    // 3a3. Fetch parcel sale periods for SFD parcels (needed for inflation calculation)
    const parcelSalePeriods = await sql<ParcelSalePeriodRow>`
      SELECT
        p.parcel_id,
        p.phase_id,
        p.sale_period
      FROM landscape.tbl_parcel p
      WHERE p.project_id = ${projectId}
        AND p.units_total > 0
        AND p.type_code IN ('SFD', 'SFA')
        AND p.sale_period IS NOT NULL
    `;

    // Build a map of phase_id -> array of sale periods for inflation calculation
    const phaseSalePeriods = new Map<number | null, number[]>();
    for (const row of parcelSalePeriods) {
      const periods = phaseSalePeriods.get(row.phase_id) || [];
      if (row.sale_period !== null) {
        periods.push(row.sale_period);
      }
      phaseSalePeriods.set(row.phase_id, periods);
    }

    // 3a4. Fetch parcel-level improvement offset inputs so subdivision costs can respect current inflation
    // Note: Only include SFD/SFA parcels - other land types have separate improvement offsets tracked elsewhere
    const parcelSubdivisionCosts = await sql<ParcelSubdivisionCostRow>`
      SELECT
        p.phase_id,
        COALESCE(ph.phase_name, 'Unassigned') AS phase_name,
        COALESCE(psa.price_uom, lup.unit_of_measure) AS price_uom,
        p.sale_period,
        p.lot_width,
        p.units_total,
        psa.improvement_offset_per_uom
      FROM landscape.tbl_parcel p
      LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
      LEFT JOIN landscape.tbl_parcel_sale_assumptions psa ON p.parcel_id = psa.parcel_id
      LEFT JOIN LATERAL (
        SELECT unit_of_measure
        FROM landscape.land_use_pricing lup
        WHERE lup.project_id = p.project_id
          AND lup.lu_type_code = p.type_code
          AND (lup.product_code = p.product_code OR lup.product_code IS NULL)
        ORDER BY lup.product_code NULLS LAST
        LIMIT 1
      ) lup ON TRUE
      WHERE p.project_id = ${projectId}
        AND p.type_code IN ('SFD', 'SFA')
        AND p.units_total > 0
    `;

    // 3b. Fetch Other Land parcels (MF, BTR, etc. - non-SFD)
    const otherLandParcels = await sql<OtherLandRow>`
      SELECT
        p.phase_id,
        COALESCE(ph.phase_name, 'Unassigned') as phase_name,
        p.parcel_code,
        p.type_code,
        COALESCE(p.units_total, 0)::integer as units_total,
        COALESCE(p.acres_gross, 0)::numeric as acres_gross,
        COALESCE(psa.inflated_price_per_unit, psa.base_price_per_unit, 0)::numeric as price_per_unit,
        COALESCE(psa.gross_parcel_price, 0)::numeric as gross_parcel_price,
        COALESCE(psa.improvement_offset_total, 0)::numeric as improvement_offset_total,
        COALESCE(psa.commission_amount, 0)::numeric as commission_amount,
        COALESCE(psa.net_sale_proceeds, 0)::numeric as net_sale_proceeds
      FROM landscape.tbl_parcel p
      LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
      LEFT JOIN landscape.tbl_parcel_sale_assumptions psa ON p.parcel_id = psa.parcel_id
      WHERE p.project_id = ${projectId}
        AND p.type_code NOT IN ('SFD', 'SFA')
        AND (p.units_total > 0 OR p.acres_gross > 0)
      ORDER BY p.phase_id, p.parcel_code
    `;

    // 4. Fetch phase schedule (first/last sale periods)
    const phaseSchedule = await sql<PhaseScheduleRow>`
      SELECT
        p.phase_id,
        MIN(p.sale_period)::integer as first_sale_period,
        MAX(p.sale_period)::integer as last_sale_period
      FROM landscape.tbl_parcel p
      WHERE p.project_id = ${projectId}
        AND p.units_total > 0
        AND p.sale_period IS NOT NULL
      GROUP BY p.phase_id
    `;

    // 5. Fetch phase budget by activity with timing for inflation calculation
    // Note: division.attributes contains {"phase_id": X} which maps to tbl_phase.phase_id
    // We use the midpoint period for inflation calculation (avg of start and end)
    const phaseBudgets = await sql<PhaseBudgetRow>`
      SELECT
        (d.attributes->>'phase_id')::integer as phase_id,
        f.activity,
        COALESCE(SUM(f.amount), 0)::numeric as total_amount,
        MIN(f.start_period)::integer as start_period,
        CASE
          WHEN SUM(f.amount) > 0 THEN
            (SUM(COALESCE(f.start_period, 0) * f.amount + COALESCE(f.periods_to_complete, 0) * f.amount / 2) / NULLIF(SUM(f.amount), 0))::integer
          ELSE 0
        END as mid_period
      FROM landscape.core_fin_fact_budget f
      LEFT JOIN landscape.tbl_division d ON f.division_id = d.division_id
      WHERE f.project_id = ${projectId}
      GROUP BY (d.attributes->>'phase_id')::integer, f.activity
      ORDER BY (d.attributes->>'phase_id')::integer NULLS LAST, f.activity
    `;

    // 5a. Fetch total acquisition cost from tbl_acquisition
    const acquisitionRows = await sql<AcquisitionRow>`
      SELECT COALESCE(SUM(amount), 0)::numeric as total_acquisition
      FROM landscape.tbl_acquisition
      WHERE project_id = ${projectId}
        AND is_applied_to_purchase = true
    `;
    const totalAcquisitionCost = Number(acquisitionRows[0]?.total_acquisition) || 0;

    // 5b. Fetch total gross acres by phase (for acquisition cost allocation)
    const phaseAcres = await sql<PhaseAcresRow>`
      SELECT
        ph.phase_id,
        COALESCE(ph.phase_name, 'Unassigned') as phase_name,
        COALESCE(SUM(p.acres_gross), 0)::numeric as total_acres
      FROM landscape.tbl_parcel p
      LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
      WHERE p.project_id = ${projectId}
      GROUP BY ph.phase_id, ph.phase_name
    `;
    const projectTotalAcres = phaseAcres.reduce((sum, p) => sum + Number(p.total_acres), 0);

    // Build phase acres map for allocation
    const phaseAcresMap = new Map<number | null, number>();
    for (const pa of phaseAcres) {
      phaseAcresMap.set(pa.phase_id, Number(pa.total_acres) || 0);
    }

    // 6. Build phase data map
    const phaseMap = new Map<number | null, PhaseData>();

    // Helper to create empty phase data
    const createEmptyPhaseData = (phaseName: string, phaseId: number | null): PhaseData => ({
      phaseName,
      phaseId,
      acres: 0,
      lots: 0,
      frontFeet: 0,
      parcels: 0,
      otherLandAcres: 0,
      otherLandUnits: 0,
      otherLandParcels: [],
      otherLandByType: [],
      pricePerFrontFoot: 0,
      grossRevenue: 0,
      grossRevenuePerLot: 0,
      otherLandGrossRevenue: 0,
      otherLandNetRevenue: 0,
      totalGrossRevenue: 0,
      subdivisionCost: 0,
      grossSaleProceeds: 0,
      totalNetRevenue: 0,
      commissions: 0,
      closingCostsPerLot: 0,
      closingCostsTotal: 0,
      netRevenue: 0,
      netRevenuePerLot: 0,
      monthsToFirstSale: 0,
      totalMonthsToSell: 0,
      acquisition: 0,
      planningEngineering: 0,
      development: 0,
      operations: 0,
      contingency: 0,
      financing: 0,
      totalCosts: 0,
      costPerLot: 0,
      grossProfit: 0,
      profitMargin: 0,
    });

    // Initialize phases from SFD stats
    for (const stat of phaseStats) {
      const phaseId = stat.phase_id;
      const phase = createEmptyPhaseData(stat.phase_name, phaseId);
      phase.acres = Number(stat.total_acres) || 0;
      phase.lots = Number(stat.total_lots) || 0;
      phase.frontFeet = Number(stat.total_front_feet) || 0;
      phase.parcels = Number(stat.parcel_count) || 0;
      phaseMap.set(phaseId, phase);
    }

    // Add other land parcels to phases (may create new phases if they only have other land)
    // Also aggregate by type code for display
    for (const parcel of otherLandParcels) {
      let phase = phaseMap.get(parcel.phase_id);
      if (!phase) {
        // Phase only has other land, no SFD lots - use actual phase name from query
        phase = createEmptyPhaseData(parcel.phase_name, parcel.phase_id);
        phaseMap.set(parcel.phase_id, phase);
      }

      const units = Number(parcel.units_total) || 0;
      const grossPrice = Number(parcel.gross_parcel_price) || 0;
      const netProceeds = Number(parcel.net_sale_proceeds) || 0;
      const acres = Number(parcel.acres_gross) || 0;
      const pricePerUnit = Number(parcel.price_per_unit) || 0;
      const commission = Number(parcel.commission_amount) || 0;

      phase.otherLandAcres += acres;
      phase.otherLandUnits += units;
      phase.otherLandGrossRevenue += grossPrice;
      phase.otherLandNetRevenue += netProceeds;
      // Add Other Land commission to phase commissions
      phase.commissions += commission;

      phase.otherLandParcels.push({
        parcelCode: parcel.parcel_code,
        typeCode: parcel.type_code,
        units,
        acres,
        pricePerUnit,
        grossRevenue: grossPrice,
        netRevenue: netProceeds,
      });

      // Aggregate by type code
      let typeEntry = phase.otherLandByType.find(t => t.typeCode === parcel.type_code);
      if (!typeEntry) {
        typeEntry = { typeCode: parcel.type_code, units: 0, acres: 0, pricePerUnit: 0, grossRevenue: 0, netRevenue: 0 };
        phase.otherLandByType.push(typeEntry);
      }
      typeEntry.units += units;
      typeEntry.acres += acres;
      // Use weighted average for price per unit (or just take the latest - they should be same per type)
      if (pricePerUnit > 0) typeEntry.pricePerUnit = pricePerUnit;
      typeEntry.grossRevenue += grossPrice;
      typeEntry.netRevenue += netProceeds;
    }

    // Recompute subdivision costs (improvement offsets) using current inflation settings
    const normalizeUom = (rawUom: string | null): string => {
      if (!rawUom) return 'EA';
      return rawUom.replace('$/', '').toUpperCase();
    };

    const calculateParcelSubdivisionCost = (row: ParcelSubdivisionCostRow): number => {
      const uom = normalizeUom(row.price_uom);

      // Only $/FF parcels should contribute to subdivision cost
      // Other UOMs ($/Unit, $/SF, $/AC) are tracked separately
      if (uom !== 'FF') return 0;

      // Use parcel-level per-UOM if available, otherwise fall back to benchmark
      let basePerUom = Number(row.improvement_offset_per_uom) || 0;
      if (!basePerUom) {
        basePerUom = benchmarkImprovementOffsetPerUom;
      }

      // If we still don't have a per-UOM amount, skip this parcel
      if (!basePerUom) return 0;

      // Get parcel dimensions
      const units = Number(row.units_total) || 0;
      const lotWidth = Number(row.lot_width) || 0;

      // Calculate: basePerUom * lotWidth * units
      // If cost inflation is zero, use base rate directly
      if (costInflationRate === 0) {
        return basePerUom * lotWidth * units;
      }

      // Apply inflation when rate > 0 and parcel has a sale period
      const salePeriod = row.sale_period || 0;
      const inflatedPerUom =
        costInflationRate > 0 && salePeriod > 0
          ? basePerUom * Math.pow(1 + costInflationRate / 12, salePeriod)
          : basePerUom;

      return inflatedPerUom * lotWidth * units;
    };

    const subdivisionCostByPhase = new Map<number | null, number>();
    const subdivisionPhaseNames = new Map<number | null, string>();

    for (const row of parcelSubdivisionCosts) {
      const amount = calculateParcelSubdivisionCost(row);
      if (amount === 0) continue;
      subdivisionCostByPhase.set(row.phase_id, (subdivisionCostByPhase.get(row.phase_id) || 0) + amount);
      if (!subdivisionPhaseNames.has(row.phase_id)) {
        subdivisionPhaseNames.set(row.phase_id, row.phase_name);
      }
    }

    for (const [phaseId, amount] of subdivisionCostByPhase.entries()) {
      let phase = phaseMap.get(phaseId);
      if (!phase) {
        const phaseName = subdivisionPhaseNames.get(phaseId) || 'Unassigned';
        phase = createEmptyPhaseData(phaseName, phaseId);
        phaseMap.set(phaseId, phase);
      }
      phase.subdivisionCost = amount;
    }

    // Calculate base per-parcel closing costs from transaction benchmarks
    // Each benchmark amount (closing, legal, title_insurance) is per-parcel
    let baseClosingCostPerParcel = 0;
    for (const benchmark of transactionBenchmarks) {
      if (benchmark.fixed_amount) {
        baseClosingCostPerParcel += Number(benchmark.fixed_amount);
      }
      // Note: percentage-based transaction costs would need gross revenue - not currently used
    }

    // Helper to calculate inflated cost based on period (months from project start)
    // Inflation is annual, so we convert period (months) to years
    const calculateInflatedCost = (baseCost: number, period: number): number => {
      if (costInflationRate === 0 || period <= 0) return baseCost;
      const years = period / 12;
      return baseCost * Math.pow(1 + costInflationRate, years);
    };

    // Add pricing data with per-parcel closing costs (inflated)
    for (const pricing of phasePricing) {
      const phase = phaseMap.get(pricing.phase_id);
      if (phase) {
        phase.pricePerFrontFoot = Number(pricing.avg_price_per_ff) || 0;
        phase.grossRevenue = Number(pricing.gross_revenue) || 0;
        phase.grossRevenuePerLot = phase.lots > 0 ? phase.grossRevenue / phase.lots : 0;
        // Add SFD commissions to any already accumulated from Other Land parcels
        phase.commissions += Number(pricing.total_commissions) || 0;

        // Calculate closing costs with inflation applied per-parcel based on sale period
        const salePeriods = phaseSalePeriods.get(pricing.phase_id) || [];
        if (salePeriods.length > 0 && costInflationRate > 0) {
          // Sum inflated closing costs for each parcel in the phase
          phase.closingCostsTotal = salePeriods.reduce((sum, period) => {
            return sum + calculateInflatedCost(baseClosingCostPerParcel, period);
          }, 0);
        } else {
          // No inflation or no sale periods - use base cost
          phase.closingCostsTotal = baseClosingCostPerParcel * phase.parcels;
        }
        phase.closingCostsPerLot = phase.lots > 0 ? phase.closingCostsTotal / phase.lots : 0;

        phase.netRevenue = Number(pricing.net_revenue) || 0;
        phase.netRevenuePerLot = phase.lots > 0 ? phase.netRevenue / phase.lots : 0;
      }
    }

    // Add schedule data
    for (const schedule of phaseSchedule) {
      const phase = phaseMap.get(schedule.phase_id);
      if (phase) {
        phase.monthsToFirstSale = schedule.first_sale_period || 0;
        const lastSale = schedule.last_sale_period || 0;
        const firstSale = schedule.first_sale_period || 0;
        phase.totalMonthsToSell = lastSale > firstSale ? lastSale - firstSale + 1 : (lastSale > 0 ? 1 : 0);
      }
    }

    // Helper to add budget amount to the appropriate category
    const addBudgetToPhase = (phase: PhaseData, amount: number, activity: string) => {
      const activityLower = activity.toLowerCase();
      if (activityLower.includes('acquisition')) {
        phase.acquisition += amount;
      } else if (activityLower.includes('planning') || activityLower.includes('engineering')) {
        phase.planningEngineering += amount;
      } else if (activityLower.includes('development')) {
        phase.development += amount;
      } else if (activityLower.includes('operations') || activityLower.includes('operating')) {
        phase.operations += amount;
      } else if (activityLower.includes('contingency')) {
        phase.contingency += amount;
      } else if (activityLower.includes('financing')) {
        phase.financing += amount;
      } else {
        // Other costs go to operations
        phase.operations += amount;
      }
    };

    // Add budget data with cost inflation applied based on timing
    // Only phase-specific budgets are used - project-level budgets (NULL phase_id) are not allocated
    for (const budget of phaseBudgets) {
      const baseAmount = Number(budget.total_amount) || 0;
      if (baseAmount === 0) continue;

      // Use mid_period for weighted average timing, fallback to start_period
      const period = budget.mid_period || budget.start_period || 0;
      // Apply cost inflation to the amount based on when it will occur
      const amount = calculateInflatedCost(baseAmount, period);
      const activity = budget.activity || '';

      const phase = phaseMap.get(budget.phase_id);
      if (phase) {
        // Phase-specific budget - add directly
        addBudgetToPhase(phase, amount, activity);
      }
      // Project-level budgets (NULL phase_id) are intentionally not allocated to phases
      // Planning & Development costs are parcel-specific, not allocated across parcels
    }

    // Allocate acquisition cost proportionally by gross acres
    // Acquisition cost comes from tbl_acquisition, not the budget activity
    if (totalAcquisitionCost > 0 && projectTotalAcres > 0) {
      for (const phase of phaseMap.values()) {
        const phaseGrossAcres = phaseAcresMap.get(phase.phaseId) || 0;
        const acresShare = phaseGrossAcres / projectTotalAcres;
        phase.acquisition = totalAcquisitionCost * acresShare;
      }
    }

    // Calculate totals and derived values for each phase
    const phases: PhaseData[] = [];
    for (const phase of phaseMap.values()) {
      // Calculate combined revenue totals
      phase.totalGrossRevenue = phase.grossRevenue + phase.otherLandGrossRevenue;

      // subdivisionCost is already set from parcel improvement offsets using the current cost inflation rate
      // It represents the credit given to buyer for improvements they'll complete post-closing

      // Gross sale proceeds = gross revenue minus subdivision costs (before commissions/closing)
      phase.grossSaleProceeds = phase.totalGrossRevenue - phase.subdivisionCost;

      phase.totalNetRevenue = phase.netRevenue + phase.otherLandNetRevenue;

      phase.totalCosts =
        phase.acquisition +
        phase.planningEngineering +
        phase.development +
        phase.operations +
        phase.contingency +
        phase.financing;

      // Cost per lot is based on SFD lots only + other land units
      const totalUnits = phase.lots + phase.otherLandUnits;
      phase.costPerLot = totalUnits > 0 ? phase.totalCosts / totalUnits : 0;

      // Profit is based on total net revenue
      phase.grossProfit = phase.totalNetRevenue - phase.totalCosts;
      phase.profitMargin = phase.totalNetRevenue > 0 ? phase.grossProfit / phase.totalNetRevenue : 0;

      phases.push(phase);
    }

    // Sort phases by phase_id (null last)
    phases.sort((a, b) => {
      if (a.phaseId === null) return 1;
      if (b.phaseId === null) return -1;
      return a.phaseId - b.phaseId;
    });

    // 7. Calculate project totals
    // Collect all other land parcels across phases
    const allOtherLandParcels: OtherLandParcel[] = phases.flatMap(p => p.otherLandParcels);

    // Aggregate otherLandByType across all phases
    const otherLandByTypeMap = new Map<string, { typeCode: string; units: number; acres: number; pricePerUnit: number; grossRevenue: number; netRevenue: number }>();
    for (const phase of phases) {
      for (const typeData of phase.otherLandByType) {
        const existing = otherLandByTypeMap.get(typeData.typeCode);
        if (existing) {
          existing.units += typeData.units;
          existing.acres += typeData.acres;
          existing.grossRevenue += typeData.grossRevenue;
          existing.netRevenue += typeData.netRevenue;
          // Take the price per unit (should be same across phases for same type)
          if (typeData.pricePerUnit > 0) existing.pricePerUnit = typeData.pricePerUnit;
        } else {
          otherLandByTypeMap.set(typeData.typeCode, { ...typeData });
        }
      }
    }
    const allOtherLandByType = Array.from(otherLandByTypeMap.values()).sort((a, b) => a.typeCode.localeCompare(b.typeCode));

    const totals: PhaseData = {
      phaseName: 'TOTAL',
      phaseId: null,
      acres: phases.reduce((sum, p) => sum + p.acres, 0),
      lots: phases.reduce((sum, p) => sum + p.lots, 0),
      frontFeet: phases.reduce((sum, p) => sum + p.frontFeet, 0),
      parcels: phases.reduce((sum, p) => sum + p.parcels, 0),
      otherLandAcres: phases.reduce((sum, p) => sum + p.otherLandAcres, 0),
      otherLandUnits: phases.reduce((sum, p) => sum + p.otherLandUnits, 0),
      otherLandParcels: allOtherLandParcels,
      otherLandByType: allOtherLandByType,
      pricePerFrontFoot: 0,
      grossRevenue: phases.reduce((sum, p) => sum + p.grossRevenue, 0),
      grossRevenuePerLot: 0,
      otherLandGrossRevenue: phases.reduce((sum, p) => sum + p.otherLandGrossRevenue, 0),
      otherLandNetRevenue: phases.reduce((sum, p) => sum + p.otherLandNetRevenue, 0),
      totalGrossRevenue: phases.reduce((sum, p) => sum + p.totalGrossRevenue, 0),
      subdivisionCost: phases.reduce((sum, p) => sum + p.subdivisionCost, 0),
      grossSaleProceeds: phases.reduce((sum, p) => sum + p.grossSaleProceeds, 0),
      totalNetRevenue: phases.reduce((sum, p) => sum + p.totalNetRevenue, 0),
      commissions: phases.reduce((sum, p) => sum + p.commissions, 0),
      closingCostsPerLot: 0,
      closingCostsTotal: phases.reduce((sum, p) => sum + p.closingCostsTotal, 0),
      netRevenue: phases.reduce((sum, p) => sum + p.netRevenue, 0),
      netRevenuePerLot: 0,
      monthsToFirstSale: Math.min(...phases.filter(p => p.monthsToFirstSale > 0).map(p => p.monthsToFirstSale), Infinity),
      totalMonthsToSell: Math.max(...phases.map(p => (p.monthsToFirstSale || 0) + (p.totalMonthsToSell || 0)), 0) - (Math.min(...phases.filter(p => p.monthsToFirstSale > 0).map(p => p.monthsToFirstSale), 0) || 0) + 1,
      acquisition: phases.reduce((sum, p) => sum + p.acquisition, 0),
      planningEngineering: phases.reduce((sum, p) => sum + p.planningEngineering, 0),
      development: phases.reduce((sum, p) => sum + p.development, 0),
      operations: phases.reduce((sum, p) => sum + p.operations, 0),
      contingency: phases.reduce((sum, p) => sum + p.contingency, 0),
      financing: phases.reduce((sum, p) => sum + p.financing, 0),
      totalCosts: phases.reduce((sum, p) => sum + p.totalCosts, 0),
      costPerLot: 0,
      grossProfit: 0,
      profitMargin: 0,
    };

    // Calculate derived totals
    totals.pricePerFrontFoot = totals.frontFeet > 0 ? totals.grossRevenue / totals.frontFeet : 0;
    totals.grossRevenuePerLot = totals.lots > 0 ? totals.grossRevenue / totals.lots : 0;
    totals.closingCostsPerLot = totals.lots > 0 ? totals.closingCostsTotal / totals.lots : 0;
    totals.netRevenuePerLot = totals.lots > 0 ? totals.netRevenue / totals.lots : 0;
    const totalUnits = totals.lots + totals.otherLandUnits;
    totals.costPerLot = totalUnits > 0 ? totals.totalCosts / totalUnits : 0;
    totals.grossProfit = totals.totalNetRevenue - totals.totalCosts;
    totals.profitMargin = totals.totalNetRevenue > 0 ? totals.grossProfit / totals.totalNetRevenue : 0;

    // Fix infinite values
    if (!isFinite(totals.monthsToFirstSale)) totals.monthsToFirstSale = 0;
    if (!isFinite(totals.totalMonthsToSell)) totals.totalMonthsToSell = 0;

    const queryTimeMs = Date.now() - startTime;

    const reportData: ValidationReportData = {
      projectId,
      projectName: project.project_name,
      generatedAt: new Date().toISOString(),
      totals,
      phases,
      meta: {
        phaseCount: phases.length,
        totalLots: totals.lots,
        totalAcres: totals.acres,
        queryTimeMs,
      },
    };

    return NextResponse.json({
      success: true,
      data: reportData,
    });
  } catch (error: any) {
    console.error('Error generating validation report:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate validation report',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
