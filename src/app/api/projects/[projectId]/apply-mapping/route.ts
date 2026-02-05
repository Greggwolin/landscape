/**
 * Apply Mapping API Route
 *
 * Applies user's column mapping decisions and queues extraction job.
 * Proxies to Django backend.
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
      `${DJANGO_API_URL}/api/knowledge/projects/${projectId}/apply-mapping/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Apply mapping error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to apply mapping' },
      { status: 500 }
    );
  }
}
