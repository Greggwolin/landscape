import { NextRequest, NextResponse } from 'next/server';
import { processCategoryUpdate } from '../update-handler';

const DJANGO_API_URL = process.env.DJANGO_API_URL;
const DJANGO_FINANCIAL_BASE = DJANGO_API_URL
  ? `${DJANGO_API_URL.replace(/\/$/, '')}/api/financial`
  : null;

// PUT - Update category (kept for backwards compatibility)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return processCategoryUpdate(request, params.id);
}

// DELETE - Delete category (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!DJANGO_FINANCIAL_BASE) {
    return NextResponse.json(
      { error: 'Django API not configured' },
      { status: 500 }
    );
  }

  try {
    const url = `${DJANGO_FINANCIAL_BASE}/unit-costs/categories/${params.id}/`;

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
    if (!DJANGO_FINANCIAL_BASE) {
      return NextResponse.json(
        { error: 'Django API not configured' },
        { status: 500 }
      );
    }

    try {
      const url = `${DJANGO_FINANCIAL_BASE}/unit-costs/categories/${params.id}/deletion-impact/`;

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
