// Waterfall calculation logging utility
// Enable detailed logging to debug discrepancies with Excel model

let WATERFALL_DEBUG = true; // Enable by default for debugging

// Periods with positive cash flows - log extra detail for these
const VERBOSE_PERIODS = [26, 42, 48, 72, 73, 78, 96];

// Store logs for trace output
let traceLog: WaterfallTraceEntry[] = [];
let traceEnabled = false;

export interface WaterfallTraceEntry {
  timestamp: string;
  category: string;
  message: string;
  data?: any;
}

export function enableTrace(enable: boolean) {
  traceEnabled = enable;
  if (enable) {
    traceLog = [];
  }
}

export function getTrace(): WaterfallTraceEntry[] {
  return traceLog;
}

export function clearTrace() {
  traceLog = [];
}

export function setWaterfallDebug(enabled: boolean) {
  WATERFALL_DEBUG = enabled;
}

export function isVerbosePeriod(periodId: number): boolean {
  return VERBOSE_PERIODS.includes(periodId);
}

export function waterfallLog(category: string, message: string, data?: any) {
  if (!WATERFALL_DEBUG) return;

  const timestamp = new Date().toISOString();
  const entry: WaterfallTraceEntry = { timestamp, category, message, data };

  // Always store in trace if enabled
  if (traceEnabled) {
    traceLog.push(entry);
  }

  // Console output
  console.log(`[WATERFALL:${category}] ${message}`);
  if (data) {
    // Format numbers for readability
    const formatted = JSON.stringify(data, (key, value) => {
      if (typeof value === 'number') {
        // Format currency-like values
        if (Math.abs(value) > 1000) {
          return Math.round(value * 100) / 100; // 2 decimal places
        }
        // Format percentages/rates
        if (Math.abs(value) < 1) {
          return Math.round(value * 10000) / 10000; // 4 decimal places
        }
        return Math.round(value * 100) / 100;
      }
      return value;
    }, 2);
    console.log(formatted);
  }
}

// Specialized loggers for different phases

export function logInit(data: {
  numPeriods: number;
  numPartners: number;
  partners: Array<{
    id: number;
    type: string;
    ownershipPct: number;
    contribution: number;
    prefRate: number;
  }>;
  tiers: Array<{
    number: number;
    name: string;
    hurdleType: string | null;
    hurdleRate: number | null;
    lpSplit: number;
    gpSplit: number;
  }>;
}) {
  waterfallLog('INIT', 'Starting waterfall calculation', data);
}

export function logPeriodStart(data: {
  periodId: number;
  date: string;
  cashAvailable: number;
  lpState: {
    capitalAccountTier1: number;
    capitalAccountTier2: number;
    unreturnedCapital: number;
    accruedPref: number;
    cumulativeDistributions: number;
    cumulativeContributions: number;
  };
  gpState: {
    capitalAccountTier1: number;
    capitalAccountTier2: number;
    unreturnedCapital: number;
    accruedPref: number;
    cumulativeDistributions: number;
    cumulativeContributions: number;
  };
}) {
  const isVerbose = isVerbosePeriod(data.periodId);
  waterfallLog(
    isVerbose ? 'PERIOD_START_VERBOSE' : 'PERIOD_START',
    `Period ${data.periodId} - ${data.date}`,
    data
  );
}

export function logAccrual(data: {
  periodId: number;
  partnerType: 'LP' | 'GP';
  accrualType: 'PREF' | 'HURDLE';
  beginningBalance: number;
  rate: number;
  daysBetween: number;
  accruedAmount: number;
  newBalance: number;
}) {
  const formula = `${data.beginningBalance.toLocaleString()} * ((1 + ${data.rate})^(${data.daysBetween}/365) - 1) = ${data.accruedAmount.toLocaleString()}`;
  waterfallLog('ACCRUAL', `${data.accrualType} accrual for ${data.partnerType}`, {
    ...data,
    formula,
  });
}

export function logContribution(data: {
  periodId: number;
  partnerType: 'LP' | 'GP';
  amount: number;
  ownershipShare: number;
  newCapitalAccountTier1: number;
  newCapitalAccountTier2: number;
  newUnreturnedCapital: number;
}) {
  waterfallLog('CONTRIBUTION', `Capital contribution for ${data.partnerType}`, data);
}

export function logTier1Distribution(data: {
  periodId: number;
  cashAvailable: number;
  lpCapitalAccount: number;
  gpCapitalAccount: number;
  lpSplitPct: number;
  gpSplitPct: number;
  lpOwed: number;
  gpOwed: number;
  totalOwed: number;
  lpDistribution: number;
  gpDistribution: number;
  totalDistributed: number;
  cashRemaining: number;
  lpCapitalAccountAfter: number;
  gpCapitalAccountAfter: number;
}) {
  waterfallLog('TIER1', 'Tier 1 (Pref + Capital Return) distribution', data);
}

export function logTier2Distribution(data: {
  periodId: number;
  cashAvailable: number;
  lpCapitalAccountTier2: number;
  gpCapitalAccountTier2: number;
  lpSplitPct: number;
  gpSplitPct: number;
  lpDistribution: number;
  gpDistribution: number;
  cashRemaining: number;
}) {
  waterfallLog('TIER2', 'Tier 2 (Promote) distribution', data);
}

export function logTier3Distribution(data: {
  periodId: number;
  cashAvailable: number;
  lpSplitPct: number;
  gpSplitPct: number;
  lpDistribution: number;
  gpDistribution: number;
  cashRemaining: number;
}) {
  waterfallLog('TIER3', 'Tier 3 (Residual) distribution', data);
}

export function logIrrCheck(data: {
  periodId: number;
  partnerType: 'LP' | 'GP';
  contributions: number;
  distributions: number;
  cashFlowCount: number;
  calculatedIRR: number;
  tier2Hurdle: number | null;
  tier2Triggered: boolean;
}) {
  waterfallLog('IRR_CHECK', `IRR check for ${data.partnerType}`, data);
}

export function logPeriodEnd(data: {
  periodId: number;
  date: string;
  distributions: {
    tier1LP: number;
    tier1GP: number;
    tier2LP: number;
    tier2GP: number;
    tier3LP: number;
    tier3GP: number;
    totalLP: number;
    totalGP: number;
    total: number;
  };
  runningTotals: {
    lpCumulativeDistributions: number;
    gpCumulativeDistributions: number;
    lpCumulativeContributions: number;
    gpCumulativeContributions: number;
    lpIRR: number;
    gpIRR: number;
  };
  capitalAccounts: {
    lpTier1Remaining: number;
    lpTier2Remaining: number;
    gpTier1Remaining: number;
    gpTier2Remaining: number;
  };
}) {
  const isVerbose = isVerbosePeriod(data.periodId);
  waterfallLog(
    isVerbose ? 'PERIOD_END_VERBOSE' : 'PERIOD_END',
    `Period ${data.periodId} complete`,
    data
  );
}

export function logFinal(data: {
  totalPeriods: number;
  distributionPeriods: number;
  lpSummary: {
    contributed: number;
    distributed: number;
    tier1: number;
    tier2: number;
    tier3: number;
    irr: number;
    multiple: number;
  };
  gpSummary: {
    contributed: number;
    distributed: number;
    tier1: number;
    tier2: number;
    tier3: number;
    irr: number;
    multiple: number;
  };
  projectSummary: {
    totalContributed: number;
    totalDistributed: number;
    tier1Total: number;
    tier2Total: number;
    tier3Total: number;
  };
}) {
  waterfallLog('FINAL', 'Waterfall calculation complete', data);
}

export function logExcelCompare(periods: Array<{
  period: number;
  date: string;
  netCF: number;
  cumeCF: number;
  lpContrib: number;
  gpContrib: number;
  accruedPref: number;
  tier1LP: number;
  tier1GP: number;
  accruedHurdle: number;
  tier2LP: number;
  tier2GP: number;
  tier3LP: number;
  tier3GP: number;
  lpIRR: number;
  gpIRR: number;
}>) {
  waterfallLog('EXCEL_COMPARE', 'Format for Excel comparison', { periods });
}
