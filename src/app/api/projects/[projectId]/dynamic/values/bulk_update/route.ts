/**
 * Bulk Update Dynamic Column Values API Route
 *
 * Updates values for multiple rows/columns.
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;

  try {
    const body = await request.json();
    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/dynamic/values/bulk_update/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Bulk update values error:', error);
    return NextResponse.json(
      { error: 'Failed to update values' },
      { status: 500 }
    );
  }
}
