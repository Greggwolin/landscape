'use client';

import { useCallback, useEffect, useState } from 'react';
import { BudgetItem } from '../ColumnDefinitions';

export function useBudgetData(projectId: number) {
  const [data, setData] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizeItem = useCallback((raw: any): BudgetItem => {
    const startDateStr = raw.start_date ?? raw.startDate ?? null;
    const endDateStr = raw.end_date ?? raw.endDate ?? null;

    let startPeriod: number | null = null;
    if (raw.start_period !== undefined && raw.start_period !== null) {
      startPeriod = Number(raw.start_period);
    } else if (raw.startPeriod !== undefined && raw.startPeriod !== null) {
      startPeriod = Number(raw.startPeriod);
    } else if (startDateStr) {
      const date = new Date(startDateStr);
      if (!Number.isNaN(date.getTime())) {
        const baseYear = 2000;
        startPeriod = Math.max(0, (date.getFullYear() - baseYear) * 12 + date.getMonth());
      }
    }

    let duration: number | null = null;
    if (raw.periods_to_complete !== undefined && raw.periods_to_complete !== null) {
      duration = Number(raw.periods_to_complete);
    } else if (raw.spanPeriods !== undefined && raw.spanPeriods !== null) {
      duration = Number(raw.spanPeriods);
    } else if (startDateStr && endDateStr) {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
        const months =
          (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth()) +
          1;
        duration = Math.max(1, months);
      }
    }

    return {
      fact_id: Number(raw.fact_id ?? raw.factId),
      category_id: raw.category_id !== undefined ? Number(raw.category_id) : Number(raw.categoryId ?? 0),
      category_name:
        raw.category_name ??
        raw.categoryName ??
        raw.category_detail ??
        raw.categoryDetail ??
        null,
      // New category hierarchy fields
      category_l1_id: raw.category_l1_id ?? raw.categoryL1Id ?? null,
      category_l2_id: raw.category_l2_id ?? raw.categoryL2Id ?? null,
      category_l3_id: raw.category_l3_id ?? raw.categoryL3Id ?? null,
      category_l4_id: raw.category_l4_id ?? raw.categoryL4Id ?? null,
      // Category names for display
      category_l1_name: raw.category_l1_name ?? raw.categoryL1Name ?? null,
      category_l2_name: raw.category_l2_name ?? raw.categoryL2Name ?? null,
      category_l3_name: raw.category_l3_name ?? raw.categoryL3Name ?? null,
      category_l4_name: raw.category_l4_name ?? raw.categoryL4Name ?? null,
      category_breadcrumb: raw.category_breadcrumb ?? raw.categoryBreadcrumb ?? null,
      container_id: raw.container_id !== undefined ? Number(raw.container_id) : raw.containerId ?? null,
      container_name: raw.container_name ?? raw.containerName ?? null,
      container_display: raw.container_display ?? raw.containerDisplay ?? null,
      project_id:
        raw.project_id !== undefined && raw.project_id !== null
          ? Number(raw.project_id)
          : raw.projectId !== undefined && raw.projectId !== null
            ? Number(raw.projectId)
            : undefined,
      scope: raw.scope ?? null,
      qty: raw.qty !== undefined && raw.qty !== null ? Number(raw.qty) : null,
      rate: raw.rate !== undefined && raw.rate !== null ? Number(raw.rate) : null,
      amount: raw.amount !== undefined && raw.amount !== null ? Number(raw.amount) : null,
      uom_code: raw.uom_code ?? raw.uomCode ?? null,
      start_date: startDateStr,
      end_date: endDateStr,
      start_period: startPeriod,
      periods_to_complete: duration,
      notes: raw.notes ?? null,
      confidence_level: raw.confidence_level ?? raw.confidenceLevel ?? null,
      escalation_rate:
        raw.escalation_rate !== undefined && raw.escalation_rate !== null
          ? Number(raw.escalation_rate)
          : raw.escalationRate !== undefined && raw.escalationRate !== null
            ? Number(raw.escalationRate)
            : null,
      contingency_pct:
        raw.contingency_pct !== undefined && raw.contingency_pct !== null
          ? Number(raw.contingency_pct)
          : raw.contingencyPct !== undefined && raw.contingencyPct !== null
            ? Number(raw.contingencyPct)
            : null,
      timing_method: raw.timing_method ?? raw.timingMethod ?? null,
      vendor_name: raw.vendor_name ?? raw.vendorName ?? null,
      funding_id:
        raw.funding_id !== undefined && raw.funding_id !== null
          ? Number(raw.funding_id)
          : raw.fundingId !== undefined && raw.fundingId !== null
            ? Number(raw.fundingId)
            : null,
      curve_id:
        raw.curve_id !== undefined && raw.curve_id !== null
          ? Number(raw.curve_id)
          : raw.curveId !== undefined && raw.curveId !== null
            ? Number(raw.curveId)
            : null,
      milestone_id:
        raw.milestone_id !== undefined && raw.milestone_id !== null
          ? Number(raw.milestone_id)
          : raw.milestoneId !== undefined && raw.milestoneId !== null
            ? Number(raw.milestoneId)
            : null,
      cf_start_flag:
        raw.cf_start_flag !== undefined && raw.cf_start_flag !== null
          ? Boolean(raw.cf_start_flag)
          : raw.cfStartFlag !== undefined && raw.cfStartFlag !== null
            ? Boolean(raw.cfStartFlag)
            : null,
      lifecycle_stage: raw.lifecycle_stage ?? raw.lifecycleStage ?? null,
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/budget/gantt?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const items = Array.isArray(result) ? result : (result.items || []);
      setData(items.map(normalizeItem));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch budget data');
      console.error('Error fetching budget data:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [normalizeItem, projectId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const updateItem = useCallback(
    async (factId: number, updates: Partial<BudgetItem>) => {
      if (!factId) return;
      const allowedKeys: Array<keyof BudgetItem> = [
        'qty',
        'rate',
        'amount',
        'start_date',
        'end_date',
        'start_period',
        'periods_to_complete',
        'notes',
        'uom_code',
        'container_id',
        'lifecycle_stage',
        'vendor_name',
        'escalation_rate',
        'escalation_method',
        'contingency_pct',
        'timing_method',
        'curve_profile',
        'curve_steepness',
        'funding_id',
        'curve_id',
        'milestone_id',
        'cf_start_flag',
        'category_l1_id',
        'category_l2_id',
        'category_l3_id',
        'category_l4_id',
      ];

      const payload: Partial<BudgetItem> = {};
      for (const key of allowedKeys) {
        if (key in updates) {
          (payload as any)[key] = (updates as any)[key];
        }
      }

      const response = await fetch(`/api/budget/gantt/items/${factId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to update budget item');
      }

      const raw = await response.json();
      setData((prev) =>
        prev.map((item) =>
          item.fact_id === factId
            ? {
                ...item,
                ...updates,
                ...normalizeItem({ ...item, ...raw }),
              }
            : item
        )
      );
      return raw;
    },
    [normalizeItem]
  );

  const createItem = useCallback(
    async (payload: Record<string, unknown>) => {
      const response = await fetch('/api/budget/gantt/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to create budget item');
      }

      await fetchData();
    },
    [fetchData]
  );

  const deleteItem = useCallback(
    async (factId: number) => {
      const response = await fetch(`/api/budget/gantt/items/${factId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to delete budget item');
      }

      setData((prev) => prev.filter((item) => item.fact_id !== factId));
    },
    []
  );

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    updateItem,
    createItem,
    deleteItem,
  };
}
