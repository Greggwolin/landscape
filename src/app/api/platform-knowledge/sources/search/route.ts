import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL =
  process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  try {
    const upstream = new URL(`${DJANGO_API_URL}/api/knowledge/sources/search/`);
    req.nextUrl.searchParams.forEach((value, key) => upstream.searchParams.set(key, value));

    const response = await fetch(upstream.toString(), { method: 'GET' });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Platform knowledge source search proxy error:', error);
    return NextResponse.json({ error: 'Failed to search knowledge sources' }, { status: 500 });
  }
}
