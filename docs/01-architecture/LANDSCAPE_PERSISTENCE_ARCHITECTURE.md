# Landscape Persistent Knowledge Architecture

**Date:** November 12, 2025  
**Session ID:** GR43  
**Purpose:** Foundation for AI-powered real estate intelligence

---

## CORE PRINCIPLE

**Every interaction, document, assumption, and insight becomes institutional memory that compounds over time.**

The platform gets smarter with every project, every document ingested, every user correction, every market data point.

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTIONS                         │
│  (Questions, Corrections, Assumptions, Document Uploads)     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 KNOWLEDGE INGESTION LAYER                    │
│  • Extracts entities, facts, relationships                   │
│  • Validates against existing knowledge                      │
│  • Flags conflicts and uncertainties                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              PERSISTENT KNOWLEDGE STORE                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Project    │  │    Market    │  │   Learned    │     │
│  │   Context    │  │     Data     │  │   Patterns   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Corrections  │  │ Assumptions  │  │  Document    │     │
│  │     Log      │  │   History    │  │   Extracts   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              INTELLIGENCE RETRIEVAL LAYER                    │
│  • Context-aware query                                       │
│  • Semantic search across knowledge                          │
│  • Temporal reasoning (what was true when)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI REASONING LAYER                        │
│  • Claude API with enriched context                          │
│  • Proactive insights and warnings                           │
│  • Confidence scoring with provenance                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  USER RESPONSE & ACTIONS                     │
│  (Answers, Insights, Warnings, Recommendations)              │
└─────────────────────────────────────────────────────────────┘
```

---

## DATABASE SCHEMA

### Core Knowledge Tables

#### 1. knowledge_entities
**Purpose:** Canonical representation of "things" the system knows about

```sql
CREATE TABLE knowledge_entities (
    entity_id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- 'project', 'property', 'market', 'assumption', 'document', 'person', 'company'
    entity_subtype VARCHAR(50), -- 'mpc', 'multifamily', 'office', etc.
    canonical_name VARCHAR(255) NOT NULL,
    metadata JSONB, -- Type-specific attributes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_entity_type ON knowledge_entities(entity_type);
CREATE INDEX idx_entity_name ON knowledge_entities(canonical_name);
CREATE INDEX idx_entity_metadata ON knowledge_entities USING GIN(metadata);
```

**Examples:**
```json
{
    "entity_type": "project",
    "entity_subtype": "mpc",
    "canonical_name": "Peoria Lakes MPC",
    "metadata": {
        "location": "Peoria, AZ",
        "total_acres": 1200,
        "total_lots": 3500
    }
}

{
    "entity_type": "market",
    "entity_subtype": "submarket",
    "canonical_name": "West Valley Phoenix",
    "metadata": {
        "county": "Maricopa",
        "major_cities": ["Peoria", "Glendale", "Surprise"]
    }
}
```

#### 2. knowledge_facts
**Purpose:** Assertions about entities with temporal validity and provenance

```sql
CREATE TABLE knowledge_facts (
    fact_id SERIAL PRIMARY KEY,
    subject_entity_id INTEGER REFERENCES knowledge_entities(entity_id),
    predicate VARCHAR(100) NOT NULL, -- 'has_assumption', 'located_in', 'comparable_to', 'rent_is', etc.
    object_value TEXT, -- For literal values
    object_entity_id INTEGER REFERENCES knowledge_entities(entity_id), -- For entity relationships
    
    -- Temporal validity
    valid_from DATE,
    valid_to DATE,
    
    -- Provenance
    source_type VARCHAR(50) NOT NULL, -- 'user_input', 'document_extract', 'market_data', 'calculation', 'ai_inference'
    source_id INTEGER, -- Points to specific source record
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    
    -- Versioning
    superseded_by INTEGER REFERENCES knowledge_facts(fact_id),
    is_current BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_fact_subject ON knowledge_facts(subject_entity_id);
CREATE INDEX idx_fact_predicate ON knowledge_facts(predicate);
CREATE INDEX idx_fact_object_entity ON knowledge_facts(object_entity_id);
CREATE INDEX idx_fact_temporal ON knowledge_facts(valid_from, valid_to);
CREATE INDEX idx_fact_current ON knowledge_facts(is_current);
```

**Examples:**
```json
// Rent fact
{
    "subject_entity_id": 12345, // Unit 201
    "predicate": "current_rent",
    "object_value": "2500.00",
    "valid_from": "2025-01-01",
    "valid_to": "2025-12-31",
    "source_type": "document_extract",
    "source_id": 789, // Points to rent roll extraction
    "confidence_score": 0.95
}

// Market relationship
{
    "subject_entity_id": 555, // Project X
    "predicate": "located_in",
    "object_entity_id": 777, // West Valley market
    "source_type": "user_input",
    "confidence_score": 1.00
}

// Assumption with correction history
{
    "subject_entity_id": 888, // Budget line item
    "predicate": "cost_per_unit",
    "object_value": "15000",
    "source_type": "user_input",
    "confidence_score": 1.00,
    "superseded_by": 999, // User updated this later
    "is_current": false
}
```

#### 3. knowledge_sessions
**Purpose:** Track user interactions and context windows

```sql
CREATE TABLE knowledge_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    workspace_id INTEGER REFERENCES workspaces(id),
    project_id INTEGER REFERENCES projects(id),
    
    session_start TIMESTAMP DEFAULT NOW(),
    session_end TIMESTAMP,
    
    -- Context tracking
    loaded_entities INTEGER[], -- Entity IDs loaded into context
    context_token_count INTEGER,
    context_summary TEXT, -- Brief description of session purpose
    
    -- Metadata
    metadata JSONB
);

CREATE INDEX idx_session_user ON knowledge_sessions(user_id);
CREATE INDEX idx_session_project ON knowledge_sessions(project_id);
CREATE INDEX idx_session_active ON knowledge_sessions(session_end) WHERE session_end IS NULL;
```

#### 4. knowledge_interactions
**Purpose:** Log every AI interaction for learning and audit

```sql
CREATE TABLE knowledge_interactions (
    interaction_id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES knowledge_sessions(session_id),
    
    -- User input
    user_query TEXT NOT NULL,
    query_type VARCHAR(50), -- 'question', 'command', 'correction', 'upload'
    query_intent VARCHAR(100), -- 'get_assumption', 'validate_data', 'compare_market', etc.
    
    -- Context used
    context_entities INTEGER[], -- Entity IDs in context
    context_facts INTEGER[], -- Fact IDs in context
    context_token_count INTEGER,
    
    -- AI response
    ai_response TEXT,
    response_type VARCHAR(50), -- 'answer', 'insight', 'warning', 'suggestion'
    confidence_score DECIMAL(3,2),
    
    -- Token usage
    input_tokens INTEGER,
    output_tokens INTEGER,
    
    -- User feedback
    user_feedback VARCHAR(20), -- 'helpful', 'not_helpful', 'incorrect', null
    user_correction TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interaction_session ON knowledge_interactions(session_id);
CREATE INDEX idx_interaction_intent ON knowledge_interactions(query_intent);
CREATE INDEX idx_interaction_time ON knowledge_interactions(created_at);
```

#### 5. knowledge_embeddings
**Purpose:** Vector embeddings for semantic search

```sql
CREATE TABLE knowledge_embeddings (
    embedding_id SERIAL PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL, -- 'fact', 'document_chunk', 'interaction', 'insight'
    source_id INTEGER NOT NULL,
    
    -- Text content
    content_text TEXT NOT NULL,
    
    -- Vector embedding (using pgvector extension)
    embedding vector(1536), -- Claude/OpenAI embedding dimension
    
    -- Metadata for filtering
    entity_ids INTEGER[],
    tags VARCHAR(50)[],
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_embedding_vector ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_embedding_source ON knowledge_embeddings(source_type, source_id);
CREATE INDEX idx_embedding_entities ON knowledge_embeddings USING GIN(entity_ids);
```

#### 6. knowledge_insights
**Purpose:** Proactive insights discovered by AI

```sql
CREATE TABLE knowledge_insights (
    insight_id SERIAL PRIMARY KEY,
    insight_type VARCHAR(50) NOT NULL, -- 'anomaly', 'trend', 'opportunity', 'risk', 'benchmark'
    
    -- What it's about
    subject_entity_id INTEGER REFERENCES knowledge_entities(entity_id),
    related_entities INTEGER[],
    
    -- The insight
    insight_title VARCHAR(255) NOT NULL,
    insight_description TEXT NOT NULL,
    severity VARCHAR(20), -- 'info', 'low', 'medium', 'high', 'critical'
    
    -- Supporting evidence
    supporting_facts INTEGER[], -- Fact IDs
    confidence_score DECIMAL(3,2),
    
    -- User response
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    acknowledged_by INTEGER REFERENCES users(id),
    user_action VARCHAR(100), -- 'accepted', 'rejected', 'needs_review', 'fixed'
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_insight_entity ON knowledge_insights(subject_entity_id);
CREATE INDEX idx_insight_type ON knowledge_insights(insight_type);
CREATE INDEX idx_insight_unack ON knowledge_insights(acknowledged) WHERE NOT acknowledged;
```

---

## KNOWLEDGE INGESTION PIPELINE

### Step 1: Entity Recognition & Extraction

**When document uploaded or user enters data:**

```python
class KnowledgeIngestionService:
    
    def ingest_document(self, doc_id: int, extraction_result: Dict):
        """
        Convert document extraction into knowledge entities and facts
        """
        
        # 1. Create/link property entity
        property_entity = self._get_or_create_entity(
            entity_type='property',
            entity_subtype=extraction_result.get('property_type', 'multifamily'),
            canonical_name=extraction_result['property_info']['property_name'],
            metadata={
                'address': extraction_result['property_info']['property_address'],
                'total_units': extraction_result['extraction_metadata']['total_units']
            }
        )
        
        # 2. Create unit entities
        for unit in extraction_result['units']:
            unit_entity = self._get_or_create_entity(
                entity_type='unit',
                canonical_name=f"{property_entity.canonical_name} - Unit {unit['unit_number']}",
                metadata={
                    'unit_number': unit['unit_number'],
                    'bedrooms': unit['bedroom_count'],
                    'bathrooms': unit['bathroom_count'],
                    'sqft': unit['square_feet']
                }
            )
            
            # 3. Create facts about this unit
            if unit['status'] == 'occupied':
                self._create_fact(
                    subject_entity_id=unit_entity.entity_id,
                    predicate='occupancy_status',
                    object_value='occupied',
                    source_type='document_extract',
                    source_id=doc_id,
                    confidence_score=unit['confidence']
                )
        
        # 4. Create lease facts
        for lease in extraction_result['leases']:
            unit_entity = self._find_unit_entity(property_entity, lease['unit_number'])
            
            self._create_fact(
                subject_entity_id=unit_entity.entity_id,
                predicate='monthly_rent',
                object_value=str(lease['monthly_rent']),
                valid_from=lease['lease_start_date'],
                valid_to=lease['lease_end_date'],
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=lease['confidence']
            )
            
            if lease['is_section_8']:
                self._create_fact(
                    subject_entity_id=unit_entity.entity_id,
                    predicate='subsidy_type',
                    object_value='section_8',
                    source_type='document_extract',
                    source_id=doc_id,
                    confidence_score=1.0
                )
        
        # 5. Create embeddings for semantic search
        self._create_embeddings_for_document(doc_id, extraction_result)
        
        # 6. Run inference to discover insights
        self._discover_insights(property_entity)
```

### Step 2: Conflict Resolution

**When new fact conflicts with existing knowledge:**

```python
def _create_fact(self, subject_entity_id, predicate, object_value, **kwargs):
    """
    Check for conflicts before creating fact
    """
    
    # Find existing facts about same subject/predicate
    existing_facts = KnowledgeFact.objects.filter(
        subject_entity_id=subject_entity_id,
        predicate=predicate,
        is_current=True
    )
    
    for existing in existing_facts:
        # Check temporal overlap
        if self._temporal_overlap(existing, kwargs.get('valid_from'), kwargs.get('valid_to')):
            
            # Compare values
            if existing.object_value != object_value:
                # CONFLICT DETECTED
                
                # Compare confidence scores
                new_confidence = kwargs.get('confidence_score', 0.5)
                
                if new_confidence > existing.confidence_score:
                    # New fact is more confident - supersede old
                    existing.is_current = False
                    existing.superseded_by = new_fact_id
                    existing.save()
                    
                    # Log the conflict
                    self._log_conflict(existing, kwargs, resolution='superseded_by_higher_confidence')
                    
                elif new_confidence < existing.confidence_score:
                    # Keep existing fact, log conflict
                    self._log_conflict(existing, kwargs, resolution='rejected_lower_confidence')
                    return None
                    
                else:
                    # Equal confidence - flag for user review
                    self._flag_for_user_review(existing, kwargs)
                    return None
    
    # No conflicts or resolved - create fact
    return KnowledgeFact.objects.create(**kwargs)
```

### Step 3: Embedding Generation

**For semantic search:**

```python
def _create_embeddings_for_document(self, doc_id: int, extraction_result: Dict):
    """
    Create vector embeddings for semantic search
    """
    
    # Embed unit type descriptions
    for ut in extraction_result['unit_types']:
        text = f"{ut['bedroom_count']}BR/{ut['bathroom_count']}BA unit, {ut['typical_sqft']} sqft, market rent ${ut['market_rent_monthly']}"
        
        embedding = self._get_embedding(text)
        
        KnowledgeEmbedding.objects.create(
            source_type='unit_type',
            source_id=ut['id'],
            content_text=text,
            embedding=embedding,
            entity_ids=[property_entity.entity_id]
        )
    
    # Embed property summary
    summary = f"{extraction_result['property_info']['property_name']}, {extraction_result['extraction_metadata']['total_units']} units, {extraction_result['extraction_metadata']['vacancy_rate']*100}% vacancy"
    
    embedding = self._get_embedding(summary)
    
    KnowledgeEmbedding.objects.create(
        source_type='property_summary',
        source_id=doc_id,
        content_text=summary,
        embedding=embedding,
        entity_ids=[property_entity.entity_id]
    )
```

---

## CONTEXT RETRIEVAL SYSTEM

### Session Context Management

**When user starts session:**

```python
class KnowledgeSessionManager:
    
    def start_session(self, user_id: int, project_id: int):
        """
        Initialize session with relevant context
        """
        
        # Create session record
        session = KnowledgeSession.objects.create(
            user_id=user_id,
            project_id=project_id
        )
        
        # Load project context
        context = self._load_project_context(project_id)
        
        # Store in Redis for fast access
        self._cache_session_context(session.session_id, context)
        
        return session
    
    def _load_project_context(self, project_id: int):
        """
        Load all relevant entities and facts for project
        """
        
        # Get project entity
        project_entity = KnowledgeEntity.objects.get(
            entity_type='project',
            metadata__project_id=project_id
        )
        
        # Get all related entities (units, assumptions, documents, etc.)
        related_entities = self._get_related_entities(project_entity.entity_id)
        
        # Get current facts about these entities
        facts = KnowledgeFact.objects.filter(
            subject_entity_id__in=[e.entity_id for e in related_entities],
            is_current=True
        )
        
        # Get recent insights
        insights = KnowledgeInsight.objects.filter(
            subject_entity_id=project_entity.entity_id,
            acknowledged=False
        ).order_by('-created_at')[:10]
        
        return {
            'entities': related_entities,
            'facts': facts,
            'insights': insights,
            'token_estimate': self._estimate_token_count(related_entities, facts, insights)
        }
```

### Semantic Search for Relevant Context

**When user asks question:**

```python
def query_knowledge(self, session_id: int, user_query: str):
    """
    Find relevant knowledge to answer query
    """
    
    # Get session context
    session = KnowledgeSession.objects.get(session_id=session_id)
    base_context = self._get_cached_context(session_id)
    
    # Generate query embedding
    query_embedding = self._get_embedding(user_query)
    
    # Semantic search for relevant facts
    relevant_embeddings = KnowledgeEmbedding.objects.annotate(
        similarity=CosineDistance('embedding', query_embedding)
    ).filter(
        entity_ids__overlap=base_context['entity_ids']
    ).order_by('similarity')[:20]
    
    # Retrieve full facts
    relevant_facts = []
    for emb in relevant_embeddings:
        if emb.source_type == 'fact':
            fact = KnowledgeFact.objects.get(fact_id=emb.source_id)
            relevant_facts.append(fact)
    
    # Combine base context + relevant facts
    enriched_context = {
        **base_context,
        'query_relevant_facts': relevant_facts
    }
    
    return enriched_context
```

---

## AI REASONING WITH PERSISTENT KNOWLEDGE

### Context Window Construction

```python
def construct_ai_context(self, session_id: int, user_query: str):
    """
    Build optimal context window for Claude API
    """
    
    # Get enriched context
    context = self.query_knowledge(session_id, user_query)
    
    # Build system prompt with knowledge
    system_prompt = f"""You are Landscape AI, an intelligent assistant for real estate development.

PROJECT CONTEXT:
{self._format_entities(context['entities'])}

KNOWN FACTS:
{self._format_facts(context['facts'])}

RECENT INSIGHTS:
{self._format_insights(context['insights'])}

QUERY-RELEVANT KNOWLEDGE:
{self._format_facts(context['query_relevant_facts'])}

When answering:
1. Reference specific facts with provenance (where you learned it)
2. Flag any uncertainties or conflicts in the data
3. Suggest insights based on patterns you notice
4. Ask clarifying questions if context is insufficient
"""

    # Add conversation history (last 10 interactions)
    conversation_history = self._get_recent_interactions(session_id, limit=10)
    
    return {
        'system_prompt': system_prompt,
        'conversation_history': conversation_history,
        'user_query': user_query
    }
```

### AI Response with Learning

```python
def get_ai_response(self, session_id: int, user_query: str):
    """
    Get AI response and learn from it
    """
    
    # Build context
    context = self.construct_ai_context(session_id, user_query)
    
    # Call Claude API
    response = self.client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system=context['system_prompt'],
        messages=[
            *context['conversation_history'],
            {"role": "user", "content": user_query}
        ]
    )
    
    ai_response = response.content[0].text
    
    # Log interaction
    interaction = KnowledgeInteraction.objects.create(
        session_id=session_id,
        user_query=user_query,
        query_intent=self._classify_intent(user_query),
        context_entities=[e.entity_id for e in context['entities']],
        context_facts=[f.fact_id for f in context['facts']],
        ai_response=ai_response,
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens
    )
    
    # Extract new knowledge from response
    self._extract_knowledge_from_response(interaction.interaction_id, ai_response, context)
    
    return ai_response
```

### Learning from AI Responses

```python
def _extract_knowledge_from_response(self, interaction_id: int, ai_response: str, context: Dict):
    """
    Parse AI response for new facts or insights
    """
    
    # Use Claude to parse its own response for structured knowledge
    parse_prompt = f"""Analyze this AI response and extract any new facts or insights:

Response: {ai_response}

Extract:
1. New facts asserted (subject, predicate, object)
2. Insights discovered (patterns, anomalies, recommendations)
3. Uncertainties flagged

Return JSON."""

    parsed = self._call_claude_for_parsing(parse_prompt)
    
    # Create facts from assertions
    for fact in parsed.get('new_facts', []):
        self._create_fact(
            subject_entity_id=fact['subject_entity_id'],
            predicate=fact['predicate'],
            object_value=fact['object_value'],
            source_type='ai_inference',
            source_id=interaction_id,
            confidence_score=fact.get('confidence', 0.7)
        )
    
    # Create insight records
    for insight in parsed.get('insights', []):
        KnowledgeInsight.objects.create(
            insight_type=insight['type'],
            subject_entity_id=insight['entity_id'],
            insight_title=insight['title'],
            insight_description=insight['description'],
            confidence_score=insight.get('confidence', 0.8)
        )
```

---

## PROACTIVE INTELLIGENCE

### Insight Discovery Engine

```python
class InsightDiscoveryService:
    """
    Continuously discover insights from accumulated knowledge
    """
    
    def discover_insights_for_project(self, project_id: int):
        """
        Run analysis to find patterns, anomalies, opportunities
        """
        
        project_entity = self._get_project_entity(project_id)
        
        # 1. Anomaly Detection
        self._detect_anomalies(project_entity)
        
        # 2. Benchmark Analysis
        self._benchmark_against_market(project_entity)
        
        # 3. Trend Analysis
        self._analyze_trends(project_entity)
        
        # 4. Risk Identification
        self._identify_risks(project_entity)
    
    def _detect_anomalies(self, project_entity):
        """
        Find data points that don't fit expected patterns
        """
        
        # Get all rent facts for project
        rent_facts = KnowledgeFact.objects.filter(
            subject_entity_id__in=self._get_unit_entities(project_entity),
            predicate='monthly_rent',
            is_current=True
        )
        
        rents = [float(f.object_value) for f in rent_facts]
        
        # Statistical outlier detection
        mean_rent = np.mean(rents)
        std_rent = np.std(rents)
        
        for fact in rent_facts:
            rent = float(fact.object_value)
            z_score = abs((rent - mean_rent) / std_rent)
            
            if z_score > 3:  # 3 standard deviations
                KnowledgeInsight.objects.create(
                    insight_type='anomaly',
                    subject_entity_id=fact.subject_entity_id,
                    insight_title=f"Unusual rent: ${rent:,.0f}",
                    insight_description=f"This rent is {z_score:.1f} standard deviations from the mean (${mean_rent:,.0f}). Verify accuracy.",
                    severity='high',
                    supporting_facts=[fact.fact_id],
                    confidence_score=0.95
                )
    
    def _benchmark_against_market(self, project_entity):
        """
        Compare project metrics to market data
        """
        
        # Get project location
        location_fact = KnowledgeFact.objects.get(
            subject_entity_id=project_entity.entity_id,
            predicate='located_in'
        )
        
        market_entity = KnowledgeEntity.objects.get(
            entity_id=location_fact.object_entity_id
        )
        
        # Get comparable properties in same market
        comparable_properties = self._find_comparable_properties(project_entity, market_entity)
        
        # Compare rent levels
        project_avg_rent = self._calculate_avg_rent(project_entity)
        market_avg_rent = self._calculate_market_avg_rent(comparable_properties)
        
        variance = (project_avg_rent - market_avg_rent) / market_avg_rent
        
        if abs(variance) > 0.1:  # >10% difference
            KnowledgeInsight.objects.create(
                insight_type='benchmark',
                subject_entity_id=project_entity.entity_id,
                insight_title=f"Rent variance: {variance*100:+.1f}% vs market",
                insight_description=f"Average rent ${project_avg_rent:,.0f} vs market ${market_avg_rent:,.0f}. {'Above' if variance > 0 else 'Below'} market positioning.",
                severity='medium',
                confidence_score=0.85,
                related_entities=[p.entity_id for p in comparable_properties[:5]]
            )
```

---

## USER CORRECTION & LEARNING LOOP

### When User Corrects AI

```python
def handle_user_correction(self, interaction_id: int, correction: str, corrected_value: Any):
    """
    Learn from user corrections
    """
    
    interaction = KnowledgeInteraction.objects.get(interaction_id=interaction_id)
    
    # Log the correction
    interaction.user_feedback = 'incorrect'
    interaction.user_correction = correction
    interaction.save()
    
    # Find the fact that was incorrect
    incorrect_fact = self._identify_corrected_fact(interaction, corrected_value)
    
    if incorrect_fact:
        # Supersede incorrect fact
        incorrect_fact.is_current = False
        incorrect_fact.save()
        
        # Create corrected fact
        corrected_fact = KnowledgeFact.objects.create(
            subject_entity_id=incorrect_fact.subject_entity_id,
            predicate=incorrect_fact.predicate,
            object_value=corrected_value,
            source_type='user_correction',
            source_id=interaction_id,
            confidence_score=1.0,  # User corrections are definitive
            valid_from=incorrect_fact.valid_from,
            valid_to=incorrect_fact.valid_to
        )
        
        incorrect_fact.superseded_by = corrected_fact.fact_id
        incorrect_fact.save()
        
        # Log to AI correction table (for existing system compatibility)
        AICorrectionLog.objects.create(
            user_id=interaction.session.user_id,
            project_id=interaction.session.project_id,
            field_path=incorrect_fact.predicate,
            ai_value=incorrect_fact.object_value,
            user_value=corrected_value,
            correction_type='value_wrong'
        )
        
        # Retrain/adjust confidence for similar extractions
        self._adjust_extraction_confidence(incorrect_fact, corrected_fact)
```

---

## COST OPTIMIZATION STRATEGIES

### 1. Context Caching

```python
# Cache project context in Redis for 1 hour
def _cache_session_context(self, session_id: int, context: Dict):
    """
    Cache context to avoid reloading on every query
    """
    
    cache_key = f"session:{session_id}:context"
    
    # Serialize context
    cached_data = {
        'entities': [e.to_dict() for e in context['entities']],
        'facts': [f.to_dict() for f in context['facts']],
        'insights': [i.to_dict() for i in context['insights']],
        'timestamp': datetime.now().isoformat()
    }
    
    # Store in Redis with 1 hour TTL
    redis_client.setex(
        cache_key,
        3600,  # 1 hour
        json.dumps(cached_data)
    )
```

### 2. Incremental Context Updates

```python
def update_session_context(self, session_id: int, new_fact: KnowledgeFact):
    """
    Add new fact to cached context instead of reloading everything
    """
    
    cache_key = f"session:{session_id}:context"
    cached_data = json.loads(redis_client.get(cache_key))
    
    # Append new fact
    cached_data['facts'].append(new_fact.to_dict())
    
    # Update cache
    redis_client.setex(cache_key, 3600, json.dumps(cached_data))
```

### 3. Query Result Caching

```python
def get_ai_response_cached(self, session_id: int, user_query: str):
    """
    Cache AI responses for repeated questions
    """
    
    # Generate query hash
    query_hash = hashlib.sha256(user_query.encode()).hexdigest()
    cache_key = f"query:{session_id}:{query_hash}"
    
    # Check cache
    cached_response = redis_client.get(cache_key)
    if cached_response:
        return json.loads(cached_response)
    
    # Generate response
    response = self.get_ai_response(session_id, user_query)
    
    # Cache for 10 minutes
    redis_client.setex(cache_key, 600, json.dumps(response))
    
    return response
```

### 4. Smart Context Pruning

```python
def _prune_context_for_token_limit(self, context: Dict, max_tokens: int = 8000):
    """
    Intelligently reduce context to fit within token budget
    """
    
    current_tokens = context['token_estimate']
    
    if current_tokens <= max_tokens:
        return context
    
    # Pruning strategy:
    # 1. Keep all entities (lightweight)
    # 2. Prioritize recent facts over old
    # 3. Keep high-confidence facts over low-confidence
    # 4. Keep acknowledged insights
    
    facts = sorted(context['facts'], key=lambda f: (f.confidence_score, f.created_at), reverse=True)
    
    pruned_facts = []
    token_count = self._estimate_token_count(context['entities'], [], context['insights'])
    
    for fact in facts:
        fact_tokens = self._estimate_fact_tokens(fact)
        if token_count + fact_tokens < max_tokens:
            pruned_facts.append(fact)
            token_count += fact_tokens
        else:
            break
    
    return {
        **context,
        'facts': pruned_facts,
        'pruning_note': f'Pruned from {len(facts)} to {len(pruned_facts)} facts to fit token budget'
    }
```

---

## IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1)
- Database schema migration
- Entity/Fact/Session models
- Basic ingestion pipeline (convert rent roll extraction to entities/facts)
- Simple context loading

### Phase 2: Retrieval & Reasoning (Week 2)
- Semantic search with embeddings
- Session management
- AI integration with enriched context
- Basic Q&A working

### Phase 3: Intelligence (Week 3)
- Insight discovery engine
- Anomaly detection
- Market benchmarking
- Proactive alerts

### Phase 4: Learning (Week 4)
- Correction tracking
- Confidence adjustment
- Pattern recognition from corrections
- Quality improvements

### Phase 5: Optimization (Week 5)
- Context caching
- Query optimization
- Cost reduction strategies
- Performance tuning

---

## SUCCESS METRICS

**Technical:**
- Average query response time < 2 seconds
- Context cache hit rate > 80%
- AI response relevance > 90%
- Cost per session < $0.10

**User Value:**
- Questions answered without manual lookup: 95%+
- Proactive insights flagged per project: 5-10
- User corrections needed: <5% of facts
- Time saved per underwriting: 4-6 hours

**Knowledge Growth:**
- New facts per document: 100-500
- Knowledge base growth: 10,000+ facts/month
- Cross-project insights: 20+ per week

---

## COMPETITIVE ADVANTAGE

**Why This Beats ARGUS:**

1. **ARGUS = Calculator**  
   Landscape = Calculator + Institutional Memory

2. **ARGUS = One Project at a Time**  
   Landscape = Learning Across All Projects

3. **ARGUS = User Must Know What to Look For**  
   Landscape = Proactively Surfaces Insights

4. **ARGUS = Static Assumptions**  
   Landscape = Market-Aware, Self-Updating Intelligence

5. **ARGUS = No Context Between Users**  
   Landscape = Team Knowledge Compounds

**The moat isn't the calculator - it's the knowledge engine that gets smarter with every use.**

---

**END OF ARCHITECTURE**

**GR43**
