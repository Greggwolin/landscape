/**
 * Revenue allocation module for land development cash flow
 *
 * Calculates parcel sales revenue with timing, pricing, escalation,
 * and deductions (commissions, closing costs).
 */

import { sql } from '@/lib/db';
import type {
  ParcelSale,
  ParcelPricing,
  AbsorptionSchedule,
  PeriodSales,
  PeriodValue,
  PricingLookupResult,
} from './types';
import { yearsBetween } from './periods';

// ============================================================================
// DATABASE TYPES
// ============================================================================

interface ParcelRow {
  parcel_id: number;
  parcel_code: string;
  project_id: number;
  area_id: number | null;
  phase_id: number | null;

  // Land use classification
  family_name: string | null;
  density_code: string | null;
  type_code: string | null;
  product_code: string | null;

  // Physical attributes
  units_total: number | null;
  acres_gross: number | null;
  lot_width: number | null;
  lot_depth: number | null;
  lot_area: number | null;

  // Sale timing
  sale_period: number | null;
  custom_sale_date: string | null;

  // Precalculated proceeds (from tbl_parcel_sale_assumptions)
  gross_parcel_price: number | null;
  net_sale_proceeds: number | null;
  total_transaction_costs: number | null;
}

interface PricingRow {
  project_id: number;
  lu_type_code: string;
  product_code: string | null;
  price_per_unit: number;
  unit_of_measure: string;
  growth_rate: number;
}

interface SaleBenchmarkRow {
  benchmark_type: string;
  rate_pct: number | null;
  amount_per_uom: number | null;
  fixed_amount: number | null;
}

// ============================================================================
// PARCEL DATA FETCHING
// ============================================================================

/**
 * Fetch all parcels for a project with sale timing
 */
export async function fetchProjectParcels(
  projectId: number,
  containerIds?: number[]
): Promise<ParcelRow[]> {
  let query;

  if (containerIds && containerIds.length > 0) {
    query = sql<ParcelRow>`
      SELECT
        p.parcel_id,
        p.parcel_code,
        p.project_id,
        p.area_id,
        p.phase_id,
        p.family_name,
        p.density_code,
        p.type_code,
        p.product_code,
        p.units_total,
        p.acres_gross,
        p.lot_width,
        p.lot_depth,
        p.lot_area,
        p.sale_period,
        p.custom_sale_date,
        psa.gross_parcel_price,
        psa.net_sale_proceeds,
        psa.total_transaction_costs
      FROM landscape.tbl_parcel p
      LEFT JOIN landscape.tbl_parcel_sale_assumptions psa ON p.parcel_id = psa.parcel_id
      WHERE p.project_id = ${projectId}
        AND (p.area_id = ANY(${containerIds}) OR p.phase_id = ANY(${containerIds}))
        AND p.units_total > 0
      ORDER BY p.sale_period ASC NULLS LAST, p.parcel_code ASC
    `;
  } else {
    query = sql<ParcelRow>`
      SELECT
        p.parcel_id,
        p.parcel_code,
        p.project_id,
        p.area_id,
        p.phase_id,
        p.family_name,
        p.density_code,
        p.type_code,
        p.product_code,
        p.units_total,
        p.acres_gross,
        p.lot_width,
        p.lot_depth,
        p.lot_area,
        p.sale_period,
        p.custom_sale_date,
        psa.gross_parcel_price,
        psa.net_sale_proceeds,
        psa.total_transaction_costs
      FROM landscape.tbl_parcel p
      LEFT JOIN landscape.tbl_parcel_sale_assumptions psa ON p.parcel_id = psa.parcel_id
      WHERE p.project_id = ${projectId}
        AND p.units_total > 0
      ORDER BY p.sale_period ASC NULLS LAST, p.parcel_code ASC
    `;
  }

  return await query;
}

// ============================================================================
// PRICING LOOKUP
// ============================================================================

/**
 * Lookup pricing for a parcel from land_use_pricing table
 */
export async function lookupParcelPricing(
  projectId: number,
  typeCode: string,
  productCode?: string
): Promise<PricingLookupResult> {
  // Try to find exact match (project + type + product)
  // Then fall back to project + type
  // Then fall back to defaults

  const query = sql<PricingRow>`
    SELECT
      project_id,
      lu_type_code,
      product_code,
      price_per_unit,
      unit_of_measure,
      growth_rate
    FROM landscape.land_use_pricing
    WHERE project_id = ${projectId}
      AND lu_type_code = ${typeCode}
      AND (
        product_code = ${productCode || null}
        OR product_code IS NULL
      )
    ORDER BY
      CASE WHEN product_code IS NULL THEN 1 ELSE 0 END,
      product_code NULLS LAST
    LIMIT 1
  `;

  const rows = await query;

  if (rows.length === 0) {
    return {
      found: false,
      error: `No pricing found for type ${typeCode}, product ${productCode}`,
    };
  }

  const row = rows[0];

  return {
    found: true,
    pricing: {
      parcelId: 0, // Will be set by caller
      typeCode: row.lu_type_code,
      productCode: row.product_code || '',
      pricePerUnit: row.price_per_unit,
      unitOfMeasure: row.unit_of_measure,
      growthRate: row.growth_rate,
    },
    fallbackUsed: row.product_code !== productCode,
  };
}

/**
 * Fetch sale benchmarks (commission, closing costs) for a project
 */
export async function fetchSaleBenchmarks(
  projectId: number,
  typeCode?: string,
  productCode?: string
): Promise<{
  commissionPct: number;
  closingCostPct: number;
  closingCostPerUnit: number;
  onsiteCostPct: number;
}> {
  // Query hierarchy: product > project > global
  const query = sql<SaleBenchmarkRow>`
    SELECT
      benchmark_type,
      rate_pct,
      amount_per_uom,
      fixed_amount
    FROM landscape.tbl_sale_benchmarks
    WHERE (
      (scope_level = 'product' AND project_id = ${projectId}
       AND lu_type_code = ${typeCode || null}
       AND product_code = ${productCode || null})
      OR (scope_level = 'project' AND project_id = ${projectId})
      OR (scope_level = 'global')
    )
    AND is_active = true
    ORDER BY
      CASE scope_level
        WHEN 'product' THEN 1
        WHEN 'project' THEN 2
        WHEN 'global' THEN 3
      END
  `;

  const rows = await query;

  // Extract values, taking first match for each type
  const benchmarks = {
    commissionPct: 0.03, // Default 3%
    closingCostPct: 0.02, // Default 2%
    closingCostPerUnit: 750, // Default $750/unit
    onsiteCostPct: 0.065, // Default 6.5%
  };

  const found = new Set<string>();

  for (const row of rows) {
    if (found.has(row.benchmark_type)) continue;

    switch (row.benchmark_type) {
      case 'commission':
        if (row.rate_pct !== null) {
          benchmarks.commissionPct = row.rate_pct;
          found.add('commission');
        }
        break;

      case 'closing':
        if (row.rate_pct !== null) {
          benchmarks.closingCostPct = row.rate_pct;
          found.add('closing');
        }
        if (row.amount_per_uom !== null) {
          benchmarks.closingCostPerUnit = row.amount_per_uom;
        }
        break;

      case 'onsite':
        if (row.rate_pct !== null) {
          benchmarks.onsiteCostPct = row.rate_pct;
          found.add('onsite');
        }
        break;
    }
  }

  return benchmarks;
}

// ============================================================================
// REVENUE CALCULATION
// ============================================================================

/**
 * Calculate revenue for a single parcel sale
 */
export async function calculateParcelSale(
  parcel: ParcelRow,
  projectStartDate: Date,
  projectId: number
): Promise<ParcelSale | null> {
  // Skip parcels without sale period or units
  if (!parcel.sale_period || !parcel.units_total) {
    return null;
  }

  // CHECK 1: Use precalculated proceeds if available
  if (parcel.net_sale_proceeds !== null && parcel.gross_parcel_price !== null) {
    // IMPORTANT: PostgreSQL returns numeric/decimal as strings - must cast to Number
    const grossRevenue = Number(parcel.gross_parcel_price);
    const netRevenue = Number(parcel.net_sale_proceeds);
    const totalDeductions = parcel.total_transaction_costs
      ? Number(parcel.total_transaction_costs)
      : (grossRevenue - netRevenue);

    console.log(
      `Using precalculated proceeds for parcel ${parcel.parcel_code}: ` +
      `Gross=${grossRevenue}, Net=${netRevenue}`
    );

    // We still need pricing for some metadata
    const pricingResult = await lookupParcelPricing(
      projectId,
      parcel.type_code || '',
      parcel.product_code || undefined
    );

    const pricing = pricingResult.found && pricingResult.pricing
      ? pricingResult.pricing
      : {
          parcelId: parcel.parcel_id,
          typeCode: parcel.type_code || '',
          productCode: parcel.product_code || '',
          pricePerUnit: 0,
          unitOfMeasure: 'EA',
          growthRate: 0,
        };

    pricing.parcelId = parcel.parcel_id;
    pricing.lotWidth = parcel.lot_width || undefined;
    pricing.lotArea = parcel.lot_area || undefined;
    pricing.acres = parcel.acres_gross || undefined;
    pricing.units = parcel.units_total || undefined;

    // Estimate deductions proportionally (rough approximation)
    const commissionRate = 0.03;
    const closingCostRate = 0.02;
    const commissions = grossRevenue * commissionRate;
    const closingCosts = totalDeductions - commissions;

    return {
      parcelId: parcel.parcel_id,
      parcelCode: parcel.parcel_code,
      containerId: parcel.area_id || parcel.phase_id || undefined,
      salePeriod: parcel.sale_period,
      pricing,
      baseRevenue: grossRevenue, // Using gross as base since we don't have the breakdown
      escalationFactor: 1.0,
      grossRevenue,
      commissionRate,
      commissions,
      closingCostRate,
      closingCostPerUnit: 0,
      closingCosts,
      onsiteCostPct: 0,
      onsiteCosts: 0,
      totalDeductions,
      netRevenue,
      units: parcel.units_total || 0,
      productDescription: `${parcel.type_code || ''} - ${parcel.product_code || ''}`.trim(),
    };
  }

  // CHECK 2: Fall back to calculation if no precalculated proceeds
  // Lookup pricing
  const pricingResult = await lookupParcelPricing(
    projectId,
    parcel.type_code || '',
    parcel.product_code || undefined
  );

  if (!pricingResult.found || !pricingResult.pricing) {
    console.warn(
      `No pricing found for parcel ${parcel.parcel_code} ` +
      `(type: ${parcel.type_code}, product: ${parcel.product_code})`
    );
    return null;
  }

  const pricing = pricingResult.pricing;
  pricing.parcelId = parcel.parcel_id;
  pricing.lotWidth = parcel.lot_width || undefined;
  pricing.lotArea = parcel.lot_area || undefined;
  pricing.acres = parcel.acres_gross || undefined;
  pricing.units = parcel.units_total || undefined;

  // Calculate base revenue based on unit of measure
  const baseRevenue = calculateBaseRevenue(parcel, pricing);

  if (baseRevenue === 0) {
    console.warn(
      `Zero base revenue for parcel ${parcel.parcel_code} ` +
      `(UOM: ${pricing.unitOfMeasure}, price: ${pricing.pricePerUnit})`
    );
    return null;
  }

  // Calculate escalation factor based on sale period
  // Assumption: Period 1 = Month 1 from project start
  const saleMonthsFromStart = parcel.sale_period - 1;
  const saleYearsFromStart = saleMonthsFromStart / 12;
  const escalationFactor = Math.pow(1 + pricing.growthRate, saleYearsFromStart);

  // Apply escalation
  const grossRevenue = baseRevenue * escalationFactor;

  // Fetch sale benchmarks
  const benchmarks = await fetchSaleBenchmarks(
    projectId,
    parcel.type_code || undefined,
    parcel.product_code || undefined
  );

  // Calculate deductions
  const commissions = grossRevenue * benchmarks.commissionPct;

  // Closing costs: use percentage or per-unit, whichever is higher
  const closingCostsPct = grossRevenue * benchmarks.closingCostPct;
  const closingCostsPerUnit = (parcel.units_total || 0) * benchmarks.closingCostPerUnit;
  const closingCosts = Math.max(closingCostsPct, closingCostsPerUnit);

  // Onsite costs (only for certain product types, defaulting to 0 for now)
  const onsiteCosts = 0; // Can be enabled per product type if needed

  const totalDeductions = commissions + closingCosts + onsiteCosts;
  const netRevenue = grossRevenue - totalDeductions;

  return {
    parcelId: parcel.parcel_id,
    parcelCode: parcel.parcel_code,
    containerId: parcel.area_id || parcel.phase_id || undefined,
    salePeriod: parcel.sale_period,
    pricing,
    baseRevenue,
    escalationFactor,
    grossRevenue,
    commissionRate: benchmarks.commissionPct,
    commissions,
    closingCostRate: benchmarks.closingCostPct,
    closingCostPerUnit: benchmarks.closingCostPerUnit,
    closingCosts,
    onsiteCostPct: benchmarks.onsiteCostPct,
    onsiteCosts,
    totalDeductions,
    netRevenue,
    units: parcel.units_total || 0,
    productDescription: `${parcel.type_code || ''} - ${parcel.product_code || ''}`.trim(),
  };
}

/**
 * Calculate base revenue based on unit of measure
 */
function calculateBaseRevenue(parcel: ParcelRow, pricing: ParcelPricing): number {
  const uom = pricing.unitOfMeasure.toUpperCase();

  switch (uom) {
    case 'FF': // Front Feet
      if (!parcel.lot_width) {
        console.warn(`Parcel ${parcel.parcel_code} missing lot_width for FF pricing`);
        return 0;
      }
      return parcel.lot_width * pricing.pricePerUnit;

    case 'SF': // Square Feet
      if (!parcel.lot_area) {
        console.warn(`Parcel ${parcel.parcel_code} missing lot_area for SF pricing`);
        return 0;
      }
      return parcel.lot_area * pricing.pricePerUnit;

    case 'AC': // Acres
    case 'ACRE':
      if (!parcel.acres_gross) {
        console.warn(`Parcel ${parcel.parcel_code} missing acres_gross for AC pricing`);
        return 0;
      }
      return parcel.acres_gross * pricing.pricePerUnit;

    case 'EA': // Each (per unit)
    case 'UN': // Unit
    case 'UNIT':
      if (!parcel.units_total) {
        console.warn(`Parcel ${parcel.parcel_code} missing units_total for unit pricing`);
        return 0;
      }
      return parcel.units_total * pricing.pricePerUnit;

    default:
      // Default to per-unit pricing
      console.warn(`Unknown UOM '${uom}' for parcel ${parcel.parcel_code}, using unit pricing`);
      if (!parcel.units_total) return 0;
      return parcel.units_total * pricing.pricePerUnit;
  }
}

// ============================================================================
// ABSORPTION SCHEDULE GENERATION
// ============================================================================

/**
 * Generate complete absorption schedule for a project
 */
export async function generateAbsorptionSchedule(
  projectId: number,
  projectStartDate: Date,
  containerIds?: number[]
): Promise<AbsorptionSchedule> {
  // Fetch all parcels with sales
  const parcels = await fetchProjectParcels(projectId, containerIds);

  if (parcels.length === 0) {
    return {
      projectId,
      totalUnits: 0,
      totalParcels: 0,
      absorptionRate: 0,
      firstSalePeriod: 0,
      lastSalePeriod: 0,
      periodSales: [],
      totalGrossRevenue: 0,
      totalNetRevenue: 0,
      totalCommissions: 0,
      totalClosingCosts: 0,
    };
  }

  // Calculate sales for each parcel
  const parcelSales: ParcelSale[] = [];
  for (const parcel of parcels) {
    const sale = await calculateParcelSale(parcel, projectStartDate, projectId);
    if (sale) {
      parcelSales.push(sale);
    }
  }

  // Group sales by period
  const periodSalesMap = new Map<number, PeriodSales>();

  for (const sale of parcelSales) {
    const periodSeq = sale.salePeriod;

    if (!periodSalesMap.has(periodSeq)) {
      periodSalesMap.set(periodSeq, {
        periodIndex: periodSeq - 1, // Convert to 0-based
        periodSequence: periodSeq,
        parcels: [],
        totalUnits: 0,
        totalGrossRevenue: 0,
        totalNetRevenue: 0,
      });
    }

    const periodSale = periodSalesMap.get(periodSeq)!;
    periodSale.parcels.push(sale);
    periodSale.totalUnits += sale.units;
    periodSale.totalGrossRevenue += sale.grossRevenue;
    periodSale.totalNetRevenue += sale.netRevenue;
  }

  // Convert map to sorted array
  const periodSales = Array.from(periodSalesMap.values()).sort(
    (a, b) => a.periodSequence - b.periodSequence
  );

  // Calculate totals
  const totalUnits = parcelSales.reduce((sum, sale) => sum + sale.units, 0);
  const totalGrossRevenue = parcelSales.reduce(
    (sum, sale) => sum + sale.grossRevenue,
    0
  );
  const totalNetRevenue = parcelSales.reduce((sum, sale) => sum + sale.netRevenue, 0);
  const totalCommissions = parcelSales.reduce(
    (sum, sale) => sum + sale.commissions,
    0
  );
  const totalClosingCosts = parcelSales.reduce(
    (sum, sale) => sum + sale.closingCosts,
    0
  );

  // Calculate absorption rate (units per year)
  const firstSalePeriod = Math.min(...parcelSales.map((s) => s.salePeriod));
  const lastSalePeriod = Math.max(...parcelSales.map((s) => s.salePeriod));
  const saleDurationMonths = lastSalePeriod - firstSalePeriod + 1;
  const absorptionRate = saleDurationMonths > 0
    ? (totalUnits / saleDurationMonths) * 12
    : 0;

  return {
    projectId,
    totalUnits,
    totalParcels: parcelSales.length,
    absorptionRate,
    firstSalePeriod,
    lastSalePeriod,
    periodSales,
    totalGrossRevenue,
    totalNetRevenue,
    totalCommissions,
    totalClosingCosts,
  };
}

/**
 * Convert absorption schedule to period values for cash flow
 */
export function absorptionToPeriodValues(
  schedule: AbsorptionSchedule,
  maxPeriods: number
): {
  grossRevenue: PeriodValue[];
  commissions: PeriodValue[];
  closingCosts: PeriodValue[];
  netRevenue: PeriodValue[];
} {
  // Initialize arrays with zeros for all periods
  const grossRevenue: PeriodValue[] = [];
  const commissions: PeriodValue[] = [];
  const closingCosts: PeriodValue[] = [];
  const netRevenue: PeriodValue[] = [];

  // Fill in values from schedule
  for (const periodSale of schedule.periodSales) {
    const periodIndex = periodSale.periodIndex;
    const periodSequence = periodSale.periodSequence;

    if (periodIndex >= maxPeriods) continue;

    const totalCommissions = periodSale.parcels.reduce(
      (sum, p) => sum + p.commissions,
      0
    );
    const totalClosingCosts = periodSale.parcels.reduce(
      (sum, p) => sum + p.closingCosts,
      0
    );

    grossRevenue.push({
      periodIndex,
      periodSequence,
      amount: periodSale.totalGrossRevenue,
      source: 'absorption',
    });

    commissions.push({
      periodIndex,
      periodSequence,
      amount: -totalCommissions, // Negative (cost)
      source: 'absorption',
    });

    closingCosts.push({
      periodIndex,
      periodSequence,
      amount: -totalClosingCosts, // Negative (cost)
      source: 'absorption',
    });

    netRevenue.push({
      periodIndex,
      periodSequence,
      amount: periodSale.totalNetRevenue,
      source: 'absorption',
    });
  }

  return {
    grossRevenue,
    commissions,
    closingCosts,
    netRevenue,
  };
}
