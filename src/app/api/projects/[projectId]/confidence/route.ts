/**
 * Project Confidence API
 *
 * GET /api/projects/[projectId]/confidence
 *
 * Returns data confidence scores by domain.
 * Used to show users how much structured data is available
 * and the reliability of Landscaper responses.
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API = process.env.DJANGO_API_URL || 'http://localhost:8000';

interface ConfidenceScore {
  level: 'high' | 'medium' | 'low';
  score: number;
  details?: string;
}

interface ConfidenceResponse {
  profile: ConfidenceScore;
  units: ConfidenceScore;
  parcels: ConfidenceScore;
  budget: ConfidenceScore;
  documents: ConfidenceScore;
  overall: ConfidenceScore;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // Try to fetch from Django backend
    const response = await fetch(
      `${DJANGO_API}/api/knowledge/projects/${projectId}/confidence/`,
      {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.confidence) {
        return NextResponse.json(data.confidence);
      }
    }

    // Fallback response if Django endpoint fails
    const fallback: ConfidenceResponse = {
      profile: { level: 'medium', score: 50, details: 'Unable to calculate' },
      units: { level: 'medium', score: 50, details: 'Unable to calculate' },
      parcels: { level: 'medium', score: 50, details: 'Unable to calculate' },
      budget: { level: 'medium', score: 50, details: 'Unable to calculate' },
      documents: { level: 'medium', score: 50, details: 'Unable to calculate' },
      overall: { level: 'medium', score: 50, details: 'Fallback values' },
    };

    return NextResponse.json(fallback);
  } catch (error) {
    console.error('Confidence fetch error:', error);

    // Return minimal fallback on error
    return NextResponse.json({
      overall: { level: 'low', score: 0, details: 'Error fetching confidence' },
    });
  }
}
