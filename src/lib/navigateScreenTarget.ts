/**
 * Which registered form a `navigate_screen` command should open.
 *
 * WHY THIS IS ITS OWN FILE
 * ------------------------
 * It used to be two lines inside a callback in the /w/ layout, and it failed
 * silently in a way nobody could see. Landscaper would call
 * `navigate_to_screen({ folder: 'property', tab: 'parcels' })`, correctly, and
 * tell the user "Opening the parcels screen now"; the command reached the
 * handler; the handler looked up `'property'` in a two-entry map keyed on
 * FOLDER, found nothing, and returned. No screen, no error, no log. Confirmed
 * from the stored conversation on 2026-08-25 — the tool call and its result are
 * both recorded, both correct, and the panel never changed.
 *
 * Keying on the folder alone could never have worked for this: nearly every
 * screen worth opening sits under `property`, so the folder cannot distinguish
 * parcels from land use from the rent roll. The tab was on the command all
 * along; the handler discarded it.
 *
 * Pulled out here so the mapping is a plain function with a test, rather than a
 * lookup buried in a component that only a running browser can exercise.
 *
 * ADDING AN ENTRY
 * ---------------
 * Check it in BOTH directions before you add it:
 *   1. the tab id exists under that folder in `lib/utils/folderTabConfig.ts`
 *   2. the form name is registered in `components/wrapper/modals/index.ts`
 * An entry pointing at an unregistered form fails exactly as silently as no
 * entry at all — which is the whole reason this file exists.
 */

/** Folder-level screens: a folder that has no sub-tab of its own. */
const FOLDER_TO_MODAL: Record<string, string> = {
  budget: 'budget',
  operations: 'operating_statement',
};

/** Sub-tab screens, keyed `folder/tab`. */
const FOLDER_TAB_TO_MODAL: Record<string, string> = {
  'property/parcels': 'parcels',
  'property/land-use': 'land_use',
};

/**
 * The registered form name for a folder/tab, or `null` when nothing is mapped.
 *
 * `null` is a real answer and the caller must act on it — Landscaper has
 * already promised the user a screen by the time this runs, so a quiet return
 * leaves them staring at an unchanged panel. The caller logs; it does not
 * shrug.
 */
export function navigateScreenTarget(
  folder: string | undefined,
  tab?: string,
): string | null {
  if (!folder) return null;
  // The more specific key wins: a folder that also has a mapped tab should open
  // the tab's screen, not the folder's.
  const viaTab = tab ? FOLDER_TAB_TO_MODAL[`${folder}/${tab}`] : undefined;
  return viaTab ?? FOLDER_TO_MODAL[folder] ?? null;
}

/** Every folder/tab this shell can currently open, for tests and diagnostics. */
export function mappedScreens(): string[] {
  return [...Object.keys(FOLDER_TO_MODAL), ...Object.keys(FOLDER_TAB_TO_MODAL)];
}
