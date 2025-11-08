// Budget Category Tree API
// v1.0 · 2025-11-02

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { BudgetCategory, BudgetCategoryTreeNode, CategoryTreeResponse } from '@/types/budget-categories';

/**
 * GET /api/budget/categories/tree
 *
 * Get hierarchical tree structure of budget categories
 *
 * Query Parameters:
 * - project_id: Get categories for specific project (includes project + matching templates)
 * - template_name: Get categories for specific template
 * - project_type_code: Get categories for specific project type
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const project_id = searchParams.get('project_id');
    const template_name = searchParams.get('template_name');
    const project_type_code = searchParams.get('project_type_code');

    // Build query based on parameters
    let categories: any[] = [];
    let responseProjectId: number | null = null;
    let responseTemplateName: string | null = null;

    if (project_id) {
      // Get project-specific categories + matching templates
      const projectResult = await sql`
        SELECT project_type_code, project_name
        FROM landscape.tbl_project
        WHERE project_id = ${project_id}
      `;

      if (projectResult.length === 0) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      const projectType = projectResult[0].project_type_code;
      responseProjectId = parseInt(project_id);

      // Fetch both project-specific and template categories
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
          is_active
        FROM landscape.core_budget_category
        WHERE (
          (project_id = ${project_id} AND is_template = false) OR
          (is_template = true AND project_type_code = ${projectType})
        )
        AND is_active = true
        ORDER BY level, sort_order, name
      `;

      categories = result;

    } else if (template_name) {
      // Get template categories
      responseTemplateName = template_name;

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
          is_active
        FROM landscape.core_budget_category
        WHERE is_template = true
          AND template_name = ${template_name}
          ${project_type_code ? sql`AND project_type_code = ${project_type_code}` : sql``}
          AND is_active = true
        ORDER BY level, sort_order, name
      `;

      categories = result;

    } else if (project_type_code) {
      // Get all templates for project type
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
          is_active
        FROM landscape.core_budget_category
        WHERE is_template = true
          AND project_type_code = ${project_type_code}
          AND is_active = true
        ORDER BY level, sort_order, name
      `;

      categories = result;

    } else {
      // No filter - return all active categories
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
          is_active
        FROM landscape.core_budget_category
        WHERE is_active = true
        ORDER BY level, sort_order, name
      `;

      categories = result;
    }

    // Build tree structure
    const tree = buildTree(categories);

    // Calculate level counts
    const levelCounts = categories.reduce((acc, cat) => {
      const key = `level_${cat.level}` as keyof typeof acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {
      level_1: 0,
      level_2: 0,
      level_3: 0,
      level_4: 0,
    });

    const response: CategoryTreeResponse = {
      project_id: responseProjectId,
      template_name: responseTemplateName,
      categories: tree,
      total_count: categories.length,
      level_counts: levelCounts,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching category tree:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category tree', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Build hierarchical tree from flat array of categories
 */
function buildTree(categories: any[]): BudgetCategoryTreeNode[] {
  const map = new Map<number, BudgetCategoryTreeNode>();
  const roots: BudgetCategoryTreeNode[] = [];

  // Create enhanced nodes with tree properties
  categories.forEach(cat => {
    map.set(cat.category_id, {
      ...cat,
      children: [],
      has_children: false,
      depth: cat.level - 1,
      is_leaf: false,
      is_expanded: false, // Default collapsed
    });
  });

  // Build parent-child relationships
  categories.forEach(cat => {
    const node = map.get(cat.category_id)!;

    if (cat.parent_id) {
      const parent = map.get(cat.parent_id);
      if (parent) {
        parent.children.push(node);
        parent.has_children = true;
        // Don't store parent reference to avoid circular JSON
      }
    } else {
      // Root level category
      roots.push(node);
    }
  });

  // Mark leaf nodes
  map.forEach(node => {
    node.is_leaf = node.children.length === 0;
  });

  // Sort children by sort_order, then name
  const sortNodes = (nodes: BudgetCategoryTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.name.localeCompare(b.name);
    });

    nodes.forEach(node => {
      if (node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };

  sortNodes(roots);

  return roots;
}
