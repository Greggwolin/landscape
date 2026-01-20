import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL =
  process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(`${DJANGO_API_URL}/api/knowledge/platform/ingest/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Ingestion failed' }, { status: response.status });
    }

    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('Platform knowledge ingest error:', error);
    return NextResponse.json({ error: 'Failed to ingest platform document' }, { status: 500 });
  }
}
