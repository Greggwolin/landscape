import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL =
  process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ documentKey: string }> }
) {
  try {
    const { documentKey } = await params;
    const body = await req.json();

    const response = await fetch(
      `${DJANGO_API_URL}/api/knowledge/platform/${documentKey}/chat/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Chat request failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Platform knowledge chat error:', error);
    return NextResponse.json(
      { error: 'Failed to chat with document' },
      { status: 500 }
    );
  }
}
