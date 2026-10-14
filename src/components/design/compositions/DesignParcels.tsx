'use client';

/**
 * C2 · Property · Parcels — Slice 1 reference composition (land).
 *
 * Map and parcel table as peers, with the reference's attribute-entry panel:
 * select parcels in the table (click; shift/⌘ to add), then set family → type →
 * product (the project's own land-use library) and, optionally, a density whose
 * yield is shown before it is applied. "Apply" writes through the same parcel
 * endpoint the live Parcels screen uses; "Undo" puts the previous values back.
 *
 * What the reference draws that the app cannot do yet, and is therefore not
 * drawn here: painting or drawing parcels on the plan (no parcel shapes are
 * stored for most projects), and per-row evidence tags (stated / derived).
 * The live Planning screen (structure, labels, add/delete) opens in place from
 * "Structure & settings", so nothing it does is lost.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getAuthHeaders } from '@/lib/authHeaders';
import ProjectTabMap from '@/components/map/ProjectTabMap';
import PlanningContent from '@/app/components/Planning/PlanningContent';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProject = Record<string, any>;

interface Parcel {
  parcel_id: number;
  area_no: number | null;
  phase_name: string | null;
  parcel_name: string | null;
  family_name: string | null;
  type_code: string | null;
  product: string | null;
  acres: number | string | null;
  units: number | string | null;
  frontfeet: number | string | null;
}
interface LuType { type_id: number; type_name: string; type_code: string; product_selections?: Array<{ code?: string; product_code?: string; name?: string }> }
interface LuFamily { family_id: number; family_name: string; family_code: string; types: LuType[] }
interface Labels { l1: string; l2: string; l3: string }

const DJANGO = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
const n = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const x = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(x) ? x : null;
};
const fmt = (v: number | null, d = 0) => (v == null ? '' : v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }));

const landUseClass = (p: { family_name: string | null; type_code: string | null }): string => {
  const f = (p.family_name || '').toLowerCase();
  const t = (p.type_code || '').toUpperCase();
  if (!f && !t) return 'none';
  if (f.includes('open') || t === 'OS') return 'open';
  if (f.includes('mixed') || t === 'MX' || f.includes('commercial') || f.includes('retail')) return 'comm';
  if (t === 'MF' || t === 'APTS' || t === 'SFA' || t === 'TH' || t === 'BTR') return 'att';
  if (f.includes('resid')) return 'sfd';
  return 'other';
};

export function DesignParcels({ project }: { project: AnyProject }) {
  const projectId = Number(project.project_id);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [families, setFamilies] = useState<LuFamily[]>([]);
  const [labels, setLabels] = useState<Labels>({ l1: 'Area', l2: 'Phase', l3: 'Parcel' });
  const [grouped, setGrouped] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [lastClicked, setLastClicked] = useState<number | null>(null);
  const [settings, setSettings] = useState(false);
  const [view, setView] = useState<'plan' | 'map'>('plan');
  const [fam, setFam] = useState('');
  const [typ, setTyp] = useState('');
  const [prod, setProd] = useState('');
  const [density, setDensity] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [undo, setUndo] = useState<Array<{ id: number; body: Record<string, unknown> }> | null>(null);

  const loadParcels = useCallback(() => {
    fetch(`/api/parcels?project_id=${projectId}`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((p) => setParcels(Array.isArray(p) ? p : p?.data || []))
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    loadParcels();
    fetch(`${DJANGO}/api/landuse/project-land-use/by_project/${projectId}/`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setFamilies(d?.families || []))
      .catch(() => {});
    fetch(`/api/projects/${projectId}/config`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const c = d?.config;
        if (c) setLabels({ l1: c.level1_label || 'Area', l2: c.level2_label || 'Phase', l3: c.level3_label || 'Parcel' });
      })
      .catch(() => {});
  }, [projectId, loadParcels]);

  const sorted = useMemo(
    () =>
      parcels.slice().sort((a, b) =>
        (a.area_no ?? 0) - (b.area_no ?? 0) ||
        String(a.phase_name).localeCompare(String(b.phase_name), undefined, { numeric: true }) ||
        String(a.parcel_name).localeCompare(String(b.parcel_name), undefined, { numeric: true })),
    [parcels],
  );
  const sel = sorted.filter((p) => selected.includes(p.parcel_id));
  const selAcres = sel.reduce((t, p) => t + (n(p.acres) || 0), 0);
  const totals = {
    attributed: parcels.filter((p) => p.type_code).length,
    units: parcels.reduce((t, p) => t + (n(p.units) || 0), 0),
    acres: parcels.reduce((t, p) => t + (n(p.acres) || 0), 0),
  };

  // Seed the panel from the selection when everything selected agrees.
  useEffect(() => {
    const same = <K extends keyof Parcel>(k: K) => (sel.length && sel.every((p) => p[k] === sel[0][k]) ? String(sel[0][k] ?? '') : '');
    setFam(same('family_name'));
    setTyp(same('type_code'));
    setProd(same('product'));
    setDensity('');
    setMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.join(',')]);

  const famObj = families.find((f) => f.family_name === fam);
  const typeOptions = famObj?.types ?? [];
  const typeObj = typeOptions.find((t) => t.type_code === typ);
  const productOptions = (typeObj?.product_selections ?? [])
    .map((p) => p.product_code || p.code || p.name || '')
    .filter(Boolean);
  // A parcel can carry a product the project's library no longer lists — keep it visible, flagged, rather than blanking it.
  const offLibrary = prod && productOptions.length && !productOptions.includes(prod) ? prod : null;
  const dens = n(density);
  const yieldLots = dens != null ? sel.reduce((t, p) => t + Math.round((n(p.acres) || 0) * dens), 0) : null;

  const clickRow = (id: number, e: React.MouseEvent) => {
    if (e.shiftKey && lastClicked != null) {
      const ids = sorted.map((p) => p.parcel_id);
      const [a, b] = [ids.indexOf(lastClicked), ids.indexOf(id)].sort((x, y) => x - y);
      setSelected(Array.from(new Set([...selected, ...ids.slice(a, b + 1)])));
    } else if (e.metaKey || e.ctrlKey) {
      setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    } else {
      setSelected(selected.length === 1 && selected[0] === id ? [] : [id]);
    }
    setLastClicked(id);
  };

  const patch = (id: number, body: Record<string, unknown>) =>
    fetch(`/api/parcels/${id}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
    });

  const apply = async () => {
    if (!sel.length || !fam || !typ) return;
    setBusy(true);
    setMsg(null);
    const before = sel.map((p) => ({
      id: p.parcel_id,
      body: { family_name: p.family_name, type_code: p.type_code, product: p.product, units: n(p.units) },
    }));
    try {
      for (const p of sel) {
        const body: Record<string, unknown> = { family_name: fam, type_code: typ, product: prod || null };
        if (dens != null) body.units = Math.round((n(p.acres) || 0) * dens);
        await patch(p.parcel_id, body);
      }
      setUndo(before);
      setMsg(`Applied ${[typ, prod].filter(Boolean).join(' ')} to ${sel.length} parcel${sel.length === 1 ? '' : 's'} · just now`);
    } catch {
      setMsg('Not all parcels saved — the table below shows what was stored.');
    } finally {
      setBusy(false);
      loadParcels();
    }
  };

  const doUndo = async () => {
    if (!undo) return;
    setBusy(true);
    try {
      for (const u of undo) await patch(u.id, u.body);
      setMsg('Undone.');
      setUndo(null);
    } catch {
      setMsg('Undo did not complete — check the table.');
    } finally {
      setBusy(false);
      loadParcels();
    }
  };

  if (settings) {
    return (
      <div className="ds-page">
        <div className="ds-page-head">
          <button type="button" className="ds-ghost" onClick={() => { setSettings(false); loadParcels(); }}>← Back to parcels</button>
          <span className="ds-muted">Structure, labels and parcel rows — the full Planning screen</span>
        </div>
        <PlanningContent projectId={projectId} />
      </div>
    );
  }

  const rows: Array<{ kind: 'group'; key: string; label: string; ac: number; units: number } | { kind: 'row'; p: Parcel }> = [];
  if (grouped) {
    let key = '';
    for (const p of sorted) {
      const k = `${p.area_no}|${p.phase_name}`;
      if (k !== key) {
        key = k;
        const inPhase = sorted.filter((q) => `${q.area_no}|${q.phase_name}` === k);
        rows.push({
          kind: 'group', key: k,
          label: `${labels.l1} ${p.area_no ?? '—'} · ${labels.l2} ${p.phase_name ?? '—'}`,
          ac: inPhase.reduce((t, q) => t + (n(q.acres) || 0), 0),
          units: inPhase.reduce((t, q) => t + (n(q.units) || 0), 0),
        });
      }
      rows.push({ kind: 'row', p });
    }
  } else sorted.forEach((p) => rows.push({ kind: 'row', p }));

  const phaseBlocks: Array<{ key: string; label: string; ac: number; parcels: Parcel[] }> = [];
  for (const p of sorted) {
    const k = `${p.area_no}|${p.phase_name}`;
    let b = phaseBlocks.find((x) => x.key === k);
    if (!b) { b = { key: k, label: `${labels.l2} ${p.phase_name ?? '—'}`, ac: 0, parcels: [] }; phaseBlocks.push(b); }
    b.parcels.push(p);
    b.ac += n(p.acres) || 0;
  }

  return (
    <div className="ds-page ds-parcels">
      <div className="ds-parcels-top">
        <section className="ds-card ds-map-card">
          <header className="ds-card-head">
            <div className="ds-seg ds-seg-small">
              <button type="button" className={view === 'plan' ? 'ds-seg-btn is-active' : 'ds-seg-btn'} onClick={() => setView('plan')}>Plan</button>
              <button type="button" className={view === 'map' ? 'ds-seg-btn is-active' : 'ds-seg-btn'} onClick={() => setView('map')}>Map</button>
            </div>
            <span className="ds-tag ds-tag-neutral">Select: {labels.l3}</span>
            <span className="ds-muted ds-nocaps ds-push">
              {view === 'plan' ? 'Schematic — tiles sized by acres, until a plan exhibit is read' : 'Site location'}
            </span>
          </header>
          <div className="ds-parcels-map">
            {view === 'map' ? (
              <ProjectTabMap projectId={String(projectId)} styleUrl="google-hybrid" tabId="design-parcels" />
            ) : (
              <div className="ds-plan">
                {phaseBlocks.map((b) => (
                  <div key={b.key} className="ds-plan-phase" style={{ flexGrow: Math.max(b.ac, 1) }}>
                    <div className="ds-plan-phase-label">{b.label}</div>
                    <div className="ds-plan-tiles">
                      {b.parcels.map((p) => (
                        <button
                          type="button"
                          key={p.parcel_id}
                          className={`ds-plan-tile ds-use-${landUseClass(p)}${selected.includes(p.parcel_id) ? ' is-selected' : ''}`}
                          style={{ flexGrow: Math.max(n(p.acres) || 1, 1) }}
                          onClick={(e) => clickRow(p.parcel_id, e)}
                          title={`${p.parcel_name ?? ''} · ${p.product ?? p.type_code ?? 'unattributed'} · ${fmt(n(p.acres), 1)} ac`}
                        >
                          <span className="ds-plan-id">{p.parcel_name}</span>
                          <span className="ds-plan-sub">{[p.type_code, p.product].filter(Boolean).join(' ')}{n(p.units) ? ` · ${fmt(n(p.units))}` : ''}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="ds-card ds-attr">
          <header className="ds-card-head"><span>Attribute entry</span></header>
          {sel.length === 0 ? (
            <div className="ds-card-note">Select parcels in the table — click, shift-click for a run, ⌘-click to add one.</div>
          ) : (
            <div className="ds-attr-body">
              <div className="ds-attr-title">
                {sel.length} {sel.length === 1 ? labels.l3.toLowerCase() : `${labels.l3.toLowerCase()}s`} selected · {fmt(selAcres, 1)} ac
              </div>
              <div className="ds-attr-sub">{sel.slice(0, 6).map((p) => p.parcel_name).join(' · ')}{sel.length > 6 ? ` +${sel.length - 6}` : ''}{sel.length > 1 ? ` — one form fills all ${sel.length}` : ''}</div>

              <label className="ds-field">
                <span>Family</span>
                <select value={fam} onChange={(e) => { setFam(e.target.value); setTyp(''); setProd(''); }}>
                  <option value="">—</option>
                  {families.map((f) => <option key={f.family_id} value={f.family_name}>{f.family_name}</option>)}
                </select>
              </label>
              <label className="ds-field">
                <span>Type</span>
                <select value={typ} onChange={(e) => { setTyp(e.target.value); setProd(''); }} disabled={!fam}>
                  <option value="">—</option>
                  {typeOptions.map((t) => <option key={t.type_id} value={t.type_code}>{t.type_name}</option>)}
                </select>
              </label>
              <label className="ds-field">
                <span>Product</span>
                {productOptions.length ? (
                  <select value={prod} onChange={(e) => setProd(e.target.value)} disabled={!typ}>
                    <option value="">—</option>
                    {offLibrary && <option value={offLibrary}>{offLibrary} (current · not in project library)</option>}
                    {productOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <input value={prod} onChange={(e) => setProd(e.target.value)} placeholder="e.g. 50x125" disabled={!typ} />
                )}
              </label>
              <div className="ds-field-pair">
                <label className="ds-field">
                  <span>Density (du/ac)</span>
                  <input value={density} onChange={(e) => setDensity(e.target.value)} placeholder="leave blank to keep units" inputMode="decimal" />
                </label>
                <div className="ds-field">
                  <span>Yield (calc)</span>
                  <div className="ds-calc">{yieldLots != null ? `${fmt(yieldLots)} lots` : '—'}</div>
                </div>
              </div>
              <button type="button" className="ds-apply" disabled={busy || !fam || !typ} onClick={apply}>
                {busy ? 'Saving…' : `Apply to ${sel.length} ${sel.length === 1 ? labels.l3.toLowerCase() : `${labels.l3.toLowerCase()}s`}`}
              </button>
            </div>
          )}
          {msg && (
            <div className="ds-attr-msg">
              {msg}
              {undo && <button type="button" className="ds-link" onClick={doUndo} disabled={busy}>Undo</button>}
            </div>
          )}
        </section>
      </div>

      <section className="ds-card ds-scroll">
        <header className="ds-card-head">
          <span>{labels.l3} table</span>
          <div className="ds-seg ds-seg-small">
            <button type="button" className={grouped ? 'ds-seg-btn is-active' : 'ds-seg-btn'} onClick={() => setGrouped(true)}>Grouped</button>
            <button type="button" className={!grouped ? 'ds-seg-btn is-active' : 'ds-seg-btn'} onClick={() => setGrouped(false)}>Flat</button>
          </div>
          <span className="ds-muted ds-nocaps">
            {totals.attributed} of {parcels.length} {labels.l3.toLowerCase()}s attributed · {fmt(totals.units)} lots · {fmt(totals.acres, 2)} ac
          </span>
          <span className="ds-tag ds-push">Structure: {labels.l1} → {labels.l2} → {labels.l3}</span>
          <button type="button" className="ds-ghost" onClick={() => setSettings(true)}>Structure &amp; settings</button>
        </header>
        <table className="ds-table ds-selectable">
          <thead>
            <tr>
              <th>{labels.l1}</th><th>{labels.l2}</th><th>{labels.l3}</th><th>Use family</th><th>Use type</th><th>Product</th>
              <th className="num">Acres</th><th className="num">Units</th><th className="num">DUA</th><th className="num">FF/acre</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) =>
              r.kind === 'group' ? (
                <tr key={`g${r.key}`} className="ds-group-row">
                  <td colSpan={6}>{r.label}</td>
                  <td className="num">{fmt(r.ac, 1)}</td><td className="num">{fmt(r.units)}</td><td /><td />
                </tr>
              ) : (
                <tr
                  key={r.p.parcel_id}
                  className={selected.includes(r.p.parcel_id) ? 'is-selected' : undefined}
                  onClick={(e) => clickRow(r.p.parcel_id, e)}
                >
                  <td>{r.p.area_no ?? ''}</td>
                  <td>{r.p.phase_name ?? ''}</td>
                  <td>{r.p.parcel_name ?? ''}</td>
                  <td>{r.p.family_name ?? ''}</td>
                  <td>{r.p.type_code ?? ''}</td>
                  <td>{r.p.product ?? ''}</td>
                  <td className="num">{fmt(n(r.p.acres), 1)}</td>
                  <td className="num">{fmt(n(r.p.units))}</td>
                  <td className="num">{n(r.p.units) && n(r.p.acres) ? fmt((n(r.p.units) as number) / (n(r.p.acres) as number), 1) : ''}</td>
                  <td className="num">{n(r.p.frontfeet) && n(r.p.acres) ? fmt((n(r.p.frontfeet) as number) / (n(r.p.acres) as number)) : ''}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default DesignParcels;
