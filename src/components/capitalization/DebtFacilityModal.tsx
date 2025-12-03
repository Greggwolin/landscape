'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CRow,
  CCol,
} from '@coreui/react';
import type { DebtFacility } from './DebtFacilitiesTable';
import { useUnsavedChanges, useKeyboardShortcuts } from '@/hooks/useUnsavedChanges';

interface DebtFacilityModalProps {
  visible: boolean;
  facility?: DebtFacility | null;
  onClose: () => void;
  onSave: (data: Partial<DebtFacility>) => Promise<void>;
}

/**
 * DebtFacilityModal Component
 *
 * Modal for adding/editing debt facilities.
 * Per user clarification: Manual entry for Phase 5.
 */
export default function DebtFacilityModal({
  visible,
  facility,
  onClose,
  onSave,
}: DebtFacilityModalProps) {
  // Track initial data for change detection
  const initialData = useMemo<Partial<DebtFacility>>(() =>
    facility || {
      facilityName: '',
      lender: '',
      facilityType: 'construction',
      commitmentAmount: 0,
      outstandingBalance: 0,
      interestRate: 0,
      maturityDate: '',
      status: 'active',
    }, [facility]);

  const [formData, setFormData] = useState<Partial<DebtFacility>>(initialData);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      if (facility) {
        setFormData(facility);
      } else {
        setFormData({
          facilityName: '',
          lender: '',
          facilityType: 'construction',
          commitmentAmount: 0,
          outstandingBalance: 0,
          interestRate: 0,
          maturityDate: '',
          status: 'active',
        });
      }
      setErrors({});
    }
  }, [visible, facility]);

  // Detect if form has unsaved changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  // Use unsaved changes hook for close confirmation
  const handleCloseWithConfirmation = useUnsavedChanges(hasChanges, onClose);

  // Add keyboard shortcuts (ESC to close)
  useKeyboardShortcuts(handleCloseWithConfirmation);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.facilityName?.trim()) {
      newErrors.facilityName = 'Facility name is required';
    }
    if (!formData.lender?.trim()) {
      newErrors.lender = 'Lender is required';
    }
    if (!formData.commitmentAmount || formData.commitmentAmount <= 0) {
      newErrors.commitmentAmount = 'Commitment amount must be greater than 0';
    }
    if (formData.interestRate === undefined || formData.interestRate < 0) {
      newErrors.interestRate = 'Interest rate must be 0 or greater';
    }
    if (!formData.maturityDate) {
      newErrors.maturityDate = 'Maturity date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    try {
      // Convert interest rate from percentage to decimal
      const dataToSave = {
        ...formData,
        interestRate: Number(formData.interestRate) / 100,
        commitmentAmount: Number(formData.commitmentAmount),
        outstandingBalance: Number(formData.outstandingBalance || 0),
      };

      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error('Failed to save facility:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <CModal
      visible={visible}
      onClose={handleCloseWithConfirmation}
      alignment="center"
      size="lg"
      backdrop="static"
    >
      <CModalHeader closeButton>
        <CModalTitle>
          {facility ? 'Edit Debt Facility' : 'Add Debt Facility'}
        </CModalTitle>
      </CModalHeader>

      <CForm onSubmit={handleSubmit}>
        <CModalBody>
          <CRow className="g-3">
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="facilityName">Facility Name *</CFormLabel>
              <CFormInput
                type="text"
                id="facilityName"
                value={formData.facilityName || ''}
                onChange={(e) => handleChange('facilityName', e.target.value)}
                invalid={!!errors.facilityName}
                feedback={errors.facilityName}
              />
            </CCol>

            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="lender">Lender *</CFormLabel>
              <CFormInput
                type="text"
                id="lender"
                value={formData.lender || ''}
                onChange={(e) => handleChange('lender', e.target.value)}
                invalid={!!errors.lender}
                feedback={errors.lender}
              />
            </CCol>

            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="facilityType">Facility Type</CFormLabel>
              <CFormSelect
                id="facilityType"
                value={formData.facilityType || 'construction'}
                onChange={(e) => handleChange('facilityType', e.target.value)}
              >
                <option value="construction">Construction</option>
                <option value="acquisition">Acquisition</option>
                <option value="mezzanine">Mezzanine</option>
                <option value="bridge">Bridge</option>
              </CFormSelect>
            </CCol>

            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="status">Status</CFormLabel>
              <CFormSelect
                id="status"
                value={formData.status || 'active'}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </CFormSelect>
            </CCol>

            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="commitmentAmount">Commitment Amount *</CFormLabel>
              <CFormInput
                type="number"
                id="commitmentAmount"
                value={formData.commitmentAmount || ''}
                onChange={(e) => handleChange('commitmentAmount', e.target.value)}
                step="1000"
                invalid={!!errors.commitmentAmount}
                feedback={errors.commitmentAmount}
              />
            </CCol>

            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="outstandingBalance">Outstanding Balance</CFormLabel>
              <CFormInput
                type="number"
                id="outstandingBalance"
                value={formData.outstandingBalance || ''}
                onChange={(e) => handleChange('outstandingBalance', e.target.value)}
                step="1000"
              />
            </CCol>

            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="interestRate">Interest Rate (%) *</CFormLabel>
              <CFormInput
                type="number"
                id="interestRate"
                value={formData.interestRate ? (formData.interestRate * 100).toFixed(2) : ''}
                onChange={(e) => handleChange('interestRate', e.target.value)}
                step="0.01"
                invalid={!!errors.interestRate}
                feedback={errors.interestRate}
              />
            </CCol>

            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="maturityDate">Maturity Date *</CFormLabel>
              <CFormInput
                type="date"
                id="maturityDate"
                value={formData.maturityDate || ''}
                onChange={(e) => handleChange('maturityDate', e.target.value)}
                invalid={!!errors.maturityDate}
                feedback={errors.maturityDate}
              />
            </CCol>
          </CRow>
        </CModalBody>

        <CModalFooter>
          <CButton color="secondary" onClick={handleCloseWithConfirmation} disabled={saving}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : facility ? 'Update' : 'Add'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
}
