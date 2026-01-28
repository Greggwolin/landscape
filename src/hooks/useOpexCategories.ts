import useSWR from 'swr';

export interface OpexCategory {
  category_id: number;
  category_name: string;
  account_number: string;
  parent_id: number | null;
  has_children?: boolean;
  parent_name?: string;
}

export interface OpexCategoryNode extends OpexCategory {
  children: OpexCategoryNode[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Fetch all OpEx categories (4xxx range) as a flat list
 */
export function useOpexCategories() {
  const { data, error, isLoading, mutate } = useSWR<OpexCategory[]>(
    '/api/lookups/opex-categories?flat=true',
    fetcher
  );

  return {
    categories: data || [],
    isLoading,
    error,
    mutate,
  };
}

/**
 * Fetch OpEx categories as a hierarchical tree
 */
export function useOpexCategoryTree() {
  const { data, error, isLoading, mutate } = useSWR<OpexCategoryNode[]>(
    '/api/lookups/opex-categories',
    fetcher
  );

  return {
    tree: data || [],
    isLoading,
    error,
    mutate,
  };
}

/**
 * Fetch only parent categories (e.g., 4100, 4200, 4300, etc.)
 * These are the top-level groupings for the operating statement
 */
export function useOpexParentCategories() {
  const { categories, isLoading, error, mutate } = useOpexCategories();

  // Parent categories have account numbers ending in 00 (except 4000 which is the root)
  const parentCategories = categories.filter((c) => {
    return (
      c.account_number.endsWith('00') &&
      c.account_number !== '4000' &&
      c.account_number.length === 4
    );
  });

  return {
    categories: parentCategories,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Fetch child categories for a specific parent
 */
export function useOpexChildCategories(parentId: number | null | undefined) {
  const shouldFetch = parentId != null;
  const { data, error, isLoading, mutate } = useSWR<OpexCategory[]>(
    shouldFetch ? `/api/lookups/opex-categories?parent_id=${parentId}&flat=true&include_has_children=true` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    categories: data || [],
    isLoading: shouldFetch ? isLoading : false,
    error,
    mutate,
  };
}

/**
 * Fetch categories by parent_category string (legacy format).
 * Used when we have a string like 'taxes_insurance' and need matching categories.
 */
export function useOpexCategoriesByParent(parentCategory: string | null | undefined) {
  const shouldFetch = parentCategory != null && parentCategory !== '';
  const { data, error, isLoading, mutate } = useSWR<OpexCategory[]>(
    shouldFetch
      ? `/api/lookups/opex-categories?parent_category=${encodeURIComponent(parentCategory)}&flat=true`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    categories: data || [],
    isLoading: shouldFetch ? isLoading : false,
    error,
    mutate,
  };
}

/**
 * Get category by ID from the full list
 */
export function useCategoryById(categoryId: number | null) {
  const { categories, isLoading, error } = useOpexCategories();

  const category = categoryId
    ? categories.find((c) => c.category_id === categoryId) || null
    : null;

  return {
    category,
    isLoading,
    error,
  };
}

/**
 * Map legacy parent_category strings to 4xxx parent category IDs
 * Used for backwards compatibility during migration
 */
export const LEGACY_PARENT_CATEGORY_MAP: Record<string, string> = {
  taxes_insurance: '4100',
  utilities: '4200',
  repairs_maintenance: '4300',
  administrative: '4400',
  management: '4400',
  marketing: '4500',
  payroll_personnel: '4550',
  other: '4000',
  other_expenses: '4000',
  unclassified: '4000',
};

/**
 * Get the account number for a legacy parent_category string
 */
export function getLegacyParentAccountNumber(
  legacyParentCategory: string
): string {
  return LEGACY_PARENT_CATEGORY_MAP[legacyParentCategory] || '4000';
}

/**
 * Create a new subcategory under a parent.
 * Used when users type a custom expense name in the inline editor.
 */
export async function createOpexSubcategory(
  categoryName: string,
  parentId: number
): Promise<OpexCategory> {
  const response = await fetch('/api/admin/unit-cost-categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category_name: categoryName,
      parent_id: parentId,
      is_active: true
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create category');
  }

  const result = await response.json();
  return result.category;
}

/**
 * Update an operating expense row.
 * Used for inline editing of expense items.
 */
export async function updateOpexRow(
  projectId: number,
  opexId: number,
  updates: Partial<{
    category_id: number;
    unit_amount: number | null;
    annual_amount: number | null;
    expense_category: string;
    parent_category: string;
  }>
): Promise<{ success: boolean; expense: Record<string, unknown> }> {
  const response = await fetch(`/api/projects/${projectId}/opex/${opexId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update expense');
  }

  return response.json();
}
