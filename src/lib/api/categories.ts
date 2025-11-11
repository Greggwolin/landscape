/**
 * API Helper Functions for Unit Cost Category Taxonomy Management
 */

import type {
  UnitCostCategoryReference,
  UnitCostCategoryHierarchy,
  CategoryTag,
  LifecycleStage,
} from '@/types/benchmarks';

const API_BASE = '/api/unit-costs';

// =============================================================================
// CATEGORY API FUNCTIONS
// =============================================================================

export interface FetchCategoriesParams {
  lifecycle_stage?: LifecycleStage;
  tag?: string;
  parent?: number | 'null';
  project_type_code?: string;
}

export async function fetchCategories(
  params?: FetchCategoriesParams
): Promise<UnitCostCategoryReference[]> {
  const queryParams = new URLSearchParams();
  if (params?.lifecycle_stage) queryParams.set('lifecycle_stage', params.lifecycle_stage);
  if (params?.tag) queryParams.set('tag', params.tag);
  if (params?.parent !== undefined) queryParams.set('parent', String(params.parent));
  if (params?.project_type_code) queryParams.set('project_type_code', params.project_type_code);

  const url = `${API_BASE}/categories/${queryParams.toString() ? `?${queryParams}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`);
  }

  const data = await response.json();
  // Django REST framework returns {count, next, previous, results}
  return data.results || data.categories || [];
}

export interface CreateCategoryData {
  category_name: string;
  lifecycle_stages: LifecycleStage[]; // Categories can belong to multiple lifecycle stages
  tags: string[];
  parent?: number | null;
  sort_order?: number;
}

export async function createCategory(
  data: CreateCategoryData
): Promise<UnitCostCategoryReference> {
  const response = await fetch(`${API_BASE}/categories/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to create category: ${response.statusText}`);
  }

  return await response.json();
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  is_active?: boolean;
}

export async function updateCategory(
  categoryId: number,
  data: UpdateCategoryData
): Promise<UnitCostCategoryReference> {
  const response = await fetch(`${API_BASE}/categories/${categoryId}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update category: ${response.statusText}`);
  }

  return await response.json();
}

export async function deleteCategory(categoryId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/categories/${categoryId}/`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to delete category: ${response.statusText}`);
  }
}

export async function addTagToCategory(categoryId: number, tagName: string): Promise<void> {
  // For now, use PUT to update the category with new tags array
  // This is a simplified approach until Django backend implements dedicated endpoints
  const response = await fetch(`${API_BASE}/categories/${categoryId}/add-tag/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_name: tagName }),
  });

  if (!response.ok) {
    throw new Error(`Failed to add tag: ${response.statusText}`);
  }
}

export async function removeTagFromCategory(categoryId: number, tagName: string): Promise<void> {
  // For now, use PUT to update the category with modified tags array
  // This is a simplified approach until Django backend implements dedicated endpoints
  const response = await fetch(`${API_BASE}/categories/${categoryId}/remove-tag/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_name: tagName }),
  });

  if (!response.ok) {
    throw new Error(`Failed to remove tag: ${response.statusText}`);
  }
}

export interface CategoryDeletionImpact {
  category_id: number;
  category_name: string;
  child_categories: { category_id: number; category_name: string }[];
  item_count: number;  // Renamed from template_count in migration 0018
  project_usage_count?: number;
}

export async function getCategoryDeletionImpact(
  categoryId: number
): Promise<CategoryDeletionImpact> {
  const response = await fetch(`${API_BASE}/categories/${categoryId}/deletion-impact`);

  if (!response.ok) {
    throw new Error(`Failed to fetch deletion impact: ${response.statusText}`);
  }

  return await response.json();
}

// =============================================================================
// TAG API FUNCTIONS
// =============================================================================

export async function fetchTags(): Promise<CategoryTag[]> {
  try {
    const response = await fetch(`${API_BASE}/tags/`);

    if (!response.ok) {
      console.warn('Failed to fetch tags:', response.status, response.statusText);
      return []; // Return empty array instead of throwing error
    }

    const data = await response.json();
    // Django REST framework returns {count, next, previous, results}
    return data.results || data.tags || [];
  } catch (error) {
    console.error('Error fetching tags:', error);
    return []; // Return empty array on error to allow UI to load
  }
}

export interface CreateTagData {
  tag_name: string;
  tag_context: string;
  description?: string;
  display_order?: number;
}

export async function createTag(data: CreateTagData): Promise<CategoryTag> {
  const response = await fetch(`${API_BASE}/tags/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      is_system_default: false,
      is_active: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to create tag: ${response.statusText}`);
  }

  return await response.json();
}

// =============================================================================
// HIERARCHY BUILDER UTILITY
// =============================================================================

export function buildCategoryHierarchy(
  categories: UnitCostCategoryReference[]
): UnitCostCategoryHierarchy[] {
  const categoryMap = new Map<number, UnitCostCategoryHierarchy>();
  const rootCategories: UnitCostCategoryHierarchy[] = [];

  // Deduplicate categories by category_id (keep first occurrence)
  const uniqueCategories = Array.from(
    new Map(categories.map(cat => [cat.category_id, cat])).values()
  );

  // First pass: Create map of all categories
  uniqueCategories.forEach((cat) => {
    // Backward compatibility: handle old API returning lifecycle_stage (singular)
    const lifecycleStages = cat.lifecycle_stages ||
      ((cat as any).lifecycle_stage ? [(cat as any).lifecycle_stage] : []);

    categoryMap.set(cat.category_id, {
      category_id: cat.category_id,
      category_name: cat.category_name,
      lifecycle_stages: lifecycleStages,
      tags: cat.tags,
      sort_order: cat.sort_order,
      is_active: cat.is_active,
      children: [],
    });
  });

  // Second pass: Build hierarchy
  uniqueCategories.forEach((cat) => {
    const node = categoryMap.get(cat.category_id);
    if (!node) return;

    if (cat.parent) {
      const parent = categoryMap.get(cat.parent);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      rootCategories.push(node);
    }
  });

  // Sort children recursively
  const sortChildren = (nodes: UnitCostCategoryHierarchy[]) => {
    nodes.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.category_name.localeCompare(b.category_name);
    });
    nodes.forEach((node) => sortChildren(node.children));
  };

  sortChildren(rootCategories);

  return rootCategories;
}
