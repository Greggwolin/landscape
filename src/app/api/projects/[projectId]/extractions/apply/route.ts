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
    const body = await request.json();

    // If the request includes fields array, use the bulk-status endpoint
    // to apply each extraction directly
    if (body.fields && Array.isArray(body.fields) && body.fields.length > 0) {
      const extractionIds = body.fields
        .filter((f: { extraction_id?: number }) => f.extraction_id)
        .map((f: { extraction_id: number }) => f.extraction_id);

      if (extractionIds.length > 0) {
        // Use bulk-status endpoint to apply all extractions at once
        const response = await fetch(
          `${DJANGO_API}/api/knowledge/projects/${projectId}/extractions/bulk-status/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              extraction_ids: extractionIds,
              status: 'applied',
            }),
          }
        );

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
      }
    }

    // Fallback to original endpoint for legacy behavior
    const response = await fetch(
      `${DJANGO_API}/api/knowledge/projects/${projectId}/extractions/apply/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
