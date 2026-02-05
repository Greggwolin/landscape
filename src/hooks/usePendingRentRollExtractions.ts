/**
 * usePendingRentRollExtractions
 *
 * Hook to fetch pending rent roll extraction count and metadata.
 * Used to display badge on Rent Roll tab and trigger review modal.
 *
 * Fetches both the pending extractions list AND the comparison data
 * to get accurate field-level change counts for the badge.
 */

import useSWR from 'swr';

interface ExtractionItem {
  extraction_id: number;
  doc_id: number;
  doc_name: string;
  extraction_type?: string;
  scope?: string;
  status: string;
}

interface PendingExtractionsResponse {
  success: boolean;
  project_id: number;
  count: number;
  summary: {
    total: number;
    pending: number;
    conflicts: number;
    accepted: number;
    applied: number;
    rejected: number;
    awaiting_review: number;
  };
  extractions: ExtractionItem[];
}

interface ComparisonSummary {
  total_fields_extracted: number;
  exact_matches: number;
  fills: number;
  conflicts: number;
}

interface ComparisonResponse {
  document_name: string | null;
  summary: ComparisonSummary;
  analysis: {
    placeholder_detected: boolean;
    placeholder_fields: string[];
    message: string;
    recommendation: 'accept_all' | 'review_conflicts';
  };
  deltas: unknown[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Custom fetcher for POST comparison endpoint
const comparisonFetcher = async ([url, documentId]: [string, number]) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: documentId }),
  });
  if (!res.ok) return null;
  return res.json();
};

export function usePendingRentRollExtractions(projectId: number | undefined) {
  const { data, error, isLoading, mutate } = useSWR<PendingExtractionsResponse>(
    projectId ? `/api/projects/${projectId}/extractions/pending` : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  // Filter for rent roll extractions (unit scope or rent_roll type)
  const rentRollExtractions = data?.extractions?.filter(
    (ext) => ext.extraction_type === 'rent_roll' || ext.scope === 'unit'
  ) ?? [];

  // Get the most recent document with pending rent roll extractions
  const latestDoc = rentRollExtractions.length > 0 ? rentRollExtractions[0] : null;

  // Fetch comparison data to get accurate field-level counts
  const backendUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
  const comparisonUrl = `${backendUrl}/api/knowledge/projects/${projectId}/rent-roll/compare/`;

  const { data: comparisonData } = useSWR<ComparisonResponse | null>(
    projectId && latestDoc?.doc_id ? [comparisonUrl, latestDoc.doc_id] : null,
    comparisonFetcher,
    {
      refreshInterval: 60000, // Less frequent refresh for comparison (heavier query)
      revalidateOnFocus: false, // Don't refetch on every focus
    }
  );

  // Use comparison data for accurate count (fills + conflicts = field-level changes)
  // Fall back to extraction count if comparison not available
  const pendingChangesCount = comparisonData?.summary
    ? comparisonData.summary.fills + comparisonData.summary.conflicts
    : rentRollExtractions.length;

  return {
    pendingCount: pendingChangesCount,
    extractionCount: rentRollExtractions.length,
    documentId: latestDoc?.doc_id ?? null,
    documentName: latestDoc?.doc_name ?? null,
    extractions: rentRollExtractions,
    summary: data?.summary ?? null,
    comparisonSummary: comparisonData?.summary ?? null,
    isLoading,
    error,
    refresh: mutate,
  };
}

export default usePendingRentRollExtractions;
