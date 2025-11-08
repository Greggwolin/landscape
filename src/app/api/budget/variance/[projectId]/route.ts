/**
 * GET /api/budget/variance/[projectId]
 *
 * Proxies to Django backend for budget variance summary
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

type Params = { params: Promise<{ projectId: string }> };

export async function GET(
  request: NextRequest,
  context: Params
) {
  try {
    const { projectId } = await context.params;
    const { searchParams } = new URL(request.url);

    // Forward query parameters
    const minVariancePct = searchParams.get('min_variance_pct') || '0';
    const levels = searchParams.get('levels') || '';

    const url = new URL(`${DJANGO_API_URL}/api/financial/budget/variance/${projectId}/`);
    url.searchParams.set('min_variance_pct', minVariancePct);
    if (levels) {
      url.searchParams.set('levels', levels);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Django API returned ${response.status}:`, errorText);
      throw new Error(`Django API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching variance data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch variance data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
