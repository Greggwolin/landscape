/**
 * Custom Hooks: useDeveloperOperations
 * Manages developer fees and management overhead data fetching and mutations
 */

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface DeveloperFee {
  id: number;
  project_id: number;
  fee_type: string;
  fee_type_display: string;
  fee_description: string | null;
  basis_type: string;
  basis_type_display: string;
  basis_value: number | null;
  calculated_amount: number | null;
  payment_timing: string | null;
  timing_start_period: number;
  timing_duration_periods: number;
  status: string;
  status_display: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagementOverhead {
  id: number;
  project_id: number;
  item_name: string;
  amount: number;
  frequency: string;
  frequency_display: string;
  start_period: number;
  duration_periods: number;
  container_level: string | null;
  container_level_display: string | null;
  container_id: number | null;
  notes: string | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface DeveloperFeeSummary {
  total_fees: number;
  fees_by_type: Record<string, number>;
  pending_amount: number;
  paid_amount: number;
}

export interface ManagementOverheadSummary {
  total_overhead: number;
  monthly_overhead: number;
  items_count: number;
}

export interface CreateDeveloperFee {
  project_id: number;
  fee_type: string;
  fee_description?: string;
  basis_type: string;
  basis_value?: number;
  calculated_amount?: number;
  payment_timing?: string;
  timing_start_period?: number;
  timing_duration_periods?: number;
  status?: string;
  notes?: string;
}

export type UpdateDeveloperFee = Partial<Omit<DeveloperFee, 'id' | 'project_id' | 'created_at' | 'updated_at' | 'fee_type_display' | 'basis_type_display' | 'status_display'>>;

export interface CreateManagementOverhead {
  project_id: number;
  item_name: string;
  amount: number;
  frequency?: string;
  start_period?: number;
  duration_periods?: number;
  container_level?: string;
  container_id?: number;
  notes?: string;
}

export type UpdateManagementOverhead = Partial<Omit<ManagementOverhead, 'id' | 'project_id' | 'created_at' | 'updated_at' | 'total_amount' | 'frequency_display' | 'container_level_display'>>;

// Fee type options for dropdowns
export const FEE_TYPE_OPTIONS = [
  { value: 'development', label: 'Development Fee' },
  { value: 'construction_mgmt', label: 'Construction Management Fee' },
  { value: 'acquisition', label: 'Acquisition Fee' },
  { value: 'disposition', label: 'Disposition Fee' },
  { value: 'asset_mgmt', label: 'Asset Management Fee' },
  { value: 'other', label: 'Other Fee' },
];

export const BASIS_TYPE_OPTIONS = [
  { value: 'percent_of_acquisition', label: '% of Land Acquisition' },
  { value: 'percent_of_hard_costs', label: '% of Hard Costs' },
  { value: 'percent_of_soft_costs', label: '% of Soft Costs' },
  { value: 'percent_of_total_costs', label: '% of Total Dev Costs' },
  { value: 'percent_of_revenue', label: '% of Revenue' },
  { value: 'percent_of_equity', label: '% of Equity' },
  { value: 'flat_fee', label: 'Fixed Amount' },
];

export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partially Paid' },
];

export const FREQUENCY_OPTIONS = [
  { value: 'one_time', label: 'One-Time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

export const CONTAINER_LEVEL_OPTIONS = [
  { value: 'project', label: 'Project' },
  { value: 'phase', label: 'Phase' },
  { value: 'subdivision', label: 'Subdivision' },
  { value: 'building', label: 'Building' },
];

// =============================================================================
// DEVELOPER FEES HOOK
// =============================================================================

export function useDeveloperFees(projectId: number) {
  const [fees, setFees] = useState<DeveloperFee[]>([]);
  const [summary, setSummary] = useState<DeveloperFeeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFees = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/developer-operations/fees?project_id=${projectId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch developer fees');
      }

      const data = await response.json();
      setFees(data.fees || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading developer fees:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  const createFee = useCallback(async (data: CreateDeveloperFee) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/developer-operations/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create developer fee');
      }

      const result = await response.json();
      await loadFees();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error creating developer fee:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadFees]);

  const updateFee = useCallback(async (feeId: number, data: UpdateDeveloperFee) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/developer-operations/fees/${feeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update developer fee');
      }

      const result = await response.json();
      await loadFees();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error updating developer fee:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadFees]);

  const deleteFee = useCallback(async (feeId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/developer-operations/fees/${feeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete developer fee');
      }

      await loadFees();
      return { success: true };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error deleting developer fee:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadFees]);

  return {
    fees,
    summary,
    isLoading,
    error,
    reload: loadFees,
    createFee,
    updateFee,
    deleteFee,
  };
}

// =============================================================================
// MANAGEMENT OVERHEAD HOOK
// =============================================================================

export function useManagementOverhead(projectId: number) {
  const [items, setItems] = useState<ManagementOverhead[]>([]);
  const [summary, setSummary] = useState<ManagementOverheadSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/developer-operations/overhead?project_id=${projectId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch management overhead');
      }

      const data = await response.json();
      setItems(data.items || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading management overhead:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const createItem = useCallback(async (data: CreateManagementOverhead) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/developer-operations/overhead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create overhead item');
      }

      const result = await response.json();
      await loadItems();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error creating overhead item:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadItems]);

  const updateItem = useCallback(async (itemId: number, data: UpdateManagementOverhead) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/developer-operations/overhead/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update overhead item');
      }

      const result = await response.json();
      await loadItems();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error updating overhead item:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadItems]);

  const deleteItem = useCallback(async (itemId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/developer-operations/overhead/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete overhead item');
      }

      await loadItems();
      return { success: true };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error deleting overhead item:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadItems]);

  return {
    items,
    summary,
    isLoading,
    error,
    reload: loadItems,
    createItem,
    updateItem,
    deleteItem,
  };
}
