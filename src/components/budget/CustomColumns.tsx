/**
 * CustomColumns Configuration
 *
 * Defines the budget-specific columns for the SVAR Gantt chart.
 * Each column represents a budget field (Qty, UOM, Rate, Amount, etc.)
 */

import { BudgetGanttTask } from './hooks/useBudgetGanttData';

export interface GanttColumn {
  id: string;
  header: string;
  width?: number;
  resize?: boolean;
  align?: 'left' | 'center' | 'right';
  flexgrow?: number;
  tree?: boolean;
  editor?: 'text' | 'number' | 'date' | 'select';
  options?: () => Promise<Array<{ id: string; label: string }>>;
  template?: (task: BudgetGanttTask) => string | number;
}

// Helper functions for formatting
export function formatCurrency(value: number | undefined | null): string {
  if (value === null || value === undefined) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | undefined | null, decimals: number = 0): string {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Fetch UOM options from API
async function fetchUOMOptions(): Promise<Array<{ id: string; label: string }>> {
  try {
    const response = await fetch('/api/measures');
    if (!response.ok) return [];
    const measures = await response.json();
    return measures.map((m: any) => ({
      id: m.uom_code,
      label: `${m.uom_code} - ${m.uom_name}`,
    }));
  } catch (error) {
    console.error('Failed to fetch UOM options:', error);
    return [];
  }
}

/**
 * Budget-specific Gantt columns
 */
export const budgetGanttColumns: GanttColumn[] = [
  {
    id: 'text',
    header: 'Budget Item',
    width: 250,
    tree: true, // Enable hierarchy expand/collapse
    resize: true,
    align: 'left',
    flexgrow: 1,
  },
  {
    id: 'qty',
    header: 'Quantity',
    width: 100,
    resize: true,
    align: 'right',
    editor: 'number',
    template: (task: BudgetGanttTask) => {
      if (task.type === 'summary') return ''; // No quantity for parent rows
      return formatNumber(task.qty, 2);
    },
  },
  {
    id: 'uom_code',
    header: 'UOM',
    width: 80,
    resize: true,
    align: 'center',
    editor: 'select',
    options: fetchUOMOptions,
    template: (task: BudgetGanttTask) => {
      if (task.type === 'summary') return '';
      return task.uom_code || '-';
    },
  },
  {
    id: 'rate',
    header: 'Rate ($)',
    width: 120,
    resize: true,
    align: 'right',
    editor: 'number',
    template: (task: BudgetGanttTask) => {
      if (task.type === 'summary') return '';
      return formatCurrency(task.rate);
    },
  },
  {
    id: 'amount',
    header: 'Amount ($)',
    width: 140,
    resize: true,
    align: 'right',
    template: (task: BudgetGanttTask) => {
      // Calculate amount from qty × rate if available, otherwise use stored amount
      const calculated = task.qty && task.rate ? task.qty * task.rate : task.amount;

      // For summary rows, calculate subtotal from children (handled elsewhere)
      if (task.type === 'summary') {
        return `<span style="color: #fbbf24; font-weight: 600;">${formatCurrency(task.amount)}</span>`;
      }

      // Regular rows - show calculated value in green
      return `<span style="color: #10b981; font-weight: 500;">${formatCurrency(calculated)}</span>`;
    },
  },
  {
    id: 'start',
    header: 'Start',
    width: 100,
    resize: true,
    align: 'center',
    editor: 'date',
    template: (task: BudgetGanttTask) => {
      if (!task.start) return '-';
      return new Date(task.start).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    },
  },
  {
    id: 'duration',
    header: 'Periods',
    width: 80,
    resize: true,
    align: 'center',
    editor: 'number',
    template: (task: BudgetGanttTask) => {
      return `${task.duration || 1} mo`;
    },
  },
  {
    id: 'escalation_rate',
    header: 'Escalation %',
    width: 110,
    resize: true,
    align: 'right',
    editor: 'number',
    template: (task: BudgetGanttTask) => {
      if (task.type === 'summary' || !task.escalation_rate) return '-';
      return `${formatNumber(task.escalation_rate, 2)}%`;
    },
  },
  {
    id: 'contingency_pct',
    header: 'Contingency %',
    width: 120,
    resize: true,
    align: 'right',
    editor: 'number',
    template: (task: BudgetGanttTask) => {
      if (task.type === 'summary' || !task.contingency_pct) return '-';
      return `${formatNumber(task.contingency_pct, 2)}%`;
    },
  },
];

/**
 * Simplified columns for compact view
 */
export const budgetGanttColumnsCompact: GanttColumn[] = [
  {
    id: 'text',
    header: 'Budget Item',
    width: 200,
    tree: true,
    resize: true,
    align: 'left',
    flexgrow: 1,
  },
  {
    id: 'qty',
    header: 'Qty',
    width: 80,
    resize: true,
    align: 'right',
    editor: 'number',
    template: (task: BudgetGanttTask) => {
      if (task.type === 'summary') return '';
      return formatNumber(task.qty, 2);
    },
  },
  {
    id: 'uom_code',
    header: 'UOM',
    width: 70,
    resize: true,
    align: 'center',
    template: (task: BudgetGanttTask) => task.uom_code || '-',
  },
  {
    id: 'rate',
    header: 'Rate',
    width: 100,
    resize: true,
    align: 'right',
    template: (task: BudgetGanttTask) => {
      if (task.type === 'summary') return '';
      return formatCurrency(task.rate);
    },
  },
  {
    id: 'amount',
    header: 'Amount',
    width: 120,
    resize: true,
    align: 'right',
    template: (task: BudgetGanttTask) => {
      const calculated = task.qty && task.rate ? task.qty * task.rate : task.amount;
      if (task.type === 'summary') {
        return `<span style="font-weight: 600;">${formatCurrency(task.amount)}</span>`;
      }
      return formatCurrency(calculated);
    },
  },
];
