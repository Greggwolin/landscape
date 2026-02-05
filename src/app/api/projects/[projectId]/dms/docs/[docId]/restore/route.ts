import { NextRequest, NextResponse } from 'next/server';

const DJANGO_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  try {
    const { projectId, docId } = await params;

    const response = await fetch(
      `${DJANGO_URL}/api/dms/projects/${projectId}/docs/${docId}/restore/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error restoring document:', error);
    return NextResponse.json(
      { error: 'Failed to restore document' },
      { status: 500 }
    );
  }
}
