/**
 * NNN SLB Mock Data — Rizvi Portfolio (AZ)
 *
 * Source-of-truth for prototype data. These constants serve double duty:
 * 1. Render panels immediately before API wiring
 * 2. Used as basis for DB seed script
 *
 * @version 1.0
 * @created 2026-02-23
 * @session QT2
 */

// ─────────────────────────────────────────────────────────────────────
// Lease Terms
// ─────────────────────────────────────────────────────────────────────

export const LEASE_PARAMS = {
  structure: 'Absolute NNN',
  primaryTermYears: 15,
  commencement: '2025-01-01',
  expiration: '2039-12-31',
  remainingTermYears: 14.8,
  renewalOptions: '4 × 5-Year',
  renewalRent: 'Fair Market Value',
  landlordObligations: 'Structural shell only',
  crossDefault: true,
  allOrNone: true,
  masterLease: true,
  crossCollateralized: true,
};

export const RENT_SCHEDULE = [
  { period: 'Base', years: '1–5', annualRent: 322500, escalation: null, cumulative: null },
  { period: 'Bump 1', years: '6–10', annualRent: 354750, escalation: 0.10, cumulative: 0.10 },
  { period: 'Bump 2', years: '11–15', annualRent: 390225, escalation: 0.10, cumulative: 0.21 },
  { period: 'Renewal 1–4', years: '16–35', annualRent: null, escalation: null, cumulative: null, isFMV: true },
];

export interface PropertyAllocation {
  name: string;
  concept: string;
  sf: number;
  allocPrice: number;
  allocRent: number;
  rentPerSf: number;
  capRate: number;
}

export const PROPERTY_ALLOCATIONS: PropertyAllocation[] = [
  { name: 'Tucson DQ / Shell', concept: 'Gas + QSR', sf: 4200, allocPrice: 1900000, allocRent: 142500, rentPerSf: 33.93, capRate: 0.075 },
  { name: 'Phoenix Shell', concept: 'Gas + C-Store', sf: 3800, allocPrice: 1400000, allocRent: 105000, rentPerSf: 27.63, capRate: 0.075 },
  { name: 'Centralia Mobil', concept: 'Gas + C-Store', sf: 3600, allocPrice: 1000000, allocRent: 75000, rentPerSf: 20.83, capRate: 0.075 },
];

export const PORTFOLIO_TOTALS = {
  sf: 11600,
  allocPrice: 4300000,
  allocRent: 322500,
  rentPerSf: 27.80,
  capRate: 0.075,
};

// ─────────────────────────────────────────────────────────────────────
// Tenant & Credit
// ─────────────────────────────────────────────────────────────────────

export const GUARANTOR = {
  name: 'Jay Rizvi',
  type: 'Personal' as const,
  initials: 'JR',
  statements: 'CPA Approved',
  concepts: 'Shell, Mobil, DQ',
  units: 3,
  yearsOperating: 12,
  watchlist: 'Clear' as const,
};

export const NET_WORTH = {
  realEstate: 2100000,
  businessInterests: 850000,
  cashLiquid: 420000,
  otherAssets: 180000,
  totalAssets: 3550000,
  totalLiabilities: 1240000,
  netWorth: 2310000,
  nwToRentRatio: 7.2,
};

export interface IncomeStatementRow {
  label: string;
  indent?: boolean;
  bold?: boolean;
  fy2022: number | null;
  fy2023: number | null;
  fy2024Pre: number | null;
  fy2024Post: number | null;
}

export const INCOME_STATEMENT: IncomeStatementRow[] = [
  { label: 'Revenue', bold: true, fy2022: 4120000, fy2023: 4580000, fy2024Pre: 4820000, fy2024Post: 4820000 },
  { label: 'COGS', indent: true, fy2022: 2896000, fy2023: 3160000, fy2024Pre: 3284000, fy2024Post: 3284000 },
  { label: 'Gross Profit', fy2022: 1224000, fy2023: 1420000, fy2024Pre: 1536000, fy2024Post: 1536000 },
  { label: 'Operating Expense', indent: true, fy2022: 690000, fy2023: 720000, fy2024Pre: 748000, fy2024Post: 748000 },
  { label: 'EBITDAR', bold: true, fy2022: 534000, fy2023: 700000, fy2024Pre: 788000, fy2024Post: 788000 },
  { label: 'Less: Existing Rent', indent: true, fy2022: -180000, fy2023: -195000, fy2024Pre: -205000, fy2024Post: null },
  { label: 'Less: New SLB Rent', indent: true, fy2022: null, fy2023: null, fy2024Pre: null, fy2024Post: -322500 },
  { label: 'EBITDA Post-SLB', bold: true, fy2022: null, fy2023: null, fy2024Pre: 583000, fy2024Post: 465500 },
];

export const CREDIT_RATIOS = {
  ebitdarCoverage: 2.44,
  ebitdarCoverageFloor: 2.0,
  ebitdarCoveragePreferred: 2.5,
  nwToRent: 7.2,
  coverageExOwnerComp: 1.86,
  ownerCompAddback: 180000,
  ownerCompPctEbitdar: 0.23,
};

// ─────────────────────────────────────────────────────────────────────
// Unit Economics
// ─────────────────────────────────────────────────────────────────────

export type DataSourceStatus = 'Unit P&L' | 'Pending' | 'Guarantor';

export interface UnitSummaryRow {
  property: string;
  concept: string;
  revenue: number | null;
  ebitdar: number | null;
  margin: number | null;
  unitRent: number;
  coverage: number | null;
  dataSource: DataSourceStatus;
}

export const UNIT_SUMMARY: UnitSummaryRow[] = [
  { property: 'Tucson DQ / Shell', concept: 'Gas + QSR', revenue: 2100000, ebitdar: 380000, margin: 0.181, unitRent: 142500, coverage: 2.67, dataSource: 'Unit P&L' },
  { property: 'Phoenix Shell', concept: 'Gas + C-Store', revenue: null, ebitdar: null, margin: null, unitRent: 105000, coverage: null, dataSource: 'Pending' },
  { property: 'Centralia Mobil', concept: 'Gas + C-Store', revenue: null, ebitdar: null, margin: null, unitRent: 75000, coverage: null, dataSource: 'Pending' },
];

export const TUCSON_DETAIL = {
  gasGallonsYr: 1240000,
  fuelMarginPerGal: 0.18,
  fuelRevenue: 1488000,
  insideStoreSales: 612000,
  insideMargin: 0.284,
  totalRevenue: 2100000,
  ebitdar: 380000,
  unitCoverage: 2.67,
};

export interface StressTestRow {
  scenario: string;
  ebitdarAvail: number;
  totalRent: number;
  coverage: number;
  assessment: 'Pass' | 'Marginal' | 'Below Floor';
}

export const STRESS_TESTS: StressTestRow[] = [
  { scenario: 'Base Case (all 3 units)', ebitdarAvail: 788000, totalRent: 322500, coverage: 2.44, assessment: 'Pass' },
  { scenario: 'Centralia defaults', ebitdarAvail: 620000, totalRent: 322500, coverage: 1.92, assessment: 'Marginal' },
  { scenario: 'Phoenix defaults', ebitdarAvail: 548000, totalRent: 322500, coverage: 1.70, assessment: 'Below Floor' },
  { scenario: 'Ex-owner comp', ebitdarAvail: 608000, totalRent: 322500, coverage: 1.86, assessment: 'Below Floor' },
  { scenario: '20% revenue haircut', ebitdarAvail: 630000, totalRent: 322500, coverage: 1.95, assessment: 'Marginal' },
];

// ─────────────────────────────────────────────────────────────────────
// Value Conclusion
// ─────────────────────────────────────────────────────────────────────

export const VALUE_CONCLUSION = {
  stabilizedNOI: 322500,
  capRateRange: '7.25–7.75%',
  capRateApplied: 0.075,
  indicatedValue: 4300000,
  valuePerSf: 370.69,
  salesCompRange: '7.15% – 7.40%',
  marketMidpoint: '7.28%',
  adjustment: '+22 bps (size / portfolio)',
  purchasePrice: 4300000,
  analystNotes: 'Direct capitalization is the primary and most reliable method for an absolute NNN sale-leaseback. The indicated value at a 7.50% cap rate equals the purchase price, confirming the deal is priced at market. The 22 bps premium over the sales comp midpoint is supportable given the portfolio size adjustment (3 sites vs. single-tenant comps) and the personal vs. corporate guarantor distinction. EBITDAR coverage of 2.44x post-SLB is adequate but not strong — the income approach weight in reconciliation should reflect this moderate credit quality.',
};

// ─────────────────────────────────────────────────────────────────────
// Reconciliation
// ─────────────────────────────────────────────────────────────────────

export interface ReconciliationApproach {
  approach: string;
  indicatedValue: number | null;
  weight: number;
  weightedValue: number | null;
  rationale: string;
}

export const RECONCILIATION_APPROACHES: ReconciliationApproach[] = [
  { approach: 'Sales Comparison', indicatedValue: 4150000, weight: 0.30, weightedValue: 1245000, rationale: 'Limited NNN gas comp availability in market' },
  { approach: 'Income Approach', indicatedValue: 4300000, weight: 0.70, weightedValue: 3010000, rationale: 'Dominant — NNN value is the rent stream' },
  { approach: 'Cost Approach', indicatedValue: null, weight: 0, weightedValue: null, rationale: 'Not applicable' },
];

export const FINAL_VALUE = 4255000;

export interface RiskMitigant {
  type: 'risk' | 'mitigant';
  severity: 'amber' | 'red' | 'green';
  label: string;
  text: string;
}

export const RISKS_MITIGANTS: RiskMitigant[] = [
  { type: 'risk', severity: 'amber', label: 'Risk — Credit Concentration', text: 'Small 3-unit operator, single personal guarantor, no audited financials.' },
  { type: 'mitigant', severity: 'green', label: 'Mitigant', text: 'Personal NW 7.2x annual rent. Absolute NNN cross-default master lease. SLB proceeds delever guarantor.' },
  { type: 'risk', severity: 'red', label: 'Risk — Environmental (UST)', text: 'All 3 properties operate underground storage tanks. Phase I ESAs not yet received.' },
  { type: 'mitigant', severity: 'green', label: 'Mitigant', text: 'Tenant bears all environmental obligations under absolute NNN. Condition closing on Phase I/II. $50k environmental escrow holdback recommended.' },
  { type: 'risk', severity: 'amber', label: 'Risk — Owner Comp Addback', text: '$180k addback = 23% of EBITDAR. Coverage falls to 1.86x if excluded — below 2.0x floor.' },
  { type: 'mitigant', severity: 'green', label: 'Mitigant', text: 'Standard for owner-operator NNN. Apply 50% haircut for conservative scenario. Verify with 2 years personal tax returns prior to commitment.' },
];

export const RECONCILIATION_NARRATIVE = 'The subject transaction reflects an investor acquisition at 7.50% going-in cap rate on an absolute NNN master lease with personal guarantor. Income approach is accorded dominant weight — value is fundamentally a function of rent stream quality and guarantor credit. The 1.1% premium to concluded value is within acceptable variance given the master lease structure and cross-collateralization. Recommend closing contingent on clean Phase I ESA and tax return verification of owner comp addback.';

// ─────────────────────────────────────────────────────────────────────
// Sales Comparables
// ─────────────────────────────────────────────────────────────────────

export interface SalesComp {
  label: string;
  location: string;
  concept: string;
  date: string;
  salePrice: number;
  priceSf: number;
  capRate: number;
  remainingTerm: string;
  isSubject?: boolean;
}

export const SALES_COMPS: SalesComp[] = [
  { label: 'Subject', location: 'Tucson / Phoenix / Centralia', concept: 'Shell / Mobil / DQ', date: 'Mar-26', salePrice: 4300000, priceSf: 371, capRate: 0.075, remainingTerm: '15 yrs', isSubject: true },
  { label: 'Comp 1', location: 'E Speedway, Tucson', concept: 'Shell C-Store', date: 'Q2 2024', salePrice: 2050000, priceSf: 466, capRate: 0.0725, remainingTerm: '14 yrs' },
  { label: 'Comp 2', location: 'W Valencia, Tucson', concept: 'Circle K', date: 'Q3 2024', salePrice: 1650000, priceSf: 458, capRate: 0.074, remainingTerm: '12 yrs' },
  { label: 'Comp 3', location: 'N 35th Ave, Phoenix', concept: 'Mobil / McDonald\'s', date: 'Q1 2024', salePrice: 2480000, priceSf: 477, capRate: 0.0715, remainingTerm: '15 yrs' },
];

// ─────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────

export function fmtCurrency(val: number | null, compact = false): string {
  if (val === null) return '—';
  if (compact && Math.abs(val) >= 1000000) {
    return `$${(val / 1000000).toFixed(1)}M`;
  }
  const negative = val < 0;
  const abs = Math.abs(val);
  const formatted = abs.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return negative ? `$(${formatted.replace('$', '')})` : formatted;
}

export function fmtPercent(val: number | null, decimals = 0): string {
  if (val === null) return '—';
  return `${(val * 100).toFixed(decimals)}%`;
}

export function fmtNumber(val: number | null): string {
  if (val === null) return '—';
  return val.toLocaleString('en-US');
}

export function fmtMultiple(val: number | null): string {
  if (val === null) return '—';
  return `${val.toFixed(2)}x`;
}
