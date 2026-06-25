/**
 * Studio screen-intent resolver (JB37-SCREEN-ROUTER-0624)
 *
 * Deterministic, code-path router for "show me / open / take me to [a screen]"
 * requests in the studio chat. Runs BEFORE the model on message submit so a
 * clean navigational phrase can never be reinterpreted by the LLM (which has
 * picked narrate / report-catalog / compute / artifact / modal on different
 * tries for the same ask).
 *
 * Conservative by design: only matches when the phrase is *just* a nav verb +
 * a known screen name. A qualifier ("...breakdown by phase") or a data question
 * ("what's the budget") falls through to `null` so the model answers normally.
 *
 * Resolution order:
 *   1. Alias table — phrases users say that don't match a folder/sub-tab label
 *      verbatim (e.g. "equity waterfall" → Capitalization · Equity).
 *   2. Exact match against the LIVE folder + sub-tab labels (no hardcoded
 *      taxonomy — labels differ by project type, so they come from folderConfig).
 *
 * Authored by Cowork; extended from the live `createFolderConfig` taxonomy and
 * wired into the studio send path by CC.
 */

import { formatFolderLabel, type FolderTab } from '@/lib/utils/folderTabConfig';

const NAV_VERB_RE =
  /^\s*(?:show me|open|take me to|go to|navigate to|bring up|pull up|let'?s (?:see|go to))\s+(?:the\s+)?(.+?)\s*$/i;

/**
 * Phrases users say that don't match a folder/sub-tab label verbatim, mapped to
 * `[folderId, subTabId?]`. The exact-match pass below already covers every real
 * folder/sub-tab label (Budget, Equity, Cash Flow, Land Use, …); these are the
 * synonyms and natural phrasings on top of that. Keyed by lowercased target.
 */
const SCREEN_ALIASES: Record<string, [string, string?]> = {
  // Capitalization
  'equity waterfall': ['capital', 'equity'],
  'waterfall': ['capital', 'equity'],
  'equity': ['capital', 'equity'],
  'debt': ['capital', 'debt'],
  'capital': ['capital', undefined],
  'cap stack': ['capital', undefined],
  'capital stack': ['capital', undefined],
  // Budget / Development (land)
  'budget': ['budget', 'budget'],
  'development budget': ['budget', 'budget'],
  'development': ['budget', 'budget'],
  'sales': ['budget', 'sales'],
  // Operations (income) — single page, no sub-tab
  'operations': ['operations', undefined],
  'operating statement': ['operations', undefined],
  'p&l': ['operations', undefined],
  // Feasibility (land)
  'cash flow': ['feasibility', 'cashflow'],
  'cashflow': ['feasibility', 'cashflow'],
  'returns': ['feasibility', 'returns'],
  'sensitivity': ['feasibility', 'sensitivity'],
  'feasibility': ['feasibility', undefined],
  // Valuation (income)
  'valuation': ['valuation', undefined],
  'sales comparison': ['valuation', 'sales-comparison'],
  'sales comps': ['valuation', 'sales-comparison'],
  'cost approach': ['valuation', 'cost'],
  'income approach': ['valuation', 'income'],
  'reconciliation': ['valuation', 'reconciliation'],
  // Property
  'property': ['property', undefined],
  'land use': ['property', 'land-use'],
  'parcels': ['property', 'parcels'],
  'rent roll': ['property', 'rent-roll'],
  'location': ['property', 'location'],
  'acquisition': ['property', 'acquisition'],
  // Documents / Reports / Map / Home
  'documents': ['documents', 'all'],
  'docs': ['documents', 'all'],
  'intelligence': ['documents', 'intelligence'],
  'reports': ['reports', undefined],
  'map': ['map', undefined],
  'home': ['home', undefined],
  'project home': ['home', undefined],
  'overview': ['home', undefined],
};

export interface ScreenIntent {
  folder: string;
  tab?: string;
  label: string;
}

/**
 * Resolve a chat message to a studio screen-navigation intent, or null when the
 * text is not a clean nav-verb + screen-name phrase (let the model handle it).
 *
 * @param text     Raw user message text.
 * @param folders  The LIVE folder list from `folderConfig.folders` (project-type
 *                 aware), so the exact-match pass uses real labels and ids.
 */
export function resolveScreenIntent(
  text: string,
  folders: FolderTab[],
): ScreenIntent | null {
  const m = NAV_VERB_RE.exec(text || '');
  if (!m) return null;

  let target = m[1].trim().toLowerCase().replace(/[.?!]+$/, '');
  // Strip a trailing UI-noun ("the budget screen/page/tab/grid/panel/view").
  target = target.replace(/\s+(screen|page|tab|grid|panel|view)$/i, '').trim();
  if (!target) return null;

  // 1) Alias table — only resolves if the aliased folder (and sub-tab, when the
  //    alias names one) is actually present in the live config. Income vs land
  //    expose different folders/sub-tabs, so an alias pointing at a screen this
  //    project type doesn't have falls through rather than opening the wrong
  //    surface (e.g. "land use" on an income project → fall through to null).
  const alias = SCREEN_ALIASES[target];
  if (alias) {
    const f = folders.find((x) => x.id === alias[0]);
    if (f) {
      if (alias[1]) {
        const sub = f.subTabs.find((s) => s.id === alias[1]);
        if (sub) return { folder: f.id, tab: sub.id, label: sub.label };
        // requested sub-tab absent for this project type → fall through.
      } else {
        return { folder: f.id, tab: undefined, label: formatFolderLabel(f.label) };
      }
    }
  }

  // 2) Exact match against the LIVE folder + sub-tab labels (no hardcoded taxonomy).
  for (const folder of folders) {
    if (target === formatFolderLabel(folder.label).toLowerCase()) {
      return { folder: folder.id, tab: undefined, label: formatFolderLabel(folder.label) };
    }
    for (const sub of folder.subTabs) {
      if (target === sub.label.toLowerCase()) {
        return { folder: folder.id, tab: sub.id, label: sub.label };
      }
    }
  }

  return null; // not a clean screen-nav request → let the model handle it
}
