/**
 * Growth Rate Category Panel
 * Inline editor for adding and updating inflation factor sets.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
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
  onRefresh
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="border-b border-slate-700">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown size={20} className="text-slate-400" />
          ) : (
            <ChevronRight size={20} className="text-slate-400" />
          )}
          <span className="font-medium">{category.label}</span>
        </div>
        <span className="text-sm text-slate-400">{sets.length}</span>
      </button>

      {isExpanded && (
        <div className="bg-slate-850 px-4 py-4 space-y-4">
          {showAddForm ? (
            <GrowthRateForm
              mode="create"
              existingSets={sets}
              onCancel={() => {
                console.log('Growth rate form cancelled');
                setShowAddForm(false);
              }}
              onSuccess={() => {
                console.log('Growth rate save succeeded, hiding form and refreshing data');
                setShowAddForm(false);
                onRefresh();
              }}
              onSubmit={async (payload) => {
                console.log('onSubmit called with payload:', payload);
                await saveGrowthRateSet(payload);
              }}
            />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-3 py-2 border border-blue-500 text-blue-200 rounded text-sm hover:bg-blue-500/10 transition-colors"
            >
              + Add New Growth Rate
            </button>
          )}

          {loading ? (
            <div className="py-6 text-center text-sm text-slate-400">
              Loading growth rates...
            </div>
          ) : sets.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">
              No growth rates yet. Click &ldquo;Add New Growth Rate&rdquo; to begin.
            </div>
          ) : (
            <div className="space-y-3">
              {sets.map((set) => (
                <GrowthRateListItem key={set.set_id} set={set} onRefresh={onRefresh} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GrowthRateListItem({ set, onRefresh }: { set: GrowthRateSet; onRefresh: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [inlineRate, setInlineRate] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const canEdit = set.rate_type !== 'auto_updated' && !set.is_system;

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
  console.log('GrowthRateListItem rendering:', { set_name: set.set_name, rate_type: set.rate_type, current_rate: set.current_rate, step_count: set.step_count });

  return (
    <div className="w-full px-4 py-3 rounded bg-slate-800 border border-slate-700">
      <div className="flex items-center">
        <div className="text-sm font-medium text-white min-w-[200px]">{set.set_name}</div>
        {set.rate_type === 'flat' && typeof set.current_rate === 'number' ? (
          isEditingInline ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={inlineRate}
                onChange={(e) => setInlineRate(e.target.value)}
                className="w-20 px-2 py-1 bg-slate-900 border border-blue-500 rounded text-sm text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInlineSave();
                  if (e.key === 'Escape') handleInlineCancel();
                }}
              />
              <span className="text-sm text-slate-400">%</span>
              <button
                onClick={handleInlineSave}
                className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleInlineCancel}
                className="text-xs px-2 py-1 rounded border border-slate-500 text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleInlineEdit}
              disabled={!canEdit || isDeleting}
              className={`text-sm font-medium text-blue-300 ${canEdit ? 'cursor-pointer hover:text-blue-200 transition-colors' : 'cursor-default'}`}
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
        <div className="ml-auto flex items-center gap-2">
          {canEdit && set.rate_type === 'stepped' && (
            <button
              onClick={() => setIsEditing(true)}
              disabled={isDeleting}
              className="text-xs px-3 py-1 rounded border border-slate-500 text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Edit
            </button>
          )}
          {canEdit && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs px-3 py-1 rounded border border-red-500 text-red-200 hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
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
  existingSets?: GrowthRateSet[];
  apiError?: string | null;
  setApiError?: (message: string | null) => void;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmit: (payload: PreparedPayload) => Promise<void>;
}

function GrowthRateForm({
  mode,
  initialName = '',
  initialRateType = 'flat',
  initialFlatRate,
  initialSteps,
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

      const payload: PreparedPayload = {
        name: name.trim(),
        steps: [
          {
            from_period: 1,
            periods: 'E',
            rate: parsedFlat,
            thru_period: 'E'
          }
        ]
      };
      await persist(payload);
      return;
    }

    const validationError = validateSteps(steps);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: PreparedPayload = {
      name: name.trim(),
      steps: serializeSteps(steps)
    };
    await persist(payload);
  };

  const persist = async (payload: PreparedPayload) => {
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
    <div className="w-full min-w-[520px] px-4 py-4 rounded bg-slate-800 border border-slate-600">
      <div className="space-y-4">
        <div className="flex items-end gap-4 flex-nowrap">
          <div className="flex flex-col gap-1 flex-[1_0_150px] min-w-[150px]">
            <label className="text-xs font-semibold text-slate-300">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Custom"
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col items-center gap-1 flex-[0_0_200px]">
            <span className="text-xs font-semibold text-slate-300">Rate Type</span>
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
              <span className="text-xs font-semibold text-slate-300 text-center">Rate</span>
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
            <label className="block text-xs font-semibold text-slate-300">
              Step Schedule
            </label>
              <button
                type="button"
                onClick={handleAddStep}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md text-xs font-medium transition-colors"
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
            <p className="text-xs text-slate-500 mt-2">
              Enter numbers for months or use &ldquo;E&rdquo; to carry the rate through the end.
            </p>
          </div>
        )}

        {overwriteTarget && (
          <div className="text-xs text-amber-200 bg-amber-900/40 border border-amber-500 px-3 py-2 rounded">
            A growth rate with this name already exists. Click Overwrite Rate to replace it.
          </div>
        )}

        {(error || apiError) && (
          <div className="text-xs text-red-300 bg-red-900/40 border border-red-600 px-3 py-2 rounded">
            {error || apiError}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded disabled:bg-slate-700 disabled:text-slate-400"
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
          <span className="block text-slate-300 text-center">{row.original.step_number}</span>
        ),
        size: 50
      },
      {
        header: 'From',
        accessorKey: 'from_period',
        cell: ({ row }) => (
          <span className="block px-1 text-center text-slate-200">{row.original.from_period}</span>
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
            className="w-full h-8 px-2 bg-slate-900 border border-slate-600 text-white text-center focus:border-blue-500 focus:outline-none rounded-sm"
            placeholder="12 or E"
          />
        ),
        size: 90
      },
      {
        header: 'Thru',
        accessorKey: 'thru_period',
        cell: ({ row }) => (
          <span className="block px-1 text-center text-slate-200">{row.original.thru_period}</span>
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
              className="text-red-400 hover:text-red-300 disabled:text-slate-600"
              title="Remove step"
              type="button"
            >
              <Trash2 size={14} />
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
    <div className="border border-slate-600 rounded overflow-hidden">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-slate-900 text-slate-300">
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
            <tr key={row.id} className="border-t border-slate-700">
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
            ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400'
            : 'bg-purple-500/20 text-purple-200 border-purple-400'
          : label === 'Flat'
          ? 'bg-slate-900 text-emerald-200/70 border-emerald-500/40 hover:bg-emerald-500/10'
          : 'bg-slate-900 text-purple-200/70 border-purple-500/40 hover:bg-purple-500/10'
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
      className={`${widthClass} px-2 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white ${alignClass} focus:border-blue-500 focus:outline-none`}
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
      className: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400'
    };
  }

  if (set.rate_type === 'auto_updated') {
    return {
      label: 'Auto',
      className: 'bg-sky-500/20 text-sky-200 border border-sky-400'
    };
  }

  return {
    label: 'Custom',
    className: 'bg-purple-500/20 text-purple-200 border border-purple-400'
  };
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}
