/**
 * useBudgetGanttData Hook
 *
 * Fetches and transforms budget data from the database into SVAR Gantt format.
 * Each "task" in the Gantt is actually a budget line item with cost attributes.
 */

import { useQuery } from '@tanstack/react-query';

export interface BudgetGanttTask {
  id: number | string;
  text: string;
  start: Date;
  end: Date;
  duration: number;
  parent: number | string | null;
  progress: number;
  type: 'task' | 'summary';
  open?: boolean;

  // Custom budget fields
  qty?: number;
  uom_code?: string;
  rate?: number;
  amount?: number;
  escalation_rate?: number;
  contingency_pct?: number;
  category_code?: string;
  category_id?: number;
  scope?: string;
  timing_method?: string;
}

interface BudgetGanttLink {
  id: number | string;
  source: number | string;
  target: number | string;
  type: string;
}

interface UseBudgetGanttDataResult {
  tasks: BudgetGanttTask[];
  links: BudgetGanttLink[];
  isLoading: boolean;
  error: Error | null;
}

interface BudgetGanttParams {
  projectId: string | number;
  scope?: string;
  level?: string;
  entityId?: string | number;
}

async function fetchBudgetItems(params: BudgetGanttParams): Promise<any[]> {
  const searchParams = new URLSearchParams({
    projectId: String(params.projectId),
    ...(params.scope && { scope: params.scope }),
    ...(params.level && { level: params.level }),
    ...(params.entityId && { entityId: String(params.entityId) }),
  });

  const response = await fetch(`/api/budget/gantt?${searchParams}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch budget items: ${response.statusText}`);
  }
  return response.json();
}

function calculateDuration(startDate: string | Date, endDate: string | Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Calculate duration in months
  const months = (end.getFullYear() - start.getFullYear()) * 12 +
                 (end.getMonth() - start.getMonth());

  return months || 1; // Default to 1 month minimum
}

function transformToBudgetTask(item: any): BudgetGanttTask {
  const startDate = item.start_date ? new Date(item.start_date) : new Date();
  const endDate = item.end_date ? new Date(item.end_date) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days default

  return {
    id: item.fact_id || item.category_id,
    text: item.category_detail || item.category_code || 'Untitled',
    start: startDate,
    end: endDate,
    duration: calculateDuration(startDate, endDate),
    parent: item.parent_category_id || null,
    progress: 0, // Not used for budget
    type: item.parent_category_id ? 'task' : 'summary',
    open: true, // Expanded by default

    // Budget-specific fields
    qty: item.qty,
    uom_code: item.uom_code,
    rate: item.rate,
    amount: item.amount,
    escalation_rate: item.escalation_rate,
    contingency_pct: item.contingency_pct,
    category_code: item.category_code,
    category_id: item.category_id,
    scope: item.scope,
    timing_method: item.timing_method,
  };
}

export function useBudgetGanttData(params: BudgetGanttParams): UseBudgetGanttDataResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['budget-gantt', params.projectId, params.scope, params.level, params.entityId],
    queryFn: () => fetchBudgetItems(params),
    enabled: !!params.projectId,
  });

  const tasks = data?.map(transformToBudgetTask) || [];
  const links: BudgetGanttLink[] = []; // Dependencies not implemented yet

  return {
    tasks,
    links,
    isLoading,
    error: error as Error | null,
  };
}
