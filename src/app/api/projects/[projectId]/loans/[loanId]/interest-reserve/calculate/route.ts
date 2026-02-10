import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

const getAuthHeaders = (request: NextRequest) => {
  const authHeader = request.headers.get('Authorization');
  return authHeader ? { Authorization: authHeader } : {};
};

type Params = { params: Promise<{ projectId: string; loanId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { projectId, loanId } = await params;
    const body = await request.json().catch(() => ({}));

    const response = await fetch(
      `${DJANGO_API_URL}/api/projects/${projectId}/loans/${loanId}/interest-reserve/calculate/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(request),
        },
        body: JSON.stringify(body || {}),
      }
    );

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Django proxy error (interest reserve calc):', error);
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}
