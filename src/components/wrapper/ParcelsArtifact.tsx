'use client';

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import styles from './ScheduleArtifact.module.css';
import type { BlockDocument } from '@/types/artifact';
import { useArtifactWidthRequest, widthForColumns } from './artifactWidthRequest';
// Generic despite the name: it takes a schema, a row id and a cell key, and
// resolves them through `cell_source_refs`. Nothing in it knows about budgets.
// Renaming it is a follow-up, not something to fork a copy over.
import { budgetCellTarget } from './budgetCellTarget';
import { useStagedEdits, stagedKey, type CommitEditsFn } from './useStagedEdits';

/**
 * ParcelsArtifact — one topic plus one view specification.
 *
 * Built from `_cowork/PARCELS-SPEC-2026-08-25.html` rev 2. Replaces an earlier
 * version of this file that mounted the existing parcels screen inside an
 * artifact frame; Gregg saw that running and said what it was — *"this is just
 * the existing modal, poorly formatted, within an artifact."* The instruction
 * had been *"just as we did with the budget interface"*, meaning the budget's
 * FORMAT. This is that.
 *
 * WHY THIS IS A SIBLING OF ScheduleArtifact AND NOT A PAYLOAD FOR IT
 * ------------------------------------------------------------------
 * ScheduleArtifact's own header says the specification generalizes and that
 * other topics should inherit it, which is right and is where this ends up. It
 * cannot happen today: that component totals `cells.amount`, formats it as
 * money, and divides by a lot count. A parcel has no amount — its measures are
 * acres, units and a count of parcels. Teaching a merged, edited-daily budget
 * surface about a second measure, on the strength of a shape nobody has used
 * yet, is how a working surface gets broken to serve a speculative one.
 *
 * So this borrows the STYLES — the same module, so there is one visual language
 * and not two — and keeps its own arithmetic. When the parcels shape has been
 * used in anger, the two converge into one component with a configurable
 * measure, and this file goes away. That is a deliberate deferral, written down
 * so the duplication is not mistaken for someone not noticing.
 *
 * WHAT IS EDITABLE, AND WHAT IS NOT YET
 * -------------------------------------
 * Typeable now: acres, units, lot width, front feet, sale period. Staged as you
 * type and committed as one set, through the same path the budget uses.
 *
 * NOT yet, and each for its own reason rather than for want of time:
 *   the use family / type / product pickers — each narrows the next, and a
 *     dependent picker is new machinery, not another column;
 *   village and phase — changing those MOVES a parcel between containers, which
 *     is a different operation and has to read as one;
 *   the parcel number — derived from where the parcel sits whenever it sits
 *     somewhere, so it is only typeable on a project with no levels at all;
 *   units per acre — computed, and never writable anywhere.
 *
 * Which cells offer an edit is decided by the SERVER's refs, never by a list in
 * this file. A local list drifts away from what the server will accept and
 * offers edits that bounce.
 */

/* ─── The specification, as the server sends it ────────────────────────── */

export interface ParcelsLevelMember { id: number; label: string; parent_id: number | null }
export interface ParcelsLevel { level: number; label: string; members: ParcelsLevelMember[] }
export interface ParcelsColumn {
  key: string;
  label: string | null;
  align?: 'left' | 'right' | 'center';
  kind?: string;
  /* Choices ride on the column, the way the budget's do — the server reads the
   * table that constrains the value, so the renderer never invents a list.
   * `parent` is the PARENT'S STORED VALUE, not an id: a parcel holds its type
   * as a code and its family as a name, and narrowing compares against those. */
  options?: Array<{ value: string | number; label: string; parent?: string | null }>;
}
export interface ParcelsRow {
  id: string;
  parcel_id?: number | null;
  scope: Record<string, number>;
  cells: Record<string, string | number | null>;
}
export interface ParcelsViewConfig {
  topic: string;
  kicker: string;
  title: string;
  source_label: string;
  binding: { state: string; label: string };
  levels: ParcelsLevel[];
  columns: ParcelsColumn[];
  rung_columns: Record<string, string[]>;
  grouped_rung: string;
  default_rung: string;
  default_grouping: string;
  group_options: Array<{ value: string; label: string; available?: boolean }>;
  optional_columns: Array<{ key: string; label: string | null; available: boolean; reason: string | null }>;
  rows: ParcelsRow[];
  measures: string[];
  totals: { acres: number; units: number; parcels: number };
  row_count: number;
  truncate_at: number;
  generated_at: string;
  project_id: number;
}

interface Props {
  config: ParcelsViewConfig;
  onClose?: () => void;
  /**
   * The artifact's BLOCK SCHEMA — where the per-cell source refs live, and what
   * the server resolves a write against. The view specification carries no refs
   * of its own, deliberately: if the client could name the table and row, the
   * allowlist would be on the wrong side of the wire.
   *
   * Absent → every cell renders read-only. That is the correct behaviour for an
   * artifact stored before editing existed, rather than offering an edit that
   * cannot land.
   */
  schema?: BlockDocument | null;
  /** Clears staging when the panel switches artifacts. */
  artifactId?: number;
  /** Batch commit. Without it nothing is editable — staging has nowhere to go. */
  onCommitFieldEdits?: CommitEditsFn;
}

const RUNGS = ['summary', 'standard', 'detail', 'all'] as const;

/* ─── Formatting — the universal tabular standard ──────────────────────── */

/** Thousands separators, parentheses for negatives, em dash for zero or
 *  absent, no currency symbol. Identical to every other schedule surface. */
function fmt(value: unknown, decimals = 0): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (n === 0) return '—';
  const body = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
  return n < 0 ? `(${body})` : body;
}

function fmtPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}

/** A cell, formatted for its column. Density carries two decimals because at
 *  one decimal three of Peoria's four villages read the same. */
function cellText(key: string, value: string | number | null): string {
  if (key === 'dua') return fmt(value, 2);
  if (key === 'acres' || key === 'units' || key === 'front_feet') return fmt(value);
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

/* ─── Component ────────────────────────────────────────────────────────── */

export function ParcelsArtifact({
  config, onClose, schema, artifactId, onCommitFieldEdits,
}: Props) {
  const [rung, setRung] = useState<string>(config.default_rung || 'summary');
  const [grouping, setGrouping] = useState<string>(config.default_grouping || 'use');
  const [level1, setLevel1] = useState<number[]>([]);
  const [level2, setLevel2] = useState<number[]>([]);
  const [families, setFamilies] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  /* Staged edits — typed, held, then committed as one set. The same hook and
   * the same commit path the budget uses, so there is one write path and one
   * impact banner rather than a parcels-specific copy of either. */
  const edits = useStagedEdits(onCommitFieldEdits, artifactId);

  const levelOne = config.levels.find((l) => l.level === 1);
  const levelTwo = config.levels.find((l) => l.level === 2);

  /* The use chips are not a level — they come from what the parcels actually
   * are, in the order they first appear, so a project with no commercial land
   * never shows a Commercial chip that filters to nothing. */
  const familyChips = useMemo(() => {
    const seen: string[] = [];
    for (const row of config.rows) {
      const f = row.cells.family;
      if (typeof f === 'string' && f && !seen.includes(f)) seen.push(f);
    }
    return seen;
  }, [config.rows]);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  /* A phase chip is only meaningful under its village. Picking villages narrows
   * which phases can be picked, and any phase already picked outside that set is
   * dropped — otherwise the table filters by something the chips no longer show,
   * which reads as the filter being broken. */
  const phasesInScope = useMemo(() => {
    if (!levelTwo) return [];
    if (level1.length === 0) return levelTwo.members;
    return levelTwo.members.filter((m) => m.parent_id !== null && level1.includes(m.parent_id));
  }, [levelTwo, level1]);

  const activeLevel2 = useMemo(
    () => level2.filter((id) => phasesInScope.some((m) => m.id === id)),
    [level2, phasesInScope],
  );

  const rows = useMemo(() => config.rows.filter((row) => {
    if (level1.length && !level1.includes(row.scope['1'])) return false;
    if (activeLevel2.length && !activeLevel2.includes(row.scope['2'])) return false;
    if (families.length && !families.includes(String(row.cells.family))) return false;
    return true;
  }), [config.rows, level1, activeLevel2, families]);

  /* The four figures across the top follow the filter, as the budget's do. */
  const kpis = useMemo(() => {
    const acres = rows.reduce((s, r) => s + (Number(r.cells.acres) || 0), 0);
    const units = rows.reduce((s, r) => s + (Number(r.cells.units) || 0), 0);
    // Frontage joins the figures across the top because it is what revenue and
    // cost allocation are actually struck against (Gregg, 2026-08-25). Null
    // rather than zero when nothing on screen has a stated frontage.
    const withFeet = rows.filter((r) => r.cells.front_feet !== null
      && r.cells.front_feet !== undefined);
    const frontFeet = withFeet.length
      ? withFeet.reduce((s, r) => s + (Number(r.cells.front_feet) || 0), 0)
      : null;
    return [
      { label: 'Total acres', value: fmt(acres) },
      { label: config.title, value: fmt(rows.length) },
      { label: 'Units', value: fmt(units) },
      { label: 'Front feet', value: fmt(frontFeet) },
      { label: 'Units / acre', value: acres ? fmt(units / acres, 2) : '—' },
    ];
  }, [rows, config.title]);

  /* The choices for a picklist cell, narrowed by what the row already holds.
   *
   * Type narrows by the row's family and product by the row's type, which is
   * how the classic screen behaves and how the budget's own picker behaves.
   *
   * NEVER STRAND A ROW. Where the row's current value matches no option —
   * project 9 has parcels whose family reads "Open Space", which the taxonomy
   * does not carry — narrowing would leave an empty dropdown, and an empty
   * dropdown is indistinguishable from a broken one. In that case the full
   * list is offered instead: a convenience that removes every choice is worse
   * than no convenience. */
  const optionsFor = React.useCallback(
    (column: ParcelsColumn, row: ParcelsRow): Array<{ value: string; label: string }> | null => {
      const all = column.options;
      if (!all?.length) return null;
      const parentKey = column.key === 'type' ? 'family'
        : column.key === 'product' ? 'type' : null;
      if (!parentKey) return all.map((o) => ({ value: String(o.value), label: o.label }));

      const parentValue = row.cells[parentKey];
      if (parentValue === null || parentValue === undefined || parentValue === '') {
        return all.map((o) => ({ value: String(o.value), label: o.label }));
      }
      const narrowed = all.filter((o) => String(o.parent ?? '') === String(parentValue));
      const usable = narrowed.length ? narrowed : all;
      // One product can sit under several types, so the same code can appear
      // twice once the parent filter is off. Show it once.
      const seen = new Set<string>();
      return usable
        .filter((o) => (seen.has(String(o.value)) ? false : seen.add(String(o.value))))
        .map((o) => ({ value: String(o.value), label: o.label }));
    },
    [],
  );

  /* Which bucket a parcel falls in. A useCallback rather than a plain function
   * so the grouping below depends on it honestly — it changes with `grouping`
   * and nothing else, and saying so is cheaper than a suppressed warning. */
  const groupKeyOf = React.useCallback((row: ParcelsRow): string => {
    if (grouping === 'use') return String(row.cells.family ?? 'Unassigned');
    if (grouping === 'level1') return String(row.cells.level1 ?? '—');
    if (grouping === 'level2') return String(row.cells.level2 ?? '—');
    return '';
  }, [grouping]);

  const groups = useMemo(() => {
    const buckets = new Map<string, ParcelsRow[]>();
    for (const row of rows) {
      const key = groupKeyOf(row);
      const list = buckets.get(key);
      if (list) list.push(row); else buckets.set(key, [row]);
    }
    const filteredAcres = rows.reduce((s, r) => s + (Number(r.cells.acres) || 0), 0);
    return Array.from(buckets.entries()).map(([label, groupRows]) => {
      const acres = groupRows.reduce((s, r) => s + (Number(r.cells.acres) || 0), 0);
      const units = groupRows.reduce((s, r) => s + (Number(r.cells.units) || 0), 0);
      // Frontage sums like acres and units do. A group holding nothing with a
      // stated frontage reads as a dash rather than a zero — costs get
      // allocated off this figure, and "none" and "not established" must not
      // look the same on the line you allocate from.
      const withFeet = groupRows.filter((r) => r.cells.front_feet !== null
        && r.cells.front_feet !== undefined);
      const frontFeet = withFeet.length
        ? withFeet.reduce((s, r) => s + (Number(r.cells.front_feet) || 0), 0)
        : null;
      return {
        label,
        rows: groupRows,
        parcels: groupRows.length,
        acres,
        units,
        frontFeet,
        // Share of what is on screen, not of the project. A percentage that
        // silently means something other than the rows above it is worse than
        // no percentage.
        pct: filteredAcres ? (acres / filteredAcres) * 100 : null,
      };
    });
  }, [rows, groupKeyOf]);

  const isGrouped = rung === config.grouped_rung;
  const columnKeys = config.rung_columns[rung] ?? config.rung_columns[config.default_rung] ?? [];
  const columns = columnKeys
    .map((key) => config.columns.find((c) => c.key === key))
    .filter((c): c is ParcelsColumn => Boolean(c));

  /* Ask the panel for the room these columns need, and withdraw on the way out
   * so a narrower artifact opened next does not inherit the claim. The request
   * moves with the rung — Detail genuinely needs more room than Summary. */
  const { requestWidth } = useArtifactWidthRequest();
  const desired = useMemo(
    () => widthForColumns(columns.map((c) => ({ key: c.key, kind: c.kind }))),
    [columns],
  );
  React.useEffect(() => {
    requestWidth(desired);
    return () => requestWidth(null);
  }, [desired, requestWidth]);

  const visibleGroups = useMemo(() => {
    if (isGrouped || expanded) return groups;
    // Long tables truncate until asked. Groups stay whole — cutting a group in
    // half would show a subtotal that does not match the lines above it.
    const out: typeof groups = [];
    let count = 0;
    for (const g of groups) {
      if (count >= config.truncate_at) break;
      out.push(g);
      count += g.rows.length;
    }
    return out;
  }, [groups, isGrouped, expanded, config.truncate_at]);

  const shownRowCount = visibleGroups.reduce((s, g) => s + g.rows.length, 0);
  const hiddenRowCount = rows.length - shownRowCount;

  const totalAcres = rows.reduce((s, r) => s + (Number(r.cells.acres) || 0), 0);
  const totalUnits = rows.reduce((s, r) => s + (Number(r.cells.units) || 0), 0);

  const align = (c: ParcelsColumn) =>
    c.align === 'right' ? styles.right : c.align === 'center' ? styles.center : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className={styles.head}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.kicker}>{config.kicker}</div>
          <div className={styles.titleRow}>
            <span className={styles.title}>{config.title}</span>
            <span className={styles.titleBadges}>
              <span className={`${styles.badge} ${styles.badgeLive}`}>● {config.binding.label}</span>
            </span>
          </div>
        </div>
        {onClose && (
          <div className={styles.headActions}>
            <button type="button" className={styles.iconBtn} onClick={onClose} title="Close" aria-label="Close">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <div className={styles.kpis}>
        {kpis.map((k) => (
          <div className={styles.kpi} key={k.label}>
            <div className={styles.kpiLabel}>{k.label}</div>
            <div className={styles.kpiValue}>{k.value}</div>
          </div>
        ))}
      </div>

      {levelOne && levelOne.members.length > 0 && (
        <div className={styles.bar}>
          <span className={styles.barLabel}>{levelOne.label}</span>
          {levelOne.members.map((m) => (
            <button key={m.id} type="button"
              className={`${styles.badge} ${level1.includes(m.id) ? styles.badgeOn : ''}`}
              onClick={() => setLevel1((prev) => toggle(prev, m.id))}>
              {m.label}
            </button>
          ))}
        </div>
      )}

      {levelTwo && levelTwo.members.length > 0 && (
        <div className={styles.bar}>
          <span className={styles.barLabel}>{levelTwo.label}</span>
          {levelTwo.members.map((m) => {
            const inScope = phasesInScope.some((p) => p.id === m.id);
            return (
              <button key={m.id} type="button" disabled={!inScope}
                className={`${styles.badge} ${activeLevel2.includes(m.id) ? styles.badgeOn : ''} ${inScope ? '' : styles.badgeGhost}`}
                onClick={() => setLevel2((prev) => toggle(prev, m.id))}>
                {m.label}
              </button>
            );
          })}
        </div>
      )}

      {familyChips.length > 1 && (
        <div className={styles.bar}>
          <span className={styles.barLabel}>Use</span>
          {familyChips.map((f) => (
            <button key={f} type="button"
              className={`${styles.badge} ${families.includes(f) ? styles.badgeOn : ''}`}
              onClick={() => setFamilies((prev) => toggle(prev, f))}>
              {f}
            </button>
          ))}
        </div>
      )}

      <div className={styles.bar}>
        <span className={styles.barLabel}>Detail</span>
        {RUNGS.filter((r) => config.rung_columns[r]).map((r) => (
          <button key={r} type="button"
            className={`${styles.badge} ${rung === r ? styles.badgeOn : ''}`}
            onClick={() => setRung(r)}>
            {r}
          </button>
        ))}

        {/* Grouping keeps the detail row but reads as a labelled control of its
         *  own: one "Group" label, then bare names — the way Village, Phase and
         *  Use already read. It used to repeat `group:` on all four buttons,
         *  which said the word four times and gave the control no heading.
         *  Gregg, 2026-08-25: one label, same row, to the right of Detail. */}
        <span className={styles.barLabel} style={{ marginLeft: 18 }}>Group</span>
        {config.group_options.map((g) => (
          <button key={g.value} type="button"
            className={`${styles.badge} ${grouping === g.value ? styles.badgeOn : ''}`}
            onClick={() => setGrouping(g.value)}>
            {g.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {rows.length === 0 ? (
          <div className={styles.emptyState}>
            Nothing matches these filters. Clear a chip above to widen it.
          </div>
        ) : (
          <table className={`${styles.table} ${!isGrouped && grouping !== 'none' ? styles.tableGrouped : ''}`}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={align(c)}>{c.label ?? ''}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isGrouped
                ? groups.map((g) => (
                    <tr key={g.label}>
                      {columns.map((c) => {
                        if (c.key === 'group') return <td key={c.key}>{g.label}</td>;
                        if (c.key === 'parcels') return <td key={c.key} className={styles.right}>{fmt(g.parcels)}</td>;
                        if (c.key === 'acres') return <td key={c.key} className={styles.right}>{fmt(g.acres)}</td>;
                        if (c.key === 'units') return <td key={c.key} className={styles.right}>{fmt(g.units)}</td>;
                        if (c.key === 'front_feet') return <td key={c.key} className={`${styles.right} ${styles.computed}`}>{fmt(g.frontFeet)}</td>;
                        if (c.key === 'pct_acres') return <td key={c.key} className={`${styles.right} ${styles.computed}`}>{fmtPct(g.pct)}</td>;
                        return <td key={c.key} />;
                      })}
                    </tr>
                  ))
                : visibleGroups.map((g) => (
                    <React.Fragment key={g.label || 'all'}>
                      {grouping !== 'none' && (
                        <tr className={styles.sectionRow}>
                          <td colSpan={columns.length}>{g.label}</td>
                        </tr>
                      )}
                      {g.rows.map((row) => (
                        <tr key={row.id}>
                          {columns.map((c) => {
                            /* Whether a cell can be typed into is answered by the
                             * SERVER's refs, never by a list held here — a local
                             * list drifts away from what the server will accept
                             * and offers edits that bounce. */
                            const target = onCommitFieldEdits
                              ? budgetCellTarget(schema, row.id, c.key)
                              : null;
                            const key = target ? stagedKey(target.cellPath) : null;
                            const staged = key ? edits.staged[key] : undefined;
                            const committed = row.cells[c.key] ?? null;
                            const shown = staged ? staged.value : cellText(c.key, committed);
                            const empty = !staged && shown === '—';

                            const choices = optionsFor(c, row);

                            if (target && editing === key && choices) {
                              return (
                                <td key={c.key} className={align(c)}>
                                  <select
                                    className={styles.cellInput}
                                    autoFocus
                                    defaultValue={
                                      staged ? staged.value
                                        : (committed === null || committed === undefined ? '' : String(committed))
                                    }
                                    onChange={(e) => {
                                      edits.stageEdit(target.cellPath, e.target.value,
                                                      committed, target.expectedRef);
                                      setEditing(null);
                                    }}
                                    onBlur={() => setEditing(null)}
                                    onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null); }}>
                                    {/* A cell can be empty today; without this the
                                      * dropdown would show the first choice as
                                      * though it were the stored value. */}
                                    <option value="">—</option>
                                    {choices.map((o) => (
                                      <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                  </select>
                                </td>
                              );
                            }

                            if (target && editing === key) {
                              return (
                                <td key={c.key} className={align(c)}>
                                  <input
                                    className={styles.cellInput}
                                    autoFocus
                                    defaultValue={
                                      staged ? staged.value
                                        : (committed === null || committed === undefined ? '' : String(committed))
                                    }
                                    onBlur={(e) => {
                                      edits.stageEdit(target.cellPath, e.target.value,
                                                      committed, target.expectedRef);
                                      setEditing(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                      if (e.key === 'Escape') setEditing(null);
                                    }}
                                  />
                                </td>
                              );
                            }

                            return (
                              <td key={c.key}
                                  className={[
                                    align(c),
                                    c.kind === 'computed' ? styles.computed : '',
                                    empty ? styles.emptyCell : '',
                                    target ? styles.editable : '',
                                    staged?.error ? styles.cellError : '',
                                  ].filter(Boolean).join(' ')}
                                  title={staged?.error}
                                  onClick={target && key ? () => setEditing(key) : undefined}>
                                {shown}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {grouping !== 'none' && (
                        <tr className={styles.subtotalRow}>
                          {columns.map((c, i) => {
                            if (i === 0) return <td key={c.key}>{g.label} total</td>;
                            if (c.key === 'acres') return <td key={c.key} className={styles.right}>{fmt(g.acres)}</td>;
                            if (c.key === 'units') return <td key={c.key} className={styles.right}>{fmt(g.units)}</td>;
                            return <td key={c.key} />;
                          })}
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                {columns.map((c, i) => {
                  if (i === 0) return <td key={c.key}>Total</td>;
                  if (c.key === 'parcels') return <td key={c.key} className={styles.right}>{fmt(rows.length)}</td>;
                  if (c.key === 'acres') return <td key={c.key} className={styles.right}>{fmt(totalAcres)}</td>;
                  if (c.key === 'units') return <td key={c.key} className={styles.right}>{fmt(totalUnits)}</td>;
                  if (c.key === 'pct_acres') return <td key={c.key} className={styles.right}>100.0%</td>;
                  return <td key={c.key} />;
                })}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Nothing posts on a keystroke. The whole set lands through ONE batch
        * request, which is what lets the server report a single impact line for
        * the set — and what lets a change be thought better of before it is
        * real. Same hook, same commit path as the budget. */}
      {edits.stagedCount > 0 && (
        <div className={styles.commitBar} role="region" aria-label="Staged changes">
          <span className={styles.commitCount}>
            {edits.stagedCount} change{edits.stagedCount === 1 ? '' : 's'} staged
          </span>
          <span className={styles.commitActions}>
            <button type="button" className={styles.commitButton}
                    disabled={edits.committing}
                    onClick={() => { void edits.commitStaged(); }}>
              {edits.committing ? 'Saving…' : 'Commit'}
            </button>
            <button type="button" className={styles.discardButton}
                    disabled={edits.committing}
                    onClick={edits.discardStaged}>
              Discard
            </button>
          </span>
        </div>
      )}

      {hiddenRowCount > 0 && !isGrouped && (
        <button type="button" className={styles.hint} onClick={() => setExpanded(true)}
                style={{ textAlign: 'left', width: '100%', border: 0, cursor: 'pointer' }}>
          {hiddenRowCount} more {hiddenRowCount === 1 ? 'row' : 'rows'} — show all
        </button>
      )}

      {config.optional_columns.length > 0 && (
        <div className={styles.hint}>
          Not shown: {config.optional_columns.map((c) => c.label ?? c.key).join(', ')} —{' '}
          {config.optional_columns[0].reason}.
        </div>
      )}

      <div className={styles.foot}>
        Generated from {config.source_label} · {new Date(config.generated_at).toLocaleString()}
      </div>
    </div>
  );
}
