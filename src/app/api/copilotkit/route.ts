/**
 * CopilotKit Runtime API Route
 *
 * This endpoint handles CopilotKit AI requests, routing them to the appropriate
 * LLM provider (Anthropic Claude or OpenAI).
 */

import {
  CopilotRuntime,
  AnthropicAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { NextRequest } from 'next/server';

// Create Anthropic adapter for Claude
const anthropicAdapter = new AnthropicAdapter({
  model: 'claude-sonnet-4-20250514',
});

// Create CopilotKit runtime
const runtime = new CopilotRuntime();

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: anthropicAdapter,
    endpoint: '/api/copilotkit',
  });

  return handleRequest(req);
};
