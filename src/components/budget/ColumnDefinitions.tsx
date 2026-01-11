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
import { UOMSelect } from '@/components/common/UOMSelect';

// Re-export BudgetItem for backward compatibility
export type { BudgetItem };

export type BudgetColumnDef<TData> = ColumnDef<TData> & {
  headerClassName?: string;
  cellClassName?: string;
};

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
  hasFrontFeet?: boolean; // Whether to show Frt Ft column
  costInflationRate?: number; // Project-level cost inflation rate (decimal, e.g., 0.03 for 3%)
};

const editableCell = (ctx: any) => <EditableCell {...ctx} />;

export function getColumnsByMode(
  mode: BudgetMode,
  handlers: ColumnHandlers = {}
): BudgetColumnDef<BudgetItem>[] {
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

  const napkinColumns: BudgetColumnDef<BudgetItem>[] = [
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
      size: 140,
      minSize: 100,
      maxSize: 200,
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
      size: 160,
      minSize: 100,
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
    // Phase measurement columns (read-only, from parcel aggregation)
    // Bold when UOM matches the measurement type
    {
      accessorKey: 'phase_units',
      header: () => <div className="text-end">Units</div>,
      headerClassName: 'text-end',
      size: 60,
      minSize: 55,
      meta: { align: 'right' as const },
      cell: ({ row, getValue }) => {
        const value = getValue() as number | null;
        const uom = row.original.uom_code;
        const isBold = uom === '$/Unit' || uom === 'Unit';
        return (
          <span
            className={`text-end d-block ${isBold ? 'fw-semibold' : 'text-muted'}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {value != null && value > 0 ? numberFmt(value) : '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'phase_acres',
      header: () => <div className="text-end">Acres</div>,
      headerClassName: 'text-end',
      size: 60,
      minSize: 55,
      meta: { align: 'right' as const },
      cell: ({ row, getValue }) => {
        const value = getValue() as number | null;
        const uom = row.original.uom_code;
        const isBold = uom === 'AC' || uom === '$/AC';
        return (
          <span
            className={`text-end d-block ${isBold ? 'fw-semibold' : 'text-muted'}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {value != null && value > 0 ? numberFmt(value) : '—'}
          </span>
        );
      },
    },
    // Frt Ft column - conditionally included based on hasFrontFeet
    ...(handlers.hasFrontFeet !== false ? [{
      accessorKey: 'phase_front_feet',
      header: () => <div className="text-end">Frt Ft</div>,
      headerClassName: 'text-end',
      size: 75,
      minSize: 65,
      meta: { align: 'right' as const },
      cell: ({ row, getValue }: { row: any; getValue: () => unknown }) => {
        const value = getValue() as number | null;
        const uom = row.original.uom_code;
        const isBold = uom === 'FF' || uom === '$/FF';
        return (
          <span
            className={`text-end d-block ${isBold ? 'fw-semibold' : 'text-muted'}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {value != null && value > 0 ? numberFmt(value) : '—'}
          </span>
        );
      },
    } as BudgetColumnDef<BudgetItem>] : []),
    {
      accessorKey: 'uom_code',
      header: () => <div className="text-center">UOM</div>,
      size: 95,
      minSize: 90,
      meta: { align: 'center' as const },
      cell: ({ row }) => (
        <div
          className="d-flex justify-content-center"
          style={{ minWidth: 90 }}
          onClick={(e) => e.stopPropagation()}
        >
          <UOMSelect
            context="budget_cost"
            value={row.original.uom_code || ''}
            disabled={!handlers.onInlineCommit}
            onChange={async (code) => {
              if (!handlers.onInlineCommit) return;

              // Update UOM first
              await handlers.onInlineCommit(row.original, 'uom_code', code);

              // Auto-populate qty if currently empty/zero
              const currentQty = row.original.qty;
              if (!currentQty || currentQty === 0) {
                let autoQty: number | null = null;

                switch (code) {
                  case 'AC':
                    autoQty = row.original.phase_acres ?? null;
                    break;
                  case 'FF':
                    autoQty = row.original.phase_front_feet ?? null;
                    break;
                  case 'LS':
                  case '$$$':
                    autoQty = 1;
                    break;
                }

                if (autoQty !== null) {
                  await handlers.onInlineCommit(row.original, 'qty', Math.round(autoQty));
                }
              }
            }}
            className="w-100"
          />
        </div>
      ),
    },
    {
      accessorKey: 'rate',
      header: () => <div className="text-end">Rate</div>,
      headerClassName: 'text-end',
      size: 80,
      meta: {
        ...createMeta('rate', 'currency'),
        kind: 'numeric' as const,
        align: 'right' as const,
      },
      cell: editableCell,
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-end">Amount</div>,
      headerClassName: 'text-end',
      size: 130,
      cellClassName: 'text-end',
      meta: { align: 'right' as const },
      cell: ({ getValue }) => (
        <span className="text-success fw-semibold text-end d-block tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {moneyFmt(getValue() as number | null)}
        </span>
      ),
    },
    {
      id: 'escalated_amount',
      header: () => <div className="text-end">Escalated</div>,
      headerClassName: 'text-end',
      size: 130,
      cellClassName: 'text-end',
      meta: { align: 'right' as const },
      cell: ({ row }) => {
        const item = row.original;
        const baseAmount = item.amount;
        const startPeriod = item.start_period;

        // Use project-level cost inflation rate if available, fall back to per-item rate
        // costInflationRate is decimal (e.g., 0.03), item.escalation_rate is percentage (e.g., 3.0)
        const escalationRate = handlers.costInflationRate !== undefined
          ? handlers.costInflationRate * 100 // Convert decimal to percentage for consistency
          : item.escalation_rate;

        // If no amount, show dash
        if (!baseAmount) {
          return <span className="text-muted text-end d-block">—</span>;
        }

        // If no escalation rate or no start period, show base amount (rounded)
        if (!escalationRate || !startPeriod) {
          return (
            <span className="text-end d-block tnum" style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--cui-body-color)' }}>
              {moneyFmt(Math.round(baseAmount))}
            </span>
          );
        }

        // Calculate escalation: years from project start (period 1 = month 0)
        const yearsFromStart = Math.max(0, (startPeriod - 1) / 12);
        const rate = escalationRate / 100; // Convert percentage to decimal
        const escalatedAmount = Math.round(baseAmount * Math.pow(1 + rate, yearsFromStart));

        // Show escalated amount in primary color if different from base
        const isDifferent = Math.abs(escalatedAmount - baseAmount) > 0.01;
        return (
          <span
            className="fw-semibold text-end d-block tnum"
            style={{
              fontVariantNumeric: 'tabular-nums',
              color: isDifferent ? 'var(--cui-primary)' : 'var(--cui-body-color)'
            }}
          >
            {moneyFmt(escalatedAmount)}
          </span>
        );
      },
    },
    {
      accessorKey: 'start_period',
      header: () => <div className="text-center">Start</div>,
      size: 80,
      meta: {
        ...createMeta('start_period', 'number'),
        kind: 'numeric' as const,
        align: 'center' as const,
      },
      cell: editableCell,
    },
    {
      accessorKey: 'periods_to_complete',
      header: () => <div className="text-center">Duration</div>,
      size: 100,
      meta: {
        ...createMeta('periods_to_complete', 'number'),
        kind: 'numeric' as const,
        align: 'center' as const,
      },
      cell: editableCell,
    },
  ];

  const actionsColumn: BudgetColumnDef<BudgetItem> = {
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

  const stageColumn: BudgetColumnDef<BudgetItem> = {
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
      { value: 'Improvements', label: 'Improvements' },  // Renamed from Development
      { value: 'Operations', label: 'Operations' },
      { value: 'Disposition', label: 'Disposition' },
      { value: 'Financing', label: 'Financing' },
    ]),
    cell: editableCell,
  };

  const categoryEditableColumn: BudgetColumnDef<BudgetItem> = {
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
  // Include both data columns (accessorKey) and computed columns (id)
  const napkinWithoutPhase = napkinColumns.filter(col => {
    if ('accessorKey' in col) {
      return col.accessorKey !== 'division_id';
    }
    // Include computed columns like escalated_amount
    return 'id' in col && col.id === 'escalated_amount';
  });

  // Split remaining columns to insert variance after amount
  // Include columns with accessorKey (data fields) and id (computed columns like escalated_amount)
  const napkinBeforeAmount = napkinWithoutPhase.filter(col => {
    if ('accessorKey' in col) {
      return col.accessorKey !== 'start_period' && col.accessorKey !== 'periods_to_complete';
    }
    // Include computed columns like escalated_amount
    if ('id' in col && col.id === 'escalated_amount') {
      return true;
    }
    return false;
  });
  const napkinTimingColumns = napkinWithoutPhase.filter(col =>
    'accessorKey' in col && (col.accessorKey === 'start_period' || col.accessorKey === 'periods_to_complete')
  );

  // Category column for Detail mode only (with grouping icon, inline editable)
  const categoryColumnWithGroup: BudgetColumnDef<BudgetItem> = {
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
  const standard: BudgetColumnDef<BudgetItem>[] = [
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
  const detail: BudgetColumnDef<BudgetItem>[] = [
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
