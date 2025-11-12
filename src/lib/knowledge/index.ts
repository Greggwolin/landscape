/**
 * Knowledge Persistence Layer - Main Export
 *
 * Date: November 12, 2025
 * Session: GR47
 */

// Types
export type {
  // Entities
  EntityType,
  KnowledgeEntity,
  CreateEntityInput,

  // Facts
  SourceType,
  KnowledgeFact,
  CreateFactInput,

  // Sessions
  KnowledgeSession,
  CreateSessionInput,

  // Interactions
  QueryType,
  ResponseType,
  UserFeedback,
  KnowledgeInteraction,
  CreateInteractionInput,

  // Embeddings
  EmbeddingSourceType,
  KnowledgeEmbedding,

  // Insights
  InsightType,
  InsightSeverity,
  InsightAction,
  KnowledgeInsight,
  CreateInsightInput,

  // Ingestion
  PropertyInfo,
  ExtractionMetadata,
  UnitData,
  LeaseData,
  UnitTypeData,
  ExtractionResult,
  IngestionResult,

  // Context
  SessionContext,
  EnrichedContext,
} from './types';

// Services
export { KnowledgeIngestionService } from './ingestion-service';
export { KnowledgeSessionService } from './session-service';
