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

type Params = { params: Promise<{ projectId: string; id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { projectId, id } = await params;
    const { searchParams } = new URL(request.url);
    const body = await request.json();

    const djangoUrl = buildUrl(
      `${DJANGO_API_URL}/api/projects/${projectId}/loans/${id}/`,
      searchParams
    );

    const response = await fetch(djangoUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(request),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Django proxy error:', error);
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { projectId, id } = await params;
    const { searchParams } = new URL(request.url);

    const djangoUrl = buildUrl(
      `${DJANGO_API_URL}/api/projects/${projectId}/loans/${id}/`,
      searchParams
    );

    const response = await fetch(djangoUrl, {
      method: 'DELETE',
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
