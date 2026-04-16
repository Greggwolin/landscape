'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
const POLL_INTERVAL_MS = 30_000;

export interface RecentThread {
  threadId: string;
  projectId: number | null;
  projectName: string | null;
  propertyType: string | null;
  pageContext: string | null;
  subtabContext: string | null;
  title: string | null;
  isActive: boolean;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

interface UseRecentThreadsReturn {
  threads: RecentThread[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('auth_tokens');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.access) {
          headers.Authorization = `Bearer ${parsed.access}`;
        }
      }
    } catch { /* ignore */ }
  }
  return headers;
}

/**
 * Hook for fetching recent threads across all projects.
 * Polls every 30 seconds for fresh data.
 */
export function useRecentThreads(limit = 50): UseRecentThreadsReturn {
  const [threads, setThreads] = useState<RecentThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch(
        `${DJANGO_API_URL}/api/landscaper/threads/recent/?limit=${limit}&include_closed=true`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (mountedRef.current && data.success && data.threads) {
        setThreads(data.threads);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load threads');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [limit]);

  useEffect(() => {
    mountedRef.current = true;
    fetchThreads();
    const interval = setInterval(fetchThreads, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchThreads]);

  return { threads, isLoading, error, refresh: fetchThreads };
}
