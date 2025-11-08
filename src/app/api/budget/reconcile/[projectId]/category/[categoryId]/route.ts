/**
 * POST /api/budget/reconcile/[projectId]/category/[categoryId]
 *
 * Proxies to Django backend for variance reconciliation
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

type Params = { params: Promise<{ projectId: string; categoryId: string }> };

export async function POST(
  request: NextRequest,
  context: Params
) {
  try {
    const { projectId, categoryId } = await context.params;
    const body = await request.json();

    const response = await fetch(
      `${DJANGO_API_URL}/api/financial/budget/reconcile/${projectId}/category/${categoryId}/`,
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
      console.error(`Django API returned ${response.status}:`, errorText);

      // Try to parse error as JSON
      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(errorData, { status: response.status });
      } catch {
        throw new Error(`Django API returned ${response.status}: ${errorText}`);
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reconciling variance:', error);
    return NextResponse.json(
      {
        error: 'Failed to reconcile variance',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
