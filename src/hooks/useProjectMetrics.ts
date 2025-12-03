'use client';

import { useQuery } from '@tanstack/react-query';

interface ProjectMetrics {
  project: {
    project_id: number;
    project_name: string;
    project_type: string;
    development_type: string;
    acres_gross: number;
    target_units: number;
    is_active: boolean;
  };
  parcels: {
    total_parcels: number;
    total_acres: number;
    total_units: number;
    land_use_types: number;
  };
  budget: {
    budget_count: number;
    total_budget_amount: number;
  };
  containers: {
    total_containers: number;
    areas: number;
    phases: number;
    parcels: number;
  };
}

/**
 * useProjectMetrics Hook
 *
 * Fetches project financial metrics calculated in real-time.
 * Uses existing calculation engine via API.
 *
 * @param projectId - The project ID
 * @returns Query result with metrics data
 */
export function useProjectMetrics(projectId: number) {
  return useQuery<ProjectMetrics>({
    queryKey: ['project-metrics', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/metrics`);
      if (!response.ok) {
        throw new Error('Failed to fetch project metrics');
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * useProjectGranularity Hook
 *
 * Fetches project data granularity/completeness indicators.
 *
 * @param projectId - The project ID
 * @returns Query result with granularity data
 */
export function useProjectGranularity(projectId: number) {
  return useQuery({
    queryKey: ['project-granularity', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/granularity`);
      if (!response.ok) {
        throw new Error('Failed to fetch project granularity');
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

/**
 * useProjectMilestones Hook
 *
 * Fetches project milestones.
 * Extends existing milestones API with projectId filtering.
 *
 * @param projectId - The project ID
 * @returns Query result with milestones data
 */
export function useProjectMilestones(projectId: number) {
  return useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/milestones?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project milestones');
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });
}
