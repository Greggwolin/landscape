'use client';

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import styles from './ScheduleArtifact.module.css';
import { hierCellText, hierHeaderLabels } from './hierPath';
import { withExtraColumns } from './columnOrder';

/**
 * ScheduleArtifact — one topic plus one view specification.
 *
 * Budget artifact slice 1 (chat EB, 2026-07-31), built from the settled design:
 * BUDGET-ARTIFACT-SPEC-2026-07-31.html and BUDGET-ARTIFACT-MOCKUP-2026-07-31.html
 * rev 9 (authoritative where the two differ).
 *
 * WHY THIS IS NOT CALLED BudgetArtifact
 * -------------------------------------
 * The whole point of the design is that an artifact is never a bespoke
 * rendering — it is a topic plus a view specification, and the specification
 * generalizes. Budget is topic one; sales, cash flow, rent roll and
 * capitalization inherit this component with a different payload and no new
 * patterns to invent. Naming it after the first topic would invite the second
 * topic to be built again from scratch, which is the duplication this design
 * exists to prevent.
 *
 * WHAT SLICE 1 DOES
 * -----------------
 * Renders, read-only: the anatomy (header, binding chip, tile strip, control
 * bars, the boundary rule above the column headers, provenance footer), the
 * Summary and Detail rungs, level filters read from the project's own
 * configuration, the derivation popover on an amount, and truncation.
 *
 * WHAT SLICE 1 DELIBERATELY DOES NOT DO
 * -------------------------------------
 * Editing (slice 2) and export (slice 3). Editable cells carry the dashed
 * underline because that grammar is what is being judged here, but clicking one
 * says so plainly rather than pretending to accept a value.
 *
 * ARITHMETIC RULE
 * ---------------
 * Everything recomputed here — subtotals, percentages, cost per lot, counts —
 * is plain arithmetic over the rows already on screen, which is the one kind of
 * recalculation the design permits client-side. Nothing the calculation engine
 * owns (cash flow, NPV, returns) is ever re-derived here. That is how two
 * versions of the same number come to exist and quietly disagree.
 */

/* ─── Types (mirror params_json.budget_view_config) ────────────────────── */

export interface ScheduleLevelMember {
  id: number;
  label: string;
  parent_id: number | null;
}

export interface ScheduleLevel {
  level: number;
  label: string;
  members: ScheduleLevelMember[];
}

export interface ScheduleColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  kind?: string;
}

export interface ScheduleOptionalColumn {
  key: string;
  label: string;
  available: boolean;
  reason: string | null;
}

export interface ScheduleDerivation {
  quantity: number | null;
  uom: string | null;
  rate: number | null;
  total: number | null;
  basis: string | null;
}

export interface ScheduleRow {
  id: string;
  scope: Record<string, number>;
  cells: Record<string, string | number | null>;
  derivation?: ScheduleDerivation;
  editable?: string[];
}

export interface ScheduleGroupOption {
  value: string;
  label: string;
  available?: boolean;
}

export interface ScheduleViewConfig {
  topic: string;
  kicker: string;
  title: string;
  source_label: string;
  binding: { state: string; label: string };
  basis: { value: string; label: string };
  levels: ScheduleLevel[];
  columns: ScheduleColumn[];
  rung_columns: Record<string, string[]>;
  default_rung: string;
  default_grouping: string;
  group_options: ScheduleGroupOption[];
  optional_columns: ScheduleOptionalColumn[];
  rows: ScheduleRow[];
  denominators: { lots: number | null; lots_scope: string };
  totals: { amount: number };
  row_count: number;
  truncate_at: number;
  generated_at: string;
  project_id: number;
}

interface Props {
  config: ScheduleViewConfig;
  onClose?: () => void;
}

/* ─── Formatting ───────────────────────────────────────────────────────── */

/** Thousands separators, parentheses for negatives, em dash for zero/absent,
 *  no currency symbol. The universal tabular standard, same as every other
 *  schedule surface. */
function formatNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (n === 0) return '—';
  const abs = Math.abs(n);
  const body = abs.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return n < 0 ? `(${body})` : body;
}

function formatMoney(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const body = `$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return value < 0 ? `(${body})` : body;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}

function formatText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
}

/* ─── Component ────────────────────────────────────────────────────────── */

export function ScheduleArtifact({ config, onClose }: Props) {
  // The view specification, held as state. Chat composes it; these controls
  // tune what came back.
  // A level holds a SET of chosen members, not one. Selecting two villages
  // means both, and the arithmetic below sums across them.
  const [scope, setScope] = useState<Record<number, number[]>>({});
  const [rung, setRung] = useState<string>(config.default_rung);
  const [grouping, setGrouping] = useState<string>(config.default_grouping);
  const [extraColumns, setExtraColumns] = useState<string[]>([]);
  const [derivationRow, setDerivationRow] = useState<ScheduleRow | null>(null);
  const [editHint, setEditHint] = useState<string | null>(null);

  /* Rows in scope. Scope addresses LEVELS, never names. */
  const visibleRows = useMemo(() => {
    const picked = Object.entries(scope).filter(([, ids]) => ids.length > 0);
    if (picked.length === 0) return config.rows;
    return config.rows.filter((row) =>
      picked.every(([level, ids]) => ids.includes(row.scope?.[level] as number)));
  }, [config.rows, scope]);

  /* Level chip rows. A level appears only once the level above it has been
   * picked, and its members are always scoped to that choice — never all
   * members of the level across the whole project. */
  const levelRows = useMemo(() => {
    const out: { level: ScheduleLevel; members: ScheduleLevelMember[] }[] = [];
    let parentIds: number[] = [];
    for (let i = 0; i < config.levels.length; i += 1) {
      const level = config.levels[i];
      const members = i === 0
        ? level.members
        : level.members.filter((m) => m.parent_id !== null
            && (parentIds as number[]).includes(m.parent_id));
      if (members.length === 0) break;
      out.push({ level, members });
      const picked = scope[level.level];
      if (!picked || picked.length === 0) break;
      parentIds = picked;
    }
    return out;
  }, [config.levels, scope]);

  const scopeLabel = useMemo(() => {
    const parts: string[] = [];
    for (const { level, members } of levelRows) {
      const picked = scope[level.level] ?? [];
      const labels = members
        .filter((m) => picked.includes(m.id))
        .map((m) => composeMember(level.label, m.label));
      if (labels.length) parts.push(labels.join(' + '));
    }
    return parts.join(' · ');
  }, [levelRows, scope]);

  const isScoped = scopeLabel.length > 0;

  /* Grouping key for a row. */
  const groupOf = (row: ScheduleRow): string => {
    if (grouping === 'none') return '';
    const raw = row.cells[grouping];
    return raw === null || raw === undefined || raw === ''
      ? '(uncategorized)'
      : String(raw);
  };

  const scopeTotal = useMemo(
    () => visibleRows.reduce((sum, r) => sum + (Number(r.cells.amount) || 0), 0),
    [visibleRows],
  );

  /* Summary rung: one row per group. Groups totalling zero are dropped —
   * "no zero rows" — and counted into the exclusion line so the omission is
   * stated rather than silent. */
  const summary = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of visibleRows) {
      const key = groupOf(row) || 'All lines';
      totals.set(key, (totals.get(key) ?? 0) + (Number(row.cells.amount) || 0));
    }
    const all = Array.from(totals.entries());
    const kept = all.filter(([, amount]) => amount !== 0);
    kept.sort((a, b) => b[1] - a[1]);
    return { kept, droppedZero: all.length - kept.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRows, grouping]);

  /* The hierarchy column — always first, and its contents follow the filter.
   *
   * It shows the levels the filter has NOT pinned. Pick one Village and the
   * Village drops out of the cell (it is in the title now) leaving the Phase;
   * pin the Phase too and the column disappears entirely, which is the same
   * rule every other column obeys — anything constant belongs in the title.
   * Labels come from the project's own configuration, never from a hard-coded
   * word: level 1 here is called Village even though its members are named
   * "Area 1".."Area 4", which is exactly the trap this rule exists to avoid.
   */
  const HIER_KEY = '__hier';

  /* A member is stored as a number; its name is the level's own label plus that
   * number. Compose it here so renaming a level in project setup renames every
   * member with it, and nothing anywhere hard-codes the word. Members are ALWAYS
   * numbers — there is no facility for naming an individual member. The label is
   * the configurable part, and it belongs to the level, shared by every member
   * of it. The digit test below is not a name/number branch: it guards legacy
   * baked strings in the stored data, where the label was already folded into
   * the member and prefixing again would double it.
   *
   * A function declaration, not a const arrow: scopeLabel's useMemo above calls
   * this during render, so a const would still be in its temporal dead zone and
   * throw the moment a filter is actually applied. It closes over nothing,
   * which is what makes hoisting safe here. */
  function composeMember(levelLabel: string, member: string) {
    return /\d/.test(member) ? `${levelLabel} ${member}` : member;
  }

  const memberLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const level of config.levels) {
      for (const m of level.members) {
        map[`${level.level}:${m.id}`] = composeMember(level.label, m.label);
      }
    }
    return map;
  }, [config.levels]);

  /* A level is shown when the filter has not narrowed it to a single member. */
  const openLevels = useMemo(
    () => config.levels
      .map((l) => l.level)
      .filter((lv) => (scope[lv] ?? []).length !== 1),
    [config.levels, scope],
  );

  /* Only the deepest segment. A member number carries its own ancestry \u2014 the
   * `1` in Phase `1.2` IS Village 1 \u2014 so naming the ancestor as well states it
   * twice. See ./hierPath.ts for the rule and its tests. */
  const hierPath = (row: ScheduleRow) =>
    hierCellText(openLevels, row.scope, memberLabel);

  /* The header names only the levels the cells actually end on, not every open
   * level: if every row bottoms out at phase, the column is Phase. */
  const hierHeader = useMemo(
    () => hierHeaderLabels(visibleRows, openLevels, memberLabel, config.levels),
    [visibleRows, openLevels, memberLabel, config.levels],
  );

  /* It earns its place on the same terms as everything else: only if the rows
   * actually differ on it. */
  const showHier = useMemo(() => {
    if (openLevels.length === 0) return false;
    const seen = new Set(visibleRows.map(hierPath));
    seen.delete('');
    return seen.size > 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRows, openLevels, memberLabel]);

  /* Which columns earn their place. A column belongs when it VARIES across the
   * visible rows; anything constant is in the title instead. */
  const activeColumns = useMemo(() => {
    // An extra takes its canonical place in the reading order, not the end of
    // the row: turning Stage on puts it between Category and Description, where
    // config.columns says it belongs. Insertion, never a sort — see
    // ./columnOrder.ts for why the summary rung makes a sort unsafe.
    const keys = withExtraColumns(
      config.rung_columns[rung] ?? config.rung_columns.standard ?? [],
      extraColumns,
      config.columns,
    );
    const distinct = (key: string) =>
      new Set(visibleRows.map((r) => String(r.cells[key] ?? ''))).size;
    const cols = keys
      .filter((key) => {
        // Drop a constant dimension — it is not telling you anything the title
        // is not already telling you.
        // An explicitly requested column always shows. The constant-drop rule
        // below is an automatic tidy-up, not a veto over what was asked for —
        // asking for Stage and getting nothing is indistinguishable from broken.
        if (extraColumns.includes(key)) return true;
        if ((key === 'category' || key === 'stage') && visibleRows.length > 1) {
          return distinct(key) > 1;
        }
        return true;
      })
      .map((key) => config.columns.find((c) => c.key === key))
      .filter((c): c is ScheduleColumn => Boolean(c));
    if (showHier) {
      cols.unshift({ key: HIER_KEY, label: hierHeader, align: 'left', kind: 'text' });
    }
    return cols;
     
  }, [config.columns, config.rung_columns, rung, extraColumns, visibleRows,
      showHier, hierHeader]);

  /* Line rows, grouped into sections with subtotals. */
  const sections = useMemo(() => {
    if (grouping === 'none') {
      return [{ label: '', rows: visibleRows, subtotal: scopeTotal }];
    }
    const buckets = new Map<string, ScheduleRow[]>();
    for (const row of visibleRows) {
      const key = groupOf(row);
      const list = buckets.get(key);
      if (list) list.push(row); else buckets.set(key, [row]);
    }
    return Array.from(buckets.entries()).map(([label, rows]) => ({
      label,
      rows,
      subtotal: rows.reduce((s, r) => s + (Number(r.cells.amount) || 0), 0),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRows, grouping, scopeTotal]);

  const lineCount = visibleRows.length;

  /* Groups collapse. A schedule opens showing its groups and their totals, and
   * you open the one you want — which is how you read a schedule on paper.
   * This replaces the old truncate-and-Show-all behaviour: an arbitrary cut at
   * N rows hid whichever lines happened to fall past the cut, with no way to
   * tell what was missing or to reach one group without loading everything. */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleSection = (label: string) =>
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  const isOpen = (label: string) => (label ? expanded[label] === true : true);

  /* KPI tiles. They follow the filter, not the whole project — a scoped figure
   * never wears an unscoped label. */
  const kpis = useMemo(() => {
    const categories = new Set(
      visibleRows.map((r) => String(r.cells.category ?? '')).filter(Boolean),
    ).size;
    const tiles: { label: string; value: string }[] = [
      {
        label: isScoped ? `${scopeLabel} budget` : 'Total budget',
        value: formatMoney(scopeTotal),
      },
      { label: 'Line items', value: String(lineCount) },
      { label: 'Categories', value: String(categories) },
    ];
    if (isScoped) {
      const share = config.totals.amount
        ? (scopeTotal / config.totals.amount) * 100 : NaN;
      tiles.push({ label: '% of project', value: formatPercent(share) });
    } else if (config.denominators.lots) {
      // Cost per lot is offered at PROJECT scope only. Parcels are not linked
      // to divisions in the data, so a scoped cost per lot would need a
      // denominator we do not have — and a plausible denominator is worse than
      // no tile at all.
      tiles.push({
        label: 'Cost / lot',
        value: formatMoney(scopeTotal / config.denominators.lots),
      });
    }
    return tiles;
  }, [visibleRows, isScoped, scopeLabel, scopeTotal, lineCount, config]);

  const title = isScoped ? `${config.title} — ${scopeLabel}` : config.title;

  const toggleScope = (level: number, id: number) => {
    setScope((prev) => {
      const next: Record<number, number[]> = {};
      // Releasing or changing a level releases every level beneath it — the chip
      // row for a child level cannot outlive its parent's selection, and a new
      // parent set may not contain the children already picked.
      for (const [key, value] of Object.entries(prev)) {
        if (Number(key) < level) next[Number(key)] = value;
      }
      const current = prev[level] ?? [];
      const toggled = current.includes(id)
        ? current.filter((v) => v !== id)
        : [...current, id];
      if (toggled.length > 0) next[level] = toggled;
      return next;
    });
  };

  const toggleColumn = (key: string) => {
    setExtraColumns((prev) => prev.includes(key)
      ? prev.filter((k) => k !== key)
      : [...prev, key]);
  };

  const renderCell = (row: ScheduleRow, column: ScheduleColumn) => {
    if (column.key === HIER_KEY) {
      return <td key={column.key} className={styles.hier}>{hierPath(row)}</td>;
    }
    const raw = row.cells[column.key];
    const numeric = column.kind === 'number' || column.kind === 'computed';
    const align = column.align === 'right' ? styles.right
      : column.align === 'center' ? styles.center : undefined;

    if (column.key === 'amount') {
      return (
        <td key={column.key} className={`${styles.right}`}>
          <span
            className={styles.computed}
            title="Double-click to see how this was reached"
            onDoubleClick={() => setDerivationRow(row)}
          >
            {formatNumber(raw)}
          </span>
        </td>
      );
    }

    const editable = (row.editable ?? []).includes(column.key);
    const text = numeric ? formatNumber(raw) : formatText(raw);
    return (
      <td key={column.key} className={align}>
        {editable ? (
          <span
            className={styles.editable}
            role="button"
            tabIndex={0}
            onClick={() => setEditHint(
              'Editing this schedule arrives in the next slice — this view is read-only for now.',
            )}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditHint(
              'Editing this schedule arrives in the next slice — this view is read-only for now.',
            ); }}
          >
            {text}
          </span>
        ) : (
          <span className={raw === null || raw === undefined || raw === ''
            ? styles.emptyCell : undefined}
          >
            {text}
          </span>
        )}
      </td>
    );
  };

  const colCount = rung === 'summary' ? 3 : activeColumns.length;
  /* A total belongs under the numbers it totals. Spanning to the last column
   * put it under Duration, which reads as a duration. */
  const amountAt = activeColumns.findIndex((c) => c.key === 'amount');
  const labelSpan = Math.max(1, amountAt < 0 ? colCount - 1 : amountAt);
  const trailingSpan = amountAt < 0 ? 0 : colCount - amountAt - 1;

  return (
    <div className={styles.root} style={{ position: 'relative' }}>
      {/* ── Header ── */}
      <div className={styles.head}>
        <div className={styles.kicker}>
          <span>{config.kicker}</span>
          {onClose && (
            <span className={styles.headActions}>
              <button type="button" className={styles.iconBtn} onClick={onClose} title="Close">
                <X size={14} />
              </button>
            </span>
          )}
        </div>
        <div className={styles.titleRow}>
          <div className={styles.title}>{title}</div>
          <div className={styles.titleBadges}>
            <span className={`${styles.badge} ${styles.badgeLive}`}>
              ● {config.binding.label}
            </span>
            <span className={`${styles.badge} ${styles.badgeBasis}`}>
              {config.basis.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tile strip ── */}
      <div className={styles.kpis}>
        {kpis.map((tile) => (
          <div className={styles.kpi} key={tile.label}>
            <div className={styles.kpiLabel}>{tile.label}</div>
            <div className={styles.kpiValue}>{tile.value}</div>
          </div>
        ))}
      </div>

      {/* ── Level chip rows — labels read from the project's own setup ── */}
      {levelRows.map(({ level, members }) => (
        <div className={styles.bar} key={level.level}>
          <span className={styles.barLabel}>{level.label}</span>
          {members.map((member) => (
            <button
              type="button"
              key={member.id}
              className={`${styles.badge}${(scope[level.level] ?? []).includes(member.id)
                ? ` ${styles.badgeOn}` : ''}`}
              onClick={() => toggleScope(level.level, member.id)}
            >
              {member.label}
            </button>
          ))}
        </div>
      ))}

      {/* ── Column chips — hidden columns are removable chips, not a menu ── */}
      {rung !== 'summary' && (
        <div className={styles.bar}>
          <span className={styles.barLabel}>Columns</span>
          {config.optional_columns.map((column) => {
            const on = extraColumns.includes(column.key);
            return (
              <button
                type="button"
                key={column.key}
                disabled={!column.available}
                title={column.reason ?? undefined}
                className={`${styles.badge} ${on ? styles.badgeOn : styles.badgeGhost}`}
                onClick={() => toggleColumn(column.key)}
              >
                {column.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Detail rung and grouping ── */}
      <div className={styles.bar}>
        <span className={styles.barLabel}>Detail</span>
        {['summary', 'standard', 'detail'].map((value) => (
          <button
            type="button"
            key={value}
            className={`${styles.badge}${rung === value ? ` ${styles.badgeOn}` : ''}`}
            onClick={() => setRung(value)}
          >
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </button>
        ))}
        <span style={{ width: 10 }} />
        {config.group_options
          .filter((option) => option.available !== false)
          .map((option) => (
            <button
              type="button"
              key={option.value}
              className={`${styles.badge}${grouping === option.value
                ? ` ${styles.badgeOn}` : ''}`}
              onClick={() => setGrouping(option.value)}
            >
              Group: {option.label}
            </button>
          ))}
      </div>

      {/* ── The schedule ── */}
      <div className={styles.scroll}>
        {visibleRows.length === 0 ? (
          <div className={styles.emptyState}>
            Nothing budgeted under {scopeLabel || 'this scope'} yet.
          </div>
        ) : rung === 'summary' ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{grouping === 'none' ? 'All lines'
                  : grouping.charAt(0).toUpperCase() + grouping.slice(1)}</th>
                <th className={styles.right}>Amount</th>
                <th className={styles.right}>
                  {isScoped ? '% of scope' : '% of total'}
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.kept.map(([label, amount]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td className={styles.right}>{formatNumber(amount)}</td>
                  <td className={`${styles.right} ${styles.computed}`}>
                    {formatPercent(scopeTotal ? (amount / scopeTotal) * 100 : NaN)}
                  </td>
                </tr>
              ))}
              <tr className={styles.totalRow}>
                <td>{isScoped ? `${scopeLabel} total` : 'Total'}</td>
                <td className={styles.right}>{formatNumber(scopeTotal)}</td>
                <td className={styles.right}>100.0%</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table className={`${styles.table} ${styles.tableGrouped}`}>
            <thead>
              <tr>
                {activeColumns.map((column) => (
                  <th
                    key={column.key}
                    className={column.align === 'right' ? styles.right
                      : column.align === 'center' ? styles.center : undefined}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => {
                const open = isOpen(section.label);
                return (
                <React.Fragment key={section.label || 'all'}>
                  {section.label && (
                    <tr
                      className={`${styles.sectionRow} ${styles.sectionClickable}`}
                      onClick={() => toggleSection(section.label)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={open}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSection(section.label);
                        }
                      }}
                    >
                      <td colSpan={labelSpan}>
                        <span className={styles.caret}>{open ? '\u25be' : '\u25b8'}</span>
                        {section.label}
                        <span className={styles.sectionCount}>
                          {section.rows.length}
                        </span>
                      </td>
                      {/* A closed group still shows its number — collapsing
                          hides the detail, never the total. */}
                      <td className={styles.right}>{formatNumber(section.subtotal)}</td>
                      {trailingSpan > 0 && <td colSpan={trailingSpan} />}
                    </tr>
                  )}
                  {open && section.rows.map((row) => (
                    <tr key={row.id}>
                      {activeColumns.map((column) => renderCell(row, column))}
                    </tr>
                  ))}
                  {section.label && open && (
                    <tr className={styles.subtotalRow}>
                      <td colSpan={labelSpan}>
                        {section.label} subtotal
                      </td>
                      <td className={styles.right}>{formatNumber(section.subtotal)}</td>
                      {trailingSpan > 0 && <td colSpan={trailingSpan} />}
                    </tr>
                  )}
                </React.Fragment>
                );
              })}
              {(
                <tr className={styles.totalRow}>
                  <td colSpan={labelSpan}>
                    {isScoped ? `${scopeLabel} total` : 'Total'}
                  </td>
                  <td className={styles.right}>{formatNumber(scopeTotal)}</td>
                  {trailingSpan > 0 && <td colSpan={trailingSpan} />}
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>


      {editHint && <div className={styles.hint}>{editHint}</div>}

      {rung === 'summary' && summary.droppedZero > 0 && (
        <div className={styles.excluded}>
          {summary.droppedZero} group{summary.droppedZero === 1 ? '' : 's'} excluded — nothing budgeted
        </div>
      )}

      {/* ── Footer. Mandatory: every artifact says where it came from. ── */}
      <div className={styles.foot}>
        <span>
          Generated from {config.source_label} · {formatTimestamp(config.generated_at)}
        </span>
        <span>values trace: read</span>
      </div>

      {/* ── Derivation. It refuses AND shows the working. ── */}
      {derivationRow && (
        <>
          <div
            className={styles.popShade}
            onClick={() => setDerivationRow(null)}
            role="presentation"
          />
          <div className={styles.pop} style={{ top: 210 }}>
            <div className={styles.popTitle}>
              {formatText(derivationRow.cells.description)}
            </div>
            <dl className={styles.popList}>
              <dt>Quantity</dt>
              <dd>
                {formatNumber(derivationRow.derivation?.quantity)}
                {derivationRow.derivation?.uom
                  ? ` ${String(derivationRow.derivation.uom).replace('$/', '')}` : ''}
              </dd>
              <dt>Rate</dt>
              <dd>
                {formatMoney(derivationRow.derivation?.rate ?? null)}
                {derivationRow.derivation?.uom
                  ? ` ${String(derivationRow.derivation.uom).replace('$', '')}` : ''}
              </dd>
            </dl>
            <div className={styles.popRule} />
            <dl className={styles.popList}>
              <dt><b>Total</b></dt>
              <dd><b>{formatMoney(derivationRow.derivation?.total ?? null)}</b></dd>
            </dl>
            {derivationRow.derivation?.basis && (
              <>
                <div className={styles.popRule} />
                <dl className={styles.popList}>
                  <dt>Basis</dt>
                  <dd>{derivationRow.derivation.basis}</dd>
                </dl>
              </>
            )}
            <div className={styles.popFoot}>
              The amount is quantity × rate. Change the rate or the unit of
              measure to move it.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ScheduleArtifact;
