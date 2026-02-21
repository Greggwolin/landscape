/**
 * usePendingRentRollChanges
 *
 * Hook to fetch and manage pending rent roll delta changes.
 * Used by RentRollGrid to highlight changed cells and offer accept/reject actions.
 *
 * Fetches from GET /api/knowledge/projects/{id}/rent-roll/pending-changes/
 * Commits via POST /api/knowledge/projects/{id}/rent-roll/apply-delta/
 */

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { emitMutationComplete } from '@/lib/events/landscaper-events';

export interface PendingChange {
  unitId: number;
  unitNumber: string;
  field: string;
  fieldLabel: string;
  currentValue: unknown;
  newValue: unknown;
  extractionId: number;
}

interface DeltaChange {
  field: string;
  field_label: string;
  current_value: unknown;
  new_value: unknown;
}

interface DeltaEntry {
  unit_number: string;
  unit_id: number;
  extraction_id: number;
  changes: DeltaChange[];
}

interface PendingChangesResponse {
  has_pending: boolean;
  document_id: number | null;
  document_name: string | null;
  summary?: {
    units_with_changes: number;
    total_field_changes: number;
    change_breakdown: Record<string, number>;
  };
  deltas?: DeltaEntry[];
}

const backendUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`) as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

// Backend delta field names → AG-Grid column field names
// The delta uses DB model field names; the grid uses different column identifiers
const FIELD_TO_GRID_COLUMN: Record<string, string> = {
  current_rent: 'base_rent_monthly',
  occupancy_status: 'lease_status',
  tenant_name: 'resident_name',
  lease_start: 'lease_start_date',
  lease_end: 'lease_end_date',
};

export type FieldState = 'pending' | 'accepted';

export function usePendingRentRollChanges(projectId: number | undefined) {
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
      onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
        // Don't retry on client errors (401, 403, 404)
        if (err?.status === 401 || err?.status === 403 || err?.status === 404) return;
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 5000);
      },
    }
  );

  // Local UI state: tracks which fields the user has toggled to "accepted" (green)
  // Keys are "unitId:backendField" — same format as pendingByCell
  const [acceptedFields, setAcceptedFields] = useState<Set<string>>(new Set());

  // Flatten deltas into a flat list of PendingChange items
  const changes: PendingChange[] = useMemo(() => {
    if (!data?.deltas) return [];

    const result: PendingChange[] = [];
    for (const delta of data.deltas) {
      for (const change of delta.changes) {
        result.push({
          unitId: delta.unit_id,
          unitNumber: delta.unit_number,
          field: change.field,
          fieldLabel: change.field_label,
          currentValue: change.current_value,
          newValue: change.new_value,
          extractionId: delta.extraction_id,
        });
      }
    }
    return result;
  }, [data?.deltas]);

  // Build a lookup map for fast cell checking: "unitId:field" -> PendingChange
  // Keys use BOTH backend field names and grid column field names for matching
  const pendingByCell = useMemo(() => {
    const map = new Map<string, PendingChange>();
    for (const change of changes) {
      // Key by backend field name (for direct matches)
      map.set(`${change.unitId}:${change.field}`, change);
      // Also key by grid column field name (for AG-Grid cellStyle lookups)
      const gridField = FIELD_TO_GRID_COLUMN[change.field];
      if (gridField) {
        map.set(`${change.unitId}:${gridField}`, change);
      }
    }
    return map;
  }, [changes]);

  // Get the UI state for a cell: 'pending' (yellow) or 'accepted' (green)
  const getFieldState = useCallback((unitId: number, field: string): FieldState => {
    const key = `${unitId}:${field}`;
    return acceptedFields.has(key) ? 'accepted' : 'pending';
  }, [acceptedFields]);

  // Toggle a single field between pending (yellow) and accepted (green)
  const toggleFieldAcceptance = useCallback((unitId: number, gridField: string) => {
    // Find the backend field name from the grid field
    const change = pendingByCell.get(`${unitId}:${gridField}`);
    if (!change) return;
    const backendKey = `${change.unitId}:${change.field}`;

    setAcceptedFields((prev) => {
      const next = new Set(prev);
      if (next.has(backendKey)) {
        next.delete(backendKey);
      } else {
        next.add(backendKey);
      }
      return next;
    });
  }, [pendingByCell]);

  // Select all changes for a unit (mark all as accepted)
  const selectAllForUnit = useCallback((unitId: number) => {
    setAcceptedFields((prev) => {
      const next = new Set(prev);
      for (const change of changes) {
        if (change.unitId === unitId) {
          next.add(`${unitId}:${change.field}`);
        }
      }
      return next;
    });
  }, [changes]);

  // Deselect all changes for a unit (revert all to pending)
  const deselectAllForUnit = useCallback((unitId: number) => {
    setAcceptedFields((prev) => {
      const next = new Set(prev);
      for (const change of changes) {
        if (change.unitId === unitId) {
          next.delete(`${unitId}:${change.field}`);
        }
      }
      return next;
    });
  }, [changes]);

  // Get the row selection state for checkbox rendering
  const getUnitSelectionState = useCallback((unitId: number): 'none' | 'some' | 'all' => {
    const unitChanges = changes.filter((c) => c.unitId === unitId);
    if (unitChanges.length === 0) return 'none';
    const acceptedCount = unitChanges.filter((c) => acceptedFields.has(`${c.unitId}:${c.field}`)).length;
    if (acceptedCount === 0) return 'none';
    if (acceptedCount === unitChanges.length) return 'all';
    return 'some';
  }, [changes, acceptedFields]);

  // Get set of unitIds that have at least one pending change
  const unitsWithChanges = useMemo(() => {
    const ids = new Set<number>();
    for (const change of changes) {
      ids.add(change.unitId);
    }
    return ids;
  }, [changes]);

  // Count of accepted fields (for banner display)
  const acceptedCount = acceptedFields.size;
  const pendingCount = changes.length - acceptedCount;

  // Get all extraction IDs for bulk operations
  const extractionIds = useMemo(() => {
    if (!data?.deltas) return [];
    return [...new Set(data.deltas.map((d) => d.extraction_id))];
  }, [data?.deltas]);

  // Accept a single change (immediate DB write)
  const acceptChange = useCallback(async (extractionId: number) => {
    if (!projectId) return;
    try {
      await fetch(`${backendUrl}/api/knowledge/projects/${projectId}/rent-roll/apply-delta/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraction_ids: [extractionId],
          decisions: { [String(extractionId)]: 'accept' },
        }),
      });
      emitMutationComplete({
        projectId,
        mutationType: 'apply_delta',
        tables: ['units', 'leases'],
      });
      mutate();
    } catch (err) {
      console.error('Failed to accept change:', err);
    }
  }, [projectId, mutate]);

  // Reject a single change (immediate DB write)
  const rejectChange = useCallback(async (extractionId: number) => {
    if (!projectId) return;
    try {
      await fetch(`${backendUrl}/api/knowledge/projects/${projectId}/rent-roll/apply-delta/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraction_ids: [extractionId],
          decisions: { [String(extractionId)]: 'reject' },
        }),
      });
      mutate();
    } catch (err) {
      console.error('Failed to reject change:', err);
    }
  }, [projectId, mutate]);

  // Accept all pending changes (writes to DB, clears state)
  const acceptAll = useCallback(async () => {
    if (!projectId || extractionIds.length === 0) return;
    try {
      const decisions: Record<string, string> = {};
      for (const eid of extractionIds) {
        decisions[String(eid)] = 'accept';
      }
      await fetch(`${backendUrl}/api/knowledge/projects/${projectId}/rent-roll/apply-delta/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraction_ids: extractionIds,
          decisions,
        }),
      });
      setAcceptedFields(new Set());
      emitMutationComplete({
        projectId,
        mutationType: 'apply_delta',
        tables: ['units', 'leases'],
      });
      mutate();
    } catch (err) {
      console.error('Failed to accept all changes:', err);
    }
  }, [projectId, extractionIds, mutate]);

  // Reject all pending changes (writes to DB, clears state)
  const rejectAll = useCallback(async () => {
    if (!projectId || extractionIds.length === 0) return;
    try {
      const decisions: Record<string, string> = {};
      for (const eid of extractionIds) {
        decisions[String(eid)] = 'reject';
      }
      await fetch(`${backendUrl}/api/knowledge/projects/${projectId}/rent-roll/apply-delta/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraction_ids: extractionIds,
          decisions,
        }),
      });
      setAcceptedFields(new Set());
      mutate();
    } catch (err) {
      console.error('Failed to reject all changes:', err);
    }
  }, [projectId, extractionIds, mutate]);

  return {
    hasPending: data?.has_pending ?? false,
    changes,
    pendingByCell,
    summary: data?.summary ?? null,
    documentName: data?.document_name ?? null,
    documentId: data?.document_id ?? null,
    extractionIds,
    isLoading,
    error,
    refresh: mutate,
    // Field-level toggle state
    acceptedFields,
    getFieldState,
    toggleFieldAcceptance,
    selectAllForUnit,
    deselectAllForUnit,
    getUnitSelectionState,
    unitsWithChanges,
    acceptedCount,
    pendingCount,
    // Actions
    acceptChange,
    rejectChange,
    acceptAll,
    rejectAll,
  };
}

export default usePendingRentRollChanges;
