import { NextRequest, NextResponse } from 'next/server';

// Hardcoded for now - env vars not loading correctly with Turbopack
const DJANGO_API_URL = 'http://127.0.0.1:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const url = `${DJANGO_API_URL}/api/projects/${projectId}/pricing-assumptions/`;

    console.log('[pricing-assumptions] Attempting to fetch:', url);
    console.log('[pricing-assumptions] DJANGO_API_URL:', DJANGO_API_URL);

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      // @ts-ignore - keepalive for Node.js fetch
      keepalive: true,
    });

    console.log('[pricing-assumptions] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to fetch pricing assumptions', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    // Django returns paginated response, extract results array
    const results = data.results || data;
    console.log('[GET pricing-assumptions] Django response keys:', Object.keys(data));
    console.log('[GET pricing-assumptions] Results count:', Array.isArray(results) ? results.length : 'not an array');
    console.log('[GET pricing-assumptions] First result sample:', results[0]);
    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Pricing assumptions proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing assumptions', details: message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    console.log('[POST pricing-assumptions] Received body:', JSON.stringify(body, null, 2));
    console.log('[POST pricing-assumptions] URL:', `${DJANGO_API_URL}/api/projects/${projectId}/pricing-assumptions/`);

    const response = await fetch(`${DJANGO_API_URL}/api/projects/${projectId}/pricing-assumptions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[POST pricing-assumptions] Django error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to create pricing assumption', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Create pricing assumption proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to create pricing assumption', details: message },
      { status: 500 }
    );
  }
}
