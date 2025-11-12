/**
 * Knowledge Session Service
 *
 * Date: November 12, 2025
 * Session: GR47
 * Purpose: Manage knowledge sessions and context
 */

import { sql } from '@/lib/db';
import type {
  KnowledgeSession,
  KnowledgeEntity,
  KnowledgeFact,
  KnowledgeInteraction,
  CreateSessionInput,
  CreateInteractionInput,
  SessionContext,
} from './types';

export class KnowledgeSessionService {
  /**
   * Create a new session
   */
  async createSession(input: CreateSessionInput): Promise<KnowledgeSession> {
    const result = await sql<KnowledgeSession[]>`
      INSERT INTO landscape.knowledge_sessions (
        user_id,
        workspace_id,
        project_id,
        context_summary,
        metadata
      ) VALUES (
        ${input.user_id || null},
        ${input.workspace_id || null},
        ${input.project_id || null},
        ${input.context_summary || null},
        ${JSON.stringify(input.metadata || {})}
      )
      RETURNING *
    `;

    return result[0];
  }

  /**
   * End a session
   */
  async endSession(sessionId: number): Promise<void> {
    await sql`
      UPDATE landscape.knowledge_sessions
      SET session_end = NOW()
      WHERE session_id = ${sessionId}
    `;
  }

  /**
   * Load session context
   */
  async loadSessionContext(sessionId: number): Promise<SessionContext> {
    // Get session
    const sessions = await sql<KnowledgeSession[]>`
      SELECT * FROM landscape.knowledge_sessions
      WHERE session_id = ${sessionId}
      LIMIT 1
    `;

    if (sessions.length === 0) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const session = sessions[0];

    // Get entities
    const entities = await sql<KnowledgeEntity[]>`
      SELECT * FROM landscape.knowledge_entities
      WHERE entity_id = ANY(${session.loaded_entities})
    `;

    // Get facts
    const facts = await sql<KnowledgeFact[]>`
      SELECT * FROM landscape.knowledge_facts
      WHERE subject_entity_id = ANY(${session.loaded_entities})
        AND is_current = TRUE
    `;

    return {
      session_id: sessionId,
      entities,
      facts,
    };
  }

  /**
   * Update session with loaded entities
   */
  async updateLoadedEntities(sessionId: number, entityIds: number[]): Promise<void> {
    await sql`
      UPDATE landscape.knowledge_sessions
      SET loaded_entities = ${entityIds}
      WHERE session_id = ${sessionId}
    `;
  }

  /**
   * Record an AI interaction
   */
  async recordInteraction(input: CreateInteractionInput): Promise<KnowledgeInteraction> {
    const result = await sql<KnowledgeInteraction[]>`
      INSERT INTO landscape.knowledge_interactions (
        session_id,
        user_query,
        query_type,
        query_intent,
        context_entities,
        context_facts,
        context_token_count,
        ai_response,
        response_type,
        confidence_score,
        input_tokens,
        output_tokens
      ) VALUES (
        ${input.session_id},
        ${input.user_query},
        ${input.query_type || null},
        ${input.query_intent || null},
        ${input.context_entities || []},
        ${input.context_facts || []},
        ${input.context_token_count || null},
        ${input.ai_response || null},
        ${input.response_type || null},
        ${input.confidence_score || null},
        ${input.input_tokens || null},
        ${input.output_tokens || null}
      )
      RETURNING *
    `;

    return result[0];
  }

  /**
   * Get recent interactions for a session
   */
  async getRecentInteractions(
    sessionId: number,
    limit: number = 10
  ): Promise<KnowledgeInteraction[]> {
    const interactions = await sql<KnowledgeInteraction[]>`
      SELECT * FROM landscape.knowledge_interactions
      WHERE session_id = ${sessionId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return interactions;
  }

  /**
   * Update interaction with user feedback
   */
  async recordFeedback(
    interactionId: number,
    feedback: string,
    correction?: string
  ): Promise<void> {
    await sql`
      UPDATE landscape.knowledge_interactions
      SET
        user_feedback = ${feedback},
        user_correction = ${correction || null}
      WHERE interaction_id = ${interactionId}
    `;
  }

  /**
   * Find entities by project
   */
  async findEntitiesByProject(projectId: number): Promise<KnowledgeEntity[]> {
    // Find all entities with this project_id in metadata
    const entities = await sql<KnowledgeEntity[]>`
      SELECT * FROM landscape.knowledge_entities
      WHERE metadata->>'project_id' = ${projectId.toString()}
        OR (
          entity_type = 'unit'
          AND entity_id IN (
            SELECT entity_id FROM landscape.knowledge_entities
            WHERE entity_type = 'property'
              AND metadata->>'project_id' = ${projectId.toString()}
          )
        )
    `;

    return entities;
  }

  /**
   * Get facts about an entity
   */
  async getEntityFacts(
    entityId: number,
    currentOnly: boolean = true
  ): Promise<KnowledgeFact[]> {
    const query = currentOnly
      ? sql<KnowledgeFact[]>`
          SELECT * FROM landscape.knowledge_facts
          WHERE subject_entity_id = ${entityId}
            AND is_current = TRUE
          ORDER BY created_at DESC
        `
      : sql<KnowledgeFact[]>`
          SELECT * FROM landscape.knowledge_facts
          WHERE subject_entity_id = ${entityId}
          ORDER BY created_at DESC
        `;

    return await query;
  }

  /**
   * Search facts by predicate
   */
  async searchFactsByPredicate(
    predicate: string,
    entityIds?: number[]
  ): Promise<KnowledgeFact[]> {
    if (entityIds && entityIds.length > 0) {
      return await sql<KnowledgeFact[]>`
        SELECT * FROM landscape.knowledge_facts
        WHERE predicate = ${predicate}
          AND subject_entity_id = ANY(${entityIds})
          AND is_current = TRUE
        ORDER BY created_at DESC
      `;
    } else {
      return await sql<KnowledgeFact[]>`
        SELECT * FROM landscape.knowledge_facts
        WHERE predicate = ${predicate}
          AND is_current = TRUE
        ORDER BY created_at DESC
        LIMIT 100
      `;
    }
  }
}
