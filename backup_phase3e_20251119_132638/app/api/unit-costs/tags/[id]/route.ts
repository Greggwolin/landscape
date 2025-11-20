import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!DJANGO_API_URL) {
    return NextResponse.json(
      { error: 'Django API not configured' },
      { status: 500 }
    );
  }

  try {
    const url = `${DJANGO_API_URL.replace(/\/$/, '')}/api/unit-costs/tags/${params.id}/`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to delete tag' }));
      return NextResponse.json(error, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
