/**
 * useBudgetCalculations Hook
 *
 * Handles budget calculations including:
 * - Amount = Qty × Rate
 * - Subtotals for parent categories
 * - Escalation adjustments
 * - Contingency calculations
 */

import { useMemo } from 'react';
import { BudgetGanttTask } from './useBudgetGanttData';

interface BudgetCalculationsResult {
  calculateAmount: (qty: number, rate: number) => number;
  calculateSubtotal: (tasks: BudgetGanttTask[], parentId: number | string) => number;
  applyEscalation: (amount: number, rate: number, periods: number) => number;
  applyContingency: (amount: number, contingencyPct: number) => number;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number, decimals?: number) => string;
}

export function useBudgetCalculations(): BudgetCalculationsResult {
  return useMemo(() => ({
    /**
     * Calculate amount from quantity and rate
     */
    calculateAmount: (qty: number, rate: number): number => {
      if (!qty || !rate) return 0;
      return qty * rate;
    },

    /**
     * Calculate subtotal for all child tasks of a parent
     */
    calculateSubtotal: (tasks: BudgetGanttTask[], parentId: number | string): number => {
      return tasks
        .filter(task => task.parent === parentId)
        .reduce((sum, task) => {
          const taskAmount = task.amount || 0;
          return sum + taskAmount;
        }, 0);
    },

    /**
     * Apply escalation over multiple periods
     * Formula: FV = PV × (1 + rate)^periods
     */
    applyEscalation: (amount: number, rate: number, periods: number): number => {
      if (!rate || !periods) return amount;
      const decimalRate = rate / 100; // Convert percentage to decimal
      return amount * Math.pow(1 + decimalRate, periods);
    },

    /**
     * Apply contingency percentage to amount
     */
    applyContingency: (amount: number, contingencyPct: number): number => {
      if (!contingencyPct) return amount;
      const decimalPct = contingencyPct / 100;
      return amount * (1 + decimalPct);
    },

    /**
     * Format number as currency
     */
    formatCurrency: (value: number): string => {
      if (value === null || value === undefined) return '$0';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    },

    /**
     * Format number with specified decimal places
     */
    formatNumber: (value: number, decimals: number = 0): string => {
      if (value === null || value === undefined) return '0';
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    },
  }), []);
}
