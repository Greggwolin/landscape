/**
 * Studio screen manifest (JB50-TWOLAYER-ROUTING-0625, slice 1)
 *
 * Flattens the LIVE, project-type-aware folder config into a compact list the
 * studio chat sends to the model each turn, so the model knows the real screens
 * this project exposes (Layer 2a). The frontend `folderConfig.folders` is the
 * single source of truth — the backend renders this list into a "SCREENS IN
 * THIS PROJECT" prompt block; neither layer hardcodes a parallel taxonomy.
 *
 * Labels/ids only (no blurbs) — matches the backend `_build_screen_manifest_block`
 * helper. Blurbs are a deferred enhancement.
 */

import { formatFolderLabel, type FolderTab } from '@/lib/utils/folderTabConfig';

export interface ScreenManifestEntry {
  /** Folder id (e.g. 'capital'). */
  folder: string;
  /** Sub-tab id (e.g. 'equity'); omitted for folder-level entries. */
  tab?: string;
  /** Human label shown in the rail (e.g. 'Equity'). */
  label: string;
}

/**
 * One entry per folder + one entry per sub-tab, in rail order. Only the screens
 * the project type actually exposes (folders already filtered by createFolderConfig).
 */
export function buildScreenManifest(folders: FolderTab[]): ScreenManifestEntry[] {
  const out: ScreenManifestEntry[] = [];
  for (const folder of folders) {
    out.push({ folder: folder.id, label: formatFolderLabel(folder.label) });
    for (const sub of folder.subTabs) {
      out.push({ folder: folder.id, tab: sub.id, label: sub.label });
    }
  }
  return out;
}
