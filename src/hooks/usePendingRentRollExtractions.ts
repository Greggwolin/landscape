/**
 * usePendingRentRollExtractions
 *
 * Hook to fetch pending rent roll changes count for badge display.
 * "Pending" now means delta changes awaiting commit in the rent roll grid,
 * not extractions awaiting modal review.
 *
 * Fetches from GET /api/knowledge/projects/{id}/rent-roll/pending-changes/
 */

import useSWR from 'swr';

interface PendingChangesResponse {
  has_pending: boolean;
  document_id: number | null;
  document_name: string | null;
  summary?: {
    units_with_changes: number;
    total_field_changes: number;
    change_breakdown: Record<string, number>;
  };
}

const backendUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePendingRentRollExtractions(projectId: number | undefined) {
  const { data, error, isLoading, mutate } = useSWR<PendingChangesResponse>(
    projectId ? `${backendUrl}/api/knowledge/projects/${projectId}/rent-roll/pending-changes/` : null,
    fetcher,
    {
      refreshInterval: (latestData: PendingChangesResponse | undefined) => {
        // Only poll while there are pending changes; stop when idle
        return latestData?.has_pending ? 15000 : 0;
      },
      // Prevent phantom requests on tab focus when nothing is pending.
      // The conditional refreshInterval handles active states; explicit
      // mutate() calls handle post-commit/reject revalidation.
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const pendingCount = data?.summary?.total_field_changes ?? 0;

  return {
    pendingCount,
    extractionCount: pendingCount,
    documentId: data?.document_id ?? null,
    documentName: data?.document_name ?? null,
    summary: data?.summary ?? null,
    comparisonSummary: null,
    extractions: [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export default usePendingRentRollExtractions;
