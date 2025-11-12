# Knowledge Persistence Architecture - Phase 1

**Date:** November 12, 2025
**Session ID:** GR47
**Status:** ✅ Implementation Complete

---

## Overview

The Knowledge Persistence Layer transforms Landscape from a calculator into an **intelligent system that learns and remembers**. Every document, interaction, and data point becomes institutional memory that compounds over time.

### Core Principle

**Every interaction, document, assumption, and insight becomes institutional memory.**

The platform gets smarter with:
- Every project analyzed
- Every document ingested
- Every user correction
- Every market data point

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTIONS                         │
│  (Questions, Corrections, Assumptions, Document Uploads)     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 KNOWLEDGE INGESTION                          │
│  • Extracts entities, facts, relationships                   │
│  • Validates against existing knowledge                      │
│  • Tracks confidence and provenance                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           PERSISTENT KNOWLEDGE STORE (PostgreSQL)            │
│                                                              │
│  📦 Entities     📊 Facts      🔄 Sessions                   │
│  💬 Interactions 🎯 Insights   🔍 Embeddings                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 AI REASONING LAYER                           │
│  • Context-aware responses                                   │
│  • Proactive insights and warnings                           │
│  • Confidence scoring with provenance                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### 6 Core Tables

#### 1. **knowledge_entities**
Canonical representation of "things" the system knows about.

```typescript
type EntityType =
  | 'project' | 'property' | 'unit' | 'unit_type'
  | 'market' | 'assumption' | 'document'
  | 'person' | 'company';
```

**Example:**
```json
{
  "entity_type": "property",
  "canonical_name": "Peoria Lakes Apartments",
  "metadata": {
    "project_id": 11,
    "total_units": 240,
    "address": "123 Main St, Peoria, AZ"
  }
}
```

#### 2. **knowledge_facts**
Assertions about entities with temporal validity and provenance.

```typescript
type SourceType =
  | 'user_input' | 'document_extract' | 'market_data'
  | 'calculation' | 'ai_inference' | 'user_correction';
```

**Example:**
```json
{
  "subject_entity_id": 12345,
  "predicate": "monthly_rent",
  "object_value": "2500.00",
  "source_type": "document_extract",
  "confidence_score": 0.95,
  "valid_from": "2025-01-01",
  "valid_to": "2025-12-31"
}
```

#### 3. **knowledge_sessions**
Track user interaction sessions for AI context management.

#### 4. **knowledge_interactions**
Complete log of AI interactions for learning and improvement.

#### 5. **knowledge_embeddings**
Vector embeddings for semantic search (Phase 2).

#### 6. **knowledge_insights**
AI-discovered insights: anomalies, trends, opportunities, risks (Phase 3).

---

## Implementation Structure

```
landscape/
├── db/migrations/
│   ├── 001_knowledge_foundation.up.sql    # Create tables
│   └── 001_knowledge_foundation.down.sql  # Rollback
│
├── src/lib/knowledge/
│   ├── types.ts                 # TypeScript types
│   ├── ingestion-service.ts     # Document → Knowledge
│   ├── session-service.ts       # Session management
│   └── index.ts                 # Main exports
│
└── src/app/api/knowledge/
    ├── ingest/route.ts          # POST /api/knowledge/ingest
    ├── interactions/route.ts    # POST /api/knowledge/interactions
    └── sessions/
        ├── start/route.ts       # POST /api/knowledge/sessions/start
        └── [session_id]/
            ├── end/route.ts     # POST /api/knowledge/sessions/{id}/end
            └── context/route.ts # GET /api/knowledge/sessions/{id}/context
```

---

## API Endpoints

### 1. Start Knowledge Session

**POST** `/api/knowledge/sessions/start`

```json
// Request
{
  "project_id": 11,
  "user_id": 5,
  "context_summary": "Analyzing Peoria Lakes underwriting"
}

// Response
{
  "session_id": 42,
  "loaded_entities_count": 250,
  "status": "active"
}
```

### 2. Get Session Context

**GET** `/api/knowledge/sessions/{session_id}/context`

```json
// Response
{
  "session_id": 42,
  "entities_count": 250,
  "facts_count": 1200,
  "entities": [...],
  "facts": [...]
}
```

### 3. End Session

**POST** `/api/knowledge/sessions/{session_id}/end`

```json
// Response
{
  "session_id": 42,
  "status": "ended",
  "duration_seconds": 1847
}
```

### 4. Ingest Document

**POST** `/api/knowledge/ingest`

```json
// Request
{
  "doc_id": 789,
  "project_id": 11,
  "extraction_result": {
    "property_info": {...},
    "extraction_metadata": {...},
    "units": [...],
    "leases": [...],
    "unit_types": [...]
  }
}

// Response
{
  "success": true,
  "property_entity_id": 555,
  "units_created": 240,
  "unit_types_created": 4,
  "lease_facts_created": 720
}
```

### 5. Record Interaction

**POST** `/api/knowledge/interactions`

```json
// Request
{
  "session_id": 42,
  "user_query": "What's the average rent for 2BR units?",
  "query_type": "question",
  "ai_response": "The average rent is $2,450/month",
  "input_tokens": 450,
  "output_tokens": 120,
  "confidence_score": 0.92
}

// Response
{
  "interaction_id": 1001,
  "success": true
}
```

---

## Usage Examples

### TypeScript Usage

```typescript
import {
  KnowledgeIngestionService,
  KnowledgeSessionService,
} from '@/lib/knowledge';

// Ingest document extraction
const ingestionService = new KnowledgeIngestionService();
const result = await ingestionService.ingestRentRoll(
  docId,
  extractionResult,
  projectId
);

// Manage sessions
const sessionService = new KnowledgeSessionService();

// Create session
const session = await sessionService.createSession({
  project_id: 11,
  user_id: 5,
  context_summary: 'Analyzing property',
});

// Load context
const context = await sessionService.loadSessionContext(session.session_id);

// Record interaction
await sessionService.recordInteraction({
  session_id: session.session_id,
  user_query: 'What is the vacancy rate?',
  ai_response: 'Current vacancy is 4.2%',
  confidence_score: 0.95,
});
```

---

## Database Migration

### Run Migration

```bash
# Connect to your Neon database and run:
psql $DATABASE_URL -f db/migrations/001_knowledge_foundation.up.sql
```

### Rollback (if needed)

```bash
psql $DATABASE_URL -f db/migrations/001_knowledge_foundation.down.sql
```

### Verify Tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'landscape'
  AND table_name LIKE 'knowledge_%'
ORDER BY table_name;
```

Expected output:
- knowledge_embeddings
- knowledge_entities
- knowledge_facts
- knowledge_insights
- knowledge_interactions
- knowledge_sessions

---

## Testing

### 1. Run Migration

```bash
psql $DATABASE_URL -f db/migrations/001_knowledge_foundation.up.sql
```

### 2. Test API Endpoints

```bash
# Start session
curl -X POST http://localhost:3000/api/knowledge/sessions/start \
  -H "Content-Type: application/json" \
  -d '{"project_id": 11, "context_summary": "Testing"}'

# Get context
curl http://localhost:3000/api/knowledge/sessions/1/context

# Test ingestion (after you have extraction_result)
curl -X POST http://localhost:3000/api/knowledge/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "doc_id": 1,
    "project_id": 11,
    "extraction_result": {...}
  }'
```

### 3. Query Knowledge Directly

```sql
-- Check entities created
SELECT entity_type, COUNT(*)
FROM landscape.knowledge_entities
GROUP BY entity_type;

-- Check facts by predicate
SELECT predicate, COUNT(*)
FROM landscape.knowledge_facts
WHERE is_current = TRUE
GROUP BY predicate;

-- Check recent sessions
SELECT session_id, project_id, session_start, session_end
FROM landscape.knowledge_sessions
ORDER BY session_start DESC
LIMIT 10;
```

---

## Phase 1 Success Criteria

✅ **All 6 database tables created and migrated**
✅ **TypeScript types defined**
✅ **Knowledge ingestion service implemented**
✅ **Session management API functional**
✅ **Interaction logging working**
✅ **Can query knowledge via SQL**
✅ **Data flows: Document → Extraction → Knowledge → Session Context**

---

## What's NOT in Phase 1

**Deferred to future phases:**

- ❌ AI reasoning with enriched context (Phase 2)
- ❌ Semantic search / vector embeddings (Phase 2)
- ❌ Insight discovery engine (Phase 3)
- ❌ User corrections learning loop (Phase 4)
- ❌ Context caching / optimization (Phase 5)

**Phase 1 builds the foundation. Future phases add intelligence.**

---

## Key Design Decisions

### 1. **Entity-Fact Model**
Uses RDF-like triples (subject-predicate-object) for maximum flexibility.

### 2. **Provenance Tracking**
Every fact tracks:
- Where it came from (`source_type`, `source_id`)
- How confident we are (`confidence_score`)
- When it's valid (`valid_from`, `valid_to`)
- If it's been superseded (`superseded_by`, `is_current`)

### 3. **Temporal Validity**
Facts can have time ranges (e.g., rent valid Jan-Dec 2025).

### 4. **Versioning**
When facts are corrected, old versions are preserved but marked `is_current = FALSE`.

### 5. **Flexible Metadata**
Both entities and facts have `metadata` JSONB fields for type-specific data.

---

## Integration Points

### For AI Document Analysis

After document extraction completes, call:

```typescript
// In your document analysis route
const response = await fetch('/api/knowledge/ingest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    doc_id: documentId,
    project_id: projectId,
    extraction_result: extractedData,
  }),
});
```

### For AI Conversations

```typescript
// Start session when user opens project
const session = await fetch('/api/knowledge/sessions/start', {
  method: 'POST',
  body: JSON.stringify({ project_id: 11 }),
});

// Get context for AI prompt
const context = await fetch(`/api/knowledge/sessions/${sessionId}/context`);

// Record each interaction
await fetch('/api/knowledge/interactions', {
  method: 'POST',
  body: JSON.stringify({
    session_id: sessionId,
    user_query: userQuestion,
    ai_response: claudeResponse,
  }),
});
```

---

## Performance Considerations

### Indexes Created

All critical queries are indexed:
- `entity_type` (for entity lookups)
- `canonical_name` (for name searches)
- `metadata` (GIN index for JSONB queries)
- `predicate` (for fact searches)
- `is_current` (for active facts)
- `source_type` (for provenance queries)

### Query Limits

API endpoints limit results to prevent performance issues:
- Entities: 50 per request
- Facts: 100 per request
- Interactions: 10 per request

For larger datasets, implement pagination.

---

## Future Enhancements

### Phase 2: AI Intelligence
- Load context into Claude prompts
- Semantic search with embeddings
- Context-aware Q&A

### Phase 3: Insight Discovery
- Anomaly detection (e.g., unusual rents)
- Market benchmarking
- Proactive warnings
- Trend analysis

### Phase 4: Learning Loop
- Track user corrections
- Adjust confidence scores
- Pattern recognition
- Quality improvements

### Phase 5: Optimization
- Redis caching for sessions
- Context pruning for token limits
- Cost tracking and optimization
- Performance tuning

---

## Maintenance

### Cleaning Up Old Sessions

```sql
-- Close sessions older than 24 hours
UPDATE landscape.knowledge_sessions
SET session_end = NOW()
WHERE session_end IS NULL
  AND session_start < NOW() - INTERVAL '24 hours';
```

### Archiving Old Facts

```sql
-- Find superseded facts older than 1 year
SELECT COUNT(*)
FROM landscape.knowledge_facts
WHERE is_current = FALSE
  AND created_at < NOW() - INTERVAL '1 year';

-- Optionally archive to separate table
```

---

## Support & Questions

For questions or issues with the knowledge persistence layer:
1. Check this documentation
2. Review the architecture doc at `/mnt/user-data/outputs/LANDSCAPE_PERSISTENCE_ARCHITECTURE.md`
3. Check TypeScript types in `src/lib/knowledge/types.ts`
4. Review API route implementations

---

**Knowledge Persistence Architecture - Phase 1 Complete** ✅

**GR47**
