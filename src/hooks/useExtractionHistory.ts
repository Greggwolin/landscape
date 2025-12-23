'use client';

import useSWR from 'swr';

/**
 * Extraction categories for filter pills
 */
export type ExtractionCategory =
  | 'project'
  | 'physical'
  | 'pricing'
  | 'income'
  | 'expenses'
  | 'market'
  | 'debt'
  | 'other';

/**
 * Category configuration for UI display
 */
export const CATEGORY_CONFIG: Record<
  ExtractionCategory,
  { label: string; color: string; description: string }
> = {
  project: {
    label: 'Project',
    color: '#3B82F6', // Blue
    description: 'Name, address, city, county, state, APN, zoning, year built',
  },
  physical: {
    label: 'Physical',
    color: '#22C55E', // Green
    description: 'Units, SF, stories, parking, condition, amenities',
  },
  pricing: {
    label: 'Pricing',
    color: '#A855F7', // Purple
    description: 'Purchase price, cap rate, $/unit, $/SF, asking price',
  },
  income: {
    label: 'Income',
    color: '#14B8A6', // Teal
    description: 'GPR, vacancy, concessions, other income, rent roll items',
  },
  expenses: {
    label: 'Expenses',
    color: '#F97316', // Orange
    description: 'OPEX categories, T-12 line items, property tax, insurance',
  },
  market: {
    label: 'Market',
    color: '#EC4899', // Pink
    description: 'Demographics, comps, absorption, submarket, competition',
  },
  debt: {
    label: 'Debt',
    color: '#EF4444', // Red
    description: 'Loan amount, LTV, DSCR, interest rate, loan term, lender',
  },
  other: {
    label: 'Other',
    color: '#6B7280', // Gray
    description: 'Miscellaneous extracted fields',
  },
};

/**
 * Single extraction record
 */
export interface ExtractionRecord {
  extraction_id: number;
  doc_id: number | null;
  doc_name: string | null;
  field_key: string;
  field_label: string;
  target_table: string;
  target_field: string | null;
  extracted_value: unknown;
  validated_value: unknown | null;
  formatted_value: string | null;
  extraction_type: string;
  source_text: string | null;
  source_snippet: string | null;
  source_page: number | null;
  confidence_score: number | null;
  confidence_percent: number | null;
  confidence_label: 'High' | 'Medium' | 'Low' | 'Review' | null;
  status: 'pending' | 'accepted' | 'rejected' | 'applied' | 'conflict';
  category: ExtractionCategory;
  scope: string | null;
  scope_label: string | null;
  validated_by: string | null;
  validated_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  created_by: string | null;
}

/**
 * Category counts for filter pills
 */
export type CategoryCounts = Record<ExtractionCategory, number>;

/**
 * API response shape
 */
interface ExtractionHistoryResponse {
  success: boolean;
  project_id: number;
  extractions: ExtractionRecord[];
  category_counts: CategoryCounts;
  total: number;
}

/**
 * Field history response shape
 */
interface FieldHistoryResponse {
  success: boolean;
  project_id: number;
  field_key: string;
  field_label: string;
  category: ExtractionCategory;
  current: ExtractionRecord | null;
  history: ExtractionRecord[];
  total_versions: number;
}

/**
 * Hook options
 */
interface UseExtractionHistoryOptions {
  categories?: ExtractionCategory[];
  status?: 'all' | 'pending' | 'accepted' | 'rejected' | 'applied';
  sort?: 'created_at' | 'field_key' | 'confidence_score' | 'status';
  order?: 'asc' | 'desc';
  refreshInterval?: number;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch extraction history');
  }
  return res.json();
};

/**
 * Hook to fetch extraction history for a project
 */
export function useExtractionHistory(
  projectId: number | null,
  options: UseExtractionHistoryOptions = {}
) {
  const {
    categories,
    status = 'all',
    sort = 'created_at',
    order = 'desc',
    refreshInterval = 30000,
  } = options;

  // Build query string
  const params = new URLSearchParams();
  if (categories && categories.length > 0) {
    params.set('category', categories.join(','));
  }
  if (status && status !== 'all') {
    params.set('status', status);
  }
  params.set('sort', sort);
  params.set('order', order);

  const queryString = params.toString();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const url = projectId
    ? `${backendUrl}/api/knowledge/projects/${projectId}/extraction-history/?${queryString}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<ExtractionHistoryResponse>(
    url,
    fetcher,
    { refreshInterval }
  );

  return {
    extractions: data?.extractions || [],
    categoryCounts: data?.category_counts || ({} as CategoryCounts),
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to fetch history for a specific field
 */
export function useFieldHistory(projectId: number | null, fieldKey: string | null) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const url =
    projectId && fieldKey
      ? `${backendUrl}/api/knowledge/projects/${projectId}/extraction-history/${encodeURIComponent(fieldKey)}/`
      : null;

  const { data, error, isLoading } = useSWR<FieldHistoryResponse>(url, fetcher);

  return {
    fieldKey: data?.field_key || null,
    fieldLabel: data?.field_label || null,
    category: data?.category || null,
    current: data?.current || null,
    history: data?.history || [],
    totalVersions: data?.total_versions || 0,
    isLoading,
    error,
  };
}

/**
 * Get all categories as an array
 */
export function getAllCategories(): ExtractionCategory[] {
  return Object.keys(CATEGORY_CONFIG) as ExtractionCategory[];
}
