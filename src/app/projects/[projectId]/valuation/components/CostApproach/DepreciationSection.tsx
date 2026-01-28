'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  CostApproachDepreciationForm,
  CostApproachDepreciationRecord,
} from '@/types/valuation';
import { saveProjectDepreciation } from '@/lib/api/valuation';

interface DepreciationSectionProps {
  projectId: number;
  record: CostApproachDepreciationRecord | null;
  onSaved?: () => Promise<void>;
}

const fields: (keyof CostApproachDepreciationForm)[] = [
  'physical_curable',
  'physical_incurable_short',
  'physical_incurable_long',
  'functional_curable',
  'functional_incurable',
  'external_obsolescence',
];

export function DepreciationSection({ projectId, record, onSaved }: DepreciationSectionProps) {
  const [formState, setFormState] = useState<CostApproachDepreciationForm>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setFormState({
        physical_curable: record.physical_curable,
        physical_incurable_short: record.physical_incurable_short,
        physical_incurable_long: record.physical_incurable_long,
        functional_curable: record.functional_curable,
        functional_incurable: record.functional_incurable,
        external_obsolescence: record.external_obsolescence,
        effective_age_years: record.effective_age_years,
        remaining_life_years: record.remaining_life_years,
        depreciation_method: record.depreciation_method,
        notes: record.notes,
      });
    }
  }, [record]);

  const total = useMemo(() => {
    return fields.reduce((sum, key) => sum + (formState[key] ?? 0), 0);
  }, [formState]);

  const handleChange = (field: keyof CostApproachDepreciationForm, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value === '' ? undefined : Number(value) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveProjectDepreciation(projectId, formState);
      onSaved && (await onSaved());
    } catch (err) {
      console.error('Depreciation save error', err);
      setError(err instanceof Error ? err.message : 'Unable to save depreciation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border p-5" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
            Depreciation
          </h3>
          <p className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
            Breakdown of physical, functional, and external obsolescence.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium rounded"
          style={{
            backgroundColor: 'var(--cui-primary)',
            color: 'white',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {error && (
        <div className="mb-4 text-xs" style={{ color: 'var(--cui-danger)' }}>
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <label key={field} className="text-sm flex flex-col" style={{ color: 'var(--cui-body-color)' }}>
            <span className="text-xs text-right" style={{ color: 'var(--cui-secondary-color)' }}>
              {field.replace(/_/g, ' ')}
            </span>
            <input
              type="number"
              step="0.01"
              value={formState[field] ?? ''}
              onChange={(event) => handleChange(field, event.target.value)}
              className="form-control"
              style={{
                backgroundColor: 'var(--cui-tertiary-bg)',
                borderColor: 'var(--cui-border-color)',
                color: 'var(--cui-body-color)',
              }}
            />
          </label>
        ))}
      </div>

      <div className="mt-3 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
        Total Depreciation: <span className="font-semibold" style={{ color: 'var(--cui-body-color)' }}>{total.toFixed(2)}</span>
      </div>
    </section>
  );
}
