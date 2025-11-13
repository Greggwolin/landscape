import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

// PUT - Update category
export async function PUT(
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
    const body = await request.json();
    const url = `${DJANGO_API_URL.replace(/\/$/, '')}/api/unit-costs/categories/${params.id}/`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update category' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE - Delete category (soft delete)
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
    const url = `${DJANGO_API_URL.replace(/\/$/, '')}/api/unit-costs/categories/${params.id}/`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to delete category' }));
      return NextResponse.json(error, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}

// GET deletion impact
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'deletion-impact') {
    if (!DJANGO_API_URL) {
      return NextResponse.json(
        { error: 'Django API not configured' },
        { status: 500 }
      );
    }

    try {
      const url = `${DJANGO_API_URL.replace(/\/$/, '')}/api/unit-costs/categories/${params.id}/deletion-impact/`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch deletion impact' }));
        return NextResponse.json(error, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error fetching deletion impact:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deletion impact' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
