// Phase 2B · Budget item modal for Standard/Detail editing and creation
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CButton,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CCol,
  CFormTextarea,
} from '@coreui/react';
import CategoryCascadingDropdown from './CategoryCascadingDropdown';
import type { BudgetItem } from './ColumnDefinitions';
import type { BudgetMode } from './ModeSelector';
import { useUnsavedChanges, useKeyboardShortcuts } from '@/hooks/useUnsavedChanges';

export interface BudgetItemFormValues {
  fact_id?: number;
  project_id?: number;
  category_id: number; // Legacy field - will be replaced by category_l1_id
  category_l1_id?: number | null;
  category_l2_id?: number | null;
  category_l3_id?: number | null;
  category_l4_id?: number | null;
  division_id?: number | null;
  qty: number | null;
  rate: number | null;
  amount: number | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  uom_code: string | null;
  confidence_level?: string | null;
  escalation_rate?: number | null;
  contingency_pct?: number | null;
  timing_method?: string | null;
  funding_id?: number | null;
  curve_id?: number | null;
  milestone_id?: number | null;
  cf_start_flag?: boolean | null;
}

interface BudgetItemModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  budgetMode: BudgetMode;
  initialItem?: BudgetItem | null;
  projectId: number;
  onClose: () => void;
  onSave: (values: BudgetItemFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

interface FormState {
  fact_id: number | null;
  category_id: number | null; // Legacy - keep for backward compatibility
  category_l1_id: number | null;
  category_l2_id: number | null;
  category_l3_id: number | null;
  category_l4_id: number | null;
  division_id: number | null;
  qty: number | null;
  rate: number | null;
  start_date: string;
  end_date: string;
  notes: string;
  uom_code: string | null;
  confidence_level: string | null;
  escalation_rate: number | null;
  contingency_pct: number | null;
  timing_method: string | null;
  funding_id: number | null;
  curve_id: number | null;
  milestone_id: number | null;
  cf_start_flag: boolean;
}

const confidenceOptions = [
  { value: 'HIGH', label: 'High (5%)' },
  { value: 'MEDIUM', label: 'Medium (10%)' },
  { value: 'LOW', label: 'Low (15%)' },
  { value: 'CONCEPTUAL', label: 'Conceptual (25%)' },
];

const timingOptions = [
  { value: 'distributed', label: 'Even Distribution' },
  { value: 'curve', label: 'S-Curve' },
  { value: 'milestone', label: 'Milestone-Based' },
  { value: 'manual', label: 'Manual' },
];

const uomOptions = [
  { value: 'EA', label: 'Each' },
  { value: 'AC', label: 'Acre' },
  { value: 'SF', label: 'Square Feet' },
  { value: 'LF', label: 'Linear Feet' },
  { value: 'CY', label: 'Cubic Yards' },
  { value: 'LOT', label: 'Lot' },
];

const formatDateInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const buildStateFromItem = (item?: BudgetItem | null): FormState => ({
  fact_id: item?.fact_id ?? null,
  category_id: item?.category_id ?? null, // Legacy
  category_l1_id: (item as any)?.category_l1_id ?? null,
  category_l2_id: (item as any)?.category_l2_id ?? null,
  category_l3_id: (item as any)?.category_l3_id ?? null,
  category_l4_id: (item as any)?.category_l4_id ?? null,
  division_id: item?.division_id ?? null,
  qty: item?.qty ?? null,
  rate: item?.rate ?? null,
  start_date: formatDateInput(item?.start_date ?? null),
  end_date: formatDateInput(item?.end_date ?? null),
  notes: item?.notes ?? '',
  uom_code: item?.uom_code ?? 'EA',
  confidence_level: item?.confidence_level ?? null,
  escalation_rate: item?.escalation_rate ?? null,
  contingency_pct: item?.contingency_pct ?? null,
  timing_method: item?.timing_method ?? 'distributed',
  funding_id: item?.funding_id ?? null,
  curve_id: item?.curve_id ?? null,
  milestone_id: item?.milestone_id ?? null,
  cf_start_flag: Boolean(item?.cf_start_flag ?? false),
});

export default function BudgetItemModal({
  open,
  mode,
  budgetMode,
  initialItem,
  projectId,
  onClose,
  onSave,
  onDelete,
}: BudgetItemModalProps) {
  // Track initial data for change detection
  const initialData = useMemo(() => buildStateFromItem(initialItem), [initialItem]);

  const [form, setForm] = useState<FormState>(initialData);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(buildStateFromItem(initialItem));
      setError(null);
    }
  }, [initialItem, open]);

  // Detect if form has unsaved changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialData);
  }, [form, initialData]);

  // Use unsaved changes hook for close confirmation
  const handleCloseWithConfirmation = useUnsavedChanges(hasChanges, onClose);

  // Add keyboard shortcuts (ESC to close)
  useKeyboardShortcuts(handleCloseWithConfirmation);

  const calculatedAmount = useMemo(() => {
    const qty = form.qty ?? 0;
    const rate = form.rate ?? 0;
    if (qty === null || rate === null) return null;
    return Number(qty) * Number(rate);
  }, [form.qty, form.rate]);

const updateNumber = (key: keyof FormState, value: string) => {
  setForm((prev) => ({
    ...prev,
    [key]:
      value === '' ? null : Number.isNaN(Number(value)) ? (prev as any)[key] : Number(value),
  }));
};

const updateText = (key: keyof FormState, value: string) => {
  setForm((prev) => ({
    ...prev,
    [key]: value,
  }));
};

const updateDate = (key: keyof FormState, value: string) => {
  setForm((prev) => ({
    ...prev,
    [key]: value,
  }));
};

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Validate: Either old category_id or new category_l1_id is required
    if (!form.category_id && !form.category_l1_id) {
      setError('At least one category level is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: BudgetItemFormValues = {
      fact_id: form.fact_id ?? undefined,
      project_id: projectId,
      category_id: form.category_id ?? form.category_l1_id!, // Use category_l1_id as fallback for legacy category_id
      category_l1_id: form.category_l1_id,
      category_l2_id: form.category_l2_id,
      category_l3_id: form.category_l3_id,
      category_l4_id: form.category_l4_id,
      division_id: form.division_id ?? null,
      qty: form.qty,
      rate: form.rate,
      amount: calculatedAmount,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      notes: form.notes.trim() === '' ? null : form.notes,
      uom_code: form.uom_code,
      confidence_level: form.confidence_level,
      escalation_rate: form.escalation_rate,
      contingency_pct: form.contingency_pct,
      timing_method: form.timing_method,
      funding_id: form.funding_id,
      curve_id: form.curve_id,
      milestone_id: form.milestone_id,
      cf_start_flag: form.cf_start_flag,
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Failed to save budget item', err);
      setError(err instanceof Error ? err.message : 'Failed to save budget item.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      console.error('Failed to delete budget item', err);
      setError(err instanceof Error ? err.message : 'Failed to delete budget item.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <CModal visible={open} onClose={handleCloseWithConfirmation} alignment="center" size="lg" scrollable>
      <CModalHeader closeButton>
        <CModalTitle>
          {mode === 'create' ? 'Add Budget Item' : `Edit Budget Item #${form.fact_id ?? ''}`}
        </CModalTitle>
      </CModalHeader>
      <form onSubmit={handleSubmit}>
        <CModalBody>
          {error && <div className="alert alert-danger">{error}</div>}
          <CRow className="g-3">
            {/* Budget Category Selection */}
            <CCol md={12}>
              <CategoryCascadingDropdown
                projectId={projectId}
                complexityMode={budgetMode === 'basic' ? 'basic' : budgetMode === 'standard' ? 'standard' : 'detail'}
                value={{
                  level_1: form.category_l1_id,
                  level_2: form.category_l2_id,
                  level_3: form.category_l3_id,
                  level_4: form.category_l4_id,
                }}
                onChange={(categories) => {
                  setForm(prev => ({
                    ...prev,
                    category_l1_id: categories.level_1 ?? null,
                    category_l2_id: categories.level_2 ?? null,
                    category_l3_id: categories.level_3 ?? null,
                    category_l4_id: categories.level_4 ?? null,
                  }));
                }}
                required={!form.category_id} // Required if legacy category_id is not set
                disabled={mode === 'edit'}
              />
            </CCol>

            {/* Geographic Container */}
            <CCol md={6}>
              <CFormLabel htmlFor="divisionId">Container ID</CFormLabel>
              <CFormInput
                id="divisionId"
                type="number"
                value={form.division_id ?? ''}
                onChange={(e) => updateNumber('division_id', e.target.value)}
              />
              <small className="text-medium-emphasis">
                Geographic unit (Project/Area/Phase/Parcel)
              </small>
            </CCol>

            {/* Legacy Category ID (hidden if using new categories) */}
            {form.category_id && !form.category_l1_id && (
              <CCol md={6}>
                <CFormLabel htmlFor="legacyCategoryId">Legacy Category ID</CFormLabel>
                <CFormInput
                  id="legacyCategoryId"
                  type="number"
                  value={form.category_id ?? ''}
                  onChange={(e) => updateNumber('category_id', e.target.value)}
                  disabled
                />
                <small className="text-medium-emphasis">
                  Using old category system
                </small>
              </CCol>
            )}
            <CCol md={12}>
              <CFormLabel htmlFor="notes">Description / Notes</CFormLabel>
              <CFormTextarea
                id="notes"
                rows={2}
                value={form.notes}
                onChange={(e) => updateText('notes', e.target.value)}
                placeholder="Add contextual notes for this budget line"
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="qty">Quantity</CFormLabel>
              <CFormInput
                id="qty"
                type="number"
                value={form.qty ?? ''}
                onChange={(e) => updateNumber('qty', e.target.value)}
                step="0.01"
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="rate">Rate</CFormLabel>
              <CFormInput
                id="rate"
                type="number"
                value={form.rate ?? ''}
                onChange={(e) => updateNumber('rate', e.target.value)}
                step="0.01"
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel>Amount</CFormLabel>
              <CFormInput
                readOnly
                value={
                  calculatedAmount !== null ? calculatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''
                }
                placeholder="$0.00"
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="uom">UOM</CFormLabel>
              <CFormSelect
                id="uom"
                value={form.uom_code ?? ''}
                onChange={(e) => updateText('uom_code', e.target.value)}
              >
                <option value="">Select…</option>
                {uomOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="startDate">Start Date</CFormLabel>
              <CFormInput
                id="startDate"
                type="date"
                value={form.start_date ?? ''}
                onChange={(e) => updateDate('start_date', e.target.value)}
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="endDate">End Date</CFormLabel>
              <CFormInput
                id="endDate"
                type="date"
                value={form.end_date ?? ''}
                onChange={(e) => updateDate('end_date', e.target.value)}
              />
            </CCol>

            {(budgetMode === 'standard' || budgetMode === 'detail') && (
              <>
                <CCol md={4}>
                  <CFormLabel htmlFor="confidence">Confidence</CFormLabel>
                  <CFormSelect
                    id="confidence"
                    value={form.confidence_level ?? ''}
                    onChange={(e) => updateText('confidence_level', e.target.value || null)}
                  >
                    <option value="">Select…</option>
                    {confidenceOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="escalation">Escalation %</CFormLabel>
                  <CFormInput
                    id="escalation"
                    type="number"
                    step="0.01"
                    value={form.escalation_rate ?? ''}
                    onChange={(e) => updateNumber('escalation_rate', e.target.value)}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="contingency">Contingency %</CFormLabel>
                  <CFormInput
                    id="contingency"
                    type="number"
                    step="0.01"
                    value={form.contingency_pct ?? ''}
                    onChange={(e) => updateNumber('contingency_pct', e.target.value)}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="timing">Timing Method</CFormLabel>
                  <CFormSelect
                    id="timing"
                    value={form.timing_method ?? ''}
                    onChange={(e) => updateText('timing_method', e.target.value || null)}
                  >
                    <option value="">Select…</option>
                    {timingOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </>
            )}

            {budgetMode === 'detail' && (
              <>
                <CCol md={4}>
                  <CFormLabel htmlFor="funding">Funding ID</CFormLabel>
                  <CFormInput
                    id="funding"
                    type="number"
                    value={form.funding_id ?? ''}
                    onChange={(e) => updateNumber('funding_id', e.target.value)}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="curve">Curve ID</CFormLabel>
                  <CFormInput
                    id="curve"
                    type="number"
                    value={form.curve_id ?? ''}
                    onChange={(e) => updateNumber('curve_id', e.target.value)}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="milestone">Milestone ID</CFormLabel>
                  <CFormInput
                    id="milestone"
                    type="number"
                    value={form.milestone_id ?? ''}
                    onChange={(e) => updateNumber('milestone_id', e.target.value)}
                  />
                </CCol>
                <CCol md={4} className="d-flex align-items-center">
                  <CFormSwitch
                    id="cfStartFlag"
                    label="CF Start"
                    checked={form.cf_start_flag}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, cf_start_flag: e.target.checked }))
                    }
                  />
                </CCol>
              </>
            )}
          </CRow>
        </CModalBody>
        <CModalFooter className="d-flex justify-content-between">
          {mode === 'edit' && onDelete ? (
            <CButton color="danger" variant="outline" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </CButton>
          ) : (
            <span />
          )}
          <div className="d-flex gap-2">
            <CButton color="secondary" variant="outline" onClick={handleCloseWithConfirmation} disabled={submitting}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </CButton>
          </div>
        </CModalFooter>
      </form>
    </CModal>
  );
}
