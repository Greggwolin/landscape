/**
 * Dynamic Columns API Routes
 *
 * Proxies to Django backend for dynamic column management.
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const searchParams = request.nextUrl.searchParams;

  try {
    const url = new URL(`${DJANGO_API_URL}/api/projects/${projectId}/dynamic/columns/`);
    searchParams.forEach((value, key) => url.searchParams.append(key, value));

    const response = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Dynamic columns fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dynamic columns' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;

  try {
    const body = await request.json();
    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/dynamic/columns/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Dynamic column create error:', error);
    return NextResponse.json(
      { error: 'Failed to create dynamic column' },
      { status: 500 }
    );
  }
}
