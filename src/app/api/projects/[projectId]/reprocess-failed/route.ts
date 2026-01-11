/**
 * POST /api/projects/[projectId]/reprocess-failed
 * Re-queue all failed documents in a project for processing
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const response = await fetch(
      `${DJANGO_API_URL}/api/knowledge/projects/${projectId}/reprocess-failed/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Django API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { success: false, error: 'Failed to reprocess failed documents' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Reprocess failed API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
