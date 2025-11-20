import { NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8001';

/**
 * GET /api/uoms
 * Fetch all UOM formulas from the registry
 */
export async function GET() {
  try {
    const response = await fetch(`${DJANGO_API_URL}/api/uoms/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching UOMs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch UOMs' },
      { status: 500 }
    );
  }
}
