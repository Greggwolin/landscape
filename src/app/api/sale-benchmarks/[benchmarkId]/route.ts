import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8001';

/**
 * PUT/PATCH /api/sale-benchmarks/:benchmarkId
 * Update a sale benchmark in tbl_sale_benchmarks
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ benchmarkId: string }> }
) {
  try {
    const { benchmarkId } = await params;
    const body = await request.json();

    console.log('[PATCH sale-benchmark] ID:', benchmarkId, 'Body:', JSON.stringify(body, null, 2));

    const response = await fetch(`${DJANGO_API_URL}/api/sale-benchmarks/${benchmarkId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[PATCH sale-benchmark] Django error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to update sale benchmark', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[PATCH sale-benchmark] Success for ID:', benchmarkId);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Update sale benchmark proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to update sale benchmark', details: message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ benchmarkId: string }> }
) {
  return PATCH(request, { params });
}
