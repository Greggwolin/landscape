import { NextRequest, NextResponse } from 'next/server';

// Hardcoded for now - env vars not loading correctly with Turbopack
const DJANGO_API_URL = 'http://127.0.0.1:8001';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const body = await request.json();

    console.log('[PUT pricing-assumptions] ID:', id, 'Body:', JSON.stringify(body, null, 2));
    console.log('[PUT pricing-assumptions] URL:', `${DJANGO_API_URL}/api/projects/${projectId}/pricing-assumptions/${id}/`);

    const response = await fetch(`${DJANGO_API_URL}/api/projects/${projectId}/pricing-assumptions/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[PUT pricing-assumptions] Django error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to update pricing assumption', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[PUT pricing-assumptions] Success for ID:', id);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Update pricing assumption proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing assumption', details: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;

    const response = await fetch(`${DJANGO_API_URL}/api/projects/${projectId}/pricing-assumptions/${id}/`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to delete pricing assumption', details: errorData },
        { status: response.status }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Delete pricing assumption proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to delete pricing assumption', details: message },
      { status: 500 }
    );
  }
}
