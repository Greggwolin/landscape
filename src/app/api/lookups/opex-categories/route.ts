import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export interface OpexCategory {
  category_id: number;
  category_name: string;
  account_number: string;
  parent_id: number | null;
  has_children?: boolean;
  parent_name?: string;
}

// Map legacy parent_category strings to their root category IDs
// These are looked up dynamically but we cache the account number prefixes
const PARENT_CATEGORY_PREFIXES: Record<string, string> = {
  'taxes_insurance': '41',
  'utilities': '42',
  'repairs_maintenance': '43',
  'administrative': '44',
  'management': '44',      // Management is under Administrative
  'marketing': '45',
  'payroll_personnel': '455',
  'other_expenses': '40',
  'other': '40'
};

/**
 * GET /api/lookups/opex-categories
 *
 * Returns Operations categories (4xxx range) from core_unit_cost_category.
 *
 * Query params:
 * - parent_id: Filter to children of a specific parent category (by ID)
 * - parent_category: Filter by parent_category string (e.g., 'taxes_insurance')
 * - flat: If 'true', returns flat list; otherwise returns hierarchical tree
 * - include_has_children: If 'true', includes has_children boolean for each category
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parent_id');
  const parentCategory = searchParams.get('parent_category');
  const flat = searchParams.get('flat') === 'true';
  const includeHasChildren = searchParams.get('include_has_children') === 'true';

  try {
    let categories: OpexCategory[];

    if (parentId) {
      // Get children of specific parent by ID
      if (includeHasChildren) {
        categories = await sql<OpexCategory[]>`
          SELECT
            c.category_id,
            c.category_name,
            c.account_number,
            c.parent_id,
            EXISTS (
              SELECT 1 FROM landscape.core_unit_cost_category child
              WHERE child.parent_id = c.category_id AND child.is_active = true
            ) as has_children
          FROM landscape.core_unit_cost_category c
          WHERE c.parent_id = ${parseInt(parentId, 10)}
            AND c.is_active = true
          ORDER BY c.account_number
        `;
      } else {
        categories = await sql<OpexCategory[]>`
          SELECT category_id, category_name, account_number, parent_id
          FROM landscape.core_unit_cost_category
          WHERE parent_id = ${parseInt(parentId, 10)}
            AND is_active = true
          ORDER BY account_number
        `;
      }
    } else if (parentCategory) {
      // Get categories by parent_category string (for inline editor)
      const accountPrefix = PARENT_CATEGORY_PREFIXES[parentCategory] || '4';

      // Find the root parent category for this group
      const rootAccount = accountPrefix + '00';
      const parent = await sql`
        SELECT category_id
        FROM landscape.core_unit_cost_category
        WHERE account_number = ${rootAccount}
          AND is_active = true
        LIMIT 1
      `;

      if (parent.length > 0) {
        // Get all leaf categories under this parent (recursively)
        categories = await sql<OpexCategory[]>`
          WITH RECURSIVE category_tree AS (
            -- Direct children of the root
            SELECT
              c.category_id,
              c.category_name,
              c.account_number,
              c.parent_id,
              1 as depth
            FROM landscape.core_unit_cost_category c
            WHERE c.parent_id = ${parent[0].category_id}
              AND c.is_active = true

            UNION ALL

            -- Recursive children
            SELECT
              c.category_id,
              c.category_name,
              c.account_number,
              c.parent_id,
              ct.depth + 1
            FROM landscape.core_unit_cost_category c
            INNER JOIN category_tree ct ON c.parent_id = ct.category_id
            WHERE c.is_active = true
              AND ct.depth < 5
          )
          SELECT
            ct.category_id,
            ct.category_name,
            ct.account_number,
            ct.parent_id,
            EXISTS (
              SELECT 1 FROM landscape.core_unit_cost_category child
              WHERE child.parent_id = ct.category_id AND child.is_active = true
            ) as has_children
          FROM category_tree ct
          ORDER BY ct.account_number
        `;
      } else {
        // Fallback: get all categories starting with the prefix
        categories = await sql<OpexCategory[]>`
          SELECT
            c.category_id,
            c.category_name,
            c.account_number,
            c.parent_id,
            EXISTS (
              SELECT 1 FROM landscape.core_unit_cost_category child
              WHERE child.parent_id = c.category_id AND child.is_active = true
            ) as has_children
          FROM landscape.core_unit_cost_category c
          WHERE c.account_number LIKE ${accountPrefix + '%'}
            AND c.is_active = true
          ORDER BY c.account_number
        `;
      }
    } else {
      // Get all Operations categories (4xxx range)
      if (includeHasChildren) {
        categories = await sql<OpexCategory[]>`
          SELECT
            c.category_id,
            c.category_name,
            c.account_number,
            c.parent_id,
            p.category_name as parent_name,
            EXISTS (
              SELECT 1 FROM landscape.core_unit_cost_category child
              WHERE child.parent_id = c.category_id AND child.is_active = true
            ) as has_children
          FROM landscape.core_unit_cost_category c
          LEFT JOIN landscape.core_unit_cost_category p ON c.parent_id = p.category_id
          WHERE c.account_number LIKE '4%'
            AND c.is_active = true
          ORDER BY c.account_number
        `;
      } else {
        categories = await sql<OpexCategory[]>`
          SELECT category_id, category_name, account_number, parent_id
          FROM landscape.core_unit_cost_category
          WHERE account_number LIKE '4%'
            AND is_active = true
          ORDER BY account_number
        `;
      }
    }

    if (flat) {
      return NextResponse.json(categories);
    }

    // Build hierarchical tree structure
    const tree = buildCategoryTree(categories);
    return NextResponse.json(tree);
  } catch (error) {
    console.error('Error fetching OpEx categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

interface CategoryNode extends OpexCategory {
  children: CategoryNode[];
}

function buildCategoryTree(categories: OpexCategory[]): CategoryNode[] {
  const categoryMap = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];

  // First pass: create all nodes
  for (const cat of categories) {
    categoryMap.set(cat.category_id, { ...cat, children: [] });
  }

  // Second pass: build tree structure
  for (const cat of categories) {
    const node = categoryMap.get(cat.category_id)!;
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      categoryMap.get(cat.parent_id)!.children.push(node);
    } else {
      // Root node (parent not in 4xxx range or null)
      roots.push(node);
    }
  }

  return roots;
}
