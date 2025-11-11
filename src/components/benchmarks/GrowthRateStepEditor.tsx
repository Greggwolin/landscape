/**
 * Growth Rate Step Editor Component
 * Inline form for creating/editing stepped growth rate sets
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

interface GrowthRateStep {
  step_number: number;
  from_period: number;
  periods: number | 'E';
  rate: number;
  thru_period: number | 'E';
}

interface Props {
  mode: 'create' | 'edit';
  existingSet?: {
    set_id: number;
    set_name: string;
    description?: string;
    market_geography?: string;
    steps: GrowthRateStep[];
  };
  onClose: () => void;
  onSuccess: () => void;
  initialName?: string;
}

export default function GrowthRateStepEditor({ mode, existingSet, onClose, onSuccess, initialName }: Props) {
  const [formData, setFormData] = useState({
    name: existingSet?.set_name || initialName || '',
    description: existingSet?.description || '',
    geography: existingSet?.market_geography || '',
  });

  const [steps, setSteps] = useState<GrowthRateStep[]>(
    existingSet?.steps || [
      { step_number: 1, from_period: 1, periods: 12, rate: 3.0, thru_period: 12 }
    ]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculate thru_period when periods or from_period changes
  useEffect(() => {
    const updatedSteps = steps.map((step, idx) => {
      if (idx === 0) {
        // First step always starts at period 1
        const thru = step.periods === 'E' ? 'E' : step.from_period + (step.periods as number) - 1;
        return { ...step, from_period: 1, thru_period: thru };
      } else {
        // Subsequent steps start after previous step ends
        const prevThru = steps[idx - 1].thru_period;
        if (prevThru === 'E') {
          // Can't have steps after an "E" step
          return step;
        }
        const from = (prevThru as number) + 1;
        const thru = step.periods === 'E' ? 'E' : from + (step.periods as number) - 1;
        return { ...step, from_period: from, thru_period: thru };
      }
    });

    // Only update if changed to avoid infinite loop
    if (JSON.stringify(updatedSteps) !== JSON.stringify(steps)) {
      setSteps(updatedSteps);
    }
  }, [steps]);

  const handleStepChange = (index: number, field: keyof GrowthRateStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const addStep = () => {
    const lastStep = steps[steps.length - 1];
    if (lastStep.thru_period === 'E') {
      setError('Cannot add steps after an "E" (End) step');
      return;
    }

    const newFrom = (lastStep.thru_period as number) + 1;
    setSteps([
      ...steps,
      {
        step_number: steps.length + 1,
        from_period: newFrom,
        periods: 12,
        rate: 3.0,
        thru_period: newFrom + 11
      }
    ]);
    setError(null);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) {
      setError('Must have at least one step');
      return;
    }

    const newSteps = steps.filter((_, idx) => idx !== index);
    // Renumber steps
    const renumbered = newSteps.map((step, idx) => ({ ...step, step_number: idx + 1 }));
    setSteps(renumbered);
    setError(null);
  };

  const validateSteps = (): string | null => {
    if (steps.length === 0) {
      return 'Must have at least one step';
    }

    // Check contiguity
    for (let i = 1; i < steps.length; i++) {
      const prevThru = steps[i - 1].thru_period;
      const currFrom = steps[i].from_period;

      if (prevThru === 'E') {
        return `Cannot have steps after step ${i} which ends at "E"`;
      }

      if (currFrom !== (prevThru as number) + 1) {
        return `Steps must be contiguous. Gap between step ${i} and ${i + 1}`;
      }
    }

    // Check rates are valid numbers
    for (let i = 0; i < steps.length; i++) {
      if (isNaN(steps[i].rate) || steps[i].rate < -100 || steps[i].rate > 100) {
        return `Step ${i + 1}: Rate must be a number between -100 and 100`;
      }
    }

    return null;
  };

  const handleSave = async () => {
    // Validate
    const validationError = validateSteps();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const body = {
        name: formData.name,
        description: formData.description || undefined,
        geography: formData.geography || undefined,
        steps: steps.map(step => ({
          from_period: step.from_period,
          periods: step.periods,
          rate: step.rate,
          thru_period: step.thru_period
        }))
      };

      const url = mode === 'create'
        ? '/api/benchmarks/growth-rates'
        : `/api/benchmarks/growth-rates/${existingSet?.set_id}`;

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save growth rate set');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save growth rate set');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-card rounded-lg w-[900px] max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line-strong flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {mode === 'create' ? 'Create' : 'Edit'} Growth Rate Set
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 rounded border border-chip-error/60 bg-chip-error/10 p-3 text-sm text-chip-error">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Name <span className="text-chip-error">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none"
                placeholder="e.g., Phoenix Multifamily 2025"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Geography</label>
                <input
                  type="text"
                  value={formData.geography}
                  onChange={(e) => setFormData({ ...formData, geography: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none"
                  placeholder="e.g., Phoenix, Los Angeles"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none"
                  placeholder="Optional notes"
                />
              </div>
            </div>
          </div>

          {/* Step Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium">
                Growth Rate Steps <span className="text-chip-error">*</span>
              </label>
              <button
                onClick={addStep}
                disabled={steps[steps.length - 1]?.thru_period === 'E'}
                className="flex items-center gap-1 px-3 py-1.5 bg-brand-primary hover:bg-brand-primary/90 disabled:bg-surface-card disabled:cursor-not-allowed rounded text-sm transition-colors"
              >
                <Plus size={16} /> Add Step
              </button>
            </div>

            <div className="border border-line-strong rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-card">
                  <tr>
                    <th className="px-3 py-2 text-left w-16">Step</th>
                    <th className="px-3 py-2 text-left w-24">From Period</th>
                    <th className="px-3 py-2 text-left w-32">Rate (%)</th>
                    <th className="px-3 py-2 text-left w-32">Periods</th>
                    <th className="px-3 py-2 text-left w-24">Thru Period</th>
                    <th className="px-3 py-2 text-center w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step, index) => (
                    <tr key={index} className="border-t border-line-strong">
                      <td className="px-3 py-2 text-text-secondary">{step.step_number}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={step.from_period}
                          disabled
                          className="w-full px-2 py-1 bg-surface-card border border-line-strong rounded text-text-secondary cursor-not-allowed"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.1"
                          value={step.rate}
                          onChange={(e) => handleStepChange(index, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none"
                          placeholder="3.0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={step.periods}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            if (val === 'E') {
                              handleStepChange(index, 'periods', 'E');
                            } else {
                              const num = parseInt(val);
                              if (!isNaN(num) && num > 0) {
                                handleStepChange(index, 'periods', num);
                              }
                            }
                          }}
                          className="w-full px-2 py-1 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none"
                          placeholder="12 or E"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={step.thru_period}
                          disabled
                          className="w-full px-2 py-1 bg-surface-card border border-line-strong rounded text-text-secondary cursor-not-allowed"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => removeStep(index)}
                          disabled={steps.length <= 1}
                          className="text-chip-error hover:text-red-300 disabled:text-text-secondary disabled:cursor-not-allowed"
                          title="Remove step"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-text-secondary mt-2">
              • <strong>From Period</strong> is auto-calculated based on previous step<br />
              • <strong>Thru Period</strong> is auto-calculated (from + periods - 1)<br />
              • Enter <strong>"E"</strong> for Periods to indicate "End" (remaining periods)<br />
              • Steps must be contiguous with no gaps
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line-strong flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-surface-card hover:bg-surface-card rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 disabled:bg-surface-card disabled:cursor-not-allowed rounded transition-colors"
          >
            {saving ? 'Saving...' : mode === 'create' ? 'Create Set' : 'Update Set'}
          </button>
        </div>
      </div>
    </div>
  );
}
