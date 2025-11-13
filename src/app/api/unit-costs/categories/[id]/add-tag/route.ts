import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!DJANGO_API_URL) {
    return NextResponse.json(
      { error: 'Django API not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const url = `${DJANGO_API_URL.replace(/\/$/, '')}/api/unit-costs/categories/${params.id}/add-tag/`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to add tag' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding tag:', error);
    return NextResponse.json(
      { error: 'Failed to add tag' },
      { status: 500 }
    );
  }
}
