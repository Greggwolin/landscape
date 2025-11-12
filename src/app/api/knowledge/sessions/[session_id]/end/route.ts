/**
 * Knowledge Session End API
 *
 * POST /api/knowledge/sessions/[session_id]/end
 *
 * End a knowledge session
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { KnowledgeSession } from '@/lib/knowledge/types';

export async function POST(
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

    // Get session to calculate duration
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

    // End the session
    const now = new Date();
    await sql`
      UPDATE landscape.knowledge_sessions
      SET session_end = ${now.toISOString()}
      WHERE session_id = ${sessionId}
    `;

    // Calculate duration
    const durationSeconds = Math.floor(
      (now.getTime() - new Date(session.session_start).getTime()) / 1000
    );

    return NextResponse.json({
      session_id: sessionId,
      status: 'ended',
      duration_seconds: durationSeconds,
    });
  } catch (error) {
    console.error('Session end error:', error);
    return NextResponse.json(
      {
        error: 'Failed to end session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
