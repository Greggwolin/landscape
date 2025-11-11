/**
 * Growth Rate Wizard
 * 3-step flow for creating flat or variable growth rate sets
 */

import React, { useState } from 'react';
import type { RateType } from '@/types/benchmarks';

interface Props {
  mode?: 'create' | 'edit';
  setId?: number;
  initialName?: string;
  initialRateType?: RateType | null;
  initialFlatRate?: number;
  onClose: () => void;
  onSuccess: () => void;
  onSelectVariable: (payload: { name: string; setId?: number }) => void;
}

type WizardStep = 1 | 2 | 3;

export default function GrowthRateWizard({
  mode = 'create',
  setId,
  initialName,
  initialRateType = null,
  initialFlatRate,
  onClose,
  onSuccess,
  onSelectVariable
}: Props) {
  const isEditMode = mode === 'edit';
  const [step, setStep] = useState<WizardStep>(1);
  const [name, setName] = useState(initialName || '');
  const startingRateType = isEditMode ? (initialRateType ?? 'flat') : (initialRateType ?? null);
  const [rateType, setRateType] = useState<RateType | null>(startingRateType);
  const [flatRate, setFlatRate] = useState(
    initialFlatRate !== undefined ? String(initialFlatRate) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinueFromStep1 = name.trim().length > 0;

  const handleContinueFromStep1 = () => {
    if (!canContinueFromStep1) return;
    if (rateType === 'flat') {
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleSelectRateType = (type: RateType) => {
    if (type === 'auto_updated') return;
    if (isEditMode && rateType === 'flat' && type === 'stepped') {
      // Prevent changing to stepped in edit-flat mode
      return;
    }
    setRateType(type);

    if (type === 'flat') {
      setStep(3);
    } else if (type === 'stepped') {
      onSelectVariable({ name: name.trim(), setId });
      onClose();
    }
  };

  const handleCreateFlat = async () => {
    const parsedRate = parseFloat(flatRate);

    if (Number.isNaN(parsedRate)) {
      setError('Enter a numeric rate.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const body = {
        name: name.trim(),
        steps: [
          {
            from_period: 1,
            periods: 'E' as const,
            rate: parsedRate,
            thru_period: 'E' as const,
          },
        ] as const,
        set_id: setId,
      };

      const endpoint =
        isEditMode && setId
          ? `/api/benchmarks/growth-rates/${setId}`
          : '/api/benchmarks/growth-rates';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create growth rate set');
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
      <div className="bg-surface-card rounded-lg w-[480px] shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-line-strong">
          <h2 className="text-lg font-semibold text-text-primary">
            {isEditMode ? 'Edit Inflation Factor' : 'New Inflation Factor'}
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            {isEditMode
              ? 'Update the name or flat rate for this inflation factor.'
              : 'Follow the quick steps to add a flat or variable growth rate.'}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <StepIndicator currentStep={step} />

          {step === 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">
                Name <span className="text-chip-error">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name"
                className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">Choose how this rate behaves over time.</p>
              <div className="flex gap-3">
                <ChipButton
                  label="Flat"
                  description="One rate for all periods"
                  isActive={rateType === 'flat'}
                  onClick={() => handleSelectRateType('flat')}
                />
                <ChipButton
                  label="Variable"
                  description="Define a stepped schedule"
                  isActive={rateType === 'stepped'}
                  onClick={() => handleSelectRateType('stepped')}
                  disabled={isEditMode && rateType === 'flat'}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-text-primary">Flat Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={flatRate}
                onChange={(e) => setFlatRate(e.target.value)}
                placeholder="Enter rate, e.g., 3"
                className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none"
              />
              <p className="text-xs text-text-secondary">
                Flat rates apply to every period with no adjustments.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded border border-chip-error/60 bg-chip-error/10 px-3 py-2 text-sm text-chip-error">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-line-strong flex justify-between">
          <button
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          {step === 1 && (
            <button
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 rounded text-sm font-medium disabled:bg-surface-card"
              onClick={handleContinueFromStep1}
              disabled={!canContinueFromStep1}
            >
              Continue
            </button>
          )}

          {step === 2 && (
            <span className="text-sm text-text-secondary">Select a rate type above.</span>
          )}

          {step === 3 && (
            <button
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 rounded text-sm font-medium disabled:bg-surface-card disabled:cursor-not-allowed"
              onClick={handleCreateFlat}
              disabled={saving}
            >
              {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Rate'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const steps: Array<{ id: WizardStep; label: string }> = [
    { id: 1, label: 'Name' },
    { id: 2, label: 'Rate Type' },
    { id: 3, label: 'Details' },
  ];

  return (
    <div className="flex justify-between text-xs text-text-secondary">
      {steps.map((step) => (
        <div key={step.id} className="flex-1 flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full border ${
              currentStep >= step.id
                ? 'bg-brand-primary border-brand-primary text-text-inverse'
                : 'bg-surface-card border-line-strong text-text-secondary'
            }`}
          >
            {step.id}
          </div>
          <span className={currentStep >= step.id ? 'text-text-primary' : 'text-text-secondary'}>{step.label}</span>
        </div>
      ))}
    </div>
  );
}

function ChipButton({
  label,
  description,
  isActive,
  onClick,
  disabled = false,
}: {
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 border rounded-lg px-3 py-2 text-left transition-colors ${
        isActive
          ? 'border-brand-primary bg-brand-primary/15 text-text-primary'
          : 'border-line-strong bg-surface-card text-text-secondary'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-text-secondary mt-1">{description}</div>
    </button>
  );
}
