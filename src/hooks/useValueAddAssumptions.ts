'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export type RenoCostBasis = 'sf' | 'unit';

export interface ValueAddState {
  isEnabled: boolean;
  renoStartMonth: number;
  renoStartsPerMonth: number;
  monthsToComplete: number;
  renoCost: number;
  renoCostBasis: RenoCostBasis;
  relocationIncentive: number;
  rentPremiumPct: number;
  reletMonths: number;
  // Legacy field mapping
  renovateAll: boolean;
  unitsToRenovate: number | null;
}

export interface CostBreakdown {
  renovation: number;
  relocation: number;
  vacancyLoss: number;
  total: number;
}

export interface AnnualImpact {
  grossRevenue: number;
  grossRevenuePct: number;
  expenses: number;
  expensesPct: number;
  noi: number;
  noiPct: number;
}

export interface CalculatedValues {
  costPerUnit: number;
  unitsInProgram: number;
  costs: CostBreakdown;
  annualImpact: AnnualImpact;
  programDurationMonths: number;
  // Legacy fields for backward compatibility
  effectiveCostPerUnit: number;
  totalRenovationCost: number;
  renovationDurationMonths: number;
  stabilizedAnnualPremium: number;
  simplePaybackMonths: number;
}

export interface ValueAddStats {
  totalUnits: number;
  avgUnitSf: number;
  avgCurrentRent: number;
  // Optional: current property financials for % calculations
  currentAnnualGrossRevenue?: number;
  currentAnnualExpenses?: number;
  currentAnnualNoi?: number;
}

const DEBOUNCE_DELAY = 1200;
const MGMT_FEE_PCT = 0.03; // Management fee on incremental revenue

const DEFAULT_STATE: ValueAddState = {
  isEnabled: false,
  renoStartMonth: 3,
  renoStartsPerMonth: 2,
  monthsToComplete: 3,
  renoCost: 25,
  renoCostBasis: 'sf',
  relocationIncentive: 3500,
  rentPremiumPct: 0.40,
  reletMonths: 2,
  renovateAll: true,
  unitsToRenovate: null
};

export function useValueAddAssumptions(projectId: number, stats: ValueAddStats) {
  const [state, setState] = useState<ValueAddState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingStateRef = useRef<ValueAddState | null>(null);

  const normalizeState = useCallback((data: Record<string, unknown>): ValueAddState => ({
    isEnabled: Boolean(data.is_enabled ?? DEFAULT_STATE.isEnabled),
    renoStartMonth: Number(data.reno_start_month ?? DEFAULT_STATE.renoStartMonth),
    renoStartsPerMonth: Number(data.reno_starts_per_month ?? data.reno_pace_per_month ?? DEFAULT_STATE.renoStartsPerMonth),
    monthsToComplete: Number(data.months_to_complete ?? DEFAULT_STATE.monthsToComplete),
    renoCost: Number(data.reno_cost ?? data.reno_cost_per_sf ?? DEFAULT_STATE.renoCost),
    renoCostBasis: (data.reno_cost_basis as RenoCostBasis) || DEFAULT_STATE.renoCostBasis,
    relocationIncentive: Number(data.relocation_incentive ?? DEFAULT_STATE.relocationIncentive),
    rentPremiumPct: Number(data.rent_premium_pct ?? DEFAULT_STATE.rentPremiumPct),
    reletMonths: Number(data.relet_months ?? data.relet_lag_months ?? DEFAULT_STATE.reletMonths),
    renovateAll: Boolean(data.renovate_all ?? DEFAULT_STATE.renovateAll),
    unitsToRenovate: data.units_to_renovate === null || data.units_to_renovate === undefined
      ? null
      : Number(data.units_to_renovate),
  }), []);

  const serializeState = useCallback((nextState: ValueAddState) => ({
    is_enabled: nextState.isEnabled,
    reno_start_month: nextState.renoStartMonth,
    reno_starts_per_month: nextState.renoStartsPerMonth,
    months_to_complete: nextState.monthsToComplete,
    reno_cost_per_sf: nextState.renoCostBasis === 'sf' ? nextState.renoCost : nextState.renoCost / (stats.avgUnitSf || 1),
    reno_cost_basis: nextState.renoCostBasis,
    relocation_incentive: nextState.relocationIncentive,
    rent_premium_pct: nextState.rentPremiumPct,
    relet_lag_months: nextState.reletMonths,
    renovate_all: nextState.renovateAll,
    units_to_renovate: nextState.renovateAll ? null : nextState.unitsToRenovate,
  }), [stats.avgUnitSf]);

  const saveState = useCallback(async (nextState: ValueAddState) => {
    if (!projectId) return;
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/value-add`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serializeState(nextState))
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as { error?: string })?.error || 'Failed to save value-add assumptions';
        throw new Error(errorMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save value-add assumptions');
      console.error('Error saving value-add assumptions:', err);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, serializeState]);

  const scheduleSave = useCallback((nextState: ValueAddState) => {
    pendingStateRef.current = nextState;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingStateRef.current) {
        saveState(pendingStateRef.current);
        pendingStateRef.current = null;
      }
    }, DEBOUNCE_DELAY);
  }, [saveState]);

  const updateField = useCallback(<K extends keyof ValueAddState>(
    key: K,
    value: ValueAddState[K],
    options?: { skipSave?: boolean }
  ) => {
    setState(prev => {
      const nextState = { ...prev, [key]: value };
      if (!options?.skipSave) {
        scheduleSave(nextState);
      }
      return nextState;
    });
  }, [scheduleSave]);

  useEffect(() => {
    if (!projectId) return;
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${projectId}/value-add`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = (errorData as { error?: string })?.error || `Failed to load value-add assumptions (${response.status})`;
          throw new Error(errorMessage);
        }
        const data = await response.json();
        if (isMounted) {
          setState(normalizeState(data));
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load value-add assumptions');
        }
        console.error('Error loading value-add assumptions:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [projectId, normalizeState]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Flush any pending save on unmount so changes aren't lost
      if (pendingStateRef.current) {
        saveState(pendingStateRef.current);
        pendingStateRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculated = useMemo<CalculatedValues>(() => {
    const avgUnitSf = stats.avgUnitSf || 0;
    const totalUnits = stats.totalUnits || 0;
    const avgCurrentRent = stats.avgCurrentRent || 0;

    // Units in program
    const unitsInProgram = state.renovateAll ? totalUnits : (state.unitsToRenovate || 0);

    // Cost per unit (based on SF or Unit toggle)
    const costPerUnit = state.renoCostBasis === 'sf'
      ? state.renoCost * avgUnitSf
      : state.renoCost;

    // COSTS
    const renovationCost = unitsInProgram * costPerUnit;
    const relocationCost = unitsInProgram * state.relocationIncentive;
    const totalDowntimeMonths = state.monthsToComplete + state.reletMonths;
    const vacancyLoss = unitsInProgram * avgCurrentRent * totalDowntimeMonths;
    const totalProgramCost = renovationCost + relocationCost + vacancyLoss;

    // Program duration
    const programDurationMonths = state.renoStartsPerMonth > 0
      ? Math.ceil(unitsInProgram / state.renoStartsPerMonth)
      : 0;

    // ANNUAL IMPACT (at stabilization - all units renovated and leased)
    const monthlyPremiumPerUnit = avgCurrentRent * state.rentPremiumPct;
    const annualGrossRevenueIncrease = unitsInProgram * monthlyPremiumPerUnit * 12;
    const annualExpenseIncrease = annualGrossRevenueIncrease * MGMT_FEE_PCT;
    const annualNoiImpact = annualGrossRevenueIncrease - annualExpenseIncrease;

    // Percentages (vs current property metrics if available)
    const currentGrossRevenue = stats.currentAnnualGrossRevenue || (totalUnits * avgCurrentRent * 12);
    const currentExpenses = stats.currentAnnualExpenses || (currentGrossRevenue * 0.35); // Assume 35% expense ratio
    const currentNoi = stats.currentAnnualNoi || (currentGrossRevenue - currentExpenses);

    const grossRevenuePct = currentGrossRevenue > 0 ? annualGrossRevenueIncrease / currentGrossRevenue : 0;
    const expensesPct = currentExpenses > 0 ? annualExpenseIncrease / currentExpenses : 0;
    const noiPct = currentNoi > 0 ? annualNoiImpact / currentNoi : 0;

    // Simple payback
    const simplePaybackMonths = annualNoiImpact > 0
      ? Math.ceil(totalProgramCost / (annualNoiImpact / 12))
      : 0;

    return {
      costPerUnit,
      unitsInProgram,
      costs: {
        renovation: renovationCost,
        relocation: relocationCost,
        vacancyLoss: vacancyLoss,
        total: totalProgramCost
      },
      annualImpact: {
        grossRevenue: annualGrossRevenueIncrease,
        grossRevenuePct,
        expenses: annualExpenseIncrease,
        expensesPct,
        noi: annualNoiImpact,
        noiPct
      },
      programDurationMonths,
      // Legacy fields for backward compatibility
      effectiveCostPerUnit: costPerUnit + state.relocationIncentive,
      totalRenovationCost: totalProgramCost,
      renovationDurationMonths: programDurationMonths,
      stabilizedAnnualPremium: annualGrossRevenueIncrease,
      simplePaybackMonths
    };
  }, [state, stats]);

  return {
    state,
    calculated,
    updateField,
    isLoading,
    isSaving,
    error
  };
}

export default useValueAddAssumptions;
