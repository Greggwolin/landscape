// Hook to fetch Unit Cost Categories for Budget dropdown population
// Maps lifecycle stages to Stage dropdown and categories to Category dropdown
// v1.0 · 2025-11-10

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface UnitCostCategory {
  category_id: number;
  parent: number | null; // Note: API returns 'parent' not 'parent_id'
  parent_name: string | null;
  category_name: string;
  activitys: string[];
  tags: string[];
  sort_order: number;
  is_active: boolean;
  item_count: number;
}

export interface StageOption {
  id: string; // lifecycle stage code (e.g., 'Acquisition', 'Development')
  name: string; // display name
  code: string;
  sortOrder: number;
  categoryCount: number;
}

export interface CategoryOption {
  category_id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
}

interface UseUnitCostCategoriesResult {
  stageOptions: StageOption[];
  categories: UnitCostCategory[];
  loading: boolean;
  error: Error | null;
  getChildren: (parentId: number | null) => CategoryOption[];
  getCategoriesByStage: (activity: string) => CategoryOption[];
  getCategoryById: (id: number | null | undefined) => UnitCostCategory | null;
}

const LIFECYCLE_STAGES = [
  { code: 'Acquisition', name: 'Acquisition', sortOrder: 1 },
  { code: 'Development', name: 'Development', sortOrder: 2 },
  { code: 'Operations', name: 'Operations', sortOrder: 3 },
  { code: 'Disposition', name: 'Disposition', sortOrder: 4 },
  { code: 'Financing', name: 'Financing', sortOrder: 5 },
];

export function useUnitCostCategoriesForBudget(projectTypeCode?: string): UseUnitCostCategoriesResult {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['unit-cost-categories-for-budget', projectTypeCode],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectTypeCode) {
        params.set('project_type_code', projectTypeCode);
      }

      const response = await fetch(`/api/unit-costs/categories?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load unit cost categories');
      }
      const json = await response.json();
      return (json.categories || []) as UnitCostCategory[];
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const categories = data || [];

  // Build a map for fast lookups
  const categoryById = useMemo(() => {
    const map = new Map<number, UnitCostCategory>();
    categories.forEach((category) => {
      map.set(category.category_id, category);
    });
    return map;
  }, [categories]);

  // Group categories by parent
  const childrenByParent = useMemo(() => {
    const map = new Map<number, CategoryOption[]>();
    categories.forEach((category) => {
      const parentId = category.parent; // Changed from parent_id to parent
      if (parentId === null || parentId === undefined) {
        return;
      }
      const bucket = map.get(parentId) || [];
      bucket.push({
        category_id: category.category_id,
        name: category.category_name,
        parent_id: category.parent, // Changed from parent_id to parent
        sort_order: category.sort_order,
      });
      map.set(parentId, bucket);
    });

    // Sort each bucket
    map.forEach((bucket) => {
      bucket.sort((a, b) => {
        const orderDiff = a.sort_order - b.sort_order;
        if (orderDiff !== 0) return orderDiff;
        return a.name.localeCompare(b.name);
      });
    });

    return map;
  }, [categories]);

  // Build stage options from lifecycle stages with category counts
  const stageOptions = useMemo<StageOption[]>(() => {
    return LIFECYCLE_STAGES.map((stage) => {
      // Count top-level categories for this lifecycle stage
      const stageCategories = categories.filter(
        (cat) => cat.activitys.includes(stage.code) && !cat.parent // Changed from parent_id to parent
      );

      return {
        id: stage.code,
        name: stage.name,
        code: stage.code,
        sortOrder: stage.sortOrder,
        categoryCount: stageCategories.length,
      };
    }).filter(stage => stage.categoryCount > 0); // Only show stages that have categories
  }, [categories]);

  const getCategoriesByStage = useCallback(
    (activity: string): CategoryOption[] => {
      if (!activity) return [];

      console.log('[getCategoriesByStage] Looking for stage:', activity);
      console.log('[getCategoriesByStage] Total categories:', categories.length);

      // Get top-level categories for this lifecycle stage
      const stageCategories = categories
        .filter((cat) => {
          const hasStage = cat.activitys.includes(activity);
          const isTopLevel = !cat.parent;
          console.log(`  - ${cat.category_name}: hasStage=${hasStage}, isTopLevel=${isTopLevel}, parent=${cat.parent}`);
          return hasStage && isTopLevel;
        })
        .map((cat) => ({
          category_id: cat.category_id,
          name: cat.category_name,
          parent_id: cat.parent, // Changed from parent_id to parent
          sort_order: cat.sort_order,
        }))
        .sort((a, b) => {
          const orderDiff = a.sort_order - b.sort_order;
          if (orderDiff !== 0) return orderDiff;
          return a.name.localeCompare(b.name);
        });

      console.log('[getCategoriesByStage] Found', stageCategories.length, 'categories for', activity);
      return stageCategories;
    },
    [categories]
  );

  const getChildren = useCallback(
    (parentId: number | null): CategoryOption[] => {
      if (!parentId) return [];
      return childrenByParent.get(parentId) || [];
    },
    [childrenByParent]
  );

  const getCategoryById = useCallback(
    (id: number | null | undefined): UnitCostCategory | null => {
      if (!id) return null;
      return categoryById.get(id) || null;
    },
    [categoryById]
  );

  return {
    stageOptions,
    categories,
    loading: isLoading,
    error: error as Error | null,
    getChildren,
    getCategoriesByStage,
    getCategoryById,
  };
}
