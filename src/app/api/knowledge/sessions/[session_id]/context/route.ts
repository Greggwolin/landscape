/**
 * Knowledge Session Context API
 *
 * GET /api/knowledge/sessions/[session_id]/context
 *
 * Retrieve session context (entities and facts)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { KnowledgeSession, KnowledgeEntity, KnowledgeFact } from '@/lib/knowledge/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { session_id: string } }
) {
  try {
    const sessionId = parseInt(params.session_id);

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid session_id' },
        { status: 400 }
      );
    }

    // Get session
    const sessions = await sql<KnowledgeSession[]>`
      SELECT * FROM landscape.knowledge_sessions
      WHERE session_id = ${sessionId}
      LIMIT 1
    `;

    if (sessions.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const session = sessions[0];

    // Get loaded entities
    const entities = await sql<KnowledgeEntity[]>`
      SELECT * FROM landscape.knowledge_entities
      WHERE entity_id = ANY(${session.loaded_entities})
      LIMIT 50
    `;

    // Get current facts about these entities
    const facts = await sql<KnowledgeFact[]>`
      SELECT * FROM landscape.knowledge_facts
      WHERE subject_entity_id = ANY(${session.loaded_entities})
        AND is_current = TRUE
      LIMIT 100
    `;

    return NextResponse.json({
      session_id: sessionId,
      entities_count: entities.length,
      facts_count: facts.length,
      entities: entities.map((e) => ({
        entity_id: e.entity_id,
        entity_type: e.entity_type,
        canonical_name: e.canonical_name,
        metadata: e.metadata,
      })),
      facts: facts.map((f) => ({
        fact_id: f.fact_id,
        subject_entity_id: f.subject_entity_id,
        predicate: f.predicate,
        object_value: f.object_value,
        confidence_score: f.confidence_score ? parseFloat(f.confidence_score.toString()) : null,
        source_type: f.source_type,
        valid_from: f.valid_from,
        valid_to: f.valid_to,
      })),
    });
  } catch (error) {
    console.error('Session context error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve session context',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
