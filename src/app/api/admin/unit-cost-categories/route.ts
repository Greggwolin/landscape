import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * POST /api/admin/unit-cost-categories
 *
 * Create a new unit cost category (subcategory).
 * Used when users type a custom expense name that doesn't match existing categories.
 *
 * Required fields:
 * - category_name: Display name for the category
 * - parent_id: Parent category ID (must be a valid category)
 *
 * Optional fields:
 * - account_number: Will be auto-generated if not provided
 * - is_active: Defaults to true
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category_name, parent_id, account_number, is_active = true } = body;

    if (!category_name || !parent_id) {
      return NextResponse.json(
        { error: 'category_name and parent_id are required' },
        { status: 400 }
      );
    }

    // Verify parent exists and get its account_number for generating child number
    const parent = await sql`
      SELECT category_id, account_number, category_name
      FROM landscape.core_unit_cost_category
      WHERE category_id = ${parent_id}
    `;

    if (parent.length === 0) {
      return NextResponse.json(
        { error: 'Parent category not found' },
        { status: 404 }
      );
    }

    // Check if a category with this name already exists under the same parent
    const existing = await sql`
      SELECT category_id, category_name
      FROM landscape.core_unit_cost_category
      WHERE LOWER(category_name) = LOWER(${category_name})
        AND parent_id = ${parent_id}
    `;

    if (existing.length > 0) {
      // Return existing category instead of creating duplicate
      return NextResponse.json({
        success: true,
        category: existing[0],
        message: 'Category already exists'
      });
    }

    // Generate account_number if not provided
    let finalAccountNumber = account_number;
    if (!finalAccountNumber) {
      // Find the highest account_number among siblings and increment
      const siblings = await sql`
        SELECT account_number
        FROM landscape.core_unit_cost_category
        WHERE parent_id = ${parent_id}
        ORDER BY account_number DESC
        LIMIT 1
      `;

      if (siblings.length > 0 && siblings[0].account_number) {
        // Increment the last account number
        const lastNum = parseInt(siblings[0].account_number);
        if (!isNaN(lastNum)) {
          finalAccountNumber = String(lastNum + 1);
        }
      }

      // If still no account number, generate based on parent
      if (!finalAccountNumber) {
        const parentNum = parent[0].account_number;
        if (parentNum) {
          // Add a suffix to parent number (e.g., 4110 -> 41101 or 4110A)
          finalAccountNumber = parentNum + '1';
        } else {
          // Generate a random number in the 4xxx range
          finalAccountNumber = '4' + Math.floor(Math.random() * 900 + 100);
        }
      }
    }

    // Insert the new category
    const result = await sql`
      INSERT INTO landscape.core_unit_cost_category (
        category_name,
        parent_id,
        account_number,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        ${category_name},
        ${parent_id},
        ${finalAccountNumber},
        ${is_active},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      category: result[0]
    });

  } catch (error) {
    console.error('Error creating unit cost category:', error);
    return NextResponse.json(
      { error: 'Failed to create unit cost category' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/unit-cost-categories
 *
 * Get all unit cost categories, optionally filtered.
 *
 * Query params:
 * - parent_id: Filter by parent category
 * - account_prefix: Filter by account number prefix (e.g., "4" for OpEx)
 * - include_inactive: Include inactive categories (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parent_id');
    const accountPrefix = searchParams.get('account_prefix');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let categories;

    if (parentId) {
      // Get children of specific parent
      categories = await sql`
        SELECT
          c.category_id,
          c.category_name,
          c.account_number,
          c.parent_id,
          c.is_active,
          p.category_name as parent_name
        FROM landscape.core_unit_cost_category c
        LEFT JOIN landscape.core_unit_cost_category p ON c.parent_id = p.category_id
        WHERE c.parent_id = ${parseInt(parentId)}
          ${includeInactive ? sql`` : sql`AND c.is_active = true`}
        ORDER BY c.account_number
      `;
    } else if (accountPrefix) {
      // Get all categories with account number prefix
      categories = await sql`
        SELECT
          c.category_id,
          c.category_name,
          c.account_number,
          c.parent_id,
          c.is_active,
          p.category_name as parent_name
        FROM landscape.core_unit_cost_category c
        LEFT JOIN landscape.core_unit_cost_category p ON c.parent_id = p.category_id
        WHERE c.account_number LIKE ${accountPrefix + '%'}
          ${includeInactive ? sql`` : sql`AND c.is_active = true`}
        ORDER BY c.account_number
      `;
    } else {
      // Get all categories
      categories = await sql`
        SELECT
          c.category_id,
          c.category_name,
          c.account_number,
          c.parent_id,
          c.is_active,
          p.category_name as parent_name
        FROM landscape.core_unit_cost_category c
        LEFT JOIN landscape.core_unit_cost_category p ON c.parent_id = p.category_id
        ${includeInactive ? sql`` : sql`WHERE c.is_active = true`}
        ORDER BY c.account_number
      `;
    }

    return NextResponse.json({ categories });

  } catch (error) {
    console.error('Error fetching unit cost categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
