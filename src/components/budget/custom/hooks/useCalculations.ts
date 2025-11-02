'use client';

import { useCallback } from 'react';
import { BudgetItem } from './useBudgetData';

export function useCalculations() {
  // Calculate Amount = Qty × Rate
  const calculateAmount = useCallback((qty: number | null, rate: number | null): number => {
    if (qty === null || rate === null) return 0;
    return qty * rate;
  }, []);

  // Calculate duration in months between two dates
  const calculateDuration = useCallback((startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(1, months); // Minimum 1 month
  }, []);

  // Calculate subtotal for parent category
  const calculateSubtotal = useCallback((items: BudgetItem[], parentId: number): number => {
    return items
      .filter(item => item.parent_category_id === parentId)
      .reduce((sum, item) => sum + (item.amount || 0), 0);
  }, []);

  // Apply escalation rate (compound growth)
  const applyEscalation = useCallback((amount: number, rate: number, periods: number): number => {
    return amount * Math.pow(1 + rate / 100, periods);
  }, []);

  // Apply contingency percentage
  const applyContingency = useCallback((amount: number, percentage: number): number => {
    return amount * (1 + percentage / 100);
  }, []);

  // Format currency
  const formatCurrency = useCallback((value: number | null): string => {
    if (value === null || value === undefined) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  // Format number with decimals
  const formatNumber = useCallback((value: number | null, decimals: number = 2): string => {
    if (value === null || value === undefined) return '0';
    return value.toFixed(decimals);
  }, []);

  // Check if item is a parent (has children)
  const isParent = useCallback((items: BudgetItem[], categoryId: number): boolean => {
    return items.some(item => item.parent_category_id === categoryId);
  }, []);

  return {
    calculateAmount,
    calculateDuration,
    calculateSubtotal,
    applyEscalation,
    applyContingency,
    formatCurrency,
    formatNumber,
    isParent,
  };
}
