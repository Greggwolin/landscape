/**
 * Knowledge Session Start API
 *
 * POST /api/knowledge/sessions/start
 *
 * Start a new knowledge session for AI context management
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { KnowledgeSession, KnowledgeEntity } from '@/lib/knowledge/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, user_id, workspace_id, context_summary } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Create session
    const sessionResult = await sql<KnowledgeSession[]>`
      INSERT INTO landscape.knowledge_sessions (
        user_id,
        workspace_id,
        project_id,
        context_summary,
        metadata
      ) VALUES (
        ${user_id || null},
        ${workspace_id || null},
        ${project_id},
        ${context_summary || null},
        ${JSON.stringify({})}
      )
      RETURNING *
    `;

    const session = sessionResult[0];

    // Load project context (all entities related to this project)
    const projectEntities = await loadProjectEntities(project_id);

    // Update session with loaded entities
    const entityIds = projectEntities.map((e) => e.entity_id);
    await sql`
      UPDATE landscape.knowledge_sessions
      SET loaded_entities = ${entityIds}
      WHERE session_id = ${session.session_id}
    `;

    return NextResponse.json({
      session_id: session.session_id,
      loaded_entities_count: entityIds.length,
      status: 'active',
    });
  } catch (error) {
    console.error('Session start error:', error);
    return NextResponse.json(
      {
        error: 'Failed to start session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Load all entities related to a project
 */
async function loadProjectEntities(projectId: number): Promise<KnowledgeEntity[]> {
  // Find property entities for this project
  const propertyEntities = await sql<KnowledgeEntity[]>`
    SELECT * FROM landscape.knowledge_entities
    WHERE entity_type = 'property'
      AND metadata->>'project_id' = ${projectId.toString()}
  `;

  if (propertyEntities.length === 0) {
    return [];
  }

  const allEntities: KnowledgeEntity[] = [...propertyEntities];

  // Find related unit entities for each property
  for (const prop of propertyEntities) {
    const units = await sql<KnowledgeEntity[]>`
      SELECT * FROM landscape.knowledge_entities
      WHERE entity_type = 'unit'
        AND metadata->>'property_entity_id' = ${prop.entity_id.toString()}
    `;
    allEntities.push(...units);

    // Find unit types for this property
    const unitTypes = await sql<KnowledgeEntity[]>`
      SELECT * FROM landscape.knowledge_entities
      WHERE entity_type = 'unit_type'
        AND metadata->>'property_entity_id' = ${prop.entity_id.toString()}
    `;
    allEntities.push(...unitTypes);
  }

  return allEntities;
}
