/**
 * Hierarchy-column segment selection for ScheduleArtifact.
 *
 * A member is always a number, and the number carries its own ancestry: level 1
 * reads `1`, level 2 `1.1`, level 3 `1.101`. So showing `Village 1 · Phase 1.2`
 * states the village twice — the `1` in `1.2` IS Village 1. The cell shows the
 * DEEPEST level the row reaches and nothing above it.
 *
 * What is configurable is the level's LABEL, per project and shared by every
 * member of that level: level 1 is Village or Area or District, level 2 is
 * Phase or Neighborhood. Individual members are never given their own names,
 * which is why there is no branch here for a non-numeric member — that would be
 * out-of-spec data, and rendering it through a quiet special path would hide the
 * fault rather than show it.
 *
 * Lives in its own module so the rule can be tested directly, without mounting
 * the component. Tests: ./__tests__/hierPath.test.ts.
 */

export const HIER_SEPARATOR = ' · ';

/** A row's scope: level number → member id. JSON hands the keys over as strings. */
export type RowScope = Record<string, number> | undefined;

export interface HierLevel {
  level: number;
  label: string;
}

/**
 * The deepest open level this row actually reaches, or null if it reaches none.
 *
 * "Reaches" means the row has a member at that level AND that member resolves to
 * a label — an unresolvable member is skipped exactly as the old `.filter(Boolean)`
 * skipped it, so a broken deep member falls back to the deepest one that works
 * rather than blanking the cell.
 */
export function deepestHierLevel(
  openLevels: readonly number[],
  rowScope: RowScope,
  memberLabel: Record<string, string>,
): number | null {
  let deepest: number | null = null;
  for (const lv of openLevels) {
    if (memberLabel[`${lv}:${rowScope?.[lv]}`] && (deepest === null || lv > deepest)) {
      deepest = lv;
    }
  }
  return deepest;
}

/**
 * The hierarchy cell's text: the deepest segment only.
 *
 * `Village 1` + `Phase 1.2` → `Phase 1.2`. A row that only has a village keeps
 * it — never drop the only segment a row has, which falls out of "keep the
 * deepest" for free. A row that reaches nothing renders empty.
 */
export function hierCellText(
  openLevels: readonly number[],
  rowScope: RowScope,
  memberLabel: Record<string, string>,
): string {
  const lv = deepestHierLevel(openLevels, rowScope, memberLabel);
  return lv === null ? '' : memberLabel[`${lv}:${rowScope?.[lv]}`];
}

/**
 * The hierarchy column's header: the labels of the levels that actually survive
 * segment selection across the visible rows — not every open level.
 *
 * If every row bottoms out at phase the header is `Phase`, because that is all
 * any cell shows. Mixed-depth rows (some village-only, some phase) join the
 * distinct surviving labels in level order.
 */
export function hierHeaderLabels(
  rows: readonly { scope: Record<string, number> }[],
  openLevels: readonly number[],
  memberLabel: Record<string, string>,
  levels: readonly HierLevel[],
): string {
  const surviving = new Set<number>();
  for (const row of rows) {
    const lv = deepestHierLevel(openLevels, row.scope, memberLabel);
    if (lv !== null) surviving.add(lv);
  }
  return levels
    .filter((l) => surviving.has(l.level))
    .map((l) => l.label)
    .join(HIER_SEPARATOR);
}
