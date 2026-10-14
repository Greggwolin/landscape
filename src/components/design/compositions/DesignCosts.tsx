'use client';

/**
 * C5 · Costs — Slice 1 reference composition (land).
 *
 * Area / phase filter, stage filter, container cards, the development budget as
 * one dense table (phase · stage · category · description, the phase's units /
 * acres / front-feet bases with the UOM-matched basis bold, rate, amount,
 * escalated, start, duration), then the acquisition ledger as events.
 *
 * Data and writes are the live budget's own: the same budget hook (and so the
 * same endpoints), the same item editor, and escalation computed exactly as
 * the live grid does (project cost-inflation rate, compounded from the item's
 * start period). The full live grid and the live ledger editor open in place.
 *
 * Not drawn, because the app does not hold it yet: per-line evidence tags
 * (library / engineer bid / policy) and the decision docket.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuthHeaders } from '@/lib/authHeaders';
import { useBudgetData } from '@/components/budget/hooks/useBudgetData';
import BudgetGridTab from '@/components/budget/BudgetGridTab';
import BudgetItemModalV2, { type BudgetItemFormValues } from '@/components/budget/BudgetItemModalV2';
import AcquisitionLedgerGrid from '@/components/acquisition/AcquisitionLedgerGrid';
import { useProjectInflationSettings } from '@/hooks/useInflationSettings';
import type { BudgetItem, TimingMethod } from '@/types/budget';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProject = Record<string, any>;

interface Node {
  division_id: number;
  parent_division_id: number | null;
  tier: number;
  display_name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes?: Record<string, any>;
  children?: Node[];
}
interface LedgerEvent {
  acquisition_id: number;
  event_date: string | null;
  event_type: string | null;
  category_name: string | null;
  subcategory_name?: string | null;
  description: string | null;
  amount: string | number | null;
  is_applied_to_purchase: boolean | null;
  goes_hard_date: string | null;
  is_conditional: boolean | null;
  notes: string | null;
}

const DJANGO = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
const STAGES = ['Acquisition', 'Planning & Engineering', 'Development', 'Operations', 'Disposition', 'Financing'];
const UOM_LABEL: Record<string, string> = { UNIT: '$/Unit', EA: '$/Unit', LOT: '$/Unit', AC: '$/Acre', ACRE: '$/Acre', FF: '$/FF', LF: '$/LF', LS: '$$$', SF: '$/SF' };

const num = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const x = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(x) ? x : null;
};
const money = (v: number | null) => (v == null ? '—' : v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }));
const big = (v: number) => (Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(Math.abs(v) >= 1e8 ? 0 : 2)}M` : `$${Math.round(v / 1e3).toLocaleString()}K`);
const int = (v: number | null) => (v == null ? '—' : Math.round(v).toLocaleString('en-US'));
const monthYear = (d: string | null) => {
  if (!d) return '—';
  const x = new Date(`${d.slice(0, 10)}T12:00:00`);
  return Number.isNaN(x.getTime()) ? d : x.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};
const title = (s: string | null) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : '—');

export function DesignCosts({ project }: { project: AnyProject }) {
  const projectId = Number(project.project_id);
  const { data: items, loading, updateItem, createItem, deleteItem, refetch } = useBudgetData(projectId);
  const { data: inflation } = useProjectInflationSettings(projectId);
  const costRate: number | undefined = inflation?.cost_inflation?.current_rate ?? undefined;

  const { data: tree = [] } = useQuery({
    queryKey: ['design-containers', projectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}/containers`, { headers: getAuthHeaders() });
      return r.ok ? ((await r.json()).containers as Node[]) : [];
    },
  });
  const { data: labels } = useQuery({
    queryKey: ['design-config', projectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}/config`, { headers: getAuthHeaders() });
      const c = r.ok ? await r.json() : null;
      const cfg = c?.config ?? c;
      return { l1: cfg?.level1_label || 'Area', l2: cfg?.level2_label || 'Phase' };
    },
  });
  const L = labels ?? { l1: 'Area', l2: 'Phase' };
  const { data: ledger = [], refetch: refetchLedger } = useQuery({
    queryKey: ['design-ledger', projectId],
    queryFn: async () => {
      const r = await fetch(`${DJANGO}/api/projects/${projectId}/acquisition/ledger/`, { headers: getAuthHeaders() });
      if (!r.ok) return [] as LedgerEvent[];
      const j = await r.json();
      return (Array.isArray(j) ? j : j.results || []) as LedgerEvent[];
    },
  });

  // division → { area, phase } for every node in the tree
  const { areas, phaseOf, areaOf } = useMemo(() => {
    const areaList: Array<Node & { phases: Node[] }> = [];
    const pOf = new Map<number, Node>();
    const aOf = new Map<number, Node>();
    const walk = (nd: Node, area: Node | null, phase: Node | null) => {
      const a = nd.tier === 1 ? nd : area;
      const p = nd.tier === 2 ? nd : phase;
      if (a) aOf.set(nd.division_id, a);
      if (p) pOf.set(nd.division_id, p);
      (nd.children || []).forEach((c) => walk(c, a, p));
    };
    tree.forEach((t) => {
      if (t.tier === 1) areaList.push({ ...t, phases: (t.children || []).filter((c) => c.tier === 2) });
      walk(t, null, null);
    });
    return { areas: areaList, phaseOf: pOf, areaOf: aOf };
  }, [tree]);

  const [areaF, setAreaF] = useState<number | 'all' | 'project'>('all');
  const [phaseF, setPhaseF] = useState<number | null>(null);
  const [stageF, setStageF] = useState<string>('all');
  const [mode, setMode] = useState<'view' | 'grid' | 'ledger'>('view');
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit'; item: BudgetItem | null }>({ open: false, mode: 'create', item: null });

  const escalated = (it: BudgetItem) => {
    const base = num(it.amount);
    if (base == null) return null;
    const ratePct = costRate !== undefined ? costRate * 100 : num(it.escalation_rate);
    const sp = num(it.start_period);
    if (!ratePct || !sp) return Math.round(base);
    return Math.round(base * Math.pow(1 + ratePct / 100, Math.max(0, (sp - 1) / 12)));
  };

  const rows = useMemo(() => {
    const div = (it: BudgetItem) => num(it.division_id);
    return items
      .filter((it) => {
        const d = div(it);
        if (areaF === 'project') { if (d != null) return false; }
        else if (areaF !== 'all') { if (d == null || areaOf.get(d)?.division_id !== areaF) return false; }
        if (phaseF != null && (d == null || phaseOf.get(d)?.division_id !== phaseF)) return false;
        if (stageF !== 'all' && (it.activity || '') !== stageF) return false;
        return true;
      })
      .map((it) => {
        const d = div(it);
        return { it, area: d != null ? areaOf.get(d) ?? null : null, phase: d != null ? phaseOf.get(d) ?? null : null };
      })
      .sort((a, b) =>
        (a.area?.display_name ?? '').localeCompare(b.area?.display_name ?? '', undefined, { numeric: true }) ||
        (a.phase?.display_name ?? '').localeCompare(b.phase?.display_name ?? '', undefined, { numeric: true }) ||
        STAGES.indexOf(a.it.activity || '') - STAGES.indexOf(b.it.activity || ''),
      );
  }, [items, areaF, phaseF, stageF, areaOf, phaseOf]);

  const totalAll = items.reduce((t, it) => t + (num(it.amount) || 0), 0);
  const unitsAll = areas.reduce((t, a) => t + (num(a.attributes?.units) || 0), 0);
  const stagesPresent = STAGES.filter((s) => items.some((it) => it.activity === s));
  const otherStages = Array.from(new Set(items.map((it) => it.activity).filter((s): s is NonNullable<typeof s> => !!s && !STAGES.includes(s))));
  const projectLevelCount = items.filter((it) => num(it.division_id) == null).length;
  const selArea = typeof areaF === 'number' ? areas.find((a) => a.division_id === areaF) : null;

  // grouped by area with subtotals
  const body: Array<{ kind: 'row'; r: (typeof rows)[number] } | { kind: 'sub'; label: string; amt: number; esc: number }> = [];
  let curKey: string | null = null; let amt = 0; let esc = 0; let curLabel = '';
  const flush = () => { if (curKey !== null) body.push({ kind: 'sub', label: curLabel, amt, esc }); };
  for (const r of rows) {
    const k = r.area ? String(r.area.division_id) : 'project';
    if (k !== curKey) { flush(); curKey = k; amt = 0; esc = 0; curLabel = r.area ? `${r.area.display_name} subtotal` : 'Project level subtotal'; }
    amt += num(r.it.amount) || 0; esc += escalated(r.it) || 0;
    body.push({ kind: 'row', r });
  }
  flush();

  const ledgerTotal = ledger.reduce((t, e) => t + (num(e.amount) || 0), 0);
  const appliedDeposits = ledger.filter((e) => e.is_applied_to_purchase && (e.event_type || '').toUpperCase() !== 'CLOSING').reduce((t, e) => t + (num(e.amount) || 0), 0);

  const onSave = async (values: BudgetItemFormValues) => {
    if (modal.mode === 'create') {
      await createItem({
        project_id: projectId,
        category_l1_id: values.category_l1_id ?? null,
        category_l2_id: values.category_l2_id ?? null,
        category_l3_id: values.category_l3_id ?? null,
        category_l4_id: values.category_l4_id ?? null,
        division_id: values.division_id ?? null,
        scope: values.scope ?? null,
        activity: values.activity ?? null,
        qty: values.qty, rate: values.rate, amount: values.amount,
        start_period: values.start_period ?? null, periods: values.periods ?? null,
        vendor_name: values.vendor_name ?? null, notes: values.notes, uom_code: values.uom_code,
        escalation_rate: values.escalation_rate ?? null, contingency_pct: values.contingency_pct ?? null,
        timing_method: (values.timing_method ?? null) as TimingMethod | null,
        funding_id: values.funding_id ?? null, curve_id: values.curve_id ?? null,
        milestone_id: values.milestone_id ?? null, cf_start_flag: values.cf_start_flag ?? null,
        start_date: values.start_date ?? null, end_date: values.end_date ?? null,
      });
    } else if (modal.item) {
      await updateItem(modal.item.fact_id, {
        qty: values.qty, rate: values.rate, amount: values.amount,
        start_period: values.start_period ?? null, periods_to_complete: values.periods ?? null,
        vendor_name: values.vendor_name ?? null, notes: values.notes, uom_code: values.uom_code,
        escalation_rate: values.escalation_rate ?? null, contingency_pct: values.contingency_pct ?? null,
        timing_method: (values.timing_method ?? null) as TimingMethod | null,
        funding_id: values.funding_id ?? null, curve_id: values.curve_id ?? null,
        milestone_id: values.milestone_id ?? null, cf_start_flag: values.cf_start_flag ?? null,
        start_date: values.start_date ?? null, end_date: values.end_date ?? null,
      });
    }
  };

  if (mode !== 'view') {
    return (
      <div className="ds-page">
        <div className="ds-page-head">
          <button type="button" className="ds-ghost" onClick={() => { setMode('view'); refetch(); refetchLedger(); }}>← Back to costs</button>
          <span className="ds-muted">{mode === 'grid' ? 'The full budget grid — columns, categories, timeline' : 'Acquisition ledger — add or edit events'}</span>
        </div>
        {mode === 'grid' ? <BudgetGridTab projectId={projectId} /> : <AcquisitionLedgerGrid projectId={projectId} />}
      </div>
    );
  }

  const basisClass = (uom: string | null, which: 'u' | 'a' | 'f') => {
    const u = (uom || '').toUpperCase();
    const match = which === 'u' ? ['UNIT', 'EA', 'LOT'].includes(u) : which === 'a' ? ['AC', 'ACRE'].includes(u) : ['FF', 'LF'].includes(u);
    return match ? 'num ds-basis-on' : 'num ds-basis';
  };

  return (
    <div className="ds-page ds-costs">
      <div className="ds-filterbar">
        <div className="ds-seg">
          <button type="button" className={areaF === 'all' ? 'ds-seg-btn is-active' : 'ds-seg-btn'} onClick={() => { setAreaF('all'); setPhaseF(null); }}>All</button>
          {areas.map((a) => (
            <button key={a.division_id} type="button" className={areaF === a.division_id ? 'ds-seg-btn is-active' : 'ds-seg-btn'}
              onClick={() => { setAreaF(a.division_id); setPhaseF(null); }}>
              {L.l1.slice(0, 2)} {a.display_name.replace(/^\D+/, '')}
            </button>
          ))}
        </div>
        <div className="ds-seg">
          <button type="button" className={stageF === 'all' ? 'ds-seg-btn is-active' : 'ds-seg-btn'} onClick={() => setStageF('all')}>All stages</button>
          {[...stagesPresent, ...otherStages].map((s) => (
            <button key={s} type="button" className={stageF === s ? 'ds-seg-btn is-active' : 'ds-seg-btn'} onClick={() => setStageF(s)}>
              {s === 'Planning & Engineering' ? 'Planning' : s}
            </button>
          ))}
        </div>
        <span className="ds-push ds-figure">{big(totalAll)} · {int(unitsAll)} units</span>
      </div>

      <section className="ds-card">
        <header className="ds-card-head">
          <span>Development budget</span>
          <span className="ds-muted ds-nocaps">— filter by {L.l1.toLowerCase()} / {L.l2.toLowerCase()}; every line carries {L.l2.toLowerCase()} · stage · category · description</span>
          <button type="button" className="ds-ghost ds-push" onClick={() => setMode('grid')}>Full grid</button>
          <button type="button" className="ds-apply" onClick={() => setModal({ open: true, mode: 'create', item: null })}>+ Add item</button>
        </header>

        <div className="ds-cards-row">
          <button type="button" className={`ds-cont${areaF === 'project' ? ' is-active' : ''}`} onClick={() => { setAreaF('project'); setPhaseF(null); }}>
            <b>Project level</b><span>items without {L.l1.toLowerCase()} / {L.l2.toLowerCase()} · {projectLevelCount}</span>
          </button>
          {areas.map((a) => (
            <button type="button" key={a.division_id} className={`ds-cont${areaF === a.division_id && phaseF == null ? ' is-active' : ''}`}
              onClick={() => { setAreaF(a.division_id); setPhaseF(null); }}>
              <b>{a.display_name}</b>
              <span>{int(num(a.attributes?.acres))} ac · {a.phases.length} {L.l2.toLowerCase()}s{num(a.attributes?.units) ? ` · ${int(num(a.attributes?.units))} u` : ''}</span>
            </button>
          ))}
          {selArea && <span className="ds-cont-sep">›</span>}
          {selArea?.phases.map((p) => (
            <button type="button" key={p.division_id} className={`ds-cont${phaseF === p.division_id ? ' is-active' : ''}`} onClick={() => setPhaseF(p.division_id)}>
              <b>{L.l2} {p.display_name}</b>
              <span>{int(num(p.attributes?.acres))} ac · {int(num(p.attributes?.parcel_count))} parcels</span>
            </button>
          ))}
          {(areaF !== 'all' || stageF !== 'all') && (
            <button type="button" className="ds-link" onClick={() => { setAreaF('all'); setPhaseF(null); setStageF('all'); }}>Clear filters</button>
          )}
        </div>

        <div className="ds-scroll">
          <table className="ds-table ds-selectable ds-budget">
            <thead>
              <tr>
                <th>{L.l2}</th><th>Stage</th><th>Category</th><th>Description</th>
                <th className="num">Units</th><th className="num">Acres</th><th className="num">Frt ft</th>
                <th>UOM</th><th className="num">Rate</th><th className="num">Amount</th><th className="num">Escalated</th>
                <th className="num">Start</th><th className="num">Duration</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={13} className="ds-muted">Loading budget…</td></tr>}
              {!loading && body.length === 0 && <tr><td colSpan={13} className="ds-muted">No budget lines match these filters.</td></tr>}
              {body.map((b, i) =>
                b.kind === 'sub' ? (
                  <tr key={`s${i}`} className="ds-group-row ds-subtotal">
                    <td colSpan={9}>{b.label}</td>
                    <td className="num">{big(b.amt)}</td><td className="num">{big(b.esc)}</td><td /><td />
                  </tr>
                ) : (
                  <tr key={b.r.it.fact_id} onClick={() => setModal({ open: true, mode: 'edit', item: b.r.it })}>
                    <td>{b.r.phase?.display_name ?? (b.r.area ? b.r.area.display_name : 'Project')}</td>
                    <td className="ds-wrap">{b.r.it.activity ?? '—'}</td>
                    <td>{b.r.it.category_name || b.r.it.category_l1_name || '—'}</td>
                    <td className="ds-wrap ds-editable">{b.r.it.notes || '—'}</td>
                    <td className={basisClass(b.r.it.uom_code, 'u')}>{int(num(b.r.it.phase_units))}</td>
                    <td className={basisClass(b.r.it.uom_code, 'a')}>{num(b.r.it.phase_acres)?.toFixed(1) ?? '—'}</td>
                    <td className={basisClass(b.r.it.uom_code, 'f')}>{int(num(b.r.it.phase_front_feet))}</td>
                    <td>{UOM_LABEL[(b.r.it.uom_code || '').toUpperCase()] ?? b.r.it.uom_code ?? '—'}</td>
                    <td className="num">{money(num(b.r.it.rate))}</td>
                    <td className="num">{money(num(b.r.it.amount))}</td>
                    <td className="num ds-muted">{money(escalated(b.r.it))}</td>
                    <td className="num">{num(b.r.it.start_period) != null ? `P${b.r.it.start_period}` : '—'}</td>
                    <td className="num">{b.r.it.periods_to_complete ?? '—'}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        <div className="ds-card-note">
          Bold basis = the one the unit of measure uses. Escalated = amount compounded at the project cost-inflation rate
          {costRate !== undefined ? ` (${(costRate * 100).toFixed(1)}%/yr)` : ''} from the line&apos;s start period. Click a line to edit it.
        </div>
      </section>

      <section className="ds-card">
        <header className="ds-card-head">
          <span>Acquisition ledger</span>
          <span className="ds-muted ds-nocaps">— events, not line items · {big(ledgerTotal)}</span>
          <button type="button" className="ds-ghost ds-push" onClick={() => setMode('ledger')}>Add / edit events</button>
        </header>
        <div className="ds-scroll">
          <table className="ds-table">
            <thead>
              <tr><th>Date</th><th>Action</th><th>Category</th><th>Subcategory</th><th>Description</th><th className="num">Amount</th><th>Apply</th><th>Go-hard</th><th>Cond.</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {ledger.length === 0 && <tr><td colSpan={10} className="ds-muted">No acquisition events recorded.</td></tr>}
              {ledger.map((e) => (
                <tr key={e.acquisition_id}>
                  <td>{monthYear(e.event_date)}</td>
                  <td>{title(e.event_type)}</td>
                  <td>{e.category_name ?? '—'}</td>
                  <td>{e.subcategory_name ?? '—'}</td>
                  <td className="ds-wrap">{e.description ?? '—'}</td>
                  <td className="num">{money(num(e.amount))}</td>
                  <td>{e.is_applied_to_purchase == null ? '—' : e.is_applied_to_purchase ? '✓' : '✗'}</td>
                  <td>{e.goes_hard_date ? monthYear(e.goes_hard_date) : '—'}</td>
                  <td>{e.is_conditional ? '✓' : '—'}</td>
                  <td className="ds-wrap ds-muted">{e.notes ?? ''}</td>
                </tr>
              ))}
              {ledger.length > 0 && (
                <tr className="ds-group-row ds-subtotal">
                  <td colSpan={5}>Acquisition total{appliedDeposits ? ` · ${big(appliedDeposits)} applied to purchase at close` : ''}</td>
                  <td className="num">{big(ledgerTotal)}</td><td colSpan={4} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal.open && (
        <BudgetItemModalV2
          open={modal.open}
          mode={modal.mode}
          initialItem={modal.item}
          projectId={projectId}
          activeBudgetMode="detail"
          onClose={() => setModal({ open: false, mode: 'create', item: null })}
          onSave={async (v) => { await onSave(v); setModal({ open: false, mode: 'create', item: null }); }}
          onDelete={modal.mode === 'edit' && modal.item ? async () => { await deleteItem(modal.item!.fact_id); setModal({ open: false, mode: 'create', item: null }); } : undefined}
        />
      )}
    </div>
  );
}

export default DesignCosts;
