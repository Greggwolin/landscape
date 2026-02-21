import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

/**
 * POST /api/landscaper/help/chat/
 *
 * Proxy to Django Help Landscaper endpoint.
 * This is a global endpoint (no project ID required).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${DJANGO_API_URL}/api/landscaper/help/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to connect to backend' },
      { status: 502 },
    );
  }
}
