/**
 * Regression cover for TB12-METRICSPERIOD-0714.
 *
 * Three period-convention defects in calculateInvestmentMetrics, all live on
 * /api/cre/properties/[property_id]/metrics:
 *
 *   1. IRR was returned as a PER-PERIOD rate and reported as annual. On the
 *      monthly series every caller builds, a true 12.76% IRR displayed as 1.01%.
 *   2. NPV discounted a MONTHLY series at an ANNUAL rate. Over a 5-year hold the
 *      reversion was discounted 304x instead of 1.61x. A deal worth +$1.09M
 *      displayed as -$9.26M — the SIGN FLIPS.
 *   3. Unlevered IRR was passed the GROSS exitValue while levered was passed
 *      netReversion — adjacent lines, two bases. Overstated unlevered by ~57bps
 *      and made the unlevered/levered spread meaningless.
 *
 * Why nothing caught this: there were no tests on this module at all, and
 * calculateAverageDSCR in the same file handles the monthly convention
 * correctly — so the knowledge existed six functions away and didn't propagate.
 *
 * These tests assert VALUES, not shapes. See the LSCMD-IRRWIRE-0714-TB
 * post-mortem for why that distinction is load-bearing here.
 */

import {
  calculateInvestmentMetrics,
  annualizePeriodicRate,
  toPeriodicRate,
} from '../src/lib/calculations/metrics';
import type { CashFlowPeriod } from '../src/lib/calculations/cashflow';

/** 60 monthly periods: $70k/mo net, no debt. Fully typed — no cast. */
function monthlySeries(months = 60, flow = 70_000): CashFlowPeriod[] {
  return Array.from({ length: months }, (_, i): CashFlowPeriod => ({
    period_id: i + 1,
    period_date: new Date(2025, i, 1),

    base_rent_revenue: flow,
    percentage_rent_revenue: 0,
    expense_recovery_revenue: 0,
    other_income: 0,
    gross_revenue: flow,

    vacancy_loss: 0,
    credit_loss: 0,
    effective_gross_income: flow,

    property_taxes: 0,
    insurance: 0,
    cam_expenses: 0,
    utilities: 0,
    management_fee: 0,
    repairs_maintenance: 0,
    other_expenses: 0,
    total_operating_expenses: 0,

    net_operating_income: flow,

    capital_reserves: 0,
    tenant_improvements: 0,
    leasing_commissions: 0,
    total_capital: 0,

    cash_flow_before_debt: flow,
    debt_service: 0,
    net_cash_flow: flow,
  }));
}

describe('period-conversion helpers', () => {
  it('annualizes a monthly rate by compounding, not multiplying', () => {
    // 1% monthly is 12.68% annual, NOT 12.00%.
    expect(annualizePeriodicRate(0.01, 12)).toBeCloseTo(0.126825, 5);
    expect(annualizePeriodicRate(0.01, 12)).not.toBeCloseTo(0.12, 3);
  });

  it('is an identity when periodsPerYear is 1', () => {
    expect(annualizePeriodicRate(0.09, 1)).toBe(0.09);
    expect(toPeriodicRate(0.09, 1)).toBe(0.09);
  });

  it('converts annual to periodic geometrically, not by division', () => {
    // 10% annual is 0.797% monthly, NOT 0.833% (= 10/12).
    expect(toPeriodicRate(0.10, 12)).toBeCloseTo(0.0079741, 6);
    expect(toPeriodicRate(0.10, 12)).not.toBeCloseTo(0.10 / 12, 5);
  });

  it('round-trips', () => {
    expect(annualizePeriodicRate(toPeriodicRate(0.10, 12), 12)).toBeCloseTo(0.10, 10);
  });
});

describe('calculateInvestmentMetrics — period convention (TB12 regression)', () => {
  const cashFlows = monthlySeries();
  const acquisitionPrice = 10_000_000;
  const exitCapRate = 0.065;

  it('reports IRR as an ANNUAL rate, not a monthly one', () => {
    const m = calculateInvestmentMetrics(cashFlows, acquisitionPrice, exitCapRate);

    // Pre-fix this returned ~0.0101 (a monthly rate mislabelled annual).
    // A double-digit annual IRR must not read as ~1%.
    expect(m.irr).toBeGreaterThan(0.05);
    expect(m.irr).toBeLessThan(0.40);
  });

  it('does not discount a monthly series at an annual rate', () => {
    const m = calculateInvestmentMetrics(
      cashFlows, acquisitionPrice, exitCapRate, undefined, 0.10
    );

    // Pre-fix NPV was ~-$9.26M on a deal that is genuinely positive — the bug
    // inverted the SIGN, not just the magnitude. This is the assertion that
    // would have caught it.
    expect(m.npv).toBeGreaterThan(-acquisitionPrice * 0.5);
  });

  it('uses the same reversion basis for levered and unlevered IRR', () => {
    const m = calculateInvestmentMetrics(cashFlows, acquisitionPrice, exitCapRate);

    // With zero debt, levered and unlevered must agree. Pre-fix they could not:
    // unlevered was handed gross exitValue, levered netReversion.
    expect(m.unlevered_irr).toBeCloseTo(m.irr, 6);
  });

  it('unlevered IRR nets selling costs (does not use gross exit value)', () => {
    const withCosts = calculateInvestmentMetrics(
      cashFlows, acquisitionPrice, exitCapRate, undefined, 0.10, 0.03
    );
    const withoutCosts = calculateInvestmentMetrics(
      cashFlows, acquisitionPrice, exitCapRate, undefined, 0.10, 0.0
    );

    // Selling costs must reduce unlevered IRR. Pre-fix, unlevered read the gross
    // exit value and was blind to sellingCostsPct entirely.
    expect(withCosts.unlevered_irr).toBeLessThan(withoutCosts.unlevered_irr);
  });

  it('honours an explicit periodsPerYear', () => {
    const asMonthly = calculateInvestmentMetrics(
      cashFlows, acquisitionPrice, exitCapRate, undefined, 0.10, 0.03, 12
    );
    const asAnnual = calculateInvestmentMetrics(
      cashFlows, acquisitionPrice, exitCapRate, undefined, 0.10, 0.03, 1
    );

    // Same series read as annual periods yields a far smaller annualised rate,
    // because no compounding is applied. Proves the parameter is live.
    expect(asMonthly.irr).toBeGreaterThan(asAnnual.irr);
  });

  it('rejects a nonsensical periodsPerYear rather than silently misreporting', () => {
    expect(() =>
      calculateInvestmentMetrics(cashFlows, acquisitionPrice, exitCapRate, undefined, 0.10, 0.03, 0)
    ).toThrow(/periodsPerYear/);
  });

  it('defaults to monthly, matching every caller in the repo', () => {
    const explicit = calculateInvestmentMetrics(
      cashFlows, acquisitionPrice, exitCapRate, undefined, 0.10, 0.03, 12
    );
    const defaulted = calculateInvestmentMetrics(cashFlows, acquisitionPrice, exitCapRate);

    expect(defaulted.irr).toBeCloseTo(explicit.irr, 10);
  });
});
