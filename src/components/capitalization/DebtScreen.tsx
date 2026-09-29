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

import React, { useMemo, useState } from 'react';
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

// The loan types the database accepts (A&D and Land added 2026-09-29).
const LOAN_TYPES: Array<{ value: string; label: string }> = [
  { value: 'ACQUISITION_DEVELOPMENT', label: 'A&D' },
  { value: 'LAND', label: 'Land' },
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'BRIDGE', label: 'Bridge' },
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'MEZZANINE', label: 'Mezzanine' },
  { value: 'LINE_OF_CREDIT', label: 'Line of credit' },
  { value: 'PREFERRED_EQUITY', label: 'Preferred equity' },
];
const STRUCTURES = [
  { value: 'REVOLVER', label: 'Revolver' },
  { value: 'TERM', label: 'Term' },
];
const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
  { value: 'defeased', label: 'Defeased' },
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

/** Thousands separators, parentheses for negatives, em dash for zero/absent. */
function money(v: unknown): string {
  const n = num(v);
  if (n === null || Math.round(n) === 0) return '—';
  const body = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return n < 0 ? `(${body})` : body;
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
      onClick={start}
      title="Click to edit"
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
  const [message, setMessage] = useState<string | null>(null);
  const [sizing, setSizing] = useState(false);

  const containerOptions = useMemo(
    () => [
      ...areas.map((a) => ({ id: a.division_id, label: a.name || a.code, level: 'Village' })),
      ...phases.map((p) => ({ id: p.division_id, label: p.name || p.code, level: 'Phase' })),
    ],
    [areas, phases],
  );
  const containerName = (id: number) =>
    containerOptions.find((c) => c.id === id)?.label ?? `Container ${id}`;

  const save = (loanId: number, data: Record<string, unknown>) => {
    setMessage(null);
    updateLoan.mutate(
      { loanId, data: data as never },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['loan-schedule', projectId, loanId] });
          queryClient.invalidateQueries({ queryKey: ['loan-detail', projectId, loanId] });
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
        loan_type: 'ACQUISITION_DEVELOPMENT',
        structure_type: 'REVOLVER',
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
      if (selected.structure_type === 'REVOLVER') {
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
      {/* Tab strip: Debt is this screen. */}
      <div className={styles.tabs}>
        <span className={`${styles.tab} ${styles.tabOn}`}>Debt</span>
        <button type="button" className={styles.tab} onClick={() => onNavigate?.('equity')}>Equity</button>
        <button type="button" className={styles.tab} onClick={() => onNavigate?.('cashflow')}>Cash flow</button>
        <span className={`${styles.tab} ${styles.tabOff}`} title="Decision points is not built yet">Decision points</span>
      </div>

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
            <LoansLedger
              loans={loans}
              selectedId={selected?.loan_id ?? null}
              onSelect={setSelectedId}
              onSave={save}
              containerName={containerName}
              onOpenContainer={(id) => onNavigate?.('planning', id)}
            />
            {selected && (
              <DrawsTable projectId={projectId} loan={selected} scale={scale} onScale={setScale} />
            )}
          </div>
          {selected && (
            <DetailPanel
              projectId={projectId}
              loan={selected}
              onSave={save}
              onSaveContainers={saveContainers}
              containerOptions={containerOptions}
              containerName={containerName}
              moreOpen={moreOpen}
              onToggleMore={() => setMoreOpen((o) => !o)}
            />
          )}
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
  onSave,
  containerName,
  onOpenContainer,
}: {
  loans: LoanRecord[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onSave: (loanId: number, data: Record<string, unknown>) => void;
  containerName: (id: number) => string;
  onOpenContainer: (id: number) => void;
}) {
  return (
    <>
      <div className={styles.bar}><span className={styles.barLabel}>Loans</span></div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
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
                  onClick={() => onSelect(id)}
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
                  {/* Computed: the sized commitment. */}
                  <td className={styles.num}>{money(loan.commitment_amount)}</td>
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
}: {
  projectId: string;
  loan: LoanRecord;
  scale: Scale;
  onScale: (s: Scale) => void;
}) {
  const { data, isLoading } = useLoanSchedule(projectId, loan.loan_id);
  const schedule = data as
    | { periods?: SchedulePeriod[]; findings?: Array<{ message: string }>; error?: string; structure_type?: string }
    | undefined;
  const isTerm = (schedule?.structure_type ?? loan.structure_type) === 'TERM';

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
    }
    // Only periods where something happens or a balance is outstanding.
    return out.filter((r) =>
      Math.abs(r.ending_balance ?? 0) > 0.5 || Math.abs(r.cost_draw ?? 0) > 0.5
      || Math.abs(r.release_payments ?? 0) > 0.5 || Math.abs(r.scheduled_payment ?? 0) > 0.5);
  }, [schedule, scale]);

  return (
    <>
      <div className={styles.bar} style={{ marginTop: 16 }}>
        <span className={styles.barLabel}>Draws &amp; balance — {loan.loan_name}</span>
        {(['month', 'quarter', 'year'] as Scale[]).map((s) => (
          <button key={s} type="button"
            className={`${styles.badge} ${scale === s ? styles.badgeOn : ''}`}
            onClick={() => onScale(s)}>
            by {s}
          </button>
        ))}
      </div>
      {schedule?.findings?.map((f) => (
        <div key={f.message} className={styles.hint}>{f.message}</div>
      ))}
      {isLoading ? (
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
                  <th>Period</th><th className={styles.num}>Payment</th><th className={styles.num}>Interest</th>
                  <th className={styles.num}>Principal</th><th className={styles.num}>Balloon</th>
                  <th className={styles.num}>Balance</th>
                </tr>
              ) : (
                <tr>
                  <th>Period</th><th className={styles.num}>Costs funded</th><th className={styles.num}>Draw</th>
                  <th className={styles.num}>Interest</th><th className={styles.num}>Release from sales</th>
                  <th className={styles.num}>Balance</th>
                </tr>
              )}
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.period_index}>
                  <td>{r.label}</td>
                  {isTerm ? (
                    <>
                      <td className={styles.num}>{money(r.scheduled_payment)}</td>
                      <td className={styles.num}>{money(r.interest_component)}</td>
                      <td className={styles.num}>{money(r.principal_component)}</td>
                      <td className={styles.num}>{money(r.balloon_amount)}</td>
                      <td className={styles.num}>{money(r.ending_balance)}</td>
                    </>
                  ) : (
                    <>
                      <td className={styles.num}>{money(r.costs_funded)}</td>
                      <td className={styles.num}>{money(r.cost_draw)}</td>
                      <td className={styles.num}>{money(r.accrued_interest)}</td>
                      <td className={styles.num}>{money(r.release_payments ? -r.release_payments : 0)}</td>
                      <td className={styles.num}>{money(r.ending_balance)}</td>
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
      { key: 'interest_reserve_amount', label: 'Interest reserve', kind: 'number' },
      { key: 'interest_reserve_funded_upfront', label: 'Reserve funded at close', kind: 'bool' },
    ],
  },
  {
    title: 'Release',
    fields: [
      // The engine prices a release as the loan's per-lot share (commitment
      // ÷ lots it holds) × this % × acceleration, floored at the minimum —
      // not a share of the sale price.
      { key: 'release_price_pct', label: 'Release price (% of loan per lot)', kind: 'number', suffix: '%' },
      { key: 'repayment_acceleration', label: 'Release acceleration', kind: 'number', suffix: '×' },
      { key: 'minimum_release_amount', label: 'Minimum release per lot', kind: 'number' },
      { key: 'interest_reserve_inflator', label: 'Interest reserve cushion (inflator)', kind: 'number', suffix: '×' },
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
}: {
  projectId: string;
  loan: LoanRecord;
  onSave: (loanId: number, data: Record<string, unknown>) => void;
  onSaveContainers: (loan: LoanRecord, rows: LoanContainerRow[]) => void;
  containerOptions: Array<{ id: number; label: string; level: string }>;
  containerName: (id: number) => string;
  moreOpen: boolean;
  onToggleMore: () => void;
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

  const field = (f: FieldDef) => {
    const value = f.key in loan ? loan[f.key] : record[f.key];
    // The amount is typed only when no ratio sizes it; otherwise it is the
    // sized commitment — computed, so not offered for editing here.
    if (f.key === 'commitment_amount'
      && (num(loan.loan_to_cost_pct) !== null || num(loan.loan_to_value_pct) !== null)) {
      return <span title="Sized from the ratio above">{money(value)}</span>;
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
    <aside className={styles.detail}>
      <div className={styles.detailTitle}>{loan.loan_name}</div>
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
              <div className={styles.row}>
                <span className={styles.rowLabel}>Cost basis (budget of funded containers)</span>
                <span className={styles.rowValue}>{money(loan.ltc_basis_amount)}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Commitment</span>
                <span className={styles.rowValue}>{money(loan.commitment_amount)}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Governed by</span>
                <span className={styles.rowValue}>{(loan.governing_constraint as string) || '—'}</span>
              </div>
            </>
          )}
        </section>
      ))}

      <section className={styles.group}>
        <div className={styles.groupTitle}>Funds</div>
        {containers.length === 0 && (
          <div className={styles.muted}>
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
        <div className="d-flex align-items-center gap-2" style={{ marginTop: 6 }}>
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
    </aside>
  );
}

export default DebtScreen;
