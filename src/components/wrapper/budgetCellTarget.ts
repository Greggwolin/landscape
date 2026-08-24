import type { BlockDocument, SourceRef, TableBlock } from '@/types/artifact';

/**
 * Map a view-specification row + cell key onto its target in the BLOCK SCHEMA.
 *
 * WHY THIS INDIRECTION EXISTS
 * ---------------------------
 * The budget artifact carries two payloads on one record: the block schema (in
 * `current_state_json`) and the slice-1 view specification (in
 * `params_json.budget_view_config`). The editing spine resolves a cell's
 * source_ref out of the STORED SCHEMA — `_resolve_cell_source_ref` walks
 * `current_state_json` — because that is what makes permission server-side and
 * fail-closed: the client sends a position, never a table/row/column, so a cell
 * with no ref in the stored schema cannot be written whatever the client claims.
 *
 * ScheduleArtifact renders the view specification, not the block schema. Rather
 * than teach the resolver a second place to look — which would fork the one
 * write path this spine deliberately has — the view spec reuses the block
 * schema's row ids (`b1`, `b2`, …) precisely so a rendered cell can be mapped
 * back to its source row. `schedule_view_spec.build_budget_view_config` says so
 * in a comment. This module is that mapping, and it is the seam slice 1 left
 * open.
 *
 * The block schema declares a COLUMN for every cell that carries a ref —
 * `schema_validation._validate_table` rejects a `cell_source_refs` key that
 * names no declared column, which is why budget slice 2 added start / duration
 * / notes to the block table rather than hanging refs off a table that does not
 * know about them. So the two budget surfaces stay in step: the same fields are
 * editable on the block renderer and on the view specification, from one set of
 * refs.
 */

export interface BudgetCellTarget {
  /** Path into the block schema, shaped [..., 'rows', i, 'cells', key]. */
  cellPath: string[];
  /** CC13 — the ref the client was rendering, echoed back for the row-moved guard. */
  expectedRef: SourceRef;
}

const isTableBlock = (block: unknown): block is TableBlock =>
  Boolean(block)
  && typeof block === 'object'
  && (block as { type?: unknown }).type === 'table'
  && Array.isArray((block as { rows?: unknown }).rows);

/**
 * Resolve one editable cell to its block-schema path + expected ref.
 *
 * Returns `null` when the cell is not writable — no block schema, no row with
 * that id, or no `cell_source_refs` entry for that key. Returning null rather
 * than a guessed path is the point: the caller renders such a cell as read-only,
 * which keeps the client's idea of what is editable derived from the server's
 * refs instead of from a hard-coded list that can drift away from them.
 */
export function budgetCellTarget(
  schema: BlockDocument | null | undefined,
  rowId: string,
  cellKey: string,
): BudgetCellTarget | null {
  const blocks = (schema as { blocks?: unknown[] } | null | undefined)?.blocks;
  if (!Array.isArray(blocks)) return null;

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex];
    if (!isTableBlock(block)) continue;
    const rowIndex = block.rows.findIndex((r) => r?.id === rowId);
    if (rowIndex < 0) continue;
    const ref = block.rows[rowIndex]?.cell_source_refs?.[cellKey];
    if (!ref) return null;
    return {
      cellPath: [
        'blocks',
        String(blockIndex),
        'rows',
        String(rowIndex),
        'cells',
        cellKey,
      ],
      expectedRef: ref,
    };
  }
  return null;
}

/**
 * The picklist choices a block-schema column carries, if any.
 *
 * The UOM column is FK-constrained to `core_fin_uom`, so the builder rides the
 * allowed codes on the block schema's column (CB10) and the renderer offers a
 * dropdown rather than letting someone type into a foreign key. The view
 * specification describes UOM as `kind: 'picklist'` but does not carry the
 * codes, so they are read from the same block schema the refs come from —
 * one source, not a second copy that can fall out of step with the database.
 */
export function budgetColumnOptions(
  schema: BlockDocument | null | undefined,
  cellKey: string,
): Array<{ value: string; label: string }> | null {
  const blocks = (schema as { blocks?: unknown[] } | null | undefined)?.blocks;
  if (!Array.isArray(blocks)) return null;
  for (const block of blocks) {
    if (!isTableBlock(block)) continue;
    const column = block.columns?.find((c) => c?.key === cellKey);
    if (column?.options?.length) return column.options;
  }
  return null;
}

/* ─── Staleness (UB4 finding 1) ──────────────────────────────────────────── */

/**
 * Whether the STORED block schema can back every cell the view specification
 * says this surface offers for editing.
 *
 * WHY THIS CHECK HAS TO EXIST
 * ---------------------------
 * The two payloads are written together, but only one of them is REWRITTEN.
 * `_refresh_artifact_after_write` rebuilds the artifact after every commit, so
 * a budget saved before a builder change keeps its old block schema until
 * somebody happens to edit it. Slice 2 added refs for start / duration / notes;
 * an artifact stored before that has refs for qty / rate / uom only.
 *
 * Rendered naively, that artifact shows Rate and UOM with the dashed
 * editable underline and Start and Duration without it — and nothing on screen
 * says why. The user cannot tell a field that is read-only by design from one
 * that is broken, which is the worse outcome: half a table looking complete.
 * (Observed exactly this way in QA: Rate and UOM editable, Start and Dur not,
 * until an unrelated commit rebuilt the artifact and they silently came alive.)
 *
 * So: all of it, or none of it, with a reason.
 */
export interface BudgetEditability {
  /** The stored schema backs every offered cell — safe to render editable. */
  usable: boolean;
  /** Offered cells with no ref behind them, e.g. ['duration','notes','start']. */
  missing: string[];
}

/**
 * What THIS BUILD offers for editing on a budget schedule.
 *
 * Deliberately a constant here rather than a read of the stored view
 * specification's per-row `editable` list. That list is itself part of the
 * artifact, written when the artifact was built — so on the very artifacts this
 * check exists to catch, it is as out of date as the refs are. Trusting it
 * makes a stale artifact look self-consistent: the old view spec offers only
 * rate and UOM, the old block schema backs exactly those, and the mismatch that
 * matters (against what the product now offers) goes unnoticed. That is the
 * shape of the bug found in QA.
 *
 * Mirrors backend `budget_artifact_builder._EDITABLE_BUDGET_COLUMNS` and the
 * per-row `editable` list emitted by `schedule_view_spec`. The two are asserted
 * against each other in backend `test_budget_cell_mapping.py`; change them
 * together.
 */
export const BUDGET_EDITABLE_CELLS = [
  'uom', 'rate', 'start', 'duration', 'notes', 'qty',
  // Slice 2b-2: the rest of the line, now that the renderer can draw them.
  'division', 'stage', 'category', 'description', 'vendor',
  'timing_method', 'start_date', 'end_date',
  'curve_profile', 'curve_steepness',
  // `escalation` and `escalation_method` are DELIBERATELY absent. The server
  // backs them with refs, so including them would pass the staleness check —
  // but the per-line escalation control is being replaced by a single
  // budget-level rate, and offering a gesture that is about to be withdrawn
  // teaches the wrong thing. This list is what THIS BUILD offers, and it does
  // not offer those.
] as const;

export function budgetEditability(
  schema: BlockDocument | null | undefined,
  rows: Array<{ id: string }> | null | undefined,
): BudgetEditability {
  if (!schema || !Array.isArray(rows) || rows.length === 0) {
    return { usable: false, missing: [] };
  }
  const missing = new Set<string>();
  for (const row of rows) {
    for (const cellKey of BUDGET_EDITABLE_CELLS) {
      if (!budgetCellTarget(schema, row.id, cellKey)) missing.add(cellKey);
    }
  }
  return { usable: missing.size === 0, missing: [...missing].sort() };
}
