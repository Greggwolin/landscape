'use client';

/**
 * Leveraged cash flow for the Debt screen (Gregg, 2026-10-02): the project's
 * cash flow from the app's own engine, run with financing on, laid out as
 * net revenue → each cost stage → net cash flow before debt → each loan's
 * proceeds and its debt service / repayment → levered net cash flow.
 *
 * Every figure is the engine's. The loan rows split each loan's single
 * financing line into its inflows (proceeds) and outflows (interest the
 * project pays, principal, payoff) — the two rows always add back to the
 * engine's line, so nothing is recomputed here.
 */
import React, { useMemo, useState } from 'react';
import { useLeveragedCashFlow } from '@/hooks/useCapitalization';
import styles from './DebtScreen.module.css';

type Scale = 'month' | 'quarter' | 'year';

interface EnginePeriodValue { periodIndex: number; amount: number }
interface EngineLine { lineId: string; description: string; periods: EnginePeriodValue[]; total: number }
interface EngineSection { sectionId: string; sectionName: string; lineItems: EngineLine[]; sortOrder?: number }
interface EnginePeriod { periodIndex: number; startDate: string }
interface EngineSummary { irr?: number; peakEquity?: number; equityMultiple?: number; netCashFlow?: number }
interface EngineResponse { data?: { sections?: EngineSection[]; periods?: EnginePeriod[]; summary?: EngineSummary } }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function money(v: number): string {
  if (Math.abs(v) < 0.5) return '—';
  const s = Math.round(Math.abs(v)).toLocaleString('en-US');
  return v < 0 ? `(${s})` : s;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s|&)\S/g, (m) => m.toUpperCase());
}

function bucketKey(start: string, scale: Scale): { key: string; label: string } {
  const y = start.slice(0, 4);
  const m = Number(start.slice(5, 7));
  if (scale === 'year') return { key: y, label: y };
  if (scale === 'quarter') {
    const q = Math.floor((m - 1) / 3) + 1;
    return { key: `${y}-Q${q}`, label: `Q${q} ${y}` };
  }
  return { key: start.slice(0, 7), label: `${MONTHS[m - 1]}-${y.slice(2)}` };
}

interface Row { label: string; values: number[]; kind?: 'sub' | 'total' | 'grand' | 'muted' }

export default function LoanLeveredCashFlow({ projectId }: { projectId: string }) {
  const [scale, setScale] = useState<Scale>('year');
  const { data, isLoading, error } = useLeveragedCashFlow(projectId);
  const res = data as EngineResponse | undefined;

  const view = useMemo(() => {
    const sections = res?.data?.sections ?? [];
    const periods = res?.data?.periods ?? [];
    if (!sections.length || !periods.length) return null;

    // Buckets in calendar order; each engine period maps to one bucket.
    const buckets: Array<{ key: string; label: string }> = [];
    const bucketOf = new Map<number, number>();
    for (const p of periods) {
      const b = bucketKey(p.startDate, scale);
      let i = buckets.findIndex((x) => x.key === b.key);
      if (i < 0) { buckets.push(b); i = buckets.length - 1; }
      bucketOf.set(p.periodIndex, i);
    }
    const n = buckets.length;
    const zero = () => new Array<number>(n).fill(0);
    const add = (into: number[], line: EngineLine, sign: 'all' | 'pos' | 'neg' = 'all') => {
      for (const pv of line.periods) {
        const i = bucketOf.get(pv.periodIndex);
        if (i === undefined) continue;
        if (sign === 'pos' && pv.amount <= 0) continue;
        if (sign === 'neg' && pv.amount >= 0) continue;
        into[i] += pv.amount;
      }
    };
    const sumSection = (s: EngineSection) => {
      const v = zero();
      for (const li of s.lineItems) add(v, li);
      return v;
    };
    const plus = (a: number[], b: number[]) => a.map((x, i) => x + b[i]);

    const rows: Row[] = [];
    const netRevenue = sections.find((s) => s.sectionId === 'revenue-net');
    let beforeDebt = zero();
    if (netRevenue) {
      const v = sumSection(netRevenue);
      rows.push({ label: 'Net revenue', values: v });
      beforeDebt = plus(beforeDebt, v);
    }
    const costSections = sections
      .filter((s) => s.sectionId.startsWith('cost-'))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    for (const s of costSections) {
      const v = sumSection(s);
      rows.push({ label: titleCase(s.sectionName), values: v });
      beforeDebt = plus(beforeDebt, v);
    }
    rows.push({ label: 'Net cash flow before debt', values: beforeDebt, kind: 'total' });

    let levered = beforeDebt.slice();
    const financing = sections.find((s) => s.sectionId === 'financing');
    for (const li of financing?.lineItems ?? []) {
      const inflow = zero();
      const outflow = zero();
      add(inflow, li, 'pos');
      add(outflow, li, 'neg');
      rows.push({ label: `${li.description} · proceeds`, values: inflow, kind: 'sub' });
      rows.push({ label: `${li.description} · debt service & payoff`, values: outflow, kind: 'sub' });
      levered = plus(levered, plus(inflow, outflow));
    }
    if (!financing?.lineItems?.length) {
      rows.push({ label: 'No loan in the cash flow — the figures below are unlevered', values: zero(), kind: 'muted' });
    }
    rows.push({ label: 'Levered net cash flow', values: levered, kind: 'grand' });
    const cumulative: number[] = [];
    levered.reduce((acc, x, i) => { cumulative[i] = acc + x; return acc + x; }, 0);
    rows.push({ label: 'Cumulative', values: cumulative, kind: 'muted' });

    return { buckets, rows, summary: res?.data?.summary };
  }, [res, scale]);

  return (
    <>
      <div className={styles.bar}>
        <span className={styles.barLabel}>Leveraged cash flow</span>
        {(['month', 'quarter', 'year'] as Scale[]).map((s) => (
          <button key={s} type="button"
            className={`${styles.badge} ${scale === s ? styles.badgeOn : ''}`}
            onClick={() => setScale(s)}>
            by {s}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className={styles.hint}>Running the cash flow…</div>
      ) : error || !view ? (
        <div className={styles.hint}>The cash flow could not be run for this project.</div>
      ) : (
        <>
          {view.summary && (
            <div className={styles.hint}>
              Levered IRR {view.summary.irr != null ? `${(view.summary.irr * 100).toFixed(1)} %` : '—'}
              {' · '}peak equity {view.summary.peakEquity != null ? money(view.summary.peakEquity) : '—'}
              {' · '}equity multiple {view.summary.equityMultiple != null ? `${view.summary.equityMultiple.toFixed(2)}x` : '—'}
            </div>
          )}
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${styles.lcfTable}`}>
              <thead>
                <tr>
                  <th className={styles.lcfStub}></th>
                  {view.buckets.map((b) => <th key={b.key} className={styles.num}>{b.label}</th>)}
                  <th className={styles.num}>Total</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map((r) => {
                  const total = r.kind === 'muted' && r.label === 'Cumulative'
                    ? null : r.values.reduce((a, x) => a + x, 0);
                  const cls = r.kind === 'total' ? styles.lcfTotal
                    : r.kind === 'grand' ? styles.lcfGrand
                      : r.kind === 'sub' ? styles.lcfSub
                        : r.kind === 'muted' ? styles.muted : undefined;
                  return (
                    <tr key={r.label} className={cls}>
                      <td className={styles.lcfStub}>{r.label}</td>
                      {r.values.map((v, i) => <td key={i} className={styles.num}>{money(v)}</td>)}
                      <td className={styles.num}>{total === null ? '' : money(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
