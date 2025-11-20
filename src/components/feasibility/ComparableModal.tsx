'use client';

import React, { useState, useEffect } from 'react';
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
  CRow,
  CCol,
} from '@coreui/react';
import type { ComparableColumn } from './ComparablesTable';

interface ComparableModalProps {
  visible: boolean;
  title: string;
  columns: ComparableColumn[];
  initialData?: Record<string, any>;
  onClose: () => void;
  onSave: (data: Record<string, any>) => Promise<void>;
}

/**
 * ComparableModal Component
 *
 * Modal dialog for adding/editing market data comparables.
 * Dynamically renders form fields based on column configuration.
 *
 * Features:
 * - Auto-generated form from column definitions
 * - Type-aware inputs (text, number, date, currency)
 * - Validation
 * - Loading state during save
 */
export default function ComparableModal({
  visible,
  title,
  columns,
  initialData,
  onClose,
  onSave,
}: ComparableModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      // Initialize form data
      const initial: Record<string, any> = {};
      columns.forEach((col) => {
        if (col.key !== 'id') {
          initial[col.key] = initialData?.[col.key] ?? '';
        }
      });
      setFormData(initial);
      setErrors({});
    }
  }, [visible, columns, initialData]);

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Clear error for this field
    if (errors[key]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    columns.forEach((col) => {
      if (col.key === 'id') return;

      const value = formData[col.key];

      // Check required fields (simple validation - all fields required)
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        newErrors[col.key] = `${col.label} is required`;
      }

      // Type-specific validation
      if (value) {
        if (col.type === 'number' || col.type === 'currency') {
          if (isNaN(Number(value))) {
            newErrors[col.key] = `${col.label} must be a valid number`;
          }
        }
        if (col.type === 'date') {
          if (isNaN(Date.parse(value))) {
            newErrors[col.key] = `${col.label} must be a valid date`;
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    try {
      // Convert types before saving
      const processedData: Record<string, any> = { ...formData };

      columns.forEach((col) => {
        if (col.key === 'id') return;

        if (col.type === 'number' || col.type === 'currency') {
          processedData[col.key] = Number(formData[col.key]);
        }
      });

      // Include id if editing
      if (initialData?.id) {
        processedData.id = initialData.id;
      }

      await onSave(processedData);
      onClose();
    } catch (error) {
      console.error('Failed to save comparable:', error);
      // Could add error toast here
    } finally {
      setSaving(false);
    }
  };

  const getInputType = (colType: ComparableColumn['type']): string => {
    switch (colType) {
      case 'number':
      case 'currency':
        return 'number';
      case 'date':
        return 'date';
      default:
        return 'text';
    }
  };

  const getInputStep = (colType: ComparableColumn['type']): string | undefined => {
    if (colType === 'currency') return '0.01';
    if (colType === 'number') return 'any';
    return undefined;
  };

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      size="lg"
      backdrop="static"
    >
      <CModalHeader>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>

      <CForm onSubmit={handleSubmit}>
        <CModalBody>
          <CRow className="g-3">
            {columns.map((col) => {
              if (col.key === 'id') return null;

              return (
                <CCol xs={12} md={6} key={col.key}>
                  <CFormLabel htmlFor={col.key}>{col.label}</CFormLabel>
                  <CFormInput
                    type={getInputType(col.type)}
                    id={col.key}
                    value={formData[col.key] ?? ''}
                    onChange={(e) => handleChange(col.key, e.target.value)}
                    step={getInputStep(col.type)}
                    invalid={!!errors[col.key]}
                    feedback={errors[col.key]}
                  />
                </CCol>
              );
            })}
          </CRow>
        </CModalBody>

        <CModalFooter>
          <CButton
            color="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            type="submit"
            disabled={saving}
          >
            {saving ? 'Saving...' : initialData?.id ? 'Update' : 'Add'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
}
