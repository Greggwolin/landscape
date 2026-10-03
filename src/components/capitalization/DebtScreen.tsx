'use client';

/**
 * The Debt screen on the chat-first surface — design board D-20.
 *
 * XN62-LANDDEBT-0929. Land loans are defined by phase or village (A&D and
 * construction revolvers) or project-wide (a land or permanent loan). Each
 * loan names the containers it funds and its share of each; the engine then
 * sizes it from their development budget, draws it against their costs and
 * releases it from their parcel sales. This screen is where that is typed.
 *
 * Top to bottom: toolbar · Loans ledger · Draws & balance for the selected
 * loan · Detail panel at right. Typed values are blue, computed values are in
 * the body colour. Nothing about actuals — the schedule is projected only.
 */

import React, { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useLoans,
  useCreateLoan,
  useUpdateLoan,
  useLoanSchedule,
} from '@/hooks/useCapitalization';
import { useContainers } from '@/hooks/useContainers';
import { authFetch } from '@/lib/authFetch';
import styles from './DebtScreen.module.css';
import LoanLeveredCashFlow from './LoanLeveredCashFlow';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export interface DebtScreenProject {
  project_id: number;
  project_name: string;
  project_type_code?: string;
}

export type DebtScreenDestination = 'equity' | 'cashflow' | 'planning';

interface Props {
  project: DebtScreenProject;
  /** Where the tab strip and container names go. The panel switches screens
   *  in place; the stand-alone route changes the address. */
  onNavigate?: (to: DebtScreenDestination, divisionId?: number) => void;
}

interface LoanContainerRow {
  loan_container_id?: number;
  division_id: number;
  allocation_pct: number | string | null;
  collateral_type: string | null;
}

// The loan record as the list endpoint returns it. Loose on purpose: the
// numeric fields arrive as numbers or decimal strings depending on the field.
type LoanRecord = Record<string, unknown> & {
  loan_id: number;
  loan_name: string;
  containers?: LoanContainerRow[];
};

// Loan types. A&D is a structure (several advances), not a type; a Land loan
// has one advance at closing, so it is always a Term loan (Gregg, 2026-09-29).
const LOAN_TYPES: Array<{ value: string; label: string }> = [
  { value: 'LAND', label: 'Land' },
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'BRIDGE', label: 'Bridge' },
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'MEZZANINE', label: 'Mezzanine' },
  { value: 'LINE_OF_CREDIT', label: 'Line of credit' },
  { value: 'PREFERRED_EQUITY', label: 'Preferred equity' },
];
// Gregg, 2026-09-29: Term (one advance), Revolver, and A&D (like a term loan
// but with several advances). Revolver and A&D — and a term loan with a
// release price — run through the release-and-reserve calculator.
const STRUCTURES = [
  { value: 'A_AND_D', label: 'A&D (multiple advances)' },
  { value: 'REVOLVER', label: 'Revolver' },
  { value: 'TERM', label: 'Term (one advance)' },
];

function usesReleaseCalculator(loan: Record<string, unknown>): boolean {
  const s = String(loan.structure_type ?? '').toUpperCase();
  if (s === 'REVOLVER' || s === 'A_AND_D') return true;
  return s === 'TERM' && (Number(loan.release_price_pct) || 0) > 0;
}
const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
  { value: 'defeased', label: 'Defeased' },
];
const RELEASE_BASES = [
  { value: 'LOT', label: 'Per lot' },
  { value: 'ACRE', label: 'Per acre' },
  { value: 'CASH_SWEEP', label: 'Cash sweep (100% of net sale proceeds)' },
];
const INTEREST_TYPES = [
  { value: 'Floating', label: 'Floating' },
  { value: 'Fixed', label: 'Fixed' },
];

type Scale = 'month' | 'quarter' | 'year';

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Reserve contingency: stored as a multiplier (1.2), entered as a percent (20). */
function inflatorToPct(v: unknown): number | null {
  const n = num(v);
  return n === null ? null : Math.round((n - 1) * 10000) / 100;
}
function pctToInflator(pct: number): number {
  return Math.round((1 + pct / 100) * 10000) / 10000;
}

/** Thousands separators, parentheses for negatives, em dash for zero/absent. */
function money(v: unknown): string {
  const n = num(v);
  if (n === null || Math.round(n) === 0) return '—';
  const body = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return n < 0 ? `(${body})` : body;
}

/** A loan's effective terms from the server (HQ137): the sizing rule's amount,
 *  bases and start date where nothing was saved, each flagged when a default.
 *  Computed on read and never written back until someone saves the loan. */
interface EffectiveTerms {
  commitment_amount?: number;
  ltv_basis_amount?: number;
  ltc_basis_amount?: number;
  governing_constraint?: string;
  loan_start_date?: string | null;
  basis_rule?: string;
  value_basis_is_default?: boolean;
  cost_basis_is_default?: boolean;
  start_is_default?: boolean;
  amount_is_saved?: boolean;
  sizing_notes?: string[];
}
function effectiveOf(loan: Record<string, unknown>): EffectiveTerms {
  return (loan.effective as EffectiveTerms | null | undefined) ?? {};
}
/** How a default basis is labelled: the acquisition price for a term bridge loan. */
function basisDefaultLabel(e: EffectiveTerms): string {
  return (e.basis_rule ?? '').startsWith('acquisition price') ? 'acquisition price' : 'default';
}

function pct(v: unknown, digits = 1): string {
  const n = num(v);
  return n === null ? '—' : `${n.toFixed(digits)}%`;
}

function labelFor(list: Array<{ value: string; label: string }>, v: unknown): string {
  return list.find((o) => o.value === v)?.label ?? (v ? String(v) : '—');
}

function rateText(loan: LoanRecord): string {
  const index = loan.interest_index as string | null | undefined;
  const spread = num(loan.interest_spread_bps);
  if (index && spread !== null) return `${index} + ${spread} bps`;
  const rate = num(loan.interest_rate_pct);
  return rate === null ? '—' : `${rate.toFixed(2)}%`;
}

// ---------------------------------------------------------------------------
// A cell that shows its value and becomes an input on click. Commits on Enter
// or blur; Escape abandons. Typed values render blue.
// ---------------------------------------------------------------------------
function EditCell({
  value,
  display,
  kind = 'text',
  onCommit,
  align = 'left',
  options,
}: {
  value: unknown;
  display: string;
  kind?: 'text' | 'number' | 'date' | 'select';
  onCommit: (next: string | number | null) => void;
  align?: 'left' | 'right';
  options?: Array<{ value: string; label: string }>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const start = () => {
    setDraft(value === null || value === undefined ? '' : String(value));
    setEditing(true);
  };
  const commit = () => {
    setEditing(false);
    const original = value === null || value === undefined ? '' : String(value);
    if (draft === original) return;
    if (kind === 'number') {
      onCommit(draft.trim() === '' ? null : Number(draft));
    } else {
      onCommit(draft.trim() === '' ? null : draft);
    }
  };

  if (editing && kind === 'select' && options) {
    return (
      <select
        autoFocus
        className="form-select form-select-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }
  if (editing) {
    return (
      <input
        autoFocus
        className={`form-control form-control-sm ${styles.cellInput}`}
        style={{ textAlign: align }}
        type={kind === 'number' ? 'number' : kind === 'date' ? 'date' : 'text'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }
  return (
    <button
      type="button"
      className={`${styles.editable} ${value === null || value === undefined || value === '' ? styles.empty : styles.typed}`}
      style={{ textAlign: align }}
      // Gregg, 2026-10-02: a single click selects (and opens the loan's
      // detail through the row); a double click edits the field.
      onDoubleClick={(e) => { e.stopPropagation(); start(); }}
      title="Double-click to edit"
      data-editable="true"
    >
      {display}
    </button>
  );
}

// ---------------------------------------------------------------------------

export function DebtScreen({ project, onNavigate }: Props) {
  const projectId = String(project.project_id);
  const queryClient = useQueryClient();
  const { data: loansData, isLoading } = useLoans(projectId);
  const createLoan = useCreateLoan(projectId);
  const updateLoan = useUpdateLoan(projectId);
  const { areas, phases } = useContainers({ projectId: project.project_id });

  const loans: LoanRecord[] = useMemo(() => {
    const raw = Array.isArray(loansData)
      ? loansData
      : (loansData as { results?: unknown[] } | undefined)?.results ?? [];
    return raw as LoanRecord[];
  }, [loansData]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = loans.find((l) => l.loan_id === selectedId) ?? loans[0] ?? null;
  const [scale, setScale] = useState<Scale>('month');
  const [moreOpen, setMoreOpen] = useState(false);
  // Gregg, 2026-10-02: the loan's detail tiles sit under the loan line, shown
  // when an editable field in the line is clicked and hidden again by Close.
  const [tilesOpen, setTilesOpen] = useState(false);
  const [drawsOpen, setDrawsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sizing, setSizing] = useState(false);
  // Interest-reserve prompt (Gregg, 2026-09-29): after a save, if the loan
  // charges interest in months the project has no cash to pay it, ask once.
  const [reserveCheck, setReserveCheck] = useState<ReserveCheck | null>(null);
  const prompted = useRef<Set<number>>(new Set());
  const checkReserve = async (loanId: number) => {
    if (prompted.current.has(loanId)) return;
    try {
      const r = await authFetch(
        `${DJANGO_API_URL}/api/projects/${projectId}/loans/${loanId}/interest-reserve/check/`,
      );
      const body = (await r.json()) as ReserveCheck;
      if (r.ok && body.uncovered_months > 0 && !body.has_reserve) {
        prompted.current.add(loanId);
        setReserveCheck(body);
      }
    } catch {
      /* the check never blocks a save */
    }
  };

  const containerOptions = useMemo(
    () => [
      ...areas.map((a) => ({ id: a.division_id, label: a.name || a.code, level: 'Village' })),
      ...phases.map((p) => ({ id: p.division_id, label: p.name || p.code, level: 'Phase' })),
    ],
    [areas, phases],
  );
  const containerName = (id: number) =>
    containerOptions.find((c) => c.id === id)?.label ?? `Container ${id}`;

  const save = (loanId: number, rawData: Record<string, unknown>) => {
    setMessage(null);
    // A land loan takes one advance at closing, so choosing Land makes it Term.
    const data = rawData.loan_type === 'LAND' ? { ...rawData, structure_type: 'TERM' } : rawData;
    updateLoan.mutate(
      { loanId, data: data as never },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['loan-schedule', projectId, loanId] });
          queryClient.invalidateQueries({ queryKey: ['loan-detail', projectId, loanId] });
          void checkReserve(loanId);
        },
        onError: async (err: unknown) => {
          let detail = 'The change was not saved.';
          if (err instanceof Response) {
            try {
              detail = `The change was not saved: ${JSON.stringify(await err.json())}`;
            } catch {
              /* keep the plain sentence */
            }
          }
          setMessage(detail);
        },
      },
    );
  };

  const saveContainers = (loan: LoanRecord, rows: LoanContainerRow[]) =>
    save(loan.loan_id, {
      container_allocations: rows.map((r) => ({
        division_id: r.division_id,
        allocation_pct: r.allocation_pct === '' ? null : r.allocation_pct,
        collateral_type: r.collateral_type,
      })),
    });

  const addLoan = () => {
    setMessage(null);
    createLoan.mutate(
      {
        loan_name: `Loan ${loans.length + 1}`,
        loan_type: 'CONSTRUCTION',
        structure_type: 'A_AND_D',
        seniority: loans.length + 1,
        status: 'pending',
        interest_type: 'Floating',
      } as never,
      {
        onSuccess: (created: { loan_id?: number }) => {
          if (created?.loan_id) setSelectedId(created.loan_id);
        },
        onError: () => setMessage('The new loan was not created.'),
      },
    );
  };

  const sizeFromBudget = async () => {
    if (!selected) return;
    setMessage(null);
    if (num(selected.loan_to_cost_pct) === null && num(selected.loan_to_value_pct) === null) {
      setMessage('Enter a loan-to-cost (or loan-to-value) percentage in Detail → Sizing first; the budget is sized against it.');
      return;
    }
    setSizing(true);
    try {
      // Saving the loan re-runs its sizing against the development budget of
      // the containers it funds.
      const patched = await authFetch(
        `${DJANGO_API_URL}/api/projects/${projectId}/loans/${selected.loan_id}/`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loan_to_cost_pct: selected.loan_to_cost_pct }),
        },
      );
      if (!patched.ok) throw new Error('sizing');
      let peak = '';
      if (usesReleaseCalculator(selected)) {
        // The revolver run solves the interest reserve and stores the draws.
        const run = await authFetch(
          `${DJANGO_API_URL}/api/projects/${projectId}/loans/${selected.loan_id}/calculate/`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
        );
        const body = await run.json().catch(() => null);
        if (run.ok && body?.summary) {
          peak = ` Peak balance ${money(body.summary.peak_balance)}; interest ${money(body.summary.total_interest)}.`;
        } else if (body?.error) {
          peak = ` The draw schedule could not be run: ${body.error}`;
        }
      }
      const fresh = await authFetch(
        `${DJANGO_API_URL}/api/projects/${projectId}/loans/${selected.loan_id}/`,
      ).then((r) => r.json());
      setMessage(
        `Sized from the budget: commitment ${money(fresh.commitment_amount)} on a cost basis of ${money(fresh.ltc_basis_amount)} (governed by ${fresh.governing_constraint ?? 'manual entry'}).${peak}`,
      );
      queryClient.invalidateQueries({ queryKey: ['loans', projectId] });
      queryClient.invalidateQueries({ queryKey: ['loan-schedule', projectId, selected.loan_id] });
    } catch {
      setMessage('Sizing did not complete. Nothing was changed.');
    } finally {
      setSizing(false);
    }
  };

  return (
    <div className={styles.screen}>
      {/* Gregg, 2026-10-02: Debt and Equity are reached from the screen picker's
          row above; the screen carries no tab strip of its own, and no Cash flow link. */}
      <div className="d-flex align-items-center gap-2" style={{ padding: '8px 12px' }}>
        <button type="button" className="btn btn-sm btn-primary" onClick={addLoan} disabled={createLoan.isPending}>
          + Loan
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost-secondary"
          onClick={sizeFromBudget}
          disabled={!selected || sizing}
        >
          {sizing ? 'Sizing…' : 'Size from the budget'}
        </button>
        {message && <span className={styles.message}>{message}</span>}
      </div>

      {reserveCheck && (
        <ReservePrompt
          projectId={projectId}
          check={reserveCheck}
          loanName={loans.find((l) => l.loan_id === reserveCheck.loan_id)?.loan_name ?? 'This loan'}
          onDone={(note) => {
            setReserveCheck(null);
            if (note) setMessage(note);
            queryClient.invalidateQueries({ queryKey: ['loans', projectId] });
            queryClient.invalidateQueries({ queryKey: ['loan-detail', projectId, reserveCheck.loan_id] });
            queryClient.invalidateQueries({ queryKey: ['loan-schedule', projectId, reserveCheck.loan_id] });
          }}
        />
      )}

      {isLoading ? (
        <div className={styles.hint}>Loading loans…</div>
      ) : loans.length === 0 ? (
        <div className={styles.empty}>
          <p>No loan on the record — the cash flow and the returns are unlevered until one exists.</p>
          <p className={styles.muted}>
            Add a loan, name the villages or phases it funds, give it a loan-to-cost, then size it from the budget.
          </p>
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.main}>
            <div className={styles.card}>
            <LoansLedger
              loans={loans}
              selectedId={selected?.loan_id ?? null}
              onSelect={setSelectedId}
              onEditStart={() => setTilesOpen(true)}
              onSave={save}
              containerName={containerName}
              onOpenContainer={(id) => onNavigate?.('planning', id)}
            />
            {selected && tilesOpen && (
              <DetailPanel
                projectId={projectId}
                loan={selected}
                onSave={save}
                onSaveContainers={saveContainers}
                containerOptions={containerOptions}
                containerName={containerName}
                moreOpen={moreOpen}
                onToggleMore={() => setMoreOpen((o) => !o)}
                onClose={() => setTilesOpen(false)}
              />
            )}
            {selected && !tilesOpen && (
              <div className={styles.hint}>
                Click a loan to open its full detail; double-click any blue field to change it.
              </div>
            )}
            </div>
            {/* Gregg, 2026-10-02: each section in its own card; the loan schedule
                (draws & balance) folds, and the leveraged cash flow sits below it. */}
            {selected && (
              <div className={styles.card}>
                <DrawsTable projectId={projectId} loan={selected} scale={scale} onScale={setScale}
                  open={drawsOpen} onToggle={() => setDrawsOpen((o) => !o)} />
              </div>
            )}
            <div className={styles.card}>
              <LoanLeveredCashFlow projectId={projectId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loans ledger
// ---------------------------------------------------------------------------
function LoansLedger({
  loans,
  selectedId,
  onSelect,
  onEditStart,
  onSave,
  containerName,
  onOpenContainer,
}: {
  loans: LoanRecord[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onEditStart: () => void;
  onSave: (loanId: number, data: Record<string, unknown>) => void;
  containerName: (id: number) => string;
  onOpenContainer: (id: number) => void;
}) {
  return (
    <>
      <div className={styles.bar}><span className={styles.barLabel}>Loans</span></div>
      <div className={`${styles.tableWrap} ${styles.ledgerWrap}`}>
        <table className={`${styles.table} ${styles.ledger}`}>
          <thead>
            <tr>
              <th>Loan</th>
              <th>Type</th>
              <th>Lender</th>
              <th className={styles.num}>Amount</th>
              <th className={styles.num}>LTC</th>
              <th>Rate</th>
              <th className={styles.num}>Term (mo)</th>
              <th className={styles.num}>IO (mo)</th>
              <th>Funds</th>
              <th className={styles.num}>Release %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => {
              const id = loan.loan_id;
              const containers = loan.containers ?? [];
              return (
                <tr
                  key={id}
                  className={id === selectedId ? styles.rowOn : undefined}
                  onClick={() => {
                    // Gregg, 2026-10-02: one click anywhere on the loan opens its detail.
                    onSelect(id);
                    onEditStart();
                  }}
                >
                  <td>
                    <EditCell value={loan.loan_name} display={loan.loan_name}
                      onCommit={(v) => v && onSave(id, { loan_name: v })} />
                  </td>
                  <td>
                    <EditCell value={loan.loan_type} display={labelFor(LOAN_TYPES, loan.loan_type)} kind="select"
                      options={LOAN_TYPES} onCommit={(v) => v && onSave(id, { loan_type: v })} />
                  </td>
                  <td>
                    <EditCell value={loan.lender_name} display={(loan.lender_name as string) || '—'}
                      onCommit={(v) => onSave(id, { lender_name: v })} />
                  </td>
                  {/* Computed: the sized commitment (effective — sized from the rule when not saved). */}
                  <td className={styles.num}>{money(effectiveOf(loan).commitment_amount ?? loan.commitment_amount)}</td>
                  <td className={styles.num}>
                    <EditCell value={num(loan.loan_to_cost_pct)} display={pct(loan.loan_to_cost_pct)} kind="number"
                      align="right" onCommit={(v) => onSave(id, { loan_to_cost_pct: v })} />
                  </td>
                  <td>{rateText(loan)}</td>
                  <td className={styles.num}>
                    <EditCell value={num(loan.loan_term_months)} display={money(loan.loan_term_months)} kind="number"
                      align="right" onCommit={(v) => onSave(id, { loan_term_months: v })} />
                  </td>
                  <td className={styles.num}>
                    <EditCell value={num(loan.interest_only_months)} display={money(loan.interest_only_months)}
                      kind="number" align="right" onCommit={(v) => onSave(id, { interest_only_months: v })} />
                  </td>
                  <td>
                    {containers.length === 0 ? (
                      <span className={styles.muted}>Whole project</span>
                    ) : (
                      containers.map((c, i) => (
                        <span key={c.division_id}>
                          {i > 0 && ', '}
                          <button type="button" className={styles.link}
                            onClick={(e) => { e.stopPropagation(); onOpenContainer(c.division_id); }}>
                            {containerName(c.division_id)}
                          </button>
                          {num(c.allocation_pct) !== null && num(c.allocation_pct) !== 100
                            ? ` ${num(c.allocation_pct)}%` : ''}
                        </span>
                      ))
                    )}
                  </td>
                  <td className={styles.num}>
                    <EditCell value={num(loan.release_price_pct)} display={pct(loan.release_price_pct, 0)}
                      kind="number" align="right" onCommit={(v) => onSave(id, { release_price_pct: v })} />
                  </td>
                  <td>
                    <EditCell value={loan.status} display={labelFor(STATUSES, loan.status)} kind="select"
                      options={STATUSES} onCommit={(v) => v && onSave(id, { status: v })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Draws & balance for the selected loan
// ---------------------------------------------------------------------------
interface SchedulePeriod {
  period_index: number;
  date?: string;
  costs_funded?: number;
  cost_draw?: number;
  accrued_interest?: number;
  interest_reserve_draw?: number;
  interest_reserve_balance?: number;
  release_payments?: number;
  ending_balance?: number;
  scheduled_payment?: number;
  interest_component?: number;
  principal_component?: number;
  balloon_amount?: number;
}

function bucketOf(idx: number, scale: Scale): number {
  if (scale === 'quarter') return Math.floor(idx / 3);
  if (scale === 'year') return Math.floor(idx / 12);
  return idx;
}

function DrawsTable({
  projectId,
  loan,
  scale,
  onScale,
  open,
  onToggle,
}: {
  projectId: string;
  loan: LoanRecord;
  scale: Scale;
  onScale: (s: Scale) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const { data, isLoading } = useLoanSchedule(projectId, loan.loan_id);
  const schedule = data as
    | { periods?: SchedulePeriod[]; findings?: Array<{ message: string }>; error?: string;
        structure_type?: string; schedule_kind?: string }
    | undefined;
  // Fixed-payment columns only for a loan that is not on the release calculator.
  const isTerm = schedule?.schedule_kind
    ? schedule.schedule_kind === 'payment'
    : !usesReleaseCalculator(loan);

  // Sum the flows within each bucket; the balance is the LAST one in it, never
  // a sum of balances.
  const rows = useMemo(() => {
    const periods = schedule?.periods ?? [];
    const out: Array<SchedulePeriod & { label: string }> = [];
    for (const p of periods) {
      const b = bucketOf(p.period_index, scale);
      const label = scale === 'month' ? (p.date || `Month ${p.period_index + 1}`)
        : scale === 'quarter' ? `Quarter ${b + 1}` : `Year ${b + 1}`;
      let row = out.find((r) => r.period_index === b);
      if (!row) {
        row = { period_index: b, label };
        out.push(row);
      }
      for (const k of ['costs_funded', 'cost_draw', 'accrued_interest', 'interest_reserve_draw',
        'release_payments', 'scheduled_payment', 'interest_component', 'principal_component',
        'balloon_amount'] as const) {
        const v = num(p[k]);
        if (v !== null) row[k] = (row[k] ?? 0) + v;
      }
      row.ending_balance = num(p.ending_balance) ?? row.ending_balance;
      // The reserve still undrawn is a balance too: the last one in the bucket.
      row.interest_reserve_balance = num(p.interest_reserve_balance) ?? row.interest_reserve_balance;
    }
    // Only periods where something happens or a balance is outstanding.
    return out.filter((r) =>
      Math.abs(r.ending_balance ?? 0) > 0.5 || Math.abs(r.cost_draw ?? 0) > 0.5
      || Math.abs(r.release_payments ?? 0) > 0.5 || Math.abs(r.scheduled_payment ?? 0) > 0.5);
  }, [schedule, scale]);

  return (
    <>
      <div className={styles.bar}>
        <button type="button" className={styles.foldBtn} onClick={onToggle} aria-expanded={open}>
          {open ? '▾' : '▸'}
        </button>
        <span className={styles.barLabel}>Loan schedule — draws &amp; balance — {loan.loan_name}</span>
        {open && (['month', 'quarter', 'year'] as Scale[]).map((s) => (
          <button key={s} type="button"
            className={`${styles.badge} ${scale === s ? styles.badgeOn : ''}`}
            onClick={() => onScale(s)}>
            by {s}
          </button>
        ))}
      </div>
      {open && schedule?.findings?.map((f) => (
        <div key={f.message} className={styles.hint}>{f.message}</div>
      ))}
      {!open ? null : isLoading ? (
        <div className={styles.hint}>Running the schedule…</div>
      ) : schedule?.error ? (
        <div className={styles.hint}>The schedule could not be run: {schedule.error}</div>
      ) : rows.length === 0 ? (
        <div className={styles.hint}>
          No draws yet — the funded containers have no dated costs, or the loan has no sizing. Undated budget
          lines still count toward sizing; only the timing of draws needs dates.
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              {isTerm ? (
                <tr>
                  <th>Period</th><th className={styles.num}>Interest</th>
                  <th className={styles.num}>Paid by reserve</th><th className={styles.num}>Paid by project</th>
                  <th className={styles.num}>Principal</th><th className={styles.num}>Balloon</th>
                  <th className={styles.num}>Balance</th><th className={styles.num}>Reserve undrawn</th>
                </tr>
              ) : (
                <tr>
                  <th>Period</th><th className={styles.num}>Costs funded</th><th className={styles.num}>Draw</th>
                  <th className={styles.num}>Interest</th><th className={styles.num}>Paid by reserve</th>
                  <th className={styles.num}>Release from sales</th>
                  <th className={styles.num}>Balance</th><th className={styles.num}>Reserve undrawn</th>
                </tr>
              )}
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.period_index}>
                  <td>{r.label}</td>
                  {isTerm ? (
                    <>
                      <td className={styles.num}>{money(r.interest_component)}</td>
                      <td className={styles.num}>{money(r.interest_reserve_draw)}</td>
                      <td className={styles.num}>
                        {money((r.interest_component ?? 0) - (r.interest_reserve_draw ?? 0))}
                      </td>
                      <td className={styles.num}>{money(r.principal_component)}</td>
                      <td className={styles.num}>{money(r.balloon_amount)}</td>
                      <td className={styles.num}>{money(r.ending_balance)}</td>
                      <td className={styles.num}>{money(r.interest_reserve_balance)}</td>
                    </>
                  ) : (
                    <>
                      <td className={styles.num}>{money(r.costs_funded)}</td>
                      <td className={styles.num}>{money(r.cost_draw)}</td>
                      <td className={styles.num}>{money(r.accrued_interest)}</td>
                      <td className={styles.num}>{money(r.interest_reserve_draw)}</td>
                      <td className={styles.num}>{money(r.release_payments ? -r.release_payments : 0)}</td>
                      <td className={styles.num}>{money(r.ending_balance)}</td>
                      <td className={styles.num}>{money(r.interest_reserve_balance)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------
type FieldKind = 'text' | 'number' | 'date' | 'select' | 'bool';
interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: Array<{ value: string; label: string }>;
  suffix?: string;
}

const GROUPS: Array<{ title: string; fields: FieldDef[] }> = [
  {
    title: 'Loan',
    fields: [
      { key: 'loan_name', label: 'Name', kind: 'text' },
      { key: 'loan_type', label: 'Type', kind: 'select', options: LOAN_TYPES },
      { key: 'structure_type', label: 'Structure', kind: 'select', options: STRUCTURES },
      { key: 'lender_name', label: 'Lender', kind: 'text' },
      { key: 'seniority', label: 'Seniority', kind: 'number' },
      { key: 'status', label: 'Status', kind: 'select', options: STATUSES },
    ],
  },
  {
    title: 'Sizing',
    fields: [
      { key: 'loan_to_cost_pct', label: 'Loan to cost', kind: 'number', suffix: '%' },
      { key: 'loan_to_value_pct', label: 'Loan to value', kind: 'number', suffix: '%' },
      { key: 'commitment_amount', label: 'Amount (manual, when no ratio)', kind: 'number' },
    ],
  },
  {
    title: 'Pricing & term',
    fields: [
      { key: 'interest_type', label: 'Rate type', kind: 'select', options: INTEREST_TYPES },
      { key: 'interest_index', label: 'Index', kind: 'text' },
      { key: 'interest_spread_bps', label: 'Spread', kind: 'number', suffix: 'bps' },
      { key: 'interest_rate_pct', label: 'All-in rate', kind: 'number', suffix: '%' },
      { key: 'rate_floor_pct', label: 'Floor', kind: 'number', suffix: '%' },
      { key: 'rate_cap_pct', label: 'Cap', kind: 'number', suffix: '%' },
      { key: 'loan_start_date', label: 'Start', kind: 'date' },
      { key: 'loan_term_months', label: 'Term', kind: 'number', suffix: 'mo' },
      { key: 'interest_only_months', label: 'Interest only', kind: 'number', suffix: 'mo' },
      { key: 'amortization_months', label: 'Amortisation', kind: 'number', suffix: 'mo' },
    ],
  },
  {
    title: 'Fees & reserve',
    fields: [
      { key: 'origination_fee_pct', label: 'Origination', kind: 'number', suffix: '%' },
      { key: 'exit_fee_pct', label: 'Exit', kind: 'number', suffix: '%' },
      { key: 'unused_fee_pct', label: 'Unused', kind: 'number', suffix: '%' },
      { key: 'commitment_fee_pct', label: 'Commitment', kind: 'number', suffix: '%' },
      // The reserve is held back from the commitment and drawn monthly to pay
      // interest (loan-in-process) — never funded at closing (Gregg, 2026-10-02).
      { key: 'interest_reserve_amount', label: 'Interest reserve (held back)', kind: 'number' },
      { key: 'interest_reserve_inflator', label: 'Reserve contingency', kind: 'number', suffix: '%' },
    ],
  },
  {
    title: 'Release',
    fields: [
      // Per lot or per acre: the loan's share of each lot or acre (commitment ÷
      // lots or acres it holds) × this % × acceleration, floored at the
      // minimum. Cash sweep: 100% of each sale's net proceeds, no price.
      { key: 'release_basis', label: 'Release basis', kind: 'select', options: RELEASE_BASES },
      { key: 'release_price_pct', label: 'Release price (% of loan per lot or acre)', kind: 'number', suffix: '%' },
      { key: 'repayment_acceleration', label: 'Release acceleration', kind: 'number', suffix: '×' },
      { key: 'minimum_release_amount', label: 'Minimum release (per lot or acre)', kind: 'number' },
    ],
  },
];

const MORE_FIELDS: FieldDef[] = [
  { key: 'draw_trigger_type', label: 'Draw trigger', kind: 'text' },
  { key: 'collateral_basis_type', label: 'Collateral basis', kind: 'text' },
  { key: 'recourse_type', label: 'Recourse', kind: 'text' },
  { key: 'extension_options', label: 'Extension options', kind: 'number' },
  { key: 'extension_fee_bps', label: 'Extension fee', kind: 'number', suffix: 'bps' },
  { key: 'notes', label: 'Source / notes', kind: 'text' },
];

function DetailPanel({
  projectId,
  loan,
  onSave,
  onSaveContainers,
  containerOptions,
  containerName,
  moreOpen,
  onToggleMore,
  onClose,
}: {
  projectId: string;
  loan: LoanRecord;
  onSave: (loanId: number, data: Record<string, unknown>) => void;
  onSaveContainers: (loan: LoanRecord, rows: LoanContainerRow[]) => void;
  containerOptions: Array<{ id: number; label: string; level: string }>;
  containerName: (id: number) => string;
  moreOpen: boolean;
  onToggleMore: () => void;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState('');
  const containers = loan.containers ?? [];

  // The list endpoint carries only part of the record; the detail endpoint
  // carries every column, which the fee and "More" fields need.
  const { data: detail } = useQuery({
    queryKey: ['loan-detail', projectId, loan.loan_id],
    queryFn: () =>
      authFetch(`${DJANGO_API_URL}/api/projects/${projectId}/loans/${loan.loan_id}/`).then((r) => r.json()),
  });
  const record: LoanRecord = { ...(detail as LoanRecord | undefined ?? {}), ...loan };

  const eff = effectiveOf(loan);
  const field = (f: FieldDef) => {
    const value = f.key in loan ? loan[f.key] : record[f.key];
    // No start date saved: show the default (the acquisition date), marked, and
    // let a typed date replace it (HQ137).
    if (f.key === 'loan_start_date' && !value && eff.loan_start_date) {
      return (
        <EditCell
          value={eff.loan_start_date}
          display={`${eff.loan_start_date} · acquisition date`}
          kind="date"
          align="right"
          onCommit={(v) => onSave(loan.loan_id, { loan_start_date: v })}
        />
      );
    }
    // A land loan's structure is always Term — show it, but offer nothing else.
    if (f.key === 'structure_type' && loan.loan_type === 'LAND') {
      return <span title="A land loan has one advance at closing">Term (one advance)</span>;
    }
    // The amount is typed only when no ratio sizes it; otherwise it is the
    // sized commitment — computed, so not offered for editing here.
    if (f.key === 'commitment_amount'
      && (num(loan.loan_to_cost_pct) !== null || num(loan.loan_to_value_pct) !== null)) {
      return <span title="Sized from the ratio above">{money(eff.commitment_amount ?? value)}</span>;
    }
    // Contingency: stored as a multiplier (1.2), shown and typed as a percent (20).
    if (f.key === 'interest_reserve_inflator') {
      const pct = inflatorToPct(value);
      return (
        <EditCell
          value={pct}
          display={pct === null ? '—' : `${pct.toLocaleString('en-US', { maximumFractionDigits: 2 })} %`}
          kind="number"
          align="right"
          onCommit={(v) => onSave(loan.loan_id, {
            interest_reserve_inflator: num(v) === null ? null : pctToInflator(Number(v)),
          })}
        />
      );
    }
    if (f.kind === 'bool') {
      return (
        <input
          type="checkbox"
          className="form-check-input"
          checked={Boolean(value)}
          onChange={(e) => onSave(loan.loan_id, { [f.key]: e.target.checked })}
        />
      );
    }
    const display = value === null || value === undefined || value === ''
      ? '—'
      : f.kind === 'select'
        ? labelFor(f.options ?? [], value)
        : f.kind === 'number'
          ? `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 3 })}${f.suffix ? ` ${f.suffix}` : ''}`
          : String(value);
    return (
      <EditCell
        value={f.kind === 'number' ? num(value) : value}
        display={display}
        kind={f.kind === 'select' ? 'select' : f.kind}
        options={f.options}
        align="right"
        onCommit={(v) => onSave(loan.loan_id, { [f.key]: v })}
      />
    );
  };

  const setShare = (divisionId: number, share: string) =>
    onSaveContainers(loan, containers.map((c) =>
      c.division_id === divisionId ? { ...c, allocation_pct: share === '' ? null : Number(share) } : c));
  const setAcquisition = (divisionId: number, on: boolean) =>
    onSaveContainers(loan, containers.map((c) =>
      c.division_id === divisionId ? { ...c, collateral_type: on ? 'ACQUISITION' : null } : c));
  const removeContainer = (divisionId: number) =>
    onSaveContainers(loan, containers.filter((c) => c.division_id !== divisionId));
  const addContainer = () => {
    const id = Number(adding);
    if (!id || containers.some((c) => c.division_id === id)) return;
    onSaveContainers(loan, [...containers, { division_id: id, allocation_pct: null, collateral_type: null }]);
    setAdding('');
  };

  return (
    <div className={styles.tiles}>
      <div className={styles.tilesHead}>
        <span className={styles.detailTitle}>{loan.loan_name} — loan detail</span>
        <button type="button" className="btn btn-sm btn-ghost-secondary" onClick={onClose}>
          Close
        </button>
      </div>
      <div className={styles.tileGrid}>
      {/* Gregg, 2026-10-02: column 1 is Security (was Funds), Loan, Sizing. */}
      <div className={styles.tileCol}>
      <section className={styles.group}>
        <div className={styles.groupTitle}>Security</div>
        {containers.length === 0 && (
          <div className={`${styles.muted} ${styles.groupNote}`}>
            Whole project — draws on every cost and is released by every sale, and funds the land purchase.
          </div>
        )}
        {containers.map((c) => (
          <div key={c.division_id} className={styles.row}>
            <span className={styles.rowLabel}>{containerName(c.division_id)}</span>
            <span className={`${styles.rowValue} d-flex align-items-center gap-2`}>
              <input
                aria-label="Share"
                className={`form-control form-control-sm ${styles.shareInput} ${styles.typed}`}
                type="number"
                // Empty means the loan takes all of this container (the engine
                // reads no share as the whole of it); nothing is filled in for it.
                defaultValue={num(c.allocation_pct) ?? ''}
                placeholder="all"
                onBlur={(e) => setShare(c.division_id, e.target.value)}
              />
              %
              <label className="d-flex align-items-center gap-1" title="The loan also funds the land purchase">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={['ACQUISITION', 'LAND'].includes((c.collateral_type || '').toUpperCase())}
                  onChange={(e) => setAcquisition(c.division_id, e.target.checked)}
                />
                land
              </label>
              <button type="button" className="btn btn-sm btn-ghost-secondary" onClick={() => removeContainer(c.division_id)}>
                Remove
              </button>
            </span>
          </div>
        ))}
        <div className={`d-flex align-items-center gap-2 ${styles.groupNote}`}>
          <select className="form-select form-select-sm" value={adding} onChange={(e) => setAdding(e.target.value)}>
            <option value="">Add a village or phase…</option>
            {containerOptions
              .filter((o) => !containers.some((c) => c.division_id === o.id))
              .map((o) => (
                <option key={o.id} value={o.id}>{o.level} · {o.label}</option>
              ))}
          </select>
          <button type="button" className="btn btn-sm btn-ghost-secondary" onClick={addContainer} disabled={!adding}>
            Add
          </button>
        </div>
      </section>

      {GROUPS.slice(0, 2).map((g) => (
        <section key={g.title} className={styles.group}>
          <div className={styles.groupTitle}>{g.title}</div>
          {g.fields.map((f) => (
            <div key={f.key} className={styles.row}>
              <span className={styles.rowLabel}>{f.label}</span>
              <span className={styles.rowValue}>{field(f)}</span>
            </div>
          ))}
          {g.title === 'Sizing' && (
            <>
              {/* A term bridge loan is sized on the acquisition price; other loans on
                  the purchase plus the budget of the containers they fund (HQ132).
                  A basis shows its default, marked, until one is typed; clearing a
                  typed basis returns it to the default (HQ137). */}
              <div className={styles.row}>
                <span className={styles.rowLabel}>Value basis</span>
                <span className={styles.rowValue}>
                  <EditCell
                    value={num(eff.ltv_basis_amount ?? loan.ltv_basis_amount)}
                    display={`${money(eff.ltv_basis_amount ?? loan.ltv_basis_amount)}${eff.value_basis_is_default ? ` · ${basisDefaultLabel(eff)}` : ''}`}
                    kind="number"
                    align="right"
                    onCommit={(v) => onSave(loan.loan_id, { ltv_basis_amount: v })}
                  />
                </span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Cost basis</span>
                <span className={styles.rowValue}>
                  <EditCell
                    value={num(eff.ltc_basis_amount ?? loan.ltc_basis_amount)}
                    display={`${money(eff.ltc_basis_amount ?? loan.ltc_basis_amount)}${eff.cost_basis_is_default ? ` · ${basisDefaultLabel(eff)}` : ''}`}
                    kind="number"
                    align="right"
                    onCommit={(v) => onSave(loan.loan_id, { ltc_basis_amount: v })}
                  />
                </span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Commitment</span>
                <span className={styles.rowValue} title={eff.amount_is_saved === false ? 'Sized from the rule; saved when the loan is next saved' : undefined}>
                  {money(eff.commitment_amount ?? loan.commitment_amount)}
                </span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Governed by</span>
                <span className={styles.rowValue}>{eff.governing_constraint || (loan.governing_constraint as string) || '—'}</span>
              </div>
              {(eff.sizing_notes ?? []).map((n) => (
                <div key={n} className={styles.hint}>{n}</div>
              ))}
            </>
          )}
        </section>
      ))}

      </div>
      <div className={styles.tileCol}>
      {GROUPS.slice(2).map((g) => (
        <section key={g.title} className={styles.group}>
          <div className={styles.groupTitle}>{g.title}</div>
          {g.fields.map((f) => (
            <div key={f.key} className={styles.row}>
              <span className={styles.rowLabel}>{f.label}</span>
              <span className={styles.rowValue}>{field(f)}</span>
            </div>
          ))}
        </section>
      ))}

      <section className={styles.group}>
        <button type="button" className="btn btn-sm btn-ghost-secondary" onClick={onToggleMore}>
          {moreOpen ? 'Less' : 'More…'}
        </button>
        {moreOpen && MORE_FIELDS.map((f) => (
          <div key={f.key} className={styles.row}>
            <span className={styles.rowLabel}>{f.label}</span>
            <span className={styles.rowValue}>{field(f)}</span>
          </div>
        ))}
      </section>
      </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Interest-reserve prompt
// ---------------------------------------------------------------------------
interface ReserveCheck {
  loan_id: number;
  uncovered_months: number;
  uncovered_interest: number;
  first_uncovered_month: number | null;
  has_reserve: boolean;
  uses_calculator: boolean;
  missing_inputs: Array<{
    key: string;
    label: string;
    kind: 'number' | 'choice';
    choices: Array<{ value: string; label: string }> | null;
  }>;
  price_inputs: string[];
}

function ReservePrompt({
  projectId,
  check,
  loanName,
  onDone,
}: {
  projectId: string;
  check: ReserveCheck;
  loanName: string;
  onDone: (note?: string) => void;
}) {
  const [step, setStep] = useState<'ask' | 'inputs' | 'result'>('ask');
  // Only what the loan does not already carry is asked for.
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(check.missing_inputs.map((i) => [i.key, ''])),
  );
  const sweep = values.release_basis === 'CASH_SWEEP';
  const shown = check.missing_inputs.filter((i) => !(sweep && check.price_inputs.includes(i.key)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ recommended_reserve?: number; calculation_basis?: Record<string, unknown> } | null>(null);
  const base = `${DJANGO_API_URL}/api/projects/${projectId}/loans/${check.loan_id}`;

  const size = async () => {
    setBusy(true);
    setError(null);
    try {
      const data: Record<string, number | string> = {};
      for (const i of shown) {
        const v = (values[i.key] ?? '').trim();
        if (v === '') continue;
        if (i.kind === 'choice') data[i.key] = v;
        // The contingency is typed as a percent (20 = 20%) and stored as a
        // multiplier (1.2).
        else if (i.key === 'interest_reserve_inflator' && Number.isFinite(Number(v))) {
          data[i.key] = pctToInflator(Number(v));
        }
        else if (Number.isFinite(Number(v))) data[i.key] = Number(v);
      }
      const unfilled = shown.filter((i) => data[i.key] === undefined);
      if (unfilled.length > 0) {
        setError(`Still needed: ${unfilled.map((i) => i.label).join(', ')}.`);
        return;
      }
      const saved = await authFetch(`${base}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!saved.ok) throw new Error(JSON.stringify(await saved.json().catch(() => ({}))));
      const run = await authFetch(`${base}/interest-reserve/calculate/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const body = await run.json();
      if (!run.ok) throw new Error(JSON.stringify(body));
      setResult(body);
      setStep('result');
    } catch (e) {
      setError(`The reserve could not be sized: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const useReserve = async () => {
    if (!result?.recommended_reserve) return;
    setBusy(true);
    try {
      const r = await authFetch(`${base}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interest_reserve_amount: result.recommended_reserve }),
      });
      if (!r.ok) throw new Error('save');
      onDone(`Interest reserve of ${money(result.recommended_reserve)} built into ${loanName}.`);
    } catch {
      setError('The reserve was sized but not saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.prompt}>
      {step === 'ask' && (
        <>
          <p>
            <strong>{loanName}</strong> charges interest in {check.uncovered_months} month
            {check.uncovered_months === 1 ? '' : 's'} when the project has no cash to pay it — about{' '}
            {money(check.uncovered_interest)} in all
            {check.first_uncovered_month ? `, starting month ${check.first_uncovered_month}` : ''}. Build in an
            interest reserve?
          </p>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setStep('inputs')}>
              Yes, size a reserve
            </button>
            <button type="button" className="btn btn-sm btn-ghost-secondary" onClick={() => onDone('Loan kept as it is, with no interest reserve.')}>
              No, keep the loan as it is
            </button>
          </div>
        </>
      )}
      {step === 'inputs' && (
        <>
          <p>
            The reserve is sized by the loan calculator: it runs the draws, releases and interest, sizes the
            reserve with its contingency, and repeats until the numbers settle.{' '}
            {shown.length > 0
              ? 'The loan already carries everything else; it still needs:'
              : 'The loan already carries everything it needs.'}
            {!check.uses_calculator && ' Giving this loan a release basis is what puts it through the calculator.'}
          </p>
          {shown.map((i) => (
            <div key={i.key} className={styles.row}>
              <span className={styles.rowLabel}>{i.label}</span>
              {i.kind === 'choice' ? (
                <select
                  className={`form-select form-select-sm ${styles.typed}`}
                  style={{ width: 'auto' }}
                  value={values[i.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [i.key]: e.target.value }))}
                >
                  <option value="">Choose…</option>
                  {(i.choices ?? []).map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  className={`form-control form-control-sm ${styles.shareInput} ${styles.typed}`}
                  type="number"
                  value={values[i.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [i.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <div className="d-flex gap-2" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-sm btn-primary" onClick={size} disabled={busy}>
              {busy ? 'Sizing…' : 'Size the reserve'}
            </button>
            <button type="button" className="btn btn-sm btn-ghost-secondary" onClick={() => onDone()}>
              Cancel
            </button>
          </div>
        </>
      )}
      {step === 'result' && result && (
        <>
          <p>
            Recommended interest reserve: <strong>{money(result.recommended_reserve)}</strong>
            {result.calculation_basis?.iterations
              ? ` (settled after ${String(result.calculation_basis.iterations)} rounds)`
              : ''}
            {result.calculation_basis?.peak_balance
              ? `; peak balance ${money(result.calculation_basis.peak_balance)}`
              : ''}
            .
          </p>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-primary" onClick={useReserve} disabled={busy}>
              Use this reserve
            </button>
            <button type="button" className="btn btn-sm btn-ghost-secondary" onClick={() => onDone('Reserve sized but not used.')}>
              Don&apos;t use it
            </button>
          </div>
        </>
      )}
      {error && <div className={styles.message} style={{ marginTop: 6 }}>{error}</div>}
    </div>
  );
}

export default DebtScreen;
