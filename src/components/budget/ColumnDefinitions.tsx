// v2.0 · 2025-11-15 · Column sets by mode with expanded type support
import { ColumnDef } from '@tanstack/react-table';
import { CButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilTrash, cilObjectGroup } from '@coreui/icons';
import EditableCell from './custom/EditableCell';
import ColoredDotIndicator from './custom/ColoredDotIndicator';
import PhaseCell from './custom/PhaseCell';
import type { BudgetMode, BudgetItem } from '@/types/budget';
import { formatMoney, formatNumber } from '@/utils/formatters/number';
import type { UnitCostTemplateSummary } from '@/types/benchmarks';

// Re-export BudgetItem for backward compatibility
export type { BudgetItem };

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
  onGroupByPhase?: () => void;
  onGroupByStage?: () => void;
  onGroupByCategory?: () => void;
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
      accessorKey: 'division_id',
      header: () => (
        <div className="d-flex align-items-center gap-2">
          <span>Phase</span>
          {handlers.onGroupByPhase && (
            <CIcon
              icon={cilObjectGroup}
              size="lg"
              className="text-muted"
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                handlers.onGroupByPhase?.();
              }}
              title="Group by Phase"
            />
          )}
        </div>
      ),
      size: 180,
      minSize: 150,
      maxSize: 300,
      cell: (ctx) => (
        <PhaseCell
          row={ctx.row}
          projectId={handlers.projectId}
          onCommit={async (value: number | null) => {
            if (handlers.onInlineCommit) {
              await handlers.onInlineCommit(ctx.row.original, 'division_id', value);
            }
          }}
        />
      ),
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
      header: () => <div className="text-center">Qty</div>,
      size: 90,
      meta: {
        ...createMeta('qty', 'number'),
        kind: 'numeric' as const,
        align: 'center' as const,
      },
      cell: editableCell,
    },
    {
      accessorKey: 'uom_code',
      header: () => <div className="text-center">UOM</div>,
      size: 80,
      meta: {
        ...createMeta('uom_code', 'select', uomOptions),
        align: 'center' as const,
      },
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
      header: () => <div className="text-center">Start</div>,
      size: 80,
      meta: {
        align: 'center' as const,
      },
      cell: ({ row }) => (
        <span className="text-center d-block tnum" style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>
          {row.original.start_period ?? '-'}
        </span>
      ),
    },
    {
      accessorKey: 'periods_to_complete',
      header: () => <div className="text-center">Duration</div>,
      size: 100,
      meta: {
        align: 'center' as const,
      },
      cell: ({ row }) => (
        <span className="text-center d-block tnum" style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>
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

  // =========================================================================
  // STANDARD/DETAIL MODE COLUMNS (Stage and Category only visible here)
  // =========================================================================

  const stageColumn: ColumnDef<BudgetItem> = {
    accessorKey: 'activity',
    header: () => (
      <div className="d-flex align-items-center gap-2">
        <span>Stage</span>
        {handlers.onGroupByStage && (
          <CIcon
            icon={cilObjectGroup}
            size="lg"
            className="text-muted"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              handlers.onGroupByStage?.();
            }}
            title="Group by Stage"
          />
        )}
      </div>
    ),
    size: 140,
    minSize: 120,
    maxSize: 180,
    meta: createMeta('activity', 'select', [
      { value: 'Acquisition', label: 'Acquisition' },
      { value: 'Planning & Engineering', label: 'Planning & Engineering' },
      { value: 'Development', label: 'Development' },
      { value: 'Operations', label: 'Operations' },
      { value: 'Disposition', label: 'Disposition' },
      { value: 'Financing', label: 'Financing' },
    ]),
    cell: editableCell,
  };

  const categoryEditableColumn: ColumnDef<BudgetItem> = {
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
          await handlers.onInlineCommit(row, 'category_l1_id', value);
        }
      },
    },
    cell: editableCell,
  };

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

  // Extract phase column from napkin columns
  const phaseColumn = napkinColumns.find(col => 'accessorKey' in col && col.accessorKey === 'division_id');

  // Get napkin columns without phase for reuse in standard mode
  const napkinWithoutPhase = napkinColumns.filter(col =>
    'accessorKey' in col && col.accessorKey !== 'division_id'
  );

  // Split remaining columns to insert variance after amount
  const napkinBeforeAmount = napkinWithoutPhase.filter(col =>
    'accessorKey' in col && col.accessorKey !== 'start_period' && col.accessorKey !== 'periods_to_complete'
  );
  const napkinTimingColumns = napkinWithoutPhase.filter(col =>
    'accessorKey' in col && (col.accessorKey === 'start_period' || col.accessorKey === 'periods_to_complete')
  );

  // Category column for Detail mode only (with grouping icon, inline editable)
  const categoryColumnWithGroup: ColumnDef<BudgetItem> = {
    accessorKey: 'category_l1_id',
    header: () => (
      <div className="d-flex align-items-center gap-2">
        <span>Category</span>
        {handlers.onGroupByCategory && (
          <CIcon
            icon={cilObjectGroup}
            size="lg"
            className="text-muted"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              handlers.onGroupByCategory?.();
            }}
            title="Group by Category"
          />
        )}
      </div>
    ),
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
          await handlers.onInlineCommit(row, 'category_l1_id', value);
        }
      },
    },
    cell: editableCell,
  };

  // Standard mode: Phase + Stage only
  const standard: ColumnDef<BudgetItem>[] = [
    ...(phaseColumn ? [phaseColumn] : []),
    stageColumn,
    ...napkinBeforeAmount,
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

  // Detail mode: Phase + Stage + Category
  const detail: ColumnDef<BudgetItem>[] = [
    ...(phaseColumn ? [phaseColumn] : []),
    stageColumn,
    categoryColumnWithGroup,
    ...napkinBeforeAmount,
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

  if (mode === 'standard') {
    return [...standard, actionsColumn];
  }

  if (mode === 'detail') {
    return [...detail, actionsColumn];
  }

  return standard;
}
