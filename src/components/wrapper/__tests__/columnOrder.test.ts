/**
 * An optional column takes its canonical place, not the end of the row.
 *
 * Fixtures mirror schedule_view_spec.py exactly — the canonical `columns` order
 * and the four rungs — so a change to the server's declared order shows up here
 * as a failure rather than as a silently different screen.
 *
 * Pure ordering logic: no component mount, no database, so these run in CI.
 */

import { insertAtCanonicalPosition, withExtraColumns } from '../columnOrder';

/* schedule_view_spec.py `columns`, in order. */
const CANONICAL = [
  { key: 'category' },
  { key: 'stage' },
  { key: 'description' },
  { key: 'uom' },
  { key: 'rate' },
  { key: 'amount' },
  { key: 'start' },
  { key: 'duration' },
  { key: 'notes' },
];

/* schedule_view_spec.py `rung_columns`. */
const RUNGS: Record<string, string[]> = {
  summary: ['group', 'amount', 'pct'],
  standard: ['category', 'description', 'uom', 'rate', 'amount'],
  detail: ['description', 'uom', 'rate', 'amount', 'start', 'duration'],
  all: ['category', 'stage', 'description', 'uom', 'rate', 'amount',
    'start', 'duration', 'notes'],
};

describe('stage lands between category and description', () => {
  it('inserts before description on the standard rung', () => {
    expect(withExtraColumns(RUNGS.standard, ['stage'], CANONICAL)).toEqual([
      'category', 'stage', 'description', 'uom', 'rate', 'amount',
    ]);
  });

  it('inserts before description on the detail rung, which has no category', () => {
    expect(withExtraColumns(RUNGS.detail, ['stage'], CANONICAL)).toEqual([
      'stage', 'description', 'uom', 'rate', 'amount', 'start', 'duration',
    ]);
  });

  it('is a no-op on the all rung, which already carries stage natively', () => {
    expect(withExtraColumns(RUNGS.all, ['stage'], CANONICAL)).toEqual(RUNGS.all);
  });
});

describe('notes lands after duration, not before it', () => {
  it('appends on standard — nothing present outranks it', () => {
    expect(withExtraColumns(RUNGS.standard, ['notes'], CANONICAL)).toEqual([
      'category', 'description', 'uom', 'rate', 'amount', 'notes',
    ]);
  });

  it('appends after duration on detail', () => {
    const out = withExtraColumns(RUNGS.detail, ['notes'], CANONICAL);
    expect(out).toEqual([
      'description', 'uom', 'rate', 'amount', 'start', 'duration', 'notes',
    ]);
    expect(out.indexOf('notes')).toBeGreaterThan(out.indexOf('duration'));
  });
});

describe('both chips on at once', () => {
  it('lands each in canonical order regardless of selection order', () => {
    const expected = [
      'category', 'stage', 'description', 'uom', 'rate', 'amount', 'notes',
    ];
    expect(withExtraColumns(RUNGS.standard, ['stage', 'notes'], CANONICAL)).toEqual(expected);
    expect(withExtraColumns(RUNGS.standard, ['notes', 'stage'], CANONICAL)).toEqual(expected);
  });
});

describe('the summary rung is not rearranged', () => {
  /* group and pct appear nowhere in CANONICAL. A global sort would fling them to
   * one end; insertion must leave the rung's own order exactly as declared. */
  it('is untouched when no extras are selected', () => {
    expect(withExtraColumns(RUNGS.summary, [], CANONICAL)).toEqual(
      ['group', 'amount', 'pct'],
    );
  });

  it('keeps group before amount before pct even when an extra is placed', () => {
    const out = withExtraColumns(RUNGS.summary, ['stage'], CANONICAL);
    const declared = out.filter((k) => RUNGS.summary.includes(k));
    expect(declared).toEqual(['group', 'amount', 'pct']);
  });

  it('never moves a key that is absent from the canonical list', () => {
    const out = withExtraColumns(RUNGS.summary, ['notes'], CANONICAL);
    expect(out.indexOf('group')).toBeLessThan(out.indexOf('amount'));
    expect(out.indexOf('amount')).toBeLessThan(out.indexOf('pct'));
  });
});

describe('no extras selected changes nothing', () => {
  it.each(Object.keys(RUNGS))('leaves the %s rung identical', (rung) => {
    expect(withExtraColumns(RUNGS[rung], [], CANONICAL)).toEqual(RUNGS[rung]);
  });

  it("returns a copy, not the caller's array", () => {
    const out = withExtraColumns(RUNGS.standard, [], CANONICAL);
    expect(out).not.toBe(RUNGS.standard);
    out.push('mutated');
    expect(RUNGS.standard).not.toContain('mutated');
  });
});

describe('insertAtCanonicalPosition fallbacks', () => {
  it('appends an extra that is not in the canonical list at all', () => {
    expect(insertAtCanonicalPosition(RUNGS.standard, 'escalated', CANONICAL)).toEqual([
      'category', 'description', 'uom', 'rate', 'amount', 'escalated',
    ]);
  });

  it('appends when nothing already present outranks the extra', () => {
    expect(insertAtCanonicalPosition(['category', 'description'], 'notes', CANONICAL))
      .toEqual(['category', 'description', 'notes']);
  });

  it('does not duplicate a key the rung already carries', () => {
    expect(insertAtCanonicalPosition(RUNGS.all, 'stage', CANONICAL)).toEqual(RUNGS.all);
  });

  it('inserts at the front when the extra outranks everything present', () => {
    expect(insertAtCanonicalPosition(['description', 'amount'], 'category', CANONICAL))
      .toEqual(['category', 'description', 'amount']);
  });
});
