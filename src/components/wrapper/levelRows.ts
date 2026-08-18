/**
 * Which filter chip rows exist, and which of their members can be clicked.
 *
 * Level 2 is built even before anything at level 1 is picked, so the filter
 * shows the shape of the project up front rather than hiding the fact that a
 * second level exists at all. Its members render ghosted until a parent is
 * chosen.
 *
 * Non-associated members stay VISIBLE and ghosted; they are never removed.
 * Picking Village 1 leaves Phase 2.1 / 2.2 / 4.1 / 4.2 on screen, dimmed and
 * unclickable. That is deliberate — do not "tidy" them away.
 *
 * The look-ahead is one level only. Level 3 and below still appear only once
 * their parent is picked: parcels number in the hundreds, and rendering them
 * all ghosted would bury the filter rather than explain it.
 *
 * Tests: ./__tests__/levelRows.test.ts.
 */

/** Structural minimum — ScheduleLevelMember satisfies this. */
export interface LevelMemberLike {
  id: number;
  parent_id: number | null;
}

/** Structural minimum — ScheduleLevel satisfies this. */
export interface LevelLike<M extends LevelMemberLike> {
  level: number;
  members: M[];
}

export interface BuiltLevelRow<M extends LevelMemberLike, L extends LevelLike<M>> {
  level: L;
  /** In `level.members` order, always — never re-sorted or split. */
  members: M[];
  /** Member ids that can be clicked. Everything else renders ghosted. */
  enabledIds: Set<number>;
}

/** The union of the children of every picked parent. */
function childrenOf<M extends LevelMemberLike>(
  members: readonly M[],
  parentIds: readonly number[],
): Set<number> {
  const out = new Set<number>();
  for (const m of members) {
    if (m.parent_id !== null && parentIds.includes(m.parent_id)) out.add(m.id);
  }
  return out;
}

export function buildLevelRows<
  M extends LevelMemberLike,
  L extends LevelLike<M>,
>(
  levels: readonly L[],
  scope: Record<number, number[]>,
): BuiltLevelRow<M, L>[] {
  const out: BuiltLevelRow<M, L>[] = [];
  let parentIds: number[] = [];

  for (let i = 0; i < levels.length; i += 1) {
    const level = levels[i];

    let members: M[];
    let enabledIds: Set<number>;

    if (i === 0) {
      // The top level is always fully selectable — nothing gates it.
      members = level.members;
      enabledIds = new Set(members.map((m) => m.id));
    } else if (i === 1) {
      // The look-ahead level: every member is shown whatever is picked above,
      // and only the children of the current selection can be clicked. With
      // nothing picked above, the enabled set is empty and the whole row is
      // ghosted, which is the point of building it early.
      members = level.members;
      enabledIds = childrenOf(members, parentIds);
    } else {
      // Level 3 and below keep the original behaviour: scoped to the parent
      // selection, every shown member selectable.
      members = level.members.filter(
        (m) => m.parent_id !== null && parentIds.includes(m.parent_id),
      );
      enabledIds = new Set(members.map((m) => m.id));
    }

    if (members.length === 0) break;
    out.push({ level, members, enabledIds });

    const picked = scope[level.level];
    if (!picked || picked.length === 0) {
      // Nothing picked here, so nothing below can be scoped. Look ONE level
      // ahead from the top and then stop — deliberately not generalised down
      // the tree, because level 3 is parcels in the hundreds and a fully
      // ghosted row that long buries the filter instead of explaining it.
      if (i === 0) continue;
      break;
    }
    parentIds = picked;
  }

  return out;
}
