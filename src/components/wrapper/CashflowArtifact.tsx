/**
 * The cash flow, drawn from its view specification.
 *
 * Parity slice CF1 (2026-09-11). Third surface after the rent roll and sales,
 * and the first under Gregg's ordering by project type — cash flow sits under
 * Feasibility, which is land development.
 *
 * THE SHAPE IS NOT A LIST OF THINGS. The other surfaces are one row per parcel,
 * unit or product. This is one row per PERIOD, and the two halves play different
 * parts:
 *
 *   - The assumptions strip is the ONLY place anything can be typed. Every write
 *     pointer on this artifact is there, so it goes where a reader looks first.
 *   - The period grid is calculated by the engine end to end. Nothing in it is
 *     writable and nothing in it should look as though it is.
 *
 * A monthly project can be read by quarter or by year. The rollup sums the flows and
 * takes the LAST cumulative in each year rather than summing cumulatives, which
 * would be a number that means nothing. It is offered only for monthly periods
 * and only past a year of them — otherwise the control would either do nothing
 * or invent a calendar the engine never stated.
 */

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import styles from './ScheduleArtifact.module.css';
import type { BlockDocument } from '@/types/artifact';
import { useArtifactWidthRequest, widthForColumns } from './artifactWidthRequest';
import { budgetCellTarget } from './budgetCellTarget';
import { useStagedEdits, stagedKey, type CommitEditsFn } from './useStagedEdits';

export interface CashflowColumn {
  key: string;
  label: string | null;
  align?: 'left' | 'right' | 'center';
  kind?: string;
}
export interface CashflowRow {
  id: string;
  cells: Record<string, string | number | null>;
}
export interface CashflowTable {
  title: string;
  columns: CashflowColumn[];
  rows: CashflowRow[];
}
export interface CashflowViewConfig {
  topic: string;
  kicker: string;
  title: string;
  source_label: string;
  binding: { state: string; label: string };
  note: string | null;
  kpis: Array<{ label: string | null; value: string | number | null }>;
  assumptions: CashflowTable;
  periods: CashflowTable;
  period_type: string;
  total_periods: number;
  scales: Array<{ value: string; label: string }>;
  /** Every area and phase this cash flow could be re-run for. */
  containers: Array<{
    id: number;
    label: string;
    code: string | null;
    tier: number;
    tier_label: string;
    parent_id: number | null;
  }>;
  /** Which of them THIS cash flow was run for. Null means the whole project. */
  container_filter: { ids: number[]; labels: string[] } | null;
  scope_label: string;
  unavailable_controls: string | null;
  /** When period 0 starts and where the date came from. A null date means the
   *  analysis is not anchored to a calendar — it is solving for a present value. */
  period_zero: { date: string | null; source: string | null };
  unanchored_note: string | null;
  truncate_at: number;
  generated_at: string;
  project_id: number;
}

interface Props {
  config: CashflowViewConfig;
  onClose?: () => void;
  schema?: BlockDocument | null;
  artifactId?: number;
  onCommitFieldEdits?: CommitEditsFn;
}

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

/** A KPI arrives already formatted when it is a rate or a multiple, and raw
 *  when it is money. Strings pass through untouched. */
function kpiText(value: string | number | null): string {
  if (typeof value === 'number') return fmt(value);
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

const TEXT_CELLS = new Set(['period', 'assumption', 'basis', 'value']);

function cellText(key: string, value: string | number | null): string {
  if (TEXT_CELLS.has(key)) {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  }
  return fmt(value);
}

export function CashflowArtifact({
  config, onClose, schema, artifactId, onCommitFieldEdits,
}: Props) {
  const [scale, setScale] = useState('period');
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const edits = useStagedEdits(onCommitFieldEdits, artifactId);

  const periodColumns = config.periods.columns;

  /* Dated labels only make sense when the periods are months — which is exactly
   * when the server offers a quarter or year scale. Read from that rather than
   * parsing the period word. */
  const monthly = config.scales.some((s) => s.value === 'year' || s.value === 'quarter');

  /** Regroup the engine's rows into larger buckets.
   *
   *  Flows SUM. Cumulative takes the value at the END of the bucket, because a
   *  sum of running totals is not a running total — it is a number that means
   *  nothing, and it would sit in a column people read as the balance.
   *
   *  A bucket that carries no value for a column reads as absent rather than
   *  zero, the same rule every other surface here follows.
   *
   *  Buckets are SEQUENTIAL from the first period — Quarter 1, Year 1 — not
   *  calendar quarters and years. The engine states a period order, not a
   *  calendar, and aligning to one would invent a start date it never gave. */
  /** A bucket's name. Ordinal on its own when nothing anchors the analysis to a
   *  calendar; ordinal PLUS the real months it covers when period 0 has a date.
   *
   *  The buckets still run from period 0 rather than snapping to calendar
   *  quarters and years — a deal that closes in March has a first year ending in
   *  February, and shifting it to December would move cash between years. The
   *  date range is shown so nobody has to assume which convention is in force. */
  const bucketLabel = React.useCallback(
    (word: string, n: number, offset: number, length: number): string => {
      const anchor = config.period_zero?.date;
      if (!anchor || !monthly) return `${word} ${n}`;
      const start = new Date(`${anchor}T00:00:00`);
      if (Number.isNaN(start.getTime())) return `${word} ${n}`;
      const from = new Date(start);
      from.setMonth(from.getMonth() + offset);
      const to = new Date(start);
      to.setMonth(to.getMonth() + offset + length - 1);
      const label = (d: Date) =>
        d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return length === 1
        ? `${word} ${n} · ${label(from)}`
        : `${word} ${n} · ${label(from)} – ${label(to)}`;
    },
    [config.period_zero, monthly],
  );

  const rolledRows = useMemo((): CashflowRow[] => {
    const size = scale === 'year' ? 12 : scale === 'quarter' ? 3 : 1;
    if (size === 1) return config.periods.rows;
    const word = scale === 'year' ? 'Year' : 'Quarter';
    const prefix = scale === 'year' ? 'y' : 'q';
    const flowKeys = periodColumns
      .map((c) => c.key)
      .filter((k) => k !== 'period' && k !== 'cumulative');
    const out: CashflowRow[] = [];
    for (let i = 0; i < config.periods.rows.length; i += size) {
      const chunk = config.periods.rows.slice(i, i + size);
      const n = Math.floor(i / size) + 1;
      const cells: Record<string, string | number | null> = {
        period: bucketLabel(word, n, i, chunk.length),
      };
      for (const key of flowKeys) {
        const present = chunk.filter((r) => r.cells[key] !== null && r.cells[key] !== undefined);
        cells[key] = present.length
          ? present.reduce((s, r) => s + (Number(r.cells[key]) || 0), 0)
          : null;
      }
      const last = chunk[chunk.length - 1];
      if (last && 'cumulative' in last.cells) cells.cumulative = last.cells.cumulative;
      out.push({ id: `${prefix}${n}`, cells });
    }
    return out;
  }, [scale, config.periods.rows, periodColumns, bucketLabel]);

  const visibleRows = useMemo(
    () => (expanded ? rolledRows : rolledRows.slice(0, config.truncate_at)),
    [rolledRows, expanded, config.truncate_at],
  );
  const hiddenRowCount = rolledRows.length - visibleRows.length;

  const { requestWidth } = useArtifactWidthRequest();
  const desired = useMemo(
    () => widthForColumns(periodColumns.map((c) => ({ key: c.key, kind: c.kind }))),
    [periodColumns],
  );
  React.useEffect(() => {
    requestWidth(desired);
    return () => requestWidth(null);
  }, [desired, requestWidth]);

  const align = (c: CashflowColumn) =>
    c.align === 'right' ? styles.right : c.align === 'center' ? styles.center : undefined;

  /** An assumption cell. Editable only where the server's pointer says so —
   *  which, on this artifact, is only ever in this table. */
  const assumptionCell = (row: CashflowRow, c: CashflowColumn) => {
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

      {config.kpis.length > 0 && (
        <div className={styles.kpis}>
          {config.kpis.map((k) => (
            <div className={styles.kpi} key={String(k.label)}>
              <div className={styles.kpiLabel}>{k.label}</div>
              <div className={styles.kpiValue}>{kpiText(k.value)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {/* One line of prose, above the numbers it explains. */}
        {config.note && <div className={styles.hint}>{config.note}</div>}
        {config.unanchored_note && (
          <div className={styles.hint}>{config.unanchored_note}</div>
        )}
        {config.period_zero?.date && (
          <div className={styles.hint}>
            Period 0 starts {config.period_zero.date}
            {config.period_zero.source ? ` — from the ${config.period_zero.source}` : ''}.
          </div>
        )}

        {/* What this cash flow covers. A filtered one is a SEPARATE card built by
          * re-running the engine for those containers, so the project-wide cash
          * flow is never overwritten by a narrower view. The names are listed
          * rather than made into buttons: nothing on this screen can re-run the
          * engine yet, and a control that looks live and does nothing is worse
          * than a sentence saying how to get it. */}
        {(config.container_filter || (config.containers?.length ?? 0) > 0) && (
          <div className={styles.hint}>
            {config.container_filter
              ? `This cash flow covers ${config.container_filter.labels.join(', ')} only — the whole-project cash flow is a separate card and is unchanged.`
              : 'This cash flow covers the whole project.'}
            {(config.containers?.length ?? 0) > 0 && (
              <>
                {' '}Ask for any of these by name to get its own cash flow:{' '}
                {config.containers
                  .filter((c) => !config.container_filter?.ids.includes(c.id))
                  .map((c) => `${c.label} (${c.tier_label.toLowerCase()})`)
                  .join(', ')}
                .
              </>
            )}
          </div>
        )}

        {/* The editable half, first — it is the only part anyone can change. */}
        {config.assumptions.rows.length > 0 && (
          <>
            <div className={styles.bar}>
              <span className={styles.barLabel}>{config.assumptions.title || 'Assumptions'}</span>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  {config.assumptions.columns.map((c) => (
                    <th key={c.key} className={align(c)}>{c.label ?? ''}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {config.assumptions.rows.map((row) => (
                  <tr key={row.id}>
                    {config.assumptions.columns.map((c) => assumptionCell(row, c))}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className={styles.bar} style={{ marginTop: 18 }}>
          <span className={styles.barLabel}>{config.periods.title || 'Cash flow'}</span>
          {config.scales.length > 1 && config.scales.map((s) => (
            <button key={s.value} type="button"
              className={`${styles.badge} ${scale === s.value ? styles.badgeOn : ''}`}
              onClick={() => setScale(s.value)}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Calculated end to end. Nothing here takes an edit, and the styling
          * says so rather than leaving a reader to discover it by clicking. */}
        <table className={styles.table}>
          <thead>
            <tr>
              {periodColumns.map((c) => (
                <th key={c.key} className={align(c)}>{c.label ?? ''}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id}>
                {periodColumns.map((c) => (
                  <td key={c.key}
                      className={[
                        align(c),
                        c.key === 'period' ? '' : styles.computed,
                      ].filter(Boolean).join(' ')}>
                    {cellText(c.key, row.cells[c.key] ?? null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {hiddenRowCount > 0 && (
          <button type="button" className={styles.hint} onClick={() => setExpanded(true)}
                  style={{ textAlign: 'left', width: '100%', border: 0, cursor: 'pointer' }}>
            {hiddenRowCount} more {hiddenRowCount === 1 ? 'row' : 'rows'} — show all
          </button>
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

      {config.unavailable_controls && (
        <div className={styles.hint}>{config.unavailable_controls}</div>
      )}

      <div className={styles.foot}>
        Generated from {config.source_label} · {new Date(config.generated_at).toLocaleString()}
      </div>
    </div>
  );
}
