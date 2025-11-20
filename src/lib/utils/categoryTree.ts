/**
 * Category tree utilities for hierarchical display
 */

export interface CategoryNode {
  category_id: number;
  parent_id: number | null;
  parent_name?: string | null;
  category_name: string;
  activitys: string[];
  tags: string[];
  sort_order: number;
  is_active: boolean;
  item_count: number;
  children?: CategoryNode[];
  depth?: number;
}

/**
 * Build a tree structure from flat category array
 */
export function buildCategoryTree(categories: CategoryNode[]): CategoryNode[] {
  // Create a map for quick lookup
  const categoryMap = new Map<number, CategoryNode>();
  const rootCategories: CategoryNode[] = [];

  // First pass: create map and add children arrays
  categories.forEach((cat) => {
    categoryMap.set(cat.category_id, { ...cat, children: [], depth: 0 });
  });

  // Second pass: build tree structure
  categories.forEach((cat) => {
    const node = categoryMap.get(cat.category_id);
    if (!node) return;

    if (cat.parent_id === null) {
      // Root level category
      rootCategories.push(node);
    } else {
      // Child category - add to parent's children
      const parent = categoryMap.get(cat.parent_id);
      if (parent) {
        node.depth = (parent.depth ?? 0) + 1;
        parent.children?.push(node);
      } else {
        // Parent not found - treat as root (orphaned)
        console.warn(`Category ${cat.category_id} has invalid parent_id ${cat.parent_id}`);
        rootCategories.push(node);
      }
    }
  });

  // Sort children recursively by sort_order, then name
  const sortChildren = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.category_name.localeCompare(b.category_name);
    });
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        sortChildren(node.children);
      }
    });
  };

  sortChildren(rootCategories);
  return rootCategories;
}

/**
 * Flatten tree back to array (depth-first order)
 */
export function flattenCategoryTree(tree: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = [];

  const traverse = (nodes: CategoryNode[]) => {
    nodes.forEach((node) => {
      result.push(node);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    });
  };

  traverse(tree);
  return result;
}

/**
 * Get all descendant category IDs for a given category
 */
export function getDescendantIds(categoryId: number, categories: CategoryNode[]): number[] {
  const categoryMap = new Map<number, CategoryNode>();
  categories.forEach((cat) => categoryMap.set(cat.category_id, cat));

  const descendants: number[] = [];

  const collectDescendants = (id: number) => {
    categories.forEach((cat) => {
      if (cat.parent_id === id) {
        descendants.push(cat.category_id);
        collectDescendants(cat.category_id);
      }
    });
  };

  collectDescendants(categoryId);
  return descendants;
}

/**
 * Get breadcrumb path for a category
 */
export function getCategoryPath(categoryId: number, categories: CategoryNode[]): string[] {
  const categoryMap = new Map<number, CategoryNode>();
  categories.forEach((cat) => categoryMap.set(cat.category_id, cat));

  const path: string[] = [];
  let current = categoryMap.get(categoryId);

  while (current) {
    path.unshift(current.category_name);
    if (current.parent_id === null) break;
    current = categoryMap.get(current.parent_id);
  }

  return path;
}
