/**
 * POST /api/projects/[projectId]/cash-flow/generate
 *
 * DEPRECATED: This route now proxies to Django backend.
 * Frontend should call Django directly at:
 * POST /api/projects/{projectId}/cash-flow/calculate/
 *
 * This proxy exists for backward compatibility with legacy callers.
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

type Params = { params: Promise<{ projectId: string }> };

export async function POST(
  request: NextRequest,
  context: Params
) {
  try {
    const { projectId: projId } = await context.params;
    const projectId = parseInt(projId, 10);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Proxy to Django backend
    const djangoUrl = `${DJANGO_API_URL}/api/projects/${projectId}/cash-flow/calculate/`;

    const response = await fetch(djangoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        containerIds: body.containerIds,
        periodType: body.periodType || 'month',
        includeFinancing: body.includeFinancing === true,
        discountRate: body.discountRate,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || `Django API returned ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error proxying to Django cash flow API:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate cash flow',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
