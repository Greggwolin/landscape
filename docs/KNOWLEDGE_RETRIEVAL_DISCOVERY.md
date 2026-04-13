# Knowledge Retrieval Architecture Discovery

**Date:** 2026-04-12
**Branch:** alpha19

---

## Part 1: QM_BATCH_001 Cleanup Confirmation

200 test projects (IDs 563-762) seeded under Gregg's account have been deleted.

### Rows Deleted

| Table | Rows Deleted | Method |
|-------|-------------|--------|
| `tbl_multifamily_unit` | 8,794 | Direct DELETE (NO ACTION FK) |
| `tbl_multifamily_unit_type` | 1,070 | Direct DELETE (NO ACTION FK) |
| `core_doc` | 0 | Verified empty |
| `ai_extraction_staging` | 0 | Verified empty |
| `tbl_rent_roll_unit` | 0 | Verified empty |
| `tbl_acquisition` | 0 | Verified empty |
| `tbl_project` | 200 | CASCADE delete |
| `tbl_operating_expenses` | ~2,184 | Via CASCADE |
| `tbl_sales_comparables` | ~87 | Via CASCADE |
| `tbl_loan` | ~48 | Via CASCADE |
| `tbl_project_assumption` | ~5,456 | Via CASCADE |

### Verification (all return 0)

| Check | Count |
|-------|-------|
| `tbl_project_assumption` WHERE batch tag = QM_BATCH_001 | 0 |
| `tbl_project` WHERE project_id 563-762 | 0 |
| `tbl_multifamily_unit_type` WHERE project_id 563-762 | 0 |
| `tbl_multifamily_unit` WHERE project_id 563-762 | 0 |
| `tbl_operating_expenses` WHERE project_id 563-762 | 0 |
| `tbl_sales_comparables` WHERE project_id 563-762 | 0 |
| `tbl_loan` WHERE project_id 563-762 | 0 |

### Gregg's Real Projects (Confirmed Intact)

All 13 real projects verified present: Peoria Lakes, Red Valley Ranch, Peoria Meadows, Villages at Tule Springs, Scottsdale Promenade, Chadron Terrace, Gainey Center II, Lynn Villa Apartments, Vincent Village Apartments, Torrance Courtyard Apartments, Rizvi Portfolio AZ, The Peninsula Villas, Weyyakin Phase IV.

---

## Part 2: Knowledge Retrieval Architecture

### Architecture Diagram

```
User asks question in Landscaper
│
├─── System Prompt Injection (every turn) ──────────────────────────┐
│    │                                                               │
│    ├── _get_platform_knowledge_context()                           │
│    │   → PlatformKnowledgeRetriever.retrieve()                    │
│    │   → tbl_platform_knowledge_chunks (pgvector cosine search)   │
│    │   → JOIN tbl_platform_knowledge + tbl_platform_knowledge_chapters
│    │   → Injected as <platform_knowledge> XML block               │
│    │                                                               │
│    └── _get_user_knowledge_context()                              │
│        → UserKnowledgeRetriever                                    │
│        → knowledge_entities (entity_type='project') + knowledge_facts
│        → get_assumption_stats() for vacancy, mgmt fee, cap rate, etc.
│        → get_comparable_facts() for sale/rent/expense comps        │
│        → Injected as <user_knowledge> XML block                    │
│                                                                     │
├─── Tool Calls (on-demand by Claude) ──────────────────────────────┐
│    │                                                               │
│    ├── query_platform_knowledge                                    │
│    │   Source 1: tbl_platform_knowledge_chunks (pgvector)          │
│    │   Source 2: knowledge_embeddings (document_chunk type)        │
│    │            JOIN core_doc (any project, not scoped)             │
│    │   → Merges both sources, sorts by similarity                  │
│    │                                                               │
│    ├── get_knowledge_insights                                      │
│    │   → knowledge_insights table (AI-discovered anomalies/trends) │
│    │   → Scoped to project entity in knowledge_entities            │
│    │                                                               │
│    └── [DB query templates via query_builder.py]                   │
│        → Direct SQL against project tables                         │
│        → market_competitive_projects, tbl_sales_comparables, etc.  │
│                                                                     │
├─── RAG Pipeline (rag_retrieval.py) ───────────────────────────────┐
│    Step 1: detect_query_intent() → match to SQL template           │
│    Step 2: get_project_schema_context() → available data desc      │
│    Step 3: knowledge_embeddings vector search (project-scoped)     │
│    Step 4: Structured project context (tbl_project basics)         │
│                                                                     │
└─── Document Upload Pipeline ──────────────────────────────────────┐
     document_ingestion.py:                                          │
     1. Text extraction → chunking                                   │
     2. generate_embedding() per chunk (ada-002, 1536-dim)           │
     3. store_embedding() → knowledge_embeddings table               │
        (source_type='document_chunk', source_id=doc_id)             │
                                                                      │
     extraction_writer.py (when fields extracted):                    │
     4. Write to production tables (tbl_project, tbl_operating_expenses, etc.)
     5. _create_entity_fact() → FactService.create_assumption_fact() │
        → knowledge_entities + knowledge_facts                       │
     6. _create_comp_facts() → EntitySyncService + FactService       │
        → knowledge_entities (type='property') + knowledge_facts     │
```

### Table-by-Table State Assessment

#### `tbl_platform_knowledge` — Reference corpus (ACTIVE, populated)
- **8 documents** indexed (The Appraisal of Real Estate, IREM I/E IQ, MF Capital Markets reports, Alpha Help docs)
- **1,320 chunks** in `tbl_platform_knowledge_chunks`, all with embeddings
- **Used by:** `PlatformKnowledgeRetriever`, `query_platform_knowledge` tool, `_get_platform_knowledge_context()` system prompt injection
- **This is the primary RAG path for methodology/reference questions**

#### `knowledge_entities` — Entity graph (ACTIVE, lightly populated)
- **729 total** entities (650 project, 44 document, 35 property)
- **`created_by_id` is NULL for all** — entities are system-created, not user-scoped
- **Used by:** `UserKnowledgeRetriever.get_assumption_stats()` and `get_comparable_facts()`, `get_knowledge_insights` tool
- **Note:** 650 project entities likely includes the 200 deleted batch projects' entities (orphaned — entities survived project deletion because there's no FK CASCADE)

#### `knowledge_facts` — Fact triples (ACTIVE, lightly populated)
- **407 facts** (predicates: `has_assumption:*`, `sale_price`, `sale_cap_rate`, `extracted_from`)
- Source types: `import`, `user_input`, `document_extract`
- **Used by:** `UserKnowledgeRetriever` for assumption stats and comp lookups
- **This is how Landscaper knows "you typically use X% cap rate"**

#### `knowledge_embeddings` — Document chunk vectors (ACTIVE, populated)
- **3,210 rows** (3,209 document_chunk + 1 test)
- Columns: `embedding_id`, `source_type`, `source_id` (doc_id), `content_text`, `embedding` (vector), `entity_ids`, `tags`
- **No `project_id` column** — project scoping is done via JOIN to `core_doc.project_id`
- **Used by:** `search_similar()` in `embedding_storage.py`, `query_platform_knowledge` Source 2, `rag_retrieval.py` Step 3

#### `tbl_user_document_chunks` — DOES NOT EXIST
- Table not found in database. Referenced in prompt but never created.

#### `tbl_platform_knowledge_chapters` — Chapter metadata (ACTIVE)
- Linked to `tbl_platform_knowledge`, used for filtering by property type, topics, page ranges

#### `knowledge_insights` — AI insights (ACTIVE, possibly empty)
- Queried by `get_knowledge_insights` tool
- Scoped to project via `knowledge_entities`

---

### Answers to Discovery Questions

#### 1. When Landscaper answers a comp/market question, what tables does it actually query?

Three paths depending on question type:

| Question Type | Tables Queried | Mechanism |
|--------------|----------------|-----------|
| "What cap rates have I used?" | `knowledge_entities` + `knowledge_facts` | `UserKnowledgeRetriever.get_assumption_stats()` via system prompt |
| "Show me comparable sales" | `knowledge_entities` (type=property) + `knowledge_facts` | `UserKnowledgeRetriever.get_comparable_facts()` via system prompt |
| "What are cap rates for Class B in Scottsdale?" | `tbl_platform_knowledge_chunks` + `knowledge_embeddings` | `query_platform_knowledge` tool (RAG search) |
| "Show competitive projects" | `market_competitive_projects` | `query_builder.py` SQL template match |
| "What does IREM say about expenses?" | `tbl_platform_knowledge_chunks` | `PlatformKnowledgeRetriever` with source filter |

#### 2. Is the entity/fact graph actively used, or placeholder infrastructure?

**Actively used.** The `UserKnowledgeRetriever` queries `knowledge_entities` + `knowledge_facts` on every turn where `_needs_user_knowledge()` returns true. It aggregates assumption statistics (min/max/avg) across the user's project history and retrieves comparable property facts. The extraction pipeline (`extraction_writer.py`) actively writes to these tables during document ingestion.

However, **the data is sparse** — only 35 property entities and 407 facts exist. The system works but has very little data to work with.

#### 3. Are `knowledge_embeddings` the primary RAG path?

**For user-uploaded documents, yes.** `knowledge_embeddings` stores document chunk vectors (ada-002, 1536-dim) with `source_type='document_chunk'` and `source_id` pointing to `core_doc.doc_id`. These are searched via cosine distance with pgvector.

**For reference/methodology questions, no** — those use `tbl_platform_knowledge_chunks` which has its own `embedding` column (same ada-002 vectors, but in a separate table with richer metadata: chapter, page, section_path, topics, property_types).

Required fields per `knowledge_embeddings` row:
- `content_text` — the chunk text
- `embedding` — 1536-dim vector (vector type)
- `source_type` — e.g., `'document_chunk'`
- `source_id` — FK to `core_doc.doc_id`
- `entity_ids` — array of related entity IDs (optional)
- `tags` — array of string tags (optional)

#### 4. Does `tbl_user_document_chunks` play a role?

**No — this table does not exist.** The concept it would serve is handled by `knowledge_embeddings` (for vector search) and `core_doc` + `core_doc_text` (for document storage).

#### 5. What is the correct way to seed 200 properties' worth of market intelligence?

**Seed into the Entity-Fact graph, not project tables.** The correct targets are:

1. **`knowledge_entities`** — Create one entity per property:
   ```sql
   INSERT INTO landscape.knowledge_entities
     (canonical_name, entity_type, metadata, created_at, updated_at)
   VALUES
     ('property:scottsdale-class-b-1', 'property', '{
       "name": "Scottsdale Ridge Apartments",
       "address": "7420 E Camelback Rd",
       "city": "Scottsdale",
       "state": "AZ",
       "property_type": "multifamily",
       "property_class": "B",
       "unit_count": 240,
       "year_built": 2008,
       "msa": "Phoenix-Mesa-Chandler"
     }', NOW(), NOW());
   ```

2. **`knowledge_facts`** — Create facts per property for each data point:
   ```sql
   INSERT INTO landscape.knowledge_facts
     (subject_entity_id, predicate, object_value, source_type,
      confidence_score, is_current, created_at, updated_at)
   VALUES
     (<entity_id>, 'sale_price', '58000000', 'market_data', 0.95, true, NOW(), NOW()),
     (<entity_id>, 'price_per_unit', '241667', 'market_data', 0.95, true, NOW(), NOW()),
     (<entity_id>, 'sale_cap_rate', '0.052', 'market_data', 0.95, true, NOW(), NOW());
   ```

   Key predicates used by `UserKnowledgeRetriever`:
   - Sale comps: `sale_price`, `price_per_unit`, `sale_cap_rate`
   - Rent comps: `asking_rent`, `effective_rent`, `rent_per_sf`
   - Expense comps: `expenses_per_unit`, `expense_ratio`

3. **Optionally `knowledge_embeddings`** — If you want the data to be RAG-searchable via natural language (not just structured fact queries), also create embeddings:
   ```sql
   INSERT INTO landscape.knowledge_embeddings
     (content_text, embedding, source_type, source_id, entity_ids, tags, created_at)
   VALUES
     ('Scottsdale Ridge Apartments, 240 units, Class B, Scottsdale AZ.
       Sold for $58M ($241,667/unit) at 5.2% cap rate in Q3 2025.',
      <ada-002 vector>::vector,
      'market_data', <entity_id>,
      ARRAY[<entity_id>],
      ARRAY['property_type:multifamily', 'market:phoenix', 'class:B'],
      NOW());
   ```

#### 6. Does the answer differ between User A (clean data) and User B (document extraction)?

**Yes, the pipeline differs but the destination is the same:**

| Path | Entry Point | Tables Written |
|------|------------|----------------|
| **User A (clean seed)** | Direct SQL INSERT | `knowledge_entities` + `knowledge_facts` |
| **User B (document extraction)** | Upload → `extraction_service.py` → `extraction_writer.py` | Production tables (tbl_project, etc.) + `knowledge_entities` + `knowledge_facts` + `knowledge_embeddings` |

For User A, you seed entities + facts directly. No production project tables, no document embeddings. The `UserKnowledgeRetriever` will find the data via entity/fact queries.

For User B, the extraction pipeline handles everything: it writes extracted values to project tables, creates entity/fact records via `FactService`, and stores document chunk embeddings in `knowledge_embeddings`.

**Recommendation:** For market intelligence seeding (200 properties), use User A path — direct entity/fact inserts. Optionally add embeddings for RAG discoverability. Do NOT create `tbl_project` records; these properties are comps, not active projects.

---

### Cleanup Note: Orphaned Entity-Fact Records

The 200 deleted batch projects likely left orphaned records in `knowledge_entities` (project entities with `canonical_name` like `project:563` through `project:762`) and associated `knowledge_facts`. These should be cleaned up before seeding new data:

```sql
-- Count orphaned project entities
SELECT count(*) FROM landscape.knowledge_entities
WHERE entity_type = 'project'
  AND CAST(REPLACE(canonical_name, 'project:', '') AS int) BETWEEN 563 AND 762;

-- Delete orphaned facts first, then entities
DELETE FROM landscape.knowledge_facts
WHERE subject_entity_id IN (
  SELECT entity_id FROM landscape.knowledge_entities
  WHERE entity_type = 'project'
    AND CAST(REPLACE(canonical_name, 'project:', '') AS int) BETWEEN 563 AND 762
);

DELETE FROM landscape.knowledge_entities
WHERE entity_type = 'project'
  AND CAST(REPLACE(canonical_name, 'project:', '') AS int) BETWEEN 563 AND 762;
```
