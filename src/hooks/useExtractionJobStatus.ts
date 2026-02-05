/**
 * useExtractionJobStatus
 *
 * Hook to track extraction job status across page navigations.
 * Polls for updates while jobs are active.
 */

import useSWR from 'swr';
import { useCallback, useMemo } from 'react';

export type ExtractionJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ExtractionScope = 'rent_roll' | 'operating_statement' | 'proforma' | 'offering_memo' | 'other';

export interface ExtractionJob {
  id: number;
  scope: ExtractionScope;
  status: ExtractionJobStatus;
  document_id: number;
  document_name: string | null;
  progress: {
    total: number | null;
    processed: number;
    percent: number;
  };
  result_summary: {
    units_extracted?: number;
    staged_count?: number;
    chunks_processed?: number;
    fills?: number;
    conflicts?: number;
    total?: number;
  } | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface ExtractionJobsResponse {
  success: boolean;
  jobs: ExtractionJob[];
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useExtractionJobStatus(
  projectId: number | undefined,
  scope?: ExtractionScope
) {
  const params = scope ? `?scope=${scope}` : '';

  // Determine if we should poll frequently (active jobs) or less frequently
  const { data, error, isLoading, mutate } = useSWR<ExtractionJobsResponse>(
    projectId ? `/api/projects/${projectId}/extraction-jobs${params}` : null,
    fetcher,
    {
      refreshInterval: (latestData) => {
        // Poll every 2 seconds if any job is active, otherwise every 30 seconds
        const hasActiveJob = latestData?.jobs?.some(
          (j) => j.status === 'queued' || j.status === 'processing'
        );
        return hasActiveJob ? 2000 : 30000;
      },
      revalidateOnFocus: true,
    }
  );

  const jobs = useMemo(() => data?.jobs ?? [], [data?.jobs]);

  // Get job by scope
  const getJobByScope = useCallback(
    (jobScope: ExtractionScope): ExtractionJob | undefined => {
      return jobs.find((j) => j.scope === jobScope);
    },
    [jobs]
  );

  // Convenience accessors for common scopes
  const rentRollJob = useMemo(() => getJobByScope('rent_roll'), [getJobByScope]);
  const operatingStatementJob = useMemo(
    () => getJobByScope('operating_statement'),
    [getJobByScope]
  );

  // Check if any job is active
  const hasActiveJob = useMemo(
    () => jobs.some((j) => j.status === 'queued' || j.status === 'processing'),
    [jobs]
  );

  // Cancel a job
  const cancelJob = useCallback(
    async (jobId: number): Promise<boolean> => {
      if (!projectId) return false;

      try {
        const response = await fetch(
          `/api/projects/${projectId}/extraction-jobs/${jobId}/cancel`,
          { method: 'POST' }
        );
        const result = await response.json();

        if (result.success) {
          // Refresh the job list
          mutate();
          return true;
        }
        return false;
      } catch (err) {
        console.error('Failed to cancel job:', err);
        return false;
      }
    },
    [projectId, mutate]
  );

  return {
    jobs,
    rentRollJob,
    operatingStatementJob,
    hasActiveJob,
    isLoading,
    error,
    getJobByScope,
    cancelJob,
    refresh: mutate,
  };
}

export default useExtractionJobStatus;
