/**
 * The rent roll, drawn from its view specification.
 *
 * Parity slice RR3 (2026-09-11). The same format the budget schedule and the
 * parcels table use — NOT the old screen in a frame. The rent roll had been
 * falling through the generic block renderer, which knows section / table /
 * key-value grid / text and nothing about occupancy, loss-to-lease or which
 * cells may be typed into.
 *
 * WHAT MAY BE TYPED INTO IS THE SERVER'S ANSWER, NEVER THIS FILE'S.
 * A cell is editable when the stored BLOCK SCHEMA carries a pointer for it.
 * A list held here would drift away from what the server accepts and would
 * offer edits that bounce. Loss-to-lease is calculated and can never carry a
 * pointer; lease end deliberately carries none yet (the cell shows a formatted
 * date while the column stores a date, and the stale-cell guard compares the
 * two).
 *
 * Nothing posts on a keystroke: edits stage and land as one batch through the
 * same hook and the same commit path the budget uses, so there is one write
 * path and one impact banner for the product.
 */

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import styles from './ScheduleArtifact.module.css';
import type { BlockDocument } from '@/types/artifact';
import { useArtifactWidthRequest, widthForColumns } from './artifactWidthRequest';
import { budgetCellTarget } from './budgetCellTarget';
import { useStagedEdits, stagedKey, type CommitEditsFn } from './useStagedEdits';

/* ─── The specification, as the server sends it ────────────────────────── */

export interface RentRollColumn {
  key: string;
  label: string | null;
  align?: 'left' | 'right' | 'center';
  kind?: string;
}
export interface RentRollRow {
  id: string;
  unit_id?: number | null;
  cells: Record<string, string | number | null>;
}
export interface RentRollViewConfig {
  topic: string;
  kicker: string;
  title: string;
  source_label: string;
  binding: { state: string; label: string };
  columns: RentRollColumn[];
  rung_columns: Record<string, string[]>;
  default_rung: string;
  default_grouping: string;
  group_options: Array<{ value: string; label: string }>;
  optional_columns: Array<{ key: string; label: string | null; available: boolean; reason: string | null }>;
  rows: RentRollRow[];
  row_count: number;
  truncate_at: number;
  generated_at: string;
  project_id: number;
}

interface Props {
  config: RentRollViewConfig;
  onClose?: () => void;
  /** Where the per-cell write pointers live. Absent → everything read-only,
   *  which is right for an artifact stored before editing existed. */
  schema?: BlockDocument | null;
  artifactId?: number;
  /** Without it nothing is editable — staging would have nowhere to go. */
  onCommitFieldEdits?: CommitEditsFn;
}

const RUNGS = ['summary', 'standard', 'detail'] as const;

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

const MONEY = new Set(['in_place', 'market', 'loss_to_lease', 'delinquency']);

function cellText(key: string, value: string | number | null): string {
  if (MONEY.has(key) || key === 'sf') return fmt(value);
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

const isOccupied = (row: RentRollRow) =>
  String(row.cells.status ?? '').trim().toLowerCase() === 'occupied';

/* ─── Component ────────────────────────────────────────────────────────── */

export function RentRollArtifact({
  config, onClose, schema, artifactId, onCommitFieldEdits,
}: Props) {
  const [rung, setRung] = useState<string>(config.default_rung || 'standard');
  const [grouping, setGrouping] = useState<string>(config.default_grouping || 'none');
  const [buildings, setBuildings] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const edits = useStagedEdits(onCommitFieldEdits, artifactId);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  /* Chips come from what the units actually are, in the order they first
   * appear — so a project with one building never shows a building chip that
   * filters to nothing. */
  const chipsFrom = (key: string) => {
    const seen: string[] = [];
    for (const row of config.rows) {
      const v = row.cells[key];
      if (typeof v === 'string' && v && !seen.includes(v)) seen.push(v);
    }
    return seen;
  };
  const buildingChips = useMemo(() => chipsFrom('building'), [config.rows]);
  const statusChips = useMemo(() => chipsFrom('status'), [config.rows]);

  const rows = useMemo(() => config.rows.filter((row) => {
    if (buildings.length && !buildings.includes(String(row.cells.building))) return false;
    if (statuses.length && !statuses.includes(String(row.cells.status))) return false;
    return true;
  }), [config.rows, buildings, statuses]);

  /* The figures across the top follow the filter, as the budget's and the
   * parcels table's do. Market and loss-to-lease read as absent rather than
   * zero when nothing on screen carries a market rent — "none" and "not
   * established" must not look the same on a line anyone underwrites from. */
  const kpis = useMemo(() => {
    const inPlace = rows.reduce((s, r) => s + (Number(r.cells.in_place) || 0), 0);
    const withMarket = rows.filter((r) => r.cells.market !== null && r.cells.market !== undefined);
    const market = withMarket.length
      ? withMarket.reduce((s, r) => s + (Number(r.cells.market) || 0), 0)
      : null;
    const occupied = rows.filter(isOccupied).length;
    return [
      { label: 'Units', value: fmt(rows.length) },
      { label: 'Occupancy', value: rows.length ? fmtPct((occupied / rows.length) * 100) : '—' },
      { label: 'In-place rent (mo)', value: fmt(inPlace) },
      { label: 'Market rent (mo)', value: fmt(market) },
      { label: 'Loss-to-lease (mo)', value: market === null ? '—' : fmt(market - inPlace) },
    ];
  }, [rows]);

  const groupKeyOf = React.useCallback((row: RentRollRow): string => {
    if (grouping === 'building') return String(row.cells.building || 'Unassigned');
    if (grouping === 'unit_type') return String(row.cells.unit_type || 'Unassigned');
    return '';
  }, [grouping]);

  const groups = useMemo(() => {
    const buckets = new Map<string, RentRollRow[]>();
    for (const row of rows) {
      const key = groupKeyOf(row);
      const list = buckets.get(key);
      if (list) list.push(row); else buckets.set(key, [row]);
    }
    return Array.from(buckets.entries()).map(([label, groupRows]) => ({
      label,
      rows: groupRows,
      units: groupRows.length,
      inPlace: groupRows.reduce((s, r) => s + (Number(r.cells.in_place) || 0), 0),
      occupancy: groupRows.length
        ? (groupRows.filter(isOccupied).length / groupRows.length) * 100
        : null,
    }));
  }, [rows, groupKeyOf]);

  const columnKeys = config.rung_columns[rung] ?? config.rung_columns[config.default_rung] ?? [];
  const columns = columnKeys
    .map((key) => config.columns.find((c) => c.key === key))
    .filter((c): c is RentRollColumn => Boolean(c));

  /* Ask the panel for the room these columns need, and withdraw on the way out
   * so a narrower artifact opened next does not inherit the claim. */
  const { requestWidth } = useArtifactWidthRequest();
  const desired = useMemo(
    () => widthForColumns(columns.map((c) => ({ key: c.key, kind: c.kind }))),
    [columns],
  );
  React.useEffect(() => {
    requestWidth(desired);
    return () => requestWidth(null);
  }, [desired, requestWidth]);

  /* Long tables truncate until asked. Groups stay whole — cutting one in half
   * would show a subtotal that does not match the lines above it. */
  const visibleGroups = useMemo(() => {
    if (expanded) return groups;
    const out: typeof groups = [];
    let count = 0;
    for (const g of groups) {
      if (count >= config.truncate_at) break;
      out.push(g);
      count += g.rows.length;
    }
    return out;
  }, [groups, expanded, config.truncate_at]);

  const shownRowCount = visibleGroups.reduce((s, g) => s + g.rows.length, 0);
  const hiddenRowCount = rows.length - shownRowCount;
  const totalInPlace = rows.reduce((s, r) => s + (Number(r.cells.in_place) || 0), 0);

  const align = (c: RentRollColumn) =>
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

      {buildingChips.length > 1 && (
        <div className={styles.bar}>
          <span className={styles.barLabel}>Building</span>
          {buildingChips.map((b) => (
            <button key={b} type="button"
              className={`${styles.badge} ${buildings.includes(b) ? styles.badgeOn : ''}`}
              onClick={() => setBuildings((prev) => toggle(prev, b))}>
              {b}
            </button>
          ))}
        </div>
      )}

      {statusChips.length > 1 && (
        <div className={styles.bar}>
          <span className={styles.barLabel}>Status</span>
          {statusChips.map((s) => (
            <button key={s} type="button"
              className={`${styles.badge} ${statuses.includes(s) ? styles.badgeOn : ''}`}
              onClick={() => setStatuses((prev) => toggle(prev, s))}>
              {s}
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
        {config.group_options.length > 1 && (
          <>
            <span className={styles.barLabel} style={{ marginLeft: 18 }}>Group</span>
            {config.group_options.map((g) => (
              <button key={g.value} type="button"
                className={`${styles.badge} ${grouping === g.value ? styles.badgeOn : ''}`}
                onClick={() => setGrouping(g.value)}>
                {g.label}
              </button>
            ))}
          </>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {rows.length === 0 ? (
          <div className={styles.emptyState}>
            Nothing matches these filters. Clear a chip above to widen it.
          </div>
        ) : (
          <table className={`${styles.table} ${grouping !== 'none' ? styles.tableGrouped : ''}`}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={align(c)}>{c.label ?? ''}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleGroups.map((g) => (
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
                         * SERVER's pointers, never by a list held here. */
                        const target = onCommitFieldEdits
                          ? budgetCellTarget(schema, row.id, c.key)
                          : null;
                        const key = target ? stagedKey(target.cellPath) : null;
                        const staged = key ? edits.staged[key] : undefined;
                        const committed = row.cells[c.key] ?? null;
                        const shown = staged ? staged.value : cellText(c.key, committed);
                        const empty = !staged && shown === '—';

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
                        if (c.key === 'in_place') return <td key={c.key} className={styles.right}>{fmt(g.inPlace)}</td>;
                        if (c.key === 'status') return <td key={c.key}>{fmtPct(g.occupancy)}</td>;
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
                  if (c.key === 'in_place') return <td key={c.key} className={styles.right}>{fmt(totalInPlace)}</td>;
                  return <td key={c.key} />;
                })}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Nothing posts on a keystroke. The whole set lands through ONE batch
        * request — the same hook and commit path as the budget and parcels. */}
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

      {hiddenRowCount > 0 && (
        <button type="button" className={styles.hint} onClick={() => setExpanded(true)}
                style={{ textAlign: 'left', width: '100%', border: 0, cursor: 'pointer' }}>
          {hiddenRowCount} more {hiddenRowCount === 1 ? 'unit' : 'units'} — show all
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
