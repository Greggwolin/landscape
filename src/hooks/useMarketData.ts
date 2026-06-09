'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { getAuthHeaders } from '@/lib/authHeaders';
// Types
export interface MarketCompetitiveProject {
  id?: number;
  project: number;
  comp_name: string;
  display_name?: string | null;
  master_plan_name?: string | null;
  builder_name?: string | null;
  comp_address?: string;
  city?: string | null;
  zip_code?: string | null;
  latitude?: number;
  longitude?: number;
  total_units?: number;
  price_min?: number;
  price_max?: number;
  absorption_rate_monthly?: number;
  status: 'selling' | 'sold_out' | 'planned';
  data_source: 'manual' | 'landscaper_ai' | 'mls' | 'public_records' | 'zonda';
  source_url?: string;
  // Set for competitors imported from Zonda (data_source === 'zonda').
  source_project_id?: string | null;
  effective_date?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  products?: MarketCompetitiveProjectProduct[];
}

/**
 * A Zonda new-home project from landscape.mkt_new_home_project, as returned by
 * the search and nearby endpoints. This is the supply-side source record that
 * can be imported into a MarketCompetitiveProject (data_source === 'zonda').
 */
export interface ZondaProject {
  record_id: number;
  source_project_id: string;
  project_name: string;
  master_plan_name: string | null;
  builder_name: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  city: string | null;
  zip_code: string | null;
  units_planned: number | null;
  units_remaining: number | null;
  price_min: number | null;
  price_max: number | null;
  sales_rate_monthly: number | null;
  status: string | null;
  effective_date: string | null;
  product_type: string | null;
  unit_size_min_sf: number | null;
  unit_size_max_sf: number | null;
  price_per_sf_avg: number | null;
  lot_width_ft: number | null;
  lot_dimensions: string | null;
  // Present on rows from the radius "nearby" endpoint.
  distance_miles?: number;
  is_excluded?: boolean;
  is_imported?: boolean;
}

export interface ZondaSearchResponse {
  count: number;
  results: ZondaProject[];
}

export interface ZondaSyncResult {
  success: boolean;
  imported_count: number;
  radius_miles: number;
  summary?: {
    total_found: number;
    created: number;
    updated: number;
    skipped: number;
    excluded: number;
  };
  competitors?: Array<{
    id: number;
    comp_name: string;
    source_project_id: string;
    action: 'created' | 'updated' | 'skipped';
  }>;
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
      const response = await fetch(`/api/projects/${projectId}/market/competitors/`, { headers: getAuthHeaders() });
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
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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
      const response = await fetch(`/api/projects/${projectId}/market/competitors/${id}/`, { headers: getAuthHeaders(), method: 'DELETE',
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
      const response = await fetch(`/api/projects/${projectId}/market/macro/`, { headers: getAuthHeaders() });
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

/**
 * Text-search Zonda new-home projects (supply-side market intelligence) for the
 * "Add Competitor" modal. Backed by GET /market/competitors/search. Disabled
 * until the search term has at least 2 characters.
 */
export function useZondaSearch(projectId: number, searchTerm: string) {
  const term = searchTerm.trim();
  return useQuery<ZondaSearchResponse>({
    queryKey: ['zonda-search', projectId, term],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/market/competitors/search?q=${encodeURIComponent(term)}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) {
        throw new Error('Failed to search Zonda projects');
      }
      return response.json();
    },
    enabled: !!projectId && projectId > 0 && term.length >= 2,
  });
}

/**
 * Import a single Zonda project (by source_project_id) as a competitor.
 * Backed by POST /market/competitors/import.
 */
export function useImportZondaProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, sourceProjectId }: { projectId: number; sourceProjectId: string }) => {
      const response = await fetch(`/api/projects/${projectId}/market/competitors/import`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_project_id: sourceProjectId }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to import Zonda project');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['market-competitors', variables.projectId] });
    },
  });
}

/**
 * Competitive projects list plus a manual Zonda radius-sync action, for the
 * Competitive Projects panel. Reuses the competitors GET and the
 * sync-radius POST endpoint.
 */
export function useCompetitorsWithZondaSync(projectId: number, radiusMiles: number) {
  const queryClient = useQueryClient();

  const competitorsQuery = useQuery<MarketCompetitiveProject[]>({
    queryKey: ['market-competitors', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/market/competitors/`, { headers: getAuthHeaders() });
      if (!response.ok) {
        throw new Error('Failed to fetch competitive projects');
      }
      return response.json();
    },
    enabled: !!projectId && projectId > 0,
  });

  const syncMutation = useMutation<ZondaSyncResult, Error, void>({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/market/competitors/sync-radius`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ radius_miles: radiusMiles }),
      });
      if (!response.ok) {
        throw new Error('Failed to sync competitors from Zonda');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-competitors', projectId] });
    },
  });

  return {
    competitors: competitorsQuery.data ?? [],
    isLoading: competitorsQuery.isLoading,
    isError: competitorsQuery.isError,
    isSyncing: syncMutation.isPending,
    lastSyncResult: syncMutation.data ?? null,
    manualSync: syncMutation.mutate,
  };
}
