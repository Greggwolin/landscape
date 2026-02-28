/**
 * useIncomeApproach Hook
 *
 * Fetches income approach data and provides auto-save functionality
 * with debounced updates.
 *
 * Session: QK-11
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  IncomeApproachData,
  IncomeApproachAssumptions,
  NOIBasis,
  IncomeApproachUpdatePayload,
  DCFAnalysisData,
} from '@/types/income-approach';
import type { MFDcfMonthlyApiResponse } from '@/components/valuation/income-approach/mfCashFlowTransform';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
const DEBOUNCE_DELAY = 300; // ms

export type ValuationMethod = 'direct_cap' | 'dcf';

interface UseIncomeApproachReturn {
  data: IncomeApproachData | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  selectedBasis: NOIBasis;

  // DCF
  dcfData: DCFAnalysisData | null;
  isDCFLoading: boolean;
  activeMethod: ValuationMethod;

  // Monthly DCF (for CashFlowGrid with time scale toggle)
  monthlyDcfData: MFDcfMonthlyApiResponse | null;
  isMonthlyDCFLoading: boolean;

  // Actions
  setSelectedBasis: (basis: NOIBasis) => void;
  updateAssumption: (field: keyof IncomeApproachAssumptions, value: number | string) => void;
  reload: () => Promise<void>;
  setActiveMethod: (method: ValuationMethod) => void;
  fetchDCF: () => Promise<void>;
}

/** Response type for the unit rent schedule endpoint */
export interface UnitRentScheduleData {
  project_id: number;
  periods: Array<{ period_id: string; period_label: string }>;
  units: Array<{
    unit_id: number;
    unit_number: string;
    plan_name: string;
    unit_type: string;
    bedrooms: number | null;
    bathrooms: number | null;
    square_feet: number;
    rents: number[];
  }>;
  gpr_by_period: number[];
  dcf_gpr_by_period: number[];
  dcf_summary_rows: Array<{
    label: string;
    values: number[];
  }>;
  reconciliation: {
    ok: boolean;
    mismatches: Array<{
      period: number;
      unit_sum: number;
      dcf_gpr: number;
      diff: number;
    }>;
  };
  value_add_enabled: boolean;
  total_periods: number;
  period_type: string;
}

export function useIncomeApproach(projectId: number): UseIncomeApproachReturn {
  const queryClient = useQueryClient();
  const [data, setData] = useState<IncomeApproachData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBasis, setSelectedBasisState] = useState<NOIBasis>('f12_market');

  // DCF state
  const [dcfData, setDCFData] = useState<DCFAnalysisData | null>(null);
  const [isDCFLoading, setIsDCFLoading] = useState(false);
  const [activeMethod, setActiveMethodState] = useState<ValuationMethod>('direct_cap');

  // Monthly DCF state (for CashFlowGrid with time scale toggle)
  const [monthlyDcfData, setMonthlyDCFData] = useState<MFDcfMonthlyApiResponse | null>(null);
  const [isMonthlyDCFLoading, setIsMonthlyDCFLoading] = useState(false);

  // Pending updates for debouncing
  const pendingUpdates = useRef<IncomeApproachUpdatePayload>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${DJANGO_API_URL}/api/valuation/income-approach-data/${projectId}/`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch income approach data: ${response.statusText}`);
      }

      const result: IncomeApproachData = await response.json();
      setData(result);
      // Map legacy basis names to new ones
      const basisMapping: Record<string, NOIBasis> = {
        'trailing_12': 'f12_current',
        'forward_12': 'f12_market',
        'avg_straddle': 'f12_market',  // Default average to market
      };
      const rawBasis = result.selected_basis || 'f12_market';
      setSelectedBasisState(basisMapping[rawBasis] || rawBasis as NOIBasis);
    } catch (err) {
      console.error('Error fetching income approach data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Save updates to server
  const saveUpdates = useCallback(async () => {
    if (!projectId || Object.keys(pendingUpdates.current).length === 0) return;

    const updates = { ...pendingUpdates.current };
    pendingUpdates.current = {};

    try {
      setIsSaving(true);

      const response = await fetch(
        `${DJANGO_API_URL}/api/valuation/income-approach-data/${projectId}/update/`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.statusText}`);
      }

      // Response contains recalculated data
      const result: IncomeApproachData = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error saving income approach updates:', err);
      setError(err instanceof Error ? err.message : 'Failed to save');
      // Restore pending updates on failure
      pendingUpdates.current = { ...pendingUpdates.current, ...updates };
    } finally {
      setIsSaving(false);
    }
  }, [projectId]);

  // Debounced save
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(saveUpdates, DEBOUNCE_DELAY);
  }, [saveUpdates]);

  // Update assumption (optimistic update + debounced save)
  const updateAssumption = useCallback(
    (field: keyof IncomeApproachAssumptions, value: number | string) => {
      if (!data) return;

      // Optimistic update - update local state immediately
      setData((prev) => {
        if (!prev) return prev;

        const updatedAssumptions = {
          ...prev.assumptions,
          [field]: value,
        };

        // Recalculate values locally for immediate feedback
        const recalculated = recalculateLocally(prev, updatedAssumptions);

        return {
          ...prev,
          ...recalculated,
          assumptions: updatedAssumptions,
        };
      });

      // Queue update for server
      pendingUpdates.current[field] = value;
      debouncedSave();
    },
    [data, debouncedSave]
  );

  // Set selected basis (also triggers save)
  const setSelectedBasis = useCallback(
    (basis: NOIBasis) => {
      setSelectedBasisState(basis);
      updateAssumption('noi_capitalization_basis', basis);
    },
    [updateAssumption]
  );

  // Reload data
  const reload = useCallback(async () => {
    // Clear any pending saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    pendingUpdates.current = {};
    await fetchData();
    // Also refresh DCF if it was loaded
    if (dcfData) {
      await fetchDCF();
    }
  }, [fetchData, dcfData]);

  // Fetch DCF data (annual projections - legacy)
  const fetchDCF = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsDCFLoading(true);

      const response = await fetch(
        `${DJANGO_API_URL}/api/valuation/income-approach-data/${projectId}/dcf/`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch DCF data: ${response.statusText}`);
      }

      const result: DCFAnalysisData = await response.json();
      setDCFData(result);
    } catch (err) {
      console.error('Error fetching DCF data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load DCF data');
    } finally {
      setIsDCFLoading(false);
    }
  }, [projectId]);

  // Fetch monthly DCF data (for CashFlowGrid with time scale toggle)
  const fetchMonthlyDCF = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsMonthlyDCFLoading(true);

      const response = await fetch(
        `${DJANGO_API_URL}/api/valuation/income-approach-data/${projectId}/dcf/monthly/`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch monthly DCF data: ${response.statusText}`);
      }

      const result: MFDcfMonthlyApiResponse = await response.json();
      setMonthlyDCFData(result);
    } catch (err) {
      console.error('Error fetching monthly DCF data:', err);
      // Don't set error state - fall back to legacy table silently
    } finally {
      setIsMonthlyDCFLoading(false);
    }
  }, [projectId]);

  // Set active method (and fetch data as needed)
  const setActiveMethod = useCallback(
    (method: ValuationMethod) => {
      setActiveMethodState(method);
      if (method === 'dcf') {
        if (!dcfData && !isDCFLoading) {
          fetchDCF();
        }
        if (!monthlyDcfData && !isMonthlyDCFLoading) {
          fetchMonthlyDCF();
        }
      }
    },
    [dcfData, isDCFLoading, fetchDCF, monthlyDcfData, isMonthlyDCFLoading, fetchMonthlyDCF]
  );

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Refetch DCF when assumptions change (after save completes)
  const prevIsSaving = useRef(isSaving);
  useEffect(() => {
    // When save completes (isSaving goes from true to false), refetch DCF if it's loaded
    if (prevIsSaving.current && !isSaving) {
      if (dcfData) {
        fetchDCF();
      }
      if (monthlyDcfData) {
        fetchMonthlyDCF();
      }
      // Invalidate leveraged cash flow cache so the Debt tab picks up changes
      queryClient.invalidateQueries({ queryKey: ['leveraged-cash-flow', String(projectId)] });
      // Also invalidate dcf-analysis cache (tbl_dcf_analysis was updated)
      queryClient.invalidateQueries({ queryKey: ['dcf-analysis', projectId] });
    }
    prevIsSaving.current = isSaving;
  }, [isSaving, dcfData, fetchDCF, monthlyDcfData, fetchMonthlyDCF, queryClient, projectId]);

  return {
    data,
    isLoading,
    isSaving,
    error,
    selectedBasis,
    setSelectedBasis,
    updateAssumption,
    reload,
    // DCF
    dcfData,
    isDCFLoading,
    activeMethod,
    setActiveMethod,
    fetchDCF,
    // Monthly DCF
    monthlyDcfData,
    isMonthlyDCFLoading,
  };
}

/**
 * Local recalculation for optimistic updates
 * This provides immediate feedback while waiting for server response
 * Updated for 3-basis model: F-12 Current, F-12 Market, Stabilized
 */
function recalculateLocally(
  data: IncomeApproachData,
  assumptions: IncomeApproachAssumptions
): Partial<IncomeApproachData> {
  const { property_summary, rent_roll, operating_expenses } = data;
  const unitCount = property_summary.unit_count;
  const totalSf = property_summary.total_sf;

  const vacancyRate = assumptions.vacancy_rate;
  const stabilizedVacancyRate = assumptions.stabilized_vacancy_rate;
  const creditLossRate = assumptions.credit_loss_rate;
  const otherIncome = assumptions.other_income;
  const managementFeePct = assumptions.management_fee_pct;
  const replacementReserves = assumptions.replacement_reserves_per_unit * unitCount;
  const capRate = assumptions.selected_cap_rate;

  const baseOpex = operating_expenses.total;

  function calcNOI(gpr: number, vac: number) {
    const vacancyLoss = gpr * vac;
    const creditLoss = gpr * creditLossRate;
    const egi = gpr - vacancyLoss - creditLoss + otherIncome;
    const mgmtFee = egi * managementFeePct;
    const totalOpex = baseOpex + mgmtFee + replacementReserves;
    const noi = egi - totalOpex;

    return {
      gpr,
      vacancy_loss: vacancyLoss,
      vacancy_rate: vac,
      credit_loss: creditLoss,
      credit_loss_rate: creditLossRate,
      other_income: otherIncome,
      egi,
      base_opex: baseOpex,
      management_fee: mgmtFee,
      management_fee_pct: managementFeePct,
      replacement_reserves: replacementReserves,
      total_opex: totalOpex,
      noi,
      expense_ratio: egi > 0 ? totalOpex / egi : 0,
    };
  }

  function calcValue(noi: number): number | null {
    if (!capRate || capRate <= 0) return null;
    return noi / capRate;
  }

  // F-12 Current uses current rents (t12_gpr)
  // F-12 Market uses market rents (forward_gpr)
  const currentGpr = rent_roll.t12_gpr;
  const marketGpr = rent_roll.forward_gpr;

  const f12CurrentCalc = calcNOI(currentGpr, vacancyRate);
  const f12MarketCalc = calcNOI(marketGpr, vacancyRate);
  const stabCalc = calcNOI(marketGpr, stabilizedVacancyRate);

  const f12CurrentValue = calcValue(f12CurrentCalc.noi);
  const f12MarketValue = calcValue(f12MarketCalc.noi);
  const stabValue = calcValue(stabCalc.noi);

  // 3 Direct Cap tiles
  const valueTiles = [
    {
      id: 'f12_current' as NOIBasis,
      label: 'F-12 Current',
      value: f12CurrentValue,
      noi: f12CurrentCalc.noi,
      cap_rate: capRate,
      price_per_unit: f12CurrentValue && unitCount > 0 ? f12CurrentValue / unitCount : null,
      price_per_sf: f12CurrentValue && totalSf > 0 ? f12CurrentValue / totalSf : null,
      calculation: f12CurrentCalc,
    },
    {
      id: 'f12_market' as NOIBasis,
      label: 'F-12 Market',
      value: f12MarketValue,
      noi: f12MarketCalc.noi,
      cap_rate: capRate,
      price_per_unit: f12MarketValue && unitCount > 0 ? f12MarketValue / unitCount : null,
      price_per_sf: f12MarketValue && totalSf > 0 ? f12MarketValue / totalSf : null,
      calculation: f12MarketCalc,
    },
    {
      id: 'stabilized' as NOIBasis,
      label: 'Stabilized',
      value: stabValue,
      noi: stabCalc.noi,
      cap_rate: capRate,
      price_per_unit: stabValue && unitCount > 0 ? stabValue / unitCount : null,
      price_per_sf: stabValue && totalSf > 0 ? stabValue / totalSf : null,
      calculation: stabCalc,
      uses_stabilized_vacancy: true,
    },
  ];

  // Selected calculation based on basis
  // Map legacy basis names if needed
  const basisMapping: Record<string, NOIBasis> = {
    'trailing_12': 'f12_current',
    'forward_12': 'f12_market',
    'avg_straddle': 'f12_market',
  };
  const rawBasis = assumptions.noi_capitalization_basis;
  const basis = (basisMapping[rawBasis] || rawBasis) as NOIBasis;

  let selectedCalc = f12MarketCalc;
  let selectedValue = f12MarketValue;

  if (basis === 'f12_current') {
    selectedCalc = f12CurrentCalc;
    selectedValue = f12CurrentValue;
  } else if (basis === 'stabilized') {
    selectedCalc = stabCalc;
    selectedValue = stabValue;
  }

  // Sensitivity matrix
  const interval = assumptions.cap_rate_interval;
  const sensitivityMatrix = [];
  for (let i = -2; i <= 2; i++) {
    const cr = capRate + interval * i;
    if (cr > 0) {
      const adjVal = selectedCalc.noi / cr;
      sensitivityMatrix.push({
        cap_rate: cr,
        value: adjVal,
        price_per_unit: unitCount > 0 ? adjVal / unitCount : null,
        is_selected: i === 0,
      });
    }
  }

  // Key metrics
  const grm = selectedValue && selectedCalc.gpr > 0 ? selectedValue / selectedCalc.gpr : null;

  const keyMetrics = {
    price_per_unit: selectedValue && unitCount > 0 ? selectedValue / unitCount : null,
    price_per_sf: selectedValue && totalSf > 0 ? selectedValue / totalSf : null,
    grm,
    expense_ratio: selectedCalc.expense_ratio,
    opex_per_unit: unitCount > 0 ? (baseOpex + selectedCalc.management_fee + replacementReserves) / unitCount : null,
    opex_per_sf: totalSf > 0 ? (baseOpex + selectedCalc.management_fee + replacementReserves) / totalSf : null,
    break_even_occupancy: selectedCalc.gpr > 0 ? selectedCalc.total_opex / selectedCalc.gpr : null,
  };

  return {
    value_tiles: valueTiles,
    selected_basis: basis,
    selected_calculation: selectedCalc,
    selected_value: selectedValue,
    sensitivity_matrix: sensitivityMatrix,
    key_metrics: keyMetrics,
  };
}

export default useIncomeApproach;
