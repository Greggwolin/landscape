/**
 * Accept Proposed Column API Route
 *
 * Accepts a proposed dynamic column, making it active.
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; columnId: string }> }
) {
  const { projectId, columnId } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));
    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/dynamic/columns/${columnId}/accept/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Accept column error:', error);
    return NextResponse.json(
      { error: 'Failed to accept column' },
      { status: 500 }
    );
  }
}
