# Claude Code Prompt: Landscape Persistence Architecture - Phase 1

**Date:** November 12, 2025  
**Session ID:** GR47  
**Priority:** CRITICAL - Foundation for entire platform intelligence

---

## CLARIFICATIONS FOR IMPLEMENTATION

**Answers to common questions:**

1. **Project Structure:**
   - Backend exists at `/backend/` (Django project)
   - Create new app: `python manage.py startapp knowledge`
   - Existing extraction code: `/backend/services/extraction/`

2. **Existing Models:**
   - User: Standard Django auth User model
   - `workspace_id` may not exist on User - handle gracefully with `getattr()`
   - Project/Workspace models exist somewhere in existing code
   - Database: PostgreSQL (Neon) with JSONB and array support

3. **Integration Point:**
   - File: `/backend/services/extraction/extraction_worker.py`
   - Function: `process_extraction_queue()` 
   - Insert knowledge ingestion after `_store_assertions()` call
   - CoreDoc model exists in DMS tables

4. **Migration Strategy:**
   - Use Django migrations (standard approach)
   - Run `python manage.py makemigrations knowledge`
   - SQL shown for reference only

5. **Vector Fields:**
   - Skip in Phase 1 - will add in Phase 2
   - Table structure ready, field commented out in model

6. **Foreign Keys:**
   - Use plain integers for project_id, workspace_id (loose coupling)
   - Direct FKs for User, KnowledgeEntity (tight coupling)

7. **Testing:**
   - Manual testing commands provided
   - No automated tests in Phase 1

8. **Architecture Reference:**
   - Full architecture: `/mnt/user-data/outputs/LANDSCAPE_PERSISTENCE_ARCHITECTURE.md`
   - Rent roll spec: `/mnt/user-data/outputs/CLAUDE_CODE_RENT_ROLL_INGESTION_PROMPT.md`

---

## CONTEXT

You are implementing the foundational persistence layer for Landscape, an AI-powered real estate development platform. This is NOT just a database - it's the institutional memory system that makes Landscape intelligent.

**Reference Architecture:** `/mnt/user-data/outputs/LANDSCAPE_PERSISTENCE_ARCHITECTURE.md`

**Current State:**
- Rent roll extraction system exists but stores data in flat tables
- No knowledge persistence
- No AI memory between sessions
- No learning from user interactions

**Goal:**
Transform Landscape from a calculator into an intelligent system that learns and remembers.

---

## WHAT YOU'RE BUILDING

### Phase 1 Deliverables

1. **Knowledge database schema** (6 core tables)
2. **Entity/Fact models** (Django ORM)
3. **Knowledge ingestion service** (converts data → knowledge)
4. **Basic session management** (tracks user context)
5. **Integration with existing rent roll extraction** (data flows into knowledge base)

---

## IMPLEMENTATION STEPS

### STEP 1: Create Knowledge App and Database Schema

**Create Django app:**

```bash
cd backend
python manage.py startapp knowledge
```

**Register app in settings.py:**

Add `'knowledge'` to `INSTALLED_APPS`

**Create migration file using Django:**

The migration will create the following tables:

```sql
-- 1. Entities (things the system knows about)
CREATE TABLE knowledge_entities (
    entity_id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, 
    entity_subtype VARCHAR(50),
    canonical_name VARCHAR(255) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_entity_type ON knowledge_entities(entity_type);
CREATE INDEX idx_entity_name ON knowledge_entities(canonical_name);
CREATE INDEX idx_entity_metadata ON knowledge_entities USING GIN(metadata);

-- 2. Facts (assertions about entities)
CREATE TABLE knowledge_facts (
    fact_id SERIAL PRIMARY KEY,
    subject_entity_id INTEGER REFERENCES knowledge_entities(entity_id),
    predicate VARCHAR(100) NOT NULL,
    object_value TEXT,
    object_entity_id INTEGER REFERENCES knowledge_entities(entity_id),
    
    valid_from DATE,
    valid_to DATE,
    
    source_type VARCHAR(50) NOT NULL,
    source_id INTEGER,
    confidence_score DECIMAL(3,2),
    
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER,
    
    superseded_by INTEGER REFERENCES knowledge_facts(fact_id),
    is_current BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_fact_subject ON knowledge_facts(subject_entity_id);
CREATE INDEX idx_fact_predicate ON knowledge_facts(predicate);
CREATE INDEX idx_fact_object_entity ON knowledge_facts(object_entity_id);
CREATE INDEX idx_fact_temporal ON knowledge_facts(valid_from, valid_to);
CREATE INDEX idx_fact_current ON knowledge_facts(is_current);

-- 3. Sessions (user interaction tracking)
CREATE TABLE knowledge_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    workspace_id INTEGER,
    project_id INTEGER,
    
    session_start TIMESTAMP DEFAULT NOW(),
    session_end TIMESTAMP,
    
    loaded_entities INTEGER[],
    context_token_count INTEGER,
    context_summary TEXT,
    
    metadata JSONB
);

CREATE INDEX idx_session_user ON knowledge_sessions(user_id);
CREATE INDEX idx_session_project ON knowledge_sessions(project_id);
CREATE INDEX idx_session_active ON knowledge_sessions(session_end) WHERE session_end IS NULL;

-- 4. Interactions (AI conversation log)
CREATE TABLE knowledge_interactions (
    interaction_id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES knowledge_sessions(session_id),
    
    user_query TEXT NOT NULL,
    query_type VARCHAR(50),
    query_intent VARCHAR(100),
    
    context_entities INTEGER[],
    context_facts INTEGER[],
    context_token_count INTEGER,
    
    ai_response TEXT,
    response_type VARCHAR(50),
    confidence_score DECIMAL(3,2),
    
    input_tokens INTEGER,
    output_tokens INTEGER,
    
    user_feedback VARCHAR(20),
    user_correction TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interaction_session ON knowledge_interactions(session_id);
CREATE INDEX idx_interaction_intent ON knowledge_interactions(query_intent);
CREATE INDEX idx_interaction_time ON knowledge_interactions(created_at);

-- 5. Embeddings (for semantic search - Phase 2)
-- Note: Vector field will be added in Phase 2 when pgvector is configured
CREATE TABLE knowledge_embeddings (
    embedding_id SERIAL PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL,
    source_id INTEGER NOT NULL,
    
    content_text TEXT NOT NULL,
    -- embedding vector(1536) field will be added in Phase 2
    
    entity_ids INTEGER[],
    tags VARCHAR(50)[],
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_embedding_source ON knowledge_embeddings(source_type, source_id);
CREATE INDEX idx_embedding_entities ON knowledge_embeddings USING GIN(entity_ids);

-- 6. Insights (proactive discoveries - Phase 3, create table now)
CREATE TABLE knowledge_insights (
    insight_id SERIAL PRIMARY KEY,
    insight_type VARCHAR(50) NOT NULL,
    
    subject_entity_id INTEGER REFERENCES knowledge_entities(entity_id),
    related_entities INTEGER[],
    
    insight_title VARCHAR(255) NOT NULL,
    insight_description TEXT NOT NULL,
    severity VARCHAR(20),
    
    supporting_facts INTEGER[],
    confidence_score DECIMAL(3,2),
    
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    acknowledged_by INTEGER,
    user_action VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_insight_entity ON knowledge_insights(subject_entity_id);
CREATE INDEX idx_insight_type ON knowledge_insights(insight_type);
CREATE INDEX idx_insight_unack ON knowledge_insights(acknowledged) WHERE NOT acknowledged;
```

**Note:** You don't need to create these SQL files manually. Django will generate them from the models in Step 2.

After creating models in Step 2, run:

```bash
python manage.py makemigrations knowledge
python manage.py migrate knowledge
```

---

### STEP 2: Django Models

**Create file:** `/backend/knowledge/models.py`

```python
from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.contrib.auth import get_user_model

User = get_user_model()


class KnowledgeEntity(models.Model):
    """
    Canonical representation of things the system knows about
    """
    ENTITY_TYPES = [
        ('project', 'Project'),
        ('property', 'Property'),
        ('unit', 'Unit'),
        ('unit_type', 'Unit Type'),
        ('market', 'Market'),
        ('assumption', 'Assumption'),
        ('document', 'Document'),
        ('person', 'Person'),
        ('company', 'Company'),
    ]
    
    entity_id = models.AutoField(primary_key=True)
    entity_type = models.CharField(max_length=50, choices=ENTITY_TYPES)
    entity_subtype = models.CharField(max_length=50, null=True, blank=True)
    canonical_name = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'knowledge_entities'
        indexes = [
            models.Index(fields=['entity_type']),
            models.Index(fields=['canonical_name']),
        ]
    
    def __str__(self):
        return f"{self.entity_type}: {self.canonical_name}"


class KnowledgeFact(models.Model):
    """
    Assertions about entities with temporal validity and provenance
    """
    SOURCE_TYPES = [
        ('user_input', 'User Input'),
        ('document_extract', 'Document Extraction'),
        ('market_data', 'Market Data'),
        ('calculation', 'Calculation'),
        ('ai_inference', 'AI Inference'),
        ('user_correction', 'User Correction'),
    ]
    
    fact_id = models.AutoField(primary_key=True)
    subject_entity = models.ForeignKey(
        KnowledgeEntity, 
        on_delete=models.CASCADE,
        related_name='facts_about'
    )
    predicate = models.CharField(max_length=100)
    object_value = models.TextField(null=True, blank=True)
    object_entity = models.ForeignKey(
        KnowledgeEntity,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='facts_linking_to'
    )
    
    # Temporal validity
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)
    
    # Provenance
    source_type = models.CharField(max_length=50, choices=SOURCE_TYPES)
    source_id = models.IntegerField(null=True, blank=True)
    confidence_score = models.DecimalField(max_digits=3, decimal_places=2, null=True)
    
    # Metadata
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.IntegerField(null=True, blank=True)
    
    # Versioning
    superseded_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supersedes'
    )
    is_current = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'knowledge_facts'
        indexes = [
            models.Index(fields=['subject_entity']),
            models.Index(fields=['predicate']),
            models.Index(fields=['object_entity']),
            models.Index(fields=['valid_from', 'valid_to']),
            models.Index(fields=['is_current']),
        ]
    
    def __str__(self):
        return f"{self.subject_entity.canonical_name} {self.predicate} {self.object_value or self.object_entity}"


class KnowledgeSession(models.Model):
    """
    Track user interaction sessions
    """
    session_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    workspace_id = models.IntegerField(null=True, blank=True)  # Loose coupling - FK may not exist yet
    project_id = models.IntegerField(null=True, blank=True)    # Loose coupling - FK may not exist yet
    
    session_start = models.DateTimeField(auto_now_add=True)
    session_end = models.DateTimeField(null=True, blank=True)
    
    loaded_entities = ArrayField(models.IntegerField(), default=list)
    context_token_count = models.IntegerField(null=True, blank=True)
    context_summary = models.TextField(null=True, blank=True)
    
    metadata = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'knowledge_sessions'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['project_id']),
        ]


class KnowledgeInteraction(models.Model):
    """
    Log every AI interaction
    """
    QUERY_TYPES = [
        ('question', 'Question'),
        ('command', 'Command'),
        ('correction', 'Correction'),
        ('upload', 'Upload'),
    ]
    
    interaction_id = models.AutoField(primary_key=True)
    session = models.ForeignKey(
        KnowledgeSession,
        on_delete=models.CASCADE,
        related_name='interactions'
    )
    
    user_query = models.TextField()
    query_type = models.CharField(max_length=50, choices=QUERY_TYPES, null=True)
    query_intent = models.CharField(max_length=100, null=True)
    
    context_entities = ArrayField(models.IntegerField(), default=list)
    context_facts = ArrayField(models.IntegerField(), default=list)
    context_token_count = models.IntegerField(null=True)
    
    ai_response = models.TextField(null=True)
    response_type = models.CharField(max_length=50, null=True)
    confidence_score = models.DecimalField(max_digits=3, decimal_places=2, null=True)
    
    input_tokens = models.IntegerField(null=True)
    output_tokens = models.IntegerField(null=True)
    
    user_feedback = models.CharField(max_length=20, null=True)
    user_correction = models.TextField(null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'knowledge_interactions'
        indexes = [
            models.Index(fields=['session']),
            models.Index(fields=['query_intent']),
            models.Index(fields=['created_at']),
        ]


class KnowledgeEmbedding(models.Model):
    """
    Vector embeddings for semantic search (Phase 2)
    Note: Vector field will be added in Phase 2 when pgvector is configured
    """
    embedding_id = models.AutoField(primary_key=True)
    source_type = models.CharField(max_length=50)
    source_id = models.IntegerField()
    
    content_text = models.TextField()
    # Vector embedding field will be added in Phase 2
    
    entity_ids = ArrayField(models.IntegerField(), default=list)
    tags = ArrayField(models.CharField(max_length=50), default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'knowledge_embeddings'
        indexes = [
            models.Index(fields=['source_type', 'source_id']),
        ]


class KnowledgeInsight(models.Model):
    """
    Proactive insights discovered by AI (Phase 3)
    """
    INSIGHT_TYPES = [
        ('anomaly', 'Anomaly'),
        ('trend', 'Trend'),
        ('opportunity', 'Opportunity'),
        ('risk', 'Risk'),
        ('benchmark', 'Benchmark'),
    ]
    
    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    insight_id = models.AutoField(primary_key=True)
    insight_type = models.CharField(max_length=50, choices=INSIGHT_TYPES)
    
    subject_entity = models.ForeignKey(
        KnowledgeEntity,
        on_delete=models.CASCADE,
        related_name='insights'
    )
    related_entities = ArrayField(models.IntegerField(), default=list)
    
    insight_title = models.CharField(max_length=255)
    insight_description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, null=True)
    
    supporting_facts = ArrayField(models.IntegerField(), default=list)
    confidence_score = models.DecimalField(max_digits=3, decimal_places=2, null=True)
    
    acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    user_action = models.CharField(max_length=100, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'knowledge_insights'
        indexes = [
            models.Index(fields=['subject_entity']),
            models.Index(fields=['insight_type']),
        ]
```

**Register models in admin (optional):**

Create `/backend/knowledge/admin.py`:
```python
from django.contrib import admin
from .models import (
    KnowledgeEntity,
    KnowledgeFact,
    KnowledgeSession,
    KnowledgeInteraction,
    KnowledgeInsight
)

@admin.register(KnowledgeEntity)
class KnowledgeEntityAdmin(admin.ModelAdmin):
    list_display = ['entity_id', 'entity_type', 'canonical_name', 'created_at']
    list_filter = ['entity_type', 'entity_subtype']
    search_fields = ['canonical_name']

@admin.register(KnowledgeFact)
class KnowledgeFactAdmin(admin.ModelAdmin):
    list_display = ['fact_id', 'subject_entity', 'predicate', 'object_value', 'confidence_score', 'is_current']
    list_filter = ['source_type', 'is_current']
    search_fields = ['predicate', 'object_value']

@admin.register(KnowledgeSession)
class KnowledgeSessionAdmin(admin.ModelAdmin):
    list_display = ['session_id', 'user', 'project_id', 'session_start', 'session_end']
    list_filter = ['session_start']

@admin.register(KnowledgeInteraction)
class KnowledgeInteractionAdmin(admin.ModelAdmin):
    list_display = ['interaction_id', 'session', 'query_type', 'user_feedback', 'created_at']
    list_filter = ['query_type', 'user_feedback']
    search_fields = ['user_query', 'ai_response']

@admin.register(KnowledgeInsight)
class KnowledgeInsightAdmin(admin.ModelAdmin):
    list_display = ['insight_id', 'insight_type', 'severity', 'acknowledged', 'created_at']
    list_filter = ['insight_type', 'severity', 'acknowledged']
    search_fields = ['insight_title', 'insight_description']
```

---

### STEP 3: Knowledge Ingestion Service

**Create file:** `/backend/knowledge/services/ingestion_service.py`

```python
from typing import Dict, List, Optional
from datetime import datetime
from decimal import Decimal

from ..models import KnowledgeEntity, KnowledgeFact


class KnowledgeIngestionService:
    """
    Convert extracted data into knowledge entities and facts
    """
    
    def ingest_rent_roll(self, doc_id: int, extraction_result: Dict, project_id: int) -> Dict:
        """
        Convert rent roll extraction into knowledge base
        
        Args:
            doc_id: CoreDoc ID
            extraction_result: Output from RentRollExtractor
            project_id: Associated project
            
        Returns:
            Summary of ingested knowledge
        """
        
        # 1. Create/get property entity
        property_entity = self._get_or_create_property_entity(
            extraction_result['property_info'],
            extraction_result['extraction_metadata'],
            project_id
        )
        
        # 2. Create unit entities and facts
        unit_entities = []
        for unit_data in extraction_result['units']:
            unit_entity = self._create_unit_entity(property_entity, unit_data)
            unit_entities.append(unit_entity)
            
            # Create facts about this unit
            self._create_unit_facts(unit_entity, unit_data, doc_id)
        
        # 3. Create lease facts
        lease_facts = []
        for lease_data in extraction_result['leases']:
            facts = self._create_lease_facts(
                property_entity,
                unit_entities,
                lease_data,
                doc_id
            )
            lease_facts.extend(facts)
        
        # 4. Create unit type aggregations
        unit_type_entities = []
        for ut_data in extraction_result['unit_types']:
            ut_entity = self._create_unit_type_entity(property_entity, ut_data)
            unit_type_entities.append(ut_entity)
            
            self._create_unit_type_facts(ut_entity, ut_data, doc_id)
        
        return {
            'property_entity_id': property_entity.entity_id,
            'units_created': len(unit_entities),
            'unit_types_created': len(unit_type_entities),
            'lease_facts_created': len(lease_facts),
            'success': True
        }
    
    def _get_or_create_property_entity(
        self,
        property_info: Dict,
        metadata: Dict,
        project_id: int
    ) -> KnowledgeEntity:
        """
        Create or retrieve property entity
        """
        
        # Try to find existing property by name
        property_name = property_info.get('property_name') or f"Property {project_id}"
        
        entity, created = KnowledgeEntity.objects.get_or_create(
            entity_type='property',
            canonical_name=property_name,
            defaults={
                'entity_subtype': 'multifamily',
                'metadata': {
                    'project_id': project_id,
                    'address': property_info.get('property_address'),
                    'total_units': metadata.get('total_units'),
                    'source': 'rent_roll_extraction'
                }
            }
        )
        
        return entity
    
    def _create_unit_entity(
        self,
        property_entity: KnowledgeEntity,
        unit_data: Dict
    ) -> KnowledgeEntity:
        """
        Create unit entity
        """
        
        unit_number = unit_data['unit_number']
        canonical_name = f"{property_entity.canonical_name} - Unit {unit_number}"
        
        # Check if already exists
        existing = KnowledgeEntity.objects.filter(
            entity_type='unit',
            canonical_name=canonical_name
        ).first()
        
        if existing:
            return existing
        
        return KnowledgeEntity.objects.create(
            entity_type='unit',
            entity_subtype='residential' if not unit_data.get('is_commercial') else 'commercial',
            canonical_name=canonical_name,
            metadata={
                'property_entity_id': property_entity.entity_id,
                'unit_number': unit_number,
                'bedrooms': unit_data.get('bedroom_count'),
                'bathrooms': unit_data.get('bathroom_count'),
                'sqft': unit_data.get('square_feet'),
                'is_commercial': unit_data.get('is_commercial', False)
            }
        )
    
    def _create_unit_facts(
        self,
        unit_entity: KnowledgeEntity,
        unit_data: Dict,
        doc_id: int
    ):
        """
        Create facts about a unit
        """
        
        # Occupancy status fact
        KnowledgeFact.objects.create(
            subject_entity=unit_entity,
            predicate='occupancy_status',
            object_value=unit_data['status'],
            source_type='document_extract',
            source_id=doc_id,
            confidence_score=Decimal(str(unit_data['confidence']))
        )
        
        # Square footage fact (if present)
        if unit_data.get('square_feet'):
            KnowledgeFact.objects.create(
                subject_entity=unit_entity,
                predicate='square_feet',
                object_value=str(unit_data['square_feet']),
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(unit_data['confidence']))
            )
    
    def _create_lease_facts(
        self,
        property_entity: KnowledgeEntity,
        unit_entities: List[KnowledgeEntity],
        lease_data: Dict,
        doc_id: int
    ) -> List[KnowledgeFact]:
        """
        Create lease facts
        """
        
        # Find unit entity
        unit_entity = next(
            (u for u in unit_entities 
             if u.metadata['unit_number'] == lease_data['unit_number']),
            None
        )
        
        if not unit_entity:
            return []
        
        facts = []
        
        # Monthly rent fact
        if lease_data.get('monthly_rent'):
            fact = KnowledgeFact.objects.create(
                subject_entity=unit_entity,
                predicate='monthly_rent',
                object_value=str(lease_data['monthly_rent']),
                valid_from=lease_data.get('lease_start_date'),
                valid_to=lease_data.get('lease_end_date'),
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(lease_data['confidence']))
            )
            facts.append(fact)
        
        # Lease dates
        if lease_data.get('lease_start_date'):
            fact = KnowledgeFact.objects.create(
                subject_entity=unit_entity,
                predicate='lease_start_date',
                object_value=lease_data['lease_start_date'],
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(lease_data['confidence']))
            )
            facts.append(fact)
        
        if lease_data.get('lease_end_date'):
            fact = KnowledgeFact.objects.create(
                subject_entity=unit_entity,
                predicate='lease_end_date',
                object_value=lease_data['lease_end_date'],
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(lease_data['confidence']))
            )
            facts.append(fact)
        
        # Section 8 flag
        if lease_data.get('is_section_8'):
            fact = KnowledgeFact.objects.create(
                subject_entity=unit_entity,
                predicate='subsidy_type',
                object_value='section_8',
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal('1.0')
            )
            facts.append(fact)
        
        # Lease type
        fact = KnowledgeFact.objects.create(
            subject_entity=unit_entity,
            predicate='lease_type',
            object_value=lease_data.get('lease_type', 'fixed_term'),
            source_type='document_extract',
            source_id=doc_id,
            confidence_score=Decimal(str(lease_data['confidence']))
        )
        facts.append(fact)
        
        return facts
    
    def _create_unit_type_entity(
        self,
        property_entity: KnowledgeEntity,
        ut_data: Dict
    ) -> KnowledgeEntity:
        """
        Create unit type entity (bedroom/bathroom configuration)
        """
        
        type_name = f"{ut_data['bedroom_count']}BR/{ut_data['bathroom_count']}BA"
        canonical_name = f"{property_entity.canonical_name} - {type_name}"
        
        # Check if exists
        existing = KnowledgeEntity.objects.filter(
            entity_type='unit_type',
            canonical_name=canonical_name
        ).first()
        
        if existing:
            return existing
        
        return KnowledgeEntity.objects.create(
            entity_type='unit_type',
            canonical_name=canonical_name,
            metadata={
                'property_entity_id': property_entity.entity_id,
                'bedrooms': ut_data['bedroom_count'],
                'bathrooms': ut_data['bathroom_count'],
                'unit_count': ut_data['unit_count']
            }
        )
    
    def _create_unit_type_facts(
        self,
        ut_entity: KnowledgeEntity,
        ut_data: Dict,
        doc_id: int
    ):
        """
        Create facts about unit type
        """
        
        # Market rent fact
        if ut_data.get('market_rent_monthly'):
            KnowledgeFact.objects.create(
                subject_entity=ut_entity,
                predicate='market_rent_monthly',
                object_value=str(ut_data['market_rent_monthly']),
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(ut_data['confidence']))
            )
        
        # Typical square footage
        if ut_data.get('typical_sqft'):
            KnowledgeFact.objects.create(
                subject_entity=ut_entity,
                predicate='typical_sqft',
                object_value=str(ut_data['typical_sqft']),
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(ut_data['confidence']))
            )
        
        # Unit count
        KnowledgeFact.objects.create(
            subject_entity=ut_entity,
            predicate='unit_count',
            object_value=str(ut_data['unit_count']),
            source_type='document_extract',
            source_id=doc_id,
            confidence_score=Decimal('1.0')
        )
```

---

### STEP 4: Integrate with Existing Rent Roll Extraction

**Location:** The existing rent roll extraction system is in `/backend/services/extraction/`

**Update file:** `/backend/services/extraction/extraction_worker.py`

**Find this section where assertions are stored, and add knowledge ingestion after:**

**Note:** The `extraction_result` dictionary structure is defined in the rent roll extraction system. It contains:
- `property_info`: Property metadata
- `extraction_metadata`: Summary stats (total_units, vacancy_rate, etc.)
- `units`: List of unit data dicts with confidence scores
- `leases`: List of lease data dicts with confidence scores  
- `unit_types`: List of unit type aggregations with confidence scores

Reference: `/mnt/user-data/outputs/CLAUDE_CODE_RENT_ROLL_INGESTION_PROMPT.md` for complete structure.

```python
from knowledge.services.ingestion_service import KnowledgeIngestionService

def process_extraction_queue():
    """
    Background worker to process queued extractions
    """
    
    # ... existing code ...
    
    for job in pending_jobs:
        try:
            # ... existing extraction code ...
            
            # Store assertions (existing)
            _store_assertions(doc.id, extraction_result)
            
            # NEW: Ingest into knowledge base
            ingestion_service = KnowledgeIngestionService()
            knowledge_result = ingestion_service.ingest_rent_roll(
                doc_id=doc.id,
                extraction_result=extraction_result,
                project_id=doc.project_id
            )
            
            # Update job with knowledge ingestion results
            result_summary = json.loads(job.result_summary)
            result_summary['knowledge_ingested'] = knowledge_result
            job.result_summary = json.dumps(result_summary)
            job.save()
            
            # ... rest of existing code ...
```

---

### STEP 5: Session Management API

**Create file:** `/backend/knowledge/views/session_views.py`

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime

from ..models import KnowledgeSession, KnowledgeEntity, KnowledgeFact


@api_view(['POST'])
def start_session(request):
    """
    Start a new knowledge session
    
    POST /api/knowledge/sessions/start/
    Body: {
        "project_id": 123,
        "context_summary": "Working on Peoria Lakes underwriting"
    }
    """
    
    project_id = request.data.get('project_id')
    context_summary = request.data.get('context_summary', '')
    
    # Create session
    workspace_id = getattr(request.user, 'workspace_id', None)  # May not exist yet
    
    session = KnowledgeSession.objects.create(
        user=request.user,
        workspace_id=workspace_id,
        project_id=project_id,
        context_summary=context_summary
    )
    
    # Load project context (simplified for Phase 1)
    project_entities = _load_project_entities(project_id)
    
    session.loaded_entities = [e.entity_id for e in project_entities]
    session.save()
    
    return Response({
        'session_id': session.session_id,
        'loaded_entities_count': len(project_entities),
        'status': 'active'
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def end_session(request, session_id):
    """
    End a knowledge session
    
    POST /api/knowledge/sessions/{session_id}/end/
    """
    
    try:
        session = KnowledgeSession.objects.get(
            session_id=session_id,
            user=request.user
        )
        
        session.session_end = datetime.now()
        session.save()
        
        return Response({
            'session_id': session_id,
            'status': 'ended',
            'duration_seconds': (session.session_end - session.session_start).total_seconds()
        })
        
    except KnowledgeSession.DoesNotExist:
        return Response(
            {'error': 'Session not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
def get_session_context(request, session_id):
    """
    Retrieve session context
    
    GET /api/knowledge/sessions/{session_id}/context/
    """
    
    try:
        session = KnowledgeSession.objects.get(
            session_id=session_id,
            user=request.user
        )
        
        # Get loaded entities
        entities = KnowledgeEntity.objects.filter(
            entity_id__in=session.loaded_entities
        )
        
        # Get current facts about these entities
        facts = KnowledgeFact.objects.filter(
            subject_entity_id__in=session.loaded_entities,
            is_current=True
        )
        
        return Response({
            'session_id': session_id,
            'entities_count': entities.count(),
            'facts_count': facts.count(),
            'entities': [
                {
                    'entity_id': e.entity_id,
                    'entity_type': e.entity_type,
                    'canonical_name': e.canonical_name,
                    'metadata': e.metadata
                }
                for e in entities[:50]  # Limit for performance
            ],
            'facts': [
                {
                    'fact_id': f.fact_id,
                    'subject': f.subject_entity.canonical_name,
                    'predicate': f.predicate,
                    'object_value': f.object_value,
                    'confidence_score': float(f.confidence_score) if f.confidence_score else None,
                    'source_type': f.source_type
                }
                for f in facts[:100]  # Limit for performance
            ]
        })
        
    except KnowledgeSession.DoesNotExist:
        return Response(
            {'error': 'Session not found'},
            status=status.HTTP_404_NOT_FOUND
        )


def _load_project_entities(project_id: int):
    """
    Load all entities related to a project
    """
    
    # Find property entities for this project
    property_entities = KnowledgeEntity.objects.filter(
        entity_type='property',
        metadata__project_id=project_id
    )
    
    all_entities = list(property_entities)
    
    # Find related unit entities
    for prop in property_entities:
        units = KnowledgeEntity.objects.filter(
            entity_type='unit',
            metadata__property_entity_id=prop.entity_id
        )
        all_entities.extend(units)
    
    return all_entities
```

**Add routes:** `/backend/knowledge/urls.py`

```python
from django.urls import path
from .views import session_views

urlpatterns = [
    path('sessions/start/', session_views.start_session, name='start_session'),
    path('sessions/<int:session_id>/end/', session_views.end_session, name='end_session'),
    path('sessions/<int:session_id>/context/', session_views.get_session_context, name='get_session_context'),
]
```

**Include in main urls:** `/backend/api/urls.py`

```python
from django.urls import path, include

urlpatterns = [
    # ... existing patterns ...
    path('knowledge/', include('knowledge.urls')),
]
```

**Note:** DRF is already installed and configured. API endpoints will use existing authentication.

---

### STEP 6: Testing & Validation

**Test knowledge ingestion:**

```bash
# 1. Run existing rent roll extraction
python manage.py process_extractions

# 2. Check knowledge entities were created
python manage.py shell
>>> from knowledge.models import KnowledgeEntity, KnowledgeFact
>>> KnowledgeEntity.objects.filter(entity_type='property').count()
>>> KnowledgeEntity.objects.filter(entity_type='unit').count()
>>> KnowledgeFact.objects.filter(predicate='monthly_rent').count()

# 3. Test session API
curl -X POST http://localhost:8000/api/knowledge/sessions/start/ \
  -H "Content-Type: application/json" \
  -d '{"project_id": 11, "context_summary": "Testing knowledge system"}'

# 4. Get session context
curl http://localhost:8000/api/knowledge/sessions/1/context/
```

**Verify data structure:**

```python
# In Django shell
from knowledge.models import KnowledgeEntity, KnowledgeFact

# Check property entity
prop = KnowledgeEntity.objects.filter(entity_type='property').first()
print(f"Property: {prop.canonical_name}")
print(f"Metadata: {prop.metadata}")

# Check unit entities
units = KnowledgeEntity.objects.filter(entity_type='unit')[:5]
for unit in units:
    print(f"Unit: {unit.canonical_name}")
    facts = KnowledgeFact.objects.filter(subject_entity=unit, is_current=True)
    for fact in facts:
        print(f"  {fact.predicate}: {fact.object_value}")
```

---

## SUCCESS CRITERIA

**Phase 1 is complete when:**

✅ All 6 database tables created and migrated  
✅ Django models work correctly  
✅ Rent roll extraction creates knowledge entities  
✅ Rent roll extraction creates knowledge facts  
✅ Session API endpoints functional  
✅ Can query knowledge via Django ORM  
✅ Data flows: Document → Extraction → Knowledge → Session Context

**Verification checklist:**

- [ ] Migration runs without errors
- [ ] Upload rent roll file → Knowledge entities created
- [ ] Upload rent roll file → Knowledge facts created with confidence scores
- [ ] Start session API → Returns session_id
- [ ] Get context API → Returns entities and facts
- [ ] Django admin shows knowledge records
- [ ] Can query facts by predicate (e.g., 'monthly_rent')
- [ ] Facts have proper provenance (source_type, source_id)

---

## WHAT'S NOT IN PHASE 1

**Deferred to later phases:**

- ❌ AI reasoning with context (Phase 2)
- ❌ Semantic search / embeddings (Phase 2)
- ❌ Insight discovery (Phase 3)
- ❌ User corrections learning (Phase 4)
- ❌ Context caching / optimization (Phase 5)

**Phase 1 builds the foundation. Future phases add intelligence.**

---

## NOTES & REMINDERS

1. **Confidence scores:** Store as DECIMAL(3,2) for precision (0.00 to 1.00)

2. **Entity uniqueness:** Use canonical_name + entity_type to avoid duplicates

3. **Fact versioning:** When creating new fact about same subject/predicate, set old fact's `is_current=False`

4. **Session cleanup:** Consider cron job to close sessions older than 24 hours

5. **Performance:** Add database indexes if queries get slow (already included in schema)

6. **Provenance:** Always track source_type and source_id for every fact

7. **Testing:** Use Chadron sample files for validation (same as rent roll extraction tests)

---

## DEBUGGING TIPS

**If entities aren't created:**
- Check `ingest_rent_roll()` is called in extraction_worker
- Verify extraction_result has expected structure
- Check Django logs for exceptions

**If facts aren't created:**
- Verify entity_ids exist in knowledge_entities table
- Check confidence_score format (should be Decimal, not float string)
- Look for foreign key constraint errors

**If sessions don't work:**
- Verify user authentication in API calls
- Check workspace_id exists
- Look for project_id validity

---

## DELIVERABLES

When Phase 1 is complete, commit:

1. Migration file: `0001_knowledge_foundation.sql`
2. Models: `/backend/knowledge/models.py`
3. Ingestion service: `/backend/knowledge/services/ingestion_service.py`
4. Updated extraction worker: `/backend/services/extraction/extraction_worker.py`
5. Session views: `/backend/knowledge/views/session_views.py`
6. URLs: `/backend/knowledge/urls.py`
7. Admin registration: `/backend/knowledge/admin.py`

**Documentation:**
- README explaining knowledge architecture
- API endpoint documentation for sessions
- Example queries for common use cases

---

**BEGIN IMPLEMENTATION**

Start with Step 1 (database schema migration) and proceed sequentially through Step 6.

**GR47**
