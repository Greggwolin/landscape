import type { BlockDocument } from '@/types/artifact';
import { budgetCellTarget, budgetColumnOptions } from '../budgetCellTarget';

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
