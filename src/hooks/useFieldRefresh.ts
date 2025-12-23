/**
 * useFieldRefresh Hook
 *
 * Provides cross-library refresh coordination for field updates.
 * Works with both SWR and React Query by using browser CustomEvents.
 *
 * When Landscaper updates a field, it emits a 'landscaper-field-update' event.
 * Components using SWR can subscribe and call mutate() to refresh their data.
 */

import { useEffect, useCallback } from 'react';

// Event name constant
export const FIELD_UPDATE_EVENT = 'landscaper-field-update';

// Event detail type
export interface FieldUpdateEventDetail {
  projectId: string | number;
  updates: Array<{
    table: string;
    field: string;
    old_value: string | null;
    new_value: string | null;
  }>;
}

/**
 * Emit a field update event.
 * Call this after Landscaper successfully updates fields.
 */
export function emitFieldUpdate(detail: FieldUpdateEventDetail): void {
  if (typeof window === 'undefined') return;

  const event = new CustomEvent(FIELD_UPDATE_EVENT, { detail });
  window.dispatchEvent(event);
}

/**
 * Hook to listen for field update events.
 * Use this in components that need to refresh when Landscaper updates fields.
 *
 * @param projectId - Only respond to updates for this project
 * @param onUpdate - Callback when updates occur (typically call mutate() or refetch())
 */
export function useFieldRefreshListener(
  projectId: string | number | undefined,
  onUpdate: (detail: FieldUpdateEventDetail) => void
): void {
  useEffect(() => {
    if (typeof window === 'undefined' || !projectId) return;

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<FieldUpdateEventDetail>;
      const detail = customEvent.detail;

      // Only respond to updates for our project
      if (detail.projectId?.toString() === projectId?.toString()) {
        onUpdate(detail);
      }
    };

    window.addEventListener(FIELD_UPDATE_EVENT, handler);
    return () => window.removeEventListener(FIELD_UPDATE_EVENT, handler);
  }, [projectId, onUpdate]);
}

/**
 * Convenience hook that returns a stable emit function for a specific project.
 */
export function useFieldUpdateEmitter(projectId: string | number | undefined) {
  return useCallback(
    (updates: FieldUpdateEventDetail['updates']) => {
      if (!projectId) return;
      emitFieldUpdate({ projectId, updates });
    },
    [projectId]
  );
}
