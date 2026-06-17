# Classic View — Backend Read/Save Audit (Phase 1, Step 1)

**Session:** `LSCMD-DUALUI-0616-ec7`
**Branch:** `feature/classic-view-toggle`
**Date:** 2026-06-16
**Type:** Read-only discovery audit. No code changed, no DB writes, no app run. Findings traced from code paths only.

## Purpose

The legacy ARGUS-style tabbed UI (`/projects/[id]`) is being kept alive as a second modality alongside the chat-first `/w/` UI. This document records, per tab, **what reads correctly against the current backend** and **where the save paths go** after the `tbl_container`→`tbl_division` / `container_id`→`division_id` rename. It is the **scope document for the deferred Phase-2 save-path follow-up** — the broken/uncertain SAVE rows below define that work. No fixes were made here.

## Method

For each folder/tab the static call chain was traced: tab component → hooks (`src/hooks/use*.ts`, `src/components/**/hooks`) / API wrappers (`src/lib/api/*`) → actual endpoint. Each data source was classified:

- **Django** — hits `${DJANGO_API_URL}` / `${NEXT_PUBLIC_DJANGO_API_URL}` (local `http://127.0.0.1:8000`), or a Next.js route that proxies to Django.
- **Next.js legacy** — a local `/api/...` route under `src/app/api/**` (these run raw SQL via `@/lib/db` against Neon `land_v2`).
- **Direct DB** — component imports `sql` and queries inline (none found; components never touch the DB directly).

**Status legend.** READ/SAVE each scored:
- 🟢 **GREEN** — resolves against the current backend with confidence (endpoint exists; uses post-migration columns).
- 🟡 **YELLOW** — call path is well-formed and probably works, but resolution lives in a Django app that can't be confirmed by static trace alone (not executed under the read-only constraint).
- 🔴 **RED** — definitively broken: endpoint missing (404), unimplemented (501), or references a dropped table/column without an alias.

---

## Per-tab table

| # | Folder / Tab | Component | Data sources (classified) | READ | SAVE | Unaliased container refs |
|---|---|---|---|---|---|---|
| 1 | home | `ProjectTab.tsx` | `/api/projects/{id}/details`, `/api/projects/{id}/profile` (Next.js legacy, Direct DB); `/api/market/{geos,series}` (Next.js legacy) | 🟢 | 🟢 profile/details POST to working Direct-DB routes | none |
| 2 | property / location | `LocationSubTab.tsx` | `/api/market/{geos,series}`, `/api/market/analysis`(POST), `/api/market/analysis/{load,save}` (all Next.js legacy) | 🟢 | 🟢 `analysis/save` POST resolves; versioned write | none |
| 3 | property / market-supply | `MarketSupplySubTab.tsx` | `/api/projects/{id}/rental-comparables` (Next.js legacy, `FROM tbl_rental_comparable`) | 🟢 | — read-only tab (narratives are static placeholders) | none |
| 4 | property / property-details | `PropertyTab.tsx` (`details`) | `multifamily/{unit-types,units,leases}` (Django); `rental-comparables` (Next.js legacy); `documents`, `projects/{id}`, dynamic columns, grid-prefs (Django) | 🟢 | 🟢 writes go to Django (migration target) | none |
| 5 | property / rent-roll | `PropertyTab.tsx` (`rent-roll`) | Django `multifamily/units|leases` (PATCH); grid-preferences (PUT Django); rent-roll pending-changes / apply-delta (Django) | 🟢 | 🟢 all writes Django | none |
| 6 | property / renovation | `RenovationSubTab.tsx` | `/api/projects/{id}/operations/*` (GET + PUT inputs/settings) and `/api/projects/{id}/value-add` (GET/PUT) — Next.js legacy, raw SQL | 🟢 | 🟢 operations + value-add PUTs resolve | none |
| 7 | property / acquisition | `AcquisitionSubTab.tsx` → `AcquisitionLedgerGrid` | `acquisition/categories/`, `projects/{id}/acquisition/ledger/` (Django; POST/PATCH/DELETE) | 🟡 Django app not statically verifiable | 🟡 verb wiring correct; endpoint existence Django-side | none |
| 8 | property / market (Land) | `MarketTab.tsx` → `LandDevMarketContent` | `market/competitors/` (GET/POST/PATCH/DELETE), `sf-comps` (Next.js legacy) | 🟢 | 🟢 competitor CRUD resolves | none |
| 9 | property / land-use (Land) | `LandUseTab.tsx` → `LandUsePicker` | `landuse/families/`, `landuse/project-land-use/by_project/{id}/`, `.../toggle`, `.../toggle-product` (all Django) | 🟡 Django app not statically verifiable | 🟡 toggle POSTs Django; unverified | none |
| 10 | property / parcels (Land) | `ParcelsTab.tsx` → `PlanningContent` | `/api/{areas,phases,parcels}` (Next.js legacy, raw SQL vs **`tbl_area`/`tbl_phase`/`tbl_parcel`** — legacy hierarchy, NOT renamed); landuse dropdowns | 🟢 | 🟢 area/phase/parcel CRUD resolves | none |
| 11 | operations (Income) | `OperationsTab.tsx` | **READ** `projects/{id}/operations/` (Django, `tbl_operating_expenses`). **WRITE** inputs/settings PUT (Django) + `/api/opex/{categorize,add,bulk-delete}` + `projects/{id}/opex/{opexId}` (Next.js legacy, raw SQL) | 🟢 | 🟢 split read/write **agree on shape** — both target `tbl_operating_expenses` (verified). ⚠️ 4 inline `settings/` PUTs in component omit `getAuthHeaders()` (possible 401) | none |
| 11L | budget / budget (Land) | `BudgetTab.tsx` → `BudgetGridTab` | `/api/budget/gantt` (GET) + `gantt/items` (POST/PATCH/DELETE); `projects/{id}/containers` (all Next.js legacy) — reads/writes `fb.division_id` | 🟢 | 🟢 item CRUD writes `division_id` | none |
| 12L | budget / sales (Land) | `SalesTab.tsx` → `SalesContent` | `inventory-gauge`, `parcels-with-sales`, `pricing-assumptions(/bulk)`, `phases`, `containers` (exist); **`sale-phases`, `parcel-sale-phase`, `parcel-sales/overrides` (NO HANDLER)** | 🟡 grid reads OK; 3 secondary read paths 404 | 🔴 phase-assignment + per-parcel override saves **404 (no route)**; `pricing-assumptions/bulk` PUT works | none |
| 13 | valuation / sales-comparison | `ValuationTab.tsx` → `SalesComparisonApproach` | `projects/{id}/sales-comparables/*`, `valuation/adjustments/*` (Django) | 🟡 | 🟡 CRUD well-formed Django; unverified | none |
| 14 | valuation / cost | `CostApproachTab` | `valuation/cost-approach/by_project/{id}/`, depreciation, `containers/{id}/cost-metadata/` (Django) | 🟡 | 🟡 Django; unverified | none (`containerId` is a Django URL param, not SQL) |
| 15 | valuation / income | `IncomeApproachContent` | `valuation/income-approach/by_project/{id}/` (Django) | 🟡 | 🟡 Django; unverified | none |
| 16 | valuation / reconciliation | `ReconciliationPanel` | `valuation/reconciliation/by_project/{id}/` (Django) | 🟡 | 🟡 Django; unverified | none |
| 13F | feasibility / cashflow (Land) | `FeasibilityTab.tsx` → `CashFlowAnalysisTab` + `UnifiedAssumptionsPanel` | `projects/{id}/cash-flow/calculate/` (Django POST); `valuation/dcf-analysis/{id}/` (GET/PATCH Django); `growth-rate-sets/` (Django); `config`/`containers` (Next.js legacy) | 🟡 | 🟡 DCF auto-save PATCH Django; unverified | none |
| 14F | feasibility / returns (Land) | `FeasibilityTab.tsx` | static "Coming Soon" card — no data calls | 🟢 (stub) | — | none |
| 15F | feasibility / sensitivity (Land) | `FeasibilityTab.tsx` | static "Coming Soon" card — no data calls | 🟢 (stub) | — | none |
| 17 | capital / debt | `CapitalizationTab.tsx` → `DebtPage` | `projects/{id}/loans/` GET + POST/PATCH/DELETE (**Django direct**); cash-flow/calculate, interest-reserve (Django); `containers` (Next.js legacy) | 🟢 | 🟢 loan CRUD → real Django REST | none |
| 18 | capital / equity | `CapitalizationTab.tsx` → `EquityPage` | **Equity Partners** `projects/{id}/equity/partners` (Next.js **STUB**); Waterfall `waterfall/{calculate,last-result,napkin}` + `tbl_waterfall_tier` (Direct DB / Django proxy) | 🔴 partners table always empty (stub returns `{partners:[]}`) | 🔴 partners POST/PUT/DELETE return **501**; table `onEdit`/`onDelete` are no-ops. Waterfall napkin POST works | none |
| 19 | reports | `ReportsTab.tsx` | `report-definitions/by-type/{type}/`, `reports/export/{code}/{id}/` (all Django) | 🟢 | 🟢 export = read/generate; generators repointed to `tbl_division` | none |
| 20 | documents / all | `DocumentsTab.tsx` → `DMSView` + `ProjectMediaGallery` | `/api/dms/*` (Next.js legacy, DMS db + Meilisearch); `knowledge/documents/{id}/process/` (Django reprocess) | 🟢 | 🟢 upload/profile/move/reprocess resolve | none |
| 21 | documents / intelligence | `IntelligenceTab.tsx` | `intake/start/`, `landscaper/projects/{id}/overrides/`, `intake/{uuid}/re_extract/`, `overrides/{id}/revert/` (all Django) | 🟢 | 🟢 re-extract/revert POST Django. ⚠️ errors swallowed (`console.warn`→null) — silent failure | none |
| 22 | map | `MapTab` (`@/components/map-tab`) | `useMapFeatures` (Django persist); `sales-comparables` (Django); `rental-comparables`, `details`, `profile`, `gis/*` (Next.js legacy); demographics/sf-comps/competitors hooks | 🟡 large surface; not every GIS route individually traced | 🟡 feature/boundary save → Django/GIS (shipped #79/#80); not exercised | none |

> Tab numbering is per visible surface; folder/tab visibility is property-type-gated (income vs land-dev), so a single project never shows all rows at once. `L`/`F` suffixes mark land-dev-only surfaces (budget/feasibility) that occupy the same folder positions as income operations/valuation. This enumerates ~26 reachable surfaces across the 8 folders (the handoff's "~22 tabs" is the income-path subset).

---

## Item 5 — Unaliased container/division references

**None.** Every Next.js route any tab calls was grepped for `tbl_container`, `container_id`, `container_level`, and `level_N_label`. There are **zero unaliased stragglers**. The only matches are legitimate, intentionally-unrenamed columns:

- `src/app/api/projects/[projectId]/containers/route.ts:133` — `LEFT JOIN tbl_inventory_item i ON i.container_id = c.division_id`. `tbl_inventory_item.container_id` is a real current column (confirmed in `database.ts:7808`), correctly joined to `tbl_division.division_id`. Not a straggler.
- `management_overhead.container_id` — real column on a different table with its own migration history (per CLAUDE.md); not reached by these tabs.
- `containers/{containerId}/cost-metadata/` (valuation/cost) — `containerId` is a Django route **path param**, not a SQL column.
- Dead `route_old.ts` files contain old references but are not imported anywhere.

The container→division rename is **fully absorbed** in the legacy tab surface.

---

## Rollup

**READ status (≈26 surfaces audited):**
- 🟢 GREEN: 16 — home, location, market-supply, property-details, rent-roll, renovation, market(land), parcels, budget, operations, reports, documents/all, documents/intelligence, capital/debt, + 2 feasibility stubs.
- 🟡 YELLOW: 9 — acquisition, land-use, feasibility/cashflow, valuation ×4 (sales-comparison/cost/income/reconciliation), map, sales-grid (secondary paths). All YELLOW reasons are "Django app not executed under read-only constraint," **not** evidence of breakage. A live smoke test against a seeded project would clear most to GREEN.
- 🔴 RED: 1 read surface — capital/equity **partners table** (renders empty unconditionally).

**SAVE status — the deferred-follow-up scope:**
- 🟢 working saves: home, location, renovation, property-details, rent-roll, market(land), parcels, budget, operations, capital/debt, documents (all + intelligence), reports-export.
- 🟡 unverified Django saves: acquisition, land-use, valuation ×4, feasibility/DCF, map. Verify against a seeded project before trusting.
- 🔴 **broken saves (Phase-2 work):**
  1. **capital/equity — Equity Partners** (`equity/partners` POST=501, `partners/[id]` PUT/DELETE=501; table handlers are no-ops). A complete Direct-DB equity CRUD route exists at `/api/capitalization/equity/route.ts` but is **dead relative to this tab** — wiring the EquityPage to it (or finishing the stub) is the fix.
  2. **budget/sales — phase assignment + per-parcel overrides** (`sale-phases`, `parcel-sale-phase`, `parcel-sales/overrides` have no `route.ts` → 404). The grid reads fine; only these phase/override mutations are dead.

**Riskiest 3–5 spots:**
1. 🔴 **Equity Partners (capital/equity)** — empty read + 501 saves. Pre-existing unimplemented stub, surfaced now because the classic view exposes it.
2. 🔴 **Sales phase/override saves (budget/sales, land-dev)** — three missing route handlers; secondary feature, but silent 404 on save.
3. 🟡 **Valuation ×4 + Feasibility cash-flow** — entirely on Django `/api/valuation/*` and `/cash-flow/calculate/`; documented ✅ in CLAUDE.md but not executed here. Highest-value reads to smoke-test.
4. ⚠️ **`waterfall/calculate/route.ts:11`** — defaults `DJANGO_API_URL` to port **8001** (vs 8000 elsewhere). Works locally because `.env.local` sets it; a **deploy-config trap** if the var is ever unset.
5. ⚠️ **Operations inline `settings/` PUTs** (`OperationsTab.tsx:303,311,331,342`) omit `getAuthHeaders()` while the hook's equivalent calls include them — possible 401 on provenance/vacancy/mgmt-fee writes.

**Size read:**
- **"All tabs reading" — SMALL.** Reads are already overwhelmingly healthy. The only read defect is the Equity Partners stub. Clearing the YELLOWs is verification work (smoke-test a seeded project), not code.
- **"All tabs reading AND saving" — MEDIUM.** Two concrete save fixes (equity partners wiring/implementation; three missing sales-phase routes) plus the two ⚠️ hardening nits (waterfall port default, operations auth headers), plus confirming the YELLOW Django save paths. None are container-migration fallout — they are pre-existing gaps the classic view re-exposes.

**Migration verdict:** The `tbl_container`→`tbl_division` rename did **not** break any tab in the classic surface. Every break found predates it. The dual-modality goal — both UIs reading the same backend — is well-supported on the read side today.
