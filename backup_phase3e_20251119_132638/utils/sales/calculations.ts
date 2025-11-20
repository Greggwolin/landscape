import { differenceInDays, parseISO } from 'date-fns';

export function calculateInflatedValue(
  basePrice: number | null | undefined,
  growthRate: number | null | undefined,
  pricingStart: string | null | undefined,
  saleDate: string | null | undefined
): number | null {
  if (basePrice == null) return null;
  if (!saleDate || !pricingStart) return basePrice;

  try {
    const sale = parseISO(saleDate);
    const pricing = parseISO(pricingStart);
    const days = differenceInDays(sale, pricing);
    if (!Number.isFinite(days)) return basePrice;

    const yearsElapsed = days / 365;
    const rate = growthRate ?? 0;
    const inflated = basePrice * Math.pow(1 + rate, Math.max(yearsElapsed, 0));
    return Number.isFinite(inflated) ? inflated : basePrice;
  } catch (error) {
    return basePrice;
  }
}

export function calculateGrossValue(
  units: number | null | undefined,
  valuePerUnit: number | null | undefined
): number | null {
  if (units == null || valuePerUnit == null) return null;
  return units * valuePerUnit;
}

interface NetProceedsInput {
  grossValue: number;
  units: number;
  onsiteCostPercent?: number | null;
  onsiteCostAmount?: number | null;
  commissionPercent?: number | null;
  commissionAmount?: number | null;
  closingCostPerUnit?: number | null;
  closingCostTotal?: number | null;
}

export interface NetProceedsResult {
  onsiteCost: number;
  netPrice: number;
  commissionCost: number;
  closingCost: number;
  netProceeds: number;
}

export function calculateNetProceeds({
  grossValue,
  units,
  onsiteCostPercent,
  onsiteCostAmount,
  commissionPercent,
  commissionAmount,
  closingCostPerUnit,
  closingCostTotal,
}: NetProceedsInput): NetProceedsResult {
  const onsite = onsiteCostAmount ?? (onsiteCostPercent != null ? (grossValue * onsiteCostPercent) / 100 : 0);
  const netPrice = grossValue - onsite;

  const commissions = commissionAmount ?? (commissionPercent != null ? (grossValue * commissionPercent) / 100 : 0);
  const closingCosts = closingCostTotal ?? (closingCostPerUnit != null ? closingCostPerUnit * units : 0);

  const netProceeds = netPrice - commissions - closingCosts;

  return {
    onsiteCost: onsite,
    netPrice,
    commissionCost: commissions,
    closingCost: closingCosts,
    netProceeds,
  };
}
