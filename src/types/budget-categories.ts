// v1.0 · 2025-11-02 · Budget Category Hierarchy Types

/**
 * Budget Category Hierarchy Level
 * Defines the depth in the 4-level taxonomy
 */
export type CategoryLevel = 1 | 2 | 3 | 4;

/**
 * Budget Category
 *
 * Represents a node in the hierarchical budget taxonomy.
 * Can be either a global template or project-specific category.
 *
 * Examples:
 * - Level 1: "Acquisition", "Horizontal Development", "Revenue"
 * - Level 2: "Due Diligence", "Engineering", "Rental Income"
 * - Level 3: "Environmental", "Civil Engineering", "Base Rent"
 * - Level 4: "Phase I ESA", "Geotechnical Study", "Market Rate Units"
 */
export interface BudgetCategory {
  category_id: number;
  parent_id: number | null;
  level: CategoryLevel;

  // Identity
  code: string;
  name: string;
  description: string | null;

  // Scope
  project_id: number | null;          // null for templates, project ID for custom
  is_template: boolean;               // true for global templates
  template_name: string | null;       // 'Land Development', 'Multifamily', etc.
  project_type_code: string | null;   // 'LAND', 'MF', 'RET', etc.

  // Display
  sort_order: number;
  icon: string | null;
  color: string | null;

  // Completion Tracking (for quick-add workflow)
  is_incomplete: boolean;
  created_from: string | null;         // 'budget_quick_add', 'admin_panel', 'ai_import', etc.
  reminder_dismissed_at: string | null;
  last_reminded_at: string | null;

  // Metadata
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;

  // Computed (from hierarchy view)
  path?: string;                       // "Acquisition > Due Diligence > Environmental"
  code_path?: string;                  // "LAND_ACQ.LAND_ACQ_DD.LAND_ACQ_DD_ENV"
  missing_fields?: string[];           // Fields that need completion
  is_complete_computed?: boolean;      // Computed from missing_fields
  should_remind?: boolean;             // Whether to show reminders
  has_children?: boolean;              // Has child categories
  usage_count?: number;                // Times used in budget items

  // Client-side only
  children?: BudgetCategory[];         // For tree rendering
  is_expanded?: boolean;               // UI state for expand/collapse
}

/**
 * Budget Category Tree Node
 *
 * Enhanced version with computed tree properties
 */
export interface BudgetCategoryTreeNode extends BudgetCategory {
  children: BudgetCategoryTreeNode[];
  parent?: BudgetCategoryTreeNode | null;
  has_children: boolean;
  depth: number;                        // 0-3 for levels 1-4
  is_leaf: boolean;
}

/**
 * Budget Category Template
 *
 * Pre-defined category hierarchies for different project types
 */
export interface BudgetCategoryTemplate {
  template_name: string;
  project_type_code: string;
  description: string;
  category_count: number;
  level_1_count: number;
  level_2_count: number;
  level_3_count: number;
  level_4_count: number;
  created_at: string;
}

/**
 * Category Hierarchy Configuration
 *
 * Defines which levels are visible based on complexity mode
 */
export interface CategoryHierarchyConfig {
  mode: 'basic' | 'standard' | 'detail';
  visible_levels: CategoryLevel[];      // [1] for basic, [1,2] for standard, [1,2,3,4] for detail
  allow_creation: boolean;              // Can user create new categories in this mode?
  show_breadcrumbs: boolean;            // Show full path or just current level?
}

/**
 * Budget Item with Categories
 *
 * Extended budget item with category hierarchy references
 */
export interface BudgetItemWithCategories {
  fact_id: number;
  project_id: number;
  container_id: number | null;

  // Category hierarchy (foreign keys)
  category_l1_id: number | null;
  category_l2_id: number | null;
  category_l3_id: number | null;
  category_l4_id: number | null;

  // Category objects (joined)
  category_l1?: BudgetCategory | null;
  category_l2?: BudgetCategory | null;
  category_l3?: BudgetCategory | null;
  category_l4?: BudgetCategory | null;

  // Computed category path
  category_path?: string;                // "Acquisition > Due Diligence > Environmental > Phase I ESA"
  category_code_path?: string;           // "LAND_ACQ.LAND_ACQ_DD.LAND_ACQ_DD_ENV.LAND_ACQ_DD_ENV_P1"

  // Financial data
  qty: number | null;
  rate: number | null;
  amount: number | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  uom_code: string | null;
}

/**
 * Category Selection State
 *
 * Tracks user selections in cascading dropdowns
 */
export interface CategorySelectionState {
  level_1: number | null;
  level_2: number | null;
  level_3: number | null;
  level_4: number | null;

  // Available options at each level (filtered by parent)
  level_1_options: BudgetCategory[];
  level_2_options: BudgetCategory[];
  level_3_options: BudgetCategory[];
  level_4_options: BudgetCategory[];

  // Validation
  is_valid: boolean;
  errors: string[];
}

/**
 * Category Create/Update Request (Full)
 */
export interface CategoryMutationRequest {
  code: string;
  name: string;
  description?: string;
  level: CategoryLevel;
  parent_id?: number | null;
  project_id?: number | null;
  is_template?: boolean;
  template_name?: string;
  project_type_code?: string;
  sort_order?: number;
  icon?: string;
  color?: string;
}

/**
 * Quick-Add Category Request (Minimal)
 *
 * Used for creating categories from budget grid with minimal info.
 * Missing fields will flag the category as incomplete.
 */
export interface QuickAddCategoryRequest {
  name: string;                        // Required: category name
  level: CategoryLevel;                // Required: hierarchy level
  parent_id?: number | null;           // Optional: parent category (recommended for L2-4)
  project_id: number;                  // Required: project ID
}

/**
 * Quick-Add Category Response
 */
export interface QuickAddCategoryResponse extends BudgetCategory {
  // Inherits all fields from BudgetCategory
  // Will have is_incomplete = true
  // Will have created_from = 'budget_quick_add'
}

/**
 * Incomplete Category Status
 *
 * Category that needs completion (from quick-add workflow).
 * Returned by /api/budget-categories/incomplete/ endpoint.
 */
export interface IncompleteCategoryStatus {
  category_id: number;
  category_name: string;
  category_code: string;
  category_level: CategoryLevel;
  parent_name: string;
  usage_count: number;                 // Times used in budget
  missing_fields: string[];            // ['description', 'icon', 'color', 'parent']
  created_at: string;
  last_reminded_at: string | null;
  days_since_created: number;
  admin_url: string;                   // URL to edit in admin panel
}

/**
 * Incomplete Categories Response
 */
export interface IncompleteCategoriesResponse {
  project_id: number;
  count: number;
  categories: IncompleteCategoryStatus[];
}

/**
 * Dismiss Reminder Request
 */
export interface DismissReminderRequest {
  days?: number;                       // Number of days to dismiss (default 7, max 30)
}

/**
 * Mark Complete Request
 */
export interface MarkCompleteRequest {
  force?: boolean;                     // Force complete even if fields missing
}

/**
 * Category Tree Response (from API)
 */
export interface CategoryTreeResponse {
  project_id: number | null;
  template_name: string | null;
  categories: BudgetCategoryTreeNode[];
  total_count: number;
  level_counts: {
    level_1: number;
    level_2: number;
    level_3: number;
    level_4: number;
  };
}

/**
 * Apply Template Request
 */
export interface ApplyTemplateRequest {
  project_id: number;
  template_name: string;
  project_type_code: string;
  overwrite_existing?: boolean;         // Delete existing categories first?
}

/**
 * Complexity Mode Category Settings
 */
export const COMPLEXITY_CATEGORY_CONFIG: Record<string, CategoryHierarchyConfig> = {
  basic: {
    mode: 'basic',
    visible_levels: [],                  // Geography only
    allow_creation: false,
    show_breadcrumbs: false,
  },
  standard: {
    mode: 'standard',
    visible_levels: [1],                 // Geography + L1
    allow_creation: true,
    show_breadcrumbs: false,
  },
  detail: {
    mode: 'detail',
    visible_levels: [1, 2, 3, 4],       // All levels
    allow_creation: true,
    show_breadcrumbs: true,
  },
};

/**
 * Helper Functions
 */

/**
 * Get available levels for complexity mode
 */
export function getVisibleCategoryLevels(mode: 'basic' | 'standard' | 'detail'): CategoryLevel[] {
  return COMPLEXITY_CATEGORY_CONFIG[mode].visible_levels;
}

/**
 * Check if level is visible in current mode
 */
export function isCategoryLevelVisible(level: CategoryLevel, mode: 'basic' | 'standard' | 'detail'): boolean {
  return COMPLEXITY_CATEGORY_CONFIG[mode].visible_levels.includes(level);
}

/**
 * Build category breadcrumb path
 */
export function buildCategoryPath(
  l1?: BudgetCategory | null,
  l2?: BudgetCategory | null,
  l3?: BudgetCategory | null,
  l4?: BudgetCategory | null
): string {
  const parts = [l1?.name, l2?.name, l3?.name, l4?.name].filter(Boolean);
  return parts.join(' > ');
}

/**
 * Build category code path
 */
export function buildCategoryCodePath(
  l1?: BudgetCategory | null,
  l2?: BudgetCategory | null,
  l3?: BudgetCategory | null,
  l4?: BudgetCategory | null
): string {
  const parts = [l1?.code, l2?.code, l3?.code, l4?.code].filter(Boolean);
  return parts.join('.');
}

/**
 * Validate category hierarchy consistency
 */
export function validateCategoryHierarchy(selection: CategorySelectionState): {
  is_valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Level 2 requires Level 1
  if (selection.level_2 && !selection.level_1) {
    errors.push('Level 2 category requires a Level 1 category');
  }

  // Level 3 requires Level 2
  if (selection.level_3 && !selection.level_2) {
    errors.push('Level 3 category requires a Level 2 category');
  }

  // Level 4 requires Level 3
  if (selection.level_4 && !selection.level_3) {
    errors.push('Level 4 category requires a Level 3 category');
  }

  return {
    is_valid: errors.length === 0,
    errors,
  };
}

/**
 * Flatten category tree to array (for table rendering)
 */
export function flattenCategoryTree(
  nodes: BudgetCategoryTreeNode[],
  respect_expanded: boolean = true
): BudgetCategoryTreeNode[] {
  const result: BudgetCategoryTreeNode[] = [];

  function traverse(node: BudgetCategoryTreeNode) {
    result.push(node);

    if (node.children && node.children.length > 0) {
      // Only show children if parent is expanded (or we're ignoring expand state)
      if (!respect_expanded || node.is_expanded) {
        node.children.forEach(child => traverse(child));
      }
    }
  }

  nodes.forEach(node => traverse(node));
  return result;
}

/**
 * Build tree from flat array
 */
export function buildCategoryTree(categories: BudgetCategory[]): BudgetCategoryTreeNode[] {
  const map = new Map<number, BudgetCategoryTreeNode>();
  const roots: BudgetCategoryTreeNode[] = [];

  // Create enhanced nodes
  categories.forEach(cat => {
    map.set(cat.category_id, {
      ...cat,
      children: [],
      has_children: false,
      depth: cat.level - 1,
      is_leaf: false,
    });
  });

  // Build parent-child relationships
  categories.forEach(cat => {
    const node = map.get(cat.category_id)!;

    if (cat.parent_id) {
      const parent = map.get(cat.parent_id);
      if (parent) {
        parent.children.push(node);
        parent.has_children = true;
        node.parent = parent;
      }
    } else {
      roots.push(node);
    }
  });

  // Mark leaves
  map.forEach(node => {
    node.is_leaf = node.children.length === 0;
  });

  return roots;
}
