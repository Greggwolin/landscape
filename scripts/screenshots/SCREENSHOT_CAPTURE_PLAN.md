# Screenshot Capture Plan
Session: LSCMD-CW-SCREENSHOTS-0610-ZK19
Date: 2026-06-10
Discovered from live repo @ main (a1977e37) + live DB — not from docs or memory.

## Corrections vs. older docs
- **No project named "Peoria Lakes" exists in the database.** The populated land-development demo is **Peoria Meadows (project_id 9)**: 43 parcels, 8 phases, 30 budget rows, 3 docs.
- **Multifamily subject: Chadron Terrace (project_id 17)**: 113 units, 19 operating-expense rows, 7 docs.
- `src/lib/utils/folderTabConfig.ts` exists and is live (CLAUDE.md claims it was deleted — wrong; FolderTabs.tsx imports it).

## Auth (discovered from src/app/login/LoginForm.tsx)
- Route: `/login`
- Selectors: `#username` (text), `#password` (password), `button[type="submit"]`
- First-ever login for a username may show an Alpha TOS checkbox (`input[type="checkbox"]`) that must be checked before submit — script handles it if present.
- Success → client-side redirect to `/w/dashboard`. Auth is a localStorage JWT (`auth_tokens`), so all captures run in the same browser context after one UI login.

## Surface 1 — chat-first `/w/` routes (live route tree)
| Route | View |
|---|---|
| `/w/dashboard` | Home dashboard (recent chats, project tiles, artifacts rail) |
| `/w/chat` | Unassigned Landscaper chat — 3-panel headline shot |
| `/w/projects` | Project list |
| `/w/projects/[id]` | Project homepage (tile grid + chat) |
| `/w/projects/[id]/documents` | Documents panel |
| `/w/projects/[id]/map` | Map / GIS |
| `/w/projects/[id]/reports` | Reports |
| (also exist, not captured: `/w/admin`, `/w/help`, `/w/tools`, `/w/landscaper-ai`, `/w/platform-knowledge`, `/w/chat/[threadId]`) |

## Surface 2 — legacy folder/tab `/projects/[id]?folder=X&tab=Y`
Folder ids from `folderTabConfig.ts` (vary by project type):

**Land (Peoria Meadows, 9):** `home` · `property` (location, market, land-use, parcels, acquisition) · `budget` ("Development/Sales": budget, sales) · `feasibility` ("Feasibility/Valuation": cashflow, returns, sensitivity) · `capital` (debt, equity) · `reports` · `documents` (all, intelligence) · `map`

**Income (Chadron Terrace, 17):** `home` · `property` (location, market, property-details, rent-roll, renovation, acquisition) · `operations` (single P&L page, no subtabs) · `valuation` (sales-comparison, cost, income, reconciliation) · `capital` · `reports` · `documents` · `map`

## Capture list (ordered; built from the above)
Chat-first (headline):
1. `w-dashboard` — `/w/dashboard`
2. `w-chat` — `/w/chat` — the "describe the deal" 3-panel view
3. `w-project-home` — `/w/projects/9`
4. `w-project-documents` — `/w/projects/9/documents` (+ `_b`)
5. `w-project-map` — `/w/projects/9/map`
6. `w-project-reports` — `/w/projects/9/reports`

Tab surface — land depth (Peoria Meadows):
7. `land-overview` — `?folder=home`
8. `land-land-use` — `?folder=property&tab=land-use`
9. `land-parcels` — `?folder=property&tab=parcels` (+ `_b`)
10. `land-budget-grid` — `?folder=budget&tab=budget` (+ `_b`, fullPage)
11. `land-sales-absorption` — `?folder=budget&tab=sales` — phasing/absorption differentiator (+ `_b`)
12. `land-cashflow` — `?folder=feasibility&tab=cashflow` (+ `_b`, fullPage)
13. `land-returns` — `?folder=feasibility&tab=returns`
14. `land-capitalization` — `?folder=capital&tab=debt`
15. `land-reports` — `?folder=reports`
16. `land-documents` — `?folder=documents&tab=all`
17. `land-map` — `?folder=map`

Tab surface — income depth (Chadron Terrace):
18. `mf-operations` — `?folder=operations` — the proforma / P&L (+ `_b`, fullPage)
19. `mf-rent-roll` — `?folder=property&tab=rent-roll` (+ `_b`)
20. `mf-income-approach` — `?folder=valuation&tab=income` — income-approach differentiator (+ `_b`)
21. `mf-reconciliation` — `?folder=valuation&tab=reconciliation`

## Data-dependency notes
- All land views verified non-empty for project 9 (parcels/phases/budget present in DB).
- MF Operations and Rent Roll verified non-empty for project 17 (opex + unit rows present).
- Valuation views (income approach, reconciliation) depend on completed analysis state; if blank at run time, the runner notes it and keeps the shot out of the demo set.
- Map views need MapLibre tile loads — networkidle alone is insufficient; script adds a canvas-presence wait + settle delay.

## Specs
- Viewport 1440×900, deviceScaleFactor 2, Chromium (system Chrome per `playwright.config.ts` convention)
- `{view-name}.png` viewport shot; `{view-name}_b.png` below-the-fold (fullPage where flagged)
- Output: `reference/images/screenshots/capture-<YYYYMMDD-HHMM>/` (existing screenshots home; images stay uncommitted)
- Credentials via env: `LANDSCAPE_USER`, `LANDSCAPE_PASS`, `LANDSCAPE_BASE_URL` (default `http://localhost:3000`)
