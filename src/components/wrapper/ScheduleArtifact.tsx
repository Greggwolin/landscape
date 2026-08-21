'use client';

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { BlockDocument } from '@/types/artifact';
import styles from './ScheduleArtifact.module.css';
import { hierCellText, hierHeaderLabels } from './hierPath';
import { withExtraColumns } from './columnOrder';
import { buildLevelRows } from './levelRows';
import { budgetCellTarget, budgetColumnOptions, budgetEditability } from './budgetCellTarget';
import { useStagedEdits, stagedKey, type CommitEditsFn } from './useStagedEdits';

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
  /** Allowed values for a constrained cell, read from the table that
   *  constrains it. Free text into a foreign key earns a database rejection
   *  and nothing else, so the artifact carries the choices. */
  options?: Array<{ value: string | number; label: string; parent_id?: number | null; stages?: string[] }>;
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
  /** `boolean` is real, not defensive: cf_start is a flag on the budget line
   *  and the view specification sends it as one. */
  cells: Record<string, string | number | boolean | null>;
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
  /**
   * The artifact's BLOCK SCHEMA. Slice 2 needs it because that is where the
   * per-cell `cell_source_refs` live, and the server resolves a write against
   * the stored schema — not against this view specification. See
   * budgetCellTarget for why the mapping goes through the shared `b{n}` row id.
   * Absent (an older artifact, or a caller that has not wired it) → the table
   * renders exactly as slice 1 did, read-only.
   */
  schema?: BlockDocument | null;
  /** Clears staging when the panel switches artifacts. */
  artifactId?: number;
  /** Batch commit. Without it nothing is editable — staging has nowhere to go. */
  onCommitFieldEdits?: CommitEditsFn;
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

/** Reading order of the detail ladder. A rung the specification does not define
 *  is not offered; a rung it defines that is missing here is a bug in this
 *  constant, which is why it lives next to the component that renders it. */
const RUNG_ORDER = ['summary', 'standard', 'detail', 'all'] as const;

/* ─── Component ────────────────────────────────────────────────────────── */

export function ScheduleArtifact({
  config,
  onClose,
  schema,
  artifactId,
  onCommitFieldEdits,
}: Props) {
  // The view specification, held as state. Chat composes it; these controls
  // tune what came back.
  // A level holds a SET of chosen members, not one. Selecting two villages
  // means both, and the arithmetic below sums across them.
  const [scope, setScope] = useState<Record<number, number[]>>({});
  const [rung, setRung] = useState<string>(config.default_rung);
  const [grouping, setGrouping] = useState<string>(config.default_grouping);
  const [extraColumns, setExtraColumns] = useState<string[]>([]);
  const [derivationRow, setDerivationRow] = useState<ScheduleRow | null>(null);

  /* ── Editing (slice 2) ───────────────────────────────────────────────────
   * The store is the SHARED one (useStagedEdits), not a second copy living in
   * this file. `editingKey` is the single cell currently open for typing —
   * local view state, deliberately not in the shared store, which holds only
   * what has been staged.
   */
  const staging = useStagedEdits(onCommitFieldEdits, artifactId);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>('');
  /* Options for a constrained cell.
   *
   * The view specification carries them per column (slice 2b), read from the
   * table that constrains the value. The block schema is the fallback for
   * artifacts built before that — UOM has ridden there since CB10. Column
   * first, because it is the fresher of the two. */
  const optionsFor = React.useCallback(
    (column: ScheduleColumn): Array<{ value: string; label: string }> | null => {
      if (column.options?.length) {
        return column.options.map((o) => ({ value: String(o.value), label: o.label }));
      }
      return budgetColumnOptions(schema, column.key);
    },
    [schema],
  );

  /* Categories narrow by the row's stage, the way the original form does.
   * A category with no stages recorded is offered everywhere rather than
   * hidden — an empty junction table should not empty the dropdown. */
  const categoriesForStage = React.useCallback(
    (column: ScheduleColumn, stage: unknown) => {
      const all = (column.options ?? []).map(
        (o) => ({ value: String(o.value), label: o.label }),
      );
      const s = stage == null ? '' : String(stage);
      if (!s) return all;
      const narrowed = (column.options ?? [])
        .filter((o) => !o.stages?.length || o.stages.includes(s))
        .map((o) => ({ value: String(o.value), label: o.label }));

      /* NEVER STRAND A ROW.
       *
       * Narrowing is a convenience, not a constraint — the database does not
       * require a category to be linked to a stage. Measured on project 9: rows
       * carry the legacy stage 'Development', which almost nothing in
       * core_category_lifecycle_stages links to, so narrowing 289 categories by
       * it left FOUR, and they were operating-expense categories with no
       * bearing on a land-development line. A dropdown that is technically
       * populated and practically useless reads exactly like one that is
       * broken — which is how it was reported.
       *
       * So a narrowing that would leave the user with almost nothing yields to
       * the full list. Better a longer list than a wrong one. */
      return narrowed.length >= 5 ? narrowed : all;
    },
    [],
  );
  /* Editing is possible only when there is somewhere to send it, a schema to
   * resolve refs from, AND that schema can back EVERY cell this surface offers.
   *
   * The last condition is the UB4 fix. The stored block schema is only rewritten
   * when something commits, so a budget saved before slice 2 still carries refs
   * for qty/rate/uom alone. Rendering that artifact cell-by-cell gave a table
   * where Rate and UOM were editable and Start and Duration silently were not —
   * indistinguishable, from the user's side, from a bug. All or none, with a
   * reason shown. */
  const editability = useMemo(
    () => budgetEditability(schema, config.rows),
    [schema, config.rows],
  );
  const canEdit = Boolean(onCommitFieldEdits && schema) && editability.usable;
  const staleForEditing = Boolean(onCommitFieldEdits && schema)
    && !editability.usable;

  /* Rows in scope. Scope addresses LEVELS, never names. */
  const visibleRows = useMemo(() => {
    const picked = Object.entries(scope).filter(([, ids]) => ids.length > 0);
    if (picked.length === 0) return config.rows;
    return config.rows.filter((row) =>
      picked.every(([level, ids]) => ids.includes(row.scope?.[level] as number)));
  }, [config.rows, scope]);

  /* Level chip rows. Level 2 is built up front — ghosted until a level-1 member
   * is picked — so the filter shows that a second level exists instead of
   * hiding it. Level 3 and below still wait for their parent. See
   * ./levelRows.ts for the rule and its tests. */
  const levelRows = useMemo(
    () => buildLevelRows<ScheduleLevelMember, ScheduleLevel>(config.levels, scope),
    [config.levels, scope],
  );

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
        /* A column you have grouped BY is repeated down every row inside its
         * own group — the heading already says it. Hiding it is not a tidy-up
         * like the constant-drop rule below; it is removing a literal
         * duplication of the group heading. Applies to any groupable column,
         * not just category, so grouping by stage hides stage too. */
        if (grouping !== 'none' && key === grouping) return false;
        if (extraColumns.includes(key)) return true;
        // The `all` rung is the one you BUILD a line on, and a line needs a
        // category and a stage to exist. Dropping them because every existing
        // row happens to share one leaves no way to set them on a new row —
        // the tidy-up defeating the rung's whole purpose.
        if (rung === 'all') return true;
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
      showHier, hierHeader, grouping]);

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

    const text = numeric ? formatNumber(raw) : formatText(raw);

    /* What is editable is decided by the SERVER's per-cell refs, resolved
     * through the block schema — not by a list in this file. `row.editable`
     * from the view spec is only the slice-1 affordance hint; if the two ever
     * disagree, the refs win, because the refs are what the write path will
     * actually accept. */
    const target = canEdit ? budgetCellTarget(schema, row.id, column.key) : null;
    if (!target) {
      return (
        <td key={column.key} className={align}>
          <span className={raw === null || raw === undefined || raw === ''
            ? styles.emptyCell : undefined}
          >
            {text}
          </span>
        </td>
      );
    }

    const key = stagedKey(target.cellPath);
    const entry = staging.staged[key];

    /* Which editor this cell gets. Driven by the column's KIND, which the view
     * specification sets from the shape of the underlying column — a picklist
     * because the database constrains it, a date because it is a date. The
     * renderer never decides this from the column name. */
    const options = column.key === 'category'
      ? categoriesForStage(column, row.cells.stage)
      : optionsFor(column);
    const isBoolean = column.kind === 'boolean';
    const isDate = column.kind === 'date';

    const commitDraft = (value: string) => {
      staging.stageEdit(target.cellPath, value, raw, target.expectedRef);
      setEditingKey(null);
    };

    /* A checkbox has no "open for editing" state — one click IS the edit. */
    if (isBoolean) {
      const current = entry ? entry.value === 'true' : Boolean(raw);
      return (
        <td key={column.key} className={align}>
          <input
            type="checkbox"
            checked={current}
            title={entry ? 'Staged — commit to save' : undefined}
            className={entry ? styles.stagedCheckbox : undefined}
            onChange={(e) => staging.stageEdit(
              target.cellPath, String(e.target.checked),
              raw === true ? 'true' : 'false', target.expectedRef,
            )}
          />
          {entry && (
            <span className={styles.priorValue}>
              was {raw ? 'yes' : 'no'}
            </span>
          )}
        </td>
      );
    }

    if (editingKey === key) {
      return (
        <td key={column.key} className={align}>
          {options ? (
            <select
              className={styles.cellInput}
              autoFocus
              value={draft}
              onChange={(e) => commitDraft(e.target.value)}
              onBlur={() => setEditingKey(null)}
              onKeyDown={(e) => { if (e.key === 'Escape') setEditingKey(null); }}
            >
              {/* A cell can be empty today; without this the dropdown would
                * silently show the first option as though it were the value. */}
              <option value="">—</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input
              className={styles.cellInput}
              autoFocus
              type={isDate ? 'date' : 'text'}
              value={draft}
              inputMode={numeric && !isDate ? 'numeric' : undefined}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => commitDraft(draft)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitDraft(draft);
                if (e.key === 'Escape') setEditingKey(null);
              }}
            />
          )}
        </td>
      );
    }

    /* Staged: show the typed value, and keep the PRIOR value visible beside it.
     * The user staged several edits before committing; they must be able to see
     * what each one is replacing without undoing it to look. */
    const openEditor = () => {
      setDraft(entry ? entry.value : String(raw ?? ''));
      setEditingKey(key);
    };

    /* A picklist cell stores an id and must SHOW a name. Rendering the raw
     * value would put `629` where the user wrote "Area 3". Falls back to the
     * raw value when the options list cannot explain it — an id with no
     * matching option is worth seeing, not hiding. */
    const labelFor = (value: unknown) => {
      if (!options) return null;
      const hit = options.find((o) => o.value === String(value ?? ''));
      return hit ? hit.label : null;
    };
    const displayText = options
      ? (labelFor(entry ? entry.value : raw) ?? (entry ? entry.value : text))
      : (entry ? entry.value : text);

    return (
      <td key={column.key} className={align}>
        <span
          className={entry ? styles.stagedCell : styles.editable}
          role="button"
          tabIndex={0}
          title={entry ? 'Staged — commit to save' : 'Double-click to edit'}
          onDoubleClick={openEditor}
          onKeyDown={(e) => { if (e.key === 'Enter') openEditor(); }}
        >
          {displayText}
        </span>
        {entry && (
          <span className={styles.priorValue} title="Value before this edit">
            was {options ? (labelFor(raw) ?? text) : text}
          </span>
        )}
        {entry?.error && (
          <span className={styles.cellError}>{entry.error}</span>
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
      {/* A stored artifact that predates the current builder cannot back every
        * editable cell. Say so once, plainly, instead of letting the user
        * discover it one dead cell at a time. */}
      {staleForEditing && (
        <div className={styles.staleNotice} role="status">
          This budget was saved before these fields became editable, so it is
          read-only. Ask for the budget schedule again to refresh it
          {editability.missing.length > 0
            ? ` (missing: ${editability.missing.join(', ')})`
            : ''}
          .
        </div>
      )}

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
      {levelRows.map(({ level, members, enabledIds }) => (
        <div className={styles.bar} key={level.level}>
          <span className={styles.barLabel}>{level.label}</span>
          {members.map((member) => {
            // A member whose parent is not picked stays on screen, ghosted and
            // genuinely disabled — the real attribute, not just the class, so
            // it announces itself and toggleScope cannot be reached.
            const selectable = enabledIds.has(member.id);
            const on = (scope[level.level] ?? []).includes(member.id);
            return (
              <button
                type="button"
                key={member.id}
                disabled={!selectable}
                title={selectable
                  ? undefined
                  : `Pick a ${config.levels[0].label} to choose a ${level.label}`}
                className={`${styles.badge} ${on
                  ? styles.badgeOn
                  : (!selectable ? styles.badgeLocked : '')}`}
                onClick={() => toggleScope(level.level, member.id)}
              >
                {member.label}
              </button>
            );
          })}
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
        {/* Driven by the SPECIFICATION, not a list in this file. The server has
          * defined four rungs since slice 1 while this array offered three, so
          * `all` — the rung you use to build a budget rather than read one —
          * was unreachable. Same class of drift as slice 1's stale `editable`
          * list: two places describing one thing, one of them wrong. */}
        {RUNG_ORDER.filter((value) => config.rung_columns[value]).map((value) => (
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

      {/* ── Commit bar (slice 2) ──
        * Sits directly under the badge row and above the table it acts on,
        * where the eye already is — it used to float above the header, away
        * from the rows being changed.
        * Appears only once something is staged. Nothing posts on a keystroke:
        * the whole set lands through ONE batch request, which is what makes a
        * single impact line for the set meaningful. */}
      {staging.stagedCount > 0 && (
        <div className={styles.commitBar} role="region" aria-label="Staged changes">
          <span className={styles.commitCount}>
            {staging.stagedCount} change{staging.stagedCount === 1 ? '' : 's'} staged
          </span>
          <span className={styles.commitActions}>
            <button
              type="button"
              className={styles.commitButton}
              disabled={staging.committing}
              onClick={() => { void staging.commitStaged(); }}
            >
              {staging.committing ? 'Saving…' : 'Commit'}
            </button>
            <button
              type="button"
              className={styles.discardButton}
              disabled={staging.committing}
              onClick={staging.discardStaged}
            >
              Discard
            </button>
          </span>
        </div>
      )}


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
                {/* Quantity is edited HERE, not in the table: slice 1 rev 4
                  * removed the quantity columns from the table and moved the
                  * number into this popover, which is where it is actually
                  * wanted. It stages into the same shared store as every table
                  * cell and lands in the same batch. */}
                {(() => {
                  const target = canEdit
                    ? budgetCellTarget(schema, derivationRow.id, 'qty')
                    : null;
                  const qty = derivationRow.derivation?.quantity ?? null;
                  if (!target) return formatNumber(qty);
                  const key = stagedKey(target.cellPath);
                  const entry = staging.staged[key];
                  if (editingKey === key) {
                    return (
                      <input
                        className={styles.cellInput}
                        autoFocus
                        inputMode="numeric"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => {
                          staging.stageEdit(target.cellPath, draft, qty, target.expectedRef);
                          setEditingKey(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            staging.stageEdit(target.cellPath, draft, qty, target.expectedRef);
                            setEditingKey(null);
                          }
                          if (e.key === 'Escape') setEditingKey(null);
                        }}
                      />
                    );
                  }
                  return (
                    <>
                      <span
                        className={entry ? styles.stagedCell : styles.editable}
                        role="button"
                        tabIndex={0}
                        title={entry ? 'Staged — commit to save' : 'Double-click to edit'}
                        onDoubleClick={() => {
                          setDraft(entry ? entry.value : String(qty ?? ''));
                          setEditingKey(key);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setDraft(entry ? entry.value : String(qty ?? ''));
                            setEditingKey(key);
                          }
                        }}
                      >
                        {entry ? entry.value : formatNumber(qty)}
                      </span>
                      {entry && (
                        <span className={styles.priorValue}>was {formatNumber(qty)}</span>
                      )}
                    </>
                  );
                })()}
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
              The amount is quantity × rate, recomputed by the database — it is
              never typed directly. Change the quantity, the rate or the unit of
              measure to move it.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ScheduleArtifact;
