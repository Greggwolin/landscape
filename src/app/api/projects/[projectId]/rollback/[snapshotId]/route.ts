/**
 * Rollback API
 *
 * POST /api/projects/[projectId]/rollback/[snapshotId]
 *
 * Rollback rent roll to a previous snapshot.
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; snapshotId: string }> }
) {
  try {
    const { projectId, snapshotId } = await params;

    const response = await fetch(
      `${DJANGO_API}/api/knowledge/projects/${projectId}/rollback/${snapshotId}/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Rollback error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to rollback' },
      { status: 500 }
    );
  }
}
