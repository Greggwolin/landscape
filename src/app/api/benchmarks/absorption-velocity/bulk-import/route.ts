import { NextRequest, NextResponse } from 'next/server';

const configuredApiBase =
  process.env.DJANGO_API_URL ?? process.env.NEXT_PUBLIC_DJANGO_API_URL ?? null;
const API_BASE = (configuredApiBase ?? 'http://127.0.0.1:8001').replace(/\/$/, '');

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!configuredApiBase) {
    console.warn(
      'DJANGO_API_URL is not set. Falling back to http://127.0.0.1:8001 for absorption velocities.',
    );
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/benchmarks/absorption-velocity/bulk_import/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorBody?.error || 'Failed to import absorption data' },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error contacting Django API (absorption velocity bulk import):', error);
    return NextResponse.json(
      { error: 'Failed to reach Django backend for absorption velocity bulk import' },
      { status: 502 },
    );
  }
}
