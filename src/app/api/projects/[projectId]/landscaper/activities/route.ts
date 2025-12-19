/**
 * Landscaper Activities API Route
 *
 * Proxies activity feed requests to Django backend at:
 * /api/projects/{project_id}/landscaper/activities/
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/landscaper/activities
 * Fetch activity feed for a project
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;

  try {
    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/landscaper/activities/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Django activities GET error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch activities', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Landscaper activities GET error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to activities service', activities: [], count: 0 },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/landscaper/activities
 * Create a new activity item
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;

  try {
    const body = await request.json();

    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/landscaper/activities/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Django activities POST error:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to create activity', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Landscaper activities POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect to activities service' },
      { status: 500 }
    );
  }
}
