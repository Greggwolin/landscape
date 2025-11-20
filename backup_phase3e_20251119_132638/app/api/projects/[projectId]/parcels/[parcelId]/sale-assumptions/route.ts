import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000';

/**
 * GET /api/projects/:projectId/parcels/:parcelId/sale-assumptions
 * Fetch saved sale assumptions for a parcel
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; parcelId: string }> }
) {
  const { projectId, parcelId } = await params;

  try {
    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/parcels/${parcelId}/sale-assumptions/`,
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
    console.error('Error fetching sale assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sale assumptions' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/:projectId/parcels/:parcelId/sale-assumptions
 * Save/update sale assumptions for a parcel
 *
 * Request body:
 * {
 *   sale_date: string (YYYY-MM-DD),
 *   overrides?: {
 *     improvement_offset_per_uom?: number,
 *     legal_pct?: number,
 *     commission_pct?: number,
 *     closing_cost_pct?: number,
 *     title_insurance_pct?: number,
 *     custom_transaction_costs?: Array<{name, amount, type, description, is_saved_as_benchmark}>
 *   }
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; parcelId: string }> }
) {
  const { projectId, parcelId } = await params;

  try {
    const body = await request.json();

    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/parcels/${parcelId}/sale-assumptions/`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error saving sale assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to save sale assumptions' },
      { status: 500 }
    );
  }
}
