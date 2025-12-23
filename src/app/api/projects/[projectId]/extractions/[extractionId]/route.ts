/**
 * Single Extraction API
 *
 * DELETE /api/projects/[projectId]/extractions/[extractionId]
 *
 * Delete a pending extraction.
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; extractionId: string }> }
) {
  try {
    const { projectId, extractionId } = await params;

    const response = await fetch(
      `${DJANGO_API}/api/knowledge/projects/${projectId}/extractions/${extractionId}/`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Delete extraction error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete extraction' },
      { status: 500 }
    );
  }
}
