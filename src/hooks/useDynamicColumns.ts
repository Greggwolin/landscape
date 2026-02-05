/**
 * useDynamicColumns Hook
 *
 * Provides access to dynamic column definitions and values.
 * Supports proposed columns from Landscaper extraction.
 */

import useSWR from 'swr';
import { useCallback } from 'react';

export type DynamicColumnDataType = 'text' | 'number' | 'currency' | 'percent' | 'boolean' | 'date';
export type DynamicColumnSource = 'user' | 'landscaper' | 'extraction';

export interface DynamicColumn {
  id: number;
  project: number;
  table_name: string;
  column_key: string;
  display_label: string;
  data_type: DynamicColumnDataType;
  format_pattern?: string;
  source: DynamicColumnSource;
  is_active: boolean;
  is_proposed: boolean;
  display_order: number;
  created_at: string;
}

export interface DynamicColumnsResponse {
  columns: DynamicColumn[];
  values: Record<string, Record<string, unknown>>; // {row_id: {column_key: value}}
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook to fetch dynamic columns with their values for a table.
 */
export function useDynamicColumns(
  projectId: number | undefined,
  tableName: string,
  rowIds?: number[]
) {
  const params = new URLSearchParams({ table: tableName });
  if (rowIds && rowIds.length > 0) {
    rowIds.forEach((id) => params.append('row_ids', String(id)));
  }

  const { data, error, isLoading, mutate } = useSWR<DynamicColumnsResponse>(
    projectId ? `/api/projects/${projectId}/dynamic/columns/with_values/?${params}` : null,
    fetcher
  );

  return {
    columns: data?.columns ?? [],
    values: data?.values ?? {},
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook to fetch and manage proposed columns (not yet accepted).
 */
export function useProposedColumns(projectId: number | undefined, tableName: string) {
  const { data, error, isLoading, mutate } = useSWR<DynamicColumn[]>(
    projectId
      ? `/api/projects/${projectId}/dynamic/columns/?table=${tableName}&proposed=true`
      : null,
    fetcher
  );

  const acceptColumn = useCallback(
    async (columnId: number, overrides?: { display_label?: string; data_type?: string }) => {
      if (!projectId) return false;
      try {
        const response = await fetch(
          `/api/projects/${projectId}/dynamic/columns/${columnId}/accept/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(overrides || {}),
          }
        );
        if (response.ok) {
          mutate();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [projectId, mutate]
  );

  const rejectColumn = useCallback(
    async (columnId: number) => {
      if (!projectId) return false;
      try {
        const response = await fetch(
          `/api/projects/${projectId}/dynamic/columns/${columnId}/reject/`,
          { method: 'POST' }
        );
        if (response.ok || response.status === 204) {
          mutate();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [projectId, mutate]
  );

  const acceptMultiple = useCallback(
    async (columnIds: number[]) => {
      if (!projectId) return false;
      try {
        const results = await Promise.all(
          columnIds.map((id) =>
            fetch(`/api/projects/${projectId}/dynamic/columns/${id}/accept/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            })
          )
        );
        mutate();
        return results.every((r) => r.ok);
      } catch {
        return false;
      }
    },
    [projectId, mutate]
  );

  const rejectAll = useCallback(async () => {
    if (!projectId || !data) return false;
    try {
      await Promise.all(
        data.map((col) =>
          fetch(`/api/projects/${projectId}/dynamic/columns/${col.id}/reject/`, {
            method: 'POST',
          })
        )
      );
      mutate();
      return true;
    } catch {
      return false;
    }
  }, [projectId, data, mutate]);

  return {
    proposedColumns: data ?? [],
    isLoading,
    error,
    acceptColumn,
    rejectColumn,
    acceptMultiple,
    rejectAll,
    refresh: mutate,
  };
}

/**
 * Hook to update dynamic column values.
 */
export function useDynamicColumnValues(projectId: number | undefined) {
  const updateValues = useCallback(
    async (updates: Record<string, Record<string, unknown>>) => {
      if (!projectId) return false;
      try {
        const response = await fetch(
          `/api/projects/${projectId}/dynamic/values/bulk_update/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          }
        );
        return response.ok;
      } catch {
        return false;
      }
    },
    [projectId]
  );

  return { updateValues };
}

/**
 * Format a dynamic column value based on its data type.
 */
export function formatDynamicValue(
  value: unknown,
  dataType: DynamicColumnDataType,
  formatPattern?: string
): string {
  if (value === null || value === undefined) return '';

  switch (dataType) {
    case 'boolean':
      return value ? 'Yes' : 'No';

    case 'currency':
      if (typeof value === 'number') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: formatPattern === '$#,##0' ? 0 : 2,
        }).format(value);
      }
      return String(value);

    case 'percent':
      if (typeof value === 'number') {
        return `${value.toFixed(1)}%`;
      }
      return String(value);

    case 'number':
      if (typeof value === 'number') {
        return new Intl.NumberFormat('en-US').format(value);
      }
      return String(value);

    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      if (typeof value === 'string') {
        return new Date(value).toLocaleDateString();
      }
      return String(value);

    default:
      return String(value);
  }
}
