// ============================================================================
// WATERFALL ENGINE TYPES
// Based on Excel model WaterfallADVCRE.xlsx - Stevens Carey methodology
// ============================================================================

export type HurdleType = 'IRR' | 'equity_multiple' | 'IRR_EMx' | null;
export type HurdleMethod = 'IRR' | 'EMx' | 'IRR_EMx';
export type ReturnOfCapital = 'LP First' | 'Pari Passu';

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CashFlow {
  periodId: number;
  date: Date | string;
  amount: number; // positive = distribution available, negative = contribution
}

export interface WaterfallTier {
  tierNumber: number;           // 1-5
  tierName?: string;
  hurdleType: HurdleType;
  irrHurdle: number | null;     // e.g., 8 for 8% (stored as percentage)
  emxHurdle: number | null;     // e.g., 1.5 for 1.5x
  promotePercent: number;       // e.g., 20 for 20% promote
  lpSplitPct: number;           // e.g., 72 for 72%
  gpSplitPct: number;           // e.g., 28 for 28%
  // Legacy field support
  hurdleRate?: number | null;   // Maps to irrHurdle for backwards compatibility
}

export interface Partner {
  partnerId: number;
  partnerName?: string;
  partnerType: 'LP' | 'GP';
  ownershipPct?: number;        // e.g., 90 for 90%
  capitalContributed: number;   // Initial commitment
  preferredReturnPct: number;   // e.g., 8 for 8%
  promotePct?: number | null;
}

export interface WaterfallSettings {
  hurdleMethod: HurdleMethod;
  numTiers: 2 | 3 | 4 | 5;
  returnOfCapital: ReturnOfCapital;
  gpCatchUp: boolean;
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export interface PeriodResult {
  periodId: number;
  date: Date;
  netCashFlow: number;
  cumulativeCashFlow: number;

  // Contributions (negative cash flow, split by ownership)
  lpContribution: number;
  gpContribution: number;

  // Accruals this period
  accruedPrefLP: number;
  accruedPrefGP: number;
  accruedHurdle2LP: number;
  accruedHurdle3LP: number;
  accruedHurdle4LP: number;
  accruedHurdle5LP: number;

  // Distributions by tier
  tier1LpDist: number;
  tier1GpDist: number;
  tier2LpDist: number;
  tier2GpDist: number;
  tier3LpDist: number;
  tier3GpDist: number;
  tier4LpDist: number;
  tier4GpDist: number;
  tier5LpDist: number;
  tier5GpDist: number;

  // IRR and EMx at end of period
  lpIrr: number | null;
  gpIrr: number | null;
  lpEmx: number | null;
  gpEmx: number | null;
}

export interface DistributionResult {
  periodId: number;
  date?: Date;
  partnerId: number;
  tierNumber: number;
  amount: number;
  cumulativeAmount: number;
  partnerIrr: number;
  // Accrual tracking for this period
  accruedPrefThisPeriod?: number;
  accruedHurdleThisPeriod?: number;
}

export interface PeriodAccruals {
  periodId: number;
  accruedPref: number;    // LP accrued pref this period
  accruedHurdle: number;  // LP accrued hurdle this period (tier 2)
}

export interface PartnerFinalState {
  partnerId: number;
  partnerType: 'LP' | 'GP';
  totalContributions: number;
  totalDistributions: number;
  finalIrr: number;
  finalEmx?: number;
}

export interface PartnerSummary {
  partnerId: number;
  partnerType: 'LP' | 'GP';
  partnerName: string;

  // Distributions by category
  preferredReturn: number;
  returnOfCapital: number;
  excessCashFlow: number;
  promote?: number;           // GP only

  // Totals
  totalDistributions: number;
  totalContributions: number;
  totalProfit: number;

  // Returns
  irr: number;
  equityMultiple: number;

  // Per-tier breakdown
  tier1: number;
  tier2: number;
  tier3: number;
  tier4: number;
  tier5: number;
}

export interface ProjectSummary {
  totalEquity: number;
  lpEquity: number;
  gpEquity: number;
  totalDistributed: number;
  lpDistributed: number;
  gpDistributed: number;
  projectIrr: number;
  projectEmx: number;
}

export interface WaterfallResult {
  distributions: DistributionResult[];
  partnerStates: PartnerFinalState[];
  periodAccruals: PeriodAccruals[];
  periodResults?: PeriodResult[];
  lpSummary?: PartnerSummary;
  gpSummary?: PartnerSummary;
  projectSummary?: ProjectSummary;
}
