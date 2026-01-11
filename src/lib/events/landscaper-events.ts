/**
 * Landscaper mutation events for cross-component communication.
 *
 * When Landscaper completes a mutation, it emits an event that other
 * components can listen to and refresh their data accordingly.
 */

export const LANDSCAPER_MUTATION_EVENT = 'landscaper:mutation-complete';

export interface LandscaperMutationDetail {
  projectId: number;
  mutationType: string;
  tables: string[];
  counts?: {
    created?: number;
    updated?: number;
    total?: number;
  };
}

/**
 * Emit a mutation complete event.
 * Call this after Landscaper successfully executes a mutation.
 */
export function emitMutationComplete(detail: LandscaperMutationDetail): void {
  if (typeof window === 'undefined') return;

  console.log('[Landscaper Events] Emitting mutation complete:', detail);

  window.dispatchEvent(
    new CustomEvent<LandscaperMutationDetail>(LANDSCAPER_MUTATION_EVENT, { detail })
  );
}

/**
 * Subscribe to mutation complete events.
 * Returns an unsubscribe function.
 */
export function onMutationComplete(
  callback: (detail: LandscaperMutationDetail) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<LandscaperMutationDetail>;
    callback(customEvent.detail);
  };

  window.addEventListener(LANDSCAPER_MUTATION_EVENT, handler);

  return () => {
    window.removeEventListener(LANDSCAPER_MUTATION_EVENT, handler);
  };
}

/**
 * Check if a mutation affects a specific table.
 */
export function affectsTable(detail: LandscaperMutationDetail, table: string): boolean {
  return detail.tables.includes(table);
}

/**
 * Check if a mutation affects any of the specified tables.
 */
export function affectsAnyTable(detail: LandscaperMutationDetail, tables: string[]): boolean {
  return tables.some(table => detail.tables.includes(table));
}
