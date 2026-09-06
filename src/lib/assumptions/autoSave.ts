/**
 * Auto-save arming rules for the Investment Assumptions page.
 *
 * The page debounces a save ~1s after its state changes. Loading the page is
 * itself a state change: the fetched payload lands in state, and auto-calculated
 * fields (sale_date, improvement_pct, depreciation_basis) fire their onChange on
 * mount as soon as their dependencies are present. Without a gate, merely
 * visiting the page writes back whatever the server handed it — which, for a
 * project with no acquisition record, used to be a full set of deal terms the
 * server had invented.
 *
 * Rule: a save is armed by a person, never by a page load. A derived value is
 * legitimate output of the user's own inputs, so it rides along with a save that
 * a person already armed — but it never arms one by itself.
 *
 * Product rule (2026-09-04): the app must never supply a financial assumption
 * the user did not choose.
 */

/** Where a value change came from. */
export type ChangeOrigin =
  /** Typed, picked or toggled by a person. */
  | 'user'
  /** Computed by the form from other fields (autoCalc). */
  | 'derived';

export type AssumptionValues = Record<string, string | number | boolean | null>;

/**
 * Does this change arm auto-save? Only a person's edit does.
 */
export function armsAutoSave(origin: ChangeOrigin): boolean {
  return origin === 'user';
}

/**
 * Should the debounced auto-save actually fire?
 *
 * `userEdited` must have been armed by {@link armsAutoSave} at least once for
 * this basket since load. Absent that, there is nothing to save that a person
 * asked for — regardless of how full the values object looks.
 */
export function shouldAutoSaveAssumptions(args: {
  values: AssumptionValues;
  userEdited: boolean;
}): boolean {
  if (!args.userEdited) return false;
  return Object.keys(args.values).length > 0;
}
