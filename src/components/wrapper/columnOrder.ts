/**
 * Where an optional column lands when its chip is turned on.
 *
 * The server already declares the canonical reading order once, in
 * schedule_view_spec.py's `columns` list:
 *
 *   category · stage · description · uom · rate · amount · start · duration · notes
 *
 * The `all` rung reproduces that order natively. The rungs that do NOT carry a
 * column — `standard` and `detail` for stage — used to append it, so switching
 * the Stage chip on dropped Stage at the far right of the row instead of between
 * Category and Description where it reads.
 *
 * The rule is INSERTION, never a sort. A global sort by canonical index would
 * quietly rearrange a rung the server deliberately ordered: `summary` is
 * ['group', 'amount', 'pct'] and neither `group` nor `pct` appears in `columns`
 * at all, so they would be flung to one end. Each rung keeps its own declared
 * order; only the extra is placed.
 *
 * Tests: ./__tests__/columnOrder.test.ts.
 */

/** Anything carrying a `key` — ScheduleColumn satisfies this. */
export interface CanonicalColumn {
  key: string;
}

/**
 * Insert `extra` into `keys` before the first key that outranks it canonically.
 *
 * Falls back to appending — the previous behaviour — when the extra is not in
 * the canonical list, or when nothing already present outranks it. Keys absent
 * from the canonical list (summary's `group` and `pct`) are simply not
 * candidates for the insertion point; they are never moved.
 */
export function insertAtCanonicalPosition(
  keys: readonly string[],
  extra: string,
  canonical: readonly CanonicalColumn[],
): string[] {
  const out = [...keys];
  if (out.includes(extra)) return out;

  const rankOf = (key: string) => canonical.findIndex((c) => c.key === key);
  const extraRank = rankOf(extra);
  if (extraRank === -1) {
    out.push(extra);
    return out;
  }

  const at = out.findIndex((key) => {
    const rank = rankOf(key);
    return rank !== -1 && rank > extraRank;
  });
  if (at === -1) out.push(extra);
  else out.splice(at, 0, extra);
  return out;
}

/**
 * The rung's own key list with every selected extra placed canonically.
 *
 * With no extras selected this returns the rung exactly as declared, so a view
 * with no chips on is identical to before.
 */
export function withExtraColumns(
  rungKeys: readonly string[],
  extraColumns: readonly string[],
  canonical: readonly CanonicalColumn[],
): string[] {
  let keys = [...rungKeys];
  for (const extra of extraColumns) {
    keys = insertAtCanonicalPosition(keys, extra, canonical);
  }
  return keys;
}
