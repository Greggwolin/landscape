/**
 * The sales schedule, drawn from its view specification.
 *
 * Parity slice SL1 (2026-09-11), after the rent roll of the same day. The sales
 * artifact already carried per-cell write pointers; what it lacked was a
 * specification of its own, so it drew through the generic block renderer —
 * two tables and a row of figures, with no filtering, no grouping, and no sense
 * of which column is money.
 *
 * TWO TABLES, AND THEY STAY TWO. The rate card says what a product sells for;
 * the schedule says what each parcel is expected to bring and when. Different
 * grains. The rate card is NOT filtered by the chips — narrowing the schedule to
 * one area does not change what a product is priced at, and dimming the rate
 * card to match would suggest it had.
 *
 * What may be typed into is the SERVER's answer, never this file's: a cell is
 * editable when the stored block schema carries a pointer for it. Net is
 * calculated from gross, commission and cost of sale and can never carry one.
 */

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import styles from './ScheduleArtifact.module.css';
import type { BlockDocument } from '@/types/artifact';
import { useArtifactWidthRequest, widthForColumns } from './artifactWidthRequest';
import { budgetCellTarget } from './budgetCellTarget';
import { useStagedEdits, stagedKey, type CommitEditsFn } from './useStagedEdits';

export interface SalesColumn {
  key: string;
  label: string | null;
  align?: 'left' | 'right' | 'center';
  kind?: string;
}
export interface SalesRow {
  id: string;
  cells: Record<string, string | number | null>;
}
export interface SalesViewConfig {
  topic: string;
  kicker: string;
  title: string;
  source_label: string;
  binding: { state: string; label: string };
  columns: SalesColumn[];
  rung_columns: Record<string, string[]>;
  default_rung: string;
  default_grouping: string;
  group_options: Array<{ value: string; label: string }>;
  optional_columns: Array<{ key: string; label: string | null; available: boolean; reason: string | null }>;
  rows: SalesRow[];
  pricing: { title: string; columns: SalesColumn[]; rows: SalesRow[] };
  row_count: number;
  truncate_at: number;
  generated_at: string;
  project_id: number;
}

interface Props {
  config: SalesViewConfig;
  onClose?: () => void;
  schema?: BlockDocument | null;
  artifactId?: number;
  onCommitFieldEdits?: CommitEditsFn;
}

const RUNGS = ['summary', 'standard', 'detail'] as const;

/** Thousands separators, parentheses for negatives, em dash for zero or absent,
 *  no currency symbol. Identical to every other schedule surface. */
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

const MONEY = new Set(['gross', 'commission', 'cost_of_sale', 'net', 'price']);

function cellText(key: string, value: string | number | null): string {
  if (MONEY.has(key)) return fmt(value);
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

/** Sum a column, returning null when NOTHING on screen carries a value.
 *  Proceeds are struck off these lines, so "none" and "not established" must
 *  not look the same. */
function sumOrNull(rows: SalesRow[], key: string): number | null {
  const present = rows.filter((r) => r.cells[key] !== null && r.cells[key] !== undefined);
  if (!present.length) return null;
  return present.reduce((s, r) => s + (Number(r.cells[key]) || 0), 0);
}

export function SalesArtifact({
  config, onClose, schema, artifactId, onCommitFieldEdits,
}: Props) {
  const [rung, setRung] = useState<string>(config.default_rung || 'standard');
  const [grouping, setGrouping] = useState<string>(config.default_grouping || 'none');
  const [areas, setAreas] = useState<string[]>([]);
  const [phases, setPhases] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const edits = useStagedEdits(onCommitFieldEdits, artifactId);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const chipsFrom = React.useCallback((key: string) => {
    const seen: string[] = [];
    for (const row of config.rows) {
      const v = row.cells[key];
      if (typeof v === 'string' && v && !seen.includes(v)) seen.push(v);
    }
    return seen;
  }, [config.rows]);
  const areaChips = useMemo(() => chipsFrom('area'), [chipsFrom]);
  const phaseChips = useMemo(() => chipsFrom('phase'), [chipsFrom]);

  const rows = useMemo(() => config.rows.filter((row) => {
    if (areas.length && !areas.includes(String(row.cells.area))) return false;
    if (phases.length && !phases.includes(String(row.cells.phase))) return false;
    return true;
  }), [config.rows, areas, phases]);

  /* The figures across the top follow the filter. The sale-date span is read off
   * the rows on screen rather than carried from the server, so it agrees with
   * what is in front of you after a chip is picked. */
  const kpis = useMemo(() => {
    const gross = sumOrNull(rows, 'gross');
    const net = sumOrNull(rows, 'net');
    const dates = rows
      .map((r) => String(r.cells.sale_date ?? ''))
      .filter((d) => d && d !== '—')
      .sort();
    const span = dates.length
      ? (dates[0] === dates[dates.length - 1]
          ? dates[0] : `${dates[0]} – ${dates[dates.length - 1]}`)
      : '—';
    return [
      { label: 'Gross proceeds', value: fmt(gross) },
      { label: 'Net proceeds', value: fmt(net) },
      { label: 'Sale-date span', value: span },
      { label: 'Parcels', value: fmt(rows.length) },
      { label: 'Products priced', value: fmt(config.pricing.rows.length) },
    ];
  }, [rows, config.pricing.rows.length]);

  const groupKeyOf = React.useCallback((row: SalesRow): string => {
    if (grouping === 'area') return String(row.cells.area || 'Unassigned');
    if (grouping === 'phase') return String(row.cells.phase || 'Unassigned');
    return '';
  }, [grouping]);

  const groups = useMemo(() => {
    const buckets = new Map<string, SalesRow[]>();
    for (const row of rows) {
      const key = groupKeyOf(row);
      const list = buckets.get(key);
      if (list) list.push(row); else buckets.set(key, [row]);
    }
    return Array.from(buckets.entries()).map(([label, groupRows]) => ({
      label,
      rows: groupRows,
      gross: sumOrNull(groupRows, 'gross'),
      net: sumOrNull(groupRows, 'net'),
      commission: sumOrNull(groupRows, 'commission'),
    }));
  }, [rows, groupKeyOf]);

  // The column you grouped by is dropped: the group heading already says which
  // area or phase every row under it belongs to, so repeating it once per row
  // is a column of the same word (Gregg, 2026-09-11).
  const columnKeys = (config.rung_columns[rung] ?? config.rung_columns[config.default_rung] ?? [])
    .filter((key) => key !== grouping);
  const columns = columnKeys
    .map((key) => config.columns.find((c) => c.key === key))
    .filter((c): c is SalesColumn => Boolean(c));

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
  const totalGross = sumOrNull(rows, 'gross');
  const totalNet = sumOrNull(rows, 'net');

  const align = (c: SalesColumn) =>
    c.align === 'right' ? styles.right : c.align === 'center' ? styles.center : undefined;

  /** One cell, editable only where the server's pointer says so. */
  const scheduleCell = (row: SalesRow, c: SalesColumn) => {
    const target = onCommitFieldEdits ? budgetCellTarget(schema, row.id, c.key) : null;
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
              edits.stageEdit(target.cellPath, e.target.value, committed, target.expectedRef);
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
  };

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

      {areaChips.length > 1 && (
        <div className={styles.bar}>
          <span className={styles.barLabel}>Area</span>
          {areaChips.map((a) => (
            <button key={a} type="button"
              className={`${styles.badge} ${areas.includes(a) ? styles.badgeOn : ''}`}
              onClick={() => setAreas((prev) => toggle(prev, a))}>
              {a}
            </button>
          ))}
        </div>
      )}

      {phaseChips.length > 1 && (
        <div className={styles.bar}>
          <span className={styles.barLabel}>Phase</span>
          {phaseChips.map((p) => (
            <button key={p} type="button"
              className={`${styles.badge} ${phases.includes(p) ? styles.badgeOn : ''}`}
              onClick={() => setPhases((prev) => toggle(prev, p))}>
              {p}
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
                    <tr key={row.id}>{columns.map((c) => scheduleCell(row, c))}</tr>
                  ))}
                  {grouping !== 'none' && (
                    <tr className={styles.subtotalRow}>
                      {columns.map((c, i) => {
                        if (i === 0) return <td key={c.key}>{g.label} total</td>;
                        if (c.key === 'gross') return <td key={c.key} className={styles.right}>{fmt(g.gross)}</td>;
                        if (c.key === 'commission') return <td key={c.key} className={styles.right}>{fmt(g.commission)}</td>;
                        if (c.key === 'net') return <td key={c.key} className={styles.right}>{fmt(g.net)}</td>;
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
                  if (c.key === 'gross') return <td key={c.key} className={styles.right}>{fmt(totalGross)}</td>;
                  if (c.key === 'net') return <td key={c.key} className={styles.right}>{fmt(totalNet)}</td>;
                  return <td key={c.key} />;
                })}
              </tr>
            </tfoot>
          </table>
        )}

        {/* The rate card. A different grain from the schedule above — one row per
          * product, not per parcel — and deliberately NOT filtered by the chips. */}
        {config.pricing.rows.length > 0 && (
          <>
            <div className={styles.bar} style={{ marginTop: 18 }}>
              <span className={styles.barLabel}>{config.pricing.title}</span>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  {config.pricing.columns.map((c) => (
                    <th key={c.key} className={align(c)}>{c.label ?? ''}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {config.pricing.rows.map((row) => (
                  <tr key={row.id}>
                    {config.pricing.columns.map((c) => scheduleCell(row, c))}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

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
          {hiddenRowCount} more {hiddenRowCount === 1 ? 'parcel' : 'parcels'} — show all
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
