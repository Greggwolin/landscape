import { NextRequest, NextResponse } from 'next/server';

const DJANGO_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  try {
    const { projectId, docId } = await params;

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty for DELETE requests
    }

    const response = await fetch(
      `${DJANGO_URL}/api/dms/projects/${projectId}/docs/${docId}/delete/`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
