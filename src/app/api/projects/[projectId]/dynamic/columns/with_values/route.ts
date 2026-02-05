/**
 * Dynamic Columns with Values API Route
 *
 * Fetches column definitions along with their values.
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
    const url = new URL(
      `${DJANGO_API_URL}/api/projects/${projectId}/dynamic/columns/with_values/`
    );
    searchParams.forEach((value, key) => url.searchParams.append(key, value));

    const response = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Dynamic columns with values fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dynamic columns with values' },
      { status: 500 }
    );
  }
}
