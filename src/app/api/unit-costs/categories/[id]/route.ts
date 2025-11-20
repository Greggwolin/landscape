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
  const categoryId = parseInt(params.id);
  if (isNaN(categoryId)) {
    return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
  }

  // Try Django first
  if (DJANGO_FINANCIAL_BASE) {
    try {
      const url = `${DJANGO_FINANCIAL_BASE}/unit-costs/categories/${categoryId}/`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        return NextResponse.json({ success: true });
      }
    } catch (error) {
      console.warn('Django DELETE failed, falling back to direct SQL:', error);
    }
  }

  // Fallback to direct SQL
  try {
    const { sql } = await import('@/lib/db');

    // Check if category has children
    const children = await sql`
      SELECT category_id
      FROM landscape.core_unit_cost_category
      WHERE parent_id = ${categoryId} AND is_active = true
    `;

    if (children.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete category with active children',
          details: `This category has ${children.length} subcategories. Please delete or reassign them first.`
        },
        { status: 400 }
      );
    }

    // Check if category is used in any budget items
    const usage = await sql`
      SELECT COUNT(*) as count
      FROM landscape.core_fin_fact_budget
      WHERE category_id = ${categoryId}
    `;

    const usageCount = parseInt(usage[0]?.count || '0');
    if (usageCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete category in use',
          details: `This category is used in ${usageCount} budget items. Please reassign them first.`
        },
        { status: 400 }
      );
    }

    // Soft delete: set is_active = false
    await sql`
      UPDATE landscape.core_unit_cost_category
      SET
        is_active = false,
        updated_at = NOW()
      WHERE category_id = ${categoryId}
    `;

    // Also soft delete lifecycle stage associations
    await sql`
      DELETE FROM landscape.core_category_lifecycle_stages
      WHERE category_id = ${categoryId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category', details: error instanceof Error ? error.message : 'Unknown error' },
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
