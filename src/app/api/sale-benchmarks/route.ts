import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8001';

/**
 * POST /api/sale-benchmarks
 * Create a new sale benchmark in tbl_sale_benchmarks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[POST sale-benchmark] Creating with body:', JSON.stringify(body, null, 2));

    // Map frontend structure to Django API
    const djangoPayload: any = {
      benchmark_name: body.benchmark_name,
      description: body.description,
      scope_level: 'project', // Default to project scope for user-created benchmarks
      benchmark_type: body.cost_type || 'commission',
    };

    // Handle value based on value_type
    if (body.value_type === 'percentage') {
      djangoPayload.rate_pct = parseFloat(body.value) / 100; // Convert 3 to 0.03
      if (body.basis) {
        djangoPayload.basis = body.basis; // What percentage is applied to
      }
    } else if (body.value_type === 'per_unit') {
      djangoPayload.amount_per_uom = parseFloat(body.value);
      djangoPayload.uom_code = body.uom_code || '$/unit';
    } else if (body.value_type === 'flat_fee') {
      djangoPayload.fixed_amount = parseFloat(body.value);
    }

    console.log('[POST sale-benchmark] Django payload:', JSON.stringify(djangoPayload, null, 2));

    const response = await fetch(`${DJANGO_API_URL}/api/sale-benchmarks/global/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(djangoPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[POST sale-benchmark] Django error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to create sale benchmark', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[POST sale-benchmark] Success:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Create sale benchmark proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to create sale benchmark', details: message },
      { status: 500 }
    );
  }
}
