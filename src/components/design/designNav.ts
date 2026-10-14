/**
 * Design-view navigation (Slice 1 reference, 2026-10-14).
 *
 * The reference groups a project into standing sections, each shown on the
 * collapsed rail by a two-letter code (Pj Pr Mk Co Rv Vl Cp Dc …) and in the
 * expanded nav by name. Each section maps onto screens the app already has
 * (the folder/sub-tab pairs from createFolderConfig) — nothing is invented:
 * an item is listed only when the live folder config carries its screen.
 *
 *   Project        → home
 *   Property       → property: parcels / land use / acquisition (land);
 *                    details / floor plans / rent roll / renovation (income)
 *   Market         → property: location ("Economy") + market / market-supply
 *                    ("Housing Market" on land, "Apartment Market" on MF)
 *   Costs          → budget/budget            (land)
 *   Revenue        → budget/sales             (land)
 *   Operations     → operations               (income)
 *   Valuation      → feasibility/* (land) · valuation/* (income)
 *   Capitalization → capital/*
 *   Documents      → documents
 *   Reports, Map   → reports, map
 */
import type { FolderTab } from '@/lib/utils/folderTabConfig';

export interface DesignNavItem {
  id: string;
  label: string;
  folder: string;
  tab?: string;
}

export interface DesignNavSection {
  id: string;
  code: string; // two-letter rail code
  label: string;
  items: DesignNavItem[];
}

function has(folders: FolderTab[], folder: string, tab?: string): boolean {
  const f = folders.find((x) => x.id === folder);
  if (!f) return false;
  if (!tab) return true;
  return f.subTabs.some((s) => s.id === tab);
}

export function buildDesignNav(folders: FolderTab[], propertyTypeCode?: string | null): DesignNavSection[] {
  const isLand = folders.some((f) => f.id === 'budget') || (propertyTypeCode || '').toUpperCase() === 'LAND';
  const isMf = ['MF', 'MULTIFAMILY'].includes((propertyTypeCode || '').toUpperCase());
  const pick = (cands: Array<[string, string, string?]>): DesignNavItem[] =>
    cands
      .filter(([, folder, tab]) => has(folders, folder, tab))
      .map(([label, folder, tab]) => ({ id: `${folder}:${tab ?? ''}`, label, folder, tab }));

  const sections: DesignNavSection[] = [
    { id: 'project', code: 'Pj', label: 'Project', items: pick([['Home', 'home']]) },
    {
      id: 'property', code: 'Pr', label: 'Property',
      items: isLand
        ? pick([['Parcels', 'property', 'parcels'], ['Land Use', 'property', 'land-use'], ['Acquisition', 'property', 'acquisition']])
        : pick([
            ['Details', 'property', 'property-details'],
            ['Rent Roll', 'property', 'rent-roll'],
            ['Renovation', 'property', 'renovation'],
            ['Acquisition', 'property', 'acquisition'],
          ]),
    },
    {
      id: 'market', code: 'Mk', label: 'Market',
      items: pick([
        ['Economy', 'property', 'location'],
        [isLand ? 'Housing Market' : isMf ? 'Apartment Market' : 'Market', 'property', isLand ? 'market' : 'market-supply'],
      ]),
    },
    { id: 'costs', code: 'Co', label: 'Costs', items: pick([['Budget', 'budget', 'budget']]) },
    { id: 'revenue', code: 'Rv', label: 'Revenue', items: pick([['Sales', 'budget', 'sales']]) },
    { id: 'operations', code: 'Op', label: 'Operations', items: pick([['Operations', 'operations']]) },
    {
      id: 'valuation', code: 'Vl', label: 'Valuation',
      items: [
        ...pick([['Cash Flow', 'feasibility', 'cashflow'], ['Returns', 'feasibility', 'returns'], ['Sensitivity', 'feasibility', 'sensitivity']]),
        ...pick([
          ['Sales Comparison', 'valuation', 'sales-comparison'],
          ['Cost Approach', 'valuation', 'cost'],
          ['Income Approach', 'valuation', 'income'],
          ['Reconciliation', 'valuation', 'reconciliation'],
        ]),
      ],
    },
    { id: 'capital', code: 'Cp', label: 'Capitalization', items: pick([['Debt', 'capital', 'debt'], ['Equity', 'capital', 'equity']]) },
    { id: 'documents', code: 'Dc', label: 'Documents', items: pick([['Documents', 'documents']]) },
    { id: 'reports', code: 'Rp', label: 'Reports', items: pick([['Reports', 'reports']]) },
    { id: 'map', code: 'Mp', label: 'Map', items: pick([['Map', 'map']]) },
  ];
  return sections.filter((s) => s.items.length > 0);
}

/** Which section/item the live folder+tab belongs to. */
export function locateDesignNav(
  sections: DesignNavSection[],
  folder: string,
  tab: string | undefined,
): { section?: DesignNavSection; item?: DesignNavItem } {
  for (const s of sections) {
    const exact = s.items.find((i) => i.folder === folder && (i.tab ?? '') === (tab ?? ''));
    if (exact) return { section: s, item: exact };
  }
  for (const s of sections) {
    const loose = s.items.find((i) => i.folder === folder && !i.tab);
    if (loose) return { section: s, item: loose };
  }
  // A folder whose default sub-tab is unmapped: fall back to the first section
  // holding that folder.
  for (const s of sections) {
    const any = s.items.find((i) => i.folder === folder);
    if (any) return { section: s };
  }
  return {};
}
