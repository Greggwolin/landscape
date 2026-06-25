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
  'property details': ['property', 'property-details'],
  'details': ['property', 'property-details'],
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

/** Classic Levenshtein edit distance (small strings — screen labels/aliases). */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Max edit distance allowed for a fuzzy hit, scaled by candidate length and
 * capped at 2 (JB45). Short labels (map, debt, cost, home) require an exact
 * match — fuzzing 3–4 char words yields nonsense ("cap" → "map"). Only longer
 * labels tolerate typos, which is where real typos happen ("propery details").
 */
function fuzzyThreshold(key: string): number {
  if (key.length <= 4) return 0; // map / debt / cost / home / docs / p&l / sales
  if (key.length <= 7) return 1; // budget / equity / returns / reports / parcels
  return 2; //                      property details / land use / sales comparison
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

  // 3) Typo-tolerant fuzzy pass (JB45). Only reached AFTER NAV_VERB_RE matched
  //    (the phrase is already navigational) and both exact passes failed. Accept
  //    the closest screen label/alias within a length-scaled edit distance (≤ 2),
  //    so "propery details" still opens Property Details — while qualified phrases
  //    ("budget breakdown by phase") and data questions stay far from any label
  //    and return null (→ model). Candidates are built ONLY from screens this
  //    project type actually exposes, so no cross-type misfire.
  type Cand = { key: string; folder: string; tab?: string; label: string };
  const candidates: Cand[] = [];
  for (const [key, [folderId, subId]] of Object.entries(SCREEN_ALIASES)) {
    const f = folders.find((x) => x.id === folderId);
    if (!f) continue;
    if (subId) {
      const sub = f.subTabs.find((s) => s.id === subId);
      if (sub) candidates.push({ key, folder: f.id, tab: sub.id, label: sub.label });
    } else {
      candidates.push({ key, folder: f.id, label: formatFolderLabel(f.label) });
    }
  }
  for (const folder of folders) {
    candidates.push({
      key: formatFolderLabel(folder.label).toLowerCase(),
      folder: folder.id,
      label: formatFolderLabel(folder.label),
    });
    for (const sub of folder.subTabs) {
      candidates.push({ key: sub.label.toLowerCase(), folder: folder.id, tab: sub.id, label: sub.label });
    }
  }

  let best: { cand: Cand; dist: number } | null = null;
  for (const cand of candidates) {
    const dist = levenshtein(target, cand.key);
    if (dist <= fuzzyThreshold(cand.key) && (best === null || dist < best.dist)) {
      best = { cand, dist };
    }
  }
  if (best) {
    return { folder: best.cand.folder, tab: best.cand.tab, label: best.cand.label };
  }

  return null; // not close to any real screen → let the model handle it
}
