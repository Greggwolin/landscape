'use client';

import { useState, useEffect, useCallback } from 'react';

export interface BudgetItem {
  fact_id: number;
  category_id: number;
  parent_category_id: number | null;
  category_code: string;
  category_detail: string;
  scope: string;
  qty: number | null;
  uom_code: string | null;
  rate: number | null;
  amount: number;
  start_date: string;
  end_date: string;
  escalation_rate: number;
  contingency_pct: number;
  timing_method: string;
}

interface UseBudgetDataProps {
  projectId: number;
  scope?: string;
  level?: string;
  entityId?: string;
}

export function useBudgetData({
  projectId,
  scope,
  level,
  entityId
}: UseBudgetDataProps) {
  const [data, setData] = useState<BudgetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        projectId: projectId.toString(),
        ...(scope && scope !== 'all' && { scope }),
        ...(level && { level }),
        ...(entityId && { entityId })
      });

      const response = await fetch(`/api/budget/gantt?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch budget data');
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, scope, level, entityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mutate = useCallback(
    (newData?: BudgetItem[], shouldRevalidate = true) => {
      if (newData !== undefined) setData(newData);
      if (shouldRevalidate) fetchData();
    },
    [fetchData]
  );

  return { data, isLoading, error, mutate };
}
