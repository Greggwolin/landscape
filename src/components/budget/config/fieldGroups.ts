// v2.0 · 2025-11-15 · Complete Field Group Definitions for Budget Expansion
// Organizes all budget fields into logical groups for expandable rows

import { FieldGroup, FieldConfig, BudgetMode, BudgetItem } from '@/types/budget';
import { LAND_DEVELOPMENT_SUBTYPES } from '@/types/project-taxonomy';

// ============================================================================
// FIELD GROUP DEFINITIONS
// Standard Mode: 3 groups (Timing, Cost Controls, Classification)
// Detail Mode: +4 additional groups (Advanced Timing, Financial, Allocation, Audit)
// ============================================================================

export const budgetFieldGroups: FieldGroup[] = [
  // =========================================================================
  // STANDARD MODE GROUPS
  // =========================================================================
  {
    id: 'timing',
    label: 'Timing & Escalation',
    mode: 'standard',
    collapsed: false,
    color: '#ffc107', // Yellow indicator
    fields: [
      // Single row with auto-width columns (slightly wider than v2.4 for better spacing)
      {
        name: 'start_date',
        label: 'Start',
        type: 'date',
        mode: 'standard',
        group: 'timing',
        editable: true,
        width: 130,
        colWidth: 'auto',
      },
      {
        name: 'end_date',
        label: 'End',
        type: 'date',
        mode: 'standard',
        group: 'timing',
        editable: true,
        width: 130,
        colWidth: 'auto',
      },
      {
        name: 'timing_method',
        label: 'Distribution',
        type: 'dropdown',
        mode: 'standard',
        group: 'timing',
        editable: true,
        options: [
          { value: 'distributed', label: 'Fixed' },
          { value: 'milestone', label: 'Milestone' },
          { value: 'curve', label: 'S-Curve' },
        ],
        width: 120,
        colWidth: 'auto',
      },
      {
        name: 'escalation_rate',
        label: 'Escalation %',
        type: 'percentage',
        mode: 'standard',
        group: 'timing',
        editable: true,
        validation: { min: 0, max: 20 },
        width: 100,
        colWidth: 'auto',
      },
      {
        name: 'escalation_method',
        label: 'Escalation Timing',
        type: 'dropdown',
        mode: 'standard',
        group: 'timing',
        editable: true,
        options: [
          { value: 'to_start', label: 'To Start' },
          { value: 'through_duration', label: 'Throughout' },
        ],
        width: 140,
        colWidth: 'auto',
      },
      {
        name: 'curve_profile',
        label: 'Curve Profile',
        type: 'dropdown',
        mode: 'standard',
        group: 'timing',
        editable: true,
        dependsOn: ['timing_method'],
        options: [
          { value: 'standard', label: 'Standard' },
          { value: 'front_loaded', label: 'Front-Loaded' },
          { value: 'back_loaded', label: 'Back-Loaded' },
        ],
        width: 130,
        colWidth: 'auto',
      },
      {
        name: 'curve_steepness',
        label: 'Steepness',
        type: 'slider',
        mode: 'standard',
        group: 'timing',
        editable: true,
        dependsOn: ['timing_method'],
        validation: { min: 0, max: 100 },
        width: 120,
        colWidth: 'auto',
      },
      {
        name: 'dependency_count',
        label: 'Dependencies',
        type: 'link',
        mode: 'standard',
        group: 'timing',
        editable: false,
        readonly: true,
        computed: true,
        dependsOn: ['timing_method'],
        width: 110,
        colWidth: 'auto',
        helpText: 'Configure milestone dependencies',
      },
    ],
  },
  {
    id: 'cost_controls',
    label: 'Cost Controls',
    mode: 'standard',
    collapsed: true,
    color: '#ffc107',
    fields: [
      // Row 1: Risk and Vendor
      {
        name: 'contingency_pct',
        label: 'Contingency %',
        type: 'percentage',
        mode: 'standard',
        group: 'cost_controls',
        editable: true,
        validation: { min: 0, max: 50 },
        helpText: 'Cost buffer %',
        width: 100,
      },
      {
        name: 'confidence_level',
        label: 'Confidence',
        type: 'dropdown',
        mode: 'standard',
        group: 'cost_controls',
        editable: true,
        options: [
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
          { value: 'conceptual', label: 'Conceptual' },
        ],
        helpText: 'Estimation confidence',
        width: 150,
      },
      {
        name: 'vendor_name',
        label: 'Vendor',
        type: 'text',
        mode: 'standard',
        group: 'cost_controls',
        editable: true,
        helpText: 'Vendor or supplier',
        width: 180,
      },
      // Row 2: Commitment Tracking
      {
        name: 'contract_number',
        label: 'Contract #',
        type: 'text',
        mode: 'standard',
        group: 'cost_controls',
        editable: true,
        helpText: 'Contract reference',
        width: 140,
      },
      {
        name: 'purchase_order',
        label: 'PO #',
        type: 'text',
        mode: 'standard',
        group: 'cost_controls',
        editable: true,
        helpText: 'Purchase order',
        width: 140,
      },
      {
        name: 'is_committed',
        label: 'Committed',
        type: 'checkbox',
        mode: 'standard',
        group: 'cost_controls',
        editable: true,
        helpText: 'Has contractual commitment',
        width: 80,
      },
    ],
  },
  {
    id: 'classification',
    label: 'Notes & Classification',
    mode: 'standard',
    collapsed: true,
    color: '#ffc107',
    fields: [
      // Row 1: Classification
      {
        name: 'scope_override',
        label: 'Scope Override',
        type: 'text',
        mode: 'standard',
        group: 'classification',
        editable: true,
        helpText: 'Override container scope',
        width: 150,
      },
      {
        name: 'cost_type',
        label: 'Cost Type',
        type: 'dropdown',
        mode: 'standard',
        group: 'classification',
        editable: true,
        options: [
          { value: 'direct', label: 'Direct' },
          { value: 'indirect', label: 'Indirect' },
          { value: 'soft', label: 'Soft' },
          { value: 'financing', label: 'Financing' },
        ],
        helpText: 'Financial reporting class',
        width: 150,
      },
      {
        name: 'activity',
        label: 'Lifecycle Stage',
        type: 'dropdown',
        mode: 'standard',
        group: 'classification',
        editable: true,
        options: [
          { value: 'Acquisition', label: 'Acquisition' },
          { value: 'Planning & Engineering', label: 'Planning & Engineering' },
          { value: 'Development', label: 'Development' },
          { value: 'Operations', label: 'Operations' },
          { value: 'Disposition', label: 'Disposition' },
          { value: 'Financing', label: 'Financing' },
        ],
        helpText: 'Budget lifecycle stage for categorization',
        width: 180,
      },
      {
        name: 'tax_treatment',
        label: 'Tax Treatment',
        type: 'dropdown',
        mode: 'standard',
        group: 'classification',
        editable: true,
        options: [
          { value: 'capitalizable', label: 'Capitalizable' },
          { value: 'deductible', label: 'Deductible' },
          { value: 'non_deductible', label: 'Non-Deductible' },
        ],
        helpText: 'Tax accounting',
        width: 150,
      },
      // Row 2: Notes (full-width)
      {
        name: 'notes',
        label: 'Notes',
        type: 'textarea',
        mode: 'standard',
        group: 'classification',
        editable: true,
        helpText: 'Public notes (exported)',
        width: 300,
        fullWidth: true,
      },
      // Row 3: Internal Memo (full-width)
      {
        name: 'internal_memo',
        label: 'Internal Memo',
        type: 'textarea',
        mode: 'standard',
        group: 'classification',
        editable: true,
        helpText: 'Internal only (not exported)',
        width: 300,
        fullWidth: true,
      },
    ],
  },

  // =========================================================================
  // DETAIL MODE GROUPS (Build on Standard)
  // =========================================================================
  {
    id: 'advanced_timing',
    label: 'Advanced Timing (CPM)',
    mode: 'detail',
    collapsed: true,
    color: '#dc3545', // Red indicator for detail-only
    fields: [
      {
        name: 'baseline_start_date',
        label: 'Baseline Start',
        type: 'date',
        mode: 'detail',
        group: 'advanced_timing',
        editable: false,
        readonly: true,
        helpText: 'Original planned start date (locked, never changes)',
        width: 140,
      },
      {
        name: 'baseline_end_date',
        label: 'Baseline End',
        type: 'date',
        mode: 'detail',
        group: 'advanced_timing',
        editable: false,
        readonly: true,
        helpText: 'Original planned end date (locked, never changes)',
        width: 140,
      },
      {
        name: 'actual_start_date',
        label: 'Actual Start',
        type: 'date',
        mode: 'detail',
        group: 'advanced_timing',
        editable: true,
        helpText: 'When work actually began',
        width: 140,
      },
      {
        name: 'actual_end_date',
        label: 'Actual End',
        type: 'date',
        mode: 'detail',
        group: 'advanced_timing',
        editable: true,
        helpText: 'When work actually completed',
        width: 140,
      },
      {
        name: 'percent_complete',
        label: '% Complete',
        type: 'percentage',
        mode: 'detail',
        group: 'advanced_timing',
        editable: true,
        validation: { min: 0, max: 100 },
        helpText: 'Progress tracking (0-100%)',
        width: 100,
      },
      {
        name: 'status',
        label: 'Status',
        type: 'dropdown',
        mode: 'detail',
        group: 'advanced_timing',
        editable: true,
        options: [
          { value: 'not_started', label: 'Not Started' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
        helpText: 'Current work status',
        width: 140,
      },
      {
        name: 'is_critical',
        label: 'Critical Path',
        type: 'checkbox',
        mode: 'detail',
        group: 'advanced_timing',
        editable: false,
        readonly: true,
        computed: true,
        helpText: 'Automatically determined by CPM calculation',
        width: 80,
      },
      {
        name: 'float_days',
        label: 'Float (Days)',
        type: 'number',
        mode: 'detail',
        group: 'advanced_timing',
        editable: false,
        readonly: true,
        computed: true,
        helpText: 'Schedule slack from CPM calculation',
        width: 100,
      },
      {
        name: 'early_start_date',
        label: 'Early Start',
        type: 'date',
        mode: 'detail',
        group: 'advanced_timing',
        editable: false,
        readonly: true,
        computed: true,
        helpText: 'Earliest possible start from CPM',
        width: 140,
      },
      {
        name: 'late_finish_date',
        label: 'Late Finish',
        type: 'date',
        mode: 'detail',
        group: 'advanced_timing',
        editable: false,
        readonly: true,
        computed: true,
        helpText: 'Latest possible finish from CPM',
        width: 140,
      },
      {
        name: 'dependency_count',
        label: 'Dependencies',
        type: 'link',
        mode: 'detail',
        group: 'advanced_timing',
        editable: false,
        computed: true,
        helpText: 'Click to view predecessor/successor relationships',
        width: 100,
      },
    ],
  },
  {
    id: 'financial_controls',
    label: 'Financial Controls',
    mode: 'detail',
    collapsed: true,
    color: '#dc3545',
    fields: [
      {
        name: 'budget_version',
        label: 'Budget Version',
        type: 'dropdown',
        mode: 'detail',
        group: 'financial_controls',
        editable: true,
        options: [
          { value: 'original', label: 'Original' },
          { value: 'revised', label: 'Revised' },
          { value: 'forecast', label: 'Forecast' },
        ],
        helpText: 'Budget lifecycle stage',
        width: 140,
      },
      {
        name: 'version_as_of_date',
        label: 'Version Date',
        type: 'date',
        mode: 'detail',
        group: 'financial_controls',
        editable: true,
        helpText: 'When this budget version was created',
        width: 140,
      },
      {
        name: 'funding_id',
        label: 'Funding Source',
        type: 'number',
        mode: 'detail',
        group: 'financial_controls',
        editable: true,
        helpText: 'Which funding source pays for this (debt/equity)',
        width: 140,
      },
      {
        name: 'funding_draw_pct',
        label: 'Funding %',
        type: 'percentage',
        mode: 'detail',
        group: 'financial_controls',
        editable: true,
        validation: { min: 0, max: 100 },
        helpText: 'What percentage funded by selected source (vs other sources)',
        width: 100,
      },
      {
        name: 'draw_schedule',
        label: 'Draw Schedule',
        type: 'dropdown',
        mode: 'detail',
        group: 'financial_controls',
        editable: true,
        options: [
          { value: 'as_incurred', label: 'As Incurred' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'milestone', label: 'Milestone-Based' },
        ],
        helpText: 'When funds are drawn from source',
        width: 160,
      },
      {
        name: 'retention_pct',
        label: 'Retention %',
        type: 'percentage',
        mode: 'detail',
        group: 'financial_controls',
        editable: true,
        validation: { min: 0, max: 100 },
        helpText: 'Holdback percentage (typically construction items)',
        width: 100,
      },
      {
        name: 'payment_terms',
        label: 'Payment Terms',
        type: 'text',
        mode: 'detail',
        group: 'financial_controls',
        editable: true,
        helpText: 'Vendor payment terms (e.g., net_30, net_60)',
        width: 120,
      },
      {
        name: 'invoice_frequency',
        label: 'Invoice Frequency',
        type: 'dropdown',
        mode: 'detail',
        group: 'financial_controls',
        editable: true,
        options: [
          { value: 'monthly', label: 'Monthly' },
          { value: 'milestone', label: 'Milestone' },
          { value: 'completion', label: 'Upon Completion' },
        ],
        helpText: 'How often invoices are issued',
        width: 160,
      },
      {
        name: 'cost_allocation',
        label: 'Cost Allocation',
        type: 'dropdown',
        mode: 'detail',
        group: 'financial_controls',
        editable: true,
        options: [
          { value: 'direct', label: 'Direct to Parcel' },
          { value: 'shared', label: 'Shared Pool' },
          { value: 'pro_rata', label: 'Pro-Rata' },
        ],
        helpText: 'How cost allocates to land parcels',
        width: 160,
      },
      {
        name: 'is_reimbursable',
        label: 'Reimbursable',
        type: 'checkbox',
        mode: 'detail',
        group: 'financial_controls',
        editable: true,
        helpText: 'Can recover from buyers/tenants',
        width: 80,
      },
    ],
  },
  {
    id: 'period_allocation',
    label: 'Period Allocation',
    mode: 'detail',
    collapsed: true,
    color: '#dc3545',
    fields: [
      {
        name: 'allocation_method',
        label: 'Allocation Method',
        type: 'dropdown',
        mode: 'detail',
        group: 'period_allocation',
        editable: true,
        options: [
          { value: 'even', label: 'Even Spread' },
          { value: 'curve', label: 'S-Curve' },
          { value: 'custom', label: 'Custom' },
        ],
        helpText: 'How costs distribute across periods',
        width: 150,
      },
      {
        name: 'cf_start_flag',
        label: 'CF Start Flag',
        type: 'checkbox',
        mode: 'detail',
        group: 'period_allocation',
        editable: true,
        helpText: 'Marks beginning of cash flow for this category',
        width: 80,
      },
      {
        name: 'cf_distribution',
        label: 'Distribution Pattern',
        type: 'text',
        mode: 'detail',
        group: 'period_allocation',
        editable: false,
        readonly: true,
        computed: true,
        helpText: 'Summary of allocation pattern (e.g., "45% months 1-3, 55% months 4-8")',
        width: 250,
      },
      {
        name: 'allocated_total',
        label: 'Allocated Total',
        type: 'currency',
        mode: 'detail',
        group: 'period_allocation',
        editable: false,
        readonly: true,
        helpText: 'Sum of all period allocations',
        width: 140,
      },
      {
        name: 'allocation_variance',
        label: 'Allocation Variance',
        type: 'currency',
        mode: 'detail',
        group: 'period_allocation',
        editable: false,
        readonly: true,
        computed: true,
        helpText: 'Difference between allocated total and line item amount (should be $0)',
        width: 140,
      },
    ],
  },
  {
    id: 'documentation',
    label: 'Documentation & Audit',
    mode: 'detail',
    collapsed: true,
    color: '#dc3545',
    fields: [
      {
        name: 'bid_date',
        label: 'Bid Date',
        type: 'date',
        mode: 'detail',
        group: 'documentation',
        editable: true,
        helpText: 'When estimate/quote was received',
        width: 140,
      },
      {
        name: 'bid_amount',
        label: 'Bid Amount',
        type: 'currency',
        mode: 'detail',
        group: 'documentation',
        editable: true,
        helpText: 'Original quoted amount',
        width: 140,
      },
      {
        name: 'bid_variance',
        label: 'Bid Variance',
        type: 'currency',
        mode: 'detail',
        group: 'documentation',
        editable: false,
        readonly: true,
        computed: true,
        helpText: 'Current amount minus bid amount',
        width: 140,
      },
      {
        name: 'change_order_count',
        label: 'Change Orders',
        type: 'number',
        mode: 'detail',
        group: 'documentation',
        editable: false,
        readonly: true,
        helpText: 'Number of change orders against this item',
        width: 100,
      },
      {
        name: 'change_order_total',
        label: 'Change Order Total',
        type: 'currency',
        mode: 'detail',
        group: 'documentation',
        editable: false,
        readonly: true,
        helpText: 'Net $ impact of all change orders',
        width: 140,
      },
      {
        name: 'approval_status',
        label: 'Approval Status',
        type: 'dropdown',
        mode: 'detail',
        group: 'documentation',
        editable: true,
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ],
        helpText: 'Current approval status',
        width: 140,
      },
      {
        name: 'approved_by',
        label: 'Approved By',
        type: 'user-lookup',
        mode: 'detail',
        group: 'documentation',
        editable: false,
        readonly: true,
        helpText: 'User who approved this item',
        width: 140,
      },
      {
        name: 'approval_date',
        label: 'Approval Date',
        type: 'date',
        mode: 'detail',
        group: 'documentation',
        editable: false,
        readonly: true,
        helpText: 'When approval was granted',
        width: 140,
      },
      {
        name: 'document_count',
        label: 'Documents',
        type: 'link',
        mode: 'detail',
        group: 'documentation',
        editable: false,
        computed: true,
        helpText: 'Number of attached files (contracts, invoices, etc.)',
        width: 100,
      },
      {
        name: 'last_modified_by',
        label: 'Modified By',
        type: 'user-lookup',
        mode: 'detail',
        group: 'documentation',
        editable: false,
        readonly: true,
        helpText: 'User who last edited this item',
        width: 140,
      },
      {
        name: 'last_modified_date',
        label: 'Modified Date',
        type: 'datetime',
        mode: 'detail',
        group: 'documentation',
        editable: false,
        readonly: true,
        helpText: 'When this item was last changed',
        width: 160,
      },
    ],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get field groups visible for a given mode
 */
export function getFieldGroupsByMode(mode: BudgetMode): FieldGroup[] {
  if (mode === 'napkin') return []; // No expandable row in napkin
  if (mode === 'standard') return budgetFieldGroups.filter((g) => g.mode === 'standard');
  if (mode === 'detail') return budgetFieldGroups; // Show all groups
  return [];
}

/**
 * Check if field should be visible based on dependencies
 */
/**
 * Helper function to check if project is Land Development type
 */
function isLandDevelopmentProject(projectTypeCode?: string): boolean {
  if (!projectTypeCode) return false;
  return LAND_DEVELOPMENT_SUBTYPES.some(
    subtype => projectTypeCode.toUpperCase() === subtype.toUpperCase()
  );
}

/**
 * Determines if a field should be shown based on field dependencies and project type
 * @param field - Field configuration
 * @param item - Budget item data
 * @param projectTypeCode - Optional project type code for filtering
 */
export function shouldShowField(
  field: FieldConfig,
  item: BudgetItem,
  projectTypeCode?: string
): boolean {
  // Hide CPM fields (Advanced Timing group) for Land Development projects
  if (field.group === 'advanced_timing' && isLandDevelopmentProject(projectTypeCode)) {
    return false;
  }

  // Handle field dependencies (e.g., curve fields only show when timing_method='curve')
  if (!field.dependsOn || field.dependsOn.length === 0) return true;

  // Example: curve_profile and curve_steepness only show when timing_method = 'curve'
  if (field.dependsOn.includes('timing_method')) {
    return item.timing_method === 'curve';
  }

  return true;
}

/**
 * Get all fields for a given mode (flat array)
 */
export function getAllFieldsByMode(mode: BudgetMode): FieldConfig[] {
  const groups = getFieldGroupsByMode(mode);
  return groups.flatMap((group) => group.fields);
}

/**
 * Count fields by mode
 */
export function getFieldCountByMode(mode: BudgetMode): number {
  return getAllFieldsByMode(mode).length;
}
