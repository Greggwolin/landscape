# User B Smoke Test Results — Document Upload + Extraction Pipeline

**Date:** 2026-04-12
**Branch:** alpha19
**User:** Noel (user_id=20)
**Project:** Market Intelligence Collection (project_id=763)

---

## Summary

Uploaded 5 Excel documents (one per type), triggered extraction, committed staging rows. **The pipeline works end-to-end for Excel files** but has significant gaps in comp extraction and opex field mappings that would prevent knowledge graph population for the majority of document content.

**Verdict: Do NOT proceed with full 118-doc upload using the current pipeline.** The extraction pipeline is designed for single-project intake (extracting one property's data into project tables), not for multi-property market intelligence ingestion. A different approach is needed for User B.

---

## Test Documents

| # | Type | Filename | Size | Properties |
|---|------|----------|------|------------|
| 1 | offering_memo | OM_PROP-0006_Heights_Sage.xlsx | 15KB | 1 |
| 2 | broker_survey | Broker_Survey_PHX_73.xlsx | 6KB | 8 |
| 3 | market_report | Market_Report_PHX_South_Scottsdale_78.xlsx | 6KB | 3 |
| 4 | personal_tracker | Personal_Tracker_97.xlsx | 7KB | 14 |
| 5 | property_flyer | Flyer_PROP-0008_Park_Kenzie_at_the_D.xlsx | 5KB | 1 |

---

## Results Table

| Document Type | Filename | Upload | Extraction | Staging Rows | Committed | Failed | Entities | Facts | Embeddings |
|--------------|----------|--------|-----------|-------------|-----------|--------|----------|-------|------------|
| offering_memo | OM_PROP-0006_Heights_Sage.xlsx | OK (582) | OK | 28 | 13 | 15 | 1 (project) | 4 | 1 |
| broker_survey | Broker_Survey_PHX_73.xlsx | OK (583) | OK | 13 | 2 | 11 | 0 | 2 | 1 |
| market_report | Market_Report_PHX_South_Scottsdale_78.xlsx | OK (584) | OK | 12 | 8 | 4 | 0 | 0 | 1 |
| personal_tracker | Personal_Tracker_97.xlsx | OK (585) | OK | 21 | 6 | 15 | 0 | 0 | 1 |
| property_flyer | Flyer_PROP-0008_Park_Kenzie_at_the_D.xlsx | OK (586) | OK | 16 | 11 | 5 | 0 | 4 | 1 |
| **TOTALS** | | **5/5** | **5/5** | **90** | **40** | **50** | **1** | **10** | **5** |

### Failure Breakdown

| Error Category | Count | Affected Fields |
|----------------|-------|-----------------|
| `tbl_opex_accounts_deprecated` does not exist | 14 | All `opex_*` fields |
| Cannot insert comp without full data or scope_id | 26 | `rent_comp_name`, `sales_comp_name` |
| Unknown upsert target: `tbl_market_rate_analysis` | 3 | `submarket_occupancy`, `submarket_avg_rent`, `submarket_vacancy` |
| No unit_number found in data | 4 | `unit_number` |
| No rows updated | 1 | `exit_cap_rate_acq` |
| Other | 2 | — |

---

## Infrastructure Issues Discovered

### 1. Storage URI Mismatch (local dev)

**Problem:** Django's `upload_document` saves files via `default_storage` (Cloudflare R2 in this env) but stores the relative path (`uploads/763/uuid.xlsx`) in `core_doc.storage_uri`. The text extraction pipeline calls `requests.get(storage_uri)` expecting a full URL.

**Impact:** The automatic RAG processing during upload silently fails. No embeddings are created. Extraction later falls back to embeddings (which are empty) and would also fail.

**Workaround applied:** Manually updated `storage_uri` to the full R2 public URL (`https://pub-...r2.dev/uploads/763/uuid.xlsx`). This should be fixed in `upload_document` to prepend the R2 public URL or `MEDIA_URL`.

**Fix needed in:** `backend/apps/documents/views.py` line 213 — `storage_uri` should use `default_storage.url(saved_path)` instead of `saved_path`.

### 2. MIME Type Detection

**Problem:** Uploaded `.xlsx` files get `mime_type = 'application/octet-stream'` instead of the correct `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

**Impact:** The Excel-specific code path in `_get_document_content()` checks `mime_type in excel_types` — with `octet-stream` this check fails, forcing a fallback to the embedding path.

**Workaround applied:** Manually updated `mime_type` in `core_doc`.

**Fix needed in:** `upload_document` should detect MIME type from file extension when the browser sends `application/octet-stream`.

### 3. Excel Sheet Handling Inconsistency

Two different Excel parsers exist with different behaviors:

| Parser | Location | Sheets Read | Used By |
|--------|----------|-------------|---------|
| `_extract_xlsx()` | `text_extraction.py:238` | **ALL sheets** | `process_document()` (RAG embeddings) |
| `_parse_excel_to_text()` | `extraction_service.py:3990` | **Active sheet only** | `_get_document_content()` (extraction fallback) |

The offering_memo has data across multiple tabs (Property Summary, Unit Mix, T-12, Sale History). If extraction falls back to `_parse_excel_to_text()`, it only reads the first sheet.

---

## Answers to Critical Questions

### 1. Does the extraction pipeline handle .xlsx files?

**Yes.** Both text extraction and the LLM extraction work with Excel files. The text extraction converts sheets to tab-separated text, and Claude successfully parses field values from this format. All 5 documents produced staging rows.

However, the pipeline has **two prerequisite bugs** (storage URI and MIME type) that prevent it from working out of the box on local dev. With those fixed, Excel extraction functions correctly.

### 2. Does extraction create knowledge_entities and knowledge_facts?

**Partially.** Entity/fact creation happens during the **commit** phase (not during extraction itself). Of the 40 successfully committed staging rows:
- **1 project entity** created (`project:763`)
- **10 facts** created (predicates: `has_assumption:acquisition_price`, `has_assumption:income_parking`, `has_assumption:cap_rate_going_in`, `has_assumption:income_late_fees`, `has_assumption:income_laundry`, `has_assumption:rentable_sf`, plus `extracted_from` link facts)

**NOT created:**
- No **property entities** — comp fields (`rent_comp_name`, `sales_comp_name`) all failed with "Cannot insert comp without full data or scope_id". The comp writer (`_create_comp_facts`) is only called for successful comp writes.
- No **expense facts** — all `opex_*` fields failed due to stale table reference (`tbl_opex_accounts_deprecated`).

### 3. Is the extraction user-scoped?

**No.** `created_by_id` is NULL on both the entity and all facts. The extraction pipeline's `EntitySyncService` and `FactService` don't receive the `user_id` from the extraction writer. The `ExtractionWriter.__init__()` takes `project_id` and `property_type` but not `user_id`.

### 4. How does extraction handle multi-property documents?

**It doesn't handle them well.** The extraction pipeline is designed for single-property-per-document intake:
- **Broker survey (8 properties):** Extracted only 2 fields successfully (cap rate and property class for the first/primary property). Comp fields for individual properties failed.
- **Market report (3 properties):** Extracted submarket/market name and individual property data as rent comps — but comp writes all failed.
- **Personal tracker (14 properties):** Extracted project-level fields from the first property. Individual property comp data failed.

The pipeline treats each document as contributing to a single project, not as a source of multiple independent property records.

### 5. Does the messy personal_tracker format cause extraction failures?

**Extraction succeeds; commit partially fails.** The LLM handled the messy formatting well — 21 staging rows were created from 14 properties with inconsistent headers. 6 of 21 rows committed successfully (project-level fields like city, state, year_built). The 15 failures were all comp-related (rent_comp_name requiring scope_id), not formatting-related.

### 6. What's the extraction time per document?

| Document | Staging Rows | Approx Time |
|----------|-------------|-------------|
| offering_memo (15KB) | 28 | ~15s |
| broker_survey (6KB) | 13 | ~10s |
| market_report (6KB) | 12 | ~10s |
| personal_tracker (7KB) | 21 | ~12s |
| property_flyer (5KB) | 16 | ~8s |

All 5 completed within ~30 seconds total (background threads, so some parallelism). Individual extraction is ~8-15 seconds.

**Projected 118-doc time:** ~15-25 minutes (assuming serial execution with some overhead). Manageable.

### 7. Does extraction auto-commit, or do fields sit in staging?

**Fields sit in staging with `status='pending'`.** Two separate API calls are required:

1. `POST /api/knowledge/projects/{id}/extraction-staging/accept-all-pending/` — marks pending → accepted
2. `POST /api/knowledge/projects/{id}/extraction-staging/commit/` with `{"commit_all_accepted": true}` — writes accepted → production tables and creates entity/facts

This is by design (Ingestion Workbench lets users review before committing). For bulk ingestion, these calls can be scripted.

---

## Recommendation: Do NOT Use Extraction Pipeline for User B's 118 Documents

The extraction pipeline is architecturally mismatched for this use case:

| What We Need | What the Pipeline Does |
|-------------|----------------------|
| Create 1 property entity per comp in each document | Creates 1 project entity, writes fields to project tables |
| Multi-property documents → multiple entities | Single-property-per-document assumption |
| Property-level facts (sale_price, cap_rate, asking_rent) | Project-level assumptions (has_assumption:cap_rate_going_in) |
| Comp records as knowledge_entities + knowledge_facts | Comp writes fail without scope_id from prior Workbench interaction |
| OpEx data as facts | OpEx writes fail (stale table reference) |

### Recommended Approach for User B

**Option A (Preferred): Direct entity/fact seeding with document linkage**

Same approach as User A's seeding script, but:
1. Upload all 118 documents via DMS (creates `core_doc` records + embeddings)
2. Parse the Excel files directly using the same `landscape_test_data_200.json` source data
3. Create `knowledge_entities` (type=property) + `knowledge_facts` directly (like `seed_user_a_knowledge.py`)
4. Link each entity to its source document via `extracted_from` facts (referencing `doc_id`)
5. This gives Noel the same knowledge graph as Gregg, but with document provenance

**Option B: Fix extraction pipeline for multi-property docs**

Would require:
1. Fix `tbl_opex_accounts_deprecated` reference → point to current opex table
2. Add multi-property extraction mode (create separate entity per comp)
3. Pass `user_id` through extraction writer → entity/fact creation
4. Fix comp writer to handle inline data without scope_id
5. Fix `storage_uri` to include full URL

This is a significant code change — recommend deferring to post-alpha.

---

## Test Artifacts

| Artifact | Location |
|----------|----------|
| Project | project_id=763, created_by=20 (Noel) |
| Documents | doc_ids 582-586 in `core_doc` |
| Staging rows | 90 rows in `ai_extraction_staging` (40 applied, 50 accepted-but-failed) |
| Entities | entity_id=935 (`project:763`) |
| Facts | fact_ids 12625-12634 (10 facts, source_type=document_extract) |
| Embeddings | embedding_ids 3543-3547 (5 document_chunk embeddings) |
