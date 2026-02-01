/**
 * GET /api/projects/[projectId]/cash-flow/summary
 *
 * Get cash flow summary metrics only (lightweight endpoint)
 *
 * Proxies to Django Land Dev Cash Flow Service which uses numpy-financial
 * for IRR/NPV calculations to match Excel methodology.
 */

import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ projectId: string }> };

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function GET(
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

    // Proxy to Django Land Dev Cash Flow endpoint
    console.log(`Fetching cash flow summary from Django for project ${projectId}...`);

    const djangoUrl = `${DJANGO_API_URL}/api/projects/${projectId}/cash-flow/calculate/`;
    const djangoResponse = await fetch(djangoUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!djangoResponse.ok) {
      const errorText = await djangoResponse.text();
      console.error(`Django cash flow error: ${djangoResponse.status}`, errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Django API error: ${djangoResponse.status}`,
        },
        { status: djangoResponse.status }
      );
    }

    const cashFlow = await djangoResponse.json();

    // Return summary only (same format as before for compatibility)
    return NextResponse.json({
      success: true,
      data: {
        projectId: cashFlow.projectId,
        generatedAt: cashFlow.generatedAt,
        summary: cashFlow.summary,
        periodCount: cashFlow.totalPeriods,
        startDate: cashFlow.startDate,
        endDate: cashFlow.endDate,
      },
    });
  } catch (error: any) {
    console.error('Error fetching cash flow summary:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch cash flow summary',
      },
      { status: 500 }
    );
  }
}
