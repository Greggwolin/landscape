import { NextRequest, NextResponse } from 'next/server';

const DJANGO_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

function buildForwardHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    headers.Authorization = authHeader;
  }
  return headers;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  try {
    const { projectId, docId } = await params;
    const body = await request.json();

    const response = await fetch(
      `${DJANGO_URL}/api/knowledge/projects/${projectId}/docs/${docId}/chat/`,
      {
        method: 'POST',
        headers: buildForwardHeaders(request),
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in document chat:', error);
    return NextResponse.json(
      { error: 'Failed to process document chat' },
      { status: 500 }
    );
  }
}
