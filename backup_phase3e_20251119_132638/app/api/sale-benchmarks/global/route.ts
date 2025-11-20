import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8001';

/**
 * GET /api/sale-benchmarks/global
 * Fetch all global sale benchmarks from tbl_sale_benchmarks
 */
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${DJANGO_API_URL}/api/sale-benchmarks/global/`,
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
    console.error('Error fetching global sale benchmarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch global sale benchmarks' },
      { status: 500 }
    );
  }
}
