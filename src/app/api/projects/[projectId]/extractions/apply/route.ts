/**
 * Apply Extractions API
 *
 * POST /api/projects/[projectId]/extractions/apply
 *
 * Apply all validated extractions to their target tables.
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const response = await fetch(
      `${DJANGO_API}/api/knowledge/projects/${projectId}/extractions/apply/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Apply extractions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to apply extractions' },
      { status: 500 }
    );
  }
}
