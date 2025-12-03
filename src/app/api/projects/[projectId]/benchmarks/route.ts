/**
 * GET/POST /api/projects/[projectId]/benchmarks
 *
 * Proxy for Django sale benchmarks endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const scope = searchParams.get('scope');

    let url = `${DJANGO_API_URL}/api/projects/${projectId}/sale-benchmarks/`;

    // Add query parameters
    const queryParams = new URLSearchParams();
    if (type) queryParams.append('benchmark_type', type);
    if (scope) queryParams.append('scope_level', scope);

    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }

    const response = await fetch(url);

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
    console.error('Error fetching benchmarks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch benchmarks' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const body = await request.json();

    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/sale-benchmarks/`,
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
      return NextResponse.json(
        { error: `Django API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error saving benchmark:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save benchmark' },
      { status: 500 }
    );
  }
}
