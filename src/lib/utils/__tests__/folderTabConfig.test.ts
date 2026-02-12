import { createFolderConfig, type AnalysisTypeTileConfig } from '@/lib/utils/folderTabConfig';

const toFolderIds = (config: ReturnType<typeof createFolderConfig>) =>
  config.folders.map((folder) => folder.id);

describe('createFolderConfig analysis-type visibility', () => {
  it('hides capitalization for valuation when tile_capitalization is false', () => {
    const tileConfig: AnalysisTypeTileConfig = {
      analysis_type: 'VALUATION',
      tile_hbu: true,
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
      tile_hbu: false,
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
