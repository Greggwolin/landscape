import { NextRequest, NextResponse } from 'next/server';

// Hardcoded for now - env vars not loading correctly with Turbopack
const DJANGO_API_URL = 'http://127.0.0.1:8000';

/**
 * POST /api/projects/:projectId/parcels/:parcelId/calculate-sale
 * Preview sale calculation without saving
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
 *     custom_transaction_costs?: Array<{name, amount, type, description}>
 *   }
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; parcelId: string }> }
) {
  const { projectId, parcelId } = await params;

  try {
    const body = await request.json();

    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/parcels/${parcelId}/calculate-sale/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    // Handle non-JSON responses (e.g., Django HTML error pages)
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Django returned non-JSON response:', text.substring(0, 500));
      return NextResponse.json(
        { error: `Django server error (${response.status}). Check Django logs for details.` },
        { status: response.status || 500 }
      );
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error calculating sale preview:', error);
    return NextResponse.json(
      { error: 'Failed to calculate sale preview' },
      { status: 500 }
    );
  }
}
