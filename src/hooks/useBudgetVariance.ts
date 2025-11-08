// Budget Variance Hook - Fetch and cache variance data
// v1.0 · 2025-11-03

import { useQuery } from '@tanstack/react-query';

export interface CategoryVariance {
  category_id: number;
  category_level: number;
  category_name: string;
  category_breadcrumb: string;
  parent_amount: number;
  children_amount: number;
  variance_amount: number;
  variance_pct: number | null;
  is_reconciled: boolean;
  has_children: boolean;
  child_categories: number[];
}

export interface VarianceSummary {
  project_id: number;
  project_name: string;
  total_categories: number;
  categories_with_variance: number;
  total_variance_amount: number;
  variances: CategoryVariance[];
}

/**
 * Fetch variance data for a project
 *
 * Caches for 30 seconds to avoid excessive API calls
 *
 * @param projectId - The project ID
 * @param minVariancePct - Minimum variance percentage to include (default: 0 to get all)
 * @param enabled - Whether to enable the query (default: true)
 */
export function useBudgetVariance(
  projectId: number | undefined,
  minVariancePct: number = 0,
  enabled: boolean = true
) {
  return useQuery<VarianceSummary>({
    queryKey: ['budget-variance', projectId, minVariancePct],
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const params = new URLSearchParams({
        min_variance_pct: minVariancePct.toString(),
      });

      const response = await fetch(
        `/api/budget/variance/${projectId}/?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch variance data');
      }

      return response.json();
    },
    enabled: enabled && !!projectId,
    staleTime: 30000, // 30 seconds - as specified in requirements
    refetchOnWindowFocus: false,
  });
}

/**
 * Get variance for a specific category
 *
 * @param categoryId - The category ID
 * @param categoryLevel - The category level (1-4)
 * @param variances - Array of all variances (from useBudgetVariance)
 * @returns CategoryVariance or undefined
 */
export function getCategoryVariance(
  categoryId: number,
  categoryLevel: number,
  variances: CategoryVariance[] | undefined
): CategoryVariance | undefined {
  if (!variances) return undefined;

  return variances.find(
    (v) => v.category_id === categoryId && v.category_level === categoryLevel
  );
}

/**
 * Format variance amount with color coding
 *
 * @param variance - The variance object
 * @returns Object with formatted text and color class
 */
export function formatVariance(variance: CategoryVariance | undefined): {
  text: string;
  colorClass: string;
  title: string;
} {
  if (!variance) {
    return {
      text: '-',
      colorClass: 'text-muted',
      title: 'No variance data available',
    };
  }

  if (!variance.has_children) {
    return {
      text: 'N/A',
      colorClass: 'text-muted',
      title: 'No child categories to compare',
    };
  }

  const amount = variance.variance_amount;
  const pct = variance.variance_pct;

  // Format amount
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  // Format percentage
  const formattedPct = pct !== null ? `${Math.abs(pct).toFixed(1)}%` : '';

  // Determine color and prefix
  let colorClass = 'text-muted';
  let prefix = '';

  if (variance.is_reconciled) {
    colorClass = 'text-success';
    prefix = amount >= 0 ? '+' : '-';
  } else if (amount > 0) {
    colorClass = 'text-warning';
    prefix = '+';
  } else if (amount < 0) {
    colorClass = 'text-danger';
    prefix = '-';
  }

  const text = formattedPct
    ? `${prefix}${formattedAmount} (${formattedPct})`
    : `${prefix}${formattedAmount}`;

  const title = variance.is_reconciled
    ? `Reconciled: ${text}`
    : `Variance: Parent ($${variance.parent_amount.toLocaleString()}) - Children ($${variance.children_amount.toLocaleString()}) = ${text}`;

  return {
    text,
    colorClass,
    title,
  };
}
