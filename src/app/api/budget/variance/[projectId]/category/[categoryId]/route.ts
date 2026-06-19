/**
 * GET /api/budget/variance/[projectId]/category/[categoryId]
 *
 * Proxies to Django backend for category variance detail
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8001';

type Params = { params: Promise<{ projectId: string; categoryId: string }> };

export async function GET(
  request: NextRequest,
  context: Params
) {
  const authHeader = request.headers.get('Authorization');
  try {
    const { projectId, categoryId } = await context.params;

    const cookie = request.headers.get('cookie');
    const response = await fetch(`${DJANGO_API_URL}/api/budget/variance/${projectId}/category/${categoryId}/`, {
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          'Content-Type': 'application/json',
        },
      });

    if (!response.ok) {
      // Surface Django's real status/body rather than masking everything as a 500.
      const errorText = await response.text();
      console.error(`Django API returned ${response.status}:`, errorText);
      let payload: unknown;
      try {
        payload = JSON.parse(errorText);
      } catch {
        payload = { error: errorText || `Django API returned ${response.status}` };
      }
      return NextResponse.json(payload, { status: response.status });
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
