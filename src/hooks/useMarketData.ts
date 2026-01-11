'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface MarketCompetitiveProject {
  id?: number;
  project: number;
  comp_name: string;
  master_plan_name?: string | null;
  builder_name?: string | null;
  comp_address?: string;
  latitude?: number;
  longitude?: number;
  total_units?: number;
  price_min?: number;
  price_max?: number;
  absorption_rate_monthly?: number;
  status: 'selling' | 'sold_out' | 'planned';
  data_source: 'manual' | 'landscaper_ai' | 'mls' | 'public_records';
  source_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  products?: MarketCompetitiveProjectProduct[];
}

export interface MarketCompetitiveProjectProduct {
  id?: number;
  lot_width_ft?: number | null;
  lot_dimensions?: string | null;
  unit_size_min_sf?: number | null;
  unit_size_max_sf?: number | null;
  unit_size_avg_sf?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_avg?: number | null;
  price_per_sf_avg?: number | null;
  units_planned?: number | null;
  units_sold?: number | null;
  units_remaining?: number | null;
  sales_rate_monthly?: number | null;
  sales_rate_3m_avg?: number | null;
  sales_rate_6m_avg?: number | null;
  qmi_count?: number | null;
  mos_vdl?: number | null;
  mos_inventory?: number | null;
}

export interface MarketMacroData {
  id?: number;
  project: number;
  population_growth_rate?: number;
  employment_trend?: 'growing' | 'stable' | 'declining';
  household_formation_rate?: number;
  building_permits_annual?: number;
  median_income?: number;
  data_year?: number;
  data_source: 'manual' | 'landscaper_ai' | 'census' | 'bls';
  source_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch competitive projects for a project
 */
export function useMarketCompetitors(projectId: number) {
  return useQuery<MarketCompetitiveProject[]>({
    queryKey: ['market-competitors', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/market/competitors/`);
      if (!response.ok) {
        throw new Error('Failed to fetch competitive projects');
      }
      return response.json();
    },
    enabled: !!projectId && projectId > 0,
  });
}

/**
 * Create a new competitive project
 */
export function useCreateCompetitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: MarketCompetitiveProject }) => {
      const response = await fetch(`/api/projects/${projectId}/market/competitors/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create competitive project');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['market-competitors', variables.projectId] });
    },
  });
}

/**
 * Update a competitive project
 */
export function useUpdateCompetitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, id, data }: { projectId: number; id: number; data: Partial<MarketCompetitiveProject> }) => {
      const response = await fetch(`/api/projects/${projectId}/market/competitors/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update competitive project');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['market-competitors', variables.projectId] });
    },
  });
}

/**
 * Delete a competitive project
 */
export function useDeleteCompetitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, id }: { projectId: number; id: number }) => {
      const response = await fetch(`/api/projects/${projectId}/market/competitors/${id}/`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete competitive project');
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['market-competitors', variables.projectId] });
    },
  });
}

/**
 * Fetch macro data for a project
 */
export function useMarketMacroData(projectId: number) {
  return useQuery<MarketMacroData[]>({
    queryKey: ['market-macro', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/market/macro/`);
      if (!response.ok) {
        throw new Error('Failed to fetch macro data');
      }
      return response.json();
    },
    enabled: !!projectId && projectId > 0,
  });
}

/**
 * Create or update macro data
 */
export function useSaveMarketMacroData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, id, data }: { projectId: number; id?: number; data: MarketMacroData }) => {
      const url = id
        ? `/api/projects/${projectId}/market/macro/${id}/`
        : `/api/projects/${projectId}/market/macro/`;

      const response = await fetch(url, {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save macro data');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['market-macro', variables.projectId] });
    },
  });
}
