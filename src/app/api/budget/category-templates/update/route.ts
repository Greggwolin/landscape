// Update Global Template from Project Categories
// v1.0 · 2025-11-02

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * PUT /api/budget/category-templates/update
 *
 * Update a global template using categories from a project
 *
 * Request Body:
 * {
 *   project_id: number;
 *   template_name: string;
 *   project_type_code: string;
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, template_name, project_type_code } = body;

    // Validation
    if (!project_id || !template_name || !project_type_code) {
      return NextResponse.json(
        { error: 'Missing required fields: project_id, template_name, project_type_code' },
        { status: 400 }
      );
    }

    // Verify project exists
    const projectCheck = await sql`
      SELECT project_id, project_name FROM landscape.tbl_project WHERE project_id = ${project_id}
    `;

    if (projectCheck.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get project categories
    const projectCategories = await sql`
      SELECT
        category_id,
        parent_id,
        level,
        code,
        name,
        description,
        sort_order,
        icon,
        color
      FROM landscape.core_budget_category
      WHERE project_id = ${project_id}
        AND is_template = false
        AND is_active = true
      ORDER BY level, sort_order
    `;

    if (projectCategories.length === 0) {
      return NextResponse.json(
        { error: 'Project has no categories to copy to template' },
        { status: 400 }
      );
    }

    // Delete existing template categories
    await sql`
      DELETE FROM landscape.core_budget_category
      WHERE is_template = true
        AND template_name = ${template_name}
        AND project_type_code = ${project_type_code}
    `;

    // Copy project categories to template
    const idMap = new Map<number, number>(); // old project category ID -> new template ID
    let updatedCount = 0;

    for (const level of [1, 2, 3, 4]) {
      const levelCategories = projectCategories.filter(cat => cat.level === level);

      for (const category of levelCategories) {
        // Map parent_id to new template category ID if parent exists
        const newParentId = category.parent_id ? idMap.get(category.parent_id) : null;

        // Insert new template category
        const insertResult = await sql`
          INSERT INTO landscape.core_budget_category (
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
          ) VALUES (
            ${newParentId},
            ${category.level},
            ${category.code},
            ${category.name},
            ${category.description},
            NULL,
            true,
            ${template_name},
            ${project_type_code},
            ${category.sort_order},
            ${category.icon},
            ${category.color},
            true,
            NOW(),
            NOW()
          )
          RETURNING category_id
        `;

        // Map old project category ID to new template ID
        idMap.set(category.category_id, insertResult[0].category_id);
        updatedCount++;
      }
    }

    return NextResponse.json({
      message: 'Template updated successfully',
      template_name,
      project_type_code,
      categories_updated: updatedCount,
    });

  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
