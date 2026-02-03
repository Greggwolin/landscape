// GanttEditModal.tsx - Modal for editing budget item timing
// Session VG08 · 2025-12-11
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormInput,
  CFormLabel,
  CRow,
  CCol,
  CAlert,
} from '@coreui/react';
import type { BudgetItem } from '@/types/budget';
import { formatMoney } from '@/utils/formatters/number';
import { useCloseOnEscape } from '@/hooks/useCloseOnEscape';
import { SemanticButton } from '@/components/ui/landscape';

interface Props {
  item: BudgetItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (factId: number, startPeriod: number, periodsToComplete: number) => Promise<void>;
}

export default function GanttEditModal({ item, isOpen, onClose, onSave }: Props) {
  useCloseOnEscape(isOpen, onClose);
  const [startPeriod, setStartPeriod] = useState<string>('');
  const [endPeriod, setEndPeriod] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form values when item changes
  useEffect(() => {
    if (item && isOpen) {
      const start = item.start_period || 1;
      const duration = item.periods_to_complete || 1;
      setStartPeriod(start.toString());
      setEndPeriod((start + duration - 1).toString());
      setError(null);
    }
  }, [item, isOpen]);

  // Calculate duration from start and end
  const duration = useMemo(() => {
    const start = parseInt(startPeriod) || 0;
    const end = parseInt(endPeriod) || 0;
    if (start > 0 && end >= start) {
      return end - start + 1;
    }
    return 0;
  }, [startPeriod, endPeriod]);

  // Validate inputs
  const isValid = useMemo(() => {
    const start = parseInt(startPeriod) || 0;
    const end = parseInt(endPeriod) || 0;
    return start > 0 && end >= start;
  }, [startPeriod, endPeriod]);

  // Handle save
  const handleSave = async () => {
    if (!item || !isValid) return;

    const start = parseInt(startPeriod);
    const periodsToComplete = duration;

    setSaving(true);
    setError(null);

    try {
      await onSave(item.fact_id, start, periodsToComplete);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Handle end period change - ensure it's >= start
  const handleEndPeriodChange = (value: string) => {
    const end = parseInt(value) || 0;
    const start = parseInt(startPeriod) || 0;
    if (end < start && end > 0) {
      setEndPeriod(startPeriod);
    } else {
      setEndPeriod(value);
    }
  };

  // Handle start period change - adjust end if needed
  const handleStartPeriodChange = (value: string) => {
    setStartPeriod(value);
    const newStart = parseInt(value) || 0;
    const currentEnd = parseInt(endPeriod) || 0;
    if (newStart > currentEnd && newStart > 0) {
      setEndPeriod(value);
    }
  };

  if (!item) return null;

  const displayName = item.notes || item.category_breadcrumb || item.category_name || `Item ${item.fact_id}`;

  return (
    <CModal visible={isOpen} onClose={onClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>Edit Timeline</CModalTitle>
      </CModalHeader>

      <CModalBody>
        {error && (
          <CAlert color="danger" className="mb-3">
            {error}
          </CAlert>
        )}

        {/* Item name (read-only) */}
        <div className="mb-4">
          <CFormLabel className="text-secondary small mb-1">Item</CFormLabel>
          <div className="fw-semibold" style={{ fontSize: '1rem' }}>
            {displayName}
          </div>
        </div>

        {/* Timing inputs */}
        <CRow className="g-3 mb-4">
          <CCol md={4}>
            <CFormLabel htmlFor="start-period">Start Period</CFormLabel>
            <CFormInput
              type="number"
              id="start-period"
              value={startPeriod}
              onChange={(e) => handleStartPeriodChange(e.target.value)}
              min={1}
              className="text-center"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel htmlFor="end-period">End Period</CFormLabel>
            <CFormInput
              type="number"
              id="end-period"
              value={endPeriod}
              onChange={(e) => handleEndPeriodChange(e.target.value)}
              min={parseInt(startPeriod) || 1}
              className="text-center"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel>Duration</CFormLabel>
            <CFormInput
              value={duration > 0 ? `${duration} period${duration !== 1 ? 's' : ''}` : '-'}
              readOnly
              className="text-center bg-light"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            />
          </CCol>
        </CRow>

        {/* Current amount (read-only) */}
        <div className="p-3 rounded" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
          <CRow>
            <CCol xs={6}>
              <div className="text-secondary small mb-1">Current escalated amount</div>
              <div className="fw-semibold">{formatMoney(item.amount)}</div>
            </CCol>
            <CCol xs={6}>
              <div className="text-secondary small mb-1">Scope</div>
              <div className="fw-semibold">{item.scope || '-'}</div>
            </CCol>
          </CRow>
          {item.escalation_rate != null && item.escalation_rate > 0 && (
            <div className="mt-2 pt-2 border-top">
              <div className="text-secondary small">
                Escalation: {item.escalation_rate}% per year
              </div>
              <div className="small text-info">
                Cost will be recalculated based on new timing
              </div>
            </div>
          )}
        </div>

        {!isValid && startPeriod && endPeriod && (
          <CAlert color="warning" className="mt-3 mb-0">
            End period must be greater than or equal to start period
          </CAlert>
        )}
      </CModalBody>

      <CModalFooter>
        <SemanticButton intent="tertiary-action" onClick={onClose} disabled={saving}>
          Cancel
        </SemanticButton>
        <SemanticButton intent="primary-action" onClick={handleSave} disabled={!isValid || saving}>
          {saving ? 'Saving...' : 'Save'}
        </SemanticButton>
      </CModalFooter>
    </CModal>
  );
}
