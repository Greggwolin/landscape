import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Create Parcel Sale Event with Closings
 * POST /api/projects/[projectId]/parcel-sales/
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const DJANGO_API_URL = 'http://127.0.0.1:8000';
    const { projectId } = await params;

    const body = await request.json();

    console.log('[parcel-sales] Creating sale event:', {
      projectId,
      parcelId: body.parcel_id,
      saleType: body.sale_type,
      closingsCount: body.closings?.length,
      closings: body.closings,
    });

    const url = `${DJANGO_API_URL}/api/projects/${projectId}/parcel-sales/`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[parcel-sales] Django error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create parcel sale', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[parcel-sales] Sale created successfully:', data.sale_event_id);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[parcel-sales] Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to create parcel sale', details: message },
      { status: 500 }
    );
  }
}
