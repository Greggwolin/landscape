/**
 * Level 2 is always visible, ghosted until its parent is picked.
 *
 * Pure structure logic: no component mount, no database, so these run in CI.
 * The last block reproduces scopeLabel's reduction over these rows, because the
 * risk of building level 2 early is that it starts contributing to the title
 * before anything in it has been picked.
 */

import { buildLevelRows } from '../levelRows';

interface Member { id: number; label: string; parent_id: number | null }
interface Level { level: number; label: string; members: Member[] }

/* Two villages with two phases each, plus a third village with no phases, so
 * the union logic has something to leave out. */
const VILLAGES: Member[] = [
  { id: 1, label: '1', parent_id: null },
  { id: 2, label: '2', parent_id: null },
  { id: 3, label: '3', parent_id: null },
];

const PHASES: Member[] = [
  { id: 11, label: '1.1', parent_id: 1 },
  { id: 12, label: '1.2', parent_id: 1 },
  { id: 21, label: '2.1', parent_id: 2 },
  { id: 22, label: '2.2', parent_id: 2 },
];

const PARCELS: Member[] = [
  { id: 111, label: '1.101', parent_id: 11 },
  { id: 121, label: '1.201', parent_id: 12 },
];

const LEVELS: Level[] = [
  { level: 1, label: 'Village', members: VILLAGES },
  { level: 2, label: 'Phase', members: PHASES },
  { level: 3, label: 'Parcel', members: PARCELS },
];

const build = (scope: Record<number, number[]>) =>
  buildLevelRows<Member, Level>(LEVELS, scope);

const ids = (set: Set<number>) => [...set].sort((a, b) => a - b);

describe('level 2 is built before anything is picked', () => {
  it('is present with nothing selected at level 1', () => {
    expect(build({}).map((r) => r.level.level)).toEqual([1, 2]);
  });

  it('renders every level-2 member, entirely ghosted', () => {
    const [, phases] = build({});
    expect(phases.members.map((m) => m.id)).toEqual([11, 12, 21, 22]);
    expect(phases.enabledIds.size).toBe(0);
  });

  it('leaves level 1 fully selectable', () => {
    const [villages] = build({});
    expect(ids(villages.enabledIds)).toEqual([1, 2, 3]);
  });

  it('does not build level 3 on the look-ahead', () => {
    expect(build({}).map((r) => r.level.level)).not.toContain(3);
  });
});

describe('picking a level-1 member enables exactly its children', () => {
  it("enables that parent's phases and no others", () => {
    const [, phases] = build({ 1: [1] });
    expect(ids(phases.enabledIds)).toEqual([11, 12]);
  });

  it('keeps the non-associated members visible and ghosted, not removed', () => {
    const [, phases] = build({ 1: [1] });
    expect(phases.members.map((m) => m.id)).toEqual([11, 12, 21, 22]);
    expect(phases.enabledIds.has(21)).toBe(false);
    expect(phases.enabledIds.has(22)).toBe(false);
  });

  it('preserves the declared member order', () => {
    const [, phases] = build({ 1: [2] });
    expect(phases.members.map((m) => m.label)).toEqual(['1.1', '1.2', '2.1', '2.2']);
  });
});

describe('several level-1 picks enable the union of their children', () => {
  it('unions both parents', () => {
    const [, phases] = build({ 1: [1, 2] });
    expect(ids(phases.enabledIds)).toEqual([11, 12, 21, 22]);
  });

  it('a parent with no children contributes nothing to the union', () => {
    const [, phases] = build({ 1: [1, 3] });
    expect(ids(phases.enabledIds)).toEqual([11, 12]);
  });
});

describe('level 3 and below are unchanged', () => {
  it('appears only once level 2 is picked, scoped to that pick', () => {
    const rows = build({ 1: [1], 2: [11] });
    expect(rows.map((r) => r.level.level)).toEqual([1, 2, 3]);
    expect(rows[2].members.map((m) => m.id)).toEqual([111]);
    expect(rows[2].enabledIds).toEqual(new Set([111]));
  });

  it('is absent while level 2 is unpicked, even with level 1 chosen', () => {
    expect(build({ 1: [1] }).map((r) => r.level.level)).toEqual([1, 2]);
  });
});

describe('degenerate configs', () => {
  it('a single-level config produces no ghosted second row', () => {
    const single: Level[] = [{ level: 1, label: 'Village', members: VILLAGES }];
    const rows = buildLevelRows<Member, Level>(single, {});
    expect(rows).toHaveLength(1);
    expect(rows[0].level.level).toBe(1);
  });

  it('a level 2 with no members at all is not pushed as an empty row', () => {
    const noPhases: Level[] = [
      { level: 1, label: 'Village', members: VILLAGES },
      { level: 2, label: 'Phase', members: [] },
    ];
    expect(buildLevelRows<Member, Level>(noPhases, {})).toHaveLength(1);
  });

  it('no levels at all yields no rows', () => {
    expect(buildLevelRows<Member, Level>([], {})).toEqual([]);
  });
});

describe('scopeLabel is unchanged while level 2 is visible but unpicked', () => {
  /* Mirrors the component's reduction over levelRows. */
  const scopeLabel = (scope: Record<number, number[]>) =>
    build(scope)
      .map(({ level, members }) => {
        const picked = scope[level.level] ?? [];
        return members
          .filter((m) => picked.includes(m.id))
          .map((m) => `${level.label} ${m.label}`)
          .join(' + ');
      })
      .filter((part) => part.length > 0)
      .join(' · ');

  it('contributes nothing when nothing is picked anywhere', () => {
    expect(scopeLabel({})).toBe('');
  });

  it('names only level 1 when only level 1 is picked', () => {
    expect(scopeLabel({ 1: [1] })).toBe('Village 1');
  });

  it('names both once level 2 is picked too', () => {
    expect(scopeLabel({ 1: [1], 2: [12] })).toBe('Village 1 · Phase 1.2');
  });

  it('joins multiple picks at the same level', () => {
    expect(scopeLabel({ 1: [1, 2] })).toBe('Village 1 + Village 2');
  });
});
