import { resolveScreenIntent } from '@/lib/studio/screenIntent';
import { createFolderConfig } from '@/lib/utils/folderTabConfig';

// Real, project-type-aware folder taxonomies (same source the studio rail uses).
const landFolders = createFolderConfig('LAND').folders;
const incomeFolders = createFolderConfig('MF').folders;

describe('resolveScreenIntent — clean nav phrases short-circuit to a screen', () => {
  it('opens Capitalization · Equity for "show me the equity waterfall" (the failing case)', () => {
    expect(resolveScreenIntent('show me the equity waterfall', landFolders)).toEqual({
      folder: 'capital',
      tab: 'equity',
      label: 'Equity',
    });
  });

  it('opens Budget for "show me the budget" and "take me to the budget"', () => {
    const expected = { folder: 'budget', tab: 'budget', label: 'Budget' };
    expect(resolveScreenIntent('show me the budget', landFolders)).toEqual(expected);
    expect(resolveScreenIntent('take me to the budget', landFolders)).toEqual(expected);
  });

  it('opens Land Use for "open land use" on a land project', () => {
    expect(resolveScreenIntent('open land use', landFolders)).toEqual({
      folder: 'property',
      tab: 'land-use',
      label: 'Land Use',
    });
  });

  it('resolves a folder-level alias (no sub-tab) — "show me capitalization"', () => {
    expect(resolveScreenIntent('show me capitalization', landFolders)).toEqual({
      folder: 'capital',
      tab: undefined,
      label: 'Capitalization',
    });
  });

  it('strips a trailing UI-noun — "open the budget tab"', () => {
    expect(resolveScreenIntent('open the budget tab', landFolders)).toEqual({
      folder: 'budget',
      tab: 'budget',
      label: 'Budget',
    });
  });

  it('matches a sub-tab via the live label (exact match) — "go to sensitivity"', () => {
    expect(resolveScreenIntent('go to sensitivity', landFolders)).toEqual({
      folder: 'feasibility',
      tab: 'sensitivity',
      label: 'Sensitivity',
    });
  });
});

describe('resolveScreenIntent — data questions and qualified phrases reach the model (null)', () => {
  it('does not hijack the data question "what\'s the development budget?"', () => {
    expect(resolveScreenIntent("what's the development budget?", landFolders)).toBeNull();
  });

  it('does not hijack a qualified phrase "show me the budget breakdown by phase"', () => {
    expect(resolveScreenIntent('show me the budget breakdown by phase', landFolders)).toBeNull();
  });

  it('leaves project switching alone — "take me to project 17"', () => {
    expect(resolveScreenIntent('take me to project 17', landFolders)).toBeNull();
  });

  it('returns null when there is no nav verb at all', () => {
    expect(resolveScreenIntent('the budget', landFolders)).toBeNull();
    expect(resolveScreenIntent('how is the equity waterfall structured', landFolders)).toBeNull();
  });
});

describe('resolveScreenIntent — project-type awareness (no cross-type misfire)', () => {
  it('falls through when an alias names a sub-tab the project type lacks ("land use" on income)', () => {
    // Income properties have no land-use sub-tab; the alias must not open the
    // Property folder root as a consolation — it should fall through to null.
    expect(resolveScreenIntent('open land use', incomeFolders)).toBeNull();
  });

  it('resolves income-only screens — "show me the income approach"', () => {
    expect(resolveScreenIntent('show me the income approach', incomeFolders)).toEqual({
      folder: 'valuation',
      tab: 'income',
      label: 'Income Approach',
    });
  });
});

describe('resolveScreenIntent — property details alias + typo tolerance (JB45)', () => {
  it('routes "show me the property details" to the Property Details screen', () => {
    expect(resolveScreenIntent('show me the property details', incomeFolders)).toEqual({
      folder: 'property',
      tab: 'property-details',
      label: 'Property Details',
    });
  });

  it('routes the common typo "show me the propery details" to Property Details', () => {
    expect(resolveScreenIntent('show me the propery details', incomeFolders)).toEqual({
      folder: 'property',
      tab: 'property-details',
      label: 'Property Details',
    });
  });

  it('tolerates a typo on a folder/sub-tab label — "take me to the budgett"', () => {
    expect(resolveScreenIntent('take me to the budgett', landFolders)).toEqual({
      folder: 'budget',
      tab: 'budget',
      label: 'Budget',
    });
  });

  it('does not fuzzy-match short labels — "show me the cap" is NOT "map"', () => {
    expect(resolveScreenIntent('show me the cap', landFolders)).toBeNull();
  });

  it('still does not hijack data questions — "show me the average rent"', () => {
    expect(resolveScreenIntent('show me the average rent', incomeFolders)).toBeNull();
  });

  it('still does not hijack qualified phrases — "show me the budget breakdown by phase"', () => {
    expect(resolveScreenIntent('show me the budget breakdown by phase', landFolders)).toBeNull();
  });

  it('falls through on income when Property has no land-use sub-tab (no cross-type fuzzy)', () => {
    expect(resolveScreenIntent('show me land use', incomeFolders)).toBeNull();
  });
});

describe('resolveScreenIntent — renovation / value-add aliases (JB48)', () => {
  // The Renovation sub-tab is gated behind value-add (requiresValueAdd), so the
  // folder list must enable it (6th param). Mirrors a value-add MF deal like
  // Chadron Terrace, where Property · Renovation is the real Value-Add page.
  const renoFolders = createFolderConfig('MF', undefined, undefined, undefined, undefined, true).folders;

  it('opens Property · Renovation for "show me the renovation budget" (not a fabricated artifact)', () => {
    expect(resolveScreenIntent('show me the renovation budget', renoFolders)).toEqual({
      folder: 'property',
      tab: 'renovation',
      label: 'Renovation',
    });
  });

  it('opens Property · Renovation for "show me renovation"', () => {
    expect(resolveScreenIntent('show me renovation', renoFolders)).toEqual({
      folder: 'property',
      tab: 'renovation',
      label: 'Renovation',
    });
  });

  it('opens Property · Renovation for "show me the value-add"', () => {
    expect(resolveScreenIntent('show me the value-add', renoFolders)).toEqual({
      folder: 'property',
      tab: 'renovation',
      label: 'Renovation',
    });
  });

  it('does not hijack the data question "what\'s the renovation cost per unit?"', () => {
    expect(resolveScreenIntent("what's the renovation cost per unit?", renoFolders)).toBeNull();
  });

  it('falls through on a land project (no renovation screen) → model', () => {
    expect(resolveScreenIntent('show me the renovation budget', landFolders)).toBeNull();
  });

  it('falls through on income WITHOUT value-add (renovation sub-tab not exposed)', () => {
    expect(resolveScreenIntent('show me the renovation budget', incomeFolders)).toBeNull();
  });
});

describe('resolveScreenIntent — renovation PER-SLICE asks open the page (RV)', () => {
  // Renovation is whole-property: no per-bedroom / unit-type tool exists, so a
  // sliced ask has nothing to source and the model fabricates a breakdown. The
  // page is the answer — open it even as a data question, even without a nav verb.
  const renoFolders = createFolderConfig('MF', undefined, undefined, undefined, undefined, true).folders;
  const RENO = { folder: 'property', tab: 'renovation', label: 'Renovation' };

  it('opens Renovation for "what is the 1BR renovation budget" (the failing case)', () => {
    expect(resolveScreenIntent('what is the 1BR renovation budget', renoFolders)).toEqual(RENO);
  });

  it('opens Renovation for "show me the renovation budget for the 1BR units"', () => {
    expect(resolveScreenIntent('show me the renovation budget for the 1BR units', renoFolders)).toEqual(RENO);
  });

  it('opens Renovation for a bare sliced ask "the 1BR renovation budget" (no nav verb)', () => {
    expect(resolveScreenIntent('the 1BR renovation budget', renoFolders)).toEqual(RENO);
  });

  it('opens Renovation for "renovation budget by bedroom" and "2 bedroom renovation cost"', () => {
    expect(resolveScreenIntent('renovation budget by bedroom', renoFolders)).toEqual(RENO);
    expect(resolveScreenIntent('2 bedroom renovation cost', renoFolders)).toEqual(RENO);
  });

  it('still lets the answerable per-unit question reach the model (no slice qualifier)', () => {
    // "per unit" is a standard metric the value-add tool returns — NOT a slice.
    expect(resolveScreenIntent("what's the renovation cost per unit?", renoFolders)).toBeNull();
    expect(resolveScreenIntent('what is the total renovation budget', renoFolders)).toBeNull();
  });

  it('does not fire for a non-renovation sliced ask (no renovation topic)', () => {
    expect(resolveScreenIntent('compare the 2BR vs 3BR rent premiums', renoFolders)).toBeNull();
  });

  it('falls through on a project without the renovation screen even when sliced', () => {
    expect(resolveScreenIntent('what is the 1BR renovation budget', landFolders)).toBeNull();
    expect(resolveScreenIntent('what is the 1BR renovation budget', incomeFolders)).toBeNull();
  });
});
