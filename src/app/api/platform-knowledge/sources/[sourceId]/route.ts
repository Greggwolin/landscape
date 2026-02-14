import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL =
  process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { sourceId } = await params;
    const response = await fetch(`${DJANGO_API_URL}/api/knowledge/sources/${sourceId}/`, {
      method: 'GET',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Platform knowledge source detail GET proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch source detail' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { sourceId } = await params;
    const body = await req.json();

    const response = await fetch(`${DJANGO_API_URL}/api/knowledge/sources/${sourceId}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Platform knowledge source detail PUT proxy error:', error);
    return NextResponse.json({ error: 'Failed to update source detail' }, { status: 500 });
  }
}
