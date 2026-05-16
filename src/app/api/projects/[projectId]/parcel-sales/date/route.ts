import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const authHeader = request.headers.get('Authorization');
  const { projectId } = await params;
  const body = await request.json();

  const response = await fetch(`${DJANGO_API_URL}/api/projects/${projectId}/parcel-sales/date/`, {
      method: 'PATCH',
      headers: { ...(authHeader ? { Authorization: authHeader } : {}), 'Content-Type': 'application/json', },
      body: JSON.stringify(body),
    });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  return NextResponse.json(data);
}
