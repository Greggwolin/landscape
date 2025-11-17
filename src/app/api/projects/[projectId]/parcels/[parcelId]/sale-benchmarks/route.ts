import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8001';

/**
 * GET /api/projects/:projectId/parcels/:parcelId/sale-benchmarks
 * Get benchmarks applicable to a specific parcel using hierarchy resolution
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; parcelId: string }> }
) {
  const { projectId, parcelId } = await params;

  try {
    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/parcels/${parcelId}/sale-benchmarks/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching parcel sale benchmarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parcel sale benchmarks' },
      { status: 500 }
    );
  }
}
