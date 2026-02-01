/**
 * Financial metrics calculations for land development cash flow
 *
 * Implements IRR, NPV, equity multiple, and other return metrics
 * using Newton-Raphson method for IRR convergence.
 */

import type {
  IRRCalculationResult,
  NPVCalculationResult,
  EquityAnalysis,
  PeriodType,
  PeriodValue,
} from './types';

// ============================================================================
// IRR CALCULATION
// ============================================================================

/**
 * Calculate Internal Rate of Return using Newton-Raphson method
 *
 * @param cashFlows - Array of period cash flows (negatives are outflows)
 * @param guess - Initial guess for IRR (default: auto-calculated based on cash flows)
 * @param maxIterations - Maximum iterations before giving up (default 100)
 * @param tolerance - Convergence tolerance for rate change (default 1e-7)
 * @returns IRR calculation result with convergence details
 */
export function calculateIRR(
  cashFlows: number[],
  guess?: number,
  maxIterations: number = 100,
  tolerance: number = 1e-7
): IRRCalculationResult {
  if (cashFlows.length < 2) {
    return {
      irr: NaN,
      iterations: 0,
      converged: false,
      npvAtIRR: NaN,
    };
  }

  // Check if all cash flows are same sign (no IRR possible)
  const hasPositive = cashFlows.some((cf) => cf > 0);
  const hasNegative = cashFlows.some((cf) => cf < 0);

  if (!hasPositive || !hasNegative) {
    return {
      irr: NaN,
      iterations: 0,
      converged: false,
      npvAtIRR: NaN,
    };
  }

  // Calculate a smart initial guess if not provided
  // Use a simple return-based estimate: (total returns / total investment)^(1/periods) - 1
  let initialGuess = guess;
  if (initialGuess === undefined) {
    const totalInflows = cashFlows.reduce((sum, cf) => cf > 0 ? sum + cf : sum, 0);
    const totalOutflows = cashFlows.reduce((sum, cf) => cf < 0 ? sum + Math.abs(cf) : sum, 0);
    if (totalOutflows > 0 && cashFlows.length > 1) {
      // Simple approximation: periodic rate that would achieve the observed return
      const totalReturn = totalInflows / totalOutflows;
      initialGuess = Math.pow(totalReturn, 1 / (cashFlows.length - 1)) - 1;
      // Clamp to reasonable range
      initialGuess = Math.max(-0.5, Math.min(0.5, initialGuess));
    } else {
      initialGuess = 0.01; // Default to 1% if can't calculate
    }
  }

  // Try Newton-Raphson with the initial guess
  let result = tryNewtonRaphson(cashFlows, initialGuess, maxIterations, tolerance);

  // If didn't converge, try a few other starting points
  if (!result.converged) {
    const alternativeGuesses = [0.001, 0.01, 0.05, -0.01, 0.1];
    for (const altGuess of alternativeGuesses) {
      if (altGuess === initialGuess) continue;
      result = tryNewtonRaphson(cashFlows, altGuess, maxIterations, tolerance);
      if (result.converged) break;
    }
  }

  return result;
}

/**
 * Internal Newton-Raphson iteration
 */
function tryNewtonRaphson(
  cashFlows: number[],
  guess: number,
  maxIterations: number,
  tolerance: number
): IRRCalculationResult {
  let rate = guess;
  let iterations = 0;

  for (let i = 0; i < maxIterations; i++) {
    iterations = i + 1;

    const { npv, dnpv } = npvAndDerivative(cashFlows, rate);

    // Avoid division by zero
    if (Math.abs(dnpv) < 1e-10) {
      break;
    }

    // Newton-Raphson iteration
    const newRate = rate - npv / dnpv;

    // Check convergence based on rate change (not absolute NPV)
    // This handles large cash flow values where NPV may never reach a tiny absolute value
    if (Math.abs(newRate - rate) < tolerance) {
      return {
        irr: newRate,
        iterations,
        converged: true,
        npvAtIRR: npv,
      };
    }

    rate = newRate;

    // Prevent unrealistic rates
    if (rate < -0.99 || rate > 10.0) {
      break;
    }
  }

  // Did not converge
  return {
    irr: NaN,
    iterations,
    converged: false,
    npvAtIRR: NaN,
  };
}

/**
 * Calculate NPV and its derivative for Newton-Raphson method
 */
function npvAndDerivative(
  cashFlows: number[],
  rate: number
): { npv: number; dnpv: number } {
  let npv = 0;
  let dnpv = 0;

  for (let t = 0; t < cashFlows.length; t++) {
    const discountFactor = Math.pow(1 + rate, t);

    if (discountFactor === 0) {
      continue;
    }

    npv += cashFlows[t] / discountFactor;

    if (t > 0) {
      dnpv -= (t * cashFlows[t]) / (discountFactor * (1 + rate));
    }
  }

  return { npv, dnpv };
}

/**
 * Calculate annualized IRR from periodic IRR
 *
 * @param periodicIRR - IRR based on period length
 * @param periodType - Type of periods used
 * @returns Annualized IRR
 */
export function annualizeIRR(periodicIRR: number, periodType: PeriodType): number {
  switch (periodType) {
    case 'month':
      // Monthly to annual: (1 + r)^12 - 1
      return Math.pow(1 + periodicIRR, 12) - 1;

    case 'quarter':
      // Quarterly to annual: (1 + r)^4 - 1
      return Math.pow(1 + periodicIRR, 4) - 1;

    case 'year':
      // Already annual
      return periodicIRR;

    default:
      return periodicIRR;
  }
}

// ============================================================================
// NPV CALCULATION
// ============================================================================

/**
 * Calculate Net Present Value
 *
 * @param cashFlows - Array of period cash flows
 * @param discountRate - Annual discount rate (e.g., 0.10 for 10%)
 * @param periodType - Type of periods (affects discounting)
 * @returns NPV calculation result
 */
export function calculateNPV(
  cashFlows: number[],
  discountRate: number,
  periodType: PeriodType = 'month'
): NPVCalculationResult {
  // Convert annual rate to period rate
  const periodRate = convertToPeriodRate(discountRate, periodType);

  let npv = 0;

  for (let t = 0; t < cashFlows.length; t++) {
    const discountFactor = Math.pow(1 + periodRate, t);
    npv += cashFlows[t] / discountFactor;
  }

  return {
    npv,
    discountRate,
    periodType,
  };
}

/**
 * Convert annual discount rate to period rate
 */
function convertToPeriodRate(annualRate: number, periodType: PeriodType): number {
  switch (periodType) {
    case 'month':
      // Annual to monthly: (1 + r)^(1/12) - 1
      return Math.pow(1 + annualRate, 1 / 12) - 1;

    case 'quarter':
      // Annual to quarterly: (1 + r)^(1/4) - 1
      return Math.pow(1 + annualRate, 1 / 4) - 1;

    case 'year':
      // Already annual
      return annualRate;

    default:
      return annualRate;
  }
}

// ============================================================================
// EQUITY ANALYSIS
// ============================================================================

/**
 * Calculate equity multiple and related metrics
 *
 * @param cashFlows - Array of period cash flows
 * @returns Equity analysis with multiple, peak equity, payback
 */
export function calculateEquityAnalysis(
  cashFlows: number[],
  periods?: Date[]
): EquityAnalysis {
  // Calculate cumulative cash flows
  const cumulativeCashFlows = calculateCumulativeCashFlows(cashFlows);

  // Total investment (sum of negative cash flows)
  const totalInvestment = cashFlows.reduce((sum, cf) => {
    return cf < 0 ? sum + Math.abs(cf) : sum;
  }, 0);

  // Total proceeds (sum of positive cash flows)
  const totalProceeds = cashFlows.reduce((sum, cf) => {
    return cf > 0 ? sum + cf : sum;
  }, 0);

  // Equity multiple
  const equityMultiple =
    totalInvestment > 0 ? totalProceeds / totalInvestment : 0;

  // Peak equity (maximum negative position)
  const peakEquity = Math.min(...cumulativeCashFlows);
  const peakEquityPeriod =
    cumulativeCashFlows.indexOf(peakEquity);

  // Payback period (first period with positive cumulative cash flow)
  const paybackPeriod = cumulativeCashFlows.findIndex((cf) => cf >= 0);
  const paybackDate =
    paybackPeriod >= 0 && periods && periods[paybackPeriod]
      ? periods[paybackPeriod]
      : undefined;

  return {
    totalInvestment,
    totalProceeds,
    equityMultiple,
    peakEquity,
    peakEquityPeriod,
    paybackPeriod: paybackPeriod >= 0 ? paybackPeriod : -1,
    paybackDate,
  };
}

/**
 * Calculate cumulative cash flows
 */
export function calculateCumulativeCashFlows(cashFlows: number[]): number[] {
  const cumulative: number[] = [];
  let sum = 0;

  for (const cf of cashFlows) {
    sum += cf;
    cumulative.push(sum);
  }

  return cumulative;
}

// ============================================================================
// PROFITABILITY METRICS
// ============================================================================

/**
 * Calculate gross profit and margin
 */
export function calculateGrossProfit(
  totalRevenue: number,
  totalCosts: number
): {
  grossProfit: number;
  grossMargin: number;
  costRatio: number;
} {
  const grossProfit = totalRevenue - totalCosts;
  const grossMargin = totalRevenue > 0 ? grossProfit / totalRevenue : 0;
  const costRatio = totalRevenue > 0 ? totalCosts / totalRevenue : 0;

  return {
    grossProfit,
    grossMargin,
    costRatio,
  };
}

/**
 * Calculate return on investment (ROI)
 */
export function calculateROI(gain: number, cost: number): number {
  return cost > 0 ? gain / cost : 0;
}

/**
 * Calculate return on equity (ROE) - annualized
 */
export function calculateROE(
  netIncome: number,
  averageEquity: number,
  years: number
): number {
  if (averageEquity <= 0 || years <= 0) {
    return 0;
  }

  const totalReturn = netIncome / averageEquity;
  return Math.pow(1 + totalReturn, 1 / years) - 1;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract cash flow array from PeriodValue array
 */
export function extractCashFlows(periodValues: PeriodValue[]): number[] {
  return periodValues
    .sort((a, b) => a.periodIndex - b.periodIndex)
    .map((pv) => pv.amount);
}

/**
 * Combine multiple cash flow streams
 */
export function combineCashFlows(...cashFlowArrays: number[][]): number[] {
  if (cashFlowArrays.length === 0) {
    return [];
  }

  const maxLength = Math.max(...cashFlowArrays.map((arr) => arr.length));
  const combined: number[] = new Array(maxLength).fill(0);

  for (const cashFlows of cashFlowArrays) {
    for (let i = 0; i < cashFlows.length; i++) {
      combined[i] += cashFlows[i] || 0;
    }
  }

  return combined;
}

/**
 * Calculate present value of a single cash flow
 */
export function presentValue(
  amount: number,
  period: number,
  discountRate: number,
  periodType: PeriodType = 'month'
): number {
  const periodRate = convertToPeriodRate(discountRate, periodType);
  return amount / Math.pow(1 + periodRate, period);
}

/**
 * Calculate future value of a single cash flow
 */
export function futureValue(
  amount: number,
  period: number,
  growthRate: number,
  periodType: PeriodType = 'month'
): number {
  const periodRate = convertToPeriodRate(growthRate, periodType);
  return amount * Math.pow(1 + periodRate, period);
}

/**
 * Calculate years from period count and type
 */
export function periodsToYears(periodCount: number, periodType: PeriodType): number {
  switch (periodType) {
    case 'month':
      return periodCount / 12;
    case 'quarter':
      return periodCount / 4;
    case 'year':
      return periodCount;
    default:
      return periodCount;
  }
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number, decimals: number = 0): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format multiple for display
 */
export function formatMultiple(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}x`;
}
