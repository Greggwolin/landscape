/**
 * The hierarchy column shows the deepest segment only.
 *
 * A member number carries its own ancestry (level 1 `1`, level 2 `1.2`, level 3
 * `1.101`), so `Village 1 · Phase 1.2` states the village twice. These cover the
 * selection rule directly — no component mount, no database, so they run in CI.
 */

import {
  deepestHierLevel,
  hierCellText,
  hierHeaderLabels,
} from '../hierPath';

/* Project 9's shape: level 1 labelled Village, level 2 Phase, level 3 Parcel. */
const LEVELS = [
  { level: 1, label: 'Village' },
  { level: 2, label: 'Phase' },
  { level: 3, label: 'Parcel' },
];

const MEMBER_LABEL: Record<string, string> = {
  '1:41': 'Village 1',
  '1:42': 'Village 2',
  '2:12': 'Phase 1.2',
  '2:13': 'Phase 1.3',
  '3:77': 'Parcel 1.101',
};

const OPEN = [1, 2, 3];

const scopeOf = (s: Record<number, number>) => s as unknown as Record<string, number>;
const rowsOf = (...s: Record<number, number>[]) =>
  s.map((scope) => ({ scope: scopeOf(scope) }));

describe('hierCellText — the ancestor segment is dropped', () => {
  it('drops the village when the row reaches a phase', () => {
    expect(hierCellText(OPEN, scopeOf({ 1: 41, 2: 12 }), MEMBER_LABEL)).toBe('Phase 1.2');
  });

  it('drops both ancestors when the row reaches a parcel', () => {
    expect(hierCellText(OPEN, scopeOf({ 1: 41, 2: 12, 3: 77 }), MEMBER_LABEL))
      .toBe('Parcel 1.101');
  });

  it('keeps the only segment a row has', () => {
    expect(hierCellText(OPEN, scopeOf({ 1: 42 }), MEMBER_LABEL)).toBe('Village 2');
  });

  it('renders empty when the row reaches no open level', () => {
    expect(hierCellText(OPEN, scopeOf({}), MEMBER_LABEL)).toBe('');
    expect(hierCellText(OPEN, undefined, MEMBER_LABEL)).toBe('');
  });

  it('ignores levels the filter has closed', () => {
    // Village pinned by the filter → only phase is open, and phase is what shows.
    expect(hierCellText([2], scopeOf({ 1: 41, 2: 13 }), MEMBER_LABEL)).toBe('Phase 1.3');
  });

  it('falls back to the deepest resolvable level rather than blanking the cell', () => {
    // A level-3 member with no label entry must not wipe out the phase.
    expect(hierCellText(OPEN, scopeOf({ 1: 41, 2: 12, 3: 999 }), MEMBER_LABEL))
      .toBe('Phase 1.2');
  });
});

describe('deepestHierLevel', () => {
  it('returns the deepest reached level', () => {
    expect(deepestHierLevel(OPEN, scopeOf({ 1: 41, 2: 12 }), MEMBER_LABEL)).toBe(2);
  });

  it('returns null when nothing resolves', () => {
    expect(deepestHierLevel(OPEN, scopeOf({ 2: 999 }), MEMBER_LABEL)).toBeNull();
  });

  it('does not depend on the order openLevels arrives in', () => {
    expect(deepestHierLevel([3, 1, 2], scopeOf({ 1: 41, 2: 12, 3: 77 }), MEMBER_LABEL))
      .toBe(3);
  });
});

describe('hierHeaderLabels — names only the levels the cells end on', () => {
  it('reads Phase when every row bottoms out at phase', () => {
    const rows = rowsOf({ 1: 41, 2: 12 }, { 1: 41, 2: 13 });
    expect(hierHeaderLabels(rows, OPEN, MEMBER_LABEL, LEVELS)).toBe('Phase');
  });

  it('joins the distinct surviving labels when rows bottom out at different depths', () => {
    const rows = rowsOf({ 1: 42 }, { 1: 41, 2: 12 });
    expect(hierHeaderLabels(rows, OPEN, MEMBER_LABEL, LEVELS)).toBe('Village · Phase');
  });

  it('orders the joined labels by level, not by row order', () => {
    const rows = rowsOf({ 1: 41, 2: 12 }, { 1: 42 });
    expect(hierHeaderLabels(rows, OPEN, MEMBER_LABEL, LEVELS)).toBe('Village · Phase');
  });

  it('never leaves an ancestor label on the front of the header', () => {
    const header = hierHeaderLabels(rowsOf({ 1: 41, 2: 12, 3: 77 }), OPEN, MEMBER_LABEL, LEVELS);
    expect(header).toBe('Parcel');
    expect(header).not.toContain('Village');
  });

  it('is empty when no row reaches an open level', () => {
    expect(hierHeaderLabels(rowsOf({}), OPEN, MEMBER_LABEL, LEVELS)).toBe('');
  });
});

describe('a project with different level labels', () => {
  /* Same numbering, different words: the labels are per-project configuration
   * and the numbers never change. */
  const AREA_LEVELS = [
    { level: 1, label: 'Area' },
    { level: 2, label: 'Parcel' },
  ];
  const AREA_MEMBERS: Record<string, string> = {
    '1:5': 'Area 1',
    '2:9': 'Parcel 1.2',
  };

  it("composes the cell from that project's labels", () => {
    expect(hierCellText([1, 2], scopeOf({ 1: 5, 2: 9 }), AREA_MEMBERS)).toBe('Parcel 1.2');
  });

  it("composes the header from that project's labels", () => {
    expect(hierHeaderLabels(rowsOf({ 1: 5, 2: 9 }), [1, 2], AREA_MEMBERS, AREA_LEVELS))
      .toBe('Parcel');
  });

  it('keeps a top-level-only row under those labels too', () => {
    expect(hierCellText([1, 2], scopeOf({ 1: 5 }), AREA_MEMBERS)).toBe('Area 1');
  });
});
