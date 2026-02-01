import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

/**
 * Chat history retrieval.
 * Pass-through to Django knowledge service.
 * Supports filtering by active_tab query param.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;
  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.get('limit') || '100';
  const beforeId = searchParams.get('before_id') || '';
  const activeTab = searchParams.get('active_tab') || '';

  try {
    const url = new URL(`${DJANGO_API_URL}/api/knowledge/chat/${projectId}/`);
    url.searchParams.set('limit', limit);
    if (beforeId) url.searchParams.set('before_id', beforeId);
    if (activeTab) url.searchParams.set('active_tab', activeTab);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Chat history fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}

/**
 * Send chat message.
 * Pass-through to Django knowledge service.
 *
 * UI sends: { message: string, clientRequestId?: string, activeTab?: string }
 * Django returns: ChatResponse (ready for UI consumption)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;

  try {
    const body = await request.json();

    const payload = {
      message: body.message || body.content,
      clientRequestId: body.clientRequestId || body.client_request_id || crypto.randomUUID(),
      active_tab: body.activeTab || 'home',  // snake_case for Python backend
      page_context: body.pageContext || body.page_context || body.activeTab || null,  // For context-aware tool filtering
    };

    const response = await fetch(
      `${DJANGO_API_URL}/api/knowledge/chat/${projectId}/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Chat send error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

/**
 * Clear chat history.
 * Pass-through to Django knowledge service.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;

  try {
    const response = await fetch(
      `${DJANGO_API_URL}/api/knowledge/chat/${projectId}/clear/`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Chat clear error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear chat' },
      { status: 500 }
    );
  }
}
