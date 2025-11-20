import { NextRequest, NextResponse } from 'next/server';

const configuredApiBase =
  process.env.DJANGO_API_URL ?? process.env.NEXT_PUBLIC_DJANGO_API_URL ?? null;
const API_BASE = (configuredApiBase ?? 'http://127.0.0.1:8001').replace(/\/$/, '');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  void _request;
  if (!configuredApiBase) {
    console.warn(
      'DJANGO_API_URL is not set. Falling back to http://127.0.0.1:8001 for absorption velocities.',
    );
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/benchmarks/absorption-velocity/${id}/`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch absorption velocity' },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.warn(
      `Django backend not available for absorption velocity ${id} fetch:`,
      error,
    );
    return NextResponse.json(
      { error: 'Django backend not available' },
      { status: 503 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json();

  if (!configuredApiBase) {
    console.warn(
      'DJANGO_API_URL is not set. Falling back to http://127.0.0.1:8001 for absorption velocities.',
    );
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/benchmarks/absorption-velocity/${id}/`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorBody?.error || 'Failed to update absorption velocity' },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.warn(
      `Django backend not available for absorption velocity ${id} update:`,
      error,
    );
    return NextResponse.json(
      { error: 'Django backend not available. Cannot update absorption velocity at this time.' },
      { status: 503 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  void _request;
  if (!configuredApiBase) {
    console.warn(
      'DJANGO_API_URL is not set. Falling back to http://127.0.0.1:8001 for absorption velocities.',
    );
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/benchmarks/absorption-velocity/${id}/`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to delete absorption velocity' },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.warn(
      `Django backend not available for absorption velocity ${id} delete:`,
      error,
    );
    return NextResponse.json(
      { error: 'Django backend not available. Cannot delete absorption velocity at this time.' },
      { status: 503 },
    );
  }
}
