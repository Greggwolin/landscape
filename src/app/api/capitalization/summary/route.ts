import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

const buildUrl = (baseUrl: string, searchParams: URLSearchParams) => {
  const query = searchParams.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
};

const getAuthHeaders = (request: NextRequest) => {
  const authHeader = request.headers.get('Authorization');
  return authHeader ? { Authorization: authHeader } : {};
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || searchParams.get('project_id');
    const loanId = searchParams.get('loanId') || searchParams.get('loan_id') || searchParams.get('facility_id');

    if (!projectId || !loanId) {
      return NextResponse.json(
        { success: false, error: 'projectId and loanId are required' },
        { status: 400 }
      );
    }

    const djangoUrl = buildUrl(
      `${DJANGO_API_URL}/api/projects/${projectId}/loans/${loanId}/balance-summary/`,
      searchParams
    );

    const response = await fetch(djangoUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(request),
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Django proxy error:', error);
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}
