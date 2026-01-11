/**
 * Land Development Cash Flow Engine
 *
 * Main exports for cash flow calculation functionality
 */

// Main engine
export { generateCashFlow, fetchProjectConfig } from './engine';
export type { ProjectConfig } from './engine';

// Types
export type {
  // Period types
  CalculationPeriod,
  PeriodType,
  PeriodValue,

  // Cash flow structures
  CashFlowSchedule,
  CashFlowSection,
  CashFlowLineItem,
  CashFlowSummary,

  // Revenue types
  ParcelSale,
  ParcelPricing,
  AbsorptionSchedule,
  PeriodSales,

  // Cost types
  BudgetAllocation,
  CostSchedule,

  // Metrics types
  IRRCalculationResult,
  NPVCalculationResult,
  EquityAnalysis,

  // Options
  CashFlowEngineOptions,

  // Utility types
  CategoryMapping,
  PricingLookupResult,
  PeriodAggregation,

  // Error types
  CashFlowEngineError,
  CashFlowErrorCode,
} from './types';

// Period utilities
export {
  fetchProjectPeriods,
  getProjectPeriodCount,
  getProjectDateRange,
  generatePeriods,
  aggregatePeriods,
  sequenceToIndex,
  indexToSequence,
  findPeriodBySequence,
  findPeriodByIndex,
  getPeriodRange,
  validatePeriodSequence,
  monthsBetween,
  yearsBetween,
} from './periods';

// Cost allocation
export {
  fetchBudgetItems,
  fetchBudgetTiming,
  distributeBudgetItem,
  generateCostSchedule,
  getCategoryPeriodValues,
} from './costs';

// Revenue allocation
export {
  fetchProjectParcels,
  lookupParcelPricing,
  fetchSaleBenchmarks,
  calculateParcelSale,
  generateAbsorptionSchedule,
  absorptionToPeriodValues,
} from './revenue';

// Aggregation utilities
export {
  aggregateByTimeScale,
  aggregateToQuarters,
  aggregateToYears,
  sumAllPeriods,
  keepMonthly,
  groupByGranularity,
  groupCostsBySummary,
  groupCostsByStage,
  groupCostsByCategory,
  groupCostsByPhase,
  transformCashFlow,
} from './aggregation';

export type {
  TimeScale,
  CostGranularity,
  AggregatedSchedule,
  AggregatedSection,
  AggregatedLineItem,
  AggregatedPeriod,
} from './aggregation';

// Financial metrics
export {
  calculateIRR,
  calculateNPV,
  calculateEquityAnalysis,
  calculateCumulativeCashFlows,
  calculateGrossProfit,
  calculateROI,
  calculateROE,
  annualizeIRR,
  extractCashFlows,
  combineCashFlows,
  presentValue,
  futureValue,
  periodsToYears,
  formatPercent,
  formatCurrency,
  formatMultiple,
} from './metrics';
