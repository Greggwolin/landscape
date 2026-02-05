/**
 * Column Discovery API Route
 *
 * Analyzes uploaded rent roll file and returns column discovery results.
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

    console.log(`[discover-columns] projectId=${projectId}, document_id=${body.document_id}`);

    const response = await fetch(
      `${DJANGO_API_URL}/api/knowledge/projects/${projectId}/discover-columns/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(`[discover-columns] Django error:`, data);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[discover-columns] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to discover columns' },
      { status: 500 }
    );
  }
}
