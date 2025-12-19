/**
 * Landscaper Chat API Route
 *
 * Proxies chat requests to Django backend at:
 * /api/projects/{project_id}/landscaper/chat/
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/landscaper/chat
 * Fetch chat history for a project
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;

  try {
    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/landscaper/chat/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Django chat GET error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch chat history', details: errorText },
        { status: response.status }
      );
    }

    const djangoData = await response.json();

    // Transform Django response to frontend format
    // Django returns { messages: [...], count: N }
    // Frontend expects { success: true, messages: [...], count: N }
    const frontendResponse = {
      success: true,
      messages: djangoData.messages || [],
      count: djangoData.count || 0,
    };

    return NextResponse.json(frontendResponse);
  } catch (error) {
    console.error('Landscaper chat GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect to chat service', messages: [], count: 0 },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/landscaper/chat
 * Send a new message and get AI response
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;

  try {
    const body = await request.json();

    // Transform frontend format { message } to Django format { content }
    const djangoBody = {
      content: body.message || body.content || '',
      user: body.user || null,
    };

    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/landscaper/chat/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(djangoBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Django chat POST error:', errorText);
      return NextResponse.json(
        { error: 'Failed to send message', details: errorText },
        { status: response.status }
      );
    }

    const djangoData = await response.json();

    // Transform Django response to frontend format
    const frontendResponse = {
      success: djangoData.success ?? true,
      messageId: djangoData.assistant_message?.message_id || `msg_${Date.now()}`,
      content: djangoData.assistant_message?.content || '',
      metadata: djangoData.assistant_message?.metadata || {},
      context: {},
    };

    return NextResponse.json(frontendResponse);
  } catch (error) {
    console.error('Landscaper chat POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect to chat service' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/landscaper/chat
 * Clear chat history for a project
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(_request: NextRequest, _context: RouteParams) {
  // Note: Django endpoint may not support DELETE yet
  // For now, return success - clearing happens on frontend state
  // To use projectId: const { projectId } = await _context.params;
  return NextResponse.json({ success: true, cleared: true });
}
