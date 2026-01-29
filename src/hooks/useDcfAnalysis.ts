/**
 * React Hooks for DCF Analysis
 *
 * Provides data fetching and mutation for the unified DCF analysis table.
 * Works with both CRE and Land Development property types.
 *
 * Session: QK-28
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  DcfAnalysis,
  DcfAnalysisResponse,
  DcfAnalysisUpdatePayload,
  GrowthRateSet,
  GrowthRateSetWithSteps,
} from '@/types/dcf-analysis';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// ============================================================================
// DCF ANALYSIS HOOKS
// ============================================================================

/**
 * Fetch DCF analysis for a project.
 * Creates with defaults if none exists.
 */
export function useDcfAnalysis(projectId: number) {
  return useQuery({
    queryKey: ['dcf-analysis', projectId],
    queryFn: async (): Promise<DcfAnalysisResponse> => {
      const response = await fetch(
        `${DJANGO_API_URL}/api/valuation/dcf-analysis/${projectId}/`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch DCF analysis: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

/**
 * Update DCF analysis parameters.
 * Invalidates cache on success.
 */
export function useUpdateDcfAnalysis(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DcfAnalysisUpdatePayload): Promise<DcfAnalysis> => {
      const response = await fetch(
        `${DJANGO_API_URL}/api/valuation/dcf-analysis/${projectId}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to update DCF analysis: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Update cache with new data
      queryClient.setQueryData(['dcf-analysis', projectId], data);
    },
  });
}

// ============================================================================
// GROWTH RATE SETS HOOKS
// ============================================================================

/**
 * Fetch growth rate sets for dropdown population.
 *
 * @param cardType - Filter by 'revenue' or 'cost'
 * @param projectId - Include project-specific sets
 */
export function useGrowthRateSets(cardType?: 'revenue' | 'cost', projectId?: number) {
  return useQuery({
    queryKey: ['growth-rate-sets', cardType, projectId],
    queryFn: async (): Promise<GrowthRateSet[]> => {
      const params = new URLSearchParams();
      if (cardType) params.append('card_type', cardType);
      if (projectId) params.append('project_id', projectId.toString());

      const response = await fetch(
        `${DJANGO_API_URL}/api/growth-rate-sets/?${params}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch growth rate sets: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 60000, // Growth rate sets change rarely
  });
}

/**
 * Fetch a single growth rate set with its steps.
 */
export function useGrowthRateSetDetail(setId: number | null) {
  return useQuery({
    queryKey: ['growth-rate-set', setId],
    queryFn: async (): Promise<GrowthRateSetWithSteps> => {
      const response = await fetch(
        `${DJANGO_API_URL}/api/growth-rate-sets/${setId}/`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch growth rate set: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!setId,
  });
}

// ============================================================================
// COMBINED HOOK WITH AUTO-SAVE
// ============================================================================

/**
 * Combined hook for DCF analysis with debounced auto-save.
 *
 * Similar pattern to useIncomeApproach but for the unified DCF table.
 */
export function useDcfAnalysisWithAutoSave(projectId: number) {
  const { data, isLoading, error, refetch } = useDcfAnalysis(projectId);
  const updateMutation = useUpdateDcfAnalysis(projectId);

  const updateField = (field: keyof DcfAnalysis, value: number | string | boolean | null) => {
    updateMutation.mutate({ [field]: value } as DcfAnalysisUpdatePayload);
  };

  return {
    data,
    isLoading,
    isSaving: updateMutation.isPending,
    error: error?.message || null,
    updateField,
    reload: refetch,
  };
}

export default useDcfAnalysis;
