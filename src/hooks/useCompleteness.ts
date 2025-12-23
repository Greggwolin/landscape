import { useQuery } from '@tanstack/react-query';
import { CompletenessCategory } from '@/components/dashboard/CompletenessModal';

interface ProjectCompleteness {
  project_id: number;
  project_name: string;
  overall_percentage: number;
  categories: CompletenessCategory[];
}

interface AllCompletenessResponse {
  success: boolean;
  count: number;
  projects: ProjectCompleteness[];
  error?: string;
}

interface SingleCompletenessResponse {
  success: boolean;
  project_id: number;
  project_name: string;
  overall_percentage: number;
  categories: CompletenessCategory[];
  error?: string;
}

/**
 * Fetch completeness scores for all active projects.
 */
export function useAllProjectsCompleteness() {
  return useQuery<AllCompletenessResponse>({
    queryKey: ['projects-completeness'],
    queryFn: async () => {
      const response = await fetch('/api/projects/completeness');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch completeness');
      }
      return response.json();
    },
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Fetch completeness scores for a single project.
 */
export function useProjectCompleteness(projectId?: string | number) {
  const id = projectId?.toString() || '';

  return useQuery<SingleCompletenessResponse>({
    queryKey: ['project-completeness', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}/completeness`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch completeness');
      }
      return response.json();
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}
