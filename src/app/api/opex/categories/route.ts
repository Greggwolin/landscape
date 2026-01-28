/**
 * OpEx Categories API
 *
 * GET /api/opex/categories
 * Returns operating expense categories from core_unit_cost_category
 * filtered by the Operations lifecycle stage
 *
 * Query params:
 * - parent_id: Filter by parent category ID (returns children)
 * - include_all: If true, returns all OpEx categories (account_number LIKE '5%')
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface CategoryRow {
  category_id: number;
  parent_id: number | null;
  category_name: string;
  account_number: string | null;
  sort_order: number;
  is_active: boolean;
  has_children: boolean;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parent_id');
  const includeAll = searchParams.get('include_all') === 'true';

  try {
    let categories: CategoryRow[];

    if (parentId) {
      // Return children of a specific category
      const parentIdNum = parseInt(parentId, 10);
      if (isNaN(parentIdNum)) {
        return NextResponse.json(
          { error: 'Invalid parent_id' },
          { status: 400 }
        );
      }

      categories = await sql<CategoryRow>`
        SELECT
          c.category_id,
          c.parent_id,
          c.category_name,
          c.account_number,
          c.sort_order,
          c.is_active,
          EXISTS (
            SELECT 1 FROM core_unit_cost_category child
            WHERE child.parent_id = c.category_id AND child.is_active = true
          ) as has_children
        FROM core_unit_cost_category c
        WHERE c.parent_id = ${parentIdNum}
          AND c.is_active = true
        ORDER BY c.sort_order, c.category_name
      `;
    } else if (includeAll) {
      // Return all OpEx categories (account numbers starting with 5)
      categories = await sql<CategoryRow>`
        SELECT
          c.category_id,
          c.parent_id,
          c.category_name,
          c.account_number,
          c.sort_order,
          c.is_active,
          EXISTS (
            SELECT 1 FROM core_unit_cost_category child
            WHERE child.parent_id = c.category_id AND child.is_active = true
          ) as has_children
        FROM core_unit_cost_category c
        WHERE c.account_number LIKE '5%'
          AND c.is_active = true
        ORDER BY c.account_number, c.sort_order, c.category_name
      `;
    } else {
      // Return top-level OpEx categories with Operations lifecycle stage
      categories = await sql<CategoryRow>`
        SELECT DISTINCT
          c.category_id,
          c.parent_id,
          c.category_name,
          c.account_number,
          c.sort_order,
          c.is_active,
          EXISTS (
            SELECT 1 FROM core_unit_cost_category child
            WHERE child.parent_id = c.category_id AND child.is_active = true
          ) as has_children
        FROM core_unit_cost_category c
        INNER JOIN core_category_lifecycle_stages cls
          ON c.category_id = cls.category_id
          AND cls.activity = 'Operations'
        WHERE c.is_active = true
          AND c.parent_id IS NULL
        ORDER BY c.sort_order, c.category_name
      `;
    }

    return NextResponse.json({
      success: true,
      count: categories.length,
      categories
    });

  } catch (error) {
    console.error('Error fetching OpEx categories:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: errorMessage },
      { status: 500 }
    );
  }
}
