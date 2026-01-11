/**
 * GET /api/projects/[projectId]/processing-status
 * Proxy to Django knowledge API for document processing status
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const response = await fetch(
      `${DJANGO_API_URL}/api/knowledge/projects/${projectId}/processing-status/`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Django API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch processing status' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Processing status API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
