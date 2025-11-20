import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    // Hardcoded for now - env vars not loading correctly
    const DJANGO_API_URL = 'http://127.0.0.1:8000';

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

    console.log('[parcels-with-sales] Fetching from:', url);
    console.log('[parcels-with-sales] DJANGO_API_URL:', DJANGO_API_URL);
    console.log('[parcels-with-sales] process.env.NEXT_PUBLIC_DJANGO_API_URL:', process.env.NEXT_PUBLIC_DJANGO_API_URL);

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
