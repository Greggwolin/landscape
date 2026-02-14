"""
Knowledge Services Package

Entity-Fact Knowledge Graph:
- EntitySyncService: Get-or-create canonical entities (projects, documents, markets)
- FactService: Create facts with provenance and supersession
- EntityFactRetriever: Query Entity-Fact tables for Landscaper context
- get_entity_fact_context: Convenience function for context retrieval

Platform Knowledge (Hidden RAG):
- PlatformKnowledgeRetriever: Semantic search over foundational appraisal texts

User Knowledge (Personalized Learning):
- UserKnowledgeRetriever: Entity-Fact based user knowledge retrieval
- save_assumption: Store assumptions for learning
- ingest_document: Chunk and embed user documents

Embedding:
- generate_embedding: Create embeddings via OpenAI ada-002

Validation:
- ValuationValidator: Validate project data against appraisal methodology
"""

# Entity-Fact Knowledge Graph
from .entity_sync_service import EntitySyncService
from .fact_service import FactService, create_project_fact
from .entity_fact_retriever import EntityFactRetriever, get_entity_fact_context

# Platform Knowledge
from .platform_knowledge_retriever import (
    PlatformKnowledgeRetriever,
    get_platform_knowledge_retriever,
)

# User Knowledge
from .user_knowledge_retriever import (
    UserKnowledgeRetriever,
    get_user_knowledge_retriever,
)

# Learning Loop
from .assumption_saver import (
    save_assumption,
    save_assumptions_from_tool_call,
)

# Document Ingestion
from .user_document_ingest import (
    ingest_document,
    ingest_from_extraction,
    get_document_stats,
)

# Embedding
from .embedding_service import (
    generate_embedding,
    generate_embeddings_batch,
    cosine_similarity,
)

# Validation
from .valuation_validator import (
    ValuationValidator,
    PropertyType,
    Severity,
    ValidationGap,
)

# Document Classification & Conflict Resolution
from .document_classifier import (
    DocumentType,
    DocumentClassifier,
    classify_document,
    classify_project_documents,
    get_document_priority,
    get_field_type,
)

from .conflict_resolver import (
    resolve_conflict,
    resolve_field_conflicts_for_project,
    get_document_conflicts_summary,
    apply_conflict_resolutions,
    compare_rent_totals,
    compare_unit_counts,
)

# Subtype Classification
from .subtype_classifier import (
    DocumentSubtypeClassifier,
    SubtypeResult,
)

# OpEx Utilities
from .opex_utils import (
    normalize_expense_label,
    strip_gl_code,
    check_expense_anomaly,
    check_all_expense_anomalies,
)

__all__ = [
    # Entity-Fact Knowledge Graph
    'EntitySyncService',
    'FactService',
    'create_project_fact',
    'EntityFactRetriever',
    'get_entity_fact_context',
    # Platform Knowledge
    'PlatformKnowledgeRetriever',
    'get_platform_knowledge_retriever',
    # User Knowledge
    'UserKnowledgeRetriever',
    'get_user_knowledge_retriever',
    # Learning Loop
    'save_assumption',
    'save_assumptions_from_tool_call',
    # Document Ingestion
    'ingest_document',
    'ingest_from_extraction',
    'get_document_stats',
    # Embedding
    'generate_embedding',
    'generate_embeddings_batch',
    'cosine_similarity',
    # Validation
    'ValuationValidator',
    'PropertyType',
    'Severity',
    'ValidationGap',
    # Document Classification & Conflict Resolution
    'DocumentType',
    'DocumentClassifier',
    'classify_document',
    'classify_project_documents',
    'get_document_priority',
    'get_field_type',
    'resolve_conflict',
    'resolve_field_conflicts_for_project',
    'get_document_conflicts_summary',
    'apply_conflict_resolutions',
    'compare_rent_totals',
    'compare_unit_counts',
    # Subtype Classification
    'DocumentSubtypeClassifier',
    'SubtypeResult',
    # OpEx Utilities
    'normalize_expense_label',
    'strip_gl_code',
    'check_expense_anomaly',
    'check_all_expense_anomalies',
]
