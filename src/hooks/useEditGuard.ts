// Edit Guard Hook - Check if edits will create variances
// v1.0 · 2025-11-03

import { useMemo } from 'react';
import type { BudgetItem } from '@/components/budget/ColumnDefinitions';
import type { CategoryVariance } from './useBudgetVariance';

interface EditGuardResult {
  shouldWarn: boolean;
  warningLevel: 'none' | 'low' | 'medium' | 'high';
  tooltip: string;
  hasChildren: boolean;
  currentVariance?: CategoryVariance;
}

/**
 * Check if editing a budget item will create or worsen a variance
 *
 * @param item - The budget item being edited
 * @param field - The field being edited
 * @param newValue - The new value
 * @param variances - Array of current variances
 * @returns EditGuardResult with warning information
 */
export function useEditGuard(
  item: BudgetItem | undefined,
  field: keyof BudgetItem | null,
  newValue: unknown,
  variances: CategoryVariance[] | undefined
): EditGuardResult {
  return useMemo(() => {
    // Default result - no warning
    const noWarning: EditGuardResult = {
      shouldWarn: false,
      warningLevel: 'none',
      tooltip: '',
      hasChildren: false,
    };

    if (!item || !field) {
      return noWarning;
    }

    // Only warn for amount-related fields
    const amountFields: Array<keyof BudgetItem> = ['amount', 'qty', 'rate'];
    if (!amountFields.includes(field)) {
      return noWarning;
    }

    // Find if this item's category has children
    let hasChildren = false;
    let categoryLevel: number | null = null;
    let categoryId: number | null = null;
    let currentVariance: CategoryVariance | undefined;

    // Check each category level from highest to lowest
    for (let level = 1; level <= 4; level++) {
      const catIdField = `category_l${level}_id` as keyof BudgetItem;
      const catId = item[catIdField] as number | null;

      if (catId && variances) {
        const variance = variances.find(
          v => v.category_id === catId && v.category_level === level
        );

        if (variance?.has_children) {
          hasChildren = true;
          categoryLevel = level;
          categoryId = catId;
          currentVariance = variance;
          break; // Use the highest level with children
        }
      }
    }

    if (!hasChildren) {
      return {
        ...noWarning,
        tooltip: 'This item has no child categories, editing will not create a variance',
      };
    }

    // Calculate the impact of the edit
    const currentAmount = Number(item.amount) || 0;
    let newAmount = currentAmount;

    if (field === 'amount') {
      newAmount = Number(newValue) || 0;
    } else if (field === 'qty' || field === 'rate') {
      const qty = field === 'qty' ? (Number(newValue) || 0) : (Number(item.qty) || 0);
      const rate = field === 'rate' ? (Number(newValue) || 0) : (Number(item.rate) || 0);
      newAmount = qty * rate;
    }

    const amountChange = newAmount - currentAmount;

    if (Math.abs(amountChange) < 0.01) {
      // No meaningful change
      return {
        ...noWarning,
        hasChildren: true,
        currentVariance,
        tooltip: 'No amount change, variance will not be affected',
      };
    }

    // Calculate new variance
    const childrenAmount = currentVariance?.children_amount || 0;
    const currentParentAmount = currentVariance?.parent_amount || 0;
    const newParentAmount = currentParentAmount + amountChange;
    const newVariance = newParentAmount - childrenAmount;
    const newVariancePct = childrenAmount ? (newVariance / childrenAmount) * 100 : 0;

    // Determine warning level
    let warningLevel: 'none' | 'low' | 'medium' | 'high' = 'none';
    if (Math.abs(newVariancePct) > 10) {
      warningLevel = 'high';
    } else if (Math.abs(newVariancePct) > 5) {
      warningLevel = 'medium';
    } else if (Math.abs(newVariancePct) > 1) {
      warningLevel = 'low';
    }

    const shouldWarn = warningLevel !== 'none';

    // Build tooltip
    let tooltip = '';
    if (shouldWarn) {
      tooltip = `⚠️ This edit will ${currentVariance?.variance_amount ? 'modify' : 'create'} a variance of ${newVariance > 0 ? '+' : ''}$${Math.abs(newVariance).toLocaleString()} (${Math.abs(newVariancePct).toFixed(1)}%) in ${currentVariance?.category_name || 'parent category'}`;
    } else {
      tooltip = `This edit will result in a ${newVariance > 0 ? '+' : ''}$${Math.abs(newVariance).toLocaleString()} variance (${Math.abs(newVariancePct).toFixed(1)}%), which is within acceptable limits`;
    }

    return {
      shouldWarn,
      warningLevel,
      tooltip,
      hasChildren: true,
      currentVariance,
    };
  }, [item, field, newValue, variances]);
}

/**
 * Get tooltip content for a budget item field
 *
 * @param item - The budget item
 * @param field - The field
 * @param variances - Array of current variances
 * @returns Tooltip string
 */
export function getFieldTooltip(
  item: BudgetItem | undefined,
  field: keyof BudgetItem,
  variances: CategoryVariance[] | undefined
): string {
  if (!item) return '';

  // Check if this item is in a category with children
  let hasChildren = false;
  let categoryName = '';

  for (let level = 1; level <= 4; level++) {
    const catIdField = `category_l${level}_id` as keyof BudgetItem;
    const catId = item[catIdField] as number | null;

    if (catId && variances) {
      const variance = variances.find(
        v => v.category_id === catId && v.category_level === level
      );

      if (variance?.has_children) {
        hasChildren = true;
        categoryName = variance.category_name;
        break;
      }
    }
  }

  if (!hasChildren) {
    return '';
  }

  // Amount-related fields get variance warnings
  const amountFields: Array<keyof BudgetItem> = ['amount', 'qty', 'rate'];
  if (amountFields.includes(field)) {
    return `⚠️ Editing this field affects the parent category "${categoryName}" which has child categories. Changes may create or modify variances.`;
  }

  return '';
}
