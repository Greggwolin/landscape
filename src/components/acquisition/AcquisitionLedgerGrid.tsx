'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormSelect,
  CSpinner,
  CTooltip,
} from '@coreui/react';
import { cilPlus, cilTrash } from '@coreui/icons';
import CIcon from '@coreui/icons-react';
import ModeSelector, { type BudgetMode } from '@/components/budget/ModeSelector';
import { SemanticBadge } from '@/components/ui/landscape';
import {
  ACQUISITION_EVENT_TYPES,
  type AcquisitionEvent,
  type AcquisitionEventType,
} from '@/types/acquisition';
import { formatMoney } from '@/utils/formatters/number';

interface Props {
  projectId: number;
  /** Budget mode for column visibility - ignored if showAllFields is true */
  mode?: BudgetMode;
  /** Callback when mode changes */
  onModeChange?: (mode: BudgetMode) => void;
  /** When true, show all columns and hide mode selector */
  showAllFields?: boolean;
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

const truncate = (value: string | null | undefined, length = 40) => {
  if (!value) return '';
  return value.length > length ? `${value.slice(0, length)}…` : value;
};

// New row placeholder ID
const NEW_ROW_ID = -1;

const emptyNewRow: Partial<AcquisitionEvent> = {
  eventType: 'Deposit',
  eventDate: '',
  description: '',
  amount: null,
  isAppliedToPurchase: true,
  goesHardDate: '',
  isConditional: false,
  notes: '',
};

export default function AcquisitionLedgerGrid({ projectId, mode = 'detail', onModeChange, showAllFields = false, onEventsChange }: Props) {
  // Effective mode: if showAllFields is true, always use 'detail' mode
  const effectiveMode = showAllFields ? 'detail' : mode;
  const [events, setEvents] = useState<AcquisitionEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null);
  const [inlineValues, setInlineValues] = useState<Record<number, Partial<AcquisitionEvent>>>({});
  const [showNewRow, setShowNewRow] = useState(false);
  const [newRowValues, setNewRowValues] = useState<Partial<AcquisitionEvent>>(emptyNewRow);

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
    const payload: Record<string, unknown> = {};

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

  const handleCreateNewRow = async () => {
    if (!newRowValues.eventType) return;
    setSaving(true);
    const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
    const payload = {
      event_type: newRowValues.eventType,
      event_date: newRowValues.eventDate || null,
      description: newRowValues.description || null,
      amount: newRowValues.amount ?? null,
      is_applied_to_purchase: newRowValues.isAppliedToPurchase ?? true,
      goes_hard_date: newRowValues.goesHardDate || null,
      is_conditional: newRowValues.isConditional ?? false,
      notes: newRowValues.notes || null,
    };

    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/acquisition/ledger/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Create failed (${res.status})`);
      }
      await fetchEvents();
      setNewRowValues(emptyNewRow);
      setShowNewRow(false);
      setEditingCell(null);
    } catch (err) {
      console.error(err);
      setError('Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  const getInlineValue = (row: AcquisitionEvent, field: keyof AcquisitionEvent) => {
    const changes = inlineValues[row.acquisitionId];
    return changes?.[field] !== undefined ? changes[field] : row[field];
  };

  const setInlineValue = (rowId: number, field: keyof AcquisitionEvent, value: unknown) => {
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

  const columns = useMemo(() => {
    if (effectiveMode === 'napkin') {
      return ['eventDate', 'eventType', 'description', 'amount', 'goesHard', 'actions'];
    }
    if (effectiveMode === 'standard') {
      return ['eventDate', 'eventType', 'description', 'amount', 'isAppliedToPurchase', 'goesHard', 'notes', 'actions'];
    }
    return ['eventDate', 'eventType', 'description', 'amount', 'isAppliedToPurchase', 'goesHard', 'isConditional', 'notes', 'actions'];
  }, [effectiveMode]);

  const handleAddClick = () => {
    setShowNewRow(true);
    setNewRowValues(emptyNewRow);
    // Focus on the first editable field
    setTimeout(() => {
      setEditingCell({ rowId: NEW_ROW_ID, field: 'eventType' });
    }, 50);
  };

  const renderAmountCell = (amount: number | null | undefined) => {
    const amountLabel = amount !== null && amount !== undefined
      ? formatMoney(amount)
      : '—';
    return (
      <span className="fw-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {amountLabel}
      </span>
    );
  };

  // Render a new row for inline creation
  const renderNewRow = () => {
    if (!showNewRow) return null;
    const isEditing = (field: string) => editingCell?.rowId === NEW_ROW_ID && editingCell?.field === field;
    const isDepositRow = newRowValues.eventType === 'Deposit';

    return (
      <tr style={{ backgroundColor: 'rgba(var(--cui-primary-rgb), 0.05)' }}>
        {columns.includes('eventDate') && (
          <td onClick={() => startEditing(NEW_ROW_ID, 'eventDate')}>
            {isEditing('eventDate') ? (
              <CFormInput
                size="sm"
                type="date"
                value={newRowValues.eventDate || ''}
                onChange={(e) => setNewRowValues((prev) => ({ ...prev, eventDate: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setShowNewRow(false); cancelEditing(); }
                  if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); startEditing(NEW_ROW_ID, 'eventType'); }
                }}
                autoFocus
              />
            ) : (
              <span className="text-muted">{newRowValues.eventDate || 'Date'}</span>
            )}
          </td>
        )}
        {columns.includes('eventType') && (
          <td onClick={() => startEditing(NEW_ROW_ID, 'eventType')}>
            {isEditing('eventType') ? (
              <CFormSelect
                size="sm"
                value={newRowValues.eventType}
                onChange={(e) => setNewRowValues((prev) => ({ ...prev, eventType: e.target.value as AcquisitionEventType }))}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setShowNewRow(false); cancelEditing(); }
                  if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); startEditing(NEW_ROW_ID, 'description'); }
                }}
                autoFocus
              >
                {ACQUISITION_EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </CFormSelect>
            ) : (
              <span className="fw-semibold">{newRowValues.eventType}</span>
            )}
          </td>
        )}
        {columns.includes('description') && (
          <td onClick={() => startEditing(NEW_ROW_ID, 'description')}>
            {isEditing('description') ? (
              <CFormInput
                size="sm"
                placeholder="Description"
                value={newRowValues.description || ''}
                onChange={(e) => setNewRowValues((prev) => ({ ...prev, description: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setShowNewRow(false); cancelEditing(); }
                  if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); startEditing(NEW_ROW_ID, 'amount'); }
                }}
                autoFocus
              />
            ) : (
              <span className="text-muted">{newRowValues.description || 'Description'}</span>
            )}
          </td>
        )}
        {columns.includes('amount') && (
          <td className="text-end" onClick={() => startEditing(NEW_ROW_ID, 'amount')}>
            {isEditing('amount') ? (
              <CFormInput
                size="sm"
                type="number"
                step="0.01"
                placeholder="0"
                value={newRowValues.amount ?? ''}
                onChange={(e) => setNewRowValues((prev) => ({ ...prev, amount: e.target.value === '' ? null : Number(e.target.value) }))}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setShowNewRow(false); cancelEditing(); }
                  if (e.key === 'Enter') { handleCreateNewRow(); }
                }}
                autoFocus
              />
            ) : (
              <span className="text-muted">{renderAmountCell(newRowValues.amount)}</span>
            )}
          </td>
        )}
        {columns.includes('isAppliedToPurchase') && (
          <td
            className="text-center"
            style={{ cursor: 'pointer' }}
            onClick={() => setNewRowValues((prev) => ({ ...prev, isAppliedToPurchase: !prev.isAppliedToPurchase }))}
          >
            <SemanticBadge
              intent="action-state"
              value={newRowValues.isAppliedToPurchase ? 'yes' : 'no'}
            />
          </td>
        )}
        {columns.includes('goesHard') && (
          <td className="text-center" onClick={() => startEditing(NEW_ROW_ID, 'goesHardDate')}>
            {isEditing('goesHardDate') ? (
              <CFormInput
                size="sm"
                type="date"
                value={newRowValues.goesHardDate || ''}
                onChange={(e) => setNewRowValues((prev) => ({ ...prev, goesHardDate: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setShowNewRow(false); cancelEditing(); }
                }}
                autoFocus
              />
            ) : (
              <span className="text-muted">{newRowValues.goesHardDate || '—'}</span>
            )}
          </td>
        )}
        {columns.includes('isConditional') && (
          <td
            className="text-center"
            style={{ cursor: isDepositRow ? 'default' : 'pointer' }}
            onClick={() => {
              if (!isDepositRow) {
                setNewRowValues((prev) => ({ ...prev, isConditional: !prev.isConditional }));
              }
            }}
          >
            {!isDepositRow ? (
              <SemanticBadge
                intent="action-state"
                value={newRowValues.isConditional ? 'conditional' : 'firm'}
              />
            ) : (
              <span className="text-muted">—</span>
            )}
          </td>
        )}
        {columns.includes('notes') && (
          <td onClick={() => startEditing(NEW_ROW_ID, 'notes')}>
            {isEditing('notes') ? (
              <CFormInput
                size="sm"
                placeholder="Notes"
                value={newRowValues.notes || ''}
                onChange={(e) => setNewRowValues((prev) => ({ ...prev, notes: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setShowNewRow(false); cancelEditing(); }
                  if (e.key === 'Enter') { handleCreateNewRow(); }
                }}
                autoFocus
              />
            ) : (
              <span className="text-muted">{truncate(newRowValues.notes, 30) || 'Notes'}</span>
            )}
          </td>
        )}
        {columns.includes('actions') && (
          <td className="text-end">
            <div className="d-flex gap-1 justify-content-end">
              <CTooltip content="Save">
                <CButton
                  size="sm"
                  color="success"
                  variant="ghost"
                  disabled={saving}
                  onClick={handleCreateNewRow}
                >
                  {saving ? <CSpinner size="sm" /> : '✓'}
                </CButton>
              </CTooltip>
              <CTooltip content="Cancel">
                <CButton
                  size="sm"
                  color="secondary"
                  variant="ghost"
                  onClick={() => { setShowNewRow(false); setNewRowValues(emptyNewRow); }}
                >
                  ✕
                </CButton>
              </CTooltip>
            </div>
          </td>
        )}
      </tr>
    );
  };

  return (
    <CCard className="shadow-sm">
      <style>{`
        .acq-table { table-layout: fixed; width: 100%; }
        .acq-table th, .acq-table td {
          padding: 0.5rem 0.4rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 0.875rem;
        }
        .acq-table .editable-cell {
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .acq-table .editable-cell:hover {
          background-color: rgba(var(--cui-primary-rgb), 0.05);
        }
        .acq-table input, .acq-table select {
          font-size: 0.8125rem;
        }
      `}</style>
      <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2 py-2">
        <div>
          <h6 className="mb-0">Acquisition Ledger</h6>
          <small className="text-muted" style={{ fontSize: '0.75rem' }}>Click cells to edit • Backed by landscape.tbl_acquisition</small>
        </div>
        <div className="d-flex align-items-center gap-2">
          {!showAllFields && onModeChange && (
            <ModeSelector activeMode={effectiveMode} onModeChange={onModeChange} />
          )}
          <CButton color="primary" size="sm" onClick={handleAddClick} disabled={showNewRow}>
            <CIcon icon={cilPlus} size="sm" className="me-1" /> Add
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody className="p-0">
        {error && <div className="alert alert-danger py-2 mx-3 mt-3 mb-0">{error}</div>}
        {loading ? (
          <div className="d-flex align-items-center text-muted p-4" style={{ minHeight: 120 }}>
            <CSpinner size="sm" className="me-2" /> Loading ledger...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table table-hover align-middle mb-0 acq-table">
              <thead>
                <tr>
                  {columns.includes('eventDate') && <th style={{ width: '90px' }}>Date</th>}
                  {columns.includes('eventType') && <th style={{ width: '100px' }}>Type</th>}
                  {columns.includes('description') && <th style={{ width: 'auto', minWidth: '120px' }}>Description</th>}
                  {columns.includes('amount') && <th className="text-end" style={{ width: '100px' }}>Amount</th>}
                  {columns.includes('isAppliedToPurchase') && <th className="text-center" style={{ width: '70px' }}>Apply</th>}
                  {columns.includes('goesHard') && <th className="text-center" style={{ width: '90px' }}>Go-Hard</th>}
                  {columns.includes('isConditional') && <th className="text-center" style={{ width: '75px' }}>Cond.</th>}
                  {columns.includes('notes') && <th style={{ width: 'auto', minWidth: '100px' }}>Notes</th>}
                  {columns.includes('actions') && <th style={{ width: '60px' }} className="text-end"></th>}
                </tr>
              </thead>
              <tbody>
                {renderNewRow()}
                {events.length === 0 && !showNewRow && (
                  <tr>
                    <td colSpan={columns.length} className="text-center text-muted py-4">
                      No acquisition events yet. Click "Add" to create your first event.
                    </td>
                  </tr>
                )}
                {events.map((row) => {
                  const isDepositRow = row.eventType === 'Deposit';
                  const isEditingField = (field: string) => editingCell?.rowId === row.acquisitionId && editingCell?.field === field;

                  return (
                    <tr key={row.acquisitionId}>
                      {columns.includes('eventDate') && (
                        <td
                          className="editable-cell"
                          onClick={() => startEditing(row.acquisitionId, 'eventDate')}
                        >
                          {isEditingField('eventDate') ? (
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
                          {isEditingField('eventType') ? (
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
                          title={(getInlineValue(row, 'description') as string) || ''}
                        >
                          {isEditingField('description') ? (
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
                            truncate(getInlineValue(row, 'description') as string, 30) || '—'
                          )}
                        </td>
                      )}
                      {columns.includes('amount') && (
                        <td
                          className="text-end editable-cell"
                          onClick={() => startEditing(row.acquisitionId, 'amount')}
                        >
                          {isEditingField('amount') ? (
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
                            renderAmountCell(getInlineValue(row, 'amount') as number | null)
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
                          <SemanticBadge
                            intent="action-state"
                            value={(getInlineValue(row, 'isAppliedToPurchase') as boolean) ? 'yes' : 'no'}
                          />
                        </td>
                      )}
                      {columns.includes('goesHard') && (
                        <td
                          className="editable-cell text-center"
                          onClick={() => startEditing(row.acquisitionId, 'goesHardDate')}
                        >
                          {isEditingField('goesHardDate') ? (
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
                        <td
                          className={`text-center ${!isDepositRow ? 'editable-cell' : ''}`}
                          onClick={() => {
                            if (!isDepositRow) {
                              setInlineValue(row.acquisitionId, 'isConditional', !(getInlineValue(row, 'isConditional') as boolean));
                              setTimeout(() => handleInlineSave(row.acquisitionId), 100);
                            }
                          }}
                        >
                          {!isDepositRow ? (
                            <SemanticBadge
                              intent="action-state"
                              value={(getInlineValue(row, 'isConditional') as boolean) ? 'conditional' : 'firm'}
                            />
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      )}
                      {columns.includes('notes') && (
                        <td
                          className="editable-cell"
                          onClick={() => startEditing(row.acquisitionId, 'notes')}
                          title={(getInlineValue(row, 'notes') as string) || ''}
                        >
                          {isEditingField('notes') ? (
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
                          ) : (
                            truncate(getInlineValue(row, 'notes') as string, 30) || '—'
                          )}
                        </td>
                      )}
                      {columns.includes('actions') && (
                        <td className="text-end">
                          <CTooltip content="Delete">
                            <CButton
                              size="sm"
                              color="light"
                              variant="ghost"
                              disabled={deletingId === row.acquisitionId}
                              onClick={() => handleDelete(row.acquisitionId)}
                            >
                              {deletingId === row.acquisitionId ? <CSpinner size="sm" /> : <CIcon icon={cilTrash} size="sm" />}
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
    </CCard>
  );
}
