# Landscape Database Table Naming Convention

**Version:** 1.0
**Date:** 2026-06-09
**Status:** Draft for adoption
**Scope:** `landscape` schema on Neon (`land_v2`)
**Audited state:** 361 base tables, 29 distinct prefix patterns, 11 unprefixed tables

---

## 1. Current-State Audit (2026-06-09)

### 1.1 Prefix distribution (live base tables)

| Prefix | Count | Domain |
|---|---|---|
| `tbl_` | 222 | Core entities (project, division, parcel, lease, loan, …) |
| `core_fin_` | 14 | Financial facts and config |
| `lu_` | 13 | Land-use / lookup taxonomy |
| `dms_` | 11 | Document management |
| `core_` / `core_doc*` | 18 | Core platform (docs, lookups, planning standards) |
| `ai_` | 7 | Extraction/AI infrastructure |
| `landscaper_` | 7 | Landscaper chat/activity |
| `auth_` / `django_` | 10 | Framework-owned (do not touch) |
| `gis_` | 6 | GIS/boundary |
| `knowledge_` | 6 | RAG/knowledge |
| `mkt_` (3) + `market_` (5) + `bmk_` (5) + `zonda_` (1) | 14 | Market intelligence — **split across four prefixes** |
| Misc one-offs (`glossary_`, `density_`, `developer_`, `planning_`, `res_`, `sale_`, `report_`, `project_`, `user_`, `doc_`, `lkp_`, `tmp_`) | 22 | Assorted |
| No prefix | 11 | `document_tables`, `extraction_commit_snapshot`, `land_use_pricing`, `management_overhead`, `mutation_audit_log`, `opex_benchmark`, `opex_label_mapping`, `pending_mutations`, `tester_feedback`, `type_lot_product`, `_migrations` |

### 1.2 Hazards found

1. **Archive tables in production schema (7):** `tbl_commercial_lease_archive_20260506`, `tbl_expense_recovery_archive_20260506`, `tbl_lease_archive_20260506`, `tbl_percentage_rent_archive_20260506`, `tbl_rent_escalation_archive_20260506`, `tbl_rent_schedule_archive_20260506`, `tbl_field_catalog_backup_20260324`.
2. **Market-intel prefix split:** `mkt_` vs `market_` vs `bmk_` vs `zonda_` for the same domain.
3. **Field catalog drift:** 616 of 3,664 `tbl_field_catalog` rows (16.8%) reference 36 tables that no longer exist (entire `tbl_cre_*` family superseded by the unified lease model `tbl_lease` + `tbl_lease_*_ext`; `tbl_contacts` → `tbl_contact`; `tbl_debt_facility`, `tbl_unit_type`, `tbl_operating_expense`, `tbl_rent_comparable`, `tbl_opex_accounts` also gone). The catalog has no sync mechanism with live DDL.
4. **Framework-internal names** (`auth_*`, `django_*`, `spatial_ref_sys`, `_migrations`) coexist in the same schema — unavoidable, but they must stay excluded from analytical tooling.

---

## 2. Convention for New Tables (binding)

**Rule N1 — snake_case, singular.** Table names are lower snake_case and use singular nouns (`tbl_contact`, not `tbl_contacts`). Existing plural names are grandfathered.

**Rule N2 — approved prefix registry.** Every new table takes a prefix from this registry. No new prefix may be introduced without adding it here first.

| Prefix | Use for |
|---|---|
| `tbl_` | User-facing entities and deal data (default when nothing else fits) |
| `core_fin_` | Financial facts, budget/actual config |
| `core_doc_` | Document storage/metadata |
| `core_` | Cross-domain platform config |
| `lu_` | Lookup/taxonomy reference tables |
| `mkt_` | Market intelligence (canonical going forward; `market_`, `bmk_`, `zonda_` are frozen — no new tables) |
| `dms_` | Document-management workflow |
| `gis_` | Spatial/boundary data |
| `ai_` | Extraction/AI pipeline infrastructure |
| `knowledge_` | RAG/embeddings |
| `landscaper_` | Landscaper chat/threads/activity |

**Rule N3 — extension-table suffix.** Property-type extension tables use `_ext` with a type code: `tbl_lease_mf_ext`, `tbl_lease_ret_ext` (existing pattern, now codified).

**Rule N4 — no backups/archives in `landscape`.** Pre-migration snapshots go to a dedicated `landscape_archive` schema (or are dropped after a verified retention window). Datestamped `_archive_YYYYMMDD` / `_backup_YYYYMMDD` tables must not live in the production schema.

**Rule N5 — no unprefixed tables.** The 11 existing unprefixed tables are grandfathered; new ones are not allowed.

**Rule N6 — catalog sync.** Any migration that creates, renames, or drops a table with analytical fields must update `tbl_field_catalog` in the same migration (insert new rows / retag renamed rows / delete or deactivate dead rows). This rule would have prevented the 616-row drift.

---

## 3. Cleanup Backlog (small, safe, prioritized)

| # | Item | Action | Risk | Executor |
|---|---|---|---|---|
| C1 | 616 ghost rows in `tbl_field_catalog` | Deactivate (`is_active=false`) or delete; re-catalog the successor tables (`tbl_lease_*_ext`, `tbl_contact`, `tbl_loan`, `tbl_operating_expenses`) | Low — catalog is metadata, but verify no tool reads it for live behavior first | CC (DB writes) |
| C2 | 7 archive/backup tables in production schema | Move to `landscape_archive` schema or drop after Gregg confirms retention not needed | Low — verify zero code references first (grep) | CC |
| C3 | `market_` vs `mkt_` split | Freeze: no new `market_` tables. Do NOT rename existing | None | Policy only |
| C4 | 11 unprefixed tables | Rename only when each table is next touched by a feature migration; never as a standalone rename pass | Deferred | Policy only |

## 4. Explicit Non-Goals

1. **No mass rename.** The `tbl_container` → `tbl_division` rename (Nov 2025) took until Jun 2026 to fully clean up (~60 callsites). Renaming 350+ tables for cosmetic consistency is months of regression risk for zero user-visible benefit. Existing names stand until a natural rebuild moment.
2. **No framework-table changes.** `auth_*`, `django_*`, `spatial_ref_sys` are owned by Django/PostGIS.

## 5. Enforcement

1. This file lives in the repo (`docs/05-database/`) and is referenced from CLAUDE.md migration conventions.
2. Migration review checklist gains two items: (a) new table names conform to §2; (b) `tbl_field_catalog` updated per Rule N6.
3. Optional later: a CI check that diffs `information_schema.tables` against the prefix registry and against `tbl_field_catalog`.

---
*End — DB Table Naming Convention v1.0*
