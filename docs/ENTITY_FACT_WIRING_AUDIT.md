# Entity-Fact Wiring Audit

**Date:** 2026-04-12
**Branch:** alpha19
**Scope:** Read-only audit of EntitySyncService, FactService, UserKnowledgeRetriever, and extraction pipeline wiring

---

## Service Implementation Status

| Service | File | Methods | Used By | Status |
|---------|------|---------|---------|--------|
| **EntitySyncService** | `entity_sync_service.py` (512 lines) | `get_or_create_project_entity`, `get_or_create_document_entity`, `get_or_create_market_entity`, `get_or_create_property_entity`, `get_or_create_assumption_type_entity`, `ensure_project_entity`, `ensure_property_entity`, `ensure_document_entity`, `ensure_market_entity`, `get_project_entity`, `get_document_entity` | extraction_writer (2 call sites), fact_service, ai_fact_extractor, projects/signals.py (post_save), appraisal_knowledge_tools | **COMPLETE** |
| **FactService** | `fact_service.py` (437 lines) | `create_assumption_fact` (with supersession), `create_extracted_fact`, `create_comparable_facts`, `create_relationship_fact`, `get_current_facts_for_project`, `get_fact_history`, `record_user_correction` | extraction_writer (3 call sites), ai_fact_extractor, backfill_entity_facts command | **COMPLETE** |
| **UserKnowledgeRetriever** | `user_knowledge_retriever.py` (366 lines) | `get_assumption_stats` (aggregates min/max/avg), `get_comparable_facts` (sale/rent/expense), `get_comparison_table`, `format_for_prompt`, `format_comparison_for_prompt` | ai_handler.py (`_get_user_knowledge_context`) | **COMPLETE** |

### Implementation Quality Notes

- **Zero TODOs/FIXMEs/stubs** in any of the three services
- All methods are fully implemented with production-grade error handling
- EntitySyncService uses `get_or_create` with `canonical_name` as dedup key
- FactService implements full supersession logic (old facts marked `is_current=False`, linked via `superseded_by`)
- UserKnowledgeRetriever queries entity-fact tables directly via Django ORM (not raw SQL)
- A `backfill_entity_facts` management command exists for populating existing projects

---

## Extraction Pipeline Wiring

| Step | Implemented? | Code Location | Details |
|------|:-----------:|---------------|---------|
| Commit view → ExtractionWriter | **YES** | `workbench_views.py:1016-1027` | `commit_staging` creates `ExtractionWriter` per row, calls `write_extraction()` |
| ExtractionWriter → `_create_fact_from_extraction` | **YES** | `extraction_writer.py:82-88` | Called after successful write IF `_should_create_fact(field_key)` returns True |
| `_should_create_fact` filter | **YES** | `extraction_writer.py:27-37` | Matches fields containing: cap_rate, vacancy, rent, price, rate, pct, noi, expense, income, growth, absorption, discount, ltv, dscr, yield, margin |
| `_create_fact_from_extraction` → FactService | **YES** | `extraction_writer.py:108-120` | Calls `FactService().create_assumption_fact()` with project_id, field_key, value, source_type='document_extract' |
| `_link_document_entity` | **YES** | `extraction_writer.py:126-165` | Creates document entity via `EntitySyncService`, links project→document via `create_relationship_fact('extracted_from')` |
| Comp write → `_create_comp_facts` | **YES** | `extraction_writer.py:1394, 1436, 1481` | Called after successful comp INSERT for sales, rent, and land comps |
| `_create_comp_facts` → EntitySyncService + FactService | **YES** | `extraction_writer.py:1486-1524` | Creates property entity via `ensure_property_entity()`, then `create_comparable_facts()` with predicate mapping (sale_price, asking_rent, etc.) |
| Django signal: Project.save → entity | **YES** | `projects/signals.py:20-26` | `post_save` signal auto-creates project entity on every `Project.save()` |

### Why Comp Extraction Failed in the Smoke Test

The comp write path IS fully implemented (lines 314-329 of extraction_writer.py route `sales_comp` and `rent_comp` scope fields to `_insert_comp_row`). The failure at commit is NOT due to missing code — it's a **data formatting issue**:

1. Extraction stores comp data as jsonb objects in `ai_extraction_staging.extracted_value`
2. Commit view reads these via raw SQL — psycopg2 should return jsonb as Python dicts
3. `_insert_comp_row` checks `isinstance(value, dict)` to route to `_insert_full_comp`
4. The "Cannot insert comp without full data or scope_id" error indicates the value isn't reaching the dict check as a dict

**Root cause candidates** (needs debugging, not audit scope):
- The `_convert_value(value, 'text')` at line 187 of `_write_column` converts dict to `str(dict)` before the comp scope check at lines 314-324. But the comp check uses `comp_value = value if isinstance(value, dict) else converted_value` — which checks the ORIGINAL value, not converted. So this should work.
- More likely: some comp staging rows have `extracted_value` stored as a JSON string (double-encoded), not a native jsonb object. This would make `isinstance(value, str)` = True.

### Why OpEx Extraction Failed

**Stale table reference.** The field registry maps `opex_*` fields to `tbl_opex_accounts_deprecated` which no longer exists. The extraction writer tries `SELECT 1 FROM landscape.tbl_opex_accounts_deprecated` and gets a relation-not-found error. The mapping needs to be updated to point to the current opex table (`tbl_operating_expenses`).

---

## Landscaper Integration

| Integration Point | Implemented? | Code Location | Details |
|------------------|:-----------:|---------------|---------|
| ai_handler → `_get_user_knowledge_context` | **YES** | `ai_handler.py:644-706` | Calls `UserKnowledgeRetriever.get_assumption_stats()` for 5 predicates (vacancy_rate, management_fee, cap_rate, expense_ratio, replacement_reserves_pct) + `get_comparable_facts(comp_type='sale')` |
| System prompt includes `<user_knowledge>` | **YES** | `ai_handler.py:698-700` | Formatted block injected when user knowledge is found |
| `_needs_user_knowledge` trigger | **YES** | `ai_handler.py:709-738` | Fires on assumption/comparison/validation/document questions |
| ai_handler → ai_fact_extractor (post-response) | **YES** | `ai_handler.py:3254-3274` | Auto-extracts facts from Landscaper responses that reference documents. Uses Haiku for fast structured extraction. |
| tool_executor → FactService | **NO** | — | Tool calls that update project fields (e.g., cap rate via `update_project_field`) do NOT create entity-fact records. They write directly to project tables without knowledge graph sync. |
| tool_executor → assumption_saver | **NO** | — | `assumption_saver.py` exists (writes to flat `assumption_history` table with embeddings) but is NEVER imported by any consumer — dead code. |

---

## Additional Wiring Found

| Component | File | Role | Status |
|-----------|------|------|--------|
| **ai_fact_extractor** | `ai_fact_extractor.py` | Auto-ingests facts from Landscaper responses referencing documents | **COMPLETE** — Uses Haiku model for structured extraction, calls EntitySyncService + FactService |
| **backfill_entity_facts** | `management/commands/backfill_entity_facts.py` | Populates entity-facts from existing tbl_project fields | **COMPLETE** — Management command for one-time backfill |
| **projects signal** | `projects/signals.py:20-26` | Auto-creates project entity on Project.save() | **COMPLETE** — Django post_save signal |
| **assumption_saver** | `assumption_saver.py` | Saves assumptions to flat table with embeddings | **DEAD CODE** — Exported in `__init__.py` but never imported by any consumer |

---

## Gap Analysis

### What's missing to make multi-property document extraction create knowledge graph entities and facts:

1. **Comp write deserialization bug** — The `_insert_comp_row` path is fully implemented, but comp staging rows fail at commit time with "Cannot insert comp without full data or scope_id". The jsonb values should arrive as Python dicts, but something in the deserialization chain is preventing this. **This is a bug fix, not a missing feature.**

2. **OpEx field registry mapping is stale** — All `opex_*` fields point to `tbl_opex_accounts_deprecated` which no longer exists. Needs remapping to `tbl_operating_expenses`. **This is a config fix.**

3. **Market field registry mapping is missing** — Fields like `submarket_occupancy`, `submarket_avg_rent`, `submarket_vacancy` target `tbl_market_rate_analysis` which the writer doesn't handle. **Needs field registry + writer update.**

4. **`created_by_id` not passed through extraction** — `ExtractionWriter.__init__` takes `project_id` and `property_type` but not `user_id`. The `FactService()` is created without `user_id`, so all extraction-created entities and facts have `created_by_id = NULL`. **Simple fix: pass user_id through the chain.**

5. **Tool executor doesn't create facts** — When Landscaper updates a cap rate via `update_project_field`, the knowledge graph is not updated. Only extraction commits create facts. **Needs FactService call in tool_executor's write path.**

6. **Multi-property documents create project-scoped facts, not property-scoped** — The batched extraction pipeline extracts fields into a single project's tables. Comp data (which represents distinct properties) should create separate property entities, but the comp write fails before reaching `_create_comp_facts`. **Blocked by item #1.**

7. **`_parse_excel_to_text` reads only active sheet** — The extraction service's fallback Excel parser (`extraction_service.py:3990`) reads `wb.active` only, while the RAG processor's parser (`text_extraction.py:238`) reads ALL sheets. Multi-tab offering memos lose data if the fallback path is hit. **Inconsistency fix.**

---

## Recommendation

### **FINISH BUILDING** — Services exist and are complete, but three bugs prevent the pipeline from creating property entities from extraction

The Entity-Fact knowledge graph system is **90% wired**. All three services (EntitySyncService, FactService, UserKnowledgeRetriever) are fully implemented with zero stubs. The extraction writer has complete code paths for creating both assumption facts AND comparable property entities+facts. The Landscaper integration reads from the knowledge graph on every relevant turn.

**What needs to happen (ordered by impact):**

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| P0 | Fix comp deserialization so `_insert_comp_row` receives dicts | Small (debug + fix) | Unblocks property entity creation from extraction |
| P0 | Update opex field registry: `tbl_opex_accounts_deprecated` → `tbl_operating_expenses` | Config change | Unblocks 14 opex fields |
| P1 | Pass `user_id` through ExtractionWriter → FactService | Small | User-scoped knowledge graph |
| P1 | Add FactService call to tool_executor's field update path | Medium | Landscaper tool calls create facts |
| P2 | Fix `_parse_excel_to_text` to read all sheets | Small | Multi-tab Excel support in fallback path |
| P2 | Add market field mappings (submarket_occupancy, etc.) | Config + writer | Market data extraction |

**This is NOT a "start over" situation.** The January implementation landed and is production-quality code. The gaps are bugs and config issues, not architectural problems.
