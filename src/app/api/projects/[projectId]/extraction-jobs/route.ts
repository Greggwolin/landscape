/**
 * Extraction Jobs API
 *
 * GET /api/projects/[projectId]/extraction-jobs
 *
 * Get extraction job status for a project.
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');

    const url = new URL(`${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-jobs/`);
    if (scope) {
      url.searchParams.set('scope', scope);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get extraction jobs error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get extraction jobs' },
      { status: 500 }
    );
  }
}
