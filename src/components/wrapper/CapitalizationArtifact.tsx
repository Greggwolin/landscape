/**
 * Equity — the capital stack and the distribution waterfall.
 *
 * Parity slice CAP2 (2026-09-11), corrected the same day. Gregg: *"The equity
 * waterfall was its own tab with the inputs at the top that would update when
 * various assumptions were modified. Debt was handled on a completely different
 * tab."* The retired code agrees — equity and debt were two separate screens.
 *
 * So this is EQUITY. The stack and the waterfall belong together because the
 * tiers divide out what the stack put in. **Debt is a different artifact that
 * does not exist yet.**
 *
 * The old equity tab also carried an equity-partners table, a waterfall type
 * switch (IRR / multiple / both), and total committed, deployed and remaining
 * across the top. Those gaps are recorded rather than quietly dropped.
 *
 * NOTHING ON THIS SURFACE IS EDITABLE YET, AND THAT IS DELIBERATE.
 * The column definitions mark the hurdle, the splits, the promote and the
 * contributed amounts as editable, but no row carries a write pointer: the
 * waterfall engine does not return the id of the row each tier came from. The
 * renderer gates on the pointer and never on the flag, so every cell here reads
 * read-only — correctly — and the screen says why in one line rather than
 * leaving a reader clicking at a cell that will never open.
 *
 * When the pointers arrive, this file needs no change beyond removing that line:
 * the editing path is already wired through the panel's shared batch helper.
 */

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import styles from './ScheduleArtifact.module.css';
import type { BlockDocument } from '@/types/artifact';
import { useArtifactWidthRequest, widthForColumns } from './artifactWidthRequest';
import { budgetCellTarget } from './budgetCellTarget';
import { useStagedEdits, stagedKey, type CommitEditsFn } from './useStagedEdits';

export interface CapColumn {
  key: string;
  label: string | null;
  align?: 'left' | 'right' | 'center';
  kind?: string;
}
export interface CapRow {
  id: string;
  cells: Record<string, string | number | null>;
}
export interface CapTable {
  title: string;
  note: string | null;
  columns: CapColumn[];
  rows: CapRow[];
}
export interface CapitalizationViewConfig {
  topic: string;
  kicker: string;
  title: string;
  source_label: string;
  binding: { state: string; label: string };
  kpis: Array<{ label: string | null; value: string | number | null }>;
  stack: CapTable;
  waterfall: CapTable;
  read_only_reason: string | null;
  generated_at: string;
  project_id: number;
}

interface Props {
  config: CapitalizationViewConfig;
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

/** Rates and multiples arrive already formatted so a raw fraction never renders
 *  as zero; money arrives raw. Strings pass through. */
function cellText(value: string | number | null): string {
  if (typeof value === 'number') return fmt(value);
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function CapitalizationArtifact({
  config, onClose, schema, artifactId, onCommitFieldEdits,
}: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const edits = useStagedEdits(onCommitFieldEdits, artifactId);

  const { requestWidth } = useArtifactWidthRequest();
  const desired = useMemo(
    () => widthForColumns(config.waterfall.columns.map((c) => ({ key: c.key, kind: c.kind }))),
    [config.waterfall.columns],
  );
  React.useEffect(() => {
    requestWidth(desired);
    return () => requestWidth(null);
  }, [desired, requestWidth]);

  const align = (c: CapColumn) =>
    c.align === 'right' ? styles.right : c.align === 'center' ? styles.center : undefined;

  /** Editable only where the server's pointer says so. Today: nowhere here. */
  const cell = (row: CapRow, c: CapColumn) => {
    const target = onCommitFieldEdits ? budgetCellTarget(schema, row.id, c.key) : null;
    const key = target ? stagedKey(target.cellPath) : null;
    const staged = key ? edits.staged[key] : undefined;
    const committed = row.cells[c.key] ?? null;
    const shown = staged ? staged.value : cellText(committed);
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

  const renderTable = (t: CapTable) => (
    t.rows.length > 0 ? (
      <>
        <div className={styles.bar} style={{ marginTop: 18 }}>
          <span className={styles.barLabel}>{t.title}</span>
        </div>
        {t.note && <div className={styles.hint}>{t.note}</div>}
        <table className={styles.table}>
          <thead>
            <tr>
              {t.columns.map((c) => (
                <th key={c.key} className={align(c)}>{c.label ?? ''}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row) => (
              <tr key={row.id}>{t.columns.map((c) => cell(row, c))}</tr>
            ))}
          </tbody>
        </table>
      </>
    ) : null
  );

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
              <div className={styles.kpiValue}>{cellText(k.value)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {/* Said once, at the top, rather than leaving a reader to discover it by
          * clicking a cell that will never open. */}
        {config.read_only_reason && (
          <div className={styles.hint}>{config.read_only_reason}</div>
        )}
        {renderTable(config.stack)}
        {renderTable(config.waterfall)}
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

      <div className={styles.foot}>
        Generated from {config.source_label} · {new Date(config.generated_at).toLocaleString()}
      </div>
    </div>
  );
}
