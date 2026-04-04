'use client';

import { useQuery } from '@tanstack/react-query';

const DJANGO_API = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface StagingCountData {
  /** Count of rows needing user action (new + pending + conflict) */
  actionableCount: number;
  /** Backwards-compat alias — same as actionableCount */
  pendingCount: number;
  totalCount: number;
  isLoading: boolean;
}

/**
 * Lightweight hook that fetches only the count of pending/conflict/waiting
 * extraction staging rows for the nav indicator. Reuses the same query key
 * as useExtractionStaging so cache stays in sync.
 *
 * Polls every 10s to catch background extraction results (new project creation
 * uploads documents after navigating to the project page).
 */
export function useExtractionStagingCount(projectId: number): StagingCountData {
  const { data, isLoading } = useQuery<{
    success: boolean;
    count: number;
    status_counts: Record<string, number>;
  }>({
    queryKey: ['extraction-staging', projectId],
    queryFn: async () => {
      const res = await fetch(
        `${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-staging/`
      );
      if (!res.ok) throw new Error(`Staging fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !!projectId,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  const statusCounts = data?.status_counts || {};
  // Actionable = anything the user needs to review (excludes matches)
  const actionableCount =
    (statusCounts['new'] || 0) +
    (statusCounts['pending'] || 0) +
    (statusCounts['conflict'] || 0);
  const totalCount = data?.count || 0;

  return { actionableCount, pendingCount: actionableCount, totalCount, isLoading };
}
