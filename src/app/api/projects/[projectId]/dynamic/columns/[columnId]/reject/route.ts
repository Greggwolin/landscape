/**
 * Reject Proposed Column API Route
 *
 * Rejects a proposed dynamic column, deleting it and its values.
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; columnId: string }> }
) {
  const { projectId, columnId } = await context.params;

  try {
    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/dynamic/columns/${columnId}/reject/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Reject column error:', error);
    return NextResponse.json(
      { error: 'Failed to reject column' },
      { status: 500 }
    );
  }
}
