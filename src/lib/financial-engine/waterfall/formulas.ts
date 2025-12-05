// ============================================================================
// WATERFALL CALCULATION FORMULAS
// Based on Excel model WaterfallADVCRE.xlsx - Stevens Carey methodology
// ============================================================================

import type { WaterfallTier, WaterfallSettings } from './types';

const DAYS_IN_YEAR = 365;

// ============================================================================
// ACCRUAL FORMULAS
// ============================================================================

/**
 * Calculate compound interest accrual between two dates.
 * Excel Formula: =G93*((1+$C92)^((G46-F46)/365)-1)
 *
 * @param beginningBalance - Balance at start of period
 * @param annualRate - Annual rate as decimal (e.g., 0.08 for 8%)
 * @param currentDate - End of period date
 * @param priorDate - Start of period date
 * @returns Accrued amount for the period
 */
export function calculateAccrual(
  beginningBalance: number,
  annualRate: number,
  currentDate: Date,
  priorDate: Date
): number {
  if (beginningBalance <= 0 || annualRate <= 0) return 0;

  const daysBetween = (currentDate.getTime() - priorDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysBetween <= 0) return 0;

  return beginningBalance * (Math.pow(1 + annualRate, daysBetween / DAYS_IN_YEAR) - 1);
}

/**
 * Calculate days between two dates.
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
}

// ============================================================================
// CONTRIBUTION ALLOCATION
// ============================================================================

/**
 * Split negative cash flows by ownership percentage.
 * Excel Formula: =-MIN(0,G87*Equity_Share_LP)
 *
 * @param netCashFlow - Period cash flow (negative = contribution)
 * @param lpOwnership - LP ownership as decimal (e.g., 0.90 for 90%)
 * @returns Object with LP and GP contribution amounts (positive values)
 */
export function allocateContribution(
  netCashFlow: number,
  lpOwnership: number
): { lp: number; gp: number } {
  if (netCashFlow >= 0) return { lp: 0, gp: 0 };

  const totalContribution = -netCashFlow; // Make positive
  return {
    lp: totalContribution * lpOwnership,
    gp: totalContribution * (1 - lpOwnership),
  };
}

// ============================================================================
// SPLIT CALCULATION
// ============================================================================

/**
 * Calculate LP/GP split percentages based on ownership and promote.
 * Formula: GP_Split = 1 - (LP_Ownership × (1 - Promote))
 *
 * Example: 90% LP ownership, 20% promote
 * GP_Split = 1 - (0.90 × 0.80) = 0.28
 * LP_Split = 0.72
 *
 * @param lpOwnership - LP ownership as decimal (e.g., 0.90)
 * @param promotePercent - Promote percentage as decimal (e.g., 0.20)
 * @returns Object with LP and GP split percentages as decimals
 */
export function calculateSplits(
  lpOwnership: number,
  promotePercent: number
): { lpSplit: number; gpSplit: number } {
  const gpSplit = 1 - lpOwnership * (1 - promotePercent);
  const lpSplit = 1 - gpSplit;
  return { lpSplit, gpSplit };
}

// ============================================================================
// TIER 1: PREFERRED RETURN + RETURN OF CAPITAL
// ============================================================================

export interface Tier1Input {
  cashAvailable: number;
  lpCapitalAccount: number;    // What LP is owed (capital + accrued pref)
  gpCapitalAccount: number;    // What GP is owed (capital + accrued pref)
  lpSplitPct: number;          // As decimal (e.g., 0.90)
  gpSplitPct: number;          // As decimal (e.g., 0.10)
  gpCatchUp: boolean;
  returnOfCapital: 'LP First' | 'Pari Passu';
}

export interface TierDistResult {
  lpDist: number;
  gpDist: number;
  remaining: number;
}

/**
 * Calculate Tier 1 distribution (Preferred Return + Return of Capital).
 *
 * Excel Formulas:
 * - LP Distribution: =MIN(G93+G95, MAX(G87,0)*$I$15)
 * - GP Distribution (Catch-Up): =IF(CU?, MAX(MIN(G87-G100, G102+G103+G104), 0), G97/$I$15*$H$15)
 *
 * @param input - Tier 1 calculation inputs
 * @returns Distribution amounts and remaining cash
 */
export function calculateTier1Distribution(input: Tier1Input): TierDistResult {
  const {
    cashAvailable,
    lpCapitalAccount,
    gpCapitalAccount,
    lpSplitPct,
    gpSplitPct,
    gpCatchUp,
    returnOfCapital,
  } = input;

  if (cashAvailable <= 0) {
    return { lpDist: 0, gpDist: 0, remaining: 0 };
  }

  let lpDist = 0;
  let gpDist = 0;
  let remaining = cashAvailable;

  if (returnOfCapital === 'LP First') {
    // LP gets paid first up to their full capital account
    lpDist = Math.min(lpCapitalAccount, remaining);
    remaining -= lpDist;

    // Then GP gets their share
    gpDist = Math.min(gpCapitalAccount, remaining);
    remaining -= gpDist;
  } else {
    // Pari Passu: Distribute based on splits
    // LP distribution: MIN(what LP is owed, their share of available cash)
    const lpShare = cashAvailable * lpSplitPct;
    lpDist = Math.min(lpCapitalAccount, lpShare);

    if (gpCatchUp) {
      // GP catches up: gets MIN(remaining cash, what GP is owed)
      const remainingAfterLP = cashAvailable - lpDist;
      gpDist = Math.max(Math.min(remainingAfterLP, gpCapitalAccount), 0);
    } else {
      // Pro-rata: GP gets proportional share based on LP distribution
      // If LP got their full share, GP gets their full share
      // If LP was capped, GP is also proportionally capped
      if (lpSplitPct > 0 && lpDist > 0) {
        gpDist = (lpDist / lpSplitPct) * gpSplitPct;
        // Cap at what GP is actually owed
        gpDist = Math.min(gpDist, gpCapitalAccount);
      }
    }

    remaining = Math.max(cashAvailable - lpDist - gpDist, 0);
  }

  return { lpDist, gpDist, remaining };
}

// ============================================================================
// TIER 2-5: PROMOTE TIERS
// ============================================================================

export interface PromoteTierInput {
  cashAvailable: number;
  lpCapitalAccount: number;        // LP's capital account for this tier
  lpSplitPct: number;              // As decimal
  gpSplitPct: number;              // As decimal
  priorLpDistributions: number;    // Sum of LP distributions from prior tiers this period
}

/**
 * Calculate Promote Tier distribution (Tiers 2-5).
 *
 * Excel Formulas:
 * - LP Distribution: =MIN(G114+G115-G117, G110*$I$16)
 *   - G114 = Beginning balance (capital account)
 *   - G115 = Accrued return to hit hurdle
 *   - G117 = Prior distributions from earlier tiers
 *   - G110 = Cash remaining after Tier 1
 *   - $I$16 = LP split percentage
 * - GP Distribution: =G122/$I$16*$H$16
 *
 * @param input - Promote tier calculation inputs
 * @returns Distribution amounts and remaining cash
 */
export function calculatePromoteTierDistribution(input: PromoteTierInput): TierDistResult {
  const {
    cashAvailable,
    lpCapitalAccount,
    lpSplitPct,
    gpSplitPct,
    priorLpDistributions,
  } = input;

  if (cashAvailable <= 0) {
    return { lpDist: 0, gpDist: 0, remaining: 0 };
  }

  // LP needs: capital account balance - prior distributions from earlier tiers
  const lpNeed = lpCapitalAccount - priorLpDistributions;

  // LP gets: MIN(what they need, their split of available cash)
  const lpShareOfCash = cashAvailable * lpSplitPct;
  const lpDist = Math.min(Math.max(lpNeed, 0), lpShareOfCash);

  // GP gets their split based on LP distribution
  // This maintains the tier's split ratio
  let gpDist = 0;
  if (lpSplitPct > 0 && lpDist > 0) {
    gpDist = (lpDist / lpSplitPct) * gpSplitPct;
  }

  const totalDist = lpDist + gpDist;
  const remaining = Math.max(cashAvailable - totalDist, 0);

  return { lpDist, gpDist, remaining };
}

/**
 * Distribute remaining cash at final tier split.
 * For Tier 3 (residual) when hurdles are met, or if there's excess cash.
 */
export function distributeResidual(
  cashAvailable: number,
  lpSplitPct: number,
  gpSplitPct: number
): TierDistResult {
  if (cashAvailable <= 0) {
    return { lpDist: 0, gpDist: 0, remaining: 0 };
  }

  const lpDist = cashAvailable * lpSplitPct;
  const gpDist = cashAvailable * gpSplitPct;

  return { lpDist, gpDist, remaining: 0 };
}

// ============================================================================
// CAPITAL ACCOUNT UPDATE
// ============================================================================

/**
 * Update capital account after period activity.
 *
 * Excel Formula:
 * - Tier 1: =G93+G95+G96-G97 (beginning + accrual + contribution - distribution)
 * - Tier 2+: =G114+G115+G116-G117-G118 (+ prior tier netting)
 *
 * @param beginningBalance - Balance at start of period
 * @param accruedReturn - Interest accrued this period
 * @param contribution - New capital contributed this period
 * @param distribution - Amount distributed this period
 * @param priorTierDistributions - For Tier 2+, distributions from earlier tiers to net
 * @returns Updated capital account balance
 */
export function updateCapitalAccount(
  beginningBalance: number,
  accruedReturn: number,
  contribution: number,
  distribution: number,
  priorTierDistributions: number = 0
): number {
  return beginningBalance + accruedReturn + contribution - priorTierDistributions - distribution;
}

// ============================================================================
// EQUITY MULTIPLE CALCULATION
// ============================================================================

/**
 * Calculate equity multiple (distributions / contributions).
 *
 * @param totalDistributions - Sum of all distributions received
 * @param totalContributions - Sum of all capital contributed
 * @returns Equity multiple (e.g., 1.5 for 1.5x)
 */
export function calculateEquityMultiple(
  totalDistributions: number,
  totalContributions: number
): number {
  if (totalContributions <= 0) return 0;
  return totalDistributions / totalContributions;
}

// ============================================================================
// HURDLE CHECK
// ============================================================================

/**
 * Check if hurdle has been met based on method.
 *
 * @param settings - Waterfall settings including hurdle method
 * @param tier - Tier configuration with hurdle thresholds
 * @param currentIrr - Current IRR as decimal
 * @param currentEmx - Current equity multiple
 * @returns True if hurdle is met
 */
export function isHurdleMet(
  settings: WaterfallSettings,
  tier: WaterfallTier,
  currentIrr: number,
  currentEmx: number
): boolean {
  const irrThreshold = tier.irrHurdle !== null ? tier.irrHurdle / 100 : null;
  const emxThreshold = tier.emxHurdle;

  switch (settings.hurdleMethod) {
    case 'IRR':
      return irrThreshold !== null && currentIrr >= irrThreshold;

    case 'EMx':
      return emxThreshold !== null && currentEmx >= emxThreshold;

    case 'IRR_EMx':
      // Max of both - hurdle is met when EITHER is met
      const irrMet = irrThreshold !== null && currentIrr >= irrThreshold;
      const emxMet = emxThreshold !== null && currentEmx >= emxThreshold;
      return irrMet || emxMet;

    default:
      return false;
  }
}

// ============================================================================
// TIER CONFIGURATION HELPERS
// ============================================================================

/**
 * Get the hurdle rate for a tier based on hurdle method.
 */
export function getTierHurdleRate(
  tier: WaterfallTier,
  hurdleMethod: 'IRR' | 'EMx' | 'IRR_EMx'
): number {
  switch (hurdleMethod) {
    case 'IRR':
      return (tier.irrHurdle ?? tier.hurdleRate ?? 0) / 100;
    case 'EMx':
      // For EMx hurdle, we don't accrue interest in the traditional sense
      // but we still need a rate for the capital account
      // Use the IRR hurdle rate as a proxy
      return (tier.irrHurdle ?? tier.hurdleRate ?? 0) / 100;
    case 'IRR_EMx':
      // Use IRR for accrual calculations
      return (tier.irrHurdle ?? tier.hurdleRate ?? 0) / 100;
    default:
      return 0;
  }
}

/**
 * Normalize tier configuration to handle legacy fields.
 */
export function normalizeTier(tier: WaterfallTier): WaterfallTier {
  return {
    ...tier,
    irrHurdle: tier.irrHurdle ?? tier.hurdleRate ?? null,
    emxHurdle: tier.emxHurdle ?? null,
    promotePercent: tier.promotePercent ?? 0,
  };
}
