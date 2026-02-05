/**
 * Single Extraction Job API
 *
 * GET /api/projects/[projectId]/extraction-jobs/[jobId]
 *
 * Get status of a single extraction job.
 * Used for polling after apply-mapping starts async extraction.
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; jobId: string }> }
) {
  try {
    const { projectId, jobId } = await params;

    const response = await fetch(
      `${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-jobs/${jobId}/`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get extraction job error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get extraction job' },
      { status: 500 }
    );
  }
}
