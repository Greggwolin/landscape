/**
 * Snapshots API
 *
 * GET /api/projects/[projectId]/snapshots
 *
 * List available rent roll snapshots for rollback.
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const response = await fetch(
      `${DJANGO_API}/api/knowledge/projects/${projectId}/snapshots/`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get snapshots error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get snapshots' },
      { status: 500 }
    );
  }
}
