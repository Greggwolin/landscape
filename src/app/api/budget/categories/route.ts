// Budget Category API - List & Create
// v1.0 · 2025-11-02

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/budget/categories
 *
 * List budget categories with optional filters
 *
 * Query Parameters:
 * - project_id: Filter by project (returns project-specific + matching templates)
 * - template_name: Filter by template name
 * - project_type_code: Filter by project type
 * - level: Filter by hierarchy level (1-4)
 * - parent_id: Filter by parent category
 * - is_template: Filter templates (true) or project categories (false)
 * - include_inactive: Include inactive categories (default: false)
 * - activity: Filter by activity (Acquisition, Planning & Engineering, Improvements, Operations, Disposition, Financing)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const project_id = searchParams.get('project_id');
    const template_name = searchParams.get('template_name');
    const project_type_code = searchParams.get('project_type_code');
    const level = searchParams.get('level');
    const parent_id = searchParams.get('parent_id');
    const is_template = searchParams.get('is_template');
    const include_inactive = searchParams.get('include_inactive') === 'true';
    const activity = searchParams.get('activity');

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const params: any[] = [];
    const paramCount = 1;

    if (project_id) {
      // Use core_unit_cost_category joined with lifecycle stage mapping
      // This provides user-friendly category names (e.g., "Civil Engineering", "Landscaping")
      // filtered by the lifecycle stage from core_category_activitys

      if (activity) {
        // Return categories filtered by lifecycle stage
        const result = await sql`
          SELECT DISTINCT
            uc.category_id,
            uc.parent_id,
            NULL::text as code,
            uc.category_name as name,
            NULL::text as kind,
            NULL::text as class,
            NULL::text as event,
            NULL::text as scope,
            NULL::text as detail
          FROM landscape.core_unit_cost_category uc
          INNER JOIN landscape.core_category_lifecycle_stages cls
            ON uc.category_id = cls.category_id
          WHERE uc.is_active = true
            AND cls.activity = ${activity}
          ORDER BY uc.category_name
        `;

        console.log('📊 Returned', result.length, 'unit cost categories for project', project_id,
                    `(filtered by stage: ${activity})`);

        return NextResponse.json({
          categories: result,
          count: result.length,
        });
      } else {
        // No lifecycle stage filter - return all unit cost categories
        const result = await sql`
          SELECT
            category_id,
            parent_id,
            NULL::text as code,
            category_name as name,
            NULL::text as kind,
            NULL::text as class,
            NULL::text as event,
            NULL::text as scope,
            NULL::text as detail
          FROM landscape.core_unit_cost_category
          WHERE is_active = true
          ORDER BY category_name
        `;

        console.log('📊 Returned', result.length, 'unit cost categories for project', project_id);

        return NextResponse.json({
          categories: result,
          count: result.length,
        });
      }
    }

    if (template_name && project_type_code) {
      // Phase 4: core_fin_category dropped - this legacy path is no longer supported
      // Return empty result (template-based filtering moved to core_unit_cost_category)
      console.warn('⚠️ template_name+project_type_code query path deprecated after Phase 4');
      return NextResponse.json({
        categories: [],
        count: 0,
      });
    }

    // If no valid parameters, return empty
    return NextResponse.json({
      categories: [],
      count: 0,
    });

  } catch (error) {
    console.error('Error fetching budget categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/budget/categories
 *
 * Create a new budget category
 *
 * Request Body:
 * {
 *   code: string;
 *   name: string;
 *   description?: string;
 *   level: 1 | 2 | 3 | 4;
 *   parent_id?: number;
 *   project_id?: number;
 *   is_template?: boolean;
 *   template_name?: string;
 *   project_type_code?: string;
 *   sort_order?: number;
 *   icon?: string;
 *   color?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      code,
      name,
      description = null,
      level,
      parent_id = null,
      project_id = null,
      is_template = false,
      template_name = null,
      project_type_code = null,
      sort_order = 0,
      icon = null,
      color = null,
    } = body;

    // Validation
    if (!code || !name || !level) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, level' },
        { status: 400 }
      );
    }

    if (level < 1 || level > 4) {
      return NextResponse.json(
        { error: 'Level must be between 1 and 4' },
        { status: 400 }
      );
    }

    // Level 1 cannot have parent
    if (level === 1 && parent_id) {
      return NextResponse.json(
        { error: 'Level 1 categories cannot have a parent' },
        { status: 400 }
      );
    }

    // Level 2-4 must have parent
    if (level > 1 && !parent_id) {
      return NextResponse.json(
        { error: `Level ${level} categories must have a parent` },
        { status: 400 }
      );
    }

    // Template validation
    if (is_template && !template_name) {
      return NextResponse.json(
        { error: 'Template categories must have a template_name' },
        { status: 400 }
      );
    }

    // Project validation
    if (!is_template && !project_id) {
      return NextResponse.json(
        { error: 'Project-specific categories must have a project_id' },
        { status: 400 }
      );
    }

    // Validate parent level if parent_id provided
    if (parent_id) {
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
    }

    // Insert category
    const result = await sql`
      INSERT INTO landscape.core_budget_category (
        code,
        name,
        description,
        level,
        parent_id,
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
        ${code},
        ${name},
        ${description},
        ${level},
        ${parent_id},
        ${project_id},
        ${is_template},
        ${template_name},
        ${project_type_code},
        ${sort_order},
        ${icon},
        ${color},
        true,
        NOW(),
        NOW()
      )
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
      message: 'Category created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating budget category:', error);

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'Category code already exists for this project and level' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
