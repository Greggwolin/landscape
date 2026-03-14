'use client';

import React, { useMemo, useState } from 'react';
import { CSpinner, CModal, CModalHeader, CModalTitle, CModalBody, CButtonGroup, CButton, CTable } from '@coreui/react';
import LoanBudgetModal from '@/components/capitalization/LoanBudgetModal';
import PendingRenoOffsetModal from '@/components/capitalization/PendingRenoOffsetModal';
import CostGranularityToggle from '@/components/analysis/cashflow/CostGranularityToggle';
import {
  groupByGranularity,
  type CostGranularity,
  type AggregatedSchedule,
  type AggregatedSection,
  type AggregatedPeriod,
} from '@/lib/financial-engine/cashflow/aggregation';
import {
  useIncomeApproachMonthlyDCF,
  useLeveragedCashFlow,
  useLoanSchedule,
  useAcquisitionPriceSummary,
} from '@/hooks/useCapitalization';
import type { Loan } from '@/types/assumptions';

/* ---------- Types ---------- */

type PeriodView = 'monthly' | 'quarterly' | 'annual';

interface CashFlowPeriodLabel {
  periodIndex: number;
  startDate: string;
  endDate: string;
  label: string;
}

interface CashFlowSection {
  sectionId: string;
  sectionName: string;
  lineItems: CashFlowLineItem[];
  subtotals: CashFlowSubtotal[];
  sectionTotal: number;
  sortOrder: number;
}

interface CashFlowLineItem {
  lineId: string;
  category: string;
  subcategory: string;
  description: string;
  periods: CashFlowSubtotal[];
  total: number;
  sourceType: string;
  containerId?: number;
  containerLabel?: string;
}

interface CashFlowSubtotal {
  periodIndex: number;
  periodSequence: number;
  amount: number;
  source: string;
}

interface DebtSchedulePeriod {
  period_index: number;
  interest_component: number;
  principal_component: number;
  scheduled_payment: number;
  is_io_period: boolean;
  is_balloon: boolean;
  balloon_amount: number;
  beginning_balance: number;
  ending_balance: number;
}

interface ExitAnalysis {
  terminalNOI: number;
  exitCapRate: number;
  grossReversionPrice: number;
  sellingCosts: number;
  sellingCostsPct: number;
  netReversion: number;
  loanPayoff: number;
  netReversionAfterDebt: number;
  holdPeriodMonths: number;
  // Value-add fields
  isValueAdd?: boolean;
  forwardStabilizedNOI?: number;
  stabilizedValue?: number;
  pendingRenoOffset?: number;
  adjustedExitValue?: number;
}

interface CashFlowResponse {
  success: boolean;
  data: {
    projectId: number;
    periodType: string;
    startDate: string;
    endDate: string;
    totalPeriods: number;
    periods: CashFlowPeriodLabel[];
    sections: CashFlowSection[];
    summary: Record<string, unknown>;
    exitAnalysis?: ExitAnalysis;
  };
}

interface IncomeApproachMonthlyProjection {
  periodIndex: number; // 1-based
  noi: number;
}

interface IncomeApproachMonthlyResponse {
  projections?: IncomeApproachMonthlyProjection[];
}

/* Row model for display */
interface DisplayRow {
  label: string;
  rowType: 'section-header' | 'indent' | 'subtotal' | 'noi' | 'divider' | 'net-cf' | 'grand-total' | 'info' | 'reversion' | 'time0' | 'loan-proceeds';
  values: number[]; // one per aggregated period
  time0Value?: number;
  showSign?: boolean;
  loanId?: number;
  loanName?: string;
  valueFormat?: 'currency' | 'percent';
  showDashForZero?: boolean;
}

/* ---------- Props ---------- */

interface LeveragedCashFlowProps {
  projectId: string;
  loans?: Loan[];
}

/* ---------- Helpers ---------- */

// Column widths matching CashFlowTable
const LCF_LABEL_WIDTH = 200;
const LCF_DATA_WIDTH = 120;

// Indentation matching CashFlowTable
const LCF_INDENT = {
  SECTION_HEADER: 12,
  LINE_ITEM: 24,
};

function formatLCFCurrency(value: number): string {
  const absValue = Math.abs(value);
  const rounded = Math.round(absValue);
  if (rounded === 0) return '-';
  const formatted = `$${rounded.toLocaleString()}`;
  if (value < 0) return `(${formatted})`;
  return formatted;
}

function formatLCFPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,%\s,]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function resolveLoanNetProceeds(loan: Loan): number {
  const gross = toNumber(loan.net_loan_proceeds != null ? loan.net_loan_proceeds : null)
    || toNumber(loan.commitment_amount || loan.loan_amount || 0);

  if (loan.net_loan_proceeds != null) {
    return toNumber(loan.net_loan_proceeds);
  }

  const feePct = toNumber(loan.origination_fee_pct);
  const originationFee = (gross * feePct) / 100;
  const interestReserve = toNumber(loan.interest_reserve_amount);
  const closingCosts =
    toNumber(loan.closing_costs_appraisal) +
    toNumber(loan.closing_costs_legal) +
    toNumber(loan.closing_costs_other);

  return gross - originationFee - interestReserve - closingCosts;
}

function aggregatePeriods(
  values: number[],
  view: PeriodView
): number[] {
  if (view === 'monthly') return values;

  const groupSize = view === 'quarterly' ? 3 : 12;
  const result: number[] = [];
  for (let i = 0; i < values.length; i += groupSize) {
    const chunk = values.slice(i, i + groupSize);
    result.push(chunk.reduce((s, v) => s + v, 0));
  }
  return result;
}

function buildPeriodHeaders(
  periodLabels: CashFlowPeriodLabel[],
  view: PeriodView,
  startDate?: string
): string[] {
  if (view === 'monthly') {
    return periodLabels.map((p) => {
      const d = new Date(p.startDate);
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });
  }

  const groupSize = view === 'quarterly' ? 3 : 12;
  const headers: string[] = [];
  for (let i = 0; i < periodLabels.length; i += groupSize) {
    if (view === 'quarterly') {
      const qIdx = Math.floor(i / 3);
      const d = new Date(periodLabels[i].startDate);
      headers.push(`Q${(qIdx % 4) + 1} ${d.getFullYear().toString().slice(-2)}`);
    } else {
      headers.push(`Year ${Math.floor(i / 12) + 1}`);
    }
  }
  return headers;
}

/**
 * Convert raw CashFlowSubtotal[] (objects with periodIndex/amount) to number[]
 * This bridges the type gap between the API response and the aggregation module
 */
function convertSubtotalsToArray(subtotals: CashFlowSubtotal[], totalPeriods: number): number[] {
  const result = new Array(totalPeriods).fill(0);
  subtotals.forEach((s) => {
    if (s.periodIndex >= 0 && s.periodIndex < totalPeriods) {
      result[s.periodIndex] = s.amount;
    }
  });
  return result;
}

/**
 * Adapt raw API CashFlowSection[] into an AggregatedSchedule
 * so we can reuse the shared groupByGranularity logic
 */
function adaptSectionsToSchedule(
  rawSections: CashFlowSection[],
  totalPeriods: number
): AggregatedSchedule {
  const periods: AggregatedPeriod[] = Array.from({ length: totalPeriods }, (_, i) => ({
    periodIndex: i,
    label: `Period ${i + 1}`,
    startDate: new Date(),
    endDate: new Date(),
    sourceIndices: [i],
  }));

  const sections: AggregatedSection[] = rawSections.map((s) => ({
    sectionId: s.sectionId,
    sectionName: s.sectionName,
    lineItems: s.lineItems.map((item) => ({
      lineId: item.lineId,
      category: item.category,
      subcategory: item.subcategory,
      description: item.description,
      values: convertSubtotalsToArray(item.periods, totalPeriods),
      total: item.total,
      containerId: item.containerId,
      containerLabel: item.containerLabel,
    })),
    subtotals: convertSubtotalsToArray(s.subtotals, totalPeriods),
    sectionTotal: s.sectionTotal,
    sortOrder: s.sortOrder,
  }));

  return {
    timeScale: 'monthly',
    periods,
    sections,
    summary: {} as any, // Not used by groupByGranularity
  };
}

/* ---------- Component ---------- */

export default function LeveragedCashFlow({
  projectId,
  loans = [],
}: LeveragedCashFlowProps) {
  const [periodView, setPeriodView] = useState<PeriodView>('annual');
  const [budgetModalLoan, setBudgetModalLoan] = useState<{ loanId: number; loanName?: string } | null>(null);
  const [showPendingRenoModal, setShowPendingRenoModal] = useState(false);
  const [costGranularity, setCostGranularity] = useState<CostGranularity>('summary');

  const { data: cfResponse, isLoading: cfLoading, error: cfError } = useLeveragedCashFlow(projectId);
  const { data: incomeApproachMonthly } = useIncomeApproachMonthlyDCF(projectId, Boolean(projectId));
  const { data: acquisitionSummary } = useAcquisitionPriceSummary(projectId, Boolean(projectId));

  // Get first loan's debt schedule for interest/principal breakdown
  const firstLoanId = loans.length > 0 ? loans[0].loan_id : null;
  const { data: scheduleData } = useLoanSchedule(projectId, firstLoanId);

  const cfData = (cfResponse as CashFlowResponse)?.data;
  const sections = cfData?.sections || [];
  const periodLabels = cfData?.periods || [];

  /* Determine what data is available */
  const revenueSection = sections.find((s) => s.sectionId === 'revenue-gross');
  const deductionsSection = sections.find((s) => s.sectionId === 'revenue-deductions');
  const opexSection = sections.find((s) => s.sectionId === 'income-opex');
  const netRevenueSection = sections.find((s) => s.sectionId === 'revenue-net');
  const financingSection = sections.find((s) => s.sectionId === 'financing');

  /* Land dev detection: cost-* sections only exist for LAND projects */
  const costSections = sections.filter((s) => s.sectionId.startsWith('cost-'));
  const lotbankSections = sections.filter((s) => s.sectionId.startsWith('lotbank-'));
  const isLandDev = costSections.length > 0;

  const hasIncomeData =
    (revenueSection && revenueSection.sectionTotal !== 0) ||
    (netRevenueSection && netRevenueSection.sectionTotal !== 0);
  const hasSectionIncomeData = Boolean(hasIncomeData);
  const hasOpExData = opexSection && opexSection.sectionTotal !== 0;
  const hasDebtData =
    financingSection && (financingSection.lineItems.length > 0 || financingSection.subtotals.length > 0);

  const fallbackNoiByPeriod = useMemo(() => {
    const projections = (incomeApproachMonthly as IncomeApproachMonthlyResponse | undefined)?.projections || [];
    if (!projections.length) return [] as number[];

    const maxIdx = projections.reduce((max, p) => Math.max(max, p.periodIndex || 0), 0);
    if (maxIdx <= 0) return [] as number[];

    const values = new Array(maxIdx).fill(0);
    projections.forEach((p) => {
      const idx = (p.periodIndex || 1) - 1;
      if (idx >= 0 && idx < values.length) {
        values[idx] = Number(p.noi || 0);
      }
    });
    return values;
  }, [incomeApproachMonthly]);

  const hasFallbackIncomeData = fallbackNoiByPeriod.some((v) => v !== 0);
  const hasAnyIncomeData = hasSectionIncomeData || hasFallbackIncomeData;

  /* Debt schedule breakdown */
  const debtSchedulePeriods = (scheduleData as { periods?: DebtSchedulePeriod[] })?.periods || [];

  /* Build the display data */
  const { rows, headers } = useMemo(() => {
    if (!cfData || periodLabels.length === 0) {
      return { rows: [] as DisplayRow[], headers: [] as string[] };
    }

    const totalPeriods = periodLabels.length;
    const hdrs = buildPeriodHeaders(periodLabels, periodView);
    const displayRows: DisplayRow[] = [];

    /* Zero-filled arrays for empty data */
    const zeroes = new Array(totalPeriods).fill(0);
    const zeroesAgg = new Array(hdrs.length).fill(0);

    const acquisitionPrice = toNumber(acquisitionSummary?.effective_acquisition_price);
    const initialAcquisitionOutflow = acquisitionPrice > 0 ? -acquisitionPrice : 0;
    const acquisitionRowLabel =
      acquisitionSummary?.price_source === 'asking'
        ? 'Asking Price'
        : 'Acquisition Price (Incl Costs)';

    const perLoanNetProceeds = loans
      .map((loan) => ({
        loanId: loan.loan_id,
        loanName: loan.loan_name || `Loan ${loan.loan_id}`,
        amount: resolveLoanNetProceeds(loan),
      }))
      .filter((entry) => entry.amount !== 0);

    const initialNetLoanProceeds = perLoanNetProceeds.reduce((sum, entry) => sum + entry.amount, 0);
    const netTimeZero = initialAcquisitionOutflow + initialNetLoanProceeds;

    if (initialAcquisitionOutflow !== 0 || initialNetLoanProceeds !== 0) {
      displayRows.push({
        label: 'Initial Capitalization',
        rowType: 'section-header',
        values: zeroesAgg,
      });

      if (initialAcquisitionOutflow !== 0) {
        displayRows.push({
          label: acquisitionRowLabel,
          rowType: 'time0',
          values: zeroesAgg,
          time0Value: initialAcquisitionOutflow,
          showSign: true,
        });
      }

      perLoanNetProceeds.forEach((entry) => {
        displayRows.push({
          label: `Net Loan Proceeds - ${entry.loanName}`,
          rowType: 'loan-proceeds',
          values: zeroesAgg,
          time0Value: entry.amount,
          showSign: true,
          loanId: entry.loanId,
          loanName: entry.loanName,
        });
      });

      displayRows.push({
        label: '',
        rowType: 'divider',
        values: [],
      });
    }

    /* ---- Land Dev vs Income Property Display ---- */
    if (isLandDev && hasSectionIncomeData) {
      // LAND DEV: Revenue → Costs → Lotbank → Net CF Before Debt
      // Uses shared groupByGranularity() to match feasibility CashFlowTable exactly

      // 1. Calculate raw period totals BEFORE grouping (for Net CF Before Debt)
      const netRevValues = zeroes.map((_, i) => {
        const sub = netRevenueSection?.subtotals.find((s) => s.periodIndex === i);
        return sub ? sub.amount : 0;
      });

      const allCostPeriodTotals = zeroes.map(() => 0);
      for (const costSection of costSections) {
        zeroes.forEach((_, i) => {
          const sub = costSection.subtotals.find((s) => s.periodIndex === i);
          if (sub) allCostPeriodTotals[i] += sub.amount;
        });
      }

      const allLotbankPeriodTotals = zeroes.map(() => 0);
      for (const lbSection of lotbankSections) {
        zeroes.forEach((_, i) => {
          const sub = lbSection.subtotals.find((s) => s.periodIndex === i);
          if (sub) allLotbankPeriodTotals[i] += sub.amount;
        });
      }

      // 2. Adapt raw API sections → AggregatedSchedule → groupByGranularity
      // Only revenue + cost sections go through grouping (NOT lotbank)
      const sectionsForGrouping = [
        ...(revenueSection ? [revenueSection] : []),
        ...(deductionsSection ? [deductionsSection] : []),
        ...(netRevenueSection ? [netRevenueSection] : []),
        ...costSections,
      ];
      const adaptedSchedule = adaptSectionsToSchedule(sectionsForGrouping, totalPeriods);
      const grouped = groupByGranularity(adaptedSchedule, costGranularity);

      // 3. Detect by_phase mode (same pattern as CashFlowTable)
      const isByPhaseMode = grouped.sections.some(
        (s) => s.sectionId.startsWith('phase-revenue-') || s.sectionId === 'phase-costs'
      );

      if (isByPhaseMode) {
        // --- BY PHASE MODE: flat sections with phase-suffixed labels ---
        const phaseGrossRev = grouped.sections.find((s) => s.sectionId === 'phase-revenue-gross');
        const phaseDeductions = grouped.sections.find((s) => s.sectionId === 'phase-revenue-deductions');
        const phaseNetRev = grouped.sections.find((s) => s.sectionId === 'phase-revenue-net');
        const phaseCosts = grouped.sections.find((s) => s.sectionId === 'phase-costs');

        // GROSS REVENUE
        if (phaseGrossRev && phaseGrossRev.lineItems.length > 0) {
          displayRows.push({
            label: 'GROSS REVENUE',
            rowType: 'section-header',
            values: zeroesAgg,
          });
          for (const item of phaseGrossRev.lineItems) {
            displayRows.push({
              label: item.description,
              rowType: 'indent',
              values: aggregatePeriods(item.values, periodView),
            });
          }
        }

        // REVENUE DEDUCTIONS
        if (phaseDeductions && phaseDeductions.lineItems.length > 0) {
          displayRows.push({
            label: 'REVENUE DEDUCTIONS',
            rowType: 'section-header',
            values: zeroesAgg,
          });
          for (const item of phaseDeductions.lineItems) {
            displayRows.push({
              label: item.description,
              rowType: 'indent',
              values: aggregatePeriods(item.values, periodView),
            });
          }
        }

        // NET REVENUE
        if (phaseNetRev && phaseNetRev.lineItems.length > 0) {
          displayRows.push({
            label: 'NET REVENUE',
            rowType: 'section-header',
            values: zeroesAgg,
          });
          for (const item of phaseNetRev.lineItems) {
            displayRows.push({
              label: item.description,
              rowType: 'indent',
              values: aggregatePeriods(item.values, periodView),
            });
          }
          displayRows.push({
            label: 'Total Net Revenue',
            rowType: 'subtotal',
            values: aggregatePeriods(phaseNetRev.subtotals, periodView),
          });
        }

        // PROJECT COSTS
        if (phaseCosts && phaseCosts.lineItems.length > 0) {
          displayRows.push({
            label: 'PROJECT COSTS',
            rowType: 'section-header',
            values: zeroesAgg,
          });
          for (const item of phaseCosts.lineItems) {
            displayRows.push({
              label: item.description,
              rowType: 'indent',
              values: aggregatePeriods(item.values, periodView),
            });
          }
          displayRows.push({
            label: 'Total Project Costs',
            rowType: 'subtotal',
            values: aggregatePeriods(phaseCosts.subtotals, periodView),
          });
        }
      } else {
        // --- STANDARD MODE (summary / by_stage / by_category) ---
        // Parse grouped sections same way CashFlowTable does
        const gGrossRev = grouped.sections.find((s) => s.sectionId === 'revenue-gross');
        const gDeductions = grouped.sections.find((s) => s.sectionId === 'revenue-deductions');
        const gNetRev = grouped.sections.find((s) => s.sectionId === 'revenue-net');
        const gCostSections = grouped.sections.filter(
          (s) => !s.sectionName.toLowerCase().includes('revenue') && !s.sectionId.startsWith('phase-')
        );

        // REVENUE section
        displayRows.push({
          label: 'REVENUE',
          rowType: 'section-header',
          values: zeroesAgg,
        });

        // Gross Revenue as indent row
        if (gGrossRev) {
          displayRows.push({
            label: 'Gross Revenue',
            rowType: 'indent',
            values: aggregatePeriods(gGrossRev.subtotals, periodView),
          });
        }

        // Revenue deduction line items (Commissions, Transaction Costs, Subdivision Costs)
        if (gDeductions) {
          for (const item of gDeductions.lineItems) {
            displayRows.push({
              label: `Less: ${item.description}`,
              rowType: 'indent',
              values: aggregatePeriods(item.values, periodView),
            });
          }
        }

        // Net Revenue subtotal (bold)
        displayRows.push({
          label: 'Net Revenue',
          rowType: 'subtotal',
          values: aggregatePeriods(netRevValues, periodView),
        });

        // PROJECT COSTS section — each grouped section as indent row
        if (gCostSections.length > 0) {
          displayRows.push({
            label: 'PROJECT COSTS',
            rowType: 'section-header',
            values: zeroesAgg,
          });

          for (const section of gCostSections) {
            displayRows.push({
              label: section.sectionName,
              rowType: 'indent',
              values: aggregatePeriods(section.subtotals, periodView),
            });
          }

          // Total Development Costs
          displayRows.push({
            label: 'Total Development Costs',
            rowType: 'subtotal',
            values: aggregatePeriods([...allCostPeriodTotals], periodView),
          });
        }
      }

      // --- Lotbank Sections (LeveragedCashFlow-specific, NOT grouped) ---
      if (lotbankSections.length > 0) {
        displayRows.push({
          label: 'Lotbank',
          rowType: 'section-header',
          values: zeroesAgg,
        });

        for (const lbSection of lotbankSections) {
          const lbSubtotals = zeroes.map((_, i) => {
            const sub = lbSection.subtotals.find((s) => s.periodIndex === i);
            return sub ? sub.amount : 0;
          });
          displayRows.push({
            label: lbSection.sectionName,
            rowType: 'indent',
            values: aggregatePeriods(lbSubtotals, periodView),
          });
        }

        displayRows.push({
          label: 'Total Lotbank',
          rowType: 'subtotal',
          values: aggregatePeriods([...allLotbankPeriodTotals], periodView),
        });
      }

      // --- Net Cash Flow Before Debt (NOI equivalent for land dev) ---
      // = Net Revenue + Total Costs (costs are negative) + Total Lotbank
      const landDevNetBeforeDebt = zeroes.map((_, i) =>
        netRevValues[i] + allCostPeriodTotals[i] + allLotbankPeriodTotals[i]
      );
      displayRows.push({
        label: 'Net Cash Flow Before Debt',
        rowType: 'noi',
        values: aggregatePeriods(landDevNetBeforeDebt, periodView),
      });

    } else if (hasSectionIncomeData) {
      // INCOME PROPERTY: Standard GPI → Vacancy → EGI → OpEx → NOI

      // Check if this is a value-add project with split GPR
      const hasGprExisting = revenueSection?.lineItems?.some((item) => item.lineId === 'gpr-existing');
      const hasGprRenovated = revenueSection?.lineItems?.some((item) => item.lineId === 'gpr-renovated');
      const isValueAdd = hasGprExisting && hasGprRenovated;

      // GPI rows — either split or single
      const gpiPeriodValues = zeroes.map((_, i) => {
        const sub = revenueSection?.subtotals.find((s) => s.periodIndex === i);
        return sub ? sub.amount : 0;
      });

      if (isValueAdd) {
        // Value-add: show split GPR lines
        displayRows.push({
          label: 'Gross Potential Income',
          rowType: 'section-header',
          values: zeroesAgg,
        });

        // GPR - Existing
        const gprExistingItem = revenueSection?.lineItems.find((item) => item.lineId === 'gpr-existing');
        if (gprExistingItem) {
          const gprExistingValues = zeroes.map((_, i) => {
            const pv = gprExistingItem.periods.find((p) => p.periodIndex === i);
            return pv ? pv.amount : 0;
          });
          displayRows.push({
            label: 'Gross Potential Rent – Existing',
            rowType: 'indent',
            values: aggregatePeriods(gprExistingValues, periodView),
          });
        }

        // GPR - Renovated
        const gprRenovatedItem = revenueSection?.lineItems.find((item) => item.lineId === 'gpr-renovated');
        if (gprRenovatedItem) {
          const gprRenovatedValues = zeroes.map((_, i) => {
            const pv = gprRenovatedItem.periods.find((p) => p.periodIndex === i);
            return pv ? pv.amount : 0;
          });
          displayRows.push({
            label: 'Gross Potential Rent – Renovated',
            rowType: 'indent',
            values: aggregatePeriods(gprRenovatedValues, periodView),
          });
        }

        // GPR Total
        displayRows.push({
          label: 'Gross Potential Rent (Total)',
          rowType: 'subtotal',
          values: aggregatePeriods(gpiPeriodValues, periodView),
        });
      } else {
        // Standard: single GPR line
        displayRows.push({
          label: 'Gross Potential Income',
          rowType: 'section-header',
          values: aggregatePeriods(gpiPeriodValues, periodView),
        });
      }

      // Vacancy/deductions — show individual lines if value-add, else aggregate
      const deductionValues = zeroes.map((_, i) => {
        const sub = deductionsSection?.subtotals.find((s) => s.periodIndex === i);
        return sub ? sub.amount : 0;
      });

      if (isValueAdd && deductionsSection?.lineItems) {
        // Show individual deduction lines
        for (const item of deductionsSection.lineItems) {
          const itemValues = zeroes.map((_, i) => {
            const pv = item.periods.find((p) => p.periodIndex === i);
            return pv ? pv.amount : 0;
          });
          displayRows.push({
            label: item.description,
            rowType: 'indent',
            values: aggregatePeriods(itemValues, periodView),
          });
        }
      } else {
        // Standard: aggregate deductions
        displayRows.push({
          label: 'Less: Vacancy & Credit Loss',
          rowType: 'indent',
          values: aggregatePeriods(deductionValues, periodView),
        });
      }

      // EGI = GPI - deductions
      const egiValues = gpiPeriodValues.map((gpi, i) => gpi + deductionValues[i]);
      displayRows.push({
        label: 'Effective Gross Income',
        rowType: 'subtotal',
        values: aggregatePeriods(egiValues, periodView),
      });

      // Operating Expenses (income properties only)
      if (hasOpExData && opexSection) {
        for (const item of opexSection.lineItems) {
          const itemValues = zeroes.map((_, i) => {
            const pv = item.periods.find((p) => p.periodIndex === i);
            return pv ? pv.amount : 0;
          });
          displayRows.push({
            label: item.description,
            rowType: 'indent',
            values: aggregatePeriods(itemValues, periodView),
          });
        }

        const totalOpexValues = zeroes.map((_, i) => {
          const sub = opexSection.subtotals.find((s) => s.periodIndex === i);
          return sub ? sub.amount : 0;
        });
        displayRows.push({
          label: 'Total Operating Expenses',
          rowType: 'subtotal',
          values: aggregatePeriods(totalOpexValues, periodView),
        });
      }

      // NOI row
      const noiValues = zeroes.map((_, i) => {
        const sub = netRevenueSection?.subtotals.find((s) => s.periodIndex === i);
        return sub ? sub.amount : 0;
      });
      displayRows.push({
        label: 'Net Operating Income (NOI)',
        rowType: 'noi',
        values: aggregatePeriods(noiValues, periodView),
      });
    } else if (hasFallbackIncomeData) {
      const noiValues = zeroes.map((_, i) => fallbackNoiByPeriod[i] || 0);
      displayRows.push({
        label: 'Net Operating Income (NOI)',
        rowType: 'noi',
        values: aggregatePeriods(noiValues, periodView),
      });
    } else {
      // Scenario B: no income data — show placeholder NOI row
      displayRows.push({
        label: 'Net Operating Income (NOI)',
        rowType: 'noi',
        values: [],
      });
    }

    const exitAnalysis = cfData.exitAnalysis;
    if (exitAnalysis && exitAnalysis.netReversion !== 0) {
      const reversionValues = new Array(hdrs.length).fill(0);
      if (reversionValues.length > 0) {
        reversionValues[reversionValues.length - 1] = exitAnalysis.netReversion;
      }

      const terminalValue = (value: number): number[] => {
        const values = new Array(hdrs.length).fill(0);
        if (values.length > 0) {
          values[values.length - 1] = value;
        }
        return values;
      };

      if (exitAnalysis.isValueAdd) {
        // Value-add: show expanded reversion breakdown
        displayRows.push({
          label: `Reversion (Exit Month ${exitAnalysis.holdPeriodMonths || totalPeriods})`,
          rowType: 'section-header',
          values: zeroesAgg,
        });

        displayRows.push({
          label: 'Forward Stabilized NOI',
          rowType: 'indent',
          values: terminalValue(exitAnalysis.forwardStabilizedNOI || 0),
          showDashForZero: true,
        });

        displayRows.push({
          label: 'Exit Cap Rate',
          rowType: 'indent',
          values: terminalValue(exitAnalysis.exitCapRate || 0),
          valueFormat: 'percent',
          showDashForZero: true,
        });

        displayRows.push({
          label: 'Stabilized Value',
          rowType: 'indent',
          values: terminalValue(exitAnalysis.stabilizedValue || 0),
          showDashForZero: true,
        });

        // Pending Reno Offset — clickable row with value in last period
        displayRows.push({
          label: 'Less: Pending Reno Offset',
          rowType: 'reversion', // Will be clickable
          values: terminalValue(-(exitAnalysis.pendingRenoOffset || 0)),
          showDashForZero: true,
        });

        displayRows.push({
          label: 'Adjusted Exit Value',
          rowType: 'indent',
          values: terminalValue(exitAnalysis.adjustedExitValue || 0),
          showDashForZero: true,
        });

        displayRows.push({
          label: `Less: Selling Costs (${((exitAnalysis.sellingCostsPct || 0) * 100).toFixed(1)}%)`,
          rowType: 'indent',
          values: terminalValue(-(exitAnalysis.sellingCosts || 0)),
          showDashForZero: true,
        });

        displayRows.push({
          label: 'Net Reversion',
          rowType: 'subtotal',
          values: reversionValues,
          showDashForZero: true,
        });
      } else {
        // Standard: single reversion row
        displayRows.push({
          label: 'Net Sale Proceeds (before Loan Payoff)',
          rowType: 'reversion',
          values: reversionValues,
          showDashForZero: true,
        });
      }
    }

    // Divider
    displayRows.push({
      label: '',
      rowType: 'divider',
      values: [],
    });

    /* ---- Debt Service Section ---- */
    if (hasDebtData) {
      displayRows.push({
        label: 'Debt Service',
        rowType: 'section-header',
        values: [],
      });

      // Use debt schedule for interest/principal breakdown
      if (debtSchedulePeriods.length > 0) {
        // Interest Expense row
        const interestValues = zeroes.map((_, i) => {
          const dp = debtSchedulePeriods.find((p) => p.period_index === i);
          return dp ? -dp.interest_component : 0;
        });
        displayRows.push({
          label: 'Interest Expense',
          rowType: 'indent',
          values: aggregatePeriods(interestValues, periodView),
        });

        // Principal Payment row
        const principalValues = zeroes.map((_, i) => {
          const dp = debtSchedulePeriods.find((p) => p.period_index === i);
          // Include balloon in principal for the balloon period
          const princ = dp ? dp.principal_component : 0;
          const balloon = dp && dp.is_balloon ? dp.balloon_amount : 0;
          return -(princ + balloon);
        });
        displayRows.push({
          label: 'Principal Payment',
          rowType: 'indent',
          values: aggregatePeriods(principalValues, periodView),
        });

        // Origination/Fees — already reflected in Net Loan Proceeds at Time 0
        // (resolveLoanNetProceeds deducts origination, interest reserve, and closing costs)
        // Do NOT place in periodic debt service — these are closing costs, not operating expenses.

        // Total Debt Service = interest + principal (origination fees are time-0 via net proceeds)
        const totalDebtService = zeroes.map(
          (_, i) =>
            (interestValues[i] || 0) + (principalValues[i] || 0)
        );
        displayRows.push({
          label: 'Total Debt Service',
          rowType: 'subtotal',
          values: aggregatePeriods(totalDebtService, periodView),
        });
      } else {
        // Fallback: use financing subtotals from cash flow API (net amounts only)
        const financingValues = zeroes.map((_, i) => {
          const sub = financingSection?.subtotals.find((s) => s.periodIndex === i);
          return sub ? sub.amount : 0;
        });
        // Period 0 is typically a net draw (positive), subsequent periods are debt service (negative)
        // For total debt service, exclude the initial draw
        const debtServiceValues = financingValues.map((v, i) => (i === 0 ? 0 : v));
        displayRows.push({
          label: 'Total Debt Service',
          rowType: 'subtotal',
          values: aggregatePeriods(debtServiceValues, periodView),
        });
      }
    } else {
      // Scenario C: no debt
      displayRows.push({
        label: 'Debt Service',
        rowType: 'info',
        values: [],
      });
    }

    // Divider
    displayRows.push({
      label: '',
      rowType: 'divider',
      values: [],
    });

    /* ---- Net Cash Flow ---- */
    if (hasAnyIncomeData && hasDebtData) {
      // Net CF = NOI + total debt service (debt service is negative)
      const noiRow = displayRows.find((r) => r.rowType === 'noi');
      const debtRow = displayRows.find((r) => r.label === 'Total Debt Service');
      if (noiRow && debtRow && noiRow.values.length > 0 && debtRow.values.length > 0) {
        const netCF = noiRow.values.map((noi, i) => noi + (debtRow.values[i] || 0));
        displayRows.push({
          label: 'Net Cash Flow (After Debt)',
          rowType: 'net-cf',
          values: netCF,
          time0Value: netTimeZero,
          showSign: true,
        });
      }
    } else if (hasAnyIncomeData && !hasDebtData) {
      // Net CF = NOI (no debt)
      const noiRow = displayRows.find((r) => r.rowType === 'noi');
      if (noiRow && noiRow.values.length > 0) {
        displayRows.push({
          label: 'Net Cash Flow (After Debt)',
          rowType: 'net-cf',
          values: [...noiRow.values],
          time0Value: netTimeZero,
          showSign: true,
        });
      }
    } else {
      // Scenario B: debt only, no income — show dashes
      const debtRow = displayRows.find((r) => r.label === 'Total Debt Service');
      const emptyValues = debtRow ? debtRow.values.map(() => 0) : [];
      displayRows.push({
        label: 'Net Cash Flow (After Debt)',
        rowType: 'net-cf',
        values: emptyValues,
        time0Value: netTimeZero,
        showSign: true,
      });
    }

    /* ---- Reversion & Grand Total ---- */
    const netCFRow = displayRows.find((r) => r.rowType === 'net-cf');
    const aggPeriodCount = netCFRow ? netCFRow.values.length : hdrs.length;

    if (exitAnalysis && exitAnalysis.netReversion !== 0) {
      // Divider before reversion
      displayRows.push({
        label: '',
        rowType: 'divider',
        values: [],
      });

      // Grand Total row: Net CF + Net Reversion in final period
      if (netCFRow && netCFRow.values.length > 0) {
        const grandTotalValues = netCFRow.values.map((ncf, i) => {
          if (i === aggPeriodCount - 1) {
            return ncf + (exitAnalysis.netReversion || 0);
          }
          return ncf;
        });
        displayRows.push({
          label: 'Total Cash Flow',
          rowType: 'grand-total',
          values: grandTotalValues,
          time0Value: netTimeZero,
          showSign: true,
        });
      }
    } else if (netCFRow && netCFRow.values.length > 0) {
      displayRows.push({
        label: 'Total Cash Flow',
        rowType: 'grand-total',
        values: [...netCFRow.values],
        time0Value: netTimeZero,
        showSign: true,
      });
    }

    return { rows: displayRows, headers: hdrs };
  }, [
    cfData,
    periodLabels,
    periodView,
    hasAnyIncomeData,
    hasSectionIncomeData,
    hasFallbackIncomeData,
    hasOpExData,
    hasDebtData,
    fallbackNoiByPeriod,
    debtSchedulePeriods,
    sections,
    revenueSection,
    deductionsSection,
    opexSection,
    netRevenueSection,
    financingSection,
    costSections,
    lotbankSections,
    isLandDev,
    costGranularity,
    loans,
    acquisitionSummary,
  ]);

  /* Reversion modal state */
  const [showReversionModal, setShowReversionModal] = useState(false);
  const exitAnalysis = cfData?.exitAnalysis;

  /* ---------- Render ---------- */

  if (cfLoading) {
    return (
      <div className="text-center py-4">
        <CSpinner size="sm" style={{ color: 'var(--cui-primary)' }} />
        <span className="ms-2" style={{ color: 'var(--cui-secondary-color)' }}>
          Loading cash flow...
        </span>
      </div>
    );
  }

  if (cfError) {
    return (
      <div className="text-center py-4" style={{ color: 'var(--cui-danger)' }}>
        Failed to load cash flow data.
      </div>
    );
  }

  if (!cfData || periodLabels.length === 0) {
    return (
      <div
        className="text-center py-5"
        style={{ color: 'var(--cui-secondary-color)' }}
      >
        No cash flow data available.
      </div>
    );
  }

  return (
    <div>
      {/* Header controls - left-aligned to match CashFlowAnalysisTab */}
      <div
        className="d-flex flex-wrap align-items-center gap-4"
        style={{ marginBottom: '12px' }}
      >
        <div className="d-flex align-items-center gap-2">
          <span
            className="fw-medium"
            style={{ fontSize: '0.875rem', color: 'var(--cui-secondary-color)' }}
          >
            Time:
          </span>
          <CButtonGroup size="sm" role="group" aria-label="Period view">
            {(['monthly', 'quarterly', 'annual'] as PeriodView[]).map((view) => (
              <CButton
                key={view}
                color={periodView === view ? 'primary' : 'secondary'}
                variant={periodView === view ? undefined : 'outline'}
                onClick={() => setPeriodView(view)}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </CButton>
            ))}
          </CButtonGroup>
        </div>

        {/* Cost granularity - land dev only */}
        {isLandDev && (
          <div className="d-flex align-items-center gap-2">
            <span
              className="fw-medium"
              style={{ fontSize: '0.875rem', color: 'var(--cui-secondary-color)' }}
            >
              Costs:
            </span>
            <CostGranularityToggle value={costGranularity} onChange={setCostGranularity} />
          </div>
        )}
      </div>

      {/* Grid */}
      <div style={{ maxHeight: '80vh', overflowX: 'auto', overflowY: 'auto' }}>
        <CTable
          small
          bordered
          hover
          style={{
            fontSize: '0.8125rem',
            marginBottom: 0,
            tableLayout: 'fixed',
            width: 'auto',
          }}
        >
          <colgroup>
            <col style={{ width: `${LCF_LABEL_WIDTH}px` }} />
            <col style={{ width: `${LCF_DATA_WIDTH}px` }} />
            {headers.map((_, i) => (
              <col key={i} style={{ width: `${LCF_DATA_WIDTH}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                style={{
                  backgroundColor: 'var(--cui-secondary-bg)',
                  color: 'var(--cui-body-color)',
                  fontWeight: 600,
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  borderBottom: '3px solid var(--cui-border-color)',
                  borderRight: '2px solid var(--cui-border-color)',
                  paddingLeft: `${LCF_INDENT.SECTION_HEADER}px`,
                }}
              >
                Line Item
              </th>
              <th
                style={{
                  backgroundColor: 'var(--cui-secondary-bg)',
                  color: 'var(--cui-body-color)',
                  fontWeight: 600,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  borderBottom: '3px solid var(--cui-border-color)',
                  borderLeft: '2px solid var(--cui-border-color)',
                }}
              >
                Time 0
              </th>
              {headers.map((h, i) => (
                <th
                  key={i}
                  style={{
                    backgroundColor: 'var(--cui-secondary-bg)',
                    color: 'var(--cui-body-color)',
                    fontWeight: 600,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    borderBottom: '3px solid var(--cui-border-color)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              /* Divider row */
              if (row.rowType === 'divider') {
                return (
                  <tr key={rowIdx}>
                    <td
                      colSpan={headers.length + 2}
                      style={{ height: '4px', padding: 0, borderBottom: '1px solid var(--cui-border-color)' }}
                    />
                  </tr>
                );
              }

              /* Info row (no debt scenario) */
              if (row.rowType === 'info') {
                return (
                  <tr key={rowIdx}>
                    <td
                      colSpan={headers.length + 2}
                      style={{
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        paddingLeft: `${LCF_INDENT.SECTION_HEADER}px`,
                        paddingTop: '12px',
                        paddingBottom: '4px',
                        borderBottom: 'none',
                      }}
                    >
                      {row.label}
                      <span
                        style={{
                          fontWeight: 400,
                          fontStyle: 'italic',
                          color: 'var(--cui-text-muted)',
                          marginLeft: '12px',
                        }}
                      >
                        None — Net Cash Flow equals NOI
                      </span>
                    </td>
                  </tr>
                );
              }

              /* Section header — full-width label like SectionLabel */
              if (row.rowType === 'section-header') {
                return (
                  <tr key={rowIdx}>
                    <td
                      colSpan={headers.length + 2}
                      style={{
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        paddingLeft: `${LCF_INDENT.SECTION_HEADER}px`,
                        paddingTop: '12px',
                        paddingBottom: '4px',
                        borderBottom: 'none',
                      }}
                    >
                      {row.label}
                    </td>
                  </tr>
                );
              }

              /* NOI row with no income data placeholder */
              if (row.rowType === 'noi' && row.values.length === 0) {
                return (
                  <tr key={rowIdx}>
                    <td
                      style={{
                        paddingLeft: `${LCF_INDENT.SECTION_HEADER}px`,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        borderRight: '2px solid var(--cui-border-color)',
                      }}
                    >
                      {row.label}
                    </td>
                    <td
                      colSpan={headers.length + 1}
                      style={{
                        textAlign: 'center',
                        color: 'var(--cui-text-muted)',
                        fontStyle: 'italic',
                      }}
                    >
                      No income data available
                    </td>
                  </tr>
                );
              }

              /* Reversion row — value only in last period, clickable */
              if (row.rowType === 'reversion') {
                const isPendingOffset = row.label.includes('Pending Reno Offset');
                const handleClick = isPendingOffset
                  ? () => setShowPendingRenoModal(true)
                  : () => setShowReversionModal(true);

                return (
                  <tr key={rowIdx}>
                    <td
                      style={{
                        paddingLeft: `${LCF_INDENT.SECTION_HEADER}px`,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        borderRight: '2px solid var(--cui-border-color)',
                        paddingTop: '6px',
                        borderTop: '1px solid var(--cui-border-color)',
                      }}
                    >
                      {row.label}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 700,
                        borderLeft: '2px solid var(--cui-border-color)',
                        paddingTop: '6px',
                        borderTop: '1px solid var(--cui-border-color)',
                        color: row.time0Value && row.time0Value < 0 ? 'var(--cui-danger)' : undefined,
                      }}
                    >
                      {row.time0Value ? formatLCFCurrency(row.time0Value) : '-'}
                    </td>
                    {row.values.map((val, colIdx) => {
                      if (row.showDashForZero && val === 0) {
                        return (
                          <td
                            key={colIdx}
                            style={{
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 700,
                              paddingTop: '6px',
                              borderTop: '1px solid var(--cui-border-color)',
                            }}
                          >
                            -
                          </td>
                        );
                      }
                      return (
                        <td
                          key={colIdx}
                          style={{
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 700,
                            paddingTop: '6px',
                            borderTop: '1px solid var(--cui-border-color)',
                          }}
                        >
                          <span
                            style={{
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              color: 'var(--cui-link-color)',
                            }}
                            onClick={handleClick}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') handleClick();
                            }}
                          >
                            {row.valueFormat === 'percent' ? formatLCFPercent(val) : formatLCFCurrency(val)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              }

              /* Loan proceeds row — Time 0 value with clickable loan link */
              if (row.rowType === 'loan-proceeds') {
                return (
                  <tr key={rowIdx}>
                    <td
                      style={{
                        paddingLeft: `${LCF_INDENT.LINE_ITEM}px`,
                        fontWeight: 400,
                        whiteSpace: 'nowrap',
                        borderRight: '2px solid var(--cui-border-color)',
                      }}
                    >
                      {row.label}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 400,
                        borderLeft: '2px solid var(--cui-border-color)',
                        color: row.time0Value && row.time0Value > 0 ? 'var(--cui-success)' : undefined,
                      }}
                    >
                      {row.loanId ? (
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0"
                          style={{ fontSize: 'inherit' }}
                          onClick={() =>
                            setBudgetModalLoan({ loanId: row.loanId as number, loanName: row.loanName })
                          }
                        >
                          {row.time0Value != null ? formatLCFCurrency(row.time0Value) : '-'}
                        </button>
                      ) : (
                        row.time0Value != null ? formatLCFCurrency(row.time0Value) : '-'
                      )}
                    </td>
                    {headers.map((_, i) => (
                      <td
                        key={i}
                        style={{
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        -
                      </td>
                    ))}
                  </tr>
                );
              }

              /* Standard data rows: indent, subtotal, noi, net-cf, grand-total */
              const isIndent = row.rowType === 'indent';
              const isBold = ['subtotal', 'noi', 'net-cf', 'grand-total'].includes(row.rowType);
              const isNoi = row.rowType === 'noi';
              const isGrandTotal = row.rowType === 'grand-total';
              const isSubtotal = row.rowType === 'subtotal';
              const isNetCf = row.rowType === 'net-cf';
              const bottomBorder = isSubtotal; // accounting-style underline before totals

              return (
                <tr key={rowIdx}>
                  <td
                    style={{
                      paddingLeft: isIndent ? `${LCF_INDENT.LINE_ITEM}px` : `${LCF_INDENT.SECTION_HEADER}px`,
                      fontWeight: isBold ? 600 : 400,
                      whiteSpace: 'nowrap',
                      borderRight: '2px solid var(--cui-border-color)',
                      borderTop: (isNoi || isGrandTotal) ? '2px solid var(--cui-border-color)' : isSubtotal ? '1px solid var(--cui-border-color)' : undefined,
                      fontSize: isGrandTotal ? '0.875rem' : undefined,
                      backgroundColor: isNoi ? 'rgba(var(--cui-primary-rgb), 0.04)' : undefined,
                    }}
                  >
                    {row.label}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: isBold ? 600 : 400,
                      borderLeft: '2px solid var(--cui-border-color)',
                      borderTop: (isNoi || isGrandTotal) ? '2px solid var(--cui-border-color)' : isSubtotal ? '1px solid var(--cui-border-color)' : undefined,
                      color: row.time0Value && row.time0Value < 0 ? 'var(--cui-danger)' : undefined,
                      textDecoration: bottomBorder ? 'underline' : undefined,
                      fontSize: isGrandTotal ? '0.875rem' : undefined,
                      backgroundColor: isNoi ? 'rgba(var(--cui-primary-rgb), 0.04)' : undefined,
                    }}
                  >
                    {row.time0Value && row.time0Value !== 0 ? formatLCFCurrency(row.time0Value) : '-'}
                  </td>
                  {row.values.map((val, colIdx) => {
                    const displayValue =
                      val === 0 && isNetCf && !hasAnyIncomeData
                        ? '-'
                        : row.showDashForZero && val === 0
                          ? '-'
                          : row.valueFormat === 'percent'
                            ? formatLCFPercent(val)
                            : formatLCFCurrency(val);

                    return (
                      <td
                        key={colIdx}
                        style={{
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: isBold ? 600 : 400,
                          color: val < 0 ? 'var(--cui-danger)' : undefined,
                          textDecoration: bottomBorder ? 'underline' : undefined,
                          borderTop: (isNoi || isGrandTotal) ? '2px solid var(--cui-border-color)' : isSubtotal ? '1px solid var(--cui-border-color)' : undefined,
                          fontSize: isGrandTotal ? '0.875rem' : undefined,
                          backgroundColor: isNoi ? 'rgba(var(--cui-primary-rgb), 0.04)' : undefined,
                        }}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </CTable>
      </div>

      {/* Info message for missing income data */}
      {!hasAnyIncomeData && hasDebtData && (
        <div
          className="d-flex align-items-center gap-2 mt-2"
          style={{
            fontSize: '0.8125rem',
            color: 'var(--cui-info)',
            padding: '8px 12px',
            background: 'rgba(var(--cui-info-rgb), 0.06)',
            borderRadius: 'var(--cui-border-radius)',
          }}
        >
          <span>ℹ️</span>
          <span>
            Add income assumptions in the Operations tab to see the full leveraged cash flow.
          </span>
        </div>
      )}

      {/* Reversion Breakdown Modal */}
      {exitAnalysis && (
        <CModal
          visible={showReversionModal}
          onClose={() => setShowReversionModal(false)}
          size="sm"
        >
          <CModalHeader>
            <CModalTitle style={{ fontSize: '0.9375rem' }}>
              Reversion Analysis
            </CModalTitle>
          </CModalHeader>
          <CModalBody>
            <table
              style={{
                width: '100%',
                fontSize: '0.8125rem',
                borderCollapse: 'collapse',
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: '6px 0', color: 'var(--cui-secondary-color)' }}>
                    Terminal NOI (Fwd 12-Mo)
                  </td>
                  <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 500 }}>
                    {formatLCFCurrency(exitAnalysis.terminalNOI)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: 'var(--cui-secondary-color)' }}>
                    Reversion Price @ {(exitAnalysis.exitCapRate * 100).toFixed(2)}% Cap
                  </td>
                  <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 500 }}>
                    {formatLCFCurrency(exitAnalysis.grossReversionPrice)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: 'var(--cui-secondary-color)' }}>
                    Less: Selling Costs ({(exitAnalysis.sellingCostsPct * 100).toFixed(1)}%)
                  </td>
                  <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 500, color: 'var(--cui-danger)' }}>
                    ({formatLCFCurrency(exitAnalysis.sellingCosts)})
                  </td>
                </tr>
                <tr
                  style={{
                    borderTop: '1px solid var(--cui-border-color)',
                  }}
                >
                  <td style={{ padding: '6px 0', fontWeight: 600 }}>Net Reversion</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>
                    {formatLCFCurrency(exitAnalysis.netReversion)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: 'var(--cui-secondary-color)' }}>
                    Less: Loan Payoff
                  </td>
                  <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 500, color: 'var(--cui-danger)' }}>
                    ({formatLCFCurrency(exitAnalysis.loanPayoff)})
                  </td>
                </tr>
                <tr
                  style={{
                    borderTop: '2px solid var(--cui-border-color)',
                  }}
                >
                  <td style={{ padding: '8px 0', fontWeight: 700, fontSize: '0.875rem' }}>
                    Net Proceeds to Equity
                  </td>
                  <td
                    style={{
                      padding: '8px 0',
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      color: exitAnalysis.netReversionAfterDebt >= 0
                        ? 'var(--cui-success)'
                        : 'var(--cui-danger)',
                    }}
                  >
                    {formatLCFCurrency(exitAnalysis.netReversionAfterDebt)}
                  </td>
                </tr>
              </tbody>
            </table>
          </CModalBody>
        </CModal>
      )}

      <LoanBudgetModal
        projectId={projectId}
        loanId={budgetModalLoan?.loanId ?? null}
        loanName={budgetModalLoan?.loanName}
        visible={Boolean(budgetModalLoan)}
        onClose={() => setBudgetModalLoan(null)}
      />

      <PendingRenoOffsetModal
        projectId={Number.isFinite(Number(projectId)) ? Number(projectId) : 0}
        exitMonth={exitAnalysis?.holdPeriodMonths || 48}
        pendingRenoOffset={exitAnalysis?.pendingRenoOffset || 0}
        visible={showPendingRenoModal}
        onClose={() => setShowPendingRenoModal(false)}
      />
    </div>
  );
}
