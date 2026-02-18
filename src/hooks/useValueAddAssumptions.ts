'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export type RenoCostBasis = 'sf' | 'unit';

export interface ValueAddState {
  isEnabled: boolean;
  renoStartMonth: number | null;
  renoStartsPerMonth: number | null;
  monthsToComplete: number | null;
  renoCost: number | null;
  renoCostBasis: RenoCostBasis;
  relocationIncentive: number | null;
  rentPremiumPct: number | null;
  reletMonths: number | null;
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
  renoStartMonth: null,
  renoStartsPerMonth: null,
  monthsToComplete: null,
  renoCost: null,
  renoCostBasis: 'sf',
  relocationIncentive: null,
  rentPremiumPct: null,
  reletMonths: null,
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
  // Cache the raw API response so we can re-derive state when stats change
  const rawDataRef = useRef<Record<string, unknown> | null>(null);

  // Derive UI state from raw API data. The DB always stores cost as $/SF.
  // When basis is 'unit', multiply by avgUnitSf to get the per-unit value the user expects.
  const deriveState = useCallback(
    (data: Record<string, unknown>, avgSf: number): ValueAddState => {
      const basis = (data.reno_cost_basis as RenoCostBasis) || DEFAULT_STATE.renoCostBasis;

      // Preserve null from API — null means "not configured yet"
      const toNullableNumber = (val: unknown): number | null => {
        if (val === null || val === undefined) return null;
        const num = Number(val);
        return Number.isNaN(num) ? null : num;
      };

      const storedPerSf = toNullableNumber(data.reno_cost_per_sf);
      let renoCost: number | null = storedPerSf;
      if (storedPerSf !== null && basis === 'unit') {
        renoCost = Math.round(storedPerSf * avgSf);
      }

      return {
        isEnabled: Boolean(data.is_enabled ?? DEFAULT_STATE.isEnabled),
        renoStartMonth: toNullableNumber(data.reno_start_month),
        renoStartsPerMonth: toNullableNumber(data.reno_starts_per_month ?? data.reno_pace_per_month),
        monthsToComplete: toNullableNumber(data.months_to_complete),
        renoCost,
        renoCostBasis: basis,
        relocationIncentive: toNullableNumber(data.relocation_incentive),
        rentPremiumPct: toNullableNumber(data.rent_premium_pct),
        reletMonths: toNullableNumber(data.relet_months ?? data.relet_lag_months),
        renovateAll: Boolean(data.renovate_all ?? DEFAULT_STATE.renovateAll),
        unitsToRenovate: data.units_to_renovate === null || data.units_to_renovate === undefined
          ? null
          : Number(data.units_to_renovate),
      };
    },
    []
  );

  const serializeState = useCallback((nextState: ValueAddState) => ({
    is_enabled: nextState.isEnabled,
    reno_start_month: nextState.renoStartMonth,
    reno_starts_per_month: nextState.renoStartsPerMonth,
    months_to_complete: nextState.monthsToComplete,
    reno_cost_per_sf: nextState.renoCost === null
      ? null
      : nextState.renoCostBasis === 'sf'
        ? nextState.renoCost
        : nextState.renoCost / (stats.avgUnitSf || 1),
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

  // Fetch once on mount (projectId only)
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
          rawDataRef.current = data;
          setState(deriveState(data, stats.avgUnitSf));
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
    // Only re-fetch when projectId changes, NOT when stats change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Re-derive state from cached raw data when avgUnitSf arrives/changes
  useEffect(() => {
    if (rawDataRef.current && stats.avgUnitSf > 0) {
      setState(deriveState(rawDataRef.current, stats.avgUnitSf));
    }
  }, [stats.avgUnitSf, deriveState]);

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

    // Coerce null to 0 for calculations
    const renoCost = state.renoCost ?? 0;
    const relocationIncentive = state.relocationIncentive ?? 0;
    const monthsToComplete = state.monthsToComplete ?? 0;
    const reletMonths = state.reletMonths ?? 0;
    const renoStartsPerMonth = state.renoStartsPerMonth ?? 0;
    const rentPremiumPct = state.rentPremiumPct ?? 0;

    // Units in program
    const unitsInProgram = state.renovateAll ? totalUnits : (state.unitsToRenovate || 0);

    // Cost per unit (based on SF or Unit toggle)
    const costPerUnit = state.renoCostBasis === 'sf'
      ? renoCost * avgUnitSf
      : renoCost;

    // COSTS
    const renovationCost = unitsInProgram * costPerUnit;
    const relocationCost = unitsInProgram * relocationIncentive;
    const totalDowntimeMonths = monthsToComplete + reletMonths;
    const vacancyLoss = unitsInProgram * avgCurrentRent * totalDowntimeMonths;
    const totalProgramCost = renovationCost + relocationCost + vacancyLoss;

    // Program duration
    const programDurationMonths = renoStartsPerMonth > 0
      ? Math.ceil(unitsInProgram / renoStartsPerMonth)
      : 0;

    // ANNUAL IMPACT (at stabilization - all units renovated and leased)
    const monthlyPremiumPerUnit = avgCurrentRent * rentPremiumPct;
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
      effectiveCostPerUnit: costPerUnit + relocationIncentive,
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
