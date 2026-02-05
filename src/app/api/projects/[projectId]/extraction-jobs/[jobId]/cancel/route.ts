/**
 * Cancel Extraction Job API
 *
 * POST /api/projects/[projectId]/extraction-jobs/[jobId]/cancel
 *
 * Cancel a running extraction job.
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; jobId: string }> }
) {
  try {
    const { projectId, jobId } = await params;

    const response = await fetch(
      `${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-jobs/${jobId}/cancel/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Cancel extraction job error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel extraction job' },
      { status: 500 }
    );
  }
}
