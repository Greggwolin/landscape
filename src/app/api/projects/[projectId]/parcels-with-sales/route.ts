import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const phaseId = searchParams.get('phase_id');
    const phaseIds = searchParams.get('phase_ids');

    let url = `${DJANGO_API_URL}/api/projects/${projectId}/parcels-with-sales/`;
    if (phaseIds) {
      url += `?phase_ids=${phaseIds}`;
    } else if (phaseId) {
      url += `?phase_id=${phaseId}`;
    }

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to fetch parcels with sales data', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Parcels with sales proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parcels with sales data', details: message },
      { status: 500 }
    );
  }
}
