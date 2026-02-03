'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CBadge,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
  CSpinner,
} from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
import CollapsibleSection from '@/app/components/Planning/CollapsibleSection';
import ModeSelector, { type BudgetMode } from '@/components/budget/ModeSelector';
import AcquisitionLedgerGrid from './AcquisitionLedgerGrid';
import type { AcquisitionEvent, AcquisitionEventType, AcquisitionHeader } from '@/types/acquisition';
import { formatMoney } from '@/utils/formatters/number';

interface Props {
  projectId: number;
  mode: BudgetMode;
  onModeChange: (mode: BudgetMode) => void;
}

const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

const parseNumber = (value: string): number | null =>
  value === '' || Number.isNaN(Number(value)) ? null : Number(value);

export default function AcquisitionAccordion({ projectId, mode, onModeChange }: Props) {
  const [assumptions, setAssumptions] = useState<AcquisitionHeader | null>(null);
  const [assumptionsLoading, setAssumptionsLoading] = useState(true);
  const [assumptionsSaving, setAssumptionsSaving] = useState(false);
  const [assumptionError, setAssumptionError] = useState<string | null>(null);

  const [events, setEvents] = useState<AcquisitionEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [newDeposit, setNewDeposit] = useState({ eventDate: '', amount: '', goesHardDate: '' });
  const [savingDepositId, setSavingDepositId] = useState<number | null>(null);

  const [prorationDraft, setProrationDraft] = useState({
    description: 'Taxes / Utilities Proration',
    amount: '',
    eventDate: '',
    kind: 'Adjustment' as AcquisitionEventType,
  });
  const [savingProration, setSavingProration] = useState(false);

  const [contingencyDrafts, setContingencyDrafts] = useState({
    financing: { eventDate: '', goesHardDate: '' },
    entitlement: { eventDate: '', goesHardDate: '' },
  });
  const [contingencySaving, setContingencySaving] = useState<null | 'financing' | 'entitlement'>(null);

  const deposits = useMemo(
    () => events.filter((evt) => evt.eventType === 'Deposit'),
    [events]
  );
  const depositTotal = useMemo(
    () => deposits.reduce((sum, evt) => sum + (evt.amount ?? 0), 0),
    [deposits]
  );

  const financingContingency = useMemo(
    () => events.find((evt) => evt.eventType === 'Extension' && (evt.description?.toLowerCase().includes('financ') ?? true)),
    [events]
  );
  const entitlementContingency = useMemo(
    () =>
      events.find(
        (evt) =>
          evt.eventType === 'Title Survey' ||
          evt.description?.toLowerCase().includes('entitlement')
      ),
    [events]
  );

  const prorationEvents = useMemo(
    () => events.filter((evt) => evt.eventType === 'Adjustment' || evt.eventType === 'Credit'),
    [events]
  );

  useEffect(() => {
    setContingencyDrafts({
      financing: {
        eventDate: financingContingency?.eventDate || '',
        goesHardDate: financingContingency?.goesHardDate || '',
      },
      entitlement: {
        eventDate: entitlementContingency?.eventDate || '',
        goesHardDate: entitlementContingency?.goesHardDate || '',
      },
    });
  }, [financingContingency, entitlementContingency]);

  const fetchAssumptions = async () => {
    setAssumptionsLoading(true);
    setAssumptionError(null);
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/assumptions/acquisition/`);
      if (!res.ok) throw new Error(`Failed to load acquisition assumptions (${res.status})`);
      const json = await res.json();
      setAssumptions(json as AcquisitionHeader);
    } catch (err) {
      console.error(err);
      setAssumptionError('Unable to load acquisition assumptions');
    } finally {
      setAssumptionsLoading(false);
    }
  };

  const fetchEvents = async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/acquisition/ledger/`);
      if (!res.ok) throw new Error(`Failed to load acquisition ledger (${res.status})`);
      const json = await res.json();
      const data = Array.isArray(json) ? json : json.results || [];
      setEvents(
        data.map((row: any): AcquisitionEvent => ({
          acquisitionId: row.acquisition_id,
          projectId: row.project_id,
          contactId: row.contact_id,
          eventDate: row.event_date,
          eventType: row.event_type,
          description: row.description,
          amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
          isAppliedToPurchase: row.is_applied_to_purchase,
          goesHardDate: row.goes_hard_date,
          isConditional: row.is_conditional,
          unitsConveyed: row.units_conveyed,
          measureId: row.measure_id,
          notes: row.notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }))
      );
    } catch (err) {
      console.error(err);
      setEventsError('Unable to load acquisition ledger');
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssumptions();
    fetchEvents();
  }, [projectId]);

  const saveAssumptions = async (patch?: Partial<AcquisitionHeader>) => {
    if (!assumptions) return;
    setAssumptionsSaving(true);
    setAssumptionError(null);
    const payload = {
      ...assumptions,
      ...patch,
      project_id: projectId,
    };
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/assumptions/acquisition/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const json = await res.json();
      setAssumptions(json as AcquisitionHeader);
    } catch (err) {
      console.error(err);
      setAssumptionError('Unable to save acquisition inputs');
    } finally {
      setAssumptionsSaving(false);
    }
  };

  const patchEvent = async (acquisitionId: number, payload: Partial<AcquisitionEvent>) => {
    const res = await fetch(`${apiUrl}/api/projects/${projectId}/acquisition/ledger/${acquisitionId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: payload.eventType,
        event_date: payload.eventDate ?? null,
        description: payload.description,
        amount: payload.amount ?? null,
        is_applied_to_purchase: payload.isAppliedToPurchase,
        goes_hard_date: payload.goesHardDate ?? null,
        is_conditional: payload.isConditional,
        notes: payload.notes,
      }),
    });
    if (!res.ok) throw new Error(`Update failed (${res.status})`);
  };

  const handleDepositSave = async (acquisitionId: number, field: 'eventDate' | 'amount' | 'goesHardDate', value: string) => {
    setSavingDepositId(acquisitionId);
    try {
      const payload: Partial<AcquisitionEvent> = {};
      if (field === 'eventDate') payload.eventDate = value || null;
      if (field === 'goesHardDate') payload.goesHardDate = value || null;
      if (field === 'amount') payload.amount = parseNumber(value);
      await patchEvent(acquisitionId, payload);
      await fetchEvents();
    } catch (err) {
      console.error(err);
      setEventsError('Unable to update deposit');
    } finally {
      setSavingDepositId(null);
    }
  };

  const handleAddDeposit = async () => {
    if (newDeposit.amount === '') return;
    setSavingDepositId(-1);
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/acquisition/ledger/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'Deposit',
          event_date: newDeposit.eventDate || null,
          amount: parseNumber(newDeposit.amount),
          goes_hard_date: newDeposit.goesHardDate || null,
          is_applied_to_purchase: true,
          description: 'Earnest Money Deposit',
        }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      setNewDeposit({ eventDate: '', amount: '', goesHardDate: '' });
      await fetchEvents();
    } catch (err) {
      console.error(err);
      setEventsError('Unable to add deposit');
    } finally {
      setSavingDepositId(null);
    }
  };

  const saveContingency = async (kind: 'financing' | 'entitlement') => {
    const draft = contingencyDrafts[kind];
    const existing = kind === 'financing' ? financingContingency : entitlementContingency;
    const eventType: AcquisitionEventType = kind === 'financing' ? 'Extension' : 'Title Survey';
    setContingencySaving(kind);
    try {
      if (existing) {
        await patchEvent(existing.acquisitionId, {
          eventType,
          eventDate: draft.eventDate || null,
          goesHardDate: draft.goesHardDate || null,
          description: existing.description || `${kind === 'financing' ? 'Financing' : 'Entitlement'} contingency`,
          isConditional: true,
          isAppliedToPurchase: false,
        });
      } else {
        const res = await fetch(`${apiUrl}/api/projects/${projectId}/acquisition/ledger/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: eventType,
            event_date: draft.eventDate || null,
            goes_hard_date: draft.goesHardDate || null,
            description: `${kind === 'financing' ? 'Financing' : 'Entitlement'} contingency`,
            is_conditional: true,
            is_applied_to_purchase: false,
          }),
        });
        if (!res.ok) throw new Error(`Create failed (${res.status})`);
      }
      await fetchEvents();
    } catch (err) {
      console.error(err);
      setEventsError('Unable to save contingency');
    } finally {
      setContingencySaving(null);
    }
  };

  const handleAddProration = async () => {
    if (prorationDraft.amount === '') return;
    setSavingProration(true);
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/acquisition/ledger/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: prorationDraft.kind,
          event_date: prorationDraft.eventDate || null,
          description: prorationDraft.description || 'Proration',
          amount: parseNumber(prorationDraft.amount),
          is_applied_to_purchase: true,
        }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      setProrationDraft({
        description: 'Taxes / Utilities Proration',
        amount: '',
        eventDate: '',
        kind: 'Adjustment',
      });
      await fetchEvents();
    } catch (err) {
      console.error(err);
      setEventsError('Unable to add proration/credit');
    } finally {
      setSavingProration(false);
    }
  };

  return (
    <CollapsibleSection
      title="Acquisition"
      itemCount={events.length || 1}
      defaultExpanded={false}
      headerActions={<ModeSelector activeMode={mode} onModeChange={onModeChange} />}
    >
      <div className="p-3 d-flex flex-column gap-3">
        {/* Napkin Mode Inputs */}
        <div className="border rounded p-3" style={{ borderColor: 'var(--cui-border-color)' }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 className="mb-0">Napkin Inputs</h6>
              <small className="text-muted">Purchase price, closing date, and total earnest money</small>
            </div>
            {assumptionsSaving && <CSpinner size="sm" />}
          </div>
          {assumptionsLoading ? (
            <div className="d-flex align-items-center text-muted" style={{ minHeight: 120 }}>
              <CSpinner size="sm" className="me-2" /> Loading acquisition inputs...
            </div>
          ) : assumptionError ? (
            <div className="alert alert-danger py-2 mb-0">{assumptionError}</div>
          ) : assumptions ? (
            <>
              <CRow className="gy-3">
                <CCol md={4}>
                  <CFormLabel>Purchase Price (total)</CFormLabel>
                  <CFormInput
                    type="number"
                    value={assumptions.purchase_price ?? ''}
                    onChange={(e) => setAssumptions({ ...assumptions, purchase_price: parseNumber(e.target.value) })}
                    onBlur={() => saveAssumptions()}
                    placeholder="0"
                  />
                  <div className="text-muted small mt-1">
                    {assumptions.purchase_price ? formatMoney(Number(assumptions.purchase_price)) : '—'}
                  </div>
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Close Date</CFormLabel>
                  <CFormInput
                    type="date"
                    value={assumptions.acquisition_date ?? ''}
                    onChange={(e) => setAssumptions({ ...assumptions, acquisition_date: e.target.value || null })}
                    onBlur={() => saveAssumptions()}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Total Earnest Money</CFormLabel>
                  <CFormInput
                    type="number"
                    value={assumptions.earnest_money ?? ''}
                    onChange={(e) => setAssumptions({ ...assumptions, earnest_money: parseNumber(e.target.value) })}
                    onBlur={() => saveAssumptions()}
                    placeholder="0"
                  />
                  <div className="text-muted small mt-1">Auto-applies to purchase price</div>
                </CCol>
              </CRow>
            </>
          ) : null}
        </div>

        {/* Standard & Detail */}
        {mode !== 'napkin' && (
          <div className="border rounded p-3" style={{ borderColor: 'var(--cui-border-color)' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Deposits & Contingencies</h6>
              <CBadge color="light" shape="rounded-pill">
                {deposits.length} deposit{deposits.length === 1 ? '' : 's'}
              </CBadge>
            </div>
            {eventsError && <div className="alert alert-warning py-2">{eventsError}</div>}
            {eventsLoading ? (
              <div className="d-flex align-items-center text-muted" style={{ minHeight: 120 }}>
                <CSpinner size="sm" className="me-2" /> Loading ledger...
              </div>
            ) : (
              <>
                <div className="table-responsive mb-2">
                  <table className="table table-sm align-middle mb-1">
                    <thead>
                      <tr>
                        <th style={{ minWidth: 120 }}>Deposit Date</th>
                        <th style={{ minWidth: 130 }}>Goes-Hard</th>
                        <th className="text-end" style={{ minWidth: 140 }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deposits.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-muted text-center py-3">
                            No deposits yet. Add earnest money tranches below.
                          </td>
                        </tr>
                      )}
                      {deposits.map((deposit) => (
                        <tr key={deposit.acquisitionId}>
                          <td style={{ maxWidth: 180 }}>
                            <CFormInput
                              size="sm"
                              type="date"
                              value={deposit.eventDate || ''}
                              disabled={savingDepositId === deposit.acquisitionId}
                              onChange={(e) =>
                                setEvents((prev) =>
                                  prev.map((evt) =>
                                    evt.acquisitionId === deposit.acquisitionId ? { ...evt, eventDate: e.target.value } : evt
                                  )
                                )
                              }
                              onBlur={(e) => handleDepositSave(deposit.acquisitionId, 'eventDate', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleDepositSave(deposit.acquisitionId, 'eventDate', e.currentTarget.value);
                              }}
                            />
                          </td>
                          <td style={{ maxWidth: 180 }}>
                            <CFormInput
                              size="sm"
                              type="date"
                              value={deposit.goesHardDate || ''}
                              disabled={savingDepositId === deposit.acquisitionId}
                              onChange={(e) =>
                                setEvents((prev) =>
                                  prev.map((evt) =>
                                    evt.acquisitionId === deposit.acquisitionId ? { ...evt, goesHardDate: e.target.value } : evt
                                  )
                                )
                              }
                              onBlur={(e) => handleDepositSave(deposit.acquisitionId, 'goesHardDate', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleDepositSave(deposit.acquisitionId, 'goesHardDate', e.currentTarget.value);
                              }}
                            />
                          </td>
                          <td>
                            <CFormInput
                              size="sm"
                              type="number"
                              value={deposit.amount ?? ''}
                              className="text-end"
                              disabled={savingDepositId === deposit.acquisitionId}
                              onChange={(e) =>
                                setEvents((prev) =>
                                  prev.map((evt) =>
                                    evt.acquisitionId === deposit.acquisitionId
                                      ? { ...evt, amount: parseNumber(e.target.value) }
                                      : evt
                                  )
                                )
                              }
                              onBlur={(e) => handleDepositSave(deposit.acquisitionId, 'amount', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleDepositSave(deposit.acquisitionId, 'amount', e.currentTarget.value);
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                      <tr className="table-light">
                        <td>
                          <CFormInput
                            size="sm"
                            type="date"
                            value={newDeposit.eventDate}
                            onChange={(e) => setNewDeposit((prev) => ({ ...prev, eventDate: e.target.value }))}
                          />
                        </td>
                        <td>
                          <CFormInput
                            size="sm"
                            type="date"
                            value={newDeposit.goesHardDate}
                            onChange={(e) => setNewDeposit((prev) => ({ ...prev, goesHardDate: e.target.value }))}
                          />
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <CFormInput
                              size="sm"
                              type="number"
                              value={newDeposit.amount}
                              className="text-end"
                              onChange={(e) => setNewDeposit((prev) => ({ ...prev, amount: e.target.value }))}
                              placeholder="0"
                            />
                            <SemanticButton intent="primary-action" size="sm" disabled={savingDepositId !== null} onClick={handleAddDeposit}>
                              {savingDepositId !== null ? <CSpinner size="sm" /> : 'Add'}
                            </SemanticButton>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="d-flex justify-content-end text-muted small">
                  <span className="fw-semibold tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    Total Deposits: {formatMoney(depositTotal)}
                  </span>
                </div>

                <CRow className="gy-3 mt-2">
                  <CCol md={4}>
                    <CFormLabel>Due Diligence (days)</CFormLabel>
                    <CFormInput
                      type="number"
                      value={assumptions?.due_diligence_days ?? ''}
                      onChange={(e) =>
                        setAssumptions((prev) => (prev ? { ...prev, due_diligence_days: parseNumber(e.target.value) } : prev))
                      }
                      onBlur={() => saveAssumptions()}
                    />
                    <small className="text-muted">Key contingency window</small>
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Financing Contingency</CFormLabel>
                    <div className="d-flex flex-column gap-2">
                      <CFormInput
                        size="sm"
                        type="date"
                        value={contingencyDrafts.financing.eventDate}
                        onChange={(e) =>
                          setContingencyDrafts((prev) => ({
                            ...prev,
                            financing: { ...prev.financing, eventDate: e.target.value },
                          }))
                        }
                        placeholder="Deadline"
                      />
                      <CFormInput
                        size="sm"
                        type="date"
                        value={contingencyDrafts.financing.goesHardDate}
                        onChange={(e) =>
                          setContingencyDrafts((prev) => ({
                            ...prev,
                            financing: { ...prev.financing, goesHardDate: e.target.value },
                          }))
                        }
                        placeholder="Goes-hard"
                      />
                      <div>
                        <SemanticButton
                          size="sm"
                          intent="secondary-action"
                          disabled={contingencySaving === 'financing'}
                          onClick={() => saveContingency('financing')}
                        >
                          {contingencySaving === 'financing' ? <CSpinner size="sm" className="me-1" /> : null}
                          Save Financing Contingency
                        </SemanticButton>
                      </div>
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Entitlement Contingency</CFormLabel>
                    <div className="d-flex flex-column gap-2">
                      <CFormInput
                        size="sm"
                        type="date"
                        value={contingencyDrafts.entitlement.eventDate}
                        onChange={(e) =>
                          setContingencyDrafts((prev) => ({
                            ...prev,
                            entitlement: { ...prev.entitlement, eventDate: e.target.value },
                          }))
                        }
                        placeholder="Milestone date"
                      />
                      <CFormInput
                        size="sm"
                        type="date"
                        value={contingencyDrafts.entitlement.goesHardDate}
                        onChange={(e) =>
                          setContingencyDrafts((prev) => ({
                            ...prev,
                            entitlement: { ...prev.entitlement, goesHardDate: e.target.value },
                          }))
                        }
                        placeholder="Goes-hard"
                      />
                      <div>
                        <SemanticButton
                          size="sm"
                          intent="secondary-action"
                          disabled={contingencySaving === 'entitlement'}
                          onClick={() => saveContingency('entitlement')}
                        >
                          {contingencySaving === 'entitlement' ? <CSpinner size="sm" className="me-1" /> : null}
                          Save Entitlement Contingency
                        </SemanticButton>
                      </div>
                    </div>
                  </CCol>
                </CRow>

                <div className="border-top pt-3 mt-3">
                  <h6 className="mb-2">Prorations & Seller Credits</h6>
                  <CRow className="gy-2 align-items-end">
                    <CCol md={4}>
                      <CFormLabel>Description</CFormLabel>
                      <CFormInput
                        value={prorationDraft.description}
                        onChange={(e) => setProrationDraft((prev) => ({ ...prev, description: e.target.value }))}
                      />
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel>Amount</CFormLabel>
                      <CFormInput
                        type="number"
                        value={prorationDraft.amount}
                        onChange={(e) => setProrationDraft((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="0"
                      />
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel>Date</CFormLabel>
                      <CFormInput
                        type="date"
                        value={prorationDraft.eventDate}
                        onChange={(e) => setProrationDraft((prev) => ({ ...prev, eventDate: e.target.value }))}
                      />
                    </CCol>
                    <CCol md={2}>
                      <CFormLabel>Type</CFormLabel>
                      <CFormSelect
                        value={prorationDraft.kind}
                        onChange={(e) => setProrationDraft((prev) => ({ ...prev, kind: e.target.value as AcquisitionEventType }))}
                      >
                        <option value="Adjustment">Proration / Charge</option>
                        <option value="Credit">Seller Credit</option>
                      </CFormSelect>
                    </CCol>
                  </CRow>
                  <div className="d-flex align-items-center gap-2 mt-3">
                    <SemanticButton intent="primary-action" size="sm" disabled={savingProration} onClick={handleAddProration}>
                      {savingProration ? <CSpinner size="sm" className="me-2" /> : null}
                      Add to Ledger
                    </SemanticButton>
                    <div className="text-muted small">
                      Logged to acquisition ledger and applied to cash flow
                    </div>
                  </div>

                  {prorationEvents.length > 0 && (
                    <div className="table-responsive mt-3">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th style={{ minWidth: 120 }}>Date</th>
                            <th>Description</th>
                            <th style={{ minWidth: 110 }}>Type</th>
                            <th className="text-end" style={{ minWidth: 140 }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prorationEvents.map((evt) => (
                            <tr key={evt.acquisitionId}>
                              <td>{evt.eventDate || '—'}</td>
                              <td>{evt.description || '—'}</td>
                              <td>
                                <CBadge color={evt.eventType === 'Credit' ? 'success' : 'secondary'}>
                                  {evt.eventType}
                                </CBadge>
                              </td>
                              <td className="text-end tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {evt.amount !== null && evt.amount !== undefined ? formatMoney(evt.amount) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Detail */}
        {mode === 'detail' && (
          <div className="border rounded p-3" style={{ borderColor: 'var(--cui-border-color)' }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Detail Ledger (ALTA-style)</h6>
              <small className="text-muted">Full acquisition event history</small>
            </div>
            <AcquisitionLedgerGrid
              projectId={projectId}
              onEventsChange={setEvents}
            />
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
