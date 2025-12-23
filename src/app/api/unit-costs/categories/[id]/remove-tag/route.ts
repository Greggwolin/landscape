import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL;
const DJANGO_FINANCIAL_BASE = DJANGO_API_URL
  ? `${DJANGO_API_URL.replace(/\/$/, '')}/api/financial`
  : null;

type Params = { params: Promise<{ id: string }> };

export async function POST(
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
    const body = await request.json();
    const url = `${DJANGO_FINANCIAL_BASE}/unit-costs/categories/${id}/remove-tag/`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to remove tag' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error removing tag:', error);
    return NextResponse.json(
      { error: 'Failed to remove tag' },
      { status: 500 }
    );
  }
}
