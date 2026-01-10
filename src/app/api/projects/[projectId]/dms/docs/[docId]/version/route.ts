import { NextRequest, NextResponse } from 'next/server';

const DJANGO_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  try {
    const { projectId, docId } = await params;
    const formData = await request.formData();

    const response = await fetch(
      `${DJANGO_URL}/api/dms/projects/${projectId}/docs/${docId}/version/`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error uploading new version:', error);
    return NextResponse.json(
      { error: 'Failed to upload new version' },
      { status: 500 }
    );
  }
}
