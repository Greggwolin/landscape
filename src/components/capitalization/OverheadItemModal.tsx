'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  ManagementOverhead,
  CreateManagementOverhead,
  FREQUENCY_OPTIONS,
} from '@/hooks/useDeveloperOperations';

interface OverheadItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateManagementOverhead) => Promise<void>;
  onUpdate?: (id: number, data: Partial<ManagementOverhead>) => Promise<void>;
  projectId: number;
  editingItem?: ManagementOverhead | null;
  /** Custom level labels from project config (e.g., { level1: 'Area', level2: 'Phase', level3: 'Parcel' }) */
  levelLabels?: { level1?: string; level2?: string; level3?: string };
  /** Project end period (total months) for auto-calculating default duration */
  projectEndPeriod?: number;
}

// Months per payment for each frequency type
const MONTHS_PER_PAYMENT: Record<string, number> = {
  one_time: 0,
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
};

/**
 * Calculate prorated total for overhead items
 * Handles partial final payments for non-monthly frequencies
 */
function calculateProratedTotal(
  amount: number,
  frequency: string,
  durationPeriods: number
): { total: number; fullPayments: number; proratedAmount: number; remainingMonths: number } {
  if (frequency === 'one_time') {
    return { total: amount, fullPayments: 1, proratedAmount: 0, remainingMonths: 0 };
  }

  if (frequency === 'monthly') {
    return { total: amount * durationPeriods, fullPayments: durationPeriods, proratedAmount: 0, remainingMonths: 0 };
  }

  const interval = MONTHS_PER_PAYMENT[frequency] || 1;
  const fullPayments = Math.floor(durationPeriods / interval);
  const remainingMonths = durationPeriods % interval;
  const proratedAmount = remainingMonths > 0 ? amount * (remainingMonths / interval) : 0;
  const total = (fullPayments * amount) + proratedAmount;

  return { total, fullPayments, proratedAmount, remainingMonths };
}

// Format number as currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Parse currency string to number
const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
};

export default function OverheadItemModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  projectId,
  editingItem,
  levelLabels = {},
  projectEndPeriod = 36, // Default to 36 months if not provided
}: OverheadItemModalProps) {
  const [formData, setFormData] = useState<CreateManagementOverhead>({
    project_id: projectId,
    item_name: '',
    amount: 0,
    frequency: 'monthly',
    start_period: 1,
    duration_periods: 12,
    container_level: undefined,
    container_id: undefined,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [throughEndOfAnalysis, setThroughEndOfAnalysis] = useState(true);

  // Build level options dynamically
  const levelOptions = [
    { value: 'project', label: 'Project' },
    ...(levelLabels.level1 ? [{ value: 'level1', label: levelLabels.level1 }] : []),
    ...(levelLabels.level2 ? [{ value: 'level2', label: levelLabels.level2 }] : []),
    ...(levelLabels.level3 ? [{ value: 'level3', label: levelLabels.level3 }] : []),
  ];

  // Auto-calculate default duration based on project end period
  const calculateDefaultDuration = (startPeriod: number) => {
    return Math.max(1, projectEndPeriod - startPeriod + 1);
  };

  // Reset form when opening/closing or when editing item changes
  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setFormData({
          project_id: editingItem.project_id,
          item_name: editingItem.item_name,
          amount: editingItem.amount,
          frequency: editingItem.frequency,
          start_period: editingItem.start_period,
          duration_periods: editingItem.duration_periods,
          container_level: editingItem.container_level || undefined,
          container_id: editingItem.container_id || undefined,
          notes: editingItem.notes || '',
        });
        setAmountDisplay(formatCurrency(editingItem.amount));
      } else {
        // Default duration: from start period through end of project
        const defaultDuration = calculateDefaultDuration(1);
        setFormData({
          project_id: projectId,
          item_name: '',
          amount: 0,
          frequency: 'monthly',
          start_period: 1,
          duration_periods: defaultDuration,
          container_level: undefined,
          container_id: undefined,
          notes: '',
        });
        setAmountDisplay('');
      }
      setError('');
    }
  }, [isOpen, editingItem, projectId, projectEndPeriod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.item_name.trim()) {
      setError('Item name is required');
      return;
    }

    if (formData.amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      if (editingItem && onUpdate) {
        await onUpdate(editingItem.id, formData);
      } else {
        await onSave(formData);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save overhead item');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmountDisplay(value);
    setFormData({ ...formData, amount: parseCurrency(value) });
  };

  const handleAmountBlur = () => {
    if (formData.amount > 0) {
      setAmountDisplay(formatCurrency(formData.amount));
    }
  };

  const handleAmountFocus = () => {
    // Show raw number when focused for easier editing
    if (formData.amount > 0) {
      setAmountDisplay(formData.amount.toString());
    }
  };

  // Handle start period change - auto-update duration if "through end" is checked
  const handleStartPeriodChange = (newStartPeriod: number) => {
    const updatedFormData = { ...formData, start_period: newStartPeriod };
    if (throughEndOfAnalysis) {
      updatedFormData.duration_periods = calculateDefaultDuration(newStartPeriod);
    }
    setFormData(updatedFormData);
  };

  // Handle "through end of analysis" toggle
  const handleThroughEndToggle = (checked: boolean) => {
    setThroughEndOfAnalysis(checked);
    if (checked) {
      setFormData({
        ...formData,
        duration_periods: calculateDefaultDuration(formData.start_period),
      });
    }
  };

  // Calculate total with proration for display
  const { total: calculatedTotal, fullPayments, proratedAmount, remainingMonths } =
    calculateProratedTotal(formData.amount, formData.frequency, formData.duration_periods || 1);

  // Generate proration description
  const getProratedDescription = (): string | null => {
    if (formData.frequency === 'one_time' || formData.frequency === 'monthly') {
      return null;
    }
    if (proratedAmount > 0) {
      const frequencyLabel = formData.frequency === 'quarterly' ? 'quarterly' :
                             formData.frequency === 'semi_annual' ? 'semi-annual' : 'annual';
      return `(${fullPayments} full ${frequencyLabel} + ${remainingMonths}-month proration)`;
    }
    return null;
  };

  if (!isOpen) return null;

  // Common input styles
  const inputBase = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelBase = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const labelCentered = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center leading-tight";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {editingItem ? 'Edit Overhead Item' : 'Add Overhead Item'}
          </h2>
          <button
            onClick={handleClose}
            className="btn btn-sm btn-ghost-secondary"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {/* Item Name */}
          <div>
            <label className={labelBase}>
              Item Name *
            </label>
            <input
              type="text"
              value={formData.item_name}
              onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
              placeholder="e.g., Project Management Salary"
              required
              className={inputBase}
            />
          </div>

          {/* Amount and Frequency - 2 columns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelBase}>
                Amount *
              </label>
              <input
                type="text"
                value={amountDisplay}
                onChange={handleAmountChange}
                onBlur={handleAmountBlur}
                onFocus={handleAmountFocus}
                placeholder="$0.00"
                required
                className={`${inputBase} text-right`}
              />
            </div>
            <div>
              <label className={labelBase}>
                Frequency
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className={inputBase}
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Start Period, Duration, Apply to Level - 3 columns with centered 2-line labels */}
          {formData.frequency !== 'one_time' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCentered}>
                    Start<br />Period
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={projectEndPeriod}
                    value={formData.start_period}
                    onChange={(e) => handleStartPeriodChange(parseInt(e.target.value) || 1)}
                    className={`${inputBase} text-center`}
                  />
                </div>
                <div>
                  <label className={labelCentered}>
                    Duration<br />(periods)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_periods}
                    onChange={(e) => {
                      setThroughEndOfAnalysis(false);
                      setFormData({ ...formData, duration_periods: parseInt(e.target.value) || 1 });
                    }}
                    className={`${inputBase} text-center`}
                  />
                </div>
                <div>
                  <label className={labelCentered}>
                    Apply<br />to Level
                  </label>
                  <select
                    value={formData.container_level || 'project'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        container_level: e.target.value === 'project' ? undefined : e.target.value,
                      })
                    }
                    className={`${inputBase} text-left`}
                  >
                    {levelOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Through end of analysis checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="throughEndOfAnalysis"
                  checked={throughEndOfAnalysis}
                  onChange={(e) => handleThroughEndToggle(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="throughEndOfAnalysis" className="text-sm text-gray-600 dark:text-gray-400">
                  Through end of analysis (period {projectEndPeriod})
                </label>
              </div>
            </>
          )}

          {/* Apply to Level for one-time (show separately since no period/duration) */}
          {formData.frequency === 'one_time' && (
            <div>
              <label className={labelBase}>
                Apply to Level
              </label>
              <select
                value={formData.container_level || 'project'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    container_level: e.target.value === 'project' ? undefined : e.target.value,
                  })
                }
                className={inputBase}
              >
                {levelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Calculated Total */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Calculated Total:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(calculatedTotal)}
              </span>
            </div>
            {getProratedDescription() && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
                {getProratedDescription()}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={labelBase}>
              Notes (optional)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
              className={inputBase}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-outline-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary btn-sm"
            >
              {saving ? 'Saving...' : editingItem ? 'Update' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
