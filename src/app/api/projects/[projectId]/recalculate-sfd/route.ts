/**
 * POST /api/projects/[projectId]/recalculate-sfd
 *
 * Proxy for Django SFD parcel recalculation endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;

    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/recalculate-sfd/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    console.error('Error recalculating SFD parcels:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to recalculate SFD parcels' },
      { status: 500 }
    );
  }
}
