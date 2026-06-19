/**
 * Page → User Guide chapter map (classic context-aware deep-link).
 *
 * The classic (tabbed) UI captures the active folder/tab in
 * HelpLandscaperContext. When the user opens the guide from a given page,
 * we deep-link to the chapter that covers it: `/guide#<chapterId>`.
 *
 * Keys are `"{folder}"` and `"{folder}_{tab}"`. The most specific key wins:
 * resolveChapter tries `folder_tab` first, then `folder`. No match → null
 * (caller opens the guide at the Introduction).
 *
 * Chapter ids are GuideChapter.id values in src/data/guideContent.ts.
 * Extend this map as v2 chapters land. Folder/tab ids come from
 * src/lib/utils/folderTabConfig.ts.
 */
export const PAGE_CHAPTER_MAP: Record<string, string> = {
  // Project home
  home: '1',

  // Property folder
  // Location / Market / Acquisition have no dedicated guide chapter yet —
  // they fall back to /guide (Introduction) rather than point at an
  // off-topic chapter. Add mappings when those chapters are written.
  'property_property-details': '9', // Property Setup
  'property_rent-roll': '10', // Rent Roll
  'property_land-use': '14', // Project Setup (land use taxonomy)
  property_parcels: '14', // Project Setup (parcel inventory)

  // Operations
  operations: '11',

  // Valuation folder — v2 chapters where they exist, legacy otherwise
  valuation: '12',
  valuation_income: 'UW',
  'valuation_sales-comparison': 'CS',
  'valuation_cost': '12',
  valuation_reconciliation: '12',

  // Budget / feasibility / capitalization
  budget: '15',
  feasibility: '16',
  capitalization: '13',

  // Reports — no dedicated guide chapter yet; falls back to /guide (Introduction).
};

/**
 * Resolve the guide chapter id for a classic page.
 * @param folder active folder id (e.g. "valuation"), or null
 * @param tab active subtab id (e.g. "income"), or null
 * @returns chapter id (e.g. "UW") or null when no mapping exists
 */
export function resolveChapter(
  folder: string | null | undefined,
  tab: string | null | undefined,
): string | null {
  if (!folder) return null;
  if (tab) {
    const specific = PAGE_CHAPTER_MAP[`${folder}_${tab}`];
    if (specific) return specific;
  }
  return PAGE_CHAPTER_MAP[folder] ?? null;
}

/**
 * Build the guide URL for a page, with the chapter hash when one is mapped.
 */
export function guideUrlForPage(
  folder: string | null | undefined,
  tab: string | null | undefined,
): string {
  const chapterId = resolveChapter(folder, tab);
  return chapterId ? `/guide#${chapterId}` : '/guide';
}
