// Budget Grouping Hook - Hierarchical category grouping with subtotals
// v1.0 · 2025-11-03

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { BudgetItem } from '@/components/budget/ColumnDefinitions';

export interface GroupedRow {
  row_type: 'parent' | 'item';
  // For parent rows
  category_level?: number;
  category_id?: number;
  parent_category_id?: number | null;
  category_name?: string;
  category_breadcrumb?: string;
  category_full_breadcrumb?: string;
  category_path_ids?: number[];
  category_path_names?: string[];
  amount_subtotal?: number;
  child_count?: number;
  descendant_depth?: number; // How many levels of descendants this category has
  // For item rows (original BudgetItem)
  item?: BudgetItem;
}

interface CategoryGroup {
  category_id: number;
  category_name: string;
  level: number;
  parent_category_id: number | null;
  breadcrumb: string;
  items: BudgetItem[];
  children: Map<number, CategoryGroup>;
}

export function useBudgetGrouping(projectId: number) {
  const [isGrouped, setIsGrouped] = useState<boolean>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`budget_grouping_${projectId}`);
      return stored === 'true';
    }
    return false;
  });

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`budget_expanded_${projectId}`);
      if (stored) {
        try {
          const arr = JSON.parse(stored);
          return new Set(arr);
        } catch {
          return new Set();
        }
      }
    }
    return new Set();
  });

  // Persist grouping state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`budget_grouping_${projectId}`, String(isGrouped));
    }
  }, [isGrouped, projectId]);

  // Persist expanded categories
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `budget_expanded_${projectId}`,
        JSON.stringify(Array.from(expandedCategories))
      );
    }
  }, [expandedCategories, projectId]);

  const toggleGrouping = useCallback(() => {
    setIsGrouped(prev => !prev);
  }, []);

  const toggleCategory = useCallback((categoryKey: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback((categoryKeys: string[]) => {
    setExpandedCategories(new Set(categoryKeys));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  /**
   * Build category breadcrumb path
   * @param item - The budget item
   * @param excludeL1 - Whether to exclude L1 from the breadcrumb (for child parent rows)
   */
  const buildBreadcrumb = useCallback((item: BudgetItem, excludeL1: boolean = false): string => {
    const parts: string[] = [];
    if (!excludeL1 && item.category_l1_name) parts.push(item.category_l1_name);
    if (item.category_l2_name) parts.push(item.category_l2_name);
    if (item.category_l3_name) parts.push(item.category_l3_name);
    if (item.category_l4_name) parts.push(item.category_l4_name);
    return parts.join(' → ');
  }, []);

  /**
   * Get category ID at a specific level
   */
  const getCategoryIdAtLevel = useCallback((item: BudgetItem, level: number): number | null => {
    switch (level) {
      case 1: return item.category_l1_id || null;
      case 2: return item.category_l2_id || null;
      case 3: return item.category_l3_id || null;
      case 4: return item.category_l4_id || null;
      default: return null;
    }
  }, []);

  /**
   * Get category name at a specific level
   */
  const getCategoryNameAtLevel = useCallback((item: BudgetItem, level: number): string | null => {
    switch (level) {
      case 1: return item.category_l1_name || null;
      case 2: return item.category_l2_name || null;
      case 3: return item.category_l3_name || null;
      case 4: return item.category_l4_name || null;
      default: return null;
    }
  }, []);

  /**
   * Build hierarchical category tree
   */
  const buildCategoryTree = useCallback((items: BudgetItem[]): Map<number, CategoryGroup> => {
    const rootGroups = new Map<number, CategoryGroup>();
    const UNCATEGORIZED_ID = -1; // Special ID for uncategorized items

    // First pass: group by L1
    items.forEach(item => {
      const l1Id = item.category_l1_id;
      const l1Name = item.category_l1_name;

      // If no category, add to "Uncategorized" group
      if (!l1Id || !l1Name) {
        if (!rootGroups.has(UNCATEGORIZED_ID)) {
          rootGroups.set(UNCATEGORIZED_ID, {
            category_id: UNCATEGORIZED_ID,
            category_name: '(Uncategorized)',
            level: 1,
            parent_category_id: null,
            breadcrumb: '(Uncategorized)',
            items: [],
            children: new Map(),
          });
        }
        rootGroups.get(UNCATEGORIZED_ID)!.items.push(item);
        return;
      }

      if (!rootGroups.has(l1Id)) {
        rootGroups.set(l1Id, {
          category_id: l1Id,
          category_name: l1Name,
          level: 1,
          parent_category_id: null,
          breadcrumb: l1Name,
          items: [],
          children: new Map(),
        });
      }

      const l1Group = rootGroups.get(l1Id)!;

      // Check for L2
      const l2Id = item.category_l2_id;
      const l2Name = item.category_l2_name;

      if (!l2Id || !l2Name) {
        // Item belongs directly to L1
        l1Group.items.push(item);
        return;
      }

      // Has L2, create or get L2 group
      if (!l1Group.children.has(l2Id)) {
        l1Group.children.set(l2Id, {
          category_id: l2Id,
          category_name: l2Name,
          level: 2,
          parent_category_id: l1Id,
          breadcrumb: `${l1Name} → ${l2Name}`,
          items: [],
          children: new Map(),
        });
      }

      const l2Group = l1Group.children.get(l2Id)!;

      // Check for L3
      const l3Id = item.category_l3_id;
      const l3Name = item.category_l3_name;

      if (!l3Id || !l3Name) {
        // Item belongs directly to L2
        l2Group.items.push(item);
        return;
      }

      // Has L3, create or get L3 group
      if (!l2Group.children.has(l3Id)) {
        l2Group.children.set(l3Id, {
          category_id: l3Id,
          category_name: l3Name,
          level: 3,
          parent_category_id: l2Id,
          breadcrumb: `${l1Name} → ${l2Name} → ${l3Name}`,
          items: [],
          children: new Map(),
        });
      }

      const l3Group = l2Group.children.get(l3Id)!;

      // Check for L4
      const l4Id = item.category_l4_id;
      const l4Name = item.category_l4_name;

      if (!l4Id || !l4Name) {
        // Item belongs directly to L3
        l3Group.items.push(item);
        return;
      }

      // Has L4, create or get L4 group
      if (!l3Group.children.has(l4Id)) {
        l3Group.children.set(l4Id, {
          category_id: l4Id,
          category_name: l4Name,
          level: 4,
          parent_category_id: l3Id,
          breadcrumb: `${l1Name} → ${l2Name} → ${l3Name} → ${l4Name}`,
          items: [],
          children: new Map(),
        });
      }

      const l4Group = l3Group.children.get(l4Id)!;
      l4Group.items.push(item);
    });

    return rootGroups;
  }, []);

  /**
   * Calculate subtotal for a category group (recursive)
   */
  const calculateSubtotal = useCallback((group: CategoryGroup): number => {
    // Sum direct items
    let subtotal = group.items.reduce((sum, item) => sum + (item.amount || 0), 0);

    // Add children subtotals
    group.children.forEach(childGroup => {
      subtotal += calculateSubtotal(childGroup);
    });

    return subtotal;
  }, []);

  /**
   * Count total items in group (recursive)
   */
  const countItems = useCallback((group: CategoryGroup): number => {
    let count = group.items.length;
    group.children.forEach(childGroup => {
      count += countItems(childGroup);
    });
    return count;
  }, []);

  /**
   * Get maximum descendant depth for a category group
   * Returns the number of levels of descendants (0 if no children)
   */
  const getMaxDescendantDepth = useCallback((group: CategoryGroup): number => {
    if (group.children.size === 0) {
      return 0;
    }

    let maxDepth = 0;
    group.children.forEach(childGroup => {
      const childDepth = 1 + getMaxDescendantDepth(childGroup);
      maxDepth = Math.max(maxDepth, childDepth);
    });

    return maxDepth;
  }, []);

  /**
   * Generate unique key for category
   */
  const getCategoryKey = useCallback((level: number, categoryId: number): string => {
    return `L${level}_${categoryId}`;
  }, []);

  /**
   * Flatten tree to array of GroupedRow with expand/collapse logic
   * Only include parent rows that have DIRECT items (not just children with items)
   */
  const flattenTree = useCallback((
    groups: Map<number, CategoryGroup>,
    depth: number = 0,
    parentPathIds: number[] = [],
    parentPathNames: string[] = []
  ): GroupedRow[] => {
    const result: GroupedRow[] = [];

    groups.forEach(group => {
      const hasDirectItems = group.items.length > 0;
      const totalItems = countItems(group);
      const currentPathIds = [...parentPathIds, group.category_id];
      const currentPathNames = [...parentPathNames, group.category_name];

      // Only include parent row if it has direct items
      if (!hasDirectItems) {
        // Skip this level, but recurse to children
        if (group.children.size > 0) {
          result.push(...flattenTree(group.children, depth, currentPathIds, currentPathNames));
        }
        return;
      }

      const categoryKey = getCategoryKey(group.level, group.category_id);
      const isExpanded = expandedCategories.has(categoryKey);
      const descendantDepth = getMaxDescendantDepth(group);

      const fullBreadcrumb = currentPathNames.join(' → ');
      const displayBreadcrumb = group.level > 1
        ? currentPathNames.slice(1).join(' → ')
        : currentPathNames[0];

      // Add parent row
      result.push({
        row_type: 'parent',
        category_level: group.level,
        category_id: group.category_id,
        parent_category_id: group.parent_category_id ?? null,
        category_name: group.category_name,
        category_breadcrumb: displayBreadcrumb,
        category_full_breadcrumb: fullBreadcrumb,
        category_path_ids: currentPathIds,
        category_path_names: currentPathNames,
        amount_subtotal: calculateSubtotal(group),
        child_count: totalItems,
        descendant_depth: descendantDepth,
      });

      // Add children if expanded
      if (isExpanded) {
        // Add direct items
        group.items.forEach(item => {
          result.push({
            row_type: 'item',
            item,
          });
        });

        // Add child groups (recursive)
        if (group.children.size > 0) {
          result.push(...flattenTree(group.children, depth + 1, currentPathIds, currentPathNames));
        }
      }
    });

    return result;
  }, [expandedCategories, calculateSubtotal, countItems, getCategoryKey, getMaxDescendantDepth]);

  return {
    isGrouped,
    toggleGrouping,
    expandedCategories,
    toggleCategory,
    expandAll,
    collapseAll,
    buildCategoryTree,
    flattenTree,
    getCategoryKey,
  };
}
