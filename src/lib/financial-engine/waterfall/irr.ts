import type { CashFlow } from './types';

export interface DatedCashFlow {
  date: Date | string;
  amount: number;
}

type IRRParams = {
  guess?: number;
  maxIterations?: number;
  tolerance?: number;
};

const DAYS_IN_YEAR = 365;

/**
 * Calculate IRR for irregular cash flow dates (XIRR-style).
 * Returns annualized decimal rate (e.g., 0.15 for 15%).
 */
export function calculateIRR(
  contributions: DatedCashFlow[],
  distributions: DatedCashFlow[],
  params: IRRParams = {}
): number {
  const guess = params.guess ?? 0.1;
  const maxIterations = params.maxIterations ?? 75;
  const tolerance = params.tolerance ?? 1e-6;

  const flows = normalizeFlows([...contributions, ...distributions]);

  if (flows.length < 2 || !hasSignChange(flows)) {
    return 0;
  }

  const t0 = flows[0].date.getTime();

  const npvAndDerivative = (rate: number) => {
    let npv = 0;
    let dnpv = 0;

    for (const flow of flows) {
      const years = (flow.date.getTime() - t0) / (1000 * 60 * 60 * 24 * DAYS_IN_YEAR);
      const discount = Math.pow(1 + rate, years);

      if (!Number.isFinite(discount) || discount === 0) continue;

      npv += flow.amount / discount;
      if (years !== 0) {
        dnpv -= (years * flow.amount) / (discount * (1 + rate));
      }
    }

    return { npv, dnpv };
  };

  // Newton-Raphson
  let rate = guess;
  for (let i = 0; i < maxIterations; i++) {
    const { npv, dnpv } = npvAndDerivative(rate);
    if (Math.abs(npv) < tolerance) {
      return rate;
    }
    if (Math.abs(dnpv) < 1e-12) {
      break;
    }
    rate = rate - npv / dnpv;
    if (rate <= -0.99 || !Number.isFinite(rate)) {
      break;
    }
  }

  // Fallback to bisection between -0.99 and 5.0
  let low = -0.99;
  let high = 5.0;
  let lowNpv = npvAndDerivative(low).npv;
  let highNpv = npvAndDerivative(high).npv;

  // Expand bounds if needed
  let expandTries = 0;
  while (lowNpv * highNpv > 0 && expandTries < 10) {
    high += 5;
    highNpv = npvAndDerivative(high).npv;
    expandTries++;
  }

  if (lowNpv * highNpv > 0) {
    return 0;
  }

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const midNpv = npvAndDerivative(mid).npv;

    if (Math.abs(midNpv) < tolerance) {
      return mid;
    }

    if (lowNpv * midNpv < 0) {
      high = mid;
      highNpv = midNpv;
    } else {
      low = mid;
      lowNpv = midNpv;
    }
  }

  return (low + high) / 2;
}

function normalizeFlows(flows: DatedCashFlow[]): CashFlow[] {
  return flows
    .map((f) => ({
      amount: Number(f.amount),
      date: f.date instanceof Date ? f.date : new Date(f.date),
      periodId: 0,
    }))
    .filter((f) => Number.isFinite(f.amount))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function hasSignChange(flows: DatedCashFlow[]): boolean {
  const hasPositive = flows.some((f) => f.amount > 0);
  const hasNegative = flows.some((f) => f.amount < 0);
  return hasPositive && hasNegative;
}
