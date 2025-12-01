/**
 * Validation Report Types
 * Types for the development debugging tool that compares app calculations
 * against the Peoria Lakes Excel source data.
 *
 * This report mirrors the Excel "Project Costs" layout for validation.
 */

// ============================================================================
// OTHER LAND PARCEL (MF, BTR, etc.)
// ============================================================================

export interface OtherLandParcel {
  parcelCode: string;
  typeCode: string;
  units: number;
  acres: number;
  pricePerUnit: number;
  grossRevenue: number;
  netRevenue: number;
}

// Aggregated by land use type
export interface OtherLandByType {
  typeCode: string;
  units: number;
  acres: number;
  pricePerUnit: number;  // Average price per unit for this type
  grossRevenue: number;
  netRevenue: number;
}

// ============================================================================
// PHASE DATA STRUCTURE
// ============================================================================

export interface PhaseData {
  phaseName: string;
  phaseId: number | null;

  // Physical metrics - SFD Lots
  acres: number;
  lots: number;
  frontFeet: number;
  parcels: number;  // Number of SFD parcels (for per-parcel closing costs)

  // Physical metrics - Other Land (MF, BTR, etc.)
  otherLandAcres: number;
  otherLandUnits: number;
  otherLandParcels: OtherLandParcel[];
  otherLandByType: OtherLandByType[]; // Aggregated by land use type

  // Revenue - SFD Lots
  pricePerFrontFoot: number;
  grossRevenue: number;
  grossRevenuePerLot: number;

  // Revenue - Other Land
  otherLandGrossRevenue: number;
  otherLandNetRevenue: number;

  // Combined Revenue
  totalGrossRevenue: number;
  subdivisionCost: number;  // Development costs deducted from gross revenue
  grossSaleProceeds: number;  // Gross revenue minus subdivision costs (before commissions/closing)
  totalNetRevenue: number;

  // Deductions (SFD only for per-lot metrics)
  commissions: number;
  closingCostsPerLot: number;
  closingCostsTotal: number;
  netRevenue: number;
  netRevenuePerLot: number;

  // Schedule
  monthsToFirstSale: number;
  totalMonthsToSell: number;

  // Budget by category (from core_fin_fact_budget)
  acquisition: number;
  planningEngineering: number;
  development: number;
  operations: number;
  contingency: number;
  financing: number;

  // Budget totals
  totalCosts: number;
  costPerLot: number;

  // Profit metrics
  grossProfit: number;
  profitMargin: number;
}

// ============================================================================
// MAIN REPORT STRUCTURE
// ============================================================================

export interface ValidationReportData {
  projectId: number;
  projectName: string;
  generatedAt: string;

  // Project-wide totals
  totals: PhaseData;

  // Per-phase breakdown
  phases: PhaseData[];

  // Metadata
  meta: {
    phaseCount: number;
    totalLots: number;
    totalAcres: number;
    queryTimeMs: number;
  };
}

// ============================================================================
// API RESPONSE
// ============================================================================

export interface ValidationReportResponse {
  success: boolean;
  data?: ValidationReportData;
  error?: string;
  details?: string;
}

// ============================================================================
// VALUE FORMATTING HELPERS
// Excel-style formatting:
// Numbers: _(#,##0_);(#,##0);_("-"_)
// Currency: _($#,##0_);($#,##0);_("-"_)
// Percentages: _(#,##0%_);
// ============================================================================

/**
 * Format currency - Excel style _($#,##0_);($#,##0);_("-"_)
 * Positive: $1,234,568
 * Negative: ($1,234,568)
 * Zero: -
 */
export function formatValidationCurrency(value: number): string {
  if (value === 0) return '-';
  const absValue = Math.abs(value);
  const formatted = `$${Math.round(absValue).toLocaleString()}`;
  return value < 0 ? `(${formatted})` : formatted;
}

/**
 * Format percentage - Excel style _(#,##0%_);
 * e.g., 0.268 → 27%
 */
export function formatValidationPercent(value: number): string {
  if (value === 0) return '-';
  return `${Math.round(value * 100)}%`;
}

/**
 * Format number - Excel style _(#,##0_);(#,##0);_("-"_)
 * Positive: 1,234,567
 * Negative: (1,234,567)
 * Zero: -
 */
export function formatValidationNumber(value: number, decimals: number = 0): string {
  if (value === 0) return '-';
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return value < 0 ? `(${formatted})` : formatted;
}
