import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL;
const DJANGO_FINANCIAL_BASE = DJANGO_API_URL
  ? `${DJANGO_API_URL.replace(/\/$/, '')}/api/financial`
  : null;

type Params = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: Params
) {
  const { id } = await context.params;

  if (!DJANGO_FINANCIAL_BASE) {
    return NextResponse.json(
      { error: 'Django API not configured' },
      { status: 500 }
    );
  }

  try {
    const url = `${DJANGO_FINANCIAL_BASE}/unit-costs/categories/${id}/deletion-impact/`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch deletion impact' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching deletion impact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deletion impact' },
      { status: 500 }
    );
  }
}
