import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL =
  process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(`${DJANGO_API_URL}/api/knowledge/sources/match/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Platform knowledge source match proxy error:', error);
    return NextResponse.json({ error: 'Failed to match knowledge source' }, { status: 500 });
  }
}
