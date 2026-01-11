// ============================================================================
// WATERFALL ENGINE
// Based on Excel model WaterfallADVCRE.xlsx - Stevens Carey methodology
// ============================================================================

import { calculateIRR as calculateXirr } from './irr';
import type {
  CashFlow,
  DistributionResult,
  Partner,
  PartnerFinalState,
  PeriodAccruals,
  WaterfallTier,
  WaterfallResult,
  WaterfallSettings,
} from './types';
import {
  calculateAccrual,
  calculateTier1Distribution,
  calculatePromoteTierDistribution,
  distributeResidual,
  calculateEquityMultiple,
  type Tier1Input,
  type PromoteTierInput,
} from './formulas';
import {
  waterfallLog,
  logInit,
  logPeriodStart,
  logAccrual,
  logContribution,
  logTier1Distribution,
  logTier2Distribution,
  logTier3Distribution,
  logIrrCheck,
  logPeriodEnd,
  logFinal,
  isVerbosePeriod,
  enableTrace,
  getTrace,
} from './logger';

// Re-export trace functions for API use
export { enableTrace, getTrace };

// ============================================================================
// INTERNAL STATE TYPE
// ============================================================================

type PartnerState = {
  partnerId: number;
  partnerType: 'LP' | 'GP';
  partnerName: string;
  preferredReturnPct: number;
  ownershipShare: number;         // As decimal (e.g., 0.90)

  // Capital accounts - one per tier (what is OWED)
  capitalAccountTier1: number;    // Pref + Return of Capital
  capitalAccountTier2: number;    // First promote tier hurdle
  capitalAccountTier3: number;    // Second promote tier hurdle
  capitalAccountTier4: number;    // Third promote tier hurdle
  capitalAccountTier5: number;    // Fourth promote tier hurdle

  // Legacy tracking
  unreturnedCapital: number;
  accruedPref: number;
  cumulativeDistributions: number;
  contributions: { date: Date; amount: number }[];
  distributions: { date: Date; amount: number }[];
  lastAccrualDate?: Date;

  // Per-tier cumulative distributions
  tier1Distributions: number;
  tier2Distributions: number;
  tier3Distributions: number;
  tier4Distributions: number;
  tier5Distributions: number;

  // This period tracking
  accruedPrefThisPeriod: number;
  accruedHurdleThisPeriod: number;  // Tier 2 hurdle accrual
};

const DAYS_IN_YEAR = 365;

// Default settings when not explicitly provided
const DEFAULT_SETTINGS: WaterfallSettings = {
  hurdleMethod: 'IRR',
  numTiers: 3,
  returnOfCapital: 'Pari Passu',
  gpCatchUp: false,
};

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate equity waterfall distributions for a series of cash flows.
 * Returns both the distribution results and the final partner states
 * which include actual contributions tracked from negative cash flows.
 *
 * This implementation matches the Excel model WaterfallADVCRE.xlsx.
 */
export function calculateWaterfall(
  cashFlows: CashFlow[],
  tiers: WaterfallTier[],
  partners: Partner[],
  settings: WaterfallSettings = DEFAULT_SETTINGS
): WaterfallResult {
  if (!cashFlows.length || !partners.length || !tiers.length) {
    waterfallLog('INIT', 'Empty inputs - returning empty result', {
      cashFlowsLen: cashFlows.length,
      tiersLen: tiers.length,
      partnersLen: partners.length,
    });
    return { distributions: [], partnerStates: [], periodAccruals: [] };
  }

  // Sort and prepare inputs
  const orderedCashFlows = [...cashFlows].sort((a, b) => {
    const dateA = toDate(a.date).getTime();
    const dateB = toDate(b.date).getTime();
    if (dateA === dateB) {
      return (a.periodId || 0) - (b.periodId || 0);
    }
    return dateA - dateB;
  });

  const orderedTiers = [...tiers].sort((a, b) => a.tierNumber - b.tierNumber);
  const firstDate = toDate(orderedCashFlows[0].date);
  const hasContributionFlows = orderedCashFlows.some((cf) => cf.amount < 0);

  // Calculate ownership percentages
  const totalInitialCapital = partners.reduce(
    (sum, p) => sum + (p.capitalContributed || 0),
    0
  );

  const lpPartner = partners.find((p) => p.partnerType === 'LP');
  const gpPartner = partners.find((p) => p.partnerType === 'GP');
  const lpOwnership = lpPartner?.ownershipPct
    ? lpPartner.ownershipPct / 100
    : totalInitialCapital > 0
      ? (lpPartner?.capitalContributed || 0) / totalInitialCapital
      : 0.9;

  // Get hurdle rates from tiers
  const tier1 = orderedTiers.find((t) => t.tierNumber === 1);
  const tier2 = orderedTiers.find((t) => t.tierNumber === 2);
  const tier3 = orderedTiers.find((t) => t.tierNumber === 3);

  const prefRate = tier1?.irrHurdle ?? tier1?.hurdleRate ?? lpPartner?.preferredReturnPct ?? 8;
  const hurdle2Rate = tier2?.irrHurdle ?? tier2?.hurdleRate ?? 8;
  const hurdle3Rate = tier3?.irrHurdle ?? tier3?.hurdleRate ?? 15;

  // Log initialization
  logInit({
    numPeriods: orderedCashFlows.length,
    numPartners: partners.length,
    partners: partners.map((p) => ({
      id: p.partnerId,
      type: p.partnerType,
      ownershipPct: p.ownershipPct ??
        (totalInitialCapital > 0
          ? ((p.capitalContributed || 0) / totalInitialCapital) * 100
          : 100 / partners.length),
      contribution: p.capitalContributed,
      prefRate: p.preferredReturnPct,
    })),
    tiers: orderedTiers.map((t) => ({
      number: t.tierNumber,
      name: t.tierName || `Tier ${t.tierNumber}`,
      hurdleType: t.hurdleType,
      hurdleRate: t.irrHurdle ?? t.hurdleRate ?? null,
      lpSplit: t.lpSplitPct,
      gpSplit: t.gpSplitPct,
    })),
  });

  // Initialize partner states
  const partnerStates: PartnerState[] = partners.map((p) => {
    const initialCapital = hasContributionFlows ? 0 : (p.capitalContributed || 0);
    const ownership = p.ownershipPct
      ? p.ownershipPct / 100
      : totalInitialCapital > 0
        ? (p.capitalContributed || 0) / totalInitialCapital
        : 1 / partners.length;

    return {
      partnerId: p.partnerId,
      partnerType: p.partnerType,
      partnerName: p.partnerName || p.partnerType,
      preferredReturnPct: p.preferredReturnPct,
      ownershipShare: ownership,

      // Capital accounts
      capitalAccountTier1: initialCapital,
      capitalAccountTier2: initialCapital,
      capitalAccountTier3: initialCapital,
      capitalAccountTier4: initialCapital,
      capitalAccountTier5: initialCapital,

      // Legacy
      unreturnedCapital: initialCapital,
      accruedPref: 0,
      cumulativeDistributions: 0,
      contributions:
        !hasContributionFlows && p.capitalContributed > 0
          ? [{ date: firstDate, amount: -(p.capitalContributed || 0) }]
          : [],
      distributions: [],
      lastAccrualDate: firstDate,

      // Per-tier distributions
      tier1Distributions: 0,
      tier2Distributions: 0,
      tier3Distributions: 0,
      tier4Distributions: 0,
      tier5Distributions: 0,

      // This period
      accruedPrefThisPeriod: 0,
      accruedHurdleThisPeriod: 0,
    };
  });

  // Track results
  const periodAccruals: PeriodAccruals[] = [];
  const results: DistributionResult[] = [];
  const tierDistByPeriod = new Map<
    number,
    { tier1LP: number; tier1GP: number; tier2LP: number; tier2GP: number; tier3LP: number; tier3GP: number }
  >();

  // ============================================================================
  // MAIN LOOP
  // ============================================================================

  for (const flow of orderedCashFlows) {
    const flowDate = toDate(flow.date);
    const isVerbose = isVerbosePeriod(flow.periodId);

    // Get LP and GP states
    const lpState = partnerStates.find((s) => s.partnerType === 'LP')!;
    const gpState = partnerStates.find((s) => s.partnerType === 'GP')!;

    // Log period start
    if (flow.amount !== 0 || isVerbose) {
      logPeriodStart({
        periodId: flow.periodId,
        date: flowDate.toISOString().split('T')[0],
        cashAvailable: flow.amount,
        lpState: {
          capitalAccountTier1: lpState.capitalAccountTier1,
          capitalAccountTier2: lpState.capitalAccountTier2,
          unreturnedCapital: lpState.unreturnedCapital,
          accruedPref: lpState.accruedPref,
          cumulativeDistributions: lpState.cumulativeDistributions,
          cumulativeContributions: lpState.contributions.reduce((s, c) => s + Math.abs(c.amount), 0),
        },
        gpState: {
          capitalAccountTier1: gpState.capitalAccountTier1,
          capitalAccountTier2: gpState.capitalAccountTier2,
          unreturnedCapital: gpState.unreturnedCapital,
          accruedPref: gpState.accruedPref,
          cumulativeDistributions: gpState.cumulativeDistributions,
          cumulativeContributions: gpState.contributions.reduce((s, c) => s + Math.abs(c.amount), 0),
        },
      });
    }

    // Reset period accruals
    for (const state of partnerStates) {
      state.accruedPrefThisPeriod = 0;
      state.accruedHurdleThisPeriod = 0;
    }

    // ========================================================================
    // STEP 1: CALCULATE ACCRUALS (Compound Interest)
    // Excel: =G93*((1+$C92)^((G46-F46)/365)-1)
    // ========================================================================

    for (const state of partnerStates) {
      if (!state.lastAccrualDate) continue;

      const daysBetween = (flowDate.getTime() - state.lastAccrualDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysBetween <= 0) continue;

      // Tier 1 (Pref) accrual
      if (state.capitalAccountTier1 > 0) {
        const rate = state.preferredReturnPct / 100;
        const beginningBalance = state.capitalAccountTier1;
        const accrued = calculateAccrual(beginningBalance, rate, flowDate, state.lastAccrualDate);
        state.accruedPrefThisPeriod = accrued;
        state.capitalAccountTier1 += accrued;
        state.accruedPref += accrued;

        logAccrual({
          periodId: flow.periodId,
          partnerType: state.partnerType,
          accrualType: 'PREF',
          beginningBalance,
          rate,
          daysBetween,
          accruedAmount: accrued,
          newBalance: state.capitalAccountTier1,
        });
      }

      // Tier 2+ (Hurdle) accruals - only for LP
      if (state.partnerType === 'LP') {
        // Tier 2 hurdle accrual
        if (state.capitalAccountTier2 > 0 && hurdle2Rate > 0) {
          const rate = hurdle2Rate / 100;
          const beginningBalance = state.capitalAccountTier2;
          const accrued = calculateAccrual(beginningBalance, rate, flowDate, state.lastAccrualDate);
          state.accruedHurdleThisPeriod = accrued;
          state.capitalAccountTier2 += accrued;

          logAccrual({
            periodId: flow.periodId,
            partnerType: state.partnerType,
            accrualType: 'HURDLE',
            beginningBalance,
            rate,
            daysBetween,
            accruedAmount: accrued,
            newBalance: state.capitalAccountTier2,
          });
        }

        // Tier 3 hurdle accrual
        if (state.capitalAccountTier3 > 0 && hurdle3Rate > 0) {
          const rate = hurdle3Rate / 100;
          const beginningBalance = state.capitalAccountTier3;
          const accrued = calculateAccrual(beginningBalance, rate, flowDate, state.lastAccrualDate);
          state.capitalAccountTier3 += accrued;
        }
      }
    }

    // Also run simple accrual for distribution priority
    accruePreferredReturn(partnerStates, flowDate);

    // ========================================================================
    // STEP 2: HANDLE CONTRIBUTIONS (Negative Cash Flows)
    // Excel: =-MIN(0,G87*Equity_Share_LP)
    // ========================================================================

    if (flow.amount < 0) {
      const contribution = Math.abs(flow.amount);

      for (const state of partnerStates) {
        const share = contribution * state.ownershipShare;

        // Update capital accounts
        state.unreturnedCapital += share;
        state.capitalAccountTier1 += share;
        state.capitalAccountTier2 += share;
        state.capitalAccountTier3 += share;
        state.capitalAccountTier4 += share;
        state.capitalAccountTier5 += share;

        // Track cash flows
        state.contributions.push({ date: flowDate, amount: -share });
        state.lastAccrualDate = flowDate;

        logContribution({
          periodId: flow.periodId,
          partnerType: state.partnerType,
          amount: share,
          ownershipShare: state.ownershipShare,
          newCapitalAccountTier1: state.capitalAccountTier1,
          newCapitalAccountTier2: state.capitalAccountTier2,
          newUnreturnedCapital: state.unreturnedCapital,
        });

        // Emit contribution as tier 0
        results.push({
          periodId: flow.periodId,
          date: flowDate,
          partnerId: state.partnerId,
          tierNumber: 0,
          amount: -share,
          cumulativeAmount: 0,
          partnerIrr: 0,
        });
      }

      // Record period accruals
      periodAccruals.push({
        periodId: flow.periodId,
        accruedPref: lpState.accruedPrefThisPeriod,
        accruedHurdle: lpState.accruedHurdleThisPeriod,
      });

      continue;
    }

    // ========================================================================
    // STEP 3: ZERO CASH FLOW PERIODS
    // ========================================================================

    if (flow.amount === 0) {
      periodAccruals.push({
        periodId: flow.periodId,
        accruedPref: lpState.accruedPrefThisPeriod,
        accruedHurdle: lpState.accruedHurdleThisPeriod,
      });
      continue;
    }

    // ========================================================================
    // STEP 4: DISTRIBUTE POSITIVE CASH FLOWS
    // ========================================================================

    tierDistByPeriod.set(flow.periodId, {
      tier1LP: 0, tier1GP: 0, tier2LP: 0, tier2GP: 0, tier3LP: 0, tier3GP: 0
    });
    const tierDist = tierDistByPeriod.get(flow.periodId)!;

    let remaining = flow.amount;
    let lpPriorDist = 0;  // Track LP distributions for netting in later tiers

    // ------------------------------------------------------------------------
    // TIER 1: Preferred Return + Return of Capital
    // Excel: LP = MIN(G93+G95, MAX(G87,0)*$I$15)
    // ------------------------------------------------------------------------

    if (remaining > 0 && tier1) {
      const lpCapitalBefore = lpState.capitalAccountTier1;
      const gpCapitalBefore = gpState.capitalAccountTier1;

      const tier1Input: Tier1Input = {
        cashAvailable: remaining,
        lpCapitalAccount: lpState.capitalAccountTier1,
        gpCapitalAccount: gpState.capitalAccountTier1,
        lpSplitPct: tier1.lpSplitPct / 100,
        gpSplitPct: tier1.gpSplitPct / 100,
        gpCatchUp: settings.gpCatchUp,
        returnOfCapital: settings.returnOfCapital,
      };

      const tier1Result = calculateTier1Distribution(tier1Input);

      // Apply distributions
      if (tier1Result.lpDist > 0) {
        lpState.capitalAccountTier1 -= tier1Result.lpDist;
        lpState.accruedPref = Math.max(0, lpState.accruedPref - tier1Result.lpDist);
        lpState.unreturnedCapital = Math.max(0, lpState.unreturnedCapital - tier1Result.lpDist);
        lpState.tier1Distributions += tier1Result.lpDist;
        applyDistribution(lpState, 1, tier1Result.lpDist, flowDate, flow.periodId, results);
        tierDist.tier1LP += tier1Result.lpDist;
        lpPriorDist += tier1Result.lpDist;

        // Also reduce Tier 2+ capital accounts by LP's Tier 1 distribution
        // (these are the "Prior Distributions" in Excel's formula)
        // Excel: T2_Ending = T2_Beg + Accrual + Contrib - Prior_Dist - T2_Dist
        lpState.capitalAccountTier2 -= tier1Result.lpDist;
        lpState.capitalAccountTier3 -= tier1Result.lpDist;
        lpState.capitalAccountTier4 -= tier1Result.lpDist;
        lpState.capitalAccountTier5 -= tier1Result.lpDist;
      }

      if (tier1Result.gpDist > 0) {
        gpState.capitalAccountTier1 -= tier1Result.gpDist;
        gpState.accruedPref = Math.max(0, gpState.accruedPref - tier1Result.gpDist);
        gpState.unreturnedCapital = Math.max(0, gpState.unreturnedCapital - tier1Result.gpDist);
        gpState.tier1Distributions += tier1Result.gpDist;
        applyDistribution(gpState, 1, tier1Result.gpDist, flowDate, flow.periodId, results);
        tierDist.tier1GP += tier1Result.gpDist;
      }

      remaining = tier1Result.remaining;

      logTier1Distribution({
        periodId: flow.periodId,
        cashAvailable: flow.amount,
        lpCapitalAccount: lpCapitalBefore,
        gpCapitalAccount: gpCapitalBefore,
        lpSplitPct: tier1.lpSplitPct,
        gpSplitPct: tier1.gpSplitPct,
        lpOwed: lpCapitalBefore,
        gpOwed: gpCapitalBefore,
        totalOwed: lpCapitalBefore + gpCapitalBefore,
        lpDistribution: tier1Result.lpDist,
        gpDistribution: tier1Result.gpDist,
        totalDistributed: tier1Result.lpDist + tier1Result.gpDist,
        cashRemaining: remaining,
        lpCapitalAccountAfter: lpState.capitalAccountTier1,
        gpCapitalAccountAfter: gpState.capitalAccountTier1,
      });
    }

    // ------------------------------------------------------------------------
    // TIER 2: First Promote Tier
    // Excel: LP = MIN(G114+G115-G117, G110*$I$16)
    // ------------------------------------------------------------------------

    if (remaining > 0 && tier2) {
      const lpIrr = calculateLpIrr(partnerStates);
      const lpEmx = calculateEquityMultiple(
        lpState.cumulativeDistributions,
        lpState.contributions.reduce((s, c) => s + Math.abs(c.amount), 0)
      );

      // Check if hurdle is met
      const hurdleRate = (tier2.irrHurdle ?? tier2.hurdleRate ?? 8) / 100;
      const hurdleMet = lpIrr >= hurdleRate;

      logIrrCheck({
        periodId: flow.periodId,
        partnerType: 'LP',
        contributions: lpState.contributions.reduce((s, c) => s + Math.abs(c.amount), 0),
        distributions: lpState.cumulativeDistributions,
        cashFlowCount: lpState.contributions.length + lpState.distributions.length,
        calculatedIRR: lpIrr,
        tier2Hurdle: tier2.irrHurdle ?? tier2.hurdleRate ?? 8,
        tier2Triggered: hurdleMet,
      });

      if (!hurdleMet) {
        // Distribute at Tier 2 split until hurdle is met
        // Note: We pass priorLpDistributions=0 because the capital account
        // has already been reduced by prior tier distributions.
        const tier2Input: PromoteTierInput = {
          cashAvailable: remaining,
          lpCapitalAccount: lpState.capitalAccountTier2,
          lpSplitPct: tier2.lpSplitPct / 100,
          gpSplitPct: tier2.gpSplitPct / 100,
          priorLpDistributions: 0,  // Already reflected in capital account
        };

        const tier2Result = calculatePromoteTierDistribution(tier2Input);

        if (tier2Result.lpDist > 0) {
          lpState.capitalAccountTier2 -= tier2Result.lpDist;
          lpState.tier2Distributions += tier2Result.lpDist;
          applyDistribution(lpState, 2, tier2Result.lpDist, flowDate, flow.periodId, results);
          tierDist.tier2LP += tier2Result.lpDist;
          lpPriorDist += tier2Result.lpDist;

          // Also reduce Tier 3+ capital accounts by LP's Tier 2 distribution
          lpState.capitalAccountTier3 -= tier2Result.lpDist;
          lpState.capitalAccountTier4 -= tier2Result.lpDist;
          lpState.capitalAccountTier5 -= tier2Result.lpDist;
        }

        if (tier2Result.gpDist > 0) {
          gpState.tier2Distributions += tier2Result.gpDist;
          applyDistribution(gpState, 2, tier2Result.gpDist, flowDate, flow.periodId, results);
          tierDist.tier2GP += tier2Result.gpDist;
        }

        remaining = tier2Result.remaining;

        logTier2Distribution({
          periodId: flow.periodId,
          cashAvailable: remaining + tier2Result.lpDist + tier2Result.gpDist,
          lpCapitalAccountTier2: lpState.capitalAccountTier2,
          gpCapitalAccountTier2: gpState.capitalAccountTier2,
          lpSplitPct: tier2.lpSplitPct,
          gpSplitPct: tier2.gpSplitPct,
          lpDistribution: tier2Result.lpDist,
          gpDistribution: tier2Result.gpDist,
          cashRemaining: remaining,
        });
      } else {
        // Hurdle met - pass to next tier
      }
    }

    // ------------------------------------------------------------------------
    // TIER 3: Second Promote Tier (Residual)
    // Excel: LP = G131*$I$17, GP = G131*$H$17
    // ------------------------------------------------------------------------

    if (remaining > 0 && tier3) {
      const lpIrr = calculateLpIrr(partnerStates);
      const hurdle3 = (tier3.irrHurdle ?? tier3.hurdleRate ?? 15) / 100;
      const hurdleMet = lpIrr >= hurdle3;

      if (!hurdleMet) {
        // Still building toward Tier 3 hurdle
        // Note: We pass priorLpDistributions=0 because the capital account
        // has already been reduced by prior tier distributions.
        const tier3Input: PromoteTierInput = {
          cashAvailable: remaining,
          lpCapitalAccount: lpState.capitalAccountTier3,
          lpSplitPct: tier3.lpSplitPct / 100,
          gpSplitPct: tier3.gpSplitPct / 100,
          priorLpDistributions: 0,  // Already reflected in capital account
        };

        const tier3Result = calculatePromoteTierDistribution(tier3Input);

        if (tier3Result.lpDist > 0) {
          lpState.capitalAccountTier3 -= tier3Result.lpDist;
          lpState.tier3Distributions += tier3Result.lpDist;
          applyDistribution(lpState, 3, tier3Result.lpDist, flowDate, flow.periodId, results);
          tierDist.tier3LP += tier3Result.lpDist;
          lpPriorDist += tier3Result.lpDist;

          // Also reduce Tier 4+ capital accounts by LP's Tier 3 distribution
          lpState.capitalAccountTier4 -= tier3Result.lpDist;
          lpState.capitalAccountTier5 -= tier3Result.lpDist;
        }

        if (tier3Result.gpDist > 0) {
          gpState.tier3Distributions += tier3Result.gpDist;
          applyDistribution(gpState, 3, tier3Result.gpDist, flowDate, flow.periodId, results);
          tierDist.tier3GP += tier3Result.gpDist;
        }

        remaining = tier3Result.remaining;

        logTier3Distribution({
          periodId: flow.periodId,
          cashAvailable: remaining + tier3Result.lpDist + tier3Result.gpDist,
          lpSplitPct: tier3.lpSplitPct,
          gpSplitPct: tier3.gpSplitPct,
          lpDistribution: tier3Result.lpDist,
          gpDistribution: tier3Result.gpDist,
          cashRemaining: remaining,
        });
      } else {
        // Tier 3 hurdle met - distribute at Tier 3 split
        const residualResult = distributeResidual(
          remaining,
          tier3.lpSplitPct / 100,
          tier3.gpSplitPct / 100
        );

        if (residualResult.lpDist > 0) {
          lpState.tier3Distributions += residualResult.lpDist;
          applyDistribution(lpState, 3, residualResult.lpDist, flowDate, flow.periodId, results);
          tierDist.tier3LP += residualResult.lpDist;
        }

        if (residualResult.gpDist > 0) {
          gpState.tier3Distributions += residualResult.gpDist;
          applyDistribution(gpState, 3, residualResult.gpDist, flowDate, flow.periodId, results);
          tierDist.tier3GP += residualResult.gpDist;
        }

        remaining = 0;

        logTier3Distribution({
          periodId: flow.periodId,
          cashAvailable: remaining + residualResult.lpDist + residualResult.gpDist,
          lpSplitPct: tier3.lpSplitPct,
          gpSplitPct: tier3.gpSplitPct,
          lpDistribution: residualResult.lpDist,
          gpDistribution: residualResult.gpDist,
          cashRemaining: 0,
        });
      }
    }

    // Handle any remaining cash at last tier split
    if (remaining > 0 && orderedTiers.length > 0) {
      const lastTier = orderedTiers[orderedTiers.length - 1];
      const residualResult = distributeResidual(
        remaining,
        lastTier.lpSplitPct / 100,
        lastTier.gpSplitPct / 100
      );

      if (residualResult.lpDist > 0) {
        applyDistribution(lpState, lastTier.tierNumber, residualResult.lpDist, flowDate, flow.periodId, results);
        if (lastTier.tierNumber === 3) tierDist.tier3LP += residualResult.lpDist;
      }
      if (residualResult.gpDist > 0) {
        applyDistribution(gpState, lastTier.tierNumber, residualResult.gpDist, flowDate, flow.periodId, results);
        if (lastTier.tierNumber === 3) tierDist.tier3GP += residualResult.gpDist;
      }
    }

    // Record period accruals
    periodAccruals.push({
      periodId: flow.periodId,
      accruedPref: lpState.accruedPrefThisPeriod,
      accruedHurdle: lpState.accruedHurdleThisPeriod,
    });

    // Log period end
    logPeriodEnd({
      periodId: flow.periodId,
      date: flowDate.toISOString().split('T')[0],
      distributions: {
        tier1LP: tierDist.tier1LP,
        tier1GP: tierDist.tier1GP,
        tier2LP: tierDist.tier2LP,
        tier2GP: tierDist.tier2GP,
        tier3LP: tierDist.tier3LP,
        tier3GP: tierDist.tier3GP,
        totalLP: tierDist.tier1LP + tierDist.tier2LP + tierDist.tier3LP,
        totalGP: tierDist.tier1GP + tierDist.tier2GP + tierDist.tier3GP,
        total: tierDist.tier1LP + tierDist.tier1GP + tierDist.tier2LP + tierDist.tier2GP + tierDist.tier3LP + tierDist.tier3GP,
      },
      runningTotals: {
        lpCumulativeDistributions: lpState.cumulativeDistributions,
        gpCumulativeDistributions: gpState.cumulativeDistributions,
        lpCumulativeContributions: lpState.contributions.reduce((s, c) => s + Math.abs(c.amount), 0),
        gpCumulativeContributions: gpState.contributions.reduce((s, c) => s + Math.abs(c.amount), 0),
        lpIRR: calculatePartnerIrr(lpState),
        gpIRR: calculatePartnerIrr(gpState),
      },
      capitalAccounts: {
        lpTier1Remaining: lpState.capitalAccountTier1,
        lpTier2Remaining: lpState.capitalAccountTier2,
        gpTier1Remaining: gpState.capitalAccountTier1,
        gpTier2Remaining: gpState.capitalAccountTier2,
      },
    });

    // Update last accrual date
    for (const state of partnerStates) {
      state.lastAccrualDate = flowDate;
    }
  }

  // ============================================================================
  // BUILD FINAL RESULTS
  // ============================================================================

  const finalPartnerStates: PartnerFinalState[] = partnerStates.map((state) => {
    const totalContributions = state.contributions.reduce(
      (sum, c) => sum + Math.abs(c.amount),
      0
    );
    const totalDistributions = state.distributions.reduce(
      (sum, d) => sum + d.amount,
      0
    );
    const partnerDists = results.filter((r) => r.partnerId === state.partnerId && r.amount > 0);
    const finalIrr = partnerDists.length > 0
      ? partnerDists[partnerDists.length - 1].partnerIrr
      : 0;

    return {
      partnerId: state.partnerId,
      partnerType: state.partnerType,
      totalContributions,
      totalDistributions,
      finalIrr,
      finalEmx: totalContributions > 0 ? totalDistributions / totalContributions : 0,
    };
  });

  // Calculate tier totals for logging
  const lpFinal = finalPartnerStates.find((s) => s.partnerType === 'LP');
  const gpFinal = finalPartnerStates.find((s) => s.partnerType === 'GP');
  const lpState = partnerStates.find((s) => s.partnerType === 'LP')!;
  const gpState = partnerStates.find((s) => s.partnerType === 'GP')!;

  const distributionPeriods = new Set(results.filter((r) => r.amount > 0).map((r) => r.periodId)).size;

  logFinal({
    totalPeriods: orderedCashFlows.length,
    distributionPeriods,
    lpSummary: {
      contributed: lpFinal?.totalContributions || 0,
      distributed: lpFinal?.totalDistributions || 0,
      tier1: lpState.tier1Distributions,
      tier2: lpState.tier2Distributions,
      tier3: lpState.tier3Distributions,
      irr: lpFinal?.finalIrr || 0,
      multiple: lpFinal && lpFinal.totalContributions > 0
        ? lpFinal.totalDistributions / lpFinal.totalContributions : 0,
    },
    gpSummary: {
      contributed: gpFinal?.totalContributions || 0,
      distributed: gpFinal?.totalDistributions || 0,
      tier1: gpState.tier1Distributions,
      tier2: gpState.tier2Distributions,
      tier3: gpState.tier3Distributions,
      irr: gpFinal?.finalIrr || 0,
      multiple: gpFinal && gpFinal.totalContributions > 0
        ? gpFinal.totalDistributions / gpFinal.totalContributions : 0,
    },
    projectSummary: {
      totalContributed: (lpFinal?.totalContributions || 0) + (gpFinal?.totalContributions || 0),
      totalDistributed: (lpFinal?.totalDistributions || 0) + (gpFinal?.totalDistributions || 0),
      tier1Total: lpState.tier1Distributions + gpState.tier1Distributions,
      tier2Total: lpState.tier2Distributions + gpState.tier2Distributions,
      tier3Total: lpState.tier3Distributions + gpState.tier3Distributions,
    },
  });

  return {
    distributions: results,
    partnerStates: finalPartnerStates,
    periodAccruals,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function accruePreferredReturn(states: PartnerState[], asOf: Date) {
  for (const state of states) {
    if (!state.lastAccrualDate) {
      state.lastAccrualDate = asOf;
      continue;
    }

    const elapsedMs = asOf.getTime() - state.lastAccrualDate.getTime();
    if (elapsedMs <= 0) continue;

    const yearFraction = elapsedMs / (1000 * 60 * 60 * 24 * DAYS_IN_YEAR);
    const periodPref = state.unreturnedCapital * (state.preferredReturnPct / 100) * yearFraction;
    state.accruedPref += periodPref;
  }
}

function applyDistribution(
  state: PartnerState,
  tierNumber: number,
  amount: number,
  date: Date,
  periodId: number,
  results: DistributionResult[]
) {
  state.cumulativeDistributions += amount;
  state.distributions.push({ date, amount });
  const irr = calculatePartnerIrr(state);

  results.push({
    periodId,
    date,
    partnerId: state.partnerId,
    tierNumber,
    amount,
    cumulativeAmount: state.cumulativeDistributions,
    partnerIrr: irr,
  });
}

function calculatePartnerIrr(state: PartnerState): number {
  if (!state.contributions.length && !state.distributions.length) {
    return 0;
  }
  const irr = calculateXirr(state.contributions, state.distributions);
  return Number.isFinite(irr) ? irr : 0;
}

function calculateLpIrr(states: PartnerState[]): number {
  const lpStates = states.filter((s) => s.partnerType === 'LP');
  if (!lpStates.length) return 0;

  const lpIrrs = lpStates.map((s) => calculatePartnerIrr(s)).filter((v) => Number.isFinite(v));
  if (!lpIrrs.length) return 0;

  const totalContribution = lpStates.reduce(
    (sum, s) => sum + s.contributions.reduce((c, f) => c + Math.abs(f.amount), 0),
    0
  );

  if (totalContribution <= 0) {
    return lpIrrs.reduce((sum, v) => sum + v, 0) / lpIrrs.length;
  }

  let weightedIrr = 0;
  for (const state of lpStates) {
    const contributed = state.contributions.reduce((c, f) => c + Math.abs(f.amount), 0);
    const weight = contributed / totalContribution;
    const irr = calculatePartnerIrr(state);
    weightedIrr += weight * irr;
  }

  return weightedIrr;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
