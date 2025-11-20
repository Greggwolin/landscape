import { NextRequest, NextResponse } from 'next/server';

// Hardcoded for now - env vars not loading correctly with Turbopack
const DJANGO_API_URL = 'http://127.0.0.1:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/inventory-gauge/`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to fetch inventory gauge data', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Inventory gauge proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory gauge data', details: message },
      { status: 500 }
    );
  }
}
