# Jurisdiction Data-Source Registry & Discovery Playbook

**Status:** Design / Proposed (not yet implemented)
**Last Updated:** June 8, 2026
**Author:** Drafted with Cowork from the CBLF1 / Red Valley Ranch (Maricopa) reference build
**Related:** `LANDSCAPE_AI_INGESTION_BRIEF.md`, `PROJECT_SETUP_WIZARD.md`, `comp-ingestion-workbench-spec.md`, `docs/02-features/gis/`

---

## 1. Purpose

When a user creates a project, Landscaper should know — from the project's **jurisdiction** (city / county / state) and **property type** — which public data sources exist for that location, how to pull them, and where the data lands in the Landscape schema. Today none of that is modeled; the only artifact is the `project.jurisdiction_integrated` boolean, which is a flag with nothing behind it.

This capability was proven end-to-end for one jurisdiction — the City of Maricopa / Pinal County, Arizona — during the CBLF1 / Red Valley Ranch work. That build took several days of trial-and-error to discover the right endpoints, report identifiers, GIS layers, and field mappings. **This spec exists to convert that one-off, hard-won knowledge into a reusable, config-driven system** so that onboarding a new jurisdiction is a configuration task (and increasingly an automated discovery task), not a multi-day engineering excavation.

### Non-goals
1. This is not a port of the 15 Maricopa scripts. Most of those scripts are transforms and report renderers that already have homes in Landscape (`reports`, `sales_absorption`, the Next UI). Only the *extractors* migrate.
2. This does not promise national coverage on day one. It establishes the framework and seeds it with one fully-worked jurisdiction.
3. This does not replace the document-extraction pipeline (`LANDSCAPE_AI_INGESTION_BRIEF.md`). That handles uploaded files (OMs, rent rolls); this handles **live public data feeds**.

---

## 2. Key insight: vendors, not jurisdictions

The Maricopa build looks like 15 bespoke integrations. Under the hood it is **four vendor integrations** with Maricopa-specific identifiers passed in. The vendors (SmartGov, Legistar/Granicus, ArcGIS, FRED/Census) each serve hundreds-to-thousands of municipalities. The reusable asset is one tested **adapter per vendor**; the per-jurisdiction work collapses to a small config record.

| Source type | Vendor (write adapter once) | URL shape | Per-jurisdiction config = only this |
|---|---|---|---|
| Building permits | **SmartGov** | `{client}.smartgovcommunity.com/Public/Report/RunReport?Id={reportGUID}` | subdomain + report GUID |
| Entitlements / agenda | **Legistar** (Granicus) | `webapi.legistar.com/v1/{client}` | client slug + matter-type IDs |
| Parcels / assessor | **ArcGIS FeatureServer** | `{host}/arcgis/rest/services/{service}/FeatureServer/{layer}/query` | service URL + field map |
| Macro market series | **FRED / Census / BLS / FHFA** | national, keyed by CBSA / FIPS | geography code only *(adapters already exist in Landscape)* |

The corollary: the system's value scales with **vendor coverage**, not jurisdiction count. Adding the Accela, CivicPlus/CitizenServe, Granicus-LegistarV2, Socrata (open-data), and Tyler vendors to the adapter library unlocks a large share of U.S. municipalities at once.

---

## 3. Architecture (six components)

1. **Source-type taxonomy** — the vendor-agnostic catalog of *what kinds* of data exist (§4).
2. **Vendor adapters** — one tested implementation per vendor, conforming to a common contract (§5).
3. **Jurisdiction data-source registry** — DB tables mapping `(jurisdiction, source_type) → {vendor, params, field_map, schedule, maturity}` (§6).
4. **Property-type → required-source matrix** — drives the "depending on the type" logic (§7).
5. **Discovery playbook** — the codified hunt that proposes registry rows for a new jurisdiction, with a data-maturity tier per source (§8).
6. **Entry points + Landscaper tools** — pre-project recon *and* project-creation onboarding (§9).

### Design principle: project-independent by default
The registry is keyed on **jurisdiction, not project** (§6). Discovery, source listing, maturity assessment, and one-off data previews must therefore work in **unassigned threads** (`project_id IS NULL`) — a user doing reconnaissance on an area where no project exists yet is the common case, not the edge case. This mirrors `generate_location_brief`, which already fires on unassigned `/w/chat` routes. Only *persistent, scheduled ingestion into a project's tables* requires a project; everything upstream of that does not.

---

## 4. Source-type taxonomy

Each source type is generic; the vendor is an attribute, not part of the type.

| `source_type` | Cardinality | Typical vendors | Lands in (existing Landscape) |
|---|---|---|---|
| `permit` | event stream (per permit) | SmartGov, Accela, CitizenServe, Tyler EnerGov, Socrata | **NEW** `permit_event` table |
| `entitlement` | event stream (per matter/action) | Legistar/Granicus, CivicClerk, PrimeGov, novusAGENDA | **NEW** `entitlement_event` (log) only; promotion into `market_competitive_projects` is an explicit user action (§15.4) |
| `parcel` | snapshot + change log | ArcGIS FeatureServer, Socrata, county REST | `tbl_parcel`, `tbl_parcel_sale_event`, `gis` app + **NEW** snapshot/transition table |
| `macro` | time series | FRED, Census ACS, BLS, FHFA, NAHB | `market_macro_data`, `tbl_market_series`, `tbl_market_observation` *(adapters exist)* |
| `comps` | records | MLS exports, CoStar, public records | sale: `tbl_sales_comp_*`; **rental/lease: `tbl_rental_comparable`**; expense: `tbl_expense_comparable` |

---

## 5. Vendor adapter contract

Every adapter implements the same interface so the ingestion layer is vendor-agnostic. An adapter is responsible for exactly three things: building the request from a registry config record, fetching (with the vendor's pagination/auth quirks), and normalizing the raw payload into the canonical row shape for its `source_type`. Adapters never write to the database — they return normalized rows; the ingestion command persists them. This keeps the file-vs-DB sink decision and provenance bookkeeping in one place.

Conceptually each adapter exposes:
1. `probe(jurisdiction)` → does this vendor serve this jurisdiction, and at what data-maturity tier (used by Discovery, §8).
2. `fetch(config, window)` → raw records for a date/extent window.
3. `normalize(raw)` → canonical rows for the source type, plus a provenance stub (`data_source`, `source_url`).

### Vendor library (initial → target)

| Vendor | Source type(s) | Status | Notes |
|---|---|---|---|
| SmartGov | permit | Reference (Maricopa) | Public `RunReport` endpoint, no auth; per-report GUID |
| Legistar (Granicus) | entitlement | Reference (Maricopa) | OData REST, no auth; client slug + matter-type IDs |
| ArcGIS FeatureServer | parcel | Reference (Maricopa/Pinal) | Universal REST `/query`; field names vary per service |
| FRED / Census / BLS / FHFA | macro | **Already in Landscape** | `services/market_ingest_py/*_client.py` |
| Accela Civic Platform | permit / entitlement | Target | Large vendor; OAuth; high coverage |
| Socrata (open data) | permit / parcel | Target | SODA API; covers many large cities |
| CitizenServe / CivicPlus | permit | Target | Long-tail mid-size cities |
| Tyler EnerGov | permit | Target | Common in larger counties |

---

## 6. Jurisdiction data-source registry (new schema)

Two new tables. Naming follows the `tbl_` convention; final names TBD against the schema-naming pass.

### 6.1 `tbl_jurisdiction`
One row per governing jurisdiction. Distinguishes the **permitting authority** (often the city) from the **assessor authority** (often the county) — a distinction the Maricopa build proved matters: permits come from the City of Maricopa (SmartGov), parcels from Pinal County (ArcGIS).

| Column | Purpose |
|---|---|
| `jurisdiction_id` (PK) | — |
| `name`, `kind` | e.g., "City of Maricopa" / `city`; "Pinal County" / `county` |
| `state`, `county`, `cbsa_code`, `fips` | geo keys; ties to existing `geo_xwalk` / `cbsa_lookup` |
| `parent_jurisdiction_id` (self-FK) | city → county → state rollup |
| `maturity_overall` | full / partial / pdf_only / manual / none (worst of its sources) |

### 6.2 `tbl_jurisdiction_data_source`
One row per `(jurisdiction, source_type)`. This is the heart of the system — the config that an adapter consumes.

| Column | Purpose |
|---|---|
| `id` (PK) | — |
| `jurisdiction_id` (FK) | — |
| `source_type` | `permit` \| `entitlement` \| `parcel` \| `macro` \| `comps` |
| `vendor` | `smartgov` \| `legistar` \| `arcgis` \| `fred` … (selects the adapter) |
| `endpoint` | base URL or host |
| `params` (JSONB) | vendor-specific identifiers (report GUID, client slug, matter-type IDs, layer index) |
| `field_map` (JSONB) | source field → canonical field (e.g., `PARCELID → apn`) |
| `maturity` | full / partial / pdf_only / manual / none |
| `schedule` | cron or cadence label (`weekly`, `monthly`, `tue_wed`) |
| `requires_worker` | bool — true if the job is too heavy/slow for serverless (§10) |
| `status` | `active` \| `proposed` \| `disabled` |
| `discovered_by`, `confirmed_by`, `last_run_at` | provenance / lifecycle |

Provenance of *ingested rows* continues to use the existing `ai_ingestion_history` table and the `data_source` / `source_url` columns already present on `market_macro_data`, `market_competitive_projects`, etc.

---

## 7. Property-type → required-source matrix

Drives what Landscaper looks for on project creation. Marked cells are sources whose absence should be surfaced as a data gap for that property type.

| Property type | `permit` | `entitlement` | `parcel` | `comps` | `macro` |
|---|:---:|:---:|:---:|:---:|:---:|
| Land development | ✓ | ✓ | ✓ | ✓ (land) | ✓ |
| Multifamily | ✓ | — | ✓ | ✓ (rent) | ✓ |
| Retail / Office | — | ✓ | ✓ | ✓ (sale) | ✓ |
| Industrial | — | ✓ | ✓ | ✓ (sale) | ✓ |

The matrix is data, not code — store it as a small lookup so it is tunable without a deploy.

---

## 8. Discovery playbook (the captured "brain")

Given a new project's jurisdiction, Discovery proposes `tbl_jurisdiction_data_source` rows by probing known vendors per source type. It returns a **maturity tier**, never a naked pass/fail — because most jurisdictions are not Maricopa.

### 8.1 Maturity tiers
1. `full` — machine-readable API returning structured records (Maricopa permits, Pinal parcels).
2. `partial` — API exists but thin/inconsistent (some fields only in attachments).
3. `pdf_only` — data exists but only as PDF agendas/reports; requires OCR/extraction, no clean feed.
4. `manual` — exists only via portal lookups / no programmatic access.
5. `none` — no discoverable source.

The registry carries the tier so Landscaper sets honest expectations instead of fabricating a feed — consistent with the cross-property fabrication guardrails already in `ai_handler.py`.

### 8.2 Probes per source type
1. **Permits / SmartGov:** resolve candidate subdomains from the city name (`ci-{slug}-{st}.smartgovcommunity.com` and variants), test for a public report catalog, identify the SFR/site-dev report GUID. Fall through to Accela/Socrata/CitizenServe probes.
2. **Entitlements / Legistar:** try `webapi.legistar.com/v1/{slug}` against city-name slug variants; if live, enumerate `MatterType` to map the local IDs for Rezoning / PAD / Subdivision / GPA (these IDs are **per-client**, not global). Fall through to Granicus/CivicClerk.
3. **Parcels / ArcGIS:** query the state and county ArcGIS catalogs for a parcel/tax layer; confirm a queryable `FeatureServer` layer and sample its fields to build `field_map`. *Note: even within Maricopa, three different ArcGIS hosts were tried before one served clean parcels — "find the parcel layer" is itself a sub-search, not a constant.*
4. **Macro:** deterministic — resolve CBSA/FIPS from the existing geo bootstrap and reuse the existing FRED/Census clients. No discovery needed.

### 8.3 Flow
Discovery runs as a Landscaper tool **with or without a project** (§9.1). It writes `status='proposed'` rows against the *jurisdiction* (not a project) with the detected maturity, and surfaces them for user confirmation (Level 2 autonomy — propose, user confirms). On confirmation, rows flip to `active`. If a project later exists in that jurisdiction, its `jurisdiction_integrated` flag is derived from the registry, not set by hand.

---

## 9. Entry points + Landscaper tools

There are two ways in, and the capability must work from both. The pre-project path is primary.

### 9.1 Entry point A — pre-project recon (unassigned thread, no project)
A user is exploring an area and says, e.g., "what permit and parcel data can I get for Buckeye, AZ?" Landscaper resolves (or discovers) the jurisdiction, returns what sources exist and at what maturity tier, and can run a **one-off preview pull** (a bounded sample) rendered as an artifact. Nothing is persisted to a project because there is none. The jurisdiction and its discovered data-source rows *are* persisted (they are project-independent, §6), so the recon is not thrown away — it pre-warms any project later created in that jurisdiction.

This path is the reason discovery and preview tools live in `UNASSIGNED_SAFE_TOOLS`, not merely `UNIVERSAL_TOOLS`. (Per CLAUDE.md, unassigned threads only receive the `UNASSIGNED_SAFE_TOOLS` whitelist; `generate_location_brief` is the precedent — registered in both lists.)

### 9.2 Entry point B — project creation / jurisdiction edit
On project create, resolve `tbl_jurisdiction` from city/county/state. Then:
1. If active data-source rows exist (possibly already discovered during recon) → enable scheduled ingestion for the source types the property type requires (§7).
2. If the jurisdiction is unknown → offer Discovery. Do not auto-run a multi-vendor probe without intent — mirror the location-brief fire/offer discipline in CLAUDE.md.

### 9.3 New Landscaper tools (proposed)
| Tool | Needs a project? | Whitelist |
|---|---|---|
| `discover_jurisdiction_sources(location)` — run the playbook, return proposed rows + maturity | No | `UNASSIGNED_SAFE_TOOLS` + `UNIVERSAL_TOOLS` |
| `list_jurisdiction_sources(location)` — show what's wired/discoverable + maturity tiers | No | `UNASSIGNED_SAFE_TOOLS` + `UNIVERSAL_TOOLS` |
| `preview_jurisdiction_data(source_id, window)` — bounded one-off sample pull → artifact, no persistence | No | `UNASSIGNED_SAFE_TOOLS` + `UNIVERSAL_TOOLS` |
| `confirm_jurisdiction_source(source_id)` — flip a proposed row to active | No (acts on jurisdiction) | `UNASSIGNED_SAFE_TOOLS` + `UNIVERSAL_TOOLS` |
| `run_ingestion(source_id, project_id, window)` — persistent pull into project tables (respects `requires_worker`) | **Yes** | project-scoped only |
| `promote_entitlement_to_competitive_project(event_id)` — explicit promotion from the event log into `market_competitive_projects` (§15.4) | Optional | `UNASSIGNED_SAFE_TOOLS` + project-scoped |

The split is the key design move: everything up to and including a **preview** is project-free; only **persistent ingestion into project tables** requires a project. `location` is a free-form place string (city/county/state) resolved via the existing geo bootstrap, so the recon tools never depend on a `project_id`.

---

## 10. Ingestion execution model

1. **Pattern:** re-home each extractor as a Django management command following the existing `ingest_hbaca` / `ingest_zonda` convention — thin command wrapper + fetch/parse library under `tools/market_ingest/`, with `--dry-run` and `--verbose`. The Maricopa scripts already have `--dry-run`, so they fit.
2. **Where it runs:** lightweight pulls (SmartGov report, parcel query) can run on a schedule from the Django host. **Heavy jobs must not run on Vercel** — the Legistar crawler downloads PDFs and runs pymupdf for minutes, which exceeds serverless function limits. These carry `requires_worker = true` and run on a real host (a Railway worker, or the existing Mac scheduled-task pattern) — never a serverless function.
3. **Scheduling:** the registry's `schedule` column is the source of truth; a single dispatcher reads active rows and fires the matching command. Maricopa cadences observed: permits weekly, agenda Tue/Wed, macro monthly (2nd).
4. **Sink:** adapters return normalized rows; the command writes to the mapped Landscape table and stamps `ai_ingestion_history`. The legacy `.xlsx` / `.gdb` / `pipeline_db.json` sinks are **dropped** — Postgres (and PostGIS via the `gis` app) is the system of record.

---

## 11. Maricopa reference configuration (worked example)

The seed rows that make Maricopa the first fully-integrated jurisdiction. Values verified against the CBLF1 source scripts.

### `tbl_jurisdiction`
| name | kind | state | county | role |
|---|---|---|---|---|
| City of Maricopa | city | AZ | Pinal | permitting + entitlement authority |
| Pinal County | county | AZ | Pinal | assessor / parcel authority |

### `tbl_jurisdiction_data_source` (active rows)

| source_type | vendor | endpoint | params (key values) | maturity | schedule | worker |
|---|---|---|---|---|---|---|
| permit | smartgov | `ci-maricopa-az.smartgovcommunity.com/Public/Report/RunReport` | `Id=818a9a67-f78e-4ff2-b750-5f886cb30c10`; date params `STARTDATE`/`ENDDATE`/`CaseNumber` | full | weekly | no |
| entitlement | legistar | `webapi.legistar.com/v1/maricopa` | `MatterTypeId` 112=Rezoning, 126=PAD, 108=Subdivision, 134=GPA (crawler also 99/65/96/124/125); filter `MatterIntroDate ge datetime'{since}'` | full (PDF attachments → `pdf_only` sub-step) | tue_wed | yes (PDF crawl) |
| parcel | arcgis | `gis.pinal.gov/mapping/rest/services/TaxParcels/FeatureServer/3/query` | layer 3; `field_map`: `PARCELID→apn`, `OWNERNME1→owner`, `SALEDATE→sale_date`, `SALEPRICE→sale_price`, `RESYRBLT→year_built`, `CNVYNAME→grantee` | full | weekly | no |
| macro | fred+census | national | CBSA = Phoenix-Mesa-Chandler; reuse `services/market_ingest_py` clients | full | monthly | no |

Discovery alternates encountered for the parcel layer (kept as fallbacks, evidence that parcel discovery is non-trivial): AZ DWR statewide (`azwatermaps.azwater.gov/.../Parcels_for_TEST/FeatureServer/7`) and an ArcGIS-Online hosted county layer (`services7.arcgis.com/.../County_Tax_Parcels_SmartGov/FeatureServer/0`).

---

## 12. Mapping to existing Landscape schema

| Maricopa extractor | Canonical source_type | Lands in | New schema needed |
|---|---|---|---|
| `maricopa_permit_updater` | permit | `permit_event` | yes — table + `ingest_smartgov` command |
| `maricopa_pipeline_crawler` / `agenda_monitor` | entitlement | `entitlement_event` (log only; promote-on-demand into `market_competitive_projects`, §15.4) | event-log table; PDF crawl worker; promotion tool |
| `lot_snapshot` | parcel | `tbl_parcel`, `tbl_parcel_sale_event` + snapshot/transition table | time-series table |
| `maricopa_inventory_gis_sync` | parcel (geometry) | `gis` app / PostGIS | re-target sink (rewrite, not port) |
| `housing_monthly_update` (FRED/HBACA) | macro | `market_macro_data` | **none — already exists**, dedup against `fred_client` / `ingest_hbaca` |
| `parcel_register_builder`, `project_hierarchy_builder` | — | Django services on the above | rebuild as transforms, not extractors |
| `maricopa_demand_map`, `maricopa_permit_report` | — | Next UI + `reports` app | replace, do not port |

---

## 13. Risks

1. **Discovery has a ceiling.** Big counties have APIs; a large share of jurisdictions have no machine-readable permit data. The maturity tiers (§8.1) are the mitigation — the system must degrade honestly, not fabricate feeds.
2. **Vendor long tail.** Four adapters cover Maricopa; national usefulness needs the §5 target vendors. Coverage is a roadmap, not a v1 claim.
3. **Legistar matter-type IDs are per-client.** They cannot be hardcoded globally; Discovery must enumerate them per jurisdiction.
4. **Parcel field names vary per ArcGIS service.** `field_map` is mandatory per row; there is no universal schema.
5. **Heavy jobs ≠ serverless.** The PDF-crawl entitlement path will silently time out on Vercel. `requires_worker` must gate it onto a real host.
6. **GIS sink is a rewrite.** The `.gdb` writer has no web equivalent; geometry goes to PostGIS.

---

## 14. Build sequence

1. **Skeleton** — `tbl_jurisdiction` + `tbl_jurisdiction_data_source` + the source-type taxonomy and property-type matrix lookups. No behavior yet.
2. **Adapter contract + SmartGov** — define the adapter interface; implement `SmartGovAdapter` + `permit_event` table + `ingest_smartgov` command reading Maricopa's registry row. Proves the abstraction against the cleanest source (pure API → rows, no existing dedup mess).
3. **Legistar + ArcGIS adapters** — entitlement event log + parcel snapshot, reading Maricopa registry rows. Stand up the worker path for the PDF crawl.
4. **Discovery playbook + recon tools** — probes per source type, maturity tiering, propose/confirm flow, and the project-free tools (`discover` / `list` / `preview` / `confirm`) wired into `UNASSIGNED_SAFE_TOOLS`. Ship recon *before* the project hook — it is the primary entry point (§9.1).
5. **Project-creation hook** — `run_ingestion` (project-scoped) + back the `jurisdiction_integrated` flag with the registry.
6. **Second jurisdiction** — onboard a non-Maricopa city end-to-end. This is the real test of portability; expect it to expose hardcoded Maricopa assumptions.

---

## 15. Open questions

Disposition noted per item — most are implementer's-choice, not product decisions.

1. Final table names (`tbl_jurisdiction*` vs `market_*`). **Disposition:** implementer's choice — follow existing schema-naming convention (best practice; CC/engineering call). Not blocking.
2. Property-type matrix in DB vs `tool_schemas` config. **Disposition:** OK as specified for now; may refine later. Not blocking.
3. Worker host for heavy jobs (extend Mac scheduled-task pattern vs Railway worker). **Disposition:** implementer's choice — best practice per the Landscaper backend deployment docs. Not blocking; only constraint is it must not be a Vercel serverless function (§13.5).
4. Do entitlement records reconcile into `market_competitive_projects` automatically, or stay in the event log until a user promotes them? **DECIDED (Gregg, 2026-06-08):** entitlement records land **only** in the `entitlement_event` log. They never auto-create or auto-update `market_competitive_projects` rows. Promotion into the competitive set is an explicit user/Landscaper action (a `promote_entitlement_to_competitive_project` step), keeping the competitive comp-set clean of raw agenda noise.
