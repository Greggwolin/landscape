import { NextRequest, NextResponse } from 'next/server';

const configuredApiBase =
  process.env.DJANGO_API_URL ?? process.env.NEXT_PUBLIC_DJANGO_API_URL ?? null;
const API_BASE = (configuredApiBase ?? 'http://localhost:8000').replace(/\/$/, '');

export async function GET() {
  if (!configuredApiBase) {
    console.warn(
      'DJANGO_API_URL is not set. Falling back to http://localhost:8000 for absorption velocities.',
    );
  }

  try {
    const response = await fetch(`${API_BASE}/api/benchmarks/absorption-velocity/`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      // Return empty array instead of error if Django is not available
      console.warn('Django API not available for absorption velocities, returning empty array');
      return NextResponse.json([]);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.warn('Django backend not available for absorption velocities, returning empty array:', error);
    // Return empty array instead of 502 error - allows page to load
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  if (!configuredApiBase) {
    console.warn(
      'DJANGO_API_URL is not set. Falling back to http://localhost:8000 for absorption velocities.',
    );
  }

  const body = await request.json();

  try {
    const response = await fetch(`${API_BASE}/api/benchmarks/absorption-velocity/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorBody?.error || 'Failed to create absorption velocity' },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.warn('Django backend not available for absorption velocity create:', error);
    return NextResponse.json(
      { error: 'Django backend not available. Cannot create absorption velocity at this time.' },
      { status: 503 },
    );
  }
}
