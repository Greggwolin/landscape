/**
 * Growth Rate Category Panel
 * Inline editor for adding and updating inflation factor sets.
 */

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, Plus, Globe, User } from 'lucide-react';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilX } from '@coreui/icons';
import type {
  BenchmarkCategory,
  GrowthRateSet,
  GrowthRateStep,
  GrowthRateStepInput
} from '@/types/benchmarks';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from '@tanstack/react-table';

interface Props {
  category: BenchmarkCategory;
  sets: GrowthRateSet[];
  isExpanded: boolean;
  loading?: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  onSelectSet?: (set: GrowthRateSet) => void;
  selectedSetId?: number | null;
}

type RateMode = 'flat' | 'stepped';

type StepForm = {
  step_number: number;
  from_period: number;
  periods: number | 'E';
  rate: number; // Stored as percent (e.g., 3 for 3%)
  thru_period: number | 'E';
};

type PreparedPayload = {
  name: string;
  steps: GrowthRateStepInput[];
};

export default function GrowthRateCategoryPanel({
  category,
  sets,
  isExpanded,
  loading = false,
  onToggle,
  onRefresh,
  onSelectSet,
  selectedSetId
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="border-b border-line-strong">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-card transition-colors"
        style={{ backgroundColor: 'var(--surface-card-header)' }}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown size={20} className="text-text-secondary" />
          ) : (
            <ChevronRight size={20} className="text-text-secondary" />
          )}
          <span className="font-medium">{category.label}</span>
        </div>
        <span className="text-sm text-text-secondary">{sets.length}</span>
      </button>

      {isExpanded && (
        <div className="bg-surface-card px-4 py-4 space-y-4">
          {loading ? (
            <div className="py-6 text-center text-sm text-text-secondary">
              Loading growth rates...
            </div>
          ) : sets.length === 0 ? (
            <div className="py-6 text-center text-sm text-text-secondary">
              No growth rates yet. Click &ldquo;Add New Growth Rate&rdquo; to begin.
            </div>
          ) : (
            <div className="space-y-3">
              {sets.map((set) => (
                <GrowthRateListItem
                  key={set.set_id}
                  set={set}
                  onRefresh={onRefresh}
                  onSelect={() => onSelectSet?.(set)}
                  isSelected={selectedSetId === set.set_id}
                />
              ))}
            </div>
          )}

          {showAddForm ? (
            <GrowthRateForm
              mode="create"
              existingSets={sets}
              onCancel={() => {
                setShowAddForm(false);
              }}
              onSuccess={() => {
                setShowAddForm(false);
                onRefresh();
              }}
              onSubmit={async (payload) => {
                await saveGrowthRateSet(payload);
              }}
            />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full rounded border border-brand-primary bg-surface-bg px-3 py-2 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary/10"
            >
              + Add New Growth Rate
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function GrowthRateListItem({
  set,
  onRefresh,
  onSelect,
  isSelected = false
}: {
  set: GrowthRateSet;
  onRefresh: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [inlineRate, setInlineRate] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const canEdit = set.rate_type !== 'auto_updated' && !set.is_system;
  const handleTileSelect = () => {
    onSelect?.();
  };
  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.();
    }
  };

  const initialSteps = useMemo(() => {
    if (!set.steps || set.steps.length === 0) return undefined;
    return convertStepsToForm(set.steps);
  }, [set.steps]);

  const initialFlatRate =
    set.rate_type === 'flat' && typeof set.current_rate === 'number'
      ? roundToTwo(set.current_rate * 100)
      : undefined;

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${set.set_name}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteGrowthRateSet(set.set_id);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete growth rate:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete growth rate');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInlineEdit = () => {
    if (set.rate_type === 'flat' && typeof set.current_rate === 'number') {
      onSelect?.();
      setInlineRate(roundToTwo(set.current_rate * 100).toString());
      setIsEditingInline(true);
    }
  };

  const handleInlineSave = async () => {
    const rate = parseFloat(inlineRate);
    if (isNaN(rate) || rate < -100 || rate > 100) {
      alert('Please enter a valid rate between -100% and 100%');
      return;
    }

    try {
      const payload = {
        name: set.set_name,
        steps: [{
          from_period: 1,
          periods: 'E' as const,
          rate: rate,
          thru_period: 'E' as const
        }]
      };
      await updateGrowthRateSet(set.set_id, payload);
      setIsEditingInline(false);
      onRefresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update rate');
    }
  };

  const handleInlineCancel = () => {
    setIsEditingInline(false);
    setInlineRate('');
  };

  if (isEditing && canEdit) {
    return (
      <GrowthRateForm
        mode="edit"
        initialName={set.set_name}
        initialRateType={set.rate_type === 'stepped' ? 'stepped' : 'flat'}
        initialFlatRate={initialFlatRate}
        initialSteps={initialSteps}
        initialIsGlobal={set.is_global}
        onCancel={() => {
          setIsEditing(false);
          setApiError(null);
        }}
        onSuccess={() => {
          setIsEditing(false);
          setApiError(null);
          onRefresh();
        }}
        onSubmit={async (payload) => {
          await updateGrowthRateSet(set.set_id, payload);
        }}
        apiError={apiError}
        setApiError={setApiError}
      />
    );
  }

  const rateChip = deriveRateChip(set);
  const tileClasses = clsx(
    'w-full rounded border px-3 py-1 transition-colors cursor-pointer',
    isSelected ? 'border-brand-primary bg-brand-primary/5 shadow-sm' : 'border-line-strong bg-surface-card'
  );

  // Determine scope icon - Growth rates use is_global field
  const ScopeIcon = set.is_global ? Globe : User;

  return (
    <div
      className={tileClasses}
      role="button"
      tabIndex={0}
      onClick={handleTileSelect}
      onKeyDown={handleRowKeyDown}
    >
      <div className="flex items-center w-full">
        <div className="flex-1 text-sm font-medium text-text-primary">{set.set_name}</div>
        <div className="w-10 flex justify-center">
          <ScopeIcon size={16} className="text-text-secondary" />
        </div>
        <div className="w-32 flex justify-end items-center">
          {set.rate_type === 'flat' && typeof set.current_rate === 'number' ? (
            isEditingInline ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={inlineRate}
                  onChange={(e) => setInlineRate(e.target.value)}
                  className="w-20 px-2 py-1 bg-surface-card border border-brand-primary rounded text-sm text-right text-text-primary focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInlineSave();
                    if (e.key === 'Escape') handleInlineCancel();
                  }}
                />
                <span className="text-sm text-text-secondary">%</span>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleInlineSave();
                  }}
                  className="text-xs rounded bg-brand-primary px-2 py-1 text-text-inverse hover:bg-brand-primary/90 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleInlineCancel();
                  }}
                  className="text-xs rounded border border-line-strong px-2 py-1 text-text-primary hover:bg-surface-card transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleInlineEdit}
                disabled={!canEdit || isDeleting}
                className={`text-sm font-medium text-brand-primary text-right ${canEdit ? 'cursor-pointer hover:text-brand-primary/80 transition-colors' : 'cursor-default'}`}
              >
                {roundToTwo(set.current_rate * 100)}%
              </button>
            )
          ) : (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${rateChip.className}`}>
              {set.rate_type === 'stepped'
                ? `${set.step_count || (set.steps?.length ?? 0)} steps`
                : rateChip.label}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {canEdit && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                setIsEditing(true);
                onSelect?.();
              }}
              disabled={isDeleting}
              className="p-1 rounded hover:bg-surface-card/80 transition-colors disabled:opacity-50"
              title="Edit"
            >
              <CIcon icon={cilPencil} size="sm" className="text-text-primary" />
            </button>
          )}
          {canEdit && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                handleDelete();
              }}
              disabled={isDeleting}
              className="p-1 rounded hover:bg-chip-error/10 transition-colors disabled:opacity-50"
              title={isDeleting ? 'Deleting...' : 'Delete'}
            >
              <CIcon icon={cilX} size="sm" className="text-chip-error" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface GrowthRateFormProps {
  mode: 'create' | 'edit';
  initialName?: string;
  initialRateType?: RateMode;
  initialFlatRate?: number;
  initialSteps?: StepForm[];
  initialIsGlobal?: boolean;
  existingSets?: GrowthRateSet[];
  apiError?: string | null;
  setApiError?: (message: string | null) => void;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmit: (payload: PreparedPayload & { is_global?: boolean }) => Promise<void>;
}

function GrowthRateForm({
  mode,
  initialName = '',
  initialRateType = 'flat',
  initialFlatRate,
  initialSteps,
  initialIsGlobal = false,
  existingSets,
  apiError,
  setApiError,
  onCancel,
  onSuccess,
  onSubmit
}: GrowthRateFormProps) {
  const [name, setName] = useState(initialName);
  const [rateType, setRateType] = useState<RateMode>(initialRateType);
  const [flatRate, setFlatRate] = useState(
    initialFlatRate !== undefined ? String(initialFlatRate) : ''
  );
  const [steps, setSteps] = useState<StepForm[]>(
    initialSteps && initialSteps.length > 0 ? initialSteps : createDefaultSteps()
  );
  const [isGlobal, setIsGlobal] = useState(initialIsGlobal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overwriteTarget, setOverwriteTarget] = useState<GrowthRateSet | null>(null);

  useEffect(() => {
    if (!overwriteTarget) return;
    const normalized = name.trim().toLowerCase();
    if (overwriteTarget.set_name.trim().toLowerCase() !== normalized) {
      setOverwriteTarget(null);
    }
  }, [name, overwriteTarget]);

  const handleRateTypeChange = (newType: RateMode) => {
    setRateType(newType);
    if (newType === 'flat' && flatRate === '') {
      setFlatRate('3');
    }
    if (newType === 'stepped' && steps.length === 0) {
      setSteps(createDefaultSteps());
    }
    setError(null);
    setApiError?.(null);
  };

  const handleAddStep = () => {
    const last = steps[steps.length - 1];
    if (last.thru_period === 'E') {
      setError('Cannot add steps after an "E" step');
      return;
    }

    const newFrom =
      typeof last.thru_period === 'number' ? last.thru_period + 1 : last.from_period;
    const nextStep: StepForm = {
      step_number: steps.length + 1,
      from_period: newFrom,
      periods: 12,
      rate: last.rate,
      thru_period: newFrom + 11
    };
    setSteps(recalculateSteps([...steps, nextStep]));
    setError(null);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      setError('Must have at least one step');
      return;
    }
    const updated = steps.filter((_, idx) => idx !== index);
    setSteps(recalculateSteps(updated));
    setError(null);
  };

  const updateStep = (index: number, field: keyof StepForm, value: number | 'E') => {
    const updated = steps.map((step, idx) => {
      if (idx !== index) return step;
      return { ...step, [field]: value };
    });
    setSteps(recalculateSteps(updated));
    setError(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (rateType === 'flat') {
      const parsedFlat = parseFloat(flatRate);
      if (Number.isNaN(parsedFlat)) {
        setError('Enter a numeric rate for Flat');
        return;
      }

      const payload = {
        name: name.trim(),
        steps: [
          {
            from_period: 1,
            periods: 'E',
            rate: parsedFlat,
            thru_period: 'E'
          }
        ],
        is_global: isGlobal
      };
      await persist(payload);
      return;
    }

    const validationError = validateSteps(steps);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      name: name.trim(),
      steps: serializeSteps(steps),
      is_global: isGlobal
    };
    await persist(payload);
  };

  const persist = async (payload: PreparedPayload & { is_global?: boolean }) => {
    setSaving(true);
    setError(null);
    setApiError?.(null);

    try {
      if (mode === 'create' && existingSets) {
        const normalizedName = payload.name.trim().toLowerCase();
        const duplicate = existingSets.find(
          (set) => set.set_name.trim().toLowerCase() === normalizedName
        );

        if (duplicate) {
          if (!overwriteTarget || overwriteTarget.set_id !== duplicate.set_id) {
            setOverwriteTarget(duplicate);
            setError('A growth rate with this name already exists. Click Overwrite Rate to replace it.');
            setSaving(false);
            return;
          }

          console.log('Overwriting existing growth rate', { duplicate, payload });
          await updateGrowthRateSet(duplicate.set_id, payload);
          setOverwriteTarget(null);
          console.log('Growth rate overwrite successful, calling onSuccess()');
          onSuccess();
          return;
        }
      }

      console.log('Submitting new growth rate', { mode, payload });
      await onSubmit(payload);
      console.log('Growth rate submission successful, calling onSuccess()');
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save growth rate set';
      console.error('Growth rate persist failed', { mode, payload, error: err, message });
      if (setApiError) {
        setApiError(message);
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-w-[520px] px-4 py-4 rounded bg-surface-card border border-line-strong">
      <div className="space-y-4">
        <div className="flex items-end gap-4 flex-nowrap">
          <div className="flex flex-col gap-1 flex-[1_0_150px] min-w-[150px]">
            <label className="text-xs font-semibold text-text-secondary">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Custom"
              className="flex-1 px-3 py-2 bg-surface-card border border-line-strong rounded text-sm text-text-primary focus:border-brand-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-col items-center gap-1 flex-[0_0_200px]">
            <span className="text-xs font-semibold text-text-secondary">Rate Type</span>
            <div className="flex items-center gap-2 justify-center">
              <RateChip
                label="Flat"
                isActive={rateType === 'flat'}
                onClick={() => handleRateTypeChange('flat')}
              />
              <RateChip
                label="Variable"
                isActive={rateType === 'stepped'}
                onClick={() => handleRateTypeChange('stepped')}
              />
            </div>
          </div>
          {rateType === 'flat' && (
            <div className="flex flex-col items-center gap-1 flex-[0_0_90px]">
              <span className="text-xs font-semibold text-text-secondary text-center">Rate</span>
              <PercentageInput
                value={flatRate}
                onChange={setFlatRate}
                placeholder="3"
                compact
                align="center"
              />
            </div>
          )}
        </div>

        {rateType === 'stepped' && (
          <div>
            <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-semibold text-text-secondary">
              Step Schedule
            </label>
              <button
                type="button"
                onClick={handleAddStep}
                className="flex items-center gap-1 px-3 py-1.5 bg-brand-primary hover:bg-brand-primary/90 rounded-md text-xs font-medium transition-colors"
              >
                <Plus size={14} /> Add Step
              </button>
            </div>
            <GrowthRateStepTable
              steps={steps}
              onPeriodChange={(index, value) => updateStep(index, 'periods', value)}
              onRateChange={(index, value) => updateStep(index, 'rate', value)}
              onRemoveStep={handleRemoveStep}
            />
            <p className="text-xs text-text-secondary mt-2">
              Enter numbers for months or use &ldquo;E&rdquo; to carry the rate through the end.
            </p>
          </div>
        )}

        {/* Scope Level Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-line-strong">
          <div className="flex items-center gap-2">
            {isGlobal ? (
              <Globe size={16} className="text-text-secondary" />
            ) : (
              <User size={16} className="text-text-secondary" />
            )}
            <span className="text-xs text-text-secondary">
              {isGlobal ? 'Global Default' : 'Custom'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsGlobal(!isGlobal)}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              backgroundColor: isGlobal
                ? 'var(--cui-primary, #0d6efd)'
                : 'var(--cui-secondary-bg, #6c757d)'
            }}
          >
            <span
              className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              style={{
                transform: isGlobal ? 'translateX(1.5rem)' : 'translateX(0.25rem)'
              }}
            />
          </button>
        </div>

        {overwriteTarget && (
          <div className="text-xs text-amber-200 bg-amber-900/40 border border-amber-500 px-3 py-2 rounded">
            A growth rate with this name already exists. Click Overwrite Rate to replace it.
          </div>
        )}

        {(error || apiError) && (
          <div className="text-xs text-chip-error bg-chip-error/10 border border-chip-error px-3 py-2 rounded">
            {error || apiError}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1.5 text-xs bg-surface-card hover:bg-surface-card rounded"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 text-xs bg-brand-primary hover:bg-brand-primary/90 rounded disabled:bg-surface-card disabled:text-text-secondary"
        >
          {saving
            ? 'Saving…'
            : overwriteTarget
            ? 'Overwrite Rate'
            : mode === 'create'
            ? 'Save Rate'
            : 'Update Rate'}
        </button>
      </div>
    </div>
  );
}

function GrowthRateStepTable({
  steps,
  onPeriodChange,
  onRateChange,
  onRemoveStep
}: {
  steps: StepForm[];
  onPeriodChange: (index: number, value: number | 'E') => void;
  onRateChange: (index: number, value: number) => void;
  onRemoveStep: (index: number) => void;
}) {
  const columns = useMemo<ColumnDef<StepForm>[]>(
    () => [
      {
        header: '#',
        accessorKey: 'step_number',
        cell: ({ row }) => (
          <span className="block text-text-secondary text-center">{row.original.step_number}</span>
        ),
        size: 50
      },
      {
        header: 'From',
        accessorKey: 'from_period',
        cell: ({ row }) => (
          <span className="block px-1 text-center text-text-inverse">{row.original.from_period}</span>
        ),
        size: 80
      },
      {
        header: 'Rate',
        accessorKey: 'rate',
        cell: ({ row }) => (
          <PercentageInput
            value={String(row.original.rate)}
            onChange={(val) => onRateChange(row.index, parseFloat(val) || 0)}
            compact
            align="center"
          />
        ),
        size: 90
      },
      {
        header: 'Periods',
        accessorKey: 'periods',
        cell: ({ row }) => (
          <input
            type="text"
            value={row.original.periods}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              if (val === 'E') {
                onPeriodChange(row.index, 'E');
              } else {
                const parsed = parseInt(val, 10);
                if (!Number.isNaN(parsed) && parsed > 0) {
                  onPeriodChange(row.index, parsed);
                }
              }
            }}
            className="w-full h-8 px-2 bg-surface-card border border-line-strong text-text-primary text-center focus:border-brand-primary focus:outline-none rounded-sm"
            placeholder="12 or E"
          />
        ),
        size: 90
      },
      {
        header: 'Thru',
        accessorKey: 'thru_period',
        cell: ({ row }) => (
          <span className="block px-1 text-center text-text-inverse">{row.original.thru_period}</span>
        ),
        size: 80
      },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex justify-center">
            <button
              onClick={() => onRemoveStep(row.index)}
              disabled={steps.length <= 1}
              className="p-1 rounded hover:bg-chip-error/10 transition-colors disabled:opacity-50"
              title="Remove step"
              type="button"
            >
              <CIcon icon={cilX} size="sm" className={steps.length <= 1 ? 'text-text-secondary' : 'text-chip-error'} />
            </button>
          </div>
        ),
        size: 40
      }
    ],
    [onPeriodChange, onRateChange, onRemoveStep, steps.length]
  );

  const table = useReactTable({
    data: steps,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="border border-line-strong rounded overflow-hidden">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-surface-card text-text-secondary">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className="px-2 py-1 text-center"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-line-strong">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-2 py-1 align-middle text-center">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RateChip({
  label,
  isActive,
  onClick
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-24 py-1.5 rounded text-xs font-semibold border text-center transition-colors ${
        isActive
          ? label === 'Flat'
            ? 'bg-brand-accent/20 text-emerald-200 border-emerald-400'
            : 'bg-purple-500/20 text-purple-200 border-purple-400'
          : label === 'Flat'
          ? 'bg-surface-card text-emerald-200/70 border-emerald-500/40 hover:bg-brand-accent/10'
          : 'bg-surface-card text-purple-200/70 border-purple-500/40 hover:bg-purple-500/10'
      }`}
    >
      {label}
    </button>
  );
}

function PercentageInput({
  value,
  onChange,
  placeholder,
  compact = false,
  align = 'right'
}: {
  value: string;
  onChange: (sanitized: string) => void;
  placeholder?: string;
  compact?: boolean;
  align?: 'left' | 'center' | 'right';
}) {
  const formattedValue = value ? `${value}%` : '';

  const sanitize = (input: string) => {
    const raw = input.replace(/[^0-9.]/g, '');
    if (!raw) return '';
    const segments = raw.split('.');
    const integer = segments.shift() ?? '';
    const decimals = segments.join('');
    const normalizedInt = integer === '' && decimals ? '0' : integer.replace(/^0+(?=\d)/, '');
    return decimals.length > 0 ? `${normalizedInt}.${decimals}` : normalizedInt;
  };

  const widthClass = compact ? 'w-16' : 'w-20';
  const alignClass =
    align === 'center' ? 'text-center' : align === 'left' ? 'text-left' : 'text-right';

  return (
    <input
      type="text"
      inputMode="decimal"
      value={formattedValue}
      onChange={(e) => onChange(sanitize(e.target.value))}
      onBlur={() => {
        if (value.endsWith('.')) {
          onChange(value.slice(0, -1));
        }
      }}
      placeholder={placeholder}
      className={`${widthClass} px-2 py-2 bg-surface-card border border-line-strong rounded text-sm text-text-primary ${alignClass} focus:border-brand-primary focus:outline-none`}
    />
  );
}

async function saveGrowthRateSet(payload: PreparedPayload) {
  try {
    console.log('saveGrowthRateSet: Starting POST request', { payload });
    const response = await fetch('/api/benchmarks/growth-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    console.log('saveGrowthRateSet: Response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const rawText = await response.text();
      let message = `Failed to create growth rate set (HTTP ${response.status})`;
      if (rawText) {
        try {
          const data = JSON.parse(rawText);
          message = data.error || data.details || message;
        } catch {
          message = `${message}: ${rawText}`;
        }
      }
      console.error('Growth rate create failed', { status: response.status, payload, rawText, message });
      throw new Error(message);
    }

    // Parse and return the success response
    const result = await response.json();
    console.log('Growth rate created successfully', { payload, result });
    return result;
  } catch (error) {
    console.error('saveGrowthRateSet: Exception caught', {
      error,
      errorType: error?.constructor?.name,
      message: error instanceof Error ? error.message : String(error),
      payload
    });
    throw error;
  }
}

async function updateGrowthRateSet(setId: number, payload: PreparedPayload) {
  const response = await fetch(`/api/benchmarks/growth-rates/${setId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const rawText = await response.text();
    let message = `Failed to update growth rate set (HTTP ${response.status})`;
    if (rawText) {
      try {
        const data = JSON.parse(rawText);
        message = data.error || data.details || message;
      } catch {
        message = `${message}: ${rawText}`;
      }
    }
    console.error('Growth rate update failed', { status: response.status, setId, payload, rawText, message });
    throw new Error(message);
  }
}

async function deleteGrowthRateSet(setId: number) {
  const response = await fetch(`/api/benchmarks/growth-rates/${setId}`, {
    method: 'DELETE',
    credentials: 'include'
  });

  if (!response.ok) {
    const rawText = await response.text();
    let message = `Failed to delete growth rate set (HTTP ${response.status})`;
    if (rawText) {
      try {
        const data = JSON.parse(rawText);
        message = data.error || data.details || message;
      } catch {
        message = `${message}: ${rawText}`;
      }
    }
    console.error('Growth rate delete failed', { status: response.status, setId, rawText, message });
    throw new Error(message);
  }
}

function createDefaultSteps(): StepForm[] {
  return [
    {
      step_number: 1,
      from_period: 1,
      periods: 12,
      rate: 3,
      thru_period: 12
    }
  ];
}

function recalculateSteps(input: StepForm[]): StepForm[] {
  const result: StepForm[] = [];
  input.forEach((step, index) => {
    const base: StepForm = { ...step };
    base.step_number = index + 1;

    if (index === 0) {
      base.from_period = 1;
    } else {
      const prev = result[index - 1];
      if (prev.thru_period === 'E') {
        base.from_period = prev.from_period;
        base.thru_period = 'E';
        result.push(base);
        return;
      }
      base.from_period = (prev.thru_period as number) + 1;
    }

    const periods = base.periods;
    if (periods === 'E') {
      base.thru_period = 'E';
    } else {
      base.thru_period = base.from_period + periods - 1;
    }

    result.push(base);
  });

  return result;
}

function validateSteps(steps: StepForm[]): string | null {
  if (steps.length === 0) {
    return 'Must have at least one step';
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (Number.isNaN(step.rate) || step.rate < -100 || step.rate > 100) {
      return `Step ${i + 1}: Rate must be between -100% and 100%`;
    }
  }

  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1];
    const curr = steps[i];

    if (prev.thru_period === 'E') {
      return `Cannot have steps after step ${i} which ends at "E"`;
    }

    if (curr.from_period !== (prev.thru_period as number) + 1) {
      return `Steps must be contiguous. Check step ${i + 1}`;
    }
  }

  return null;
}

function serializeSteps(steps: StepForm[]): GrowthRateStepInput[] {
  return steps.map((step) => ({
    from_period: step.from_period,
    periods: step.periods,
    rate: step.rate,
    thru_period: step.thru_period
  }));
}

function convertStepsToForm(steps: GrowthRateStep[]): StepForm[] {
  return steps.map((step, index) => ({
    step_number: step.step_number || index + 1,
    from_period: step.from_period,
    periods: (step.periods ?? null) === null ? 'E' : step.periods!,
    rate: typeof step.rate === 'number' ? roundToTwo(step.rate * 100) : Number(step.rate) * 100,
    thru_period: step.thru_period === null ? 'E' : step.thru_period
  }));
}

function deriveRateChip(set: GrowthRateSet) {
  if (set.rate_type === 'flat' && typeof set.current_rate === 'number') {
    const percent = roundToTwo(set.current_rate * 100);
    return {
      label: `${percent}%`,
      className: 'border border-brand-accent bg-brand-accent/15 text-brand-accent'
    };
  }

  if (set.rate_type === 'auto_updated') {
    return {
      label: 'Auto',
      className: 'border border-brand-primary bg-brand-primary/15 text-brand-primary'
    };
  }

  return {
    label: 'Custom',
    className: 'border border-chip-info bg-chip-info/15 text-chip-info'
  };
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}
