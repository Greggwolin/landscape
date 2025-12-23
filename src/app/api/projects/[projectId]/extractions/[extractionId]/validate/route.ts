/**
 * Validate Extraction API
 *
 * POST /api/projects/[projectId]/extractions/[extractionId]/validate
 *
 * Validate, reject, or edit an extraction.
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; extractionId: string }> }
) {
  try {
    const { projectId, extractionId } = await params;
    const body = await request.json();

    const response = await fetch(
      `${DJANGO_API}/api/knowledge/projects/${projectId}/extractions/${extractionId}/validate/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Validate extraction error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate extraction' },
      { status: 500 }
    );
  }
}
