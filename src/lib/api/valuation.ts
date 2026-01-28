/**
 * API client for Valuation Django REST endpoints
 *
 * This module provides type-safe wrappers around the Django REST API
 * for comprehensive property valuation functionality.
 */

import type {
  SalesComparable,
  SalesComparableForm,
  SalesCompAdjustment,
  SalesCompAdjustmentForm,
  AIAdjustmentSuggestion,
  CostApproach,
  CostApproachDepreciationForm,
  CostApproachDepreciationRecord,
  ContainerCostMetadata,
  ContainerCostMetadataForm,
  IncomeApproach,
  LandComparable,
  LandComparableForm,
  LandCompAdjustment,
  LandCompAdjustmentForm,
  ValuationReconciliation,
  ValuationReconciliationForm,
  ValuationSummary,
} from '@/types/valuation';

const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// ============================================================================
// SALES COMPARISON APPROACH API
// ============================================================================

/**
 * Get all sales comparables for a project
 */
export async function getSalesComparables(projectId: number): Promise<{
  comparables: SalesComparable[];
  summary: Record<string, unknown>;
}> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/valuation/sales-comps/by_project/${projectId}/`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch sales comparables: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a single sales comparable by ID
 */
export async function getSalesComparable(comparableId: number): Promise<SalesComparable> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/valuation/sales-comps/${comparableId}/`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch sales comparable: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new sales comparable
 */
export async function createSalesComparable(
  data: SalesComparableForm
): Promise<SalesComparable> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/valuation/sales-comps/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create sales comparable: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

/**
 * Update a sales comparable
 */
export async function updateSalesComparable(
  comparableId: number,
  data: Partial<SalesComparableForm>
): Promise<SalesComparable> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/valuation/sales-comps/${comparableId}/`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to update sales comparable: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

/**
 * Delete a sales comparable
 */
export async function deleteSalesComparable(comparableId: number): Promise<void> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/valuation/sales-comps/${comparableId}/`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete sales comparable: ${response.statusText}`);
  }
}

/**
 * Add an adjustment to a sales comparable
 */
export async function addAdjustment(
  comparableId: number,
  data: Omit<SalesCompAdjustmentForm, 'comparable_id'>
): Promise<SalesComparable> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/valuation/sales-comps/${comparableId}/add_adjustment/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to add adjustment: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

/**
 * Delete an adjustment
 */
export async function deleteAdjustment(adjustmentId: number): Promise<void> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/valuation/adjustments/${adjustmentId}/`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete adjustment: ${response.statusText}`);
  }
}

// ============================================================================
// COST APPROACH API
// ============================================================================

/**
 * Get cost approach for a project
 */
export async function getCostApproach(projectId: number): Promise<CostApproach | null> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/valuation/cost-approach/by_project/${projectId}/`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch cost approach: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create or update cost approach for a project
 */
export async function saveCostApproach(
  projectId: number,
  data: Partial<CostApproach>
): Promise<CostApproach> {
  // First check if one exists
  const existing = await getCostApproach(projectId);

  if (existing) {
    // Update existing
    const response = await fetch(
      `${DJANGO_API_BASE}/api/valuation/cost-approach/${existing.cost_approach_id}/`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to update cost approach: ${JSON.stringify(errorData)}`);
    }

    return response.json();
  } else {
    // Create new
    const response = await fetch(
      `${DJANGO_API_BASE}/api/valuation/cost-approach/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project_id: projectId, ...data }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create cost approach: ${JSON.stringify(errorData)}`);
    }

    return response.json();
  }
}

// ============================================================================
// LAND COMPARABLES API
// ============================================================================

export async function getLandComparables(projectId: number): Promise<LandComparable[]> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/valuation/land-comps/`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch land comparables: ${response.statusText}`);
  }

  return response.json();
}

export async function createLandComparable(
  projectId: number,
  data: LandComparableForm
): Promise<LandComparable> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/valuation/land-comps/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create land comparable: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

export async function updateLandComparable(
  projectId: number,
  compId: number,
  data: LandComparableForm
): Promise<LandComparable> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/valuation/land-comps/${compId}/`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to update land comparable: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

export async function deleteLandComparable(projectId: number, compId: number): Promise<void> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/valuation/land-comps/${compId}/`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete land comparable: ${response.statusText}`);
  }
}

export async function getLandComparableAdjustments(
  projectId: number,
  compId: number
): Promise<LandCompAdjustment[]> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/valuation/land-comps/${compId}/adjustments/`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch land comp adjustments: ${response.statusText}`);
  }

  return response.json();
}

export async function createLandComparableAdjustment(
  projectId: number,
  compId: number,
  data: LandCompAdjustmentForm
): Promise<LandCompAdjustment> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/valuation/land-comps/${compId}/adjustments/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to save adjustment: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

export async function updateLandComparableAdjustment(
  projectId: number,
  compId: number,
  adjustmentId: number,
  data: LandCompAdjustmentForm
): Promise<LandCompAdjustment> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/valuation/land-comps/${compId}/adjustments/${adjustmentId}/`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to update adjustment: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

export async function deleteLandComparableAdjustment(
  projectId: number,
  compId: number,
  adjustmentId: number
): Promise<void> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/valuation/land-comps/${compId}/adjustments/${adjustmentId}/`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete adjustment: ${response.statusText}`);
  }
}

// ============================================================================
// CONTAINER COST METADATA
// ============================================================================

export async function getContainerCostMetadata(containerId: number): Promise<ContainerCostMetadata> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/containers/${containerId}/cost-metadata/`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch cost metadata: ${response.statusText}`);
  }

  return response.json();
}

export async function saveContainerCostMetadata(
  containerId: number,
  data: ContainerCostMetadataForm
): Promise<ContainerCostMetadata> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/containers/${containerId}/cost-metadata/`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to save cost metadata: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

// ============================================================================
// DEPRECIATION API
// ============================================================================

export async function getProjectDepreciation(
  projectId: number
): Promise<CostApproachDepreciationRecord | null> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/valuation/depreciation/`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch depreciation: ${response.statusText}`);
  }

  return response.json();
}

export async function saveProjectDepreciation(
  projectId: number,
  data: CostApproachDepreciationForm
): Promise<CostApproachDepreciationRecord> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/valuation/depreciation/`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to save depreciation: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

// ============================================================================
// INCOME APPROACH API
// ============================================================================

/**
 * Get income approach for a project
 */
export async function getIncomeApproach(projectId: number): Promise<IncomeApproach | null> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/valuation/income-approach/by_project/${projectId}/`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch income approach: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create or update income approach for a project
 */
export async function saveIncomeApproach(
  projectId: number,
  data: Partial<IncomeApproach>
): Promise<IncomeApproach> {
  const existing = await getIncomeApproach(projectId);

  if (existing) {
    // Update existing
    const response = await fetch(
      `${DJANGO_API_BASE}/api/valuation/income-approach/${existing.income_approach_id}/`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to update income approach: ${JSON.stringify(errorData)}`);
    }

    return response.json();
  } else {
    // Create new
    const response = await fetch(
      `${DJANGO_API_BASE}/api/valuation/income-approach/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project_id: projectId, ...data }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create income approach: ${JSON.stringify(errorData)}`);
    }

    return response.json();
  }
}

// ============================================================================
// VALUATION RECONCILIATION API
// ============================================================================

/**
 * Get valuation reconciliation for a project
 */
export async function getValuationReconciliation(
  projectId: number
): Promise<ValuationReconciliation | null> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/valuation/reconciliation/by_project/${projectId}/`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch valuation reconciliation: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create or update valuation reconciliation for a project
 */
export async function saveValuationReconciliation(
  projectId: number,
  data: Partial<ValuationReconciliationForm>
): Promise<ValuationReconciliation> {
  const existing = await getValuationReconciliation(projectId);

  if (existing) {
    // Update existing
    const response = await fetch(
      `${DJANGO_API_BASE}/api/valuation/reconciliation/${existing.reconciliation_id}/`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to update reconciliation: ${JSON.stringify(errorData)}`);
    }

    return response.json();
  } else {
    // Create new
    const response = await fetch(
      `${DJANGO_API_BASE}/api/valuation/reconciliation/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project_id: projectId, ...data }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create reconciliation: ${JSON.stringify(errorData)}`);
    }

    return response.json();
  }
}

// ============================================================================
// VALUATION SUMMARY API
// ============================================================================

/**
 * Get comprehensive valuation summary for a project
 */
export async function getValuationSummary(projectId: number): Promise<ValuationSummary> {
  try {
    const url = `${DJANGO_API_BASE}/api/valuation/summary/by_project/${projectId}/`;
    console.log('Fetching valuation summary from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      credentials: 'include',
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`Failed to fetch valuation summary: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Valuation data received:', data);
    return data;
  } catch (error) {
    console.error('Fetch error in getValuationSummary:', error);
    throw error;
  }
}

// ============================================================================
// AI ADJUSTMENT SUGGESTIONS API
// ============================================================================

/**
 * Get all AI suggestions for a specific comparable
 */
export async function getAISuggestions(comparableId: number): Promise<AIAdjustmentSuggestion[]> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/valuation/ai-suggestions/by_comp/${comparableId}/`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch AI suggestions: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Accept an AI suggestion and copy to user adjustment
 */
export async function acceptAISuggestion(suggestionId: number): Promise<{
  message: string;
  adjustment_id: number;
}> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/valuation/ai-suggestions/${suggestionId}/accept/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to accept AI suggestion: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

/**
 * Update user adjustment (for manual overrides or revised values)
 */
export async function updateUserAdjustment(
  adjustmentId: number,
  data: {
    user_adjustment_pct?: number | null;
    ai_accepted?: boolean;
    user_notes?: string;
  }
): Promise<SalesCompAdjustment> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/valuation/adjustments/${adjustmentId}/`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to update user adjustment: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

/**
 * Create or update AI suggestion
 */
export async function saveAISuggestion(
  data: Omit<AIAdjustmentSuggestion, 'ai_suggestion_id' | 'created_at' | 'updated_at'>
): Promise<AIAdjustmentSuggestion> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/valuation/ai-suggestions/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to save AI suggestion: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}
