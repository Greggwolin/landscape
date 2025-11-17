import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8001';

/**
 * GET /api/projects/:projectId/sale-benchmarks
 * Fetch all sale benchmarks for a project (includes global defaults)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/sale-benchmarks/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching sale benchmarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sale benchmarks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/:projectId/sale-benchmarks
 * Create a new project-level or product-level benchmark
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
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

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating sale benchmark:', error);
    return NextResponse.json(
      { error: 'Failed to create sale benchmark' },
      { status: 500 }
    );
  }
}
