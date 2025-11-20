# Knowledge Persistence Architecture - Phase 1 Implementation

**Status**: Foundation Complete - Integration Pending
**Date**: 2025-11-13
**Branch**: work

---

## Overview

Phase 1 implements the foundational entity-fact knowledge model that transforms Landscape from a calculator into an intelligent learning platform. Every document extraction, user interaction, and insight becomes permanent institutional knowledge.

**Key Distinction**: This is the **knowledge graph** layer, NOT user preferences. User preferences (completed earlier today) store UI state; knowledge persistence stores institutional learning.

---

## What Was Built

### 1. Database Models (6 Tables)

**File**: `/backend/apps/knowledge/models.py` (~560 lines)

#### KnowledgeEntity
- Canonical representation of "things" the system knows about
- Types: project, property, unit, unit_type, market, assumption, document, person, company, area, benchmark
- Flexible JSONB metadata for type-specific attributes
- Unique canonical_name constraint

#### KnowledgeFact
- Subject-Predicate-Object triples with provenance
- Temporal validity (valid_from/valid_to)
- Confidence scores (0.00-1.00)
- Source tracking (user_input, document_extract, market_data, calculation, ai_inference, user_correction)
- Versioning chain (superseded_by) without deletion
- is_current flag for efficient queries

####Knowledge Session
- User interaction sessions with loaded context
- Tracks which entities/facts were loaded for AI reasoning
- Token counting, context summarization
- Active session tracking with conditional index

#### KnowledgeInteraction
- AI conversation audit log
- Query/response pairs with context tracking
- User feedback and corrections for learning loop
- Token usage tracking
- Query intent classification

#### KnowledgeEmbedding (Structure Only - Phase 2)
- Table created, vector field commented out
- Ready for pgvector in Phase 2
- Source type tracking for entities, facts, documents, interactions

#### KnowledgeInsight (Structure Only - Phase 3)
- Table created for future proactive intelligence
- Insight types: anomaly, trend, opportunity, risk, benchmark, pattern
- Severity levels, acknowledgment tracking
- Supporting facts array

### 2. Ingestion Service

**File**: `/backend/apps/knowledge/services/ingestion_service.py` (~620 lines)

**Class**: `KnowledgeIngestionService`

**Main Entry Point**: `ingest_rent_roll(doc_id, extraction_result, project_id)`

**Capabilities**:
- Converts rent roll extraction → entities + facts
- Handles property, unit, unit_type, lease entities
- Creates facts with confidence scores from extraction quality
- Tracks full provenance (source_type='document_extract', source_id=doc_id)
- Temporal validity on lease facts (valid_from/valid_to)
- Entity deduplication via canonical_name
- Atomic transactions for data integrity

**Private Methods**:
- `_get_or_create_property_entity()` - Property entity with upsert
- `_create_unit_entity()` - Individual units with location relationships
- `_create_unit_facts()` - Sqft, occupancy, bedrooms, bathrooms
- `_create_lease_facts()` - Rent, dates, tenant, subsidy
- `_create_unit_type_entity()` - Aggregated BD/BA types
- `_create_unit_type_facts()` - Market rent, avg sqft, unit count

### 3. Session Management API

**File**: `/backend/apps/knowledge/views/session_views.py` (~130 lines)

**Endpoints**:
- `POST /api/knowledge/sessions/start/` - Start session, load project context
  - Body: `{project_id, workspace_id}`
  - Returns: session_id, loaded_entities, loaded_facts_count

- `POST /api/knowledge/sessions/{session_id}/end/` - End session
  - Updates session_end timestamp

- `GET /api/knowledge/sessions/{session_id}/context/` - Retrieve context
  - Returns: entities[], facts[], counts
  - Limited to 100 facts for initial load

### 4. Serializers

**File**: `/backend/apps/knowledge/serializers.py` (~40 lines)

- `KnowledgeSessionSerializer` - Full session data with is_active computed field
- `KnowledgeEntitySerializer` - Entity CRUD
- `KnowledgeFactSerializer` - Fact CRUD

### 5. Django Admin

**File**: `/backend/apps/knowledge/admin.py` (~100 lines)

**Registered Models**:
- KnowledgeEntity - Filterable by type/subtype, searchable by canonical_name
- KnowledgeFact - Filterable by predicate/source/current, custom object display
- KnowledgeSession - Filterable by dates, searchable by user
- KnowledgeInteraction - Full query/response audit trail
- KnowledgeEmbedding - Placeholder for Phase 2
- KnowledgeInsight - Placeholder for Phase 3

Custom features:
- Fieldsets for organized editing
- Read-only audit fields
- Custom list displays
- Search and filter capabilities

### 6. URL Configuration

**File**: `/backend/apps/knowledge/urls.py` (~15 lines)

Routes:
- `/api/knowledge/sessions/start/`
- `/api/knowledge/sessions/<uuid>/end/`
- `/api/knowledge/sessions/<uuid>/context/`

---

## Still Pending (Before Testing)

### 1. Django Settings Update

**File to modify**: `/backend/config/settings.py`

Add to `INSTALLED_APPS`:
```python
INSTALLED_APPS = [
    # ... existing apps
    'apps.knowledge',
]
```

### 2. Main URL Integration

**File to modify**: `/backend/config/urls.py`

Add knowledge URLs:
```python
urlpatterns = [
    # ... existing patterns
    path('api/knowledge/', include('apps.knowledge.urls')),
]
```

### 3. Extraction Worker Integration

**File to modify**: `/backend/services/extraction/extraction_worker.py`

**Current code** (around line ~150):
```python
extraction_result = extractor.extract(doc_path, classification_result)
_store_assertions(doc.id, extraction_result)
```

**Add after `_store_assertions()`**:
```python
# NEW: Ingest into knowledge graph
from apps.knowledge.services.ingestion_service import KnowledgeIngestionService

ingestion_service = KnowledgeIngestionService(user_id=None)  # System ingestion
knowledge_result = ingestion_service.ingest_rent_roll(
    doc_id=doc.id,
    extraction_result=extraction_result,
    project_id=getattr(doc, 'project_id', None)
)

print(f"Knowledge ingestion: {knowledge_result['entities_created']} entities, {knowledge_result['facts_created']} facts")
```

### 4. Generate and Run Migrations

```bash
cd /Users/5150east/landscape/backend
python manage.py makemigrations knowledge
python manage.py migrate knowledge
```

---

## Architecture Highlights

### Entity-Fact Model

**Why it's powerful**:
- Flexible: Add new predicates without schema changes
- Graph queries: Facts can reference other entities
- Temporal awareness: Track what was true when
- Provenance: Know the source of every assertion
- Confidence scoring: Prioritize high-confidence facts

**Example Knowledge Graph**:
```
Entity: property:Peoria Lakes
  ├─ Fact: has_units → 240 (confidence: 1.00, source: document_extract)
  └─ Entity: unit:Peoria Lakes:201
      ├─ Fact: located_in → property:Peoria Lakes
      ├─ Fact: monthly_rent → 2500 (valid: 2025-01-01 to 2025-12-31, confidence: 0.95)
      ├─ Fact: square_feet → 1200 (confidence: 0.95)
      └─ Fact: is_occupied → True (confidence: 0.95)
```

### Confidence Scores

Source type determines default confidence:
- `user_input`: 1.00 (user knows best)
- `document_extract`: 0.85-0.99 (extraction quality score)
- `ai_inference`: 0.60-0.90 (depends on model confidence)
- `calculation`: 1.00 (deterministic)
- `user_correction`: 1.00 (overrides AI)

### Temporal Validity

Facts have optional `valid_from` and `valid_to`:
- Lease rents: valid during lease term
- Market assumptions: valid for specific quarters
- Unit status: valid until change event

Enables queries like: "What was the rent for Unit 201 in Q1 2024?"

### Versioning Without Deletion

Facts are never deleted, only superseded:
- Original fact: `is_current=True`, `superseded_by=NULL`
- User corrects it: New fact created with `is_current=True`
- Original fact: `is_current=False`, `superseded_by=new_fact_id`

Full audit trail preserved, can roll back mistakes.

---

## Testing Checklist

### After Integration (Next Steps)

1. **Run Migrations**
   ```bash
   cd backend
   python manage.py makemigrations knowledge
   python manage.py migrate knowledge
   ```

2. **Verify Tables Created**
   ```bash
   psql $DATABASE_URL -c "\dt landscape.knowledge*"
   ```
   Should see: knowledge_entities, knowledge_facts, knowledge_sessions, knowledge_interactions, knowledge_embeddings, knowledge_insights

3. **Upload Rent Roll**
   - Use document upload UI
   - Upload Chadron rent roll or similar
   - Check extraction_worker logs for "Knowledge ingestion" message

4. **Verify in Django Admin**
   - Go to `/admin/knowledge/`
   - Check KnowledgeEntity: Should see property + units
   - Check KnowledgeFact: Should see rent, sqft, occupancy facts
   - Verify confidence_score and source_type populated

5. **Test Session API**
   ```bash
   # Start session
   curl -X POST http://localhost:8000/api/knowledge/sessions/start/ \
     -H "Content-Type: application/json" \
     -H "Cookie: sessionid=..." \
     -d '{"project_id": 7}'

   # Get context
   curl http://localhost:8000/api/knowledge/sessions/{session_id}/context/ \
     -H "Cookie: sessionid=..."

   # End session
   curl -X POST http://localhost:8000/api/knowledge/sessions/{session_id}/end/ \
     -H "Cookie: sessionid=..."
   ```

6. **Verify Knowledge Graph**
   ```sql
   -- Count entities by type
   SELECT entity_type, COUNT(*)
   FROM landscape.knowledge_entities
   GROUP BY entity_type;

   -- Check facts by predicate
   SELECT predicate, COUNT(*)
   FROM landscape.knowledge_facts
   WHERE is_current = true
   GROUP BY predicate;

   -- Sample entity-fact relationship
   SELECT
     e.canonical_name,
     f.predicate,
     f.object_value,
     f.confidence_score,
     f.source_type
   FROM landscape.knowledge_entities e
   JOIN landscape.knowledge_facts f ON e.entity_id = f.subject_entity_id
   WHERE e.entity_type = 'unit'
   LIMIT 10;
   ```

---

## Phase 2 Preview (Not in Scope)

Phase 2 will add:
- ✅ pgvector extension for semantic search
- ✅ Embedding generation for entities/facts/documents
- ✅ AI reasoning with loaded context
- ✅ Query knowledge API
- ✅ Context-aware responses

---

## Files Delivered

**New Files** (7 total):
```
/backend/apps/knowledge/
├── __init__.py (empty)
├── models.py (560 lines - 6 model classes)
├── admin.py (100 lines - 6 admin classes)
├── serializers.py (40 lines - 3 serializers)
├── urls.py (15 lines - 3 endpoints)
├── services/
│   ├── __init__.py (empty)
│   └── ingestion_service.py (620 lines - 1 service class)
└── views/
    ├── __init__.py (empty)
    └── session_views.py (130 lines - 3 view functions)
```

**Files to Modify** (2 total):
- `/backend/config/settings.py` - Add 'apps.knowledge' to INSTALLED_APPS
- `/backend/config/urls.py` - Include knowledge URLs
- `/backend/services/extraction/extraction_worker.py` - Add ingestion hook

**Total New Code**: ~1,465 lines

---

## Success Criteria

✅ **Phase 1 Complete When**:
- All 6 tables created via Django migration
- Upload rent roll → Entities created automatically
- Upload rent roll → Facts created with confidence scores
- Facts have full provenance (source_type, source_id)
- Session APIs functional (start/end/context)
- Django admin shows knowledge records
- Can query facts by predicate/entity
- Knowledge graph queryable via SQL

---

## Key Decisions Made

1. **Django App Location**: `/backend/apps/knowledge/` (consistent with existing pattern)
2. **Migration Strategy**: Django migrations (auto-generated, ORM-managed)
3. **Embeddings Table**: Created in Phase 1, vector field commented out for Phase 2
4. **Insights Table**: Created in Phase 1, functionality in Phase 3
5. **User Tracking**: Optional user_id for created_by (supports system ingestion)
6. **Confidence Scores**: Decimal(3,2) for precise 0.00-1.00 range
7. **Canonical Names**: Pattern-based (e.g., `property:Name`, `unit:Property:Number`)
8. **Transaction Safety**: @transaction.atomic on ingestion for atomicity

---

## Next Actions

1. Update Django settings.py (add to INSTALLED_APPS)
2. Update Django urls.py (include knowledge URLs)
3. Integrate with extraction_worker.py (add ingestion hook)
4. Run migrations: `python manage.py makemigrations knowledge && python manage.py migrate`
5. Test with rent roll upload
6. Verify knowledge graph in Django admin
7. Test session APIs
8. Document results

---

**Implementation by**: Claude Code
**Date**: 2025-11-13
**Status**: ✅ Foundation Complete - Ready for Integration & Testing
**Next Phase**: AI Reasoning with Context (Phase 2)
