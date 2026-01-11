/**
 * Project Extractions API
 *
 * GET /api/projects/[projectId]/extractions - List all extractions
 * POST /api/projects/[projectId]/extractions - Trigger new extraction
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
    const status = searchParams.get('status');

    const url = new URL(`${DJANGO_API}/api/knowledge/projects/${projectId}/extractions/`);
    if (status) {
      url.searchParams.set('status', status);
    }

    const response = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Extractions fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch extractions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    const response = await fetch(
      `${DJANGO_API}/api/knowledge/projects/${projectId}/extract/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run extraction' },
      { status: 500 }
    );
  }
}
