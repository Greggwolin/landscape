import type { BlockDocument } from '@/types/artifact';
import {
  BUDGET_EDITABLE_CELLS,
  budgetCellTarget,
  budgetColumnOptions,
  budgetEditability,
} from '../budgetCellTarget';

/**
 * The client half of the fail-closed rule.
 *
 * The server decides what may be written — a cell with no `cell_source_ref` in
 * the STORED schema cannot be written whatever the client claims. These tests
 * pin the client side of that: ScheduleArtifact asks this module whether a cell
 * is writable, and the answer comes from the refs the server put on the block
 * schema, never from a list in the component. A cell that resolves to null
 * renders read-only, so the two cannot drift into disagreeing about what is
 * editable.
 */

const ref = (column: string, capturedValue: unknown) => ({
  table: 'core_fin_fact_budget',
  row_id: 257,
  column,
  captured_at: '2026-08-20T00:00:00Z',
  captured_value: capturedValue,
});

/**
 * Shaped like build_budget_artifact_schema: KPI grid at block 0, line-item
 * table at block 1. Every ref names a DECLARED column, because
 * schema_validation rejects one that does not — that is why slice 2 added
 * start / duration / notes to the block table.
 */
const schema = (): BlockDocument => ({
  blocks: [
    { id: 'budget_kpis', type: 'key_value_grid', columns: 4, pairs: [] },
    {
      id: 'budget_line_items',
      type: 'table',
      columns: [
        { key: 'category', label: 'Category' },
        {
          key: 'uom',
          label: 'UOM',
          options: [
            { value: 'LS', label: 'Lump Sum' },
            { value: 'AC', label: 'Acre' },
          ],
        },
        { key: 'qty', label: 'Qty' },
        { key: 'rate', label: 'Rate' },
        { key: 'amount', label: 'Amount' },
        { key: 'start', label: 'Start' },
        { key: 'duration', label: 'Dur' },
        { key: 'notes', label: 'Notes' },
      ],
      rows: [
        {
          id: 'b1',
          editable: true,
          cell_source_refs: {
            qty: ref('qty', 788),
            rate: ref('rate', 250),
            uom: ref('uom_code', 'LS'),
            start: ref('start_period', 4),
            duration: ref('periods_to_complete', 3),
            notes: ref('internal_memo', 'Bid pending'),
          },
          cells: { category: 'Grading', qty: 788, rate: 250, amount: 197000 },
        },
        {
          id: 'b2',
          cells: { category: 'Legal', qty: null, rate: null, amount: 5000 },
        },
      ],
    },
  ],
}) as unknown as BlockDocument;

describe('budgetCellTarget', () => {
  it('maps a view-spec row id onto the block-schema position', () => {
    const target = budgetCellTarget(schema(), 'b1', 'rate');
    expect(target?.cellPath).toEqual(['blocks', '1', 'rows', '0', 'cells', 'rate']);
  });

  it('returns the ref the server stored, for the row-moved guard', () => {
    const target = budgetCellTarget(schema(), 'b1', 'rate');
    expect(target?.expectedRef.table).toBe('core_fin_fact_budget');
    expect(target?.expectedRef.row_id).toBe(257);
    expect(target?.expectedRef.column).toBe('rate');
  });

  it('resolves the three columns slice 2 added', () => {
    for (const key of ['start', 'duration', 'notes']) {
      expect(budgetCellTarget(schema(), 'b1', key)).not.toBeNull();
    }
  });

  it('sends the artifact cell key, and the server owns the column name', () => {
    // The path ends in `notes` (the artifact's key) while the ref names
    // internal_memo (the real column). The client never names a column.
    const target = budgetCellTarget(schema(), 'b1', 'notes');
    expect(target?.cellPath[target.cellPath.length - 1]).toBe('notes');
    expect(target?.expectedRef.column).toBe('internal_memo');
  });

  it('refuses amount — the trigger owns it and it carries no ref', () => {
    expect(budgetCellTarget(schema(), 'b1', 'amount')).toBeNull();
  });

  it('refuses a cell whose column has no ref', () => {
    expect(budgetCellTarget(schema(), 'b1', 'category')).toBeNull();
    expect(budgetCellTarget(schema(), 'b1', 'description')).toBeNull();
  });

  it('refuses every cell on a row with no refs at all', () => {
    expect(budgetCellTarget(schema(), 'b2', 'rate')).toBeNull();
  });

  it('refuses an unknown row id rather than guessing a position', () => {
    expect(budgetCellTarget(schema(), 'b99', 'rate')).toBeNull();
  });

  it('refuses when there is no schema — an older artifact stays read-only', () => {
    expect(budgetCellTarget(null, 'b1', 'rate')).toBeNull();
    expect(budgetCellTarget(undefined, 'b1', 'rate')).toBeNull();
    expect(budgetCellTarget({} as BlockDocument, 'b1', 'rate')).toBeNull();
  });
});

describe('budgetColumnOptions', () => {
  it('reads the UOM picklist off the block schema', () => {
    expect(budgetColumnOptions(schema(), 'uom')).toEqual([
      { value: 'LS', label: 'Lump Sum' },
      { value: 'AC', label: 'Acre' },
    ]);
  });

  it('returns null for a column with no picklist', () => {
    expect(budgetColumnOptions(schema(), 'rate')).toBeNull();
  });

  it('returns null with no schema', () => {
    expect(budgetColumnOptions(null, 'uom')).toBeNull();
  });
});

/* ─── UB4 finding 1 — stored artifact vs. what the surface offers ────────── */

/**
 * The bug this pins down was NOT in budgetCellTarget — that module was correct
 * throughout. It was in the gap between the two payloads on one artifact
 * record: `params_json.budget_view_config` said Start / Duration / Notes were
 * editable while `current_state_json` (written by an older builder) carried refs
 * for qty / rate / uom only. Rendered cell by cell, that produced a table where
 * Rate and UOM were editable and Start and Duration silently were not.
 *
 * So these tests feed BOTH payloads, the way the renderer receives them, and
 * assert the verdict the renderer acts on.
 */

/** The view specification's rows — only their ids matter to the verdict. */
const viewRows = () => [{ id: 'b1' }, { id: 'b2' }];

/** A block schema written by an older builder: refs for qty/rate/uom only, and
 *  no start/duration/notes columns at all. Exactly what was on disk in QA. */
const staleSchema = (): BlockDocument => {
  const s = schema() as unknown as {
    blocks: Array<{ type?: string; columns?: Array<{ key: string }>; rows?: Array<{
      cells: Record<string, unknown>;
      cell_source_refs?: Record<string, unknown>;
    }> }>;
  };
  const table = s.blocks.find((b) => b.type === 'table')!;
  table.columns = table.columns!.filter(
    (c) => !['start', 'duration', 'notes'].includes(c.key),
  );
  for (const row of table.rows!) {
    if (!row.cell_source_refs) continue;
    row.cell_source_refs = Object.fromEntries(
      Object.entries(row.cell_source_refs).filter(([k]) =>
        ['qty', 'rate', 'uom'].includes(k)),
    );
  }
  return s as unknown as BlockDocument;
};

describe('budgetEditability', () => {
  it('accepts a schema that backs every offered cell', () => {
    // b2 in the fixture carries no refs at all, so use a rows list that only
    // claims what b1 offers -- the point here is the complete-schema case.
    const v = budgetEditability(schema(), [{ id: 'b1' }]);
    expect(v).toEqual({ usable: true, missing: [] });
  });

  it('REJECTS a pre-slice-2 schema, naming what is missing', () => {
    // The regression. Before the fix this rendered half-editable with nothing
    // on screen to say why.
    const v = budgetEditability(staleSchema(), [{ id: 'b1' }]);
    expect(v.usable).toBe(false);
    expect(v.missing).toEqual(['duration', 'notes', 'start']);
  });

  it('is all-or-nothing: one unbacked cell disqualifies the surface', () => {
    // Rate and UOM ARE backed on the stale schema. They must still not render
    // editable, because a table that is editable in patches reads as broken.
    const stale = staleSchema();
    expect(budgetCellTarget(stale, 'b1', 'rate')).not.toBeNull();
    expect(budgetCellTarget(stale, 'b1', 'uom')).not.toBeNull();
    expect(budgetEditability(stale, [{ id: 'b1' }]).usable).toBe(false);
  });

  it('rejects when a row the view offers is absent from the stored schema', () => {
    const v = budgetEditability(schema(), [{ id: 'b99' }]);
    expect(v.usable).toBe(false);
    expect(v.missing).toEqual([...BUDGET_EDITABLE_CELLS].sort());
  });

  it('does NOT trust the stored view spec, which can be stale too', () => {
    // The artifact seen in QA had BOTH payloads old: the view spec claimed only
    // rate + UOM were editable and the block schema backed exactly those. Judged
    // against the stored claim it looks fine; judged against what this build
    // offers it is stale, which is the answer that matters.
    expect(budgetEditability(staleSchema(), [{ id: 'b1' }]).usable).toBe(false);
  });

  it('rejects an artifact with no stored schema at all', () => {
    expect(budgetEditability(null, viewRows()).usable).toBe(false);
    expect(budgetEditability(undefined, viewRows()).usable).toBe(false);
  });

  it('rejects when there are no rows to check', () => {
    expect(budgetEditability(schema(), []).usable).toBe(false);
    expect(budgetEditability(schema(), null).usable).toBe(false);
  });

  it('a row with no refs at all is missing everything, not nothing', () => {
    // b2 carries no cell_source_refs. Silently passing it would let an artifact
    // with one good row and one dead row render as fully editable.
    const v = budgetEditability(schema(), [{ id: 'b2' }]);
    expect(v.usable).toBe(false);
    expect(v.missing).toEqual([...BUDGET_EDITABLE_CELLS].sort());
  });
});
