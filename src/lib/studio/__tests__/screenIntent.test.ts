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
