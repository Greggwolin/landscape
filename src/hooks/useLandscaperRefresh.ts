import { useEffect } from 'react';
import {
  onMutationComplete,
  LandscaperMutationDetail,
  affectsAnyTable,
} from '@/lib/events/landscaper-events';

/**
 * Hook to refresh data when Landscaper completes mutations.
 *
 * @param projectId - The project ID to filter events for
 * @param tables - Array of table names to watch for changes
 * @param onRefresh - Callback to trigger data refresh (e.g., SWR mutate)
 *
 * @example
 * ```tsx
 * const { mutate } = useSWR(...)
 *
 * useLandscaperRefresh(projectId, ['units', 'leases', 'unit_types'], () => {
 *   mutate(); // Refetch data
 * });
 * ```
 */
export function useLandscaperRefresh(
  projectId: number,
  tables: string[],
  onRefresh: () => void
): void {
  useEffect(() => {
    const unsubscribe = onMutationComplete((detail: LandscaperMutationDetail) => {
      // Only refresh if this mutation is for our project
      if (detail.projectId !== projectId) {
        return;
      }

      // Only refresh if this mutation affects tables we care about
      if (!affectsAnyTable(detail, tables)) {
        return;
      }

      console.log(
        `[useLandscaperRefresh] Refreshing for project ${projectId}, affected tables:`,
        detail.tables
      );

      onRefresh();
    });

    return unsubscribe;
  }, [projectId, tables, onRefresh]);
}
