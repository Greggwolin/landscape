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

  return (
    <CModal visible={isOpen} onClose={handleClose} alignment="center" size="lg" backdrop="static">
      <CForm onSubmit={handleSubmit}>
        <CModalHeader closeButton>
          <CModalTitle>{editingFee ? 'Edit Developer Fee' : 'Add Developer Fee'}</CModalTitle>
        </CModalHeader>
        <CModalBody className="d-flex flex-column gap-3">
          {error && (
            <div className="alert alert-danger py-2 mb-0">{error}</div>
          )}

          {/* Fee Type */}
          <div>
            <CFormLabel htmlFor="developer-fee-type">
              Fee Type *
            </CFormLabel>
            <CFormSelect
              id="developer-fee-type"
              value={formData.fee_type}
              onChange={(e) => setFormData({ ...formData, fee_type: e.target.value })}
            >
              {FEE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </CFormSelect>
          </div>

          {/* Fee Description */}
          <div>
            <CFormLabel htmlFor="developer-fee-description">
              Description
            </CFormLabel>
            <CFormInput
              id="developer-fee-description"
              type="text"
              value={formData.fee_description || ''}
              onChange={(e) => setFormData({ ...formData, fee_description: e.target.value })}
              placeholder="e.g., 4% of total project cost"
            />
          </div>

          {/* Basis Type */}
          <div>
            <CFormLabel htmlFor="developer-fee-basis-type">
              Basis Type *
            </CFormLabel>
            <CFormSelect
              id="developer-fee-basis-type"
              value={formData.basis_type}
              onChange={(e) => setFormData({ ...formData, basis_type: e.target.value })}
            >
              {BASIS_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </CFormSelect>
          </div>

          {/* Basis Value and Calculated Amount */}
          <CRow className="g-3">
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="developer-fee-basis-value">
                Basis Value
              </CFormLabel>
              <CFormInput
                id="developer-fee-basis-value"
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
              />
              <p className="small text-medium-emphasis mt-1 mb-0" style={{ fontSize: '0.75rem' }}>
                {formData.basis_type.startsWith('percent') ? 'Percentage (e.g., 4.0 = 4%)' : 'Dollar amount'}
              </p>
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="developer-fee-calculated-amount">
                Calculated Amount
              </CFormLabel>
              <CFormInput
                id="developer-fee-calculated-amount"
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
              />
            </CCol>
          </CRow>

          {/* Payment Timing */}
          <div>
            <CFormLabel htmlFor="developer-fee-payment-timing">
              Payment Timing
            </CFormLabel>
            <CFormInput
              id="developer-fee-payment-timing"
              type="text"
              value={formData.payment_timing || ''}
              onChange={(e) => setFormData({ ...formData, payment_timing: e.target.value })}
              placeholder="e.g., 50% at closing, 50% at CO"
            />
          </div>

          {/* Timing - Start Period and Duration */}
          <CRow className="g-3">
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="developer-fee-start-period">
                Start Period
              </CFormLabel>
              <CFormInput
                id="developer-fee-start-period"
                type="number"
                min="1"
                value={formData.timing_start_period ?? 1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    timing_start_period: parseInt(e.target.value) || 1,
                  })
                }
              />
              <p className="small text-medium-emphasis mt-1 mb-0" style={{ fontSize: '0.75rem' }}>
                Period when fee payment begins
              </p>
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="developer-fee-duration">
                Duration (periods)
              </CFormLabel>
              <CFormInput
                id="developer-fee-duration"
                type="number"
                min="1"
                value={formData.timing_duration_periods ?? 1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    timing_duration_periods: parseInt(e.target.value) || 1,
                  })
                }
              />
              <p className="small text-medium-emphasis mt-1 mb-0" style={{ fontSize: '0.75rem' }}>
                Number of periods to distribute fee over
              </p>
            </CCol>
          </CRow>

          {/* Status */}
          <div>
            <CFormLabel htmlFor="developer-fee-status">
              Status
            </CFormLabel>
            <CFormSelect
              id="developer-fee-status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </CFormSelect>
          </div>

          {/* Notes */}
          <div>
            <CFormLabel htmlFor="developer-fee-notes">
              Notes
            </CFormLabel>
            <CFormTextarea
              id="developer-fee-notes"
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
            {saving ? 'Saving...' : editingFee ? 'Update' : 'Add Fee'}
          </SemanticButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
}
