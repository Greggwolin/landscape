'use client';

import { useState, useEffect } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CRow,
  CCol,
} from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
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

  return (
    <CModal visible={isOpen} onClose={handleClose} alignment="center" size="lg" backdrop="static">
      <CForm onSubmit={handleSubmit}>
        <CModalHeader closeButton>
          <CModalTitle>{editingItem ? 'Edit Overhead Item' : 'Add Overhead Item'}</CModalTitle>
        </CModalHeader>
        <CModalBody className="d-flex flex-column gap-3">
          {error && (
            <div className="alert alert-danger py-2 mb-0">{error}</div>
          )}

          {/* Item Name */}
          <div>
            <CFormLabel htmlFor="overhead-item-name">
              Item Name *
            </CFormLabel>
            <CFormInput
              id="overhead-item-name"
              type="text"
              value={formData.item_name}
              onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
              placeholder="e.g., Project Management Salary"
              required
            />
          </div>

          {/* Amount and Frequency - 2 columns */}
          <CRow className="g-3">
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="overhead-item-amount">
                Amount *
              </CFormLabel>
              <CFormInput
                id="overhead-item-amount"
                type="text"
                value={amountDisplay}
                onChange={handleAmountChange}
                onBlur={handleAmountBlur}
                onFocus={handleAmountFocus}
                placeholder="$0.00"
                required
                className="text-end"
              />
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="overhead-item-frequency">
                Frequency
              </CFormLabel>
              <CFormSelect
                id="overhead-item-frequency"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>

          {/* Start Period, Duration, Apply to Level - 3 columns with centered 2-line labels */}
          {formData.frequency !== 'one_time' && (
            <>
              <CRow className="g-3">
                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="overhead-start-period" className="d-block text-center small lh-sm">
                    Start<br />Period
                  </CFormLabel>
                  <CFormInput
                    id="overhead-start-period"
                    type="number"
                    min="1"
                    max={projectEndPeriod}
                    value={formData.start_period}
                    onChange={(e) => handleStartPeriodChange(parseInt(e.target.value) || 1)}
                    className="text-center"
                  />
                </CCol>
                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="overhead-duration-periods" className="d-block text-center small lh-sm">
                    Duration<br />(periods)
                  </CFormLabel>
                  <CFormInput
                    id="overhead-duration-periods"
                    type="number"
                    min="1"
                    value={formData.duration_periods}
                    onChange={(e) => {
                      setThroughEndOfAnalysis(false);
                      setFormData({ ...formData, duration_periods: parseInt(e.target.value) || 1 });
                    }}
                    className="text-center"
                  />
                </CCol>
                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="overhead-apply-level" className="d-block text-center small lh-sm">
                    Apply<br />to Level
                  </CFormLabel>
                  <CFormSelect
                    id="overhead-apply-level"
                    value={formData.container_level || 'project'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        container_level: e.target.value === 'project' ? undefined : e.target.value,
                      })
                    }
                  >
                    {levelOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </CRow>
              {/* Through end of analysis checkbox */}
              <div className="form-check mb-0">
                <input
                  type="checkbox"
                  id="throughEndOfAnalysis"
                  checked={throughEndOfAnalysis}
                  onChange={(e) => handleThroughEndToggle(e.target.checked)}
                  className="form-check-input"
                />
                <label htmlFor="throughEndOfAnalysis" className="form-check-label text-medium-emphasis">
                  Through end of analysis (period {projectEndPeriod})
                </label>
              </div>
            </>
          )}

          {/* Apply to Level for one-time (show separately since no period/duration) */}
          {formData.frequency === 'one_time' && (
            <div>
              <CFormLabel htmlFor="overhead-apply-level-onetime">
                Apply to Level
              </CFormLabel>
              <CFormSelect
                id="overhead-apply-level-onetime"
                value={formData.container_level || 'project'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    container_level: e.target.value === 'project' ? undefined : e.target.value,
                  })
                }
              >
                {levelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </CFormSelect>
            </div>
          )}

          {/* Calculated Total */}
          <div className="p-3 rounded" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
            <div className="d-flex justify-content-between align-items-center">
              <span className="small text-medium-emphasis">Calculated Total:</span>
              <span className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
                {formatCurrency(calculatedTotal)}
              </span>
            </div>
            {getProratedDescription() && (
              <div className="small text-medium-emphasis text-end mt-1" style={{ fontSize: '0.75rem' }}>
                {getProratedDescription()}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <CFormLabel htmlFor="overhead-notes">
              Notes (optional)
            </CFormLabel>
            <CFormTextarea
              id="overhead-notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <SemanticButton intent="secondary-action" type="button" onClick={handleClose} disabled={saving}>
            Cancel
          </SemanticButton>
          <SemanticButton intent="primary-action" type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingItem ? 'Update' : 'Add Item'}
          </SemanticButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
}
