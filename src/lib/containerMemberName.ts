/**
 * The identifier of a container, with its level's name stripped off the front.
 *
 * WHY THIS EXISTS
 * ---------------
 * A level-1 container is DISPLAYED as `{level label} {identifier}` — "Village 1".
 * But the container's stored name already carries a label baked in at the moment
 * it was created, because the create path names it `${level1Label} ${number}`.
 * So the raw name is "Village 1" and rendering the label in front of it gives
 * "Village Village 1".
 *
 * Four screens solved this by stripping the literal word "Area", which worked
 * for exactly as long as the configured label was always "Area" — which it was,
 * because the hook that reads it asked for a key the endpoint does not return
 * and fell through to its default on every project. Fixing that read (so a
 * project configured as "Village" finally says Village) is what makes the
 * hard-coded strip wrong: the next container created on that project is named
 * "Village 5", the strip does not fire, and the tile reads "Village Village 5".
 *
 * Verified on the live data at the time of writing: no project could hit it yet,
 * because every project with a non-default label either has no level-1
 * containers at all or has ones still named "Area N" from before. It is one
 * "add a village" away, not a hypothetical.
 *
 * THE RULE
 * --------
 * Strip whichever label is on the front — the project's configured one, or the
 * legacy "Area" that older containers carry — and keep the identifier. A name
 * with no label prefix is returned untouched, because someone who called a
 * container "Riverbend" meant it.
 *
 * The backend reached the same conclusion independently for the schedule
 * artifacts: a member is a NUMBER, and its name is composed at render time from
 * the level's label plus that number. That is what makes renaming a level in
 * project setup rename every member with it.
 */

/** Escape a configured label before it goes into a regular expression. */
function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A whole-word pattern for a label that may not start or end with a letter.
 *
 * `\b` asserts a boundary between a word character and a non-word one, so it
 * only means anything when the character it sits next to IS a word character.
 * Wrapping a label like `Block (A)` in `\b…\b` puts the closing boundary after
 * `)`, where there is no boundary to find, and the pattern silently never
 * matches. Labels are free text typed in project setup, so this is reachable.
 * Anchor each end only where it can do its job.
 */
function wholeWordPattern(label: string): RegExp {
  const body = escapeForRegex(label);
  const open = /^\w/.test(label) ? '\\b' : '';
  const close = /\w$/.test(label) ? '\\b' : '';
  return new RegExp(`${open}${body}${close}`, 'gi');
}

/**
 * @param rawName  the container's stored name, e.g. "Village 1" or "Area 1"
 * @param levelLabel the project's configured label for that level, e.g. "Village"
 * @returns the identifier alone, e.g. "1" — or `rawName` when nothing was stripped
 */
export function containerMemberName(
  rawName: string | null | undefined,
  levelLabel?: string | null,
): string {
  const raw = (rawName ?? '').trim();
  if (!raw) return '';

  // The configured label first, then the legacy default. Both, because a
  // project renamed from Area to Village has containers of both vintages and
  // they must render the same way.
  const labels = [levelLabel, 'Area']
    .filter((l): l is string => Boolean(l && l.trim()))
    .map((l) => l.trim());

  let cleaned = raw;
  for (const label of labels) {
    cleaned = cleaned.replace(wholeWordPattern(label), '');
  }
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  // Stripping everything means the name WAS just the label — keep the original
  // rather than rendering a bare label with nothing after it.
  return cleaned.length > 0 ? cleaned : raw;
}
