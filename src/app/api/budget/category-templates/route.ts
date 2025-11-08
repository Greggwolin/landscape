// Budget Category Templates API
// v1.0 · 2025-11-02

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/budget/category-templates
 *
 * List available budget category templates
 *
 * Query Parameters:
 * - project_type_code: Filter by project type
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const project_type_code = searchParams.get('project_type_code');

    // Get template summary with category counts
    let result;
    if (project_type_code) {
      result = await sql`
        SELECT
          template_name,
          project_type_code,
          COUNT(*) as category_count,
          COUNT(CASE WHEN level = 1 THEN 1 END) as level_1_count,
          COUNT(CASE WHEN level = 2 THEN 1 END) as level_2_count,
          COUNT(CASE WHEN level = 3 THEN 1 END) as level_3_count,
          COUNT(CASE WHEN level = 4 THEN 1 END) as level_4_count,
          MIN(created_at) as created_at
        FROM landscape.core_budget_category
        WHERE project_type_code = ${project_type_code}
          AND is_template = true
          AND is_active = true
        GROUP BY template_name, project_type_code
        ORDER BY project_type_code, template_name
      `;
    } else {
      result = await sql`
        SELECT
          template_name,
          project_type_code,
          COUNT(*) as category_count,
          COUNT(CASE WHEN level = 1 THEN 1 END) as level_1_count,
          COUNT(CASE WHEN level = 2 THEN 1 END) as level_2_count,
          COUNT(CASE WHEN level = 3 THEN 1 END) as level_3_count,
          COUNT(CASE WHEN level = 4 THEN 1 END) as level_4_count,
          MIN(created_at) as created_at
        FROM landscape.core_budget_category
        WHERE is_template = true
          AND is_active = true
        GROUP BY template_name, project_type_code
        ORDER BY project_type_code, template_name
      `;
    }

    const templates = result.map(row => ({
      template_name: row.template_name,
      project_type_code: row.project_type_code,
      description: getTemplateDescription(row.template_name, row.project_type_code),
      category_count: parseInt(row.category_count),
      level_1_count: parseInt(row.level_1_count),
      level_2_count: parseInt(row.level_2_count),
      level_3_count: parseInt(row.level_3_count),
      level_4_count: parseInt(row.level_4_count),
      created_at: row.created_at,
    }));

    return NextResponse.json({
      templates,
      count: templates.length,
    });

  } catch (error) {
    console.error('Error fetching category templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/budget/category-templates
 *
 * Apply a template to a project (copy template categories to project)
 *
 * Request Body:
 * {
 *   project_id: number;
 *   template_name: string;
 *   project_type_code: string;
 *   overwrite_existing?: boolean; // Delete existing categories first
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      template_name,
      project_type_code,
      overwrite_existing = false,
    } = body;

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

    // Check if project already has categories
    const existingCheck = await sql`
      SELECT COUNT(*) as count
      FROM landscape.core_budget_category
      WHERE project_id = ${project_id} AND is_template = false
    `;

    const existingCount = parseInt(existingCheck[0].count);

    if (existingCount > 0 && !overwrite_existing) {
      return NextResponse.json(
        {
          error: `Project already has ${existingCount} categor(ies). Set overwrite_existing=true to replace them.`,
          existing_count: existingCount,
        },
        { status: 409 }
      );
    }

    // If overwriting, delete existing categories
    if (overwrite_existing && existingCount > 0) {
      await sql`
        DELETE FROM landscape.core_budget_category
        WHERE project_id = ${project_id} AND is_template = false
      `;
    }

    // Get template categories
    const templateResult = await sql`
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
      WHERE is_template = true
        AND template_name = ${template_name}
        AND project_type_code = ${project_type_code}
        AND is_active = true
      ORDER BY level, sort_order
    `;

    if (templateResult.length === 0) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Copy template categories to project
    // Process level by level to maintain parent-child relationships
    const idMap = new Map<number, number>(); // old template ID -> new project category ID
    let createdCount = 0;

    for (const level of [1, 2, 3, 4]) {
      const levelCategories = templateResult.filter(cat => cat.level === level);

      for (const template of levelCategories) {
        // Map parent_id to new project category ID if parent exists
        const newParentId = template.parent_id ? idMap.get(template.parent_id) : null;

        // Insert new project-specific category
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
            ${template.level},
            ${template.code},
            ${template.name},
            ${template.description},
            ${project_id},
            false,
            NULL,
            NULL,
            ${template.sort_order},
            ${template.icon},
            ${template.color},
            true,
            NOW(),
            NOW()
          )
          RETURNING category_id
        `;

        // Map old template ID to new category ID
        idMap.set(template.category_id, insertResult[0].category_id);
        createdCount++;
      }
    }

    return NextResponse.json({
      message: 'Template applied successfully',
      project_id,
      template_name,
      categories_created: createdCount,
      overwritten: overwrite_existing && existingCount > 0,
    }, { status: 201 });

  } catch (error) {
    console.error('Error applying template:', error);
    return NextResponse.json(
      { error: 'Failed to apply template', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get template description
 */
function getTemplateDescription(template_name: string, project_type_code: string): string {
  const descriptions: Record<string, string> = {
    'Land Development': 'Standard land development budget structure with Acquisition, Horizontal, Vertical, and Soft Costs',
    'Multifamily': 'Income property budget structure with Revenue, Operating Expenses, and Capital Expenditures',
    'Office': 'Office property budget structure optimized for commercial office operations',
    'Retail': 'Retail property budget structure for shopping centers and retail developments',
    'Industrial': 'Industrial property budget structure for warehouse and logistics facilities',
    'Mixed Use': 'Mixed-use development budget structure combining multiple property types',
  };

  return descriptions[template_name] || `${template_name} budget template for ${project_type_code} projects`;
}
