// Budget Category API - Get, Update, Delete by ID
// v1.0 · 2025-11-02

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/budget/categories/[id]
 *
 * Get a single budget category by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category_id = parseInt(id);

    if (isNaN(category_id)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT
        category_id,
        parent_id,
        level,
        code,
        name,
        description,
        project_id,
        is_template,
        template_name,
        project_type_code,
        sort_order,
        icon,
        color,
        is_active,
        created_at,
        updated_at,
        created_by
      FROM landscape.core_budget_category
      WHERE category_id = ${category_id}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ category: result[0] });

  } catch (error) {
    console.error('Error fetching budget category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/budget/categories/[id]
 *
 * Update a budget category
 *
 * Request Body: Partial category fields to update
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category_id = parseInt(id);

    if (isNaN(category_id)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Get current category for validation
    const currentResult = await sql`
      SELECT * FROM landscape.core_budget_category WHERE category_id = ${category_id}
    `;

    if (currentResult.length === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const current = currentResult[0];

    // Prepare update fields
    const {
      code = current.code,
      name = current.name,
      description = current.description,
      level = current.level,
      parent_id = current.parent_id,
      sort_order = current.sort_order,
      icon = current.icon,
      color = current.color,
      is_active = current.is_active,
    } = body;

    // Validate level change
    if (level !== current.level) {
      return NextResponse.json(
        { error: 'Cannot change category level. Create a new category instead.' },
        { status: 400 }
      );
    }

    // Validate parent if changed
    if (parent_id !== current.parent_id) {
      if (level === 1 && parent_id) {
        return NextResponse.json(
          { error: 'Level 1 categories cannot have a parent' },
          { status: 400 }
        );
      }

      if (level > 1 && !parent_id) {
        return NextResponse.json(
          { error: `Level ${level} categories must have a parent` },
          { status: 400 }
        );
      }

      if (parent_id) {
        // Validate parent level
        const parentResult = await sql`
          SELECT level FROM landscape.core_budget_category WHERE category_id = ${parent_id}
        `;

        if (parentResult.length === 0) {
          return NextResponse.json(
            { error: `Parent category ${parent_id} not found` },
            { status: 404 }
          );
        }

        const parentLevel = parentResult[0].level;
        if (parentLevel !== level - 1) {
          return NextResponse.json(
            {
              error: `Parent level (${parentLevel}) must be exactly one level above child level (${level})`,
            },
            { status: 400 }
          );
        }

        // Prevent circular references
        if (parent_id === category_id) {
          return NextResponse.json(
            { error: 'Category cannot be its own parent' },
            { status: 400 }
          );
        }
      }
    }

    // Update category
    const result = await sql`
      UPDATE landscape.core_budget_category
      SET
        code = ${code},
        name = ${name},
        description = ${description},
        parent_id = ${parent_id},
        sort_order = ${sort_order},
        icon = ${icon},
        color = ${color},
        is_active = ${is_active},
        updated_at = NOW()
      WHERE category_id = ${category_id}
      RETURNING
        category_id,
        parent_id,
        level,
        code,
        name,
        description,
        project_id,
        is_template,
        template_name,
        project_type_code,
        sort_order,
        icon,
        color,
        is_active,
        created_at,
        updated_at
    `;

    return NextResponse.json({
      category: result[0],
      message: 'Category updated successfully',
    });

  } catch (error) {
    console.error('Error updating budget category:', error);

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'Category code already exists for this project and level' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/budget/categories/[id]
 *
 * Delete a budget category (only if not in use)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category_id = parseInt(id);

    if (isNaN(category_id)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

    // Check if category exists
    const categoryResult = await sql`
      SELECT category_id, name FROM landscape.core_budget_category
      WHERE category_id = ${category_id}
    `;

    if (categoryResult.length === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category is in use by budget items
    const usageCheck = await sql`
      SELECT COUNT(*) as count
      FROM landscape.core_fin_fact_budget
      WHERE category_l1_id = ${category_id}
         OR category_l2_id = ${category_id}
         OR category_l3_id = ${category_id}
         OR category_l4_id = ${category_id}
    `;

    const usageCount = parseInt(usageCheck[0].count);

    if (usageCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category because it is used by ${usageCount} budget item(s)`,
          usage_count: usageCount,
        },
        { status: 409 }
      );
    }

    // Check if category has children that are in use
    const childrenInUseCheck = await sql`
      SELECT c.category_id, c.name
      FROM landscape.core_budget_category c
      WHERE c.parent_id = ${category_id}
        AND EXISTS (
          SELECT 1 FROM landscape.core_fin_fact_budget
          WHERE category_l1_id = c.category_id
             OR category_l2_id = c.category_id
             OR category_l3_id = c.category_id
             OR category_l4_id = c.category_id
        )
    `;

    if (childrenInUseCheck.length > 0) {
      const childNames = childrenInUseCheck.map((c: any) => c.name).join(', ');
      return NextResponse.json(
        {
          error: `Cannot delete category because child categories are in use: ${childNames}`,
          children_in_use: childrenInUseCheck.length,
        },
        { status: 409 }
      );
    }

    // Delete all children first (that aren't in use)
    await sql`
      DELETE FROM landscape.core_budget_category
      WHERE parent_id = ${category_id}
    `;

    // Delete category
    await sql`
      DELETE FROM landscape.core_budget_category
      WHERE category_id = ${category_id}
    `;

    return NextResponse.json({
      message: 'Category deleted successfully',
      deleted_id: category_id,
    });

  } catch (error) {
    console.error('Error deleting budget category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
