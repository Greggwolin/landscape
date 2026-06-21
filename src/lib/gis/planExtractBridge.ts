/**
 * planExtractBridge — late-delivery latch for plan extraction triggered from the
 * chat-first `/w/` shell (D15/D16 chat mount).
 *
 * The chat panel (CenterChatPanel) lives in the outer `/w/` layout; the map +
 * extract canvas (MapTab) only mount on the `/w/projects/[id]/map` route. When
 * Landscaper's extract_plan_image tool fires from chat, the live
 * `landscaper:place_plan_overlay` / `landscaper:extract_plan_canvas` CustomEvent
 * may be dispatched *before* MapTab mounts (the panel is still navigating to the
 * map). This module latches the payload so MapTab can drain it on mount — no
 * payload is lost, and MapTab's existing handlers do all the work (no duplication).
 *
 * The live event handles the already-mounted case; the latch handles the
 * navigate-then-mount case. Whoever consumes first wins (take() nulls the latch),
 * so the action never runs twice.
 */

export interface PlanCanvasPayload {
  /** URL of the rendered plan page to trace (MapTab fetches → CORS-clean data URL). */
  url: string;
  sourceDocId?: number | null;
  sourcePage?: number | null;
}

export interface PlanOverlayPayload {
  source_uri: string;
  source_doc_id?: number | null;
  source_page?: number | null;
  source_crop_bbox?: { x0: number; y0: number; x1: number; y1: number } | null;
}

export type PendingPlanExtract =
  | { kind: 'canvas'; payload: PlanCanvasPayload }
  | { kind: 'overlay'; payload: PlanOverlayPayload };

let pending: PendingPlanExtract | null = null;

export function setPendingPlanExtract(next: PendingPlanExtract | null): void {
  pending = next;
}

/** Read and clear the pending payload (so it is acted on exactly once). */
export function takePendingPlanExtract(): PendingPlanExtract | null {
  const p = pending;
  pending = null;
  return p;
}
