/**
 * React Query hooks for Sales & Absorption data
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  InventoryGaugeData,
  ParcelWithSale,
  ParcelSaleEvent,
  ClosingEvent,
  PricingAssumption,
  SingleClosingSaleForm,
  ParcelProductType,
  ParcelSalesDataset,
  CreateSalePhasePayload,
  AssignParcelToPhasePayload,
  ParcelSaleOverridePayload,
  UpdateParcelSaleDatePayload,
  CreateParcelSalePayload,
  UpdateParcelSalePayload,
  UpdateClosingPayload,
} from '@/types/sales-absorption';

/**
 * Fetch annual inventory gauge data for a project
 */
export function useInventoryGauge(projectId: number | null) {
  return useQuery({
    queryKey: ['inventory-gauge', projectId],
    queryFn: async (): Promise<InventoryGaugeData> => {
      const response = await fetch(`/api/projects/${projectId}/inventory-gauge/`);
      if (!response.ok) {
        throw new Error('Failed to fetch inventory gauge data');
      }
      const years = await response.json();
      return {
        project_id: projectId!,
        years,
      };
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch parcels with sale data for a project
 * Optionally filter by phase(s)
 */
export function useParcelsWithSales(
  projectId: number | null,
  phaseIds?: number[] | number | null
) {
  return useQuery({
    queryKey: ['parcels-with-sales', projectId, phaseIds],
    queryFn: async (): Promise<ParcelSalesDataset> => {
      if (!projectId) {
        throw new Error('Project id is required');
      }

      let url = `/api/projects/${projectId}/parcels-with-sales/`;

      // Handle multiple phase filters
      if (Array.isArray(phaseIds) && phaseIds.length > 0) {
        url += `?phase_ids=${phaseIds.join(',')}`;
      } else if (typeof phaseIds === 'number') {
        url += `?phase_id=${phaseIds}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch parcels with sales data');
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}


/**
 * Create a new sale phase scoped to the project
 */
export function useCreateSalePhase(projectId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSalePhasePayload) => {
      if (!projectId) {
        throw new Error('Project id is required to create a sale phase');
      }

      const response = await fetch(`/api/projects/${projectId}/sale-phases/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create sale phase');
      }

      return response.json();
    },
    onSuccess: () => {
      if (!projectId) return;
      queryClient.invalidateQueries({ queryKey: ['parcels-with-sales', projectId] });
      queryClient.invalidateQueries({ queryKey: ['phase-stats', projectId] });
    },
  });
}

/**
 * Assign or clear a parcel's sale phase
 */
export function useAssignParcelToPhase(projectId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AssignParcelToPhasePayload) => {
      if (!projectId) {
        throw new Error('Project id is required to assign sale phases');
      }

      const response = await fetch(`/api/projects/${projectId}/parcel-sale-phase/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update sale phase');
      }

      return response.json();
    },
    onSuccess: () => {
      if (!projectId) return;
      queryClient.invalidateQueries({ queryKey: ['parcels-with-sales', projectId] });
    },
  });
}

/**
 * Save parcel-level benchmark overrides (custom detail rows)
 */
export function useSaveParcelOverrides(projectId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ParcelSaleOverridePayload) => {
      if (!projectId) {
        throw new Error('Project id is required to save overrides');
      }

      const response = await fetch(`/api/projects/${projectId}/parcel-sales/overrides/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save parcel overrides');
      }

      return response.json();
    },
    onSuccess: () => {
      if (!projectId) return;
      queryClient.invalidateQueries({ queryKey: ['parcels-with-sales', projectId] });
    },
  });
}

/**
 * Update sale date for parcels that are not yet tied to a sale phase
 */
export function useUpdateParcelSaleDate(projectId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateParcelSaleDatePayload) => {
      if (!projectId) {
        throw new Error('Project id is required to update sale date');
      }

      const response = await fetch(`/api/projects/${projectId}/parcel-sales/date/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update sale date');
      }

      return response.json();
    },
    onSuccess: () => {
      if (!projectId) return;
      queryClient.invalidateQueries({ queryKey: ['parcels-with-sales', projectId] });
    },
  });
}

/**
 * Fetch phase summary stats for tiles
 */
export function usePhaseStats(projectId: number | null) {
  return useQuery({
    queryKey: ['phase-stats', projectId],
    queryFn: async () => {
      // Use existing phases endpoint
      const response = await fetch(`/api/phases?project_id=${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch phase stats');
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch pricing assumptions for a project
 */
export function usePricingAssumptions(projectId: number | null) {
  return useQuery({
    queryKey: ['pricing-assumptions', projectId],
    queryFn: async (): Promise<PricingAssumption[]> => {
      const response = await fetch(`/api/projects/${projectId}/pricing-assumptions/`);
      if (!response.ok) {
        throw new Error('Failed to fetch pricing assumptions');
      }
      const data = await response.json();
      console.log('[usePricingAssumptions] Received data type:', Array.isArray(data) ? `Array[${data.length}]` : typeof data);
      console.log('[usePricingAssumptions] First item:', data[0]);
      console.log('[usePricingAssumptions] First item has id?:', data[0]?.id);
      return data;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes - data changes infrequently
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

/**
 * Create or update pricing assumptions (bulk save)
 */
export function useSavePricingAssumptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      assumptions,
    }: {
      projectId: number;
      assumptions: PricingAssumption[];
    }) => {
      console.log(`[useSavePricingAssumptions] Bulk saving ${assumptions.length} pricing assumption(s)`);

      // Use bulk endpoint for ALL saves - handles 1 or 20 rows in ONE SQL query
      const response = await fetch(`/api/projects/${projectId}/pricing-assumptions/bulk/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assumptions }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save pricing assumptions');
      }

      return response.json();
    },
    onSuccess: async (_, variables) => {
      // Invalidate pricing assumptions to refetch
      await queryClient.invalidateQueries({
        queryKey: ['pricing-assumptions', variables.projectId],
      });

      // CRITICAL: Trigger recalculation when pricing assumptions change
      // Growth rate changes affect inflated prices and net proceeds
      // MUST wait for recalculation to complete before invalidating parcels cache
      try {
        console.log('[useSavePricingAssumptions] Starting recalculation for all parcel types...');

        // Get unique type codes from the saved assumptions
        const typesCodes = [...new Set(variables.assumptions.map(a => a.lu_type_code))];
        console.log('[useSavePricingAssumptions] Recalculating types:', typesCodes);

        // Make ONE call with all type codes (comma-separated)
        const typeCodesParam = typesCodes.join(',');
        const response = await fetch(
          `/api/projects/${variables.projectId}/recalculate-sfd/?type_codes=${typeCodesParam}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[useSavePricingAssumptions] Recalculation failed:', errorText);
          throw new Error(`Recalculation failed: ${errorText}`);
        }

        const result = await response.json();
        console.log(`[useSavePricingAssumptions] Recalculated ${result.updated_count} parcels for types: ${result.type_codes}`);
      } catch (error) {
        console.error('[useSavePricingAssumptions] Failed to trigger recalculation:', error);
        throw error; // Re-throw to prevent cache invalidation on failure
      }

      // Only invalidate parcels cache AFTER recalculation completes successfully
      await queryClient.invalidateQueries({
        queryKey: ['parcels-with-sales', variables.projectId],
      });
      console.log('[useSavePricingAssumptions] Cache invalidated, new data will be fetched');
    },
  });
}

/**
 * Delete a pricing assumption
 */
export function useDeletePricingAssumption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, id }: { projectId: number; id: number }) => {
      const response = await fetch(`/api/projects/${projectId}/pricing-assumptions/${id}/`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete pricing assumption');
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate pricing assumptions
      queryClient.invalidateQueries({
        queryKey: ['pricing-assumptions', variables.projectId],
      });
      // Also invalidate parcels to reflect removed pricing
      queryClient.invalidateQueries({
        queryKey: ['parcels-with-sales', variables.projectId],
      });
    },
  });
}

/**
 * Fetch unique parcel product types for auto-populating pricing table
 * Optionally filter by phase(s)
 */
export function useParcelProductTypes(
  projectId: number | null,
  phaseIds?: number[] | number | null
) {
  return useQuery({
    queryKey: ['parcel-product-types', projectId, phaseIds],
    queryFn: async (): Promise<ParcelProductType[]> => {
      if (!projectId) return [];

      let url = `/api/projects/${projectId}/parcel-product-types/`;

      // Handle multiple phase filters
      if (Array.isArray(phaseIds) && phaseIds.length > 0) {
        url += `?phase_ids=${phaseIds.join(',')}`;
      } else if (typeof phaseIds === 'number') {
        url += `?phase_id=${phaseIds}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch parcel product types');
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes - product types don't change often
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

/**
 * Fetch global growth rate benchmarks for dropdowns
 */
export function useGrowthRateBenchmarks() {
  return useQuery({
    queryKey: ['growth-rate-benchmarks'],
    queryFn: async () => {
      const response = await fetch('/api/benchmarks/growth-rates');
      if (!response.ok) {
        throw new Error('Failed to fetch growth rate benchmarks');
      }
      const data = await response.json();
      return data.sets || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (benchmarks change infrequently)
  });
}

// ============================================================================
// PARCEL SALE EVENT HOOKS (New Closing Model)
// ============================================================================

/**
 * Create a new parcel sale with closings
 * For single closing: closings array has one item
 * For multi-closing: closings array has multiple items
 */
export function useCreateParcelSale(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateParcelSalePayload) => {
      const response = await fetch(`/api/projects/${projectId}/parcel-sales/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        // Handle error.details being an object
        const errorMessage = typeof error.details === 'string'
          ? error.details
          : error.error || error.message || JSON.stringify(error);
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate parcels query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['parcels-with-sales', projectId] });
    },
  });
}

/**
 * Update an existing parcel sale (change sale type or overrides)
 */
export function useUpdateParcelSale(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleEventId, payload }: { saleEventId: number; payload: UpdateParcelSalePayload }) => {
      const response = await fetch(`/api/projects/${projectId}/parcel-sales/${saleEventId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to update parcel sale');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels-with-sales', projectId] });
    },
  });
}

/**
 * Update a specific closing event
 */
export function useUpdateClosing(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ closingId, payload }: { closingId: number; payload: UpdateClosingPayload }) => {
      const response = await fetch(`/api/closings/${closingId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to update closing');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels-with-sales', projectId] });
    },
  });
}

/**
 * Delete a parcel sale event (and all its closings)
 */
export function useDeleteParcelSale(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleEventId: number) => {
      const response = await fetch(`/api/projects/${projectId}/parcel-sales/${saleEventId}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete parcel sale');
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels-with-sales', projectId] });
    },
  });
}

/**
 * Update the sale_period for a parcel
 */
export function useUpdateParcelSalePeriod(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ parcelId, salePeriod }: { parcelId: number; salePeriod: number | null }) => {
      const response = await fetch(`/api/parcels/${parcelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale_period: salePeriod }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to update sale period');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels-with-sales', projectId] });
    },
  });
}
