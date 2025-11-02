/**
 * useBudgetSave Hook
 *
 * Handles saving budget item updates to the database with optimistic updates.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

interface BudgetItemUpdate {
  fact_id?: number;
  qty?: number;
  rate?: number;
  amount?: number;
  start_date?: Date | string;
  end_date?: Date | string;
  uom_code?: string;
  escalation_rate?: number;
  contingency_pct?: number;
  category_id?: number;
  timing_method?: string;
}

interface BudgetItemCreate {
  project_id: number;
  budget_id?: number;
  pe_level: string;
  pe_id: string | number;
  category_id: number;
  parent_id?: number;
  qty?: number;
  rate?: number;
  amount?: number;
  start_date: Date | string;
  end_date?: Date | string;
  uom_code?: string;
  escalation_rate?: number;
  contingency_pct?: number;
  timing_method?: string;
  scope?: string;
}

async function updateBudgetItem(factId: number, updates: BudgetItemUpdate): Promise<any> {
  const response = await fetch(`/api/budget/gantt/items/${factId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update budget item: ${response.statusText}`);
  }

  return response.json();
}

async function createBudgetItem(item: BudgetItemCreate): Promise<any> {
  const response = await fetch('/api/budget/gantt/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    throw new Error(`Failed to create budget item: ${response.statusText}`);
  }

  return response.json();
}

async function deleteBudgetItem(factId: number): Promise<void> {
  const response = await fetch(`/api/budget/gantt/items/${factId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete budget item: ${response.statusText}`);
  }
}

interface UseBudgetSaveResult {
  saveBudgetItem: (updates: BudgetItemUpdate) => Promise<any>;
  createBudgetItem: (item: BudgetItemCreate) => Promise<any>;
  deleteBudgetItem: (factId: number) => Promise<void>;
  isSaving: boolean;
  error: Error | null;
}

interface UseBudgetSaveParams {
  projectId: string | number;
  scope?: string;
  level?: string;
  entityId?: string | number;
}

export function useBudgetSave(params: UseBudgetSaveParams): UseBudgetSaveResult {
  const queryClient = useQueryClient();
  const queryKey = ['budget-gantt', params.projectId, params.scope, params.level, params.entityId];

  const updateMutation = useMutation({
    mutationFn: ({ factId, updates }: { factId: number; updates: BudgetItemUpdate }) =>
      updateBudgetItem(factId, updates),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const createMutation = useMutation({
    mutationFn: createBudgetItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBudgetItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    saveBudgetItem: async (updates: BudgetItemUpdate) => {
      if (!updates.fact_id) {
        throw new Error('fact_id is required for updates');
      }
      return updateMutation.mutateAsync({ factId: updates.fact_id, updates });
    },
    createBudgetItem: async (item: BudgetItemCreate) => {
      return createMutation.mutateAsync(item);
    },
    deleteBudgetItem: async (factId: number) => {
      return deleteMutation.mutateAsync(factId);
    },
    isSaving: updateMutation.isPending || createMutation.isPending || deleteMutation.isPending,
    error: updateMutation.error || createMutation.error || deleteMutation.error || null,
  };
}
