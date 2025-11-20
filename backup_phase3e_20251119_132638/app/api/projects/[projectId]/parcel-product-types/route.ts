import { NextRequest, NextResponse } from 'next/server';

// Hardcoded for now - env vars not loading correctly
const DJANGO_API_URL = 'http://127.0.0.1:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const phaseId = searchParams.get('phase_id');
  const phaseIds = searchParams.get('phase_ids');

  try {
    let url = `${DJANGO_API_URL}/api/projects/${projectId}/parcel-product-types/`;

    // Add phase filter query parameters if present
    if (phaseIds) {
      url += `?phase_ids=${phaseIds}`;
    } else if (phaseId) {
      url += `?phase_id=${phaseId}`;
    }

    console.log('[parcel-product-types] Fetching from:', url);

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Django API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch parcel product types' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching parcel product types:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
