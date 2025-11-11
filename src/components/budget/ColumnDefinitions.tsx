// v1.0 · 2025-11-02 · Column sets by mode
import { ColumnDef } from '@tanstack/react-table';
import { CButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilTrash } from '@coreui/icons';
import EditableCell from './custom/EditableCell';
import ColoredDotIndicator from './custom/ColoredDotIndicator';
import PhaseCell from './custom/PhaseCell';
import type { BudgetMode } from './ModeSelector';
import { formatMoney, formatNumber } from '@/utils/formatters/number';
import type { UnitCostTemplateSummary } from '@/types/benchmarks';

export interface BudgetItem {
  fact_id: number;
  container_id?: number | null;
  project_id?: number;
  // Container display fields
  container_name?: string | null;
  container_display?: string | null; // e.g., "Area A Phase 1" or "Project-Level"
  // Legacy category field (for backward compatibility)
  category_id: number;
  category_name?: string;
  category_code?: string;
  // New category hierarchy fields
  category_l1_id?: number | null;
  category_l2_id?: number | null;
  category_l3_id?: number | null;
  category_l4_id?: number | null;
  // Category names for display
  category_l1_name?: string | null;
  category_l2_name?: string | null;
  category_l3_name?: string | null;
  category_l4_name?: string | null;
  // Category breadcrumb for display
  category_breadcrumb?: string;
  scope?: string | null;
  qty: number | null;
  rate: number | null;
  amount: number | null;
  uom_code: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_period: number | null;
  periods_to_complete: number | null;
  end_period?: number | null;
  vendor_name?: string | null;
  notes: string | null;
  confidence_level?: string | null;
  escalation_rate?: number | null;
  contingency_pct?: number | null;
  timing_method?: string | null;
  funding_id?: number | null;
  curve_id?: number | null;
  milestone_id?: number | null;
  cf_start_flag?: boolean | null;
}

// Use standard formatters from UI_STANDARDS_v1.0.md
const moneyFmt = (value?: number | null) => formatMoney(value);
const numberFmt = (value?: number | null) => formatNumber(value);

type ColumnHandlers = {
  onInlineCommit?: (
    item: BudgetItem,
    field: keyof BudgetItem,
    value: unknown
  ) => Promise<void> | void;
  onOpenModal?: (item: BudgetItem) => void;
  projectId?: number;
  projectTypeCode?: string;
  mode?: BudgetMode;
  onCategoryClick?: (item: BudgetItem) => void;
  isGrouped?: boolean;
  onRowAdd?: (item: BudgetItem) => void;
  onRowDelete?: (item: BudgetItem) => void;
};

const editableCell = (ctx: any) => <EditableCell {...ctx} />;

const uomOptions = [
  { value: 'EA', label: 'Each' },
  { value: 'AC', label: 'Acre' },
  { value: 'SF', label: 'Square Feet' },
  { value: 'LF', label: 'Linear Feet' },
  { value: 'CY', label: 'Cubic Yards' },
  { value: 'LOT', label: 'Lot' },
];

export function getColumnsByMode(
  mode: BudgetMode,
  handlers: ColumnHandlers = {}
): ColumnDef<BudgetItem>[] {
  const createMeta = (
    field: keyof BudgetItem,
    inputType: 'text' | 'number' | 'currency' | 'select',
    options?: { value: string; label: string }[]
  ) => ({
    editable: Boolean(handlers.onInlineCommit),
    inputType,
    options,
    projectTypeCode: handlers.projectTypeCode,
    onCommit: async (value: unknown, row: BudgetItem) => {
      if (handlers.onInlineCommit) {
        await handlers.onInlineCommit(row, field, value);
      }
    },
  });

  const napkinColumns: ColumnDef<BudgetItem>[] = [
    {
      accessorKey: 'container_id',
      header: 'Phase',
      size: 180,
      minSize: 150,
      maxSize: 300,
      cell: (ctx) => (
        <PhaseCell
          row={ctx.row}
          projectId={handlers.projectId}
          onCommit={async (value: number | null) => {
            if (handlers.onInlineCommit) {
              await handlers.onInlineCommit(ctx.row.original, 'container_id', value);
            }
          }}
        />
      ),
    },
    {
      accessorKey: 'category_l1_id',
      header: 'Category',
      size: 200,
      minSize: 150,
      maxSize: 400,
      meta: {
        editable: Boolean(handlers.onInlineCommit),
        inputType: 'category-select' as const,
        projectId: handlers.projectId,
        isGrouped: handlers.isGrouped,
        onCommit: async (value: unknown, row: BudgetItem) => {
          if (handlers.onInlineCommit) {
            // When L1 changes in napkin mode, only update L1
            // Let the backend handle clearing L2-L4 if needed
            await handlers.onInlineCommit(row, 'category_l1_id', value);
          }
        },
      },
      cell: editableCell,
    },
    {
      accessorKey: 'notes',
      header: 'Description',
      size: 400,
      minSize: 50,
      meta: {
        ...createMeta('notes', 'text'),
        inputType: 'template-autocomplete' as const,
        onAutocompleteSelect: async (template: UnitCostTemplateSummary, row: BudgetItem) => {
          if (!handlers.onInlineCommit) return;

          await handlers.onInlineCommit(row, 'notes', template.item_name);

          if (template.default_uom_code) {
            await handlers.onInlineCommit(row, 'uom_code', template.default_uom_code);
          }

          if (template.typical_mid_value !== null && template.typical_mid_value !== undefined) {
            await handlers.onInlineCommit(row, 'rate', template.typical_mid_value);
          }

          try {
            await fetch(`/api/unit-costs/templates/${template.template_id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                usage_count: (template.usage_count ?? 0) + 1,
                last_used_date: new Date().toISOString().split('T')[0],
              }),
            });
          } catch (error) {
            console.error('Failed to increment template usage', error);
          }
        },
      },
      cell: editableCell,
    },
    {
      accessorKey: 'qty',
      header: 'Qty',
      size: 90,
      meta: {
        ...createMeta('qty', 'number'),
        kind: 'numeric' as const,
      },
      cell: editableCell,
    },
    {
      accessorKey: 'uom_code',
      header: 'UOM',
      size: 80,
      meta: createMeta('uom_code', 'select', uomOptions),
      cell: editableCell,
    },
    {
      accessorKey: 'rate',
      header: () => <div className="text-end">Rate</div>,
      size: 120,
      meta: {
        ...createMeta('rate', 'currency'),
        kind: 'numeric' as const,
      },
      cell: editableCell,
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-end">Amount</div>,
      size: 130,
      cell: ({ getValue }) => (
        <span className="text-success fw-semibold text-end d-block tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {moneyFmt(getValue() as number | null)}
        </span>
      ),
    },
    {
      accessorKey: 'start_period',
      header: 'Start',
      size: 80,
      cell: ({ row }) => (
        <span className="text-center d-block tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {row.original.start_period ?? '-'}
        </span>
      ),
    },
    {
      accessorKey: 'periods_to_complete',
      header: 'Duration',
      size: 100,
      cell: ({ row }) => (
        <span className="text-center d-block tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {row.original.periods_to_complete ?? '-'}
        </span>
      ),
    },
  ];

  const actionsColumn: ColumnDef<BudgetItem> = {
    id: 'actions',
    header: '',
    size: 80,
    minSize: 70,
    maxSize: 100,
    enableResizing: false,
    cell: ({ row }) => (
      <div className="d-flex justify-content-end gap-2">
        <CButton
          color="primary"
          size="sm"
          variant="ghost"
          className="p-1"
          onClick={(event) => {
            event.stopPropagation();
            handlers.onRowAdd?.(row.original);
          }}
          title="Add item from this row"
        >
          <CIcon icon={cilPlus} size="sm" />
        </CButton>
        <CButton
          color="danger"
          size="sm"
          variant="ghost"
          className="p-1"
          onClick={(event) => {
            event.stopPropagation();
            handlers.onRowDelete?.(row.original);
          }}
          title="Delete this budget item"
        >
          <CIcon icon={cilTrash} size="sm" />
        </CButton>
      </div>
    ),
  };

  const napkinWithActions = [...napkinColumns, actionsColumn];

  if (mode === 'napkin') {
    return napkinWithActions;
  }

  const openModalCell = (ctx: any) => {
    const raw = ctx.getValue();
    const display =
      raw === null || raw === undefined || raw === ''
        ? '-'
        : typeof raw === 'number'
          ? raw.toLocaleString()
          : String(raw);

    return (
      <div
        role="button"
        className="text-decoration-underline text-primary"
        style={{ cursor: 'pointer' }}
        onClick={() => handlers.onOpenModal?.(ctx.row.original)}
      >
        {display}
      </div>
    );
  };

  // Category cell for standard/detail modes - clickable to open CategoryEditorRow
  const categoryClickCell = (ctx: any) => {
    const row = ctx.row.original;
    // Show the most granular category name with colored dots
    const categoryName = row.category_l4_name || row.category_l3_name || row.category_l2_name || row.category_l1_name || '-';

    return (
      <div
        role="button"
        className="d-flex align-items-center gap-2"
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation(); // Prevent row selection
          handlers.onCategoryClick?.(row);
        }}
      >
        <ColoredDotIndicator
          categoryL1Name={row.category_l1_name}
          categoryL2Name={row.category_l2_name}
          categoryL3Name={row.category_l3_name}
          categoryL4Name={row.category_l4_name}
          isGrouped={handlers.isGrouped || false}
        />
      </div>
    );
  };

  // Create standard columns by replacing the category column
  const napkinWithoutCategory = napkinColumns.filter(col => col.accessorKey !== 'category_l1_id');

  // Extract phase column and other columns separately
  const phaseColumn = napkinColumns.find(col => col.accessorKey === 'container_id');
  const napkinWithoutCategoryAndPhase = napkinWithoutCategory.filter(col => col.accessorKey !== 'container_id');

  // Split remaining columns to insert variance after amount
  const napkinBeforeAmount = napkinWithoutCategoryAndPhase.filter(col => col.accessorKey !== 'start_period' && col.accessorKey !== 'periods_to_complete');
  const napkinTimingColumns = napkinWithoutCategoryAndPhase.filter(col => col.accessorKey === 'start_period' || col.accessorKey === 'periods_to_complete');

  const standard: ColumnDef<BudgetItem>[] = [
    // Phase column comes first
    ...(phaseColumn ? [phaseColumn] : []),
    // Add clickable category column for standard/detail modes
    {
      accessorKey: 'category_l1_id',
      header: 'Category',
      size: 200,
      minSize: 150,
      maxSize: 400,
      cell: categoryClickCell,
    },
    ...napkinBeforeAmount,
    // Variance column - positioned after Amount (Standard and Detail modes only)
    {
      accessorKey: 'variance_amount',
      header: 'Var',
      size: 100,
      cell: () => (
        <span className="text-muted text-center d-block" style={{ fontSize: '0.875rem' }}>
          -
        </span>
      ),
    },
    ...napkinTimingColumns,
  ];

  // Standard and Detail modes now use expandable rows for additional fields
  // No need to add extra columns here
  if (mode === 'standard' || mode === 'detail') {
    return standard;
  }

  return standard;
}
