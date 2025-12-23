import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

/**
 * GET /api/projects/completeness
 * Get completeness scores for all active projects.
 */
export async function GET(_request: NextRequest) {
  try {
    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/all-completeness/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch completeness' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error('All projects completeness fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
