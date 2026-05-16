/**
 * PATCH /api/projects/[projectId]/benchmarks/[benchmarkId]
 *
 * Proxy for Django sale benchmark update endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

type Params = { params: Promise<{ projectId: string; benchmarkId: string }> };

export async function PATCH(
  request: NextRequest,
  context: Params
) {
  const authHeader = request.headers.get('Authorization');
  try {
    const { benchmarkId } = await context.params;
    const body = await request.json();

    const response = await fetch(`${DJANGO_API_URL}/api/sale-benchmarks/${benchmarkId}/`, {
        method: 'PATCH',
        headers: { ...(authHeader ? { Authorization: authHeader } : {}), 'Content-Type': 'application/json', },
        body: JSON.stringify(body),
      });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Django API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating benchmark:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update benchmark' },
      { status: 500 }
    );
  }
}
