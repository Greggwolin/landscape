import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BudgetCategory } from '@/types/budget-categories';

export interface StageOption {
  id: number;
  name: string;
  code: string;
  sortOrder: number;
  categoryCount: number;
}

interface UseBudgetStageCategoriesResult {
  stageOptions: StageOption[];
  categories: BudgetCategory[];
  loading: boolean;
  error: Error | null;
  getChildren: (parentId: number | null) => BudgetCategory[];
  getCategoryById: (id: number | null | undefined) => BudgetCategory | null;
  getStageIdForCategory: (categoryId: number | null | undefined) => number | null;
}

export function useBudgetStageCategories(projectId: number): UseBudgetStageCategoriesResult {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['budget-stage-categories', projectId],
    queryFn: async () => {
      const url = new URLSearchParams({ project_id: projectId.toString() });
      const response = await fetch(`/api/budget/categories?${url.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load budget categories');
      }
      const json = await response.json();
      return (json.categories || []) as BudgetCategory[];
    },
    enabled: Boolean(projectId),
    staleTime: 5 * 60 * 1000,
  });

  const categories = data || [];

  const categoryById = useMemo(() => {
    const map = new Map<number, BudgetCategory>();
    categories.forEach((category) => {
      map.set(category.category_id, category);
    });
    return map;
  }, [categories]);

  const childrenByParent = useMemo(() => {
    const map = new Map<number, BudgetCategory[]>();
    categories.forEach((category) => {
      const parentId = category.parent_id;
      if (parentId === null || parentId === undefined) {
        return;
      }
      const bucket = map.get(parentId) || [];
      bucket.push(category);
      map.set(parentId, bucket);
    });

    map.forEach((bucket) => {
      bucket.sort((a, b) => {
        const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return a.name.localeCompare(b.name);
      });
    });

    return map;
  }, [categories]);

  const stageOptions = useMemo<StageOption[]>(() => {
    return categories
      .filter((category) => category.level === 1)
      .sort((a, b) => {
        const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return a.name.localeCompare(b.name);
      })
      .map((stage) => ({
        id: stage.category_id,
        name: stage.name,
        code: stage.code,
        sortOrder: stage.sort_order ?? 0,
        categoryCount: childrenByParent.get(stage.category_id)?.length ?? 0,
      }));
  }, [categories, childrenByParent]);

  const getStageIdForCategory = useCallback(
    (categoryId: number | null | undefined): number | null => {
      if (!categoryId) return null;
      let current = categoryById.get(categoryId) || null;
      if (!current) return null;
      if (current.level === 1) {
        return current.category_id;
      }
      while (current?.parent_id) {
        const parent = categoryById.get(current.parent_id);
        if (!parent) break;
        if (parent.level === 1) {
          return parent.category_id;
        }
        current = parent;
      }
      return null;
    },
    [categoryById]
  );

  const getChildren = useCallback(
    (parentId: number | null): BudgetCategory[] => {
      if (!parentId) return [];
      return childrenByParent.get(parentId) || [];
    },
    [childrenByParent]
  );

  const getCategoryById = useCallback(
    (id: number | null | undefined): BudgetCategory | null => {
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
    getCategoryById,
    getStageIdForCategory,
  };
}
