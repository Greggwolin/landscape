import { buildScreenManifest } from '@/lib/studio/screenManifest';
import { createFolderConfig } from '@/lib/utils/folderTabConfig';

describe('buildScreenManifest (JB50 slice 1)', () => {
  const landFolders = createFolderConfig('LAND').folders;
  const manifest = buildScreenManifest(landFolders);

  it('emits one entry per folder (no tab) and one per sub-tab (with tab id)', () => {
    // Every folder appears as a folder-level entry (tab undefined).
    for (const folder of landFolders) {
      expect(manifest).toContainEqual({
        folder: folder.id,
        label: expect.any(String),
        tab: undefined,
      });
      // Every sub-tab appears with its id + label.
      for (const sub of folder.subTabs) {
        expect(manifest).toContainEqual({ folder: folder.id, tab: sub.id, label: sub.label });
      }
    }
  });

  it('counts = folders + total sub-tabs, in rail order', () => {
    const expectedCount =
      landFolders.length + landFolders.reduce((n, f) => n + f.subTabs.length, 0);
    expect(manifest).toHaveLength(expectedCount);
    // First entry is the first folder, folder-level.
    expect(manifest[0]).toEqual({ folder: landFolders[0].id, label: expect.any(String), tab: undefined });
  });

  it('includes real screens like Capitalization · Equity and Property · Land Use', () => {
    expect(manifest).toContainEqual({ folder: 'capital', tab: 'equity', label: 'Equity' });
    expect(manifest).toContainEqual({ folder: 'property', tab: 'land-use', label: 'Land Use' });
  });

  it('exposes value-add-only screens only when value-add is enabled', () => {
    const noVa = buildScreenManifest(createFolderConfig('MF').folders);
    const va = buildScreenManifest(
      createFolderConfig('MF', undefined, undefined, undefined, undefined, true).folders,
    );
    expect(noVa.some((s) => s.tab === 'renovation')).toBe(false);
    expect(va).toContainEqual({ folder: 'property', tab: 'renovation', label: 'Renovation' });
  });
});
