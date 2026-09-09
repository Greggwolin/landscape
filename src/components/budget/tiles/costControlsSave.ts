/**
 * Save gating for the Cost Controls tile.
 *
 * The tile used to seed its contingency state with 10% and then let a
 * debounced effect persist whatever was in state — so merely opening a budget
 * line stamped a 10% contingency the estimator never chose. The rule
 * (2026-09-04) is that the app must never supply a financial assumption the
 * user did not choose: the control may sit empty and it may offer a typical
 * value, but nothing is written until a person changes something.
 *
 * These helpers hold that rule in one testable place. A draft knows what is in
 * the database, what is in the control, and whether a person has touched it.
 * Only a touched draft whose value actually differs from the database is
 * allowed to save.
 */

export interface FieldDraft<T> {
  /** The value as it stands in the database for this budget line. */
  readonly persisted: T;
  /** The value currently shown in the control. */
  readonly value: T;
  /** True once a person has edited this control. Mounting does not set it. */
  readonly touched: boolean;
}

/** Open a control on the stored value. An unset value stays unset. */
export function initDraft<T>(persisted: T): FieldDraft<T> {
  return { persisted, value: persisted, touched: false };
}

/** Record a change made by a person. */
export function editDraft<T>(draft: FieldDraft<T>, value: T): FieldDraft<T> {
  return { persisted: draft.persisted, value, touched: true };
}

/**
 * Whether this draft should be written, and what to write.
 *
 * `save` is false on mount (nothing touched) and false once the control is
 * back in step with the database — so re-opening a line, or typing a value and
 * undoing it, writes nothing. A touched 0 is a decision and does save.
 */
export function saveIntent<T>(draft: FieldDraft<T>): { save: boolean; value: T } {
  return {
    save: draft.touched && !Object.is(draft.value, draft.persisted),
    value: draft.value,
  };
}

/**
 * Fold a completed write back into the draft, so the value the user just saved
 * becomes the new baseline. Without this a user could not revert to the stored
 * value — the revert would look like "no change" and never be written.
 * Ignored if the control moved on while the write was in flight.
 */
export function markSaved<T>(draft: FieldDraft<T>, saved: T): FieldDraft<T> {
  if (!Object.is(draft.value, saved)) return draft;
  return { persisted: saved, value: saved, touched: draft.touched };
}

/**
 * Read a contingency percentage out of the text field.
 *
 * An empty field means "not set" (null), never 0 — an estimator who has not
 * decided is not the same as one who decided on no contingency. Text that is
 * not a number is treated as not set rather than silently becoming 0.
 */
export function parseContingencyInput(raw: string): number | null {
  const cleaned = raw.replace('%', '').trim();
  if (cleaned === '') return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Render a contingency for the text field: unset shows as an empty field. */
export function formatContingencyInput(value: number | null): string {
  if (value === null) return '';
  return `${Math.round(value)}%`;
}

/**
 * The contingency amount in dollars, or null when no contingency has been set.
 * Callers must show "not set" rather than $0 — an unset contingency is not a
 * decision to carry none.
 */
export function contingencyAmountOf(
  amount: number | null | undefined,
  contingencyPct: number | null,
): number | null {
  if (contingencyPct === null) return null;
  return (amount || 0) * (contingencyPct / 100);
}
