import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL =
  process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const propertyType = searchParams.get('property_type') || 'multifamily';
    const year = searchParams.get('year');

    if (!query) {
      return NextResponse.json({ error: 'q (query) is required' }, { status: 400 });
    }

    const params = new URLSearchParams({ q: query, property_type: propertyType });
    if (year) params.append('year', year);

    const response = await fetch(
      `${DJANGO_API_URL}/api/knowledge/benchmarks/search/?${params.toString()}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Benchmark search failed' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Benchmark search error:', error);
    return NextResponse.json({ error: 'Failed to search benchmarks' }, { status: 500 });
  }
}
