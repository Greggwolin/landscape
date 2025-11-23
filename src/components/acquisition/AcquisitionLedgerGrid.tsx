'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
  CTooltip,
} from '@coreui/react';
import { cilPencil, cilPlus, cilTrash } from '@coreui/icons';
import CIcon from '@coreui/icons-react';
import ModeSelector, { type BudgetMode } from '@/components/budget/ModeSelector';
import {
  ACQUISITION_EVENT_TYPES,
  acquisitionEventDebitCreditMap,
  type AcquisitionEvent,
  type AcquisitionEventType,
} from '@/types/acquisition';
import { formatMoney } from '@/utils/formatters/number';

interface Props {
  projectId: number;
  mode: BudgetMode;
  onModeChange: (mode: BudgetMode) => void;
  onEventsChange?: (events: AcquisitionEvent[]) => void;
}

const mapRow = (row: any): AcquisitionEvent => ({
  acquisitionId: row.acquisition_id,
  projectId: row.project_id,
  contactId: row.contact_id,
  eventDate: row.event_date,
  eventType: (row.event_type ?? 'Deposit') as AcquisitionEventType,
  description: row.description,
  amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
  isAppliedToPurchase: row.is_applied_to_purchase ?? true,
  goesHardDate: row.goes_hard_date,
  isConditional: row.is_conditional ?? false,
  unitsConveyed: row.units_conveyed === null || row.units_conveyed === undefined ? null : Number(row.units_conveyed),
  measureId: row.measure_id,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const truncate = (value: string | null | undefined, length = 60) => {
  if (!value) return '';
  return value.length > length ? `${value.slice(0, length)}…` : value;
};

const emptyFormState = {
  eventType: 'Deposit' as AcquisitionEventType,
  eventDate: '',
  description: '',
  amount: null as number | null,
  isAppliedToPurchase: true,
  goesHardDate: '',
  isConditional: false,
  notes: '',
};

export default function AcquisitionLedgerGrid({ projectId, mode, onModeChange, onEventsChange }: Props) {
  const [events, setEvents] = useState<AcquisitionEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<AcquisitionEvent | null>(null);
  const [form, setForm] = useState<typeof emptyFormState>(emptyFormState);
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null);
  const [inlineValues, setInlineValues] = useState<Record<number, Partial<AcquisitionEvent>>>({});

  const isDeposit = form.eventType === 'Deposit';

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/acquisition/ledger/`);
      if (!res.ok) {
        throw new Error(`Failed to load ledger (${res.status})`);
      }
      const json = await res.json();
      // Handle DRF paginated response (with results) or plain array
      const data = Array.isArray(json) ? json : (json.results || []);
      const mapped = data.map(mapRow);
      setEvents(mapped);
      onEventsChange?.(mapped);
    } catch (err) {
      console.error(err);
      setError('Unable to load acquisition ledger');
    } finally {
      setLoading(false);
    }
  }, [projectId, onEventsChange]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const resetForm = () => {
    setForm(emptyFormState);
    setEditing(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (row: AcquisitionEvent) => {
    setEditing(row);
    setForm({
      eventType: row.eventType,
      eventDate: row.eventDate ?? '',
      description: row.description ?? '',
      amount: row.amount ?? null,
      isAppliedToPurchase: row.isAppliedToPurchase ?? true,
      goesHardDate: row.goesHardDate ?? '',
      isConditional: row.isConditional ?? false,
      notes: row.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.eventType) return;
    setSaving(true);
    const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
    const payload = {
      event_type: form.eventType,
      event_date: form.eventDate || null,
      description: form.description || null,
      amount: form.amount ?? null,
      is_applied_to_purchase: form.isAppliedToPurchase,
      goes_hard_date: form.goesHardDate || null,
      is_conditional: form.isConditional,
      notes: form.notes || null,
    };

    try {
      const url = editing
        ? `${apiUrl}/api/projects/${projectId}/acquisition/ledger/${editing.acquisitionId}/`
        : `${apiUrl}/api/projects/${projectId}/acquisition/ledger/`;
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Save failed (${res.status})`);
      }
      await fetchEvents();
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      setError('Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (acquisitionId: number) => {
    setDeletingId(acquisitionId);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/acquisition/ledger/${acquisitionId}/`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(`Delete failed (${res.status})`);
      }
      await fetchEvents();
    } catch (err) {
      console.error(err);
      setError('Failed to delete event');
    } finally {
      setDeletingId(null);
    }
  };

  const handleInlineSave = async (acquisitionId: number) => {
    const changes = inlineValues[acquisitionId];
    if (!changes) return;

    const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
    const payload: any = {};

    if (changes.eventType !== undefined) payload.event_type = changes.eventType;
    if (changes.eventDate !== undefined) payload.event_date = changes.eventDate || null;
    if (changes.description !== undefined) payload.description = changes.description || null;
    if (changes.amount !== undefined) payload.amount = changes.amount ?? null;
    if (changes.isAppliedToPurchase !== undefined) payload.is_applied_to_purchase = changes.isAppliedToPurchase;
    if (changes.goesHardDate !== undefined) payload.goes_hard_date = changes.goesHardDate || null;
    if (changes.isConditional !== undefined) payload.is_conditional = changes.isConditional;
    if (changes.notes !== undefined) payload.notes = changes.notes || null;

    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/acquisition/ledger/${acquisitionId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Save failed (${res.status})`);
      }
      await fetchEvents();
      setInlineValues((prev) => {
        const updated = { ...prev };
        delete updated[acquisitionId];
        return updated;
      });
      setEditingCell(null);
    } catch (err) {
      console.error(err);
      setError('Failed to save changes');
    }
  };

  const getInlineValue = (row: AcquisitionEvent, field: keyof AcquisitionEvent) => {
    const changes = inlineValues[row.acquisitionId];
    return changes?.[field] !== undefined ? changes[field] : row[field];
  };

  const setInlineValue = (rowId: number, field: keyof AcquisitionEvent, value: any) => {
    setInlineValues((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [field]: value,
      },
    }));
  };

  const startEditing = (rowId: number, field: string) => {
    setEditingCell({ rowId, field });
  };

  const cancelEditing = () => {
    setEditingCell(null);
  };

  const saveAndNext = async (rowId: number, field: string, nextField?: string) => {
    await handleInlineSave(rowId);
    if (nextField) {
      setEditingCell({ rowId, field: nextField });
    } else {
      setEditingCell(null);
    }
  };

  const columns = useMemo(() => {
    // Napkin: Date, Event Type, Description, Amount, Go-Hard, Actions
    if (mode === 'napkin') {
      return ['eventDate', 'eventType', 'description', 'amount', 'goesHard', 'actions'];
    }

    // Standard: Date, Event Type, Description, Amount, Applicable, Go-Hard, Notes, Actions
    if (mode === 'standard') {
      return ['eventDate', 'eventType', 'description', 'amount', 'isAppliedToPurchase', 'goesHard', 'notes', 'actions'];
    }

    // Detail: All fields
    return ['eventDate', 'eventType', 'description', 'amount', 'isAppliedToPurchase', 'goesHard', 'isConditional', 'notes', 'actions'];
  }, [mode]);

  const renderAmountCell = (row: AcquisitionEvent) => {
    const amountLabel = row.amount !== null && row.amount !== undefined
      ? formatMoney(row.amount)
      : '—';

    return (
      <div className="d-flex align-items-center justify-content-end">
        <span className="fw-semibold tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {amountLabel}
        </span>
      </div>
    );
  };

  return (
    <CCard className="shadow-sm">
      <style>{`
        .editable-cell {
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .editable-cell:hover {
          background-color: rgba(var(--cui-primary-rgb), 0.05);
        }
      `}</style>
      <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h5 className="mb-0">Acquisition Ledger</h5>
          <small className="text-muted">Click any cell to edit inline • Backed by landscape.tbl_acquisition</small>
        </div>
        <div className="d-flex align-items-center gap-2">
          <ModeSelector activeMode={mode} onModeChange={onModeChange} />
          <CButton color="primary" size="sm" onClick={openCreateModal}>
            <CIcon icon={cilPlus} className="me-2" /> Add Event
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}
        {loading ? (
          <div className="d-flex align-items-center text-muted" style={{ minHeight: 160 }}>
            <CSpinner size="sm" className="me-2" /> Loading ledger...
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  {columns.includes('eventDate') && <th style={{ minWidth: 120 }}>Date</th>}
                  {columns.includes('eventType') && <th style={{ minWidth: 140 }}>Event Type</th>}
                  {columns.includes('description') && <th style={{ minWidth: 220 }}>Event Description</th>}
                  {columns.includes('amount') && <th className="text-end" style={{ minWidth: 160 }}>Amount</th>}
                  {columns.includes('isAppliedToPurchase') && <th className="text-center" style={{ minWidth: 110 }}>Applicable</th>}
                  {columns.includes('goesHard') && <th className="text-center" style={{ minWidth: 130 }}>Go-Hard</th>}
                  {columns.includes('isConditional') && <th style={{ minWidth: 140 }}>Is Conditional?</th>}
                  {columns.includes('notes') && <th style={{ minWidth: 220 }}>Notes</th>}
                  {columns.includes('actions') && <th style={{ width: 90 }} className="text-end">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {events.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="text-center text-muted py-4">
                      No acquisition events yet. Add your first event to start the ledger.
                    </td>
                  </tr>
                )}
                {events.map((row) => {
                  const isDepositRow = row.eventType === 'Deposit';
                  const isEditing = (field: string) => editingCell?.rowId === row.acquisitionId && editingCell?.field === field;

                  return (
                    <tr key={row.acquisitionId}>
                      {columns.includes('eventDate') && (
                        <td
                          className="editable-cell"
                          onClick={() => startEditing(row.acquisitionId, 'eventDate')}
                        >
                          {isEditing('eventDate') ? (
                            <CFormInput
                              size="sm"
                              type="date"
                              value={(getInlineValue(row, 'eventDate') as string) || ''}
                              onChange={(e) => setInlineValue(row.acquisitionId, 'eventDate', e.target.value)}
                              onBlur={() => handleInlineSave(row.acquisitionId)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(row.acquisitionId);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              autoFocus
                            />
                          ) : (
                            (getInlineValue(row, 'eventDate') as string) || '—'
                          )}
                        </td>
                      )}
                      {columns.includes('eventType') && (
                        <td
                          className="fw-semibold editable-cell"
                          onClick={() => startEditing(row.acquisitionId, 'eventType')}
                        >
                          {isEditing('eventType') ? (
                            <CFormSelect
                              size="sm"
                              value={getInlineValue(row, 'eventType') as string}
                              onChange={(e) => setInlineValue(row.acquisitionId, 'eventType', e.target.value)}
                              onBlur={() => handleInlineSave(row.acquisitionId)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(row.acquisitionId);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              autoFocus
                            >
                              {ACQUISITION_EVENT_TYPES.map((type) => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </CFormSelect>
                          ) : (
                            getInlineValue(row, 'eventType') as string
                          )}
                        </td>
                      )}
                      {columns.includes('description') && (
                        <td
                          className="editable-cell"
                          onClick={() => startEditing(row.acquisitionId, 'description')}
                        >
                          {isEditing('description') ? (
                            <CFormInput
                              size="sm"
                              value={(getInlineValue(row, 'description') as string) || ''}
                              onChange={(e) => setInlineValue(row.acquisitionId, 'description', e.target.value)}
                              onBlur={() => handleInlineSave(row.acquisitionId)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(row.acquisitionId);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              autoFocus
                            />
                          ) : (
                            (getInlineValue(row, 'description') as string) || '—'
                          )}
                        </td>
                      )}
                      {columns.includes('amount') && (
                        <td
                          className="text-end editable-cell"
                          onClick={() => startEditing(row.acquisitionId, 'amount')}
                        >
                          {isEditing('amount') ? (
                            <CFormInput
                              size="sm"
                              type="number"
                              step="0.01"
                              value={(getInlineValue(row, 'amount') as number) ?? ''}
                              onChange={(e) => setInlineValue(row.acquisitionId, 'amount', e.target.value === '' ? null : Number(e.target.value))}
                              onBlur={() => handleInlineSave(row.acquisitionId)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(row.acquisitionId);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              autoFocus
                            />
                          ) : (
                            renderAmountCell(row)
                          )}
                        </td>
                      )}
                      {columns.includes('isAppliedToPurchase') && (
                        <td
                          className="editable-cell text-center"
                          onClick={() => {
                            setInlineValue(row.acquisitionId, 'isAppliedToPurchase', !(getInlineValue(row, 'isAppliedToPurchase') as boolean));
                            setTimeout(() => handleInlineSave(row.acquisitionId), 100);
                          }}
                        >
                          <CBadge color={(getInlineValue(row, 'isAppliedToPurchase') as boolean) ? 'primary' : 'secondary'}>
                            {(getInlineValue(row, 'isAppliedToPurchase') as boolean) ? 'Yes' : 'No'}
                          </CBadge>
                        </td>
                      )}
                      {columns.includes('goesHard') && (
                        <td
                          className="editable-cell text-center"
                          onClick={() => startEditing(row.acquisitionId, 'goesHardDate')}
                        >
                          {isEditing('goesHardDate') ? (
                            <CFormInput
                              size="sm"
                              type="date"
                              value={(getInlineValue(row, 'goesHardDate') as string) || ''}
                              onChange={(e) => setInlineValue(row.acquisitionId, 'goesHardDate', e.target.value)}
                              onBlur={() => handleInlineSave(row.acquisitionId)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(row.acquisitionId);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              autoFocus
                            />
                          ) : (
                            (getInlineValue(row, 'goesHardDate') as string) || '—'
                          )}
                        </td>
                      )}
                      {columns.includes('isConditional') && (
                        <td>
                          {!isDepositRow ? (
                            <CBadge color={row.isConditional ? 'warning' : 'secondary'}>
                              {row.isConditional ? 'Conditional' : 'Firm'}
                            </CBadge>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      )}
                      {columns.includes('notes') && (
                        <td
                          className="editable-cell"
                          onClick={() => startEditing(row.acquisitionId, 'notes')}
                          style={{ whiteSpace: mode === 'detail' ? 'pre-wrap' : 'normal' }}
                        >
                          {isEditing('notes') ? (
                            mode === 'detail' ? (
                              <CFormTextarea
                                size="sm"
                                rows={3}
                                value={(getInlineValue(row, 'notes') as string) || ''}
                                onChange={(e) => setInlineValue(row.acquisitionId, 'notes', e.target.value)}
                                onBlur={() => handleInlineSave(row.acquisitionId)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                                autoFocus
                              />
                            ) : (
                              <CFormInput
                                size="sm"
                                value={(getInlineValue(row, 'notes') as string) || ''}
                                onChange={(e) => setInlineValue(row.acquisitionId, 'notes', e.target.value)}
                                onBlur={() => handleInlineSave(row.acquisitionId)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineSave(row.acquisitionId);
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                                autoFocus
                              />
                            )
                          ) : (
                            mode === 'detail'
                              ? ((getInlineValue(row, 'notes') as string) || '—')
                              : (truncate(getInlineValue(row, 'notes') as string, 80) || '—')
                          )}
                        </td>
                      )}
                      {columns.includes('actions') && (
                        <td className="text-end">
                          <CTooltip content="Delete">
                            <CButton
                              size="sm"
                              color="light"
                              disabled={deletingId === row.acquisitionId}
                              onClick={() => handleDelete(row.acquisitionId)}
                            >
                              {deletingId === row.acquisitionId ? <CSpinner size="sm" /> : <CIcon icon={cilTrash} />}
                            </CButton>
                          </CTooltip>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CCardBody>

      <CModal visible={modalOpen} onClose={() => setModalOpen(false)} size="lg" backdrop="static">
        <CModalHeader closeButton>
          <CModalTitle>{editing ? 'Edit Acquisition Event' : 'Add Acquisition Event'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="gy-3">
            <CCol md={4}>
              <CFormLabel>Event Type</CFormLabel>
              <CFormSelect
                value={form.eventType}
                onChange={(e) => setForm((prev) => ({ ...prev, eventType: e.target.value as AcquisitionEventType }))}
              >
                {ACQUISITION_EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={4}>
              <CFormLabel>Event Date</CFormLabel>
              <CFormInput
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm((prev) => ({ ...prev, eventDate: e.target.value }))}
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel>Amount</CFormLabel>
              <CFormInput
                type="number"
                value={form.amount ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value === '' ? null : Number(e.target.value) }))}
              />
            </CCol>
          </CRow>

          <CRow className="gy-3 mt-1">
            <CCol md={12}>
              <CFormLabel>Description</CFormLabel>
              <CFormInput
                type="text"
                value={form.description}
                placeholder="Describe the acquisition event"
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </CCol>
          </CRow>

          <CRow className="gy-3 mt-1">
            <CCol md={6}>
              <CFormLabel>Affects Purchase Price?</CFormLabel>
              <CFormSwitch
                id="appliesToPurchase"
                checked={form.isAppliedToPurchase}
                onChange={(e) => setForm((prev) => ({ ...prev, isAppliedToPurchase: e.target.checked }))}
                label="Applies to Purchase Price?"
              />
            </CCol>
            {!isDeposit && (
              <CCol md={6}>
                <CFormLabel>Is Conditional?</CFormLabel>
                <CFormSwitch
                  id="isConditional"
                  checked={form.isConditional}
                  onChange={(e) => setForm((prev) => ({ ...prev, isConditional: e.target.checked }))}
                  label="This event is conditional"
                />
              </CCol>
            )}
            <CCol md={6}>
              <CFormLabel>Goes-Hard Date</CFormLabel>
              <CFormInput
                type="date"
                value={form.goesHardDate}
                onChange={(e) => setForm((prev) => ({ ...prev, goesHardDate: e.target.value }))}
              />
            </CCol>
          </CRow>

          <CRow className="gy-3 mt-1">
            <CCol md={12}>
              <CFormLabel>Notes</CFormLabel>
              <CFormTextarea
                rows={mode === 'detail' ? 4 : 2}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSave} disabled={saving}>
            {saving ? <CSpinner size="sm" className="me-2" /> : null}
            {editing ? 'Save Changes' : 'Add Event'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CCard>
  );
}
