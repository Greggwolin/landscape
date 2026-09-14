/**
 * The pricing register, drawn from its view specification.
 *
 * Parity slice PR1 (2026-09-13). The first surface built as a REGISTER under
 * D-2026-09-13-SURFACES, and the first to apply the convention that decides how
 * every surface after it reads:
 *
 *   BLUE MEANS A HUMAN TYPED IT. BLACK MEANS THE MODEL COMPUTED IT.
 *
 * The shared stylesheet already had both halves — `.editable` is primary-coloured
 * with a dashed underline, `.computed` is dim — so this is the convention being
 * APPLIED rather than invented. The specification says which of the two each
 * column is, so the colour follows the server's pointers instead of a hard-coded
 * list that can drift away from them.
 *
 * THE CURVE
 * ---------
 * Single-family products are ordered by lot width, and the rate and the price a
 * whole lot implies sit side by side. Per front foot the rate falls as lots get
 * wider; per lot the price rises, because a wider lot has more feet to sell. Two
 * columns because those two facts read as contradictions when only one is shown.
 * A product priced above a narrower one in the same use type is marked — an
 * observation, never a correction.
 */

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import styles from './ScheduleArtifact.module.css';
import type { BlockDocument } from '@/types/artifact';
import { useArtifactWidthRequest, widthForColumns } from './artifactWidthRequest';
import { budgetCellTarget } from './budgetCellTarget';
import { useStagedEdits, stagedKey, type CommitEditsFn } from './useStagedEdits';

export interface PricingColumn {
  key: string;
  label: string | null;
  align?: 'left' | 'right' | 'center';
  /** input = typed by a person, computed = derived, context = neither. */
  kind: 'input' | 'computed' | 'context';
  options?: Array<{ value: string; label: string }>;
}
export interface PricingRow {
  id: string;
  cells: Record<string, string | number | null>;
  curve_break?: boolean;
}
export interface PricingRegisterViewConfig {
  topic: string;
  kicker: string;
  title: string;
  source_label: string;
  binding: { state: string; label: string };
  lede: string;
  kpis: Array<{ label: string | null; value: string | number | null }>;
  columns: PricingColumn[];
  rung_columns: Record<string, string[]>;
  default_rung: string;
  rows: PricingRow[];
  row_count: number;
  notices: string[];
  growth_sources: Array<{
    id: number; label: string; global: boolean;
    first_rate: number | null; steps: number;
  }>;
  truncate_at: number;
  generated_at: string;
  project_id: number;
}

interface Props {
  config: PricingRegisterViewConfig;
  onClose?: () => void;
  schema?: BlockDocument | null;
  artifactId?: number;
  onCommitFieldEdits?: CommitEditsFn;
}

/** Thousands separators, em dash for absent. No currency symbol — the Unit
 *  column already says what the number is in. */
function fmt(value: unknown, decimals = 0): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  const body = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
  return n < 0 ? `(${body})` : body;
}

/** A growth rate is stored as a decimal fraction; 0.03 reads as 3.0%. A rate of
 *  zero is shown as 0.0%, not an em dash: flat is a decision, not an absence. */
function pct(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${(n * 100).toFixed(1)}%`;
}

function cellText(key: string, value: unknown): string {
  if (key === 'growth_rate') return pct(value);
  if (key === 'price' || key === 'price_per_lot') return fmt(value);
  if (key === 'width') return value === null || value === undefined ? '—' : String(value);
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function PricingRegisterArtifact({
  config, onClose, schema, artifactId, onCommitFieldEdits,
}: Props) {
  const [rung, setRung] = useState<string>(config.default_rung || 'standard');
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const edits = useStagedEdits(onCommitFieldEdits, artifactId);

  const columnKeys = config.rung_columns[rung] ?? config.rung_columns[config.default_rung] ?? [];
  const columns = columnKeys
    .map((key) => config.columns.find((c) => c.key === key))
    .filter((c): c is PricingColumn => Boolean(c));

  const { requestWidth } = useArtifactWidthRequest();
  const desired = useMemo(
    () => widthForColumns(columns.map((c) => ({ key: c.key, kind: c.kind }))),
    [columns],
  );
  React.useEffect(() => {
    requestWidth(desired);
    return () => requestWidth(null);
  }, [desired, requestWidth]);

  const visibleRows = expanded ? config.rows : config.rows.slice(0, config.truncate_at);
  const hiddenCount = config.rows.length - visibleRows.length;

  const align = (c: PricingColumn) =>
    c.align === 'right' ? styles.right : c.align === 'center' ? styles.center : undefined;

  /** One cell. Blue where the server's pointer backs it, dim where the register
   *  worked it out, plain otherwise. */
  const cell = (row: PricingRow, c: PricingColumn) => {
    const target =
      c.kind === 'input' && onCommitFieldEdits
        ? budgetCellTarget(schema, row.id, c.key)
        : null;
    const key = target ? stagedKey(target.cellPath) : null;
    const staged = key ? edits.staged[key] : undefined;
    const committed = row.cells[c.key] ?? null;
    const shown = staged ? staged.value : cellText(c.key, committed);

    if (target && editing === key) {
      const common = {
        className: styles.cellInput,
        autoFocus: true,
        onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
          edits.stageEdit(target.cellPath, e.target.value, committed, target.expectedRef);
          setEditing(null);
        },
      };
      if (c.options?.length) {
        return (
          <td key={c.key} className={align(c)}>
            <select
              {...common}
              defaultValue={String(committed ?? '')}
              onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null); }}
            >
              {c.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </td>
        );
      }
      return (
        <td key={c.key} className={align(c)}>
          <input
            {...common}
            type={c.key === 'as_of' ? 'date' : 'text'}
            defaultValue={
              staged ? staged.value
                : (committed === null || committed === undefined ? '' : String(committed))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setEditing(null);
            }}
          />
        </td>
      );
    }

    const cls = [
      align(c),
      target ? styles.editable : c.kind === 'computed' ? styles.computed : undefined,
      staged ? styles.stagedCell : undefined,
    ].filter(Boolean).join(' ');

    return (
      <td
        key={c.key}
        className={cls || undefined}
        onClick={target ? () => setEditing(key) : undefined}
        title={
          target ? 'Click to change — this is an input'
            : c.kind === 'computed' ? 'Worked out from the price and the lot width'
            : undefined
        }
      >
        {shown}
        {c.key === 'product' && row.curve_break ? (
          <span className={styles.badgeGhost} style={{ marginLeft: 6 }}>
            above a narrower lot
          </span>
        ) : null}
      </td>
    );
  };

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <div className={styles.kicker}>{config.kicker}</div>
          <div className={styles.titleRow}>
            <span className={styles.title}>{config.title}</span>
            <span className={styles.titleBadges}>
              <span className={styles.badgeLive}>{config.binding.label}</span>
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
              <div className={styles.kpiValue}>{k.value ?? '—'}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div className={styles.hint}>{config.lede}</div>
        {config.notices.map((n) => (
          <div className={styles.hint} key={n}>{n}</div>
        ))}

        <div className={styles.bar}>
          <span className={styles.barLabel}>By product</span>
          {Object.keys(config.rung_columns).map((r) => (
            <button key={r} type="button"
              className={`${styles.badge} ${rung === r ? styles.badgeOn : ''}`}
              onClick={() => setRung(r)}>
              {r}
            </button>
          ))}
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={align(c)}>{c.label ?? ''}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id}>{columns.map((c) => cell(row, c))}</tr>
            ))}
          </tbody>
        </table>

        {hiddenCount > 0 && (
          <button type="button" className={styles.trunc} onClick={() => setExpanded(true)}>
            Show {hiddenCount} more
          </button>
        )}

        {config.growth_sources.length > 0 && (
          <>
            <div className={styles.bar} style={{ marginTop: 18 }}>
              <span className={styles.barLabel}>Growth sources you can point a product at</span>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Scope</th>
                  <th className={styles.right}>First rate</th>
                  <th className={styles.right}>Steps</th>
                </tr>
              </thead>
              <tbody>
                {config.growth_sources.map((g) => (
                  <tr key={g.id}>
                    <td>{g.label}</td>
                    <td className={styles.computed}>{g.global ? 'Platform' : 'This project'}</td>
                    <td className={styles.right}>{pct(g.first_rate)}</td>
                    <td className={styles.right}>{g.steps}</td>
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
    </div>
  );
}
