/**
 * CRE Investment Metrics Calculator
 *
 * Calculates key return metrics for commercial real estate investments:
 * - IRR (Internal Rate of Return)
 * - NPV (Net Present Value)
 * - Equity Multiple
 * - Cash-on-Cash Return
 * - Debt Service Coverage Ratio (DSCR)
 *
 * Uses Newton-Raphson method for IRR calculation (ARGUS standard)
 */

import type { CashFlowPeriod } from './cashflow';

export interface InvestmentMetrics {
  // Investment details
  acquisition_price: number;
  total_equity_invested: number;
  debt_amount: number;
  hold_period_years: number;

  // Exit assumptions
  exit_cap_rate: number;
  terminal_noi: number;
  exit_value: number;
  selling_costs_pct: number;
  net_reversion: number;

  // Return metrics
  irr: number; // Levered IRR
  unlevered_irr: number;
  npv: number;
  equity_multiple: number;
  cash_on_cash_year_1: number;
  avg_dscr: number;

  // Cash flow totals
  total_cash_distributed: number;
  total_noi: number;
}

export interface DebtAssumptions {
  loan_amount: number;
  interest_rate: number;
  amortization_years: number;
  annual_debt_service: number;
}

/**
 * Calculate exit value (reversion) based on terminal NOI and exit cap rate
 */
export function calculateExitValue(
  terminalNOI: number,
  exitCapRate: number,
  sellingCostsPct: number = 0.03
): { exitValue: number; netReversion: number } {
  const exitValue = terminalNOI / exitCapRate;
  const sellingCosts = exitValue * sellingCostsPct;
  const netReversion = exitValue - sellingCosts;

  return { exitValue, netReversion };
}

/**
 * Calculate IRR using Newton-Raphson method
 *
 * IRR is the discount rate that makes NPV = 0
 * Uses iterative approximation to solve: NPV(IRR) = 0
 */
export function calculateIRR(
  initialInvestment: number,
  cashFlows: number[],
  reversionValue: number,
  maxIterations: number = 100,
  tolerance: number = 0.000001
): number {
  // Initial guess: 10%
  let irr = 0.10;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let npv = -initialInvestment;
    let derivative = 0;

    // Calculate NPV and its derivative at current IRR estimate
    for (let t = 0; t < cashFlows.length; t++) {
      const period = t + 1;
      const discountFactor = Math.pow(1 + irr, period);

      npv += cashFlows[t] / discountFactor;
      derivative -= (period * cashFlows[t]) / Math.pow(1 + irr, period + 1);
    }

    // Add reversion at end of hold period
    const holdPeriod = cashFlows.length;
    const reversionDiscountFactor = Math.pow(1 + irr, holdPeriod);
    npv += reversionValue / reversionDiscountFactor;
    derivative -= (holdPeriod * reversionValue) / Math.pow(1 + irr, holdPeriod + 1);

    // Check for convergence
    if (Math.abs(npv) < tolerance) {
      return irr;
    }

    // Newton-Raphson update: x_new = x_old - f(x) / f'(x)
    if (derivative === 0) {
      break; // Avoid division by zero
    }

    irr = irr - npv / derivative;

    // Bound IRR to reasonable range (-50% to +200%)
    irr = Math.max(-0.5, Math.min(2.0, irr));
  }

  // If no convergence, return NaN
  return NaN;
}

/**
 * Calculate NPV at a given discount rate
 */
export function calculateNPV(
  initialInvestment: number,
  cashFlows: number[],
  reversionValue: number,
  discountRate: number
): number {
  let npv = -initialInvestment;

  for (let t = 0; t < cashFlows.length; t++) {
    const period = t + 1;
    npv += cashFlows[t] / Math.pow(1 + discountRate, period);
  }

  // Add reversion at end
  const holdPeriod = cashFlows.length;
  npv += reversionValue / Math.pow(1 + discountRate, holdPeriod);

  return npv;
}

/**
 * Calculate equity multiple (total cash returned / equity invested)
 */
export function calculateEquityMultiple(
  equityInvested: number,
  totalCashFlows: number,
  netReversion: number
): number {
  const totalReturn = totalCashFlows + netReversion;
  return totalReturn / equityInvested;
}

/**
 * Calculate cash-on-cash return for Year 1
 */
export function calculateCashOnCash(
  year1CashFlow: number,
  equityInvested: number
): number {
  return year1CashFlow / equityInvested;
}

/**
 * Calculate Debt Service Coverage Ratio (DSCR) for each period
 *
 * DSCR = NOI / Annual Debt Service
 * Lenders typically require minimum 1.20x - 1.35x
 */
export function calculateDSCR(noi: number, annualDebtService: number): number {
  if (annualDebtService === 0) return 0;
  return noi / annualDebtService;
}

/**
 * Calculate average DSCR across all periods
 */
export function calculateAverageDSCR(
  cashFlows: CashFlowPeriod[],
  annualDebtService: number
): number {
  if (annualDebtService === 0) return 0;

  // Group by year and calculate annual DSCR
  const yearlyDSCRs: number[] = [];
  const periodsPerYear = 12; // Assuming monthly cash flows

  for (let i = 0; i < cashFlows.length; i += periodsPerYear) {
    const yearCashFlows = cashFlows.slice(i, i + periodsPerYear);
    const yearNOI = yearCashFlows.reduce((sum, cf) => sum + cf.net_operating_income, 0);
    const dscr = calculateDSCR(yearNOI, annualDebtService);
    yearlyDSCRs.push(dscr);
  }

  // Return average
  return yearlyDSCRs.reduce((sum, dscr) => sum + dscr, 0) / yearlyDSCRs.length;
}

/**
 * Calculate unlevered IRR (no debt)
 *
 * Uses cash flow before debt service
 */
export function calculateUnleveredIRR(
  acquisitionPrice: number,
  cashFlows: CashFlowPeriod[],
  exitValue: number
): number {
  // Use cash flow before debt
  const cashFlowsBeforeDebt = cashFlows.map(cf => cf.cash_flow_before_debt);

  return calculateIRR(acquisitionPrice, cashFlowsBeforeDebt, exitValue);
}

/**
 * Calculate levered IRR (with debt)
 *
 * Uses net cash flow after debt service
 */
export function calculateLeveredIRR(
  equityInvested: number,
  cashFlows: CashFlowPeriod[],
  netReversion: number,
  loanBalance: number = 0
): number {
  // Use net cash flow (after debt)
  const netCashFlows = cashFlows.map(cf => cf.net_cash_flow);

  // Reversion is reduced by outstanding loan balance
  const equityReversion = netReversion - loanBalance;

  return calculateIRR(equityInvested, netCashFlows, equityReversion);
}

/**
 * Calculate comprehensive investment metrics
 */
export function calculateInvestmentMetrics(
  cashFlows: CashFlowPeriod[],
  acquisitionPrice: number,
  exitCapRate: number,
  debtAssumptions?: DebtAssumptions,
  discountRate: number = 0.10,
  sellingCostsPct: number = 0.03
): InvestmentMetrics {
  if (cashFlows.length === 0) {
    throw new Error('Cash flows array is empty');
  }

  // Calculate terminal NOI (last 12 months)
  const lastYearStart = Math.max(0, cashFlows.length - 12);
  const lastYearCashFlows = cashFlows.slice(lastYearStart);
  const terminalNOI = lastYearCashFlows.reduce((sum, cf) => sum + cf.net_operating_income, 0);

  // Calculate exit value
  const { exitValue, netReversion } = calculateExitValue(terminalNOI, exitCapRate, sellingCostsPct);

  // Debt assumptions
  const debtAmount = debtAssumptions?.loan_amount || 0;
  const equityInvested = acquisitionPrice - debtAmount;
  const annualDebtService = debtAssumptions?.annual_debt_service || 0;

  // Calculate total cash distributed
  const totalCashDistributed = cashFlows.reduce((sum, cf) => sum + cf.net_cash_flow, 0);
  const totalNOI = cashFlows.reduce((sum, cf) => sum + cf.net_operating_income, 0);

  // Year 1 metrics
  const year1Periods = cashFlows.slice(0, Math.min(12, cashFlows.length));
  const year1CashFlow = year1Periods.reduce((sum, cf) => sum + cf.net_cash_flow, 0);
  const cashOnCashYear1 = calculateCashOnCash(year1CashFlow, equityInvested);

  // DSCR
  const avgDSCR = annualDebtService > 0 ? calculateAverageDSCR(cashFlows, annualDebtService) : 0;

  // IRR calculations
  const leveredIRR = calculateLeveredIRR(equityInvested, cashFlows, netReversion, debtAmount);
  const unleveredIRR = calculateUnleveredIRR(acquisitionPrice, cashFlows, exitValue);

  // NPV
  const npv = calculateNPV(equityInvested, cashFlows.map(cf => cf.net_cash_flow), netReversion - debtAmount, discountRate);

  // Equity multiple
  const equityMultiple = calculateEquityMultiple(equityInvested, totalCashDistributed, netReversion - debtAmount);

  const holdPeriodYears = Math.ceil(cashFlows.length / 12);

  return {
    acquisition_price: acquisitionPrice,
    total_equity_invested: equityInvested,
    debt_amount: debtAmount,
    hold_period_years: holdPeriodYears,

    exit_cap_rate: exitCapRate,
    terminal_noi: terminalNOI,
    exit_value: exitValue,
    selling_costs_pct: sellingCostsPct,
    net_reversion: netReversion,

    irr: leveredIRR,
    unlevered_irr: unleveredIRR,
    npv: npv,
    equity_multiple: equityMultiple,
    cash_on_cash_year_1: cashOnCashYear1,
    avg_dscr: avgDSCR,

    total_cash_distributed: totalCashDistributed,
    total_noi: totalNOI,
  };
}

/**
 * Calculate annual debt service from loan parameters
 */
export function calculateAnnualDebtService(
  loanAmount: number,
  interestRate: number,
  amortizationYears: number
): number {
  const monthlyRate = interestRate / 12;
  const numPayments = amortizationYears * 12;

  // Monthly payment formula: P * [r(1+r)^n] / [(1+r)^n - 1]
  const monthlyPayment =
    loanAmount *
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return monthlyPayment * 12; // Annual debt service
}

/**
 * Calculate loan balance after N periods
 */
export function calculateLoanBalance(
  originalLoanAmount: number,
  interestRate: number,
  amortizationYears: number,
  periodsElapsed: number
): number {
  const monthlyRate = interestRate / 12;
  const totalPayments = amortizationYears * 12;

  // Monthly payment
  const monthlyPayment =
    originalLoanAmount *
    (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
    (Math.pow(1 + monthlyRate, totalPayments) - 1);

  // Remaining balance formula: P * [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
  const remainingBalance =
    originalLoanAmount *
    (Math.pow(1 + monthlyRate, totalPayments) - Math.pow(1 + monthlyRate, periodsElapsed)) /
    (Math.pow(1 + monthlyRate, totalPayments) - 1);

  return Math.max(0, remainingBalance);
}
