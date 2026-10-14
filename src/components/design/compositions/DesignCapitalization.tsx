'use client';

/**
 * C7 · Capitalization — Slice 1 reference composition (land).
 *
 * One page for what the live app splits across Debt and Equity: headline debt
 * figures, a compact card per loan (sizing basis → governing constraint →
 * commitment, rate, term, fees, net proceeds, reserve), the stored waterfall
 * tiers, the last waterfall results (LP / GP / project), equity partners, and
 * the leveraged-vs-unleveraged cash-flow strip.
 *
 * Every figure is read from the live endpoints the Debt and Equity screens use.
 * Editing opens those live screens in place (loan form, waterfall form, partner
 * modal, period tables), so no capability is lost.
 *
 * Not drawn, because the app does not hold it yet: evidence tags on loan terms
 * (read · term sheet) and Landscaper's sizing narrative.
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuthHeaders } from '@/lib/authHeaders';
import { useLoans } from '@/hooks/useCapitalization';
import type { Loan } from '@/types/assumptions';
import DebtPage from '@/app/projects/[projectId]/capitalization/debt/page';
import EquityPage from '@/app/projects/[projectId]/capitalization/equity/page';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProject = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = Record<string, any>;

const DJANGO = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
const num = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const x = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(x) ? x : null;
};
const big = (v: number | null) => {
  if (v == null) return '—';
  const a = Math.abs(v);
  if (a >= 1e6) return `$${(v / 1e6).toFixed(a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2)}M`;
  if (a >= 1e3) return `$${Math.round(v / 1e3).toLocaleString()}K`;
  return `$${Math.round(v).toLocaleString()}`;
};
const pct = (v: number | null, d = 1) => (v == null ? '—' : `${v.toFixed(d)}%`);
const monthYear = (d: Date | null) => (d ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—');
const addMonths = (s: string, m: number) => { const d = new Date(`${s.slice(0, 10)}T12:00:00`); d.setMonth(d.getMonth() + m); return d; };
const SIZING: Record<string, string> = { MIN_LTV_LTC: 'min(LTV, LTC)', LTV: 'LTV', LTC: 'LTC', FIXED: 'Fixed amount', MANUAL: 'Fixed amount' };

function LoanTile({ loan }: { loan: Loan & Any }) {
  const structure = loan.facility_structure || loan.structure_type || '';
  const rate = num(loan.interest_rate_pct);
  const floating = (loan.interest_type || '').toLowerCase() === 'floating' && loan.interest_index;
  const spread = num(loan.interest_spread_bps);
  const sizing = SIZING[(loan.commitment_sizing_method || '').toUpperCase()] ?? loan.commitment_sizing_method ?? '—';
  const governing = (loan.governing_constraint || '').toUpperCase();
  const ltc = num(loan.loan_to_cost_pct);
  const ltv = num(loan.loan_to_value_pct);
  const term = num(loan.loan_term_months);
  const io = num(loan.interest_only_months);
  const amort = num(loan.amortization_months);
  const orig = num(loan.origination_fee_pct);
  const exit = num(loan.exit_fee_pct);
  return (
    <section className="ds-card ds-loan">
      <header className="ds-loan-head">
        <b>{loan.loan_name || 'Loan'}</b>
        <span className="ds-muted">{loan.lender_name || 'Lender not set'}</span>
        {structure && <span className="ds-tag ds-tag-neutral">{structure}</span>}
        {loan.loan_type && <span className="ds-muted ds-push">{String(loan.loan_type).toLowerCase()}</span>}
      </header>
      <dl className="ds-kv">
        <dt>Sizing</dt><dd>{sizing}</dd>
        <dt>{ltc != null && ltv != null ? 'LTC / LTV' : ltc != null ? 'LTC %' : 'LTV %'}</dt>
        <dd>{ltc != null && ltv != null ? `${pct(ltc, 0)} / ${pct(ltv, 0)}` : pct(ltc ?? ltv, 0)}</dd>
        <dt>Cost basis</dt><dd>{big(num(loan.ltc_basis_amount))}</dd>
        <dt>Value basis</dt><dd>{big(num(loan.ltv_basis_amount))}</dd>
        <dt>Governing</dt><dd>{governing || '—'} → <b>{big(num(loan.calculated_commitment_amount) ?? num(loan.commitment_amount))}</b></dd>
        <dt>Rate</dt><dd>{floating ? `${loan.interest_index}${spread != null ? ` + ${spread}` : ''} = ` : 'Fixed '}{pct(rate, 2)}</dd>
        <dt>Term / IO</dt><dd>{term ?? '—'} / {io ?? 0} mo{amort ? ` · ${amort} amort` : ''}</dd>
        <dt>Start</dt><dd>{loan.loan_start_date ? monthYear(new Date(`${loan.loan_start_date.slice(0, 10)}T12:00:00`)) : '—'}</dd>
        <dt>Fees</dt><dd>{orig != null ? `${orig.toFixed(1)}% orig` : '—'}{exit ? ` · ${exit.toFixed(1)}% exit` : ''}</dd>
        <dt>Interest reserve</dt><dd>{big(num(loan.interest_reserve_amount))}</dd>
      </dl>
      <div className="ds-loan-foot">
        Net proceeds <b>{big(num(loan.net_loan_proceeds))}</b> <span className="ds-muted">after fees &amp; closing costs</span>
      </div>
    </section>
  );
}

export function DesignCapitalization({ project }: { project: AnyProject }) {
  const projectId = Number(project.project_id);
  const qc = useQueryClient();
  const [mode, setMode] = useState<'view' | 'debt' | 'equity'>('view');
  const [hurdleView, setHurdleView] = useState<'irr' | 'em' | 'both'>('irr');
  const [running, setRunning] = useState(false);

  const { data: loansRaw } = useLoans(String(projectId));
  const loans = useMemo<(Loan & Any)[]>(() => {
    const d = loansRaw as Any | Loan[] | undefined;
    if (Array.isArray(d)) return d as (Loan & Any)[];
    return (d?.results || d?.loans || d?.data || []) as (Loan & Any)[];
  }, [loansRaw]);

  const { data: wf } = useQuery({
    queryKey: ['design-waterfall', projectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}/waterfall`, { headers: getAuthHeaders() });
      return r.ok ? ((await r.json()) as Any) : null;
    },
  });
  const { data: result } = useQuery({
    queryKey: ['design-waterfall-result', projectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}/waterfall/last-result?_t=${Date.now()}`, { headers: getAuthHeaders() });
      return r.ok ? ((await r.json()) as Any) : null;
    },
  });
  const cf = (financing: boolean) => async () => {
    const r = await fetch(`${DJANGO}/api/projects/${projectId}/cash-flow/calculate/`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ includeFinancing: financing }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return ((j.data || j).summary ?? null) as Any | null;
  };
  const { data: lev } = useQuery({ queryKey: ['design-cf-lev', projectId], queryFn: cf(true) });
  const { data: unlev } = useQuery({ queryKey: ['design-cf-unlev', projectId], queryFn: cf(false) });

  if (mode !== 'view') {
    return (
      <div className="ds-page">
        <div className="ds-page-head">
          <button type="button" className="ds-ghost" onClick={() => { setMode('view'); qc.invalidateQueries(); }}>← Back to capitalization</button>
          <span className="ds-muted">{mode === 'debt' ? 'Loans — full loan form, schedules, leveraged cash flow' : 'Equity — partners, waterfall form, period distributions'}</span>
        </div>
        <div className="ds-legacy">{mode === 'debt' ? <DebtPage /> : <EquityPage />}</div>
      </div>
    );
  }

  // headline figures — same arithmetic as the live Debt screen
  const totalCommitment = loans.reduce((t, l) => t + (num(l.commitment_amount) || 0), 0);
  const outstanding = loans.reduce((t, l) => t + (num(l.loan_amount) ?? ((l.facility_structure || l.structure_type) === 'TERM' ? num(l.commitment_amount) || 0 : 0)), 0);
  const wavg = outstanding
    ? loans.reduce((t, l) => t + (num(l.loan_amount) ?? 0) * (num(l.interest_rate_pct) || 0), 0) / outstanding
    : null;
  const maturities = loans
    .filter((l) => l.loan_start_date && l.loan_term_months)
    .map((l) => ({ d: addMonths(l.loan_start_date as string, Math.max(Number(l.loan_term_months) - 1, 0)), name: l.loan_name }))
    .sort((a, b) => a.d.getTime() - b.d.getTime());

  const tiers: Any[] = (wf?.waterfallTiers || []).filter((t: Any) => t.isActive !== false);
  const partners: Any[] = wf?.equityPartners || [];
  const ps: Any | undefined = result?.projectSummary;
  const lp: Any | undefined = (result?.partnerSummaries || []).find((p: Any) => p.partnerType === 'LP');
  const gp: Any | undefined = (result?.partnerSummaries || []).find((p: Any) => p.partnerType === 'GP');
  const tierTotals: Any[] = ps?.tierTotals || [];
  const tierSum = tierTotals.reduce((t, x) => t + (num(x.amount) || 0), 0);
  const partnersTotal = partners.reduce((t, p) => t + (num(p.capitalContributed) || 0), 0);

  const peakPeriod = (s: Any | null | undefined) => {
    const c: number[] = s?.cumulativeCashFlow || [];
    if (!c.length) return null;
    let i = 0; c.forEach((v, k) => { if (v < c[i]) i = k; });
    return i + 1;
  };

  const run = async () => {
    setRunning(true);
    try {
      await fetch(`/api/projects/${projectId}/waterfall/calculate?hurdle_method=${hurdleView === 'em' ? 'EMx' : hurdleView === 'both' ? 'IRR_EMx' : 'IRR'}&_t=${Date.now()}`, { headers: getAuthHeaders() });
      await qc.invalidateQueries({ queryKey: ['design-waterfall-result', projectId] });
    } finally { setRunning(false); }
  };

  const hurdle = (t: Any) => {
    const irr = num(t.hurdleRate);
    const em = num(t.equityMultipleThreshold);
    if (hurdleView === 'irr') return irr != null ? pct(irr, 0) : '—';
    if (hurdleView === 'em') return em != null ? `${em.toFixed(2)}×` : '—';
    return [irr != null ? pct(irr, 0) : null, em != null ? `${em.toFixed(2)}×` : null].filter(Boolean).join(' · ') || '—';
  };

  return (
    <div className="ds-page ds-cap">
      <div className="ds-kpis">
        <div className="ds-kpi"><span>Total commitment</span><b>{big(totalCommitment)}</b></div>
        <div className="ds-kpi"><span>Loan amount</span><b>{big(outstanding)}</b></div>
        <div className="ds-kpi"><span>Wtd avg rate</span><b>{wavg != null ? pct(wavg, 2) : '—'}</b></div>
        <div className="ds-kpi"><span>Next maturity</span><b>{maturities[0] ? monthYear(maturities[0].d) : '—'}</b>{maturities[0] && <em>{maturities[0].name}</em>}</div>
      </div>

      <div className="ds-cap-loans">
        {loans.map((l) => <LoanTile key={l.loan_id} loan={l} />)}
        {loans.length === 0 && <section className="ds-card"><div className="ds-card-note">No loans defined.</div></section>}
        <button type="button" className="ds-ghost ds-cap-edit" onClick={() => setMode('debt')}>Add / edit loans ›</button>
      </div>

      <div className="ds-cap-row">
        <section className="ds-card">
          <header className="ds-card-head">
            <span>Waterfall structure</span>
            <div className="ds-seg ds-seg-small ds-push">
              {(['irr', 'em', 'both'] as const).map((k) => (
                <button key={k} type="button" className={hurdleView === k ? 'ds-seg-btn is-active' : 'ds-seg-btn'} onClick={() => setHurdleView(k)}>
                  {k === 'irr' ? 'IRR' : k === 'em' ? 'EM' : 'Both'}
                </button>
              ))}
            </div>
          </header>
          <table className="ds-table">
            <thead><tr><th>Tier</th><th className="num">Hurdle</th><th className="num">LP</th><th className="num">GP</th></tr></thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.tierId ?? t.tierNumber}>
                  <td>{t.tierNumber} · {t.tierName}</td>
                  <td className="num">{hurdle(t)}</td>
                  <td className="num">{num(t.lpSplitPct) ?? '—'}</td>
                  <td className="num">{num(t.gpSplitPct) ?? '—'}</td>
                </tr>
              ))}
              {tiers.length === 0 && <tr><td colSpan={4} className="ds-muted">No waterfall stored for this project.</td></tr>}
            </tbody>
          </table>
          <div className="ds-card-note">
            {tiers.find((t) => t.tierDescription)?.tierDescription ? `${tiers.map((t) => t.tierDescription).filter(Boolean).join(' · ')}. ` : ''}
            Stored per project. <button type="button" className="ds-link" onClick={() => setMode('equity')}>Edit tiers</button>
          </div>
        </section>

        <section className="ds-card">
          <header className="ds-card-head">
            <span>Waterfall results</span>
            <span className="ds-muted ds-nocaps">on levered cash flow</span>
            <button type="button" className="ds-ghost ds-push" onClick={run} disabled={running}>{running ? 'Running…' : 'Re-run'}</button>
          </header>
          <table className="ds-table">
            <thead><tr><th /><th className="num">In</th><th className="num">Out</th><th className="num">IRR</th><th className="num">EMx</th></tr></thead>
            <tbody>
              {[['LP', lp], ['GP · w/ promote', gp]].map(([label, p]) => (
                <tr key={label as string}>
                  <td>{label as string}</td>
                  <td className="num">{big(num((p as Any)?.totalContributed))}</td>
                  <td className="num">{big(num((p as Any)?.totalDistributed))}</td>
                  <td className="num"><b>{(p as Any)?.irr != null ? pct(Number((p as Any).irr) * 100) : '—'}</b></td>
                  <td className="num"><b>{(p as Any)?.equityMultiple != null ? `${Number((p as Any).equityMultiple).toFixed(2)}×` : '—'}</b></td>
                </tr>
              ))}
              <tr className="ds-group-row">
                <td>Project</td>
                <td className="num">{big(num(ps?.totalContributed))}</td>
                <td className="num">{big(num(ps?.totalDistributed))}</td>
                <td className="num">{ps?.projectIrr != null ? pct(Number(ps.projectIrr) * 100) : '—'}</td>
                <td className="num">{ps?.equityMultiple != null ? `${Number(ps.equityMultiple).toFixed(2)}×` : '—'}</td>
              </tr>
            </tbody>
          </table>
          {tierSum > 0 && (
            <div className="ds-tierbar">
              {tierTotals.map((t) => <span key={t.tierNumber} style={{ flexGrow: num(t.amount) || 0 }} title={`${t.tierName} ${big(num(t.amount))}`} />)}
            </div>
          )}
          <div className="ds-card-note">
            {tierTotals.map((t) => `Tier ${t.tierNumber} ${big(num(t.amount))}`).join(' · ') || 'Not run yet.'}
            {' '}<button type="button" className="ds-link" onClick={() => setMode('equity')}>Period table</button>
          </div>
        </section>

        <section className="ds-card">
          <header className="ds-card-head">
            <span>Equity partners</span>
            <button type="button" className="ds-ghost ds-push" onClick={() => setMode('equity')}>Add / edit</button>
          </header>
          <table className="ds-table">
            <thead><tr><th>Partner</th><th>Type</th><th className="num">Committed</th><th className="num">Own %</th></tr></thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.equityId}>
                  <td>{p.partnerName}</td>
                  <td><span className="ds-tag ds-tag-neutral">{p.partnerType}</span></td>
                  <td className="num">{big(num(p.capitalContributed))}</td>
                  <td className="num">{pct(num(p.ownershipPct), 0)}</td>
                </tr>
              ))}
              {partners.length === 0 && <tr><td colSpan={4} className="ds-muted">No partners recorded.</td></tr>}
            </tbody>
          </table>
          <div className="ds-card-note">
            Total committed {big(partnersTotal)}.
            {ps?.totalContributed != null && Math.abs(Number(ps.totalContributed) - partnersTotal) > 1e5 && (
              <> The waterfall draws {big(num(ps.totalContributed))} from the levered cash flow — the two do not agree.</>
            )}
          </div>
        </section>
      </div>

      <section className="ds-card ds-cf-strip">
        <span className="ds-cf-title">Cash flow · leveraged</span>
        <div><span>Unlevered IRR</span><b>{unlev?.irr != null ? pct(Number(unlev.irr) * 100) : '—'}</b></div>
        <div><span>Levered IRR</span><b>{lev?.irr != null ? pct(Number(lev.irr) * 100) : '—'}</b></div>
        <div><span>Peak equity</span><b>{big(num(lev?.peakEquity))}{peakPeriod(lev) ? <em> at P{peakPeriod(lev)}</em> : null}</b></div>
        <div><span>Payback</span><b>{lev?.paybackPeriod != null ? `P${lev.paybackPeriod}` : '—'}</b></div>
        <button type="button" className="ds-link ds-push" onClick={() => setMode('debt')}>Open period table ›</button>
      </section>
      <p className="ds-footnote">
        Loans size from bases other screens own — acquisition cost from the ledger, improvement cost from the budget — so a budget
        change re-sizes the loan on its next save. The full loan form opens from &ldquo;Add / edit loans&rdquo;.
      </p>
    </div>
  );
}

export default DesignCapitalization;
