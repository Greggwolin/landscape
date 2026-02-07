import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

type Params = { params: Promise<{ projectId: string; loanId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { projectId, loanId } = await params;

    const djangoUrl = `${DJANGO_API_URL}/api/projects/${projectId}/loans/${loanId}/debt-schedule/`;

    const authHeader = request.headers.get('Authorization');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeader) headers.Authorization = authHeader;

    const response = await fetch(djangoUrl, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Django proxy error:', error);
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}
