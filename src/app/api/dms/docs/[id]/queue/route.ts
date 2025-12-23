/**
 * POST /api/dms/docs/[id]/queue
 * Queue a document for RAG processing (extract → chunk → embed)
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL =
  process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: docId } = await params;

  try {
    const response = await fetch(
      `${DJANGO_API_URL}/api/knowledge/documents/${docId}/queue/`,
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
        { success: false, error: 'Failed to queue document' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Queue document API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
