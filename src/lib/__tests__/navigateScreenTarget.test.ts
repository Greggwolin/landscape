import { mappedScreens, navigateScreenTarget } from '../navigateScreenTarget';

/**
 * The silent no-op, 2026-08-25.
 *
 * Landscaper called `navigate_to_screen({ folder: 'property', tab: 'parcels' })`
 * — correctly — and told the user "Opening the parcels screen now". The command
 * reached the /w/ shell, which looked up `'property'` in a map keyed on FOLDER,
 * found nothing, and returned. No screen, no error, no log. The stored
 * conversation has the tool call and its result, both correct, and the panel
 * never changed.
 *
 * The first test below is that exact case.
 */

describe('the case that failed', () => {
  it('opens the parcels form for property/parcels', () => {
    expect(navigateScreenTarget('property', 'parcels')).toBe('parcels');
  });

  it('opens the land use form for property/land-use', () => {
    /* Hyphenated. The tool description advertised `landuse` until this was
     * fixed, which matched no tab at all. */
    expect(navigateScreenTarget('property', 'land-use')).toBe('land_use');
  });

  it('does not confuse the two — the folder alone cannot tell them apart', () => {
    /* Which is why keying on the folder was never going to work: nearly every
     * screen worth opening lives under `property`. */
    expect(navigateScreenTarget('property', 'parcels'))
      .not.toBe(navigateScreenTarget('property', 'land-use'));
  });
});

describe('what already worked keeps working', () => {
  it('still opens the budget and the operating statement by folder', () => {
    expect(navigateScreenTarget('budget')).toBe('budget');
    expect(navigateScreenTarget('operations')).toBe('operating_statement');
  });

  it('ignores a tab on a folder-level screen rather than dropping it', () => {
    expect(navigateScreenTarget('budget', 'anything')).toBe('budget');
  });
});

describe('an unmapped screen answers null, so the caller can say so', () => {
  /* null is a real answer, not an absence. Landscaper has already promised the
   * user a screen by the time this resolves, so the caller must log rather than
   * shrug — a quiet return is exactly what made the original bug invisible. */
  it('returns null for a folder with no form', () => {
    expect(navigateScreenTarget('property')).toBeNull();
    expect(navigateScreenTarget('property', 'rent-roll')).toBeNull();
    expect(navigateScreenTarget('reports')).toBeNull();
  });

  it('returns null for no folder at all', () => {
    expect(navigateScreenTarget(undefined)).toBeNull();
    expect(navigateScreenTarget('')).toBeNull();
  });
});

describe('the map itself', () => {
  it('lists exactly what this shell can open', () => {
    expect(mappedScreens().sort()).toEqual([
      'budget',
      'operations',
      'property/land-use',
      'property/parcels',
    ]);
  });

  it('keys every sub-tab entry as folder/tab', () => {
    /* A key without a slash in the tab map would never be reachable — the
     * lookup builds `${folder}/${tab}`. */
    for (const key of mappedScreens().filter((k) => k.includes('/'))) {
      const [folder, tab] = key.split('/');
      expect(navigateScreenTarget(folder, tab)).not.toBeNull();
    }
  });
});
