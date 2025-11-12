/**
 * Knowledge Interactions API
 *
 * POST /api/knowledge/interactions
 *
 * Record an AI interaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeSessionService } from '@/lib/knowledge/session-service';
import type { CreateInteractionInput } from '@/lib/knowledge/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const input: CreateInteractionInput = {
      session_id: body.session_id,
      user_query: body.user_query,
      query_type: body.query_type,
      query_intent: body.query_intent,
      context_entities: body.context_entities || [],
      context_facts: body.context_facts || [],
      context_token_count: body.context_token_count,
      ai_response: body.ai_response,
      response_type: body.response_type,
      confidence_score: body.confidence_score,
      input_tokens: body.input_tokens,
      output_tokens: body.output_tokens,
    };

    if (!input.session_id || !input.user_query) {
      return NextResponse.json(
        { error: 'session_id and user_query are required' },
        { status: 400 }
      );
    }

    const service = new KnowledgeSessionService();
    const interaction = await service.recordInteraction(input);

    return NextResponse.json({
      interaction_id: interaction.interaction_id,
      success: true,
    });
  } catch (error) {
    console.error('Interaction recording error:', error);
    return NextResponse.json(
      {
        error: 'Failed to record interaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
