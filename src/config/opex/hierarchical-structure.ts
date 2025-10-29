import { ComplexityTier } from '@/contexts/ComplexityModeContext';
import { multifamilyOpExFields, OpExField } from './multifamily-fields';

export interface ExpenseRow {
  id: string;
  label: string;
  expenseType: string;
  category: string;
  tier: ComplexityTier;
  level: number; // 0 = parent, 1 = child, 2 = grandchild
  hasChildren: boolean;
  isExpanded?: boolean;
  parentId?: string;
  children?: ExpenseRow[];
  // Data fields
  annualAmount: number;
  perUnit: number;
  perSF: number;
  escalationRate: number;
  isRecoverable?: boolean;
  recoveryRate?: number;
  // Flags
  isParent: boolean;
  isChild: boolean;
  isGrandchild: boolean;
}

/**
 * Build hierarchical expense structure based on complexity mode
 * Basic: 6 parent rows only (no children visible)
 * Standard: 6 parents + 7 children (13 total)
 * Advanced: 6 parents + 7 children + 14 grandchildren (27 total)
 */
export function buildHierarchicalExpenses(
  expenses: Array<{
    expense_type: string;
    expense_category: string;
    label: string;
    annual_amount: number;
    per_unit: number;
    per_sf: number;
    escalation_rate: number;
    is_recoverable?: boolean;
    recovery_rate?: number;
  }>,
  mode: ComplexityTier
): ExpenseRow[] {
  const tierOrder = { basic: 1, standard: 2, advanced: 3 };
  const currentTierLevel = tierOrder[mode];

  // Get all fields visible in current mode
  const visibleFields = multifamilyOpExFields.filter(field => {
    const fieldTierLevel = tierOrder[field.tier];
    return fieldTierLevel <= currentTierLevel;
  });

  // Build lookup map for expense data
  const expenseDataMap = new Map(
    expenses.map(exp => [exp.expense_type, exp])
  );

  // Identify parent fields (tier: basic, no parentField)
  const parentFields = visibleFields.filter(f => f.tier === 'basic' && !f.parentField);

  // Build hierarchical structure
  const result: ExpenseRow[] = [];

  parentFields.forEach(parentField => {
    const parentData = expenseDataMap.get(parentField.key);

    // Find direct children (standard tier with parentField matching this parent)
    const childFields = visibleFields.filter(
      f => f.tier === 'standard' && f.parentField === parentField.key
    );

    // Find grandchildren (advanced tier with parentField matching any child)
    const grandchildFieldsMap = new Map<string, OpExField[]>();
    childFields.forEach(child => {
      const grandchildren = visibleFields.filter(
        f => f.tier === 'advanced' && f.parentField === child.key
      );
      if (grandchildren.length > 0) {
        grandchildFieldsMap.set(child.key, grandchildren);
      }
    });

    // In Basic mode: Show parent only, sum includes all descendants
    // In Standard mode: Show parent + children, parent sum is children sum
    // In Advanced mode: Show all levels, parent sums children, children sum grandchildren

    const hasChildren = childFields.length > 0;
    const showChildren = mode !== 'basic' && hasChildren;

    // Calculate parent amount
    let parentAmount = parentData?.annual_amount || 0;
    let parentPerUnit = parentData?.per_unit || 0;
    let parentPerSF = parentData?.per_sf || 0;

    // If parent has children and we're showing them, sum child amounts
    if (showChildren && childFields.length > 0) {
      parentAmount = childFields.reduce((sum, childField) => {
        const childData = expenseDataMap.get(childField.key);
        return sum + (childData?.annual_amount || 0);
      }, 0);

      parentPerUnit = childFields.reduce((sum, childField) => {
        const childData = expenseDataMap.get(childField.key);
        return sum + (childData?.per_unit || 0);
      }, 0);

      parentPerSF = childFields.reduce((sum, childField) => {
        const childData = expenseDataMap.get(childField.key);
        return sum + (childData?.per_sf || 0);
      }, 0);
    }

    // Create parent row
    const parentRow: ExpenseRow = {
      id: parentField.key,
      label: parentField.label,
      expenseType: parentField.key,
      category: parentField.category || 'general',
      tier: parentField.tier,
      level: 0,
      hasChildren,
      isExpanded: true, // Default to expanded
      annualAmount: parentAmount,
      perUnit: parentPerUnit,
      perSF: parentPerSF,
      escalationRate: parentData?.escalation_rate || parentField.defaultEscalation || 0,
      isRecoverable: parentData?.is_recoverable,
      recoveryRate: parentData?.recovery_rate,
      isParent: true,
      isChild: false,
      isGrandchild: false,
      children: []
    };

    result.push(parentRow);

    // Add children if showing them
    if (showChildren) {
      childFields.forEach(childField => {
        const childData = expenseDataMap.get(childField.key);
        const grandchildren = grandchildFieldsMap.get(childField.key) || [];
        const hasGrandchildren = grandchildren.length > 0;
        const showGrandchildren = mode === 'advanced' && hasGrandchildren;

        // Calculate child amount
        let childAmount = childData?.annual_amount || 0;
        let childPerUnit = childData?.per_unit || 0;
        let childPerSF = childData?.per_sf || 0;

        // If child has grandchildren and we're showing them, sum grandchild amounts
        if (showGrandchildren && grandchildren.length > 0) {
          childAmount = grandchildren.reduce((sum, gcField) => {
            const gcData = expenseDataMap.get(gcField.key);
            return sum + (gcData?.annual_amount || 0);
          }, 0);

          childPerUnit = grandchildren.reduce((sum, gcField) => {
            const gcData = expenseDataMap.get(gcField.key);
            return sum + (gcData?.per_unit || 0);
          }, 0);

          childPerSF = grandchildren.reduce((sum, gcField) => {
            const gcData = expenseDataMap.get(gcField.key);
            return sum + (gcData?.per_sf || 0);
          }, 0);
        }

        const childRow: ExpenseRow = {
          id: childField.key,
          label: childField.label,
          expenseType: childField.key,
          category: childField.category || 'general',
          tier: childField.tier,
          level: 1,
          hasChildren: hasGrandchildren,
          isExpanded: true,
          parentId: parentField.key,
          annualAmount: childAmount,
          perUnit: childPerUnit,
          perSF: childPerSF,
          escalationRate: childData?.escalation_rate || childField.defaultEscalation || 0,
          isRecoverable: childData?.is_recoverable,
          recoveryRate: childData?.recovery_rate,
          isParent: false,
          isChild: true,
          isGrandchild: false,
          children: []
        };

        parentRow.children!.push(childRow);

        // Add grandchildren if showing them
        if (showGrandchildren) {
          grandchildren.forEach(gcField => {
            const gcData = expenseDataMap.get(gcField.key);

            const grandchildRow: ExpenseRow = {
              id: gcField.key,
              label: gcField.label,
              expenseType: gcField.key,
              category: gcField.category || 'general',
              tier: gcField.tier,
              level: 2,
              hasChildren: false,
              parentId: childField.key,
              annualAmount: gcData?.annual_amount || 0,
              perUnit: gcData?.per_unit || 0,
              perSF: gcData?.per_sf || 0,
              escalationRate: gcData?.escalation_rate || gcField.defaultEscalation || 0,
              isRecoverable: gcData?.is_recoverable,
              recoveryRate: gcData?.recovery_rate,
              isParent: false,
              isChild: false,
              isGrandchild: true
            };

            childRow.children!.push(grandchildRow);
          });
        }
      });
    }
  });

  return result;
}

/**
 * Flatten hierarchical rows for table rendering based on expand/collapse state
 */
export function flattenExpenseRows(rows: ExpenseRow[]): ExpenseRow[] {
  const result: ExpenseRow[] = [];

  rows.forEach(row => {
    result.push(row);

    if (row.isExpanded && row.children && row.children.length > 0) {
      row.children.forEach(child => {
        result.push(child);

        if (child.isExpanded && child.children && child.children.length > 0) {
          child.children.forEach(grandchild => {
            result.push(grandchild);
          });
        }
      });
    }
  });

  return result;
}

/**
 * Category definitions for filter chips
 */
export const CATEGORY_DEFINITIONS = [
  { key: 'taxes', label: 'TAXES', color: 'bg-red-600', textColor: 'text-white' },
  { key: 'insurance', label: 'INS', color: 'bg-blue-600', textColor: 'text-white' },
  { key: 'utilities', label: 'UTIL', color: 'bg-green-600', textColor: 'text-white' },
  { key: 'maintenance', label: 'R&M', color: 'bg-yellow-600', textColor: 'text-white' },
  { key: 'management', label: 'MGMT', color: 'bg-purple-600', textColor: 'text-white' },
  { key: 'other', label: 'OTHER', color: 'bg-gray-600', textColor: 'text-white' }
];

/**
 * Get category label and styling
 */
export function getCategoryInfo(category: string) {
  return CATEGORY_DEFINITIONS.find(c => c.key === category) || CATEGORY_DEFINITIONS[CATEGORY_DEFINITIONS.length - 1];
}
