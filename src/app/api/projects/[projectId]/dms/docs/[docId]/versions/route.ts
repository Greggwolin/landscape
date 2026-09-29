import { NextResponse } from 'next/server';

const DJANGO_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// Django requires a signed-in user on every one of these endpoints; forward the
// caller's sign-in or the request is refused (401).
function authHeader(request: Request): Record<string, string> {
  const auth = request.headers.get('Authorization');
  return auth ? { Authorization: auth } : {};
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  try {
    const { projectId, docId } = await params;
    const response = await fetch(
      `${DJANGO_URL}/api/dms/projects/${projectId}/docs/${docId}/versions/`,
      { headers: authHeader(request) }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching version history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version history' },
      { status: 500 }
    );
  }
}
