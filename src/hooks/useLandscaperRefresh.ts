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
    console.log(`[useLandscaperRefresh] Subscribing for project ${projectId}, watching tables:`, tables);

    const unsubscribe = onMutationComplete((detail: LandscaperMutationDetail) => {
      console.log(`[useLandscaperRefresh] Received event:`, detail);

      // Only refresh if this mutation is for our project
      if (detail.projectId !== projectId) {
        console.log(`[useLandscaperRefresh] Skipping - wrong project (got ${detail.projectId}, want ${projectId})`);
        return;
      }

      // Only refresh if this mutation affects tables we care about
      if (!affectsAnyTable(detail, tables)) {
        console.log(`[useLandscaperRefresh] Skipping - tables don't match (got ${detail.tables}, want ${tables})`);
        return;
      }

      console.log(
        `[useLandscaperRefresh] Refreshing for project ${projectId}, affected tables:`,
        detail.tables
      );

      onRefresh();
    });

    return () => {
      console.log(`[useLandscaperRefresh] Unsubscribing for project ${projectId}`);
      unsubscribe();
    };
  }, [projectId, tables, onRefresh]);
}
