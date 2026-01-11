/**
 * Pending Extractions API
 *
 * GET /api/projects/[projectId]/extractions/pending
 *
 * Returns extractions waiting for user validation.
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
      `${DJANGO_API}/api/knowledge/projects/${projectId}/extractions/pending/`,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Pending extractions fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending extractions' },
      { status: 500 }
    );
  }
}
