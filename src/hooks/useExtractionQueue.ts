/**
 * useExtractionQueue
 *
 * Hook for managing the DMS extraction queue (dms_extract_queue table).
 * Lists pending/failed/completed extraction queue items and provides
 * actions to delete or retry them.
 */

import useSWR from 'swr';
import { useCallback } from 'react';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export interface ExtractQueueItem {
  queue_id: number;
  doc_id: number;
  doc_name: string;
  doc_type: string | null;
  mime_type: string | null;
  extract_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

interface ExtractQueueResponse {
  success: boolean;
  items: ExtractQueueItem[];
  total: number;
  status_counts: Record<string, number>;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`) as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

export function useExtractionQueue(projectId: number | undefined) {
  const { data, error, isLoading, mutate } = useSWR<ExtractQueueResponse>(
    projectId ? `${DJANGO_API_URL}/api/knowledge/projects/${projectId}/extract-queue/` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
        if (err?.status === 401 || err?.status === 403 || err?.status === 404) return;
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 5000);
      },
    }
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const statusCounts = data?.status_counts ?? {};

  const pendingCount = (statusCounts['pending'] ?? 0) + (statusCounts['processing'] ?? 0);
  const failedCount = statusCounts['failed'] ?? 0;

  const deleteAll = useCallback(async () => {
    if (!projectId) return false;
    try {
      const res = await fetch(
        `${DJANGO_API_URL}/api/knowledge/projects/${projectId}/extract-queue/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete_all' }),
        }
      );
      const result = await res.json();
      if (result.success) {
        mutate();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [projectId, mutate]);

  const deleteItems = useCallback(async (queueIds: number[]) => {
    if (!projectId || queueIds.length === 0) return false;
    try {
      const res = await fetch(
        `${DJANGO_API_URL}/api/knowledge/projects/${projectId}/extract-queue/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', queue_ids: queueIds }),
        }
      );
      const result = await res.json();
      if (result.success) {
        mutate();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [projectId, mutate]);

  const retryItems = useCallback(async (queueIds: number[]) => {
    if (!projectId || queueIds.length === 0) return false;
    try {
      const res = await fetch(
        `${DJANGO_API_URL}/api/knowledge/projects/${projectId}/extract-queue/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'retry', queue_ids: queueIds }),
        }
      );
      const result = await res.json();
      if (result.success) {
        mutate();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [projectId, mutate]);

  return {
    items,
    total,
    statusCounts,
    pendingCount,
    failedCount,
    isLoading,
    error,
    refresh: mutate,
    deleteAll,
    deleteItems,
    retryItems,
  };
}

export default useExtractionQueue;
