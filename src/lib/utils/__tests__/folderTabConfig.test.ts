import { createFolderConfig, type AnalysisTypeTileConfig } from '@/lib/utils/folderTabConfig';

const toFolderIds = (config: ReturnType<typeof createFolderConfig>) =>
  config.folders.map((folder) => folder.id);

describe('createFolderConfig analysis-type visibility', () => {
  it('hides capitalization for valuation when tile_capitalization is false', () => {
    const tileConfig: AnalysisTypeTileConfig = {
      analysis_type: 'VALUATION',
      tile_valuation: true,
      tile_capitalization: false,
      tile_returns: false,
      tile_development_budget: false,
    };

    const folderIds = toFolderIds(createFolderConfig('MF', 'VALUATION', tileConfig));

    expect(folderIds).toContain('valuation');
    expect(folderIds).toContain('operations');
    expect(folderIds).not.toContain('capital');
  });

  it('keeps valuation visible when returns are enabled even if tile_valuation is false', () => {
    const tileConfig: AnalysisTypeTileConfig = {
      analysis_type: 'INVESTMENT',
      tile_valuation: false,
      tile_capitalization: true,
      tile_returns: true,
      tile_development_budget: false,
    };

    const folderIds = toFolderIds(createFolderConfig('MF', 'INVESTMENT', tileConfig));

    expect(folderIds).toContain('valuation');
    expect(folderIds).toContain('capital');
  });

  it('uses legacy all-visible behavior when tile config is unavailable', () => {
    const folderIds = toFolderIds(createFolderConfig('MF', 'VALUATION', null));

    expect(folderIds).toContain('capital');
    expect(folderIds).toContain('valuation');
    expect(folderIds).toContain('operations');
  });
});

describe('land Feasibility folder after the placeholder subtabs were removed (#LS-1021-05/06)', () => {
  it('exposes only Cash Flow — no Returns or Sensitivity "Coming Soon" tabs', () => {
    const feasibility = createFolderConfig('LAND').folders.find((f) => f.id === 'feasibility');
    expect(feasibility).toBeDefined();
    expect(feasibility!.subTabs.map((s) => s.id)).toEqual(['cashflow']);
  });

  it('still defaults the Feasibility folder to cashflow (QV14 regression guard)', () => {
    const feasibility = createFolderConfig('LAND').folders.find((f) => f.id === 'feasibility');
    expect(feasibility!.subTabs[0].id).toBe('cashflow');
  });
});
