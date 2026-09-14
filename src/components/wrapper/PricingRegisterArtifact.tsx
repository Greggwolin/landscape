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
  /** An established picklist for this field, read from the platform's own table
   *  (units from tbl_measures, growth sources from the growth-rate sets). Where
   *  one exists the field offers it instead of free text. */
  options?: Array<{ value: string; label: string; description?: string }>;
  /** The list is a set of published values to pick from AND the field stays
   *  typeable. A growth rate nobody has published is still a legitimate rate,
   *  so the picklist must not become a cage. */
  allow_custom?: boolean;
  /** 'percent' means the value is STORED as a decimal fraction and both shown
   *  and typed as a percent. Declared on the column, never guessed from a name. */
  format?: 'percent';
}
export interface PricingRow {
  id: string;
  cells: Record<string, string | number | null>;
  curve_break?: boolean;
  /** The growth rate shown came from the project's own assumption rather than
   *  from this row. It is still an input — typing over it stores a rate for this
   *  product alone. */
  growth_inherited?: boolean;
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
 *  column already says what the number is in.
 *
 *  ``zeroAsDash``: a price of zero is not a price. It was already how the lot
 *  column read, because a lot price is only worked out where there is a rate to
 *  work it out from; Gregg asked on 2026-09-14 for the rate column to match. */
function fmt(value: unknown, decimals = 0, zeroAsDash = false): string {
  if (value === null || value === undefined || value === '') return '—';
  if (zeroAsDash && Number(value) === 0) return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  const body = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
  return n < 0 ? `(${body})` : body;
}

/** A growth rate is stored as a decimal fraction; 0.03 reads as 3.0%.
 *
 *  ``zeroAsDash`` is for the GRID. Gregg, 2026-09-14: a zero reads as a dash
 *  there, the same as a zero price does — twenty-one rows of "0.0%" is a wall of
 *  figures saying nothing, and a blank column is the honest picture of a
 *  register where no rate has been set. The growth-sources table below keeps its
 *  zeroes, because "No Inflation" really is a rate of zero. */
function pct(value: unknown, zeroAsDash = false): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (zeroAsDash && n === 0) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

/** A percent typed as "3", "3.0" or "3%" is the same three percent, and it is
 *  stored as 0.03. Returns null when the text is not a number, so a typo stages
 *  nothing rather than writing a figure nobody meant. */
function percentToFraction(text: string): string | null {
  const cleaned = text.replace('%', '').trim();
  if (cleaned === '') return '';
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return String(n / 100);
}

/** The option a stored value corresponds to, as the select's own value string.
 *  A rate stored as 0 and an option spelled "0.0" are the same rate, so a
 *  numeric column is matched numerically. Returns '' when nothing matches, which
 *  lands on the list's first entry. */
function optionValueFor(c: PricingColumn, value: unknown): string {
  if (!c.options?.length) return String(value ?? '');
  const asText = String(value ?? '');
  const exact = c.options.find((o) => o.value === asText);
  if (exact) return exact.value;
  const n = Number(value);
  if (value !== null && value !== undefined && value !== '' && Number.isFinite(n)) {
    const numeric = c.options.find((o) => o.value !== '' && Number(o.value) === n);
    if (numeric) return numeric.value;
  }
  return '';
}

/** What the code in a picklist cell stands for, for the hover. The grid shows
 *  the code; the words live here. */
function optionDescription(c: PricingColumn, value: unknown): string | undefined {
  if (!c.options?.length) return undefined;
  const match = c.options.find((o) => o.value === String(value ?? ''));
  return match?.description;
}

function cellText(c: PricingColumn, value: unknown): string {
  if (c.format === 'percent') return pct(value, true);
  if (c.key === 'price' || c.key === 'price_per_lot') return fmt(value, 0, true);
  if (c.key === 'width') return value === null || value === undefined ? '—' : String(value);
  if (value === null || value === undefined || value === '') return '—';
  // A picklist cell holds the option's value; the reader wants its label.
  if (c.options?.length) {
    const match = c.options.find((o) => o.value === String(value));
    if (match) return match.label;
  }
  return String(value);
}

export function PricingRegisterArtifact({
  config, onClose, schema, artifactId, onCommitFieldEdits,
}: Props) {
  const [rung, setRung] = useState<string>(config.default_rung || 'standard');
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  // A cell whose picklist the user answered with "type a value". Held
  // separately so choosing Custom swaps the control without committing an
  // empty rate on the way through.
  const [typingCustom, setTypingCustom] = useState<string | null>(null);
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
    const shown = staged
      ? (c.format === 'percent' ? pct(staged.value, true) : staged.value)
      : cellText(c, committed);

    if (target && editing === key) {
      const common = {
        className: styles.cellInput,
        autoFocus: true,
        onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
          const raw = e.target.value;
          const value = c.format === 'percent' ? percentToFraction(raw) : raw;
          // null means it did not parse as a number. Staging nothing is the
          // honest outcome — a typo must never become a stored rate.
          if (value !== null) {
            edits.stageEdit(target.cellPath, value, committed, target.expectedRef);
          }
          setEditing(null);
          setTypingCustom(null);
        },
      };
      if (c.options?.length && typingCustom !== key) {
        return (
          <td key={c.key} className={align(c)}>
            <select
              {...common}
              // Matched by VALUE, and numerically where the column is numeric:
              // a stored 0 and an option spelled "0.0" are the same rate, and
              // comparing them as strings opened the list on the wrong entry.
              defaultValue={optionValueFor(c, committed)}
              // On a list that allows a typed value, the blank entry means
              // "type one" — swap to the input rather than staging an empty.
              onChange={(e) => {
                if (c.allow_custom && e.target.value === '') setTypingCustom(key);
              }}
              onBlur={(e) => {
                if (c.allow_custom && e.target.value === '') return;
                common.onBlur(e);
              }}
              onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null); }}
            >
              {/* Open, the list spells the unit out; closed, the grid shows
                  the code alone. Choosing stays informed either way. */}
              {c.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.description ? `${o.label} — ${o.description}` : o.label}
                </option>
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
            inputMode={c.format === 'percent' ? 'decimal' : undefined}
            // A percent field is TYPED as a percent: 3 means 3%, not 300%.
            defaultValue={
              (() => {
                const v = staged ? staged.value : committed;
                if (v === null || v === undefined || v === '') return '';
                if (c.format === 'percent') {
                  const n = Number(v);
                  return Number.isFinite(n) ? String(Number((n * 100).toFixed(4))) : String(v);
                }
                return String(v);
              })()
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') { setEditing(null); setTypingCustom(null); }
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
        style={
          // Inherited from the project rather than set on this row. Still blue,
          // because a person did type it — just one level up. Dimmed so the
          // rows carrying their own rate are the ones that stand out.
          target && c.key === 'growth_rate' && row.growth_inherited && !staged
            ? { opacity: 0.6 }
            : undefined
        }
        title={
          // A code the column shows on its own says what it means here.
          optionDescription(c, committed)
            ? `${optionDescription(c, committed)}${target ? ' — click to change' : ''}`
            : target && c.key === 'growth_rate' && row.growth_inherited
            ? "From the project's growth assumption — type here to give this product its own rate"
            : target ? 'Click to change — this is an input'
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
        <div className={styles.hint}>
          Units, growth sources and growth rates all offer the platform&rsquo;s own
          lists. A rate that is not on the list is still a rate — choose
          &ldquo;Type a rate&rdquo; and enter 3 for 3%.
        </div>
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
