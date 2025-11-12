/**
 * Knowledge Persistence Types
 *
 * Date: November 12, 2025
 * Session: GR47
 * Purpose: TypeScript types for knowledge persistence layer
 */

// ============================================================================
// ENTITY TYPES
// ============================================================================

export type EntityType =
  | 'project'
  | 'property'
  | 'unit'
  | 'unit_type'
  | 'market'
  | 'assumption'
  | 'document'
  | 'person'
  | 'company';

export interface KnowledgeEntity {
  entity_id: number;
  entity_type: EntityType;
  entity_subtype?: string | null;
  canonical_name: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  created_by?: number | null;
}

export interface CreateEntityInput {
  entity_type: EntityType;
  entity_subtype?: string;
  canonical_name: string;
  metadata?: Record<string, any>;
  created_by?: number;
}

// ============================================================================
// FACT TYPES
// ============================================================================

export type SourceType =
  | 'user_input'
  | 'document_extract'
  | 'market_data'
  | 'calculation'
  | 'ai_inference'
  | 'user_correction';

export interface KnowledgeFact {
  fact_id: number;
  subject_entity_id: number;
  predicate: string;
  object_value?: string | null;
  object_entity_id?: number | null;

  // Temporal validity
  valid_from?: Date | null;
  valid_to?: Date | null;

  // Provenance
  source_type: SourceType;
  source_id?: number | null;
  confidence_score?: number | null; // 0.00 to 1.00

  // Metadata
  metadata: Record<string, any>;
  created_at: Date;
  created_by?: number | null;

  // Versioning
  superseded_by?: number | null;
  is_current: boolean;
}

export interface CreateFactInput {
  subject_entity_id: number;
  predicate: string;
  object_value?: string;
  object_entity_id?: number;
  valid_from?: string; // ISO date string
  valid_to?: string; // ISO date string
  source_type: SourceType;
  source_id?: number;
  confidence_score?: number;
  metadata?: Record<string, any>;
  created_by?: number;
}

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface KnowledgeSession {
  session_id: number;
  user_id?: number | null;
  workspace_id?: number | null;
  project_id?: number | null;

  session_start: Date;
  session_end?: Date | null;

  loaded_entities: number[];
  context_token_count?: number | null;
  context_summary?: string | null;

  metadata: Record<string, any>;
}

export interface CreateSessionInput {
  user_id?: number;
  workspace_id?: number;
  project_id?: number;
  context_summary?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// INTERACTION TYPES
// ============================================================================

export type QueryType = 'question' | 'command' | 'correction' | 'upload';
export type ResponseType = 'answer' | 'insight' | 'warning' | 'suggestion';
export type UserFeedback = 'helpful' | 'not_helpful' | 'incorrect';

export interface KnowledgeInteraction {
  interaction_id: number;
  session_id: number;

  user_query: string;
  query_type?: QueryType | null;
  query_intent?: string | null;

  context_entities: number[];
  context_facts: number[];
  context_token_count?: number | null;

  ai_response?: string | null;
  response_type?: ResponseType | null;
  confidence_score?: number | null;

  input_tokens?: number | null;
  output_tokens?: number | null;

  user_feedback?: UserFeedback | null;
  user_correction?: string | null;

  created_at: Date;
}

export interface CreateInteractionInput {
  session_id: number;
  user_query: string;
  query_type?: QueryType;
  query_intent?: string;
  context_entities?: number[];
  context_facts?: number[];
  context_token_count?: number;
  ai_response?: string;
  response_type?: ResponseType;
  confidence_score?: number;
  input_tokens?: number;
  output_tokens?: number;
}

// ============================================================================
// EMBEDDING TYPES (Phase 2)
// ============================================================================

export type EmbeddingSourceType = 'fact' | 'document_chunk' | 'interaction' | 'insight';

export interface KnowledgeEmbedding {
  embedding_id: number;
  source_type: EmbeddingSourceType;
  source_id: number;
  content_text: string;
  entity_ids: number[];
  tags: string[];
  created_at: Date;
}

// ============================================================================
// INSIGHT TYPES (Phase 3)
// ============================================================================

export type InsightType = 'anomaly' | 'trend' | 'opportunity' | 'risk' | 'benchmark';
export type InsightSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type InsightAction = 'accepted' | 'rejected' | 'needs_review' | 'fixed';

export interface KnowledgeInsight {
  insight_id: number;
  insight_type: InsightType;

  subject_entity_id: number;
  related_entities: number[];

  insight_title: string;
  insight_description: string;
  severity?: InsightSeverity | null;

  supporting_facts: number[];
  confidence_score?: number | null;

  acknowledged: boolean;
  acknowledged_at?: Date | null;
  acknowledged_by?: number | null;
  user_action?: InsightAction | null;

  created_at: Date;
}

export interface CreateInsightInput {
  insight_type: InsightType;
  subject_entity_id: number;
  related_entities?: number[];
  insight_title: string;
  insight_description: string;
  severity?: InsightSeverity;
  supporting_facts?: number[];
  confidence_score?: number;
}

// ============================================================================
// INGESTION TYPES (for document processing)
// ============================================================================

export interface PropertyInfo {
  property_name?: string;
  property_address?: string;
  report_date?: string;
  confidence?: number;
}

export interface ExtractionMetadata {
  total_units?: number;
  occupied_units?: number;
  vacancy_rate?: number;
  source_type?: 'excel' | 'pdf';
  extracted_at?: string;
}

export interface UnitData {
  unit_number: string;
  bedroom_count?: number;
  bathroom_count?: number;
  square_feet?: number;
  status: string;
  is_commercial?: boolean;
  confidence: number;
}

export interface LeaseData {
  unit_number: string;
  tenant_name?: string | null;
  monthly_rent?: number;
  lease_start_date?: string;
  lease_end_date?: string | null;
  is_section_8?: boolean;
  lease_type?: 'fixed_term' | 'month_to_month';
  confidence: number;
}

export interface UnitTypeData {
  bedroom_count: number;
  bathroom_count: number;
  unit_count: number;
  typical_sqft?: number;
  market_rent_monthly?: number;
  confidence: number;
}

export interface ExtractionResult {
  property_info: PropertyInfo;
  extraction_metadata: ExtractionMetadata;
  units: UnitData[];
  leases: LeaseData[];
  unit_types: UnitTypeData[];
  quality_score?: number;
  validation_warnings?: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    field: string;
  }>;
}

export interface IngestionResult {
  success: boolean;
  property_entity_id?: number;
  units_created?: number;
  unit_types_created?: number;
  lease_facts_created?: number;
  errors?: string[];
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface SessionContext {
  session_id: number;
  entities: KnowledgeEntity[];
  facts: KnowledgeFact[];
  insights?: KnowledgeInsight[];
  token_estimate?: number;
}

export interface EnrichedContext extends SessionContext {
  query_relevant_facts: KnowledgeFact[];
  pruning_note?: string;
}
