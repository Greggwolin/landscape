/**
 * Custom Hook: useOperationsData
 *
 * Manages the unified Operations P&L data for Multifamily projects.
 * Handles fetching, optimistic updates, auto-save, and value-add toggle.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  OperationsResponse,
  LineItemRow,
  SectionType,
  SaveInputRequest,
  PropertySummary,
  OperationsTotals,
  SectionData,
  SCENARIO_PRIORITY
} from '@/components/operations/types';

// =============================================================================
// TYPES
// =============================================================================

export interface PendingUpdate {
  section: SectionType;
  line_item_key: string;
  field: string;
  value: number | null;
  timestamp: number;
}

export interface UseOperationsDataReturn {
  // Data
  data: OperationsResponse | null;
  propertySummary: PropertySummary | null;
  rentalIncome: SectionData | null;
  vacancyDeductions: SectionData | null;
  otherIncome: SectionData | null;
  operatingExpenses: SectionData | null;
  totals: OperationsTotals | null;
  availableScenarios: string[];
  preferredScenario: string;
  valueAddEnabled: boolean;
  analysisType: string | null;
  showPostRehab: boolean;

  // State
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  isDirty: boolean;

  // Actions
  updateInput: (section: SectionType, lineItemKey: string, field: string, value: number | null) => void;
  toggleValueAdd: () => Promise<void>;
  toggleExpand: (section: SectionType, lineItemKey: string) => void;
  saveAll: () => Promise<void>;
  reload: () => Promise<void>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEBOUNCE_DELAY = 1500; // 1.5s debounce for auto-save
const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useOperationsData(projectId: number): UseOperationsDataReturn {
  const [data, setData] = useState<OperationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, PendingUpdate>>(new Map());

  // Refs for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<string, PendingUpdate>>(new Map());

  // Keep ref in sync with state
  useEffect(() => {
    pendingUpdatesRef.current = pendingUpdates;
  }, [pendingUpdates]);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const loadData = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      // For now, use Next.js API route until Django endpoint is ready
      const response = await fetch(`/api/projects/${projectId}/operations`);

      if (!response.ok) {
        throw new Error('Failed to fetch operations data');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading operations data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =============================================================================
  // OPTIMISTIC UPDATES
  // =============================================================================

  const updateInput = useCallback((
    section: SectionType,
    lineItemKey: string,
    field: string,
    value: number | null
  ) => {
    // Create update key for deduplication
    const updateKey = `${section}:${lineItemKey}:${field}`;

    // Track pending update
    const update: PendingUpdate = {
      section,
      line_item_key: lineItemKey,
      field,
      value,
      timestamp: Date.now()
    };

    setPendingUpdates(prev => {
      const next = new Map(prev);
      next.set(updateKey, update);
      return next;
    });

    // Optimistically update local state
    setData(prev => {
      if (!prev) return prev;

      const updateSection = (sectionData: SectionData): SectionData => {
        const updateRow = (row: LineItemRow): LineItemRow => {
          if (row.line_item_key !== lineItemKey) {
            // Check children recursively
            if (row.children) {
              return {
                ...row,
                children: row.children.map(updateRow)
              };
            }
            return row;
          }

          // Update the specific field
          const updatedRow = { ...row };

          if (field.startsWith('as_is_')) {
            const asIsField = field.replace('as_is_', '');
            updatedRow.as_is = {
              ...updatedRow.as_is,
              [asIsField]: value
            };
            // Recalculate total if rate changed
            if (asIsField === 'rate' && updatedRow.as_is.count) {
              updatedRow.as_is.total = (value || 0) * updatedRow.as_is.count * 12;
            }
          } else if (field.startsWith('post_reno_')) {
            const postRenoField = field.replace('post_reno_', '');
            updatedRow.post_reno = {
              ...updatedRow.post_reno,
              [postRenoField]: value,
              total: updatedRow.post_reno?.total || 0
            };
            // Recalculate total if rate changed
            if (postRenoField === 'rate' && updatedRow.as_is.count) {
              updatedRow.post_reno = {
                ...updatedRow.post_reno,
                total: (value || 0) * updatedRow.as_is.count * 12
              };
            }
          }

          return updatedRow;
        };

        return {
          ...sectionData,
          rows: sectionData.rows.map(updateRow)
        };
      };

      const updated: OperationsResponse = {
        ...prev,
        [section]: updateSection(prev[section])
      };

      // Recalculate totals
      updated.totals = recalculateTotals(updated);

      return updated;
    });

    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveUpdates();
    }, DEBOUNCE_DELAY);
  }, []);

  // =============================================================================
  // SAVE LOGIC
  // =============================================================================

  const saveUpdates = useCallback(async () => {
    const updates = Array.from(pendingUpdatesRef.current.values());
    if (updates.length === 0) return;

    setIsSaving(true);

    try {
      // Group updates by line item
      const groupedUpdates: Map<string, SaveInputRequest> = new Map();

      updates.forEach(update => {
        const key = `${update.section}:${update.line_item_key}`;
        const existing = groupedUpdates.get(key) || {
          section: update.section,
          line_item_key: update.line_item_key
        };

        // Map field to request property
        if (update.field.startsWith('as_is_')) {
          const field = update.field.replace('as_is_', '');
          if (field === 'rate') {
            existing.as_is_rate = update.value;
          } else if (field === 'count') {
            existing.as_is_count = update.value;
          } else if (field === 'growth_rate') {
            existing.as_is_growth_rate = update.value;
          } else {
            existing.as_is_value = update.value;
          }
        } else if (update.field.startsWith('post_reno_')) {
          const field = update.field.replace('post_reno_', '');
          if (field === 'rate') {
            existing.post_reno_rate = update.value;
          } else if (field === 'count') {
            existing.post_reno_count = update.value;
          } else if (field === 'per_sf') {
            existing.post_reno_per_sf = update.value;
          } else if (field === 'growth_rate') {
            existing.post_reno_growth_rate = update.value;
          } else {
            existing.post_reno_value = update.value;
          }
        }

        groupedUpdates.set(key, existing);
      });

      // Send batch update
      const response = await fetch(`/api/projects/${projectId}/operations/inputs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: Array.from(groupedUpdates.values())
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save updates');
      }

      // Clear pending updates on success
      setPendingUpdates(new Map());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      console.error('Error saving operations updates:', err);
    } finally {
      setIsSaving(false);
    }
  }, [projectId]);

  const saveAll = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveUpdates();
  }, [saveUpdates]);

  // =============================================================================
  // TOGGLE VALUE-ADD MODE
  // =============================================================================

  const toggleValueAdd = useCallback(async () => {
    if (!data) return;

    const newValue = !data.value_add_enabled;

    // Optimistic update
    setData(prev => prev ? { ...prev, value_add_enabled: newValue } : prev);

    try {
      const response = await fetch(`/api/projects/${projectId}/operations/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value_add_enabled: newValue })
      });

      if (!response.ok) {
        // Revert on failure
        setData(prev => prev ? { ...prev, value_add_enabled: !newValue } : prev);
        throw new Error('Failed to update settings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle Value-Add mode');
      console.error('Error toggling value-add:', err);
    }
  }, [data, projectId]);

  // =============================================================================
  // TOGGLE EXPAND/COLLAPSE
  // =============================================================================

  const toggleExpand = useCallback((section: SectionType, lineItemKey: string) => {
    setData(prev => {
      if (!prev) return prev;

      const updateSection = (sectionData: SectionData): SectionData => {
        const updateRow = (row: LineItemRow): LineItemRow => {
          if (row.line_item_key === lineItemKey) {
            return {
              ...row,
              is_expanded: row.is_expanded === false ? true : false
            };
          }
          if (row.children) {
            return {
              ...row,
              children: row.children.map(updateRow)
            };
          }
          return row;
        };

        return {
          ...sectionData,
          rows: sectionData.rows.map(updateRow)
        };
      };

      return {
        ...prev,
        [section]: updateSection(prev[section])
      };
    });
  }, []);

  // =============================================================================
  // HELPERS
  // =============================================================================

  const recalculateTotals = (response: OperationsResponse): OperationsTotals => {
    // Recursively sum leaf rows (those without children or not calculated)
    const sumRowsRecursive = (rows: LineItemRow[], field: 'as_is' | 'post_reno'): number => {
      return rows.reduce((sum, row) => {
        // If row has children, sum the children instead
        if (row.children && row.children.length > 0) {
          return sum + sumRowsRecursive(row.children, field);
        }
        // Leaf row - add its total
        const value = field === 'as_is' ? row.as_is?.total : row.post_reno?.total;
        return sum + (value || 0);
      }, 0);
    };

    const sumSection = (section: SectionData): number => {
      return sumRowsRecursive(section.rows, 'as_is');
    };

    const sumSectionPostReno = (section: SectionData): number => {
      return sumRowsRecursive(section.rows, 'post_reno');
    };

    const gpr = sumSection(response.rental_income);
    const vacancyDeductions = sumSection(response.vacancy_deductions);
    const nri = gpr + vacancyDeductions; // Deductions are negative
    const otherIncome = sumSection(response.other_income);
    const egi = nri + otherIncome;
    const opex = sumSection(response.operating_expenses);
    const asIsNoi = egi - opex;

    // Post-reno calculations
    const postRenoGpr = sumSectionPostReno(response.rental_income);
    const postRenoVacancy = sumSectionPostReno(response.vacancy_deductions);
    const postRenoNri = postRenoGpr + postRenoVacancy;
    const postRenoOther = sumSectionPostReno(response.other_income);
    const postRenoEgi = postRenoNri + postRenoOther;
    const postRenoOpex = sumSectionPostReno(response.operating_expenses);
    const postRenoNoi = postRenoEgi - postRenoOpex;

    const uplift = postRenoNoi - asIsNoi;
    const upliftPercent = asIsNoi !== 0 ? (uplift / asIsNoi) * 100 : 0;

    return {
      gross_potential_rent: gpr,
      net_rental_income: nri,
      total_other_income: otherIncome,
      effective_gross_income: egi,
      total_operating_expenses: opex,
      as_is_noi: asIsNoi,
      post_reno_noi: postRenoNoi,
      noi_uplift: uplift,
      noi_uplift_percent: upliftPercent
    };
  };

  // Determine preferred scenario from available ones
  const getPreferredScenario = (available: string[]): string => {
    for (const scenario of SCENARIO_PRIORITY) {
      if (available.includes(scenario)) {
        return scenario;
      }
    }
    return available[0] || 'T3_ANNUALIZED';
  };

  // =============================================================================
  // CLEANUP
  // =============================================================================

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // =============================================================================
  // RETURN
  // =============================================================================

  const availableScenarios = data?.available_scenarios || [];
  const preferredScenario = data?.preferred_scenario || getPreferredScenario(availableScenarios);
  const analysisType = data?.analysis_type || null;
  const showPostRehab = Boolean(data?.value_add_enabled);

  return {
    // Data
    data,
    propertySummary: data?.property_summary || null,
    rentalIncome: data?.rental_income || null,
    vacancyDeductions: data?.vacancy_deductions || null,
    otherIncome: data?.other_income || null,
    operatingExpenses: data?.operating_expenses || null,
    totals: data?.totals || null,
    availableScenarios,
    preferredScenario,
    valueAddEnabled: data?.value_add_enabled || false,
    analysisType,
    showPostRehab,

    // State
    isLoading,
    isSaving,
    error,
    isDirty: pendingUpdates.size > 0,

    // Actions
    updateInput,
    toggleValueAdd,
    toggleExpand,
    saveAll,
    reload: loadData
  };
}

export default useOperationsData;
