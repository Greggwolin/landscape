/**
 * TypeScript type definitions for Land Development Cash Flow Engine
 *
 * Defines interfaces for period-by-period cash flow generation,
 * revenue/cost allocation, and financial metrics calculation.
 */

// ============================================================================
// PERIOD DEFINITIONS
// ============================================================================

export type PeriodType = 'month' | 'quarter' | 'year';

export interface CalculationPeriod {
  periodId: number;
  periodIndex: number;        // 0-based index for calculations
  periodSequence: number;     // 1-based sequence from database
  periodType: PeriodType;
  startDate: Date;
  endDate: Date;
  label: string;              // "Month 1", "Jan 2025", "Q1 2025"
  fiscalYear?: number;
  fiscalQuarter?: number;
}

// ============================================================================
// CASH FLOW LINE ITEMS
// ============================================================================

export interface PeriodValue {
  periodIndex: number;
  periodSequence: number;     // 1-based for database lookups
  amount: number;
  isActual?: boolean;         // vs forecast (default false)
  source?: string;            // 'budget', 'absorption', 'calculated'
}

export interface CashFlowLineItem {
  lineId: string;             // Unique identifier
  category: string;           // 'acquisition', 'planning', 'development', 'revenue'
  subcategory: string;        // 'entitlements', 'engineering', 'lot_sales'
  description: string;        // Display name
  containerId?: number;       // Area/phase/parcel container
  containerLabel?: string;    // Container display name

  // Period-by-period values
  periods: PeriodValue[];

  // Summary columns
  total: number;
  presentValue?: number;      // If discount rate applied

  // Metadata
  sourceId?: number;          // Reference to budget item or parcel
  sourceType?: 'budget' | 'parcel' | 'calculated';
}

export interface CashFlowSection {
  sectionId: string;
  sectionName: string;        // 'LAND ACQUISITION', 'DEVELOPMENT COSTS', 'REVENUE'
  lineItems: CashFlowLineItem[];
  subtotals: PeriodValue[];   // Sum of all line items in section
  sectionTotal: number;       // Sum across all periods
  sortOrder: number;          // Display order
}

// ============================================================================
// REVENUE CALCULATION
// ============================================================================

export interface ParcelPricing {
  parcelId: number;
  typeCode: string;           // Land use type (e.g., 'SFD', 'MF')
  productCode: string;        // Product code (e.g., '50x125', 'APTS')

  // Pricing configuration
  pricePerUnit: number;
  unitOfMeasure: string;      // 'FF', 'SF', 'AC', 'EA', 'UN'
  growthRate: number;         // Annual escalation rate (e.g., 0.035 for 3.5%)

  // Physical attributes
  lotWidth?: number;          // For FF-based pricing
  lotArea?: number;           // For SF-based pricing
  acres?: number;             // For acre-based pricing
  units?: number;             // For unit-based pricing
}

export interface ParcelSale {
  parcelId: number;
  parcelCode: string;
  containerId?: number;
  salePeriod: number;         // Period sequence when sale closes

  // Pricing calculation
  pricing: ParcelPricing;
  baseRevenue: number;        // Before escalation
  escalationFactor: number;   // (1 + growthRate)^years
  grossRevenue: number;       // After escalation

  // Deductions
  commissionRate: number;     // Default 3% (0.03)
  commissions: number;
  closingCostRate?: number;   // Default 2% (0.02)
  closingCostPerUnit?: number;// Or fixed $/unit (e.g., $750)
  closingCosts: number;
  onsiteCostPct?: number;     // Default 6.5% (0.065) if applicable
  onsiteCosts: number;

  // Net proceeds
  totalDeductions: number;
  netRevenue: number;

  // Metadata
  units: number;
  productDescription?: string;
}

export interface AbsorptionSchedule {
  projectId: number;
  totalUnits: number;
  totalParcels: number;
  absorptionRate: number;     // Units per year
  firstSalePeriod: number;    // When sales begin
  lastSalePeriod: number;     // When sales end

  // Period-by-period sales
  periodSales: PeriodSales[];

  // Summary
  totalGrossRevenue: number;
  totalNetRevenue: number;
  totalCommissions: number;
  totalClosingCosts: number;
}

export interface PeriodSales {
  periodIndex: number;
  periodSequence: number;
  parcels: ParcelSale[];
  totalUnits: number;
  totalGrossRevenue: number;
  totalNetRevenue: number;
}

// ============================================================================
// COST ALLOCATION
// ============================================================================

export interface BudgetAllocation {
  factId: number;
  budgetItemId: number;
  projectId: number;
  containerId?: number;
  containerLabel?: string;  // Display name from tbl_division

  // Budget item details
  category: string;
  subcategory?: string;
  description: string;
  totalAmount: number;

  // Timing configuration
  startPeriod: number;
  periodsToComplete: number;
  endPeriod: number;
  timingMethod: 'curve' | 'distributed' | 'milestone' | 'lump';
  curveId?: string;
  curveSteepness?: number;

  // Period allocations
  periods: PeriodValue[];
}

export interface CostSchedule {
  projectId: number;
  totalCosts: number;

  // Grouped by category
  categorySummary: {
    [category: string]: {
      total: number;
      items: BudgetAllocation[];
    };
  };

  // Period-by-period totals
  periodTotals: PeriodValue[];
}

// ============================================================================
// CASH FLOW SCHEDULE
// ============================================================================

export interface CashFlowSchedule {
  projectId: number;
  scenarioId?: number;        // For scenario comparison
  generatedAt: Date;

  // Configuration
  periodType: PeriodType;
  startDate: Date;
  endDate: Date;
  totalPeriods: number;
  discountRate?: number;      // Annual rate for NPV
  includeFinancing: boolean;

  // Periods
  periods: CalculationPeriod[];

  // Line items grouped by section
  sections: CashFlowSection[];

  // Summary metrics
  summary: CashFlowSummary;

  // Metadata
  calculationVersion?: string;
  notes?: string;
}

export interface CashFlowSummary {
  // Revenue summary
  totalGrossRevenue: number;
  totalRevenueDeductions: number;
  totalNetRevenue: number;

  // Cost summary
  totalCosts: number;
  costsByCategory: {
    acquisition: number;
    planning: number;
    development: number;
    soft: number;
    financing: number;
    contingency: number;
    other: number;
  };

  // Profitability
  grossProfit: number;        // Net revenue - Total costs
  grossMargin: number;        // As decimal (e.g., 0.268 for 26.8%)

  // Return metrics
  irr?: number;               // Internal rate of return (annualized)
  npv?: number;               // Net present value at discount rate
  equityMultiple?: number;    // Total proceeds / Total costs
  peakEquity?: number;        // Maximum negative cash position
  paybackPeriod?: number;     // Periods to positive cumulative cash

  // Cash flow analysis
  totalCashIn: number;
  totalCashOut: number;
  netCashFlow: number;
  cumulativeCashFlow: number[];
}

// ============================================================================
// ENGINE OPTIONS
// ============================================================================

export interface CashFlowEngineOptions {
  projectId: number;
  scenarioId?: number;

  // Period settings
  periodType: PeriodType;
  startDate?: Date;           // Default: project start date
  endDate?: Date;             // Default: calculated from max sale period
  startPeriod?: number;       // Filter: first period to include
  endPeriod?: number;         // Filter: last period to include

  // Calculation options
  includeFinancing: boolean;  // Include debt/equity flows (Phase 2)
  discountRate?: number;      // For NPV calculation (annualized)
  inflationRate?: number;     // For cost escalation override

  // Filtering
  containerIds?: number[];    // Specific areas/phases only
  includeActuals?: boolean;   // Include actual vs forecast only

  // Caching
  useCache?: boolean;         // Use cached results if available
  cacheExpiration?: number;   // Cache TTL in seconds
}

// ============================================================================
// FINANCIAL METRICS
// ============================================================================

export interface IRRCalculationResult {
  irr: number;                // Annualized return
  iterations: number;         // Number of iterations to converge
  converged: boolean;         // Whether calculation converged
  npvAtIRR: number;          // NPV at calculated IRR (should be ~0)
}

export interface NPVCalculationResult {
  npv: number;                // Net present value
  discountRate: number;       // Rate used
  periodType: PeriodType;     // Monthly, quarterly, annual
}

export interface EquityAnalysis {
  totalInvestment: number;    // Total cash out
  totalProceeds: number;      // Total cash in
  equityMultiple: number;     // Proceeds / Investment
  peakEquity: number;         // Max negative position
  peakEquityPeriod: number;   // When max negative occurs
  paybackPeriod: number;      // Periods to breakeven
  paybackDate?: Date;         // Date of breakeven
}

// ============================================================================
// CACHE STRUCTURES
// ============================================================================

export interface CashFlowCache {
  cacheId: number;
  projectId: number;
  scenarioId?: number;

  // Configuration
  periodType: PeriodType;
  startDate: Date;
  endDate: Date;
  totalPeriods: number;
  discountRate?: number;
  includeFinancing: boolean;

  // Cached results (stored as JSONB)
  sections: CashFlowSection[];
  summary: CashFlowSummary;

  // Metadata
  generatedAt: Date;
  expiresAt?: Date;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class CashFlowEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'CashFlowEngineError';
  }
}

export type CashFlowErrorCode =
  | 'PROJECT_NOT_FOUND'
  | 'NO_PERIODS_CONFIGURED'
  | 'NO_BUDGET_DATA'
  | 'NO_PARCEL_DATA'
  | 'NO_PRICING_DATA'
  | 'INVALID_PERIOD_RANGE'
  | 'IRR_NOT_CONVERGED'
  | 'INVALID_CONFIGURATION';

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface CategoryMapping {
  activity: string;           // From core_fin_fact_budget.activity
  category: string;           // Standardized category
  sortOrder: number;          // Display order
}

export interface PricingLookupResult {
  found: boolean;
  pricing?: ParcelPricing;
  fallbackUsed?: boolean;
  error?: string;
}

export interface PeriodAggregation {
  fromType: PeriodType;
  toType: PeriodType;
  periods: CalculationPeriod[];
  aggregatedValues: PeriodValue[];
}
