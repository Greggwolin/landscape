// Budget Categories Hook
// v1.0 · 2025-11-02

import { useState, useEffect, useCallback } from 'react';
import type {
  BudgetCategory,
  BudgetCategoryTreeNode,
  CategoryTreeResponse,
  CategorySelectionState,
  CategoryLevel,
} from '@/types/budget-categories';
import {
  validateCategoryHierarchy,
  buildCategoryTree,
  getVisibleCategoryLevels,
} from '@/types/budget-categories';

interface UseBudgetCategoriesOptions {
  projectId?: number;
  templateName?: string;
  projectTypeCode?: string;
  complexityMode?: 'basic' | 'standard' | 'detail';
  autoFetch?: boolean;
}

interface UseBudgetCategoriesReturn {
  // Data
  categories: BudgetCategory[];
  tree: BudgetCategoryTreeNode[];
  loading: boolean;
  error: string | null;

  // Selection state
  selection: CategorySelectionState;
  setSelection: (selection: Partial<CategorySelectionState>) => void;
  clearSelection: () => void;

  // Filtering
  visibleLevels: CategoryLevel[];
  getOptionsForLevel: (level: CategoryLevel) => BudgetCategory[];

  // Actions
  fetchCategories: () => Promise<void>;
  fetchTree: () => Promise<void>;
  createCategory: (data: Partial<BudgetCategory>) => Promise<BudgetCategory | null>;
  updateCategory: (id: number, data: Partial<BudgetCategory>) => Promise<BudgetCategory | null>;
  deleteCategory: (id: number) => Promise<boolean>;
  applyTemplate: (templateName: string, projectTypeCode: string, overwrite?: boolean) => Promise<boolean>;

  // Utilities
  getCategoryById: (id: number) => BudgetCategory | null;
  getCategoryPath: (categoryId: number) => string;
  isValidSelection: boolean;
}

export function useBudgetCategories(
  options: UseBudgetCategoriesOptions = {}
): UseBudgetCategoriesReturn {
  const {
    projectId,
    templateName,
    projectTypeCode,
    complexityMode = 'detail',
    autoFetch = true,
  } = options;

  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [tree, setTree] = useState<BudgetCategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection state for cascading dropdowns
  const [selection, setSelectionState] = useState<CategorySelectionState>({
    level_1: null,
    level_2: null,
    level_3: null,
    level_4: null,
    level_1_options: [],
    level_2_options: [],
    level_3_options: [],
    level_4_options: [],
    is_valid: true,
    errors: [],
  });

  // Visible levels based on complexity mode
  const visibleLevels = getVisibleCategoryLevels(complexityMode);

  /**
   * Fetch categories (flat list)
   */
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId.toString());
      if (templateName) params.append('template_name', templateName);
      if (projectTypeCode) params.append('project_type_code', projectTypeCode);

      const response = await fetch(`/api/budget/categories?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data = await response.json();
      setCategories(data.categories || []);

      // Update selection options
      updateSelectionOptions(data.categories || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, templateName, projectTypeCode]);

  /**
   * Fetch category tree (hierarchical)
   */
  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId.toString());
      if (templateName) params.append('template_name', templateName);
      if (projectTypeCode) params.append('project_type_code', projectTypeCode);

      const response = await fetch(`/api/budget/categories/tree?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch category tree');
      }

      const data: CategoryTreeResponse = await response.json();
      setTree(data.categories || []);

      // Flatten tree to categories array
      const flatCategories = flattenTree(data.categories || []);
      setCategories(flatCategories);
      updateSelectionOptions(flatCategories);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching category tree:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, templateName, projectTypeCode]);

  /**
   * Update selection options based on current categories and selections
   */
  const updateSelectionOptions = useCallback((cats: BudgetCategory[]) => {
    setSelectionState(prev => {
      // Level 1: All root categories
      const level_1_options = cats.filter(c => c.level === 1 && c.is_active);

      // Level 2: Children of selected Level 1
      const level_2_options = prev.level_1
        ? cats.filter(c => c.level === 2 && c.parent_id === prev.level_1 && c.is_active)
        : [];

      // Level 3: Children of selected Level 2
      const level_3_options = prev.level_2
        ? cats.filter(c => c.level === 3 && c.parent_id === prev.level_2 && c.is_active)
        : [];

      // Level 4: Children of selected Level 3
      const level_4_options = prev.level_3
        ? cats.filter(c => c.level === 4 && c.parent_id === prev.level_3 && c.is_active)
        : [];

      const newState = {
        ...prev,
        level_1_options,
        level_2_options,
        level_3_options,
        level_4_options,
      };

      // Validate
      const validation = validateCategoryHierarchy(newState);
      newState.is_valid = validation.is_valid;
      newState.errors = validation.errors;

      return newState;
    });
  }, []);

  /**
   * Set selection (partial update with cascading clear)
   */
  const setSelection = useCallback((partial: Partial<CategorySelectionState>) => {
    setSelectionState(prev => {
      const newState = { ...prev, ...partial };

      // Cascade clear: if parent changes, clear children
      if ('level_1' in partial && partial.level_1 !== prev.level_1) {
        newState.level_2 = null;
        newState.level_3 = null;
        newState.level_4 = null;
      }
      if ('level_2' in partial && partial.level_2 !== prev.level_2) {
        newState.level_3 = null;
        newState.level_4 = null;
      }
      if ('level_3' in partial && partial.level_3 !== prev.level_3) {
        newState.level_4 = null;
      }

      // Update options
      updateSelectionOptions(categories);

      return newState;
    });
  }, [categories, updateSelectionOptions]);

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    setSelectionState({
      level_1: null,
      level_2: null,
      level_3: null,
      level_4: null,
      level_1_options: categories.filter(c => c.level === 1),
      level_2_options: [],
      level_3_options: [],
      level_4_options: [],
      is_valid: true,
      errors: [],
    });
  }, [categories]);

  /**
   * Get options for a specific level (filtered by parent selection)
   */
  const getOptionsForLevel = useCallback((level: CategoryLevel): BudgetCategory[] => {
    switch (level) {
      case 1:
        return selection.level_1_options;
      case 2:
        return selection.level_2_options;
      case 3:
        return selection.level_3_options;
      case 4:
        return selection.level_4_options;
      default:
        return [];
    }
  }, [selection]);

  /**
   * Create new category
   */
  const createCategory = useCallback(async (data: Partial<BudgetCategory>): Promise<BudgetCategory | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/budget/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create category');
      }

      const result = await response.json();

      // Refresh categories
      await fetchCategories();

      return result.category;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error creating category:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  /**
   * Update category
   */
  const updateCategory = useCallback(async (
    id: number,
    data: Partial<BudgetCategory>
  ): Promise<BudgetCategory | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/budget/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update category');
      }

      const result = await response.json();

      // Refresh categories
      await fetchCategories();

      return result.category;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error updating category:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  /**
   * Delete category
   */
  const deleteCategory = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/budget/categories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Set error state but don't throw - return false instead
        setError(errorData.error || 'Failed to delete category');
        return false;
      }

      // Refresh categories
      await fetchCategories();

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error deleting category:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  /**
   * Apply template to project
   */
  const applyTemplate = useCallback(async (
    templateName: string,
    projectTypeCode: string,
    overwrite: boolean = false
  ): Promise<boolean> => {
    if (!projectId) {
      setError('Project ID is required to apply template');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/budget/category-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          template_name: templateName,
          project_type_code: projectTypeCode,
          overwrite_existing: overwrite,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to apply template');
      }

      // Refresh categories
      await fetchCategories();

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error applying template:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchCategories]);

  /**
   * Get category by ID
   */
  const getCategoryById = useCallback((id: number): BudgetCategory | null => {
    return categories.find(c => c.category_id === id) || null;
  }, [categories]);

  /**
   * Get category path (breadcrumb)
   */
  const getCategoryPath = useCallback((categoryId: number): string => {
    const category = getCategoryById(categoryId);
    if (!category) return '';

    const parts: string[] = [];
    let current: BudgetCategory | null = category;

    while (current) {
      parts.unshift(current.name);
      current = current.parent_id ? getCategoryById(current.parent_id) : null;
    }

    return parts.join(' > ');
  }, [getCategoryById]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchCategories();
    }
  }, [autoFetch, fetchCategories]);

  // Update selection options when categories change
  useEffect(() => {
    updateSelectionOptions(categories);
  }, [categories, updateSelectionOptions]);

  return {
    // Data
    categories,
    tree,
    loading,
    error,

    // Selection
    selection,
    setSelection,
    clearSelection,

    // Filtering
    visibleLevels,
    getOptionsForLevel,

    // Actions
    fetchCategories,
    fetchTree,
    createCategory,
    updateCategory,
    deleteCategory,
    applyTemplate,

    // Utilities
    getCategoryById,
    getCategoryPath,
    isValidSelection: selection.is_valid,
  };
}

/**
 * Helper: Flatten tree to array
 */
function flattenTree(nodes: BudgetCategoryTreeNode[]): BudgetCategory[] {
  const result: BudgetCategory[] = [];

  function traverse(node: BudgetCategoryTreeNode) {
    result.push(node);
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => traverse(child));
    }
  }

  nodes.forEach(node => traverse(node));
  return result;
}
