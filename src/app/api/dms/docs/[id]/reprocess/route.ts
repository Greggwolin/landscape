/**
 * POST /api/dms/docs/[id]/reprocess
 * Re-queue a document for RAG processing with high priority
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: docId } = await params;

  try {
    const response = await fetch(
      `${DJANGO_API_URL}/api/knowledge/documents/${docId}/reprocess/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Django API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { success: false, error: 'Failed to reprocess document' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Reprocess document API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
