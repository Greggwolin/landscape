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

type Params = { params: Promise<{ facility_id: string }> };

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { facility_id } = await context.params;
    const loanId = facility_id;
    if (!/^[0-9]+$/.test(loanId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid loanId parameter' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || searchParams.get('project_id') || body.project_id || body.projectId;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const { loan_id, loanId: bodyLoanId, facility_id: bodyFacilityId, ...payload } = body;

    const djangoUrl = buildUrl(
      `${DJANGO_API_URL}/api/projects/${projectId}/loans/${loanId}/`,
      searchParams
    );

    const response = await fetch(djangoUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(request),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Django proxy error:', error);
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  try {
    const { facility_id } = await context.params;
    const loanId = facility_id;
    if (!/^[0-9]+$/.test(loanId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid loanId parameter' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const djangoUrl = buildUrl(
      `${DJANGO_API_URL}/api/projects/${projectId}/loans/${loanId}/`,
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
