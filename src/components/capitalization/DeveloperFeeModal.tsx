'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  DeveloperFee,
  CreateDeveloperFee,
  FEE_TYPE_OPTIONS,
  BASIS_TYPE_OPTIONS,
  STATUS_OPTIONS,
} from '@/hooks/useDeveloperOperations';

interface DeveloperFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateDeveloperFee) => Promise<void>;
  onUpdate?: (id: number, data: Partial<DeveloperFee>) => Promise<void>;
  projectId: number;
  editingFee?: DeveloperFee | null;
}

export default function DeveloperFeeModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  projectId,
  editingFee,
}: DeveloperFeeModalProps) {
  const [formData, setFormData] = useState<CreateDeveloperFee>({
    project_id: projectId,
    fee_type: 'development',
    fee_description: '',
    basis_type: 'percent_of_total_costs',
    basis_value: undefined,
    calculated_amount: undefined,
    payment_timing: '',
    timing_start_period: 1,
    timing_duration_periods: 1,
    status: 'pending',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset form when opening/closing or when editing fee changes
  useEffect(() => {
    if (isOpen) {
      if (editingFee) {
        setFormData({
          project_id: editingFee.project_id,
          fee_type: editingFee.fee_type,
          fee_description: editingFee.fee_description || '',
          basis_type: editingFee.basis_type,
          basis_value: editingFee.basis_value || undefined,
          calculated_amount: editingFee.calculated_amount || undefined,
          payment_timing: editingFee.payment_timing || '',
          timing_start_period: editingFee.timing_start_period || 1,
          timing_duration_periods: editingFee.timing_duration_periods || 1,
          status: editingFee.status,
          notes: editingFee.notes || '',
        });
      } else {
        setFormData({
          project_id: projectId,
          fee_type: 'development',
          fee_description: '',
          basis_type: 'percent_of_total_costs',
          basis_value: undefined,
          calculated_amount: undefined,
          payment_timing: '',
          timing_start_period: 1,
          timing_duration_periods: 1,
          status: 'pending',
          notes: '',
        });
      }
      setError('');
    }
  }, [isOpen, editingFee, projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.fee_type || !formData.basis_type) {
      setError('Fee type and basis type are required');
      return;
    }

    setSaving(true);
    try {
      if (editingFee && onUpdate) {
        await onUpdate(editingFee.id, formData);
      } else {
        await onSave(formData);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save developer fee');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {editingFee ? 'Edit Developer Fee' : 'Add Developer Fee'}
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

          {/* Fee Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fee Type *
            </label>
            <select
              value={formData.fee_type}
              onChange={(e) => setFormData({ ...formData, fee_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FEE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Fee Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.fee_description || ''}
              onChange={(e) => setFormData({ ...formData, fee_description: e.target.value })}
              placeholder="e.g., 4% of total project cost"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Basis Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Basis Type *
            </label>
            <select
              value={formData.basis_type}
              onChange={(e) => setFormData({ ...formData, basis_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {BASIS_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Basis Value and Calculated Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Basis Value
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.basis_value ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    basis_value: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder={formData.basis_type.startsWith('percent') ? '4.0' : '100000'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.basis_type.startsWith('percent') ? 'Percentage (e.g., 4.0 = 4%)' : 'Dollar amount'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Calculated Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.calculated_amount ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    calculated_amount: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="500000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Payment Timing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Timing
            </label>
            <input
              type="text"
              value={formData.payment_timing || ''}
              onChange={(e) => setFormData({ ...formData, payment_timing: e.target.value })}
              placeholder="e.g., 50% at closing, 50% at CO"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Timing - Start Period and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Period
              </label>
              <input
                type="number"
                min="1"
                value={formData.timing_start_period ?? 1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    timing_start_period: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Period when fee payment begins
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duration (periods)
              </label>
              <input
                type="number"
                min="1"
                value={formData.timing_duration_periods ?? 1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    timing_duration_periods: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Number of periods to distribute fee over
              </p>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {saving ? 'Saving...' : editingFee ? 'Update' : 'Add Fee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
