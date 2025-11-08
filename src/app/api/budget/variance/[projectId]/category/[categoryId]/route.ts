/**
 * GET /api/budget/variance/[projectId]/category/[categoryId]
 *
 * Proxies to Django backend for category variance detail
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

type Params = { params: Promise<{ projectId: string; categoryId: string }> };

export async function GET(
  request: NextRequest,
  context: Params
) {
  try {
    const { projectId, categoryId } = await context.params;

    const response = await fetch(
      `${DJANGO_API_URL}/api/financial/budget/variance/${projectId}/category/${categoryId}/`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Django API returned ${response.status}:`, errorText);
      throw new Error(`Django API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching category variance detail:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch category variance detail',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
