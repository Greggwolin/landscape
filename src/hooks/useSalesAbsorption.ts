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
    queryFn: async (): Promise<ParcelWithSale[]> => {
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
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Create a new parcel sale event
 */
export function useCreateParcelSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleData: Partial<ParcelSaleEvent>): Promise<ParcelSaleEvent> => {
      const response = await fetch('/api/parcel-sales/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create parcel sale');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate parcels-with-sales query to refetch with new sale
      queryClient.invalidateQueries({
        queryKey: ['parcels-with-sales', data.project_id],
      });
    },
  });
}

/**
 * Create a closing event for a sale
 */
export function useCreateClosing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (closingData: Partial<ClosingEvent>): Promise<ClosingEvent> => {
      const response = await fetch('/api/closings/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(closingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create closing event');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate queries that might show closing data
      queryClient.invalidateQueries({
        queryKey: ['closings', data.sale_event_id],
      });
    },
  });
}

/**
 * Combined hook to create a single closing sale
 * Creates both the sale event and the closing in one transaction
 */
export function useCreateSingleClosingSale() {
  const queryClient = useQueryClient();
  const createSale = useCreateParcelSale();
  const createClosing = useCreateClosing();

  return useMutation({
    mutationFn: async (formData: SingleClosingSaleForm & { project_id: number }) => {
      // Step 1: Create the sale event
      const saleEventData: Partial<ParcelSaleEvent> = {
        project_id: formData.project_id,
        parcel_id: formData.parcel_id,
        sale_type: 'single_closing',
        buyer_entity: formData.buyer_entity,
        contract_date: formData.contract_date,
        total_lots_contracted: formData.total_lots,
        base_price_per_lot: formData.price_per_lot,
        deposit_amount: 0,
        deposit_applied_to_purchase: false,
        has_escrow_holdback: false,
        sale_status: 'pending',
      };

      const saleEvent = await createSale.mutateAsync(saleEventData);

      // Step 2: Calculate proceeds
      const gross_proceeds = formData.total_lots * formData.price_per_lot;
      const commissions = formData.commissions_amount || 0;
      const closing_costs = formData.closing_costs || 0;
      const net_proceeds = gross_proceeds - commissions - closing_costs;

      // Step 3: Create the closing event
      const closingEventData: Partial<ClosingEvent> = {
        sale_event_id: saleEvent.sale_event_id,
        closing_sequence: 1,
        closing_date: formData.closing_date,
        lots_closed: formData.total_lots,
        gross_proceeds,
        less_commissions_amount: commissions,
        less_closing_costs: closing_costs,
        net_proceeds,
        cumulative_lots_closed: formData.total_lots,
        lots_remaining: 0,
      };

      const closingEvent = await createClosing.mutateAsync(closingEventData);

      return { saleEvent, closingEvent };
    },
    onSuccess: (data) => {
      // Invalidate parcels query to show new sale
      queryClient.invalidateQueries({
        queryKey: ['parcels-with-sales', data.saleEvent.project_id],
      });
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
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
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
      // Save each assumption individually
      const promises = assumptions.map(async (assumption) => {
        const url = assumption.id
          ? `/api/projects/${projectId}/pricing-assumptions/${assumption.id}/`
          : `/api/projects/${projectId}/pricing-assumptions/`;

        const method = assumption.id ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assumption),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to save pricing assumption`);
        }

        return response.json();
      });

      return Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      // Invalidate pricing assumptions to refetch
      queryClient.invalidateQueries({
        queryKey: ['pricing-assumptions', variables.projectId],
      });
      // Also invalidate parcels-with-sales to show updated values
      queryClient.invalidateQueries({
        queryKey: ['parcels-with-sales', variables.projectId],
      });
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
 */
export function useParcelProductTypes(projectId: number | null) {
  return useQuery({
    queryKey: ['parcel-product-types', projectId],
    queryFn: async (): Promise<ParcelProductType[]> => {
      if (!projectId) return [];

      const response = await fetch(`/api/projects/${projectId}/parcel-product-types/`);
      if (!response.ok) {
        throw new Error('Failed to fetch parcel product types');
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes - this data doesn't change often
  });
}
