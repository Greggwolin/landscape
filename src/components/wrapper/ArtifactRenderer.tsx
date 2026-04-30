'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Pin, RotateCw, Save, X, AlertTriangle, Plus } from 'lucide-react';
import type {
  ArtifactRendererProps,
  Block,
  BlockDocument,
  CurrentValueMap,
  DriftState,
  EditTarget,
  EditTargetListItem,
  JsonPatchOp,
  KeyValueGridBlock,
  KeyValuePair,
  SectionBlock,
  SourcePointersMap,
  TableBlock,
  TableRow,
  TextBlock,
} from '@/types/artifact';
import styles from './ArtifactRenderer.module.css';

/**
 * Generic artifact renderer for the v1 block-document vocabulary.
 *
 * Renders any combination of `section`, `table`, `key_value_grid`, and
 * `text` blocks per spec §7. Inline edits on `editable` cells emit RFC-6902
 * JSON Patch ops via `onUpdate`. Drift detection is per-row when
 * `source_ref` is present.
 *
 * Spec: SPEC_FINDING4_GENERATIVE_ARTIFACTS.md §8
 */
export function ArtifactRenderer(props: ArtifactRendererProps) {
  const {
    title,
    schema,
    sourcePointers = {},
    currentValues = {},
    removedRowPaths,
    newRowsAvailable = false,
    editTarget,
    pinnedLabel,
    onClose,
    onUpdate,
    onPin,
    onUnpin,
    onSaveAsNewVersion,
    onOpenModal,
  } = props;

  // Track unknown block types so the header can flag schema warnings.
  // Computed synchronously via schema walk (not a ref populated during
  // render) so the banner can read the count BEFORE children render.
  // CC verification (Phase 2) caught the prior render-order bug; see
  // collectUnknownBlocks below.
  const rejectedBlocks = useMemo(() => collectUnknownBlocks(schema), [schema]);

  // Drift summary across all rows.
  const driftSummary = useMemo(
    () => computeDriftSummary(schema, sourcePointers, currentValues, removedRowPaths),
    [schema, sourcePointers, currentValues, removedRowPaths],
  );

  return (
    <div className={styles.root}>
      <ArtifactHeader
        title={title}
        pinnedLabel={pinnedLabel}
        editTarget={editTarget}
        driftSummary={driftSummary}
        onClose={onClose}
        onPin={onPin}
        onUnpin={onUnpin}
        onSaveAsNewVersion={onSaveAsNewVersion}
        onRefreshAllStale={() => refreshAllStale(schema, sourcePointers, currentValues, onUpdate)}
        onOpenModal={onOpenModal}
      />

      <div className={styles.body}>
        {rejectedBlocks.length > 0 && (
          <div className={styles.warningBanner}>
            <AlertTriangle size={12} />
            <span>
              Schema warning: {rejectedBlocks.length} unknown block
              {rejectedBlocks.length === 1 ? '' : 's'} skipped
            </span>
          </div>
        )}

        {newRowsAvailable && (
          <div className={styles.newRowsBanner}>
            <span>
              <Plus size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              New line items in source data
            </span>
            <button
              type="button"
              className={`${styles.btn}`}
              onClick={() => {
                // Phase 2: stub — real wiring lands in Phase 3 with a
                // server-driven "new rows" payload.
                console.warn('[ArtifactRenderer] newRowsAvailable add — wire in Phase 3');
              }}
            >
              Review
            </button>
          </div>
        )}

        <BlockListRenderer
          blocks={schema.blocks}
          sourcePointers={sourcePointers}
          currentValues={currentValues}
          removedRowPaths={removedRowPaths}
          basePath={['blocks']}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
}

/* ─── Header ──────────────────────────────────────────────────────────── */

interface ArtifactHeaderProps {
  title: string;
  pinnedLabel?: string | null;
  editTarget?: EditTarget;
  driftSummary: { stale: number; removed: number };
  onClose: () => void;
  onPin: (label: string) => void;
  onUnpin: () => void;
  onSaveAsNewVersion: (label?: string) => void;
  onRefreshAllStale: () => void;
  onOpenModal: (modalName: string) => void;
}

function ArtifactHeader({
  title,
  pinnedLabel,
  editTarget,
  driftSummary,
  onClose,
  onPin,
  onUnpin,
  onSaveAsNewVersion,
  onRefreshAllStale,
  onOpenModal,
}: ArtifactHeaderProps) {
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);

  const isPinned = Boolean(pinnedLabel);
  const editIsList = Array.isArray(editTarget);

  const subtitle: string[] = [];
  if (isPinned) subtitle.push(`Pinned: ${pinnedLabel}`);
  if (driftSummary.stale > 0) subtitle.push(`${driftSummary.stale} stale`);
  if (driftSummary.removed > 0) subtitle.push(`${driftSummary.removed} removed`);

  return (
    <div className={styles.header}>
      <div className={styles.headerTitle}>
        <div className={styles.headerTitleText} title={title}>
          {title}
        </div>
        {subtitle.length > 0 && (
          <div className={styles.headerSubtitle}>
            {subtitle.map((s, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className={styles.headerSubtitleSep}>·</span>}
                <span>{s}</span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <div className={styles.headerActions}>
        {/* Edit (single modal or list dropdown) */}
        {editTarget && !editIsList && (
          <button
            type="button"
            className={styles.btn}
            onClick={() => onOpenModal((editTarget as { modal_name: string }).modal_name)}
            title="Open editing form"
          >
            <Edit2 size={11} />
            Edit
          </button>
        )}
        {editTarget && editIsList && (
          <div className={styles.dropdown}>
            <button
              type="button"
              className={styles.btn}
              onClick={() => setEditMenuOpen((v) => !v)}
              title="Open editing form"
            >
              <Edit2 size={11} />
              Edit
              <ChevronDown size={11} />
            </button>
            {editMenuOpen && (
              <div className={styles.dropdownMenu}>
                {(editTarget as EditTargetListItem[]).map((item) => (
                  <button
                    type="button"
                    key={item.modal_name}
                    className={styles.dropdownItem}
                    onClick={() => {
                      setEditMenuOpen(false);
                      onOpenModal(item.modal_name);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pin / Unpin */}
        {isPinned ? (
          <button
            type="button"
            className={styles.btn}
            onClick={onUnpin}
            title="Unpin this artifact"
          >
            <Pin size={11} />
            Unpin
          </button>
        ) : (
          <button
            type="button"
            className={styles.btn}
            onClick={() => setPinPromptOpen(true)}
            title="Pin this artifact with a label"
          >
            <Pin size={11} />
            Pin
          </button>
        )}
        {pinPromptOpen && (
          <PinLabelPrompt
            onCancel={() => setPinPromptOpen(false)}
            onSubmit={(label) => {
              setPinPromptOpen(false);
              onPin(label);
            }}
          />
        )}

        {/* Save as new version */}
        <button
          type="button"
          className={styles.btn}
          onClick={() => {
            const label = window.prompt('Optional label for this saved version:') ?? undefined;
            onSaveAsNewVersion(label || undefined);
          }}
          title="Save current state as a new version"
        >
          <Save size={11} />
          Save version
        </button>

        {/* Refresh all stale */}
        {driftSummary.stale > 0 && (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={onRefreshAllStale}
            title="Pull current values for all stale rows"
          >
            <RotateCw size={11} />
            Refresh {driftSummary.stale}
          </button>
        )}

        {/* Close */}
        <button
          type="button"
          className={`${styles.btn} ${styles.btnIcon}`}
          onClick={onClose}
          title="Close artifact panel"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

interface PinLabelPromptProps {
  onCancel: () => void;
  onSubmit: (label: string) => void;
}

function PinLabelPrompt({ onCancel, onSubmit }: PinLabelPromptProps) {
  const [label, setLabel] = useState('');
  return (
    <div
      className={styles.driftPopover}
      style={{ position: 'absolute', top: 32, right: 8, zIndex: 30 }}
    >
      <span className={styles.driftPopoverLabel}>Pin label</span>
      <input
        type="text"
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className={styles.editInput}
        placeholder="e.g. Lender T-12 — May submission"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && label.trim()) {
            e.preventDefault();
            onSubmit(label.trim());
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
      />
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <button type="button" className={styles.btn} onClick={onCancel}>Cancel</button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => label.trim() && onSubmit(label.trim())}
          disabled={!label.trim()}
        >
          Pin
        </button>
      </div>
    </div>
  );
}

/* ─── Block dispatcher ────────────────────────────────────────────────── */

interface BlockListRendererProps {
  blocks: Block[];
  sourcePointers: SourcePointersMap;
  currentValues: CurrentValueMap;
  removedRowPaths?: Set<string>;
  basePath: string[];
  onUpdate: (patch: JsonPatchOp[]) => void;
}

function BlockListRenderer({
  blocks,
  sourcePointers,
  currentValues,
  removedRowPaths,
  basePath,
  onUpdate,
}: BlockListRendererProps) {
  return (
    <>
      {blocks.map((block, idx) => {
        const blockPath = [...basePath, String(idx)];
        return (
          <BlockRenderer
            key={block.id || `${idx}`}
            block={block}
            blockPath={blockPath}
            sourcePointers={sourcePointers}
            currentValues={currentValues}
            removedRowPaths={removedRowPaths}
            onUpdate={onUpdate}
          />
        );
      })}
    </>
  );
}

interface BlockRendererProps {
  block: Block;
  blockPath: string[];
  sourcePointers: SourcePointersMap;
  currentValues: CurrentValueMap;
  removedRowPaths?: Set<string>;
  onUpdate: (patch: JsonPatchOp[]) => void;
}

function BlockRenderer({ block, blockPath, sourcePointers, currentValues, removedRowPaths, onUpdate }: BlockRendererProps) {
  switch (block.type) {
    case 'section':
      return (
        <SectionBlockRenderer
          block={block}
          blockPath={blockPath}
          sourcePointers={sourcePointers}
          currentValues={currentValues}
          removedRowPaths={removedRowPaths}
          onUpdate={onUpdate}
        />
      );
    case 'table':
      return (
        <TableBlockRenderer
          block={block}
          blockPath={blockPath}
          sourcePointers={sourcePointers}
          currentValues={currentValues}
          removedRowPaths={removedRowPaths}
          onUpdate={onUpdate}
        />
      );
    case 'key_value_grid':
      return (
        <KeyValueGridBlockRenderer
          block={block}
          blockPath={blockPath}
          sourcePointers={sourcePointers}
          currentValues={currentValues}
          onUpdate={onUpdate}
        />
      );
    case 'text':
      return <TextBlockRenderer block={block} />;
    default: {
      // Strict validation: log unknown block type, return null.
      // The schema-warning indicator in the artifact header is computed
      // separately via collectUnknownBlocks (synchronous schema walk),
      // so children don't need to push into a parent ref during render.
      const unknown = block as { type?: string; id?: string };
      const repr = `${unknown?.type ?? 'unknown'}#${unknown?.id ?? '<no-id>'}`;
       
      console.warn(`[ArtifactRenderer] unknown block type rejected: ${repr}`);
      return null;
    }
  }
}

/* ─── Section block ──────────────────────────────────────────────────── */

interface SectionBlockRendererProps {
  block: SectionBlock;
  blockPath: string[];
  sourcePointers: SourcePointersMap;
  currentValues: CurrentValueMap;
  removedRowPaths?: Set<string>;
  onUpdate: (patch: JsonPatchOp[]) => void;
}

function SectionBlockRenderer({
  block,
  blockPath,
  sourcePointers,
  currentValues,
  removedRowPaths,
  onUpdate,
}: SectionBlockRendererProps) {
  const childrenPath = [...blockPath, 'children'];

  // Flat-section rendering — operating-statement style. No card frame,
  // no collapsing, just a label header above continuous content. The
  // spec called for collapsible cards but the chrome buried the data.
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionHeader}>{block.title}</h3>
      <div className={styles.sectionBody}>
        <BlockListRenderer
          blocks={block.children}
          sourcePointers={sourcePointers}
          currentValues={currentValues}
          removedRowPaths={removedRowPaths}
          basePath={childrenPath}
          onUpdate={onUpdate}
        />
      </div>
    </section>
  );
}

/* ─── Table block ────────────────────────────────────────────────────── */

interface TableBlockRendererProps {
  block: TableBlock;
  blockPath: string[];
  sourcePointers: SourcePointersMap;
  currentValues: CurrentValueMap;
  removedRowPaths?: Set<string>;
  onUpdate: (patch: JsonPatchOp[]) => void;
}

function TableBlockRenderer({
  block,
  blockPath,
  sourcePointers,
  currentValues,
  removedRowPaths,
  onUpdate,
}: TableBlockRendererProps) {
  const hasAnySourceRefs = block.rows.some((r) => Boolean(r.source_ref || r.cell_source_refs));

  return (
    <div className={styles.tableWrap}>
      {block.title && <div className={styles.tableTitle}>{block.title}</div>}
      <table className={styles.table}>
        <thead>
          <tr>
            {hasAnySourceRefs && <th className={styles.driftCell} aria-label="drift" />}
            {block.columns.map((col) => (
              <th
                key={col.key}
                className={alignClass(col.align)}
                // size: undefined per CLAUDE.md tabular formatting rules
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rIdx) => {
            const rowPath = [...blockPath, 'rows', String(rIdx)];
            const rowPathStr = rowPath.join('/');
            const isRemoved = removedRowPaths?.has(rowPathStr) ?? false;
            const driftState = isRemoved
              ? 'removed'
              : computeRowDriftState(row, sourcePointers, currentValues, rowPath);

            // Heuristic role detection — see detectRowRole. Bold + rules
            // are applied to subtotal and grand-total rows per the tabular
            // formatting standard.
            const role = detectRowRole(row, block.columns);
            const rowClass =
              role === 'grand_total' ? styles.grandTotalRow
              : role === 'subtotal' ? styles.subtotalRow
              : '';
            // First column is the label column — never apply numeric
            // formatting to it. Other columns are numeric by default.
            const labelKey = block.columns[0]?.key;

            return (
              <tr key={row.id} className={rowClass}>
                {hasAnySourceRefs && (
                  <td className={styles.driftCell}>
                    <DriftIndicator state={driftState} row={row} sourcePointers={sourcePointers} currentValues={currentValues} rowPath={rowPath} />
                  </td>
                )}
                {block.columns.map((col) => {
                  const cellValue = row.cells[col.key];
                  const cellEditable = Boolean(row.editable);
                  const cellPath = [...rowPath, 'cells', col.key];
                  const isLabelCol = col.key === labelKey;
                  return (
                    <td
                      key={col.key}
                      className={`${alignClass(col.align)}`}
                    >
                      <EditableCell
                        value={cellValue}
                        editable={cellEditable}
                        path={cellPath}
                        onUpdate={onUpdate}
                        formatNumeric={!isLabelCol}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {block.rows.length === 0 && (
            <tr>
              <td
                colSpan={block.columns.length + (hasAnySourceRefs ? 1 : 0)}
                style={{ textAlign: 'center', color: 'var(--cui-secondary-color)', padding: 16 }}
              >
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Tabular formatting standard (per Memory: feedback_tabular_artifact_formatting) ──
 *
 * Accounting style for every tabular artifact:
 *   - Positives: 1,234        (with thousand separators)
 *   - Negatives: (1,234)      (parens, no minus sign)
 *   - Zero / null: —          (em dash)
 *   - No decimals
 *   - No $ symbol
 *
 * Subtotal/total row detection is heuristic — we check the row id and the
 * first-cell label for canonical keywords (Gross Potential Rent, Effective
 * Gross Income, Total Operating Expenses, Net Operating Income, etc.). When
 * the schema gains explicit row.role markers we'll switch to those.
 */

const _NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  useGrouping: true,
});

/** Coerce a cell value to its display string per the tabular formatting standard. */
export function formatCellValue(value: string | number | null | undefined): string {
  if (value == null) return '—';
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value === 0) return '—';
    if (value < 0) return `(${_NUMBER_FORMATTER.format(Math.abs(value))})`;
    return _NUMBER_FORMATTER.format(value);
  }
  // String — try to detect numeric content
  const s = String(value).trim();
  if (s === '' || s === '0' || s === '0.00') return '—';
  // Strip $, commas, surrounding parens for negative detection
  const isParenNeg = /^\(.+\)$/.test(s);
  const cleaned = s.replace(/[$,\s]/g, '').replace(/^\(/, '-').replace(/\)$/, '');
  const n = Number(cleaned);
  if (Number.isFinite(n) && /^-?\d/.test(cleaned)) {
    if (n === 0) return '—';
    if (n < 0 || isParenNeg) return `(${_NUMBER_FORMATTER.format(Math.abs(n))})`;
    return _NUMBER_FORMATTER.format(n);
  }
  return s;
}

/** Heuristic detection of subtotal/total/grand-total rows for bold styling.
 *
 * Subtotal rows get bold + single rule above. Grand total (NOI specifically)
 * gets bold + rules above AND below. Per the operating statement rendering
 * spec — see THREAD_STATE.md "Operating statement rendering spec".
 *
 * The full-phrase keywords are used deliberately — bare 'noi' would match
 * 'NOI per Unit' / 'NOI per SF' (summary metrics, not totals). Anti-keywords
 * disqualify rows that look like per-unit / ratio metrics regardless.
 */
const _SUBTOTAL_KEYWORDS = [
  'gross potential rent',
  'effective gross income',
  'total operating expenses',
  'total income',
  'gross income',
  'subtotal',
];

const _GRAND_TOTAL_KEYWORDS = [
  'net operating income',
  'grand total',
];

/** Disqualify rows whose label contains any of these — they're summary
 * metrics (NOI per Unit, Operating Expense Ratio, etc.), not actual totals. */
const _ANTI_KEYWORDS = [
  'per unit',
  'per sf',
  'per square',
  'per square foot',
  'expense ratio',
  'ratio',
];

function _normalizeRowProbe(s: string | undefined | null): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Returns 'subtotal' | 'grand_total' | null based on the row's id and first-cell label. */
export function detectRowRole(
  row: TableRow,
  columns: { key: string }[],
): 'subtotal' | 'grand_total' | null {
  const idProbe = _normalizeRowProbe(row.id);
  const firstColKey = columns[0]?.key;
  const labelProbe = _normalizeRowProbe(
    firstColKey ? String(row.cells?.[firstColKey] ?? '') : '',
  );

  // Disqualifier — per-unit / ratio summary metrics never get bolded as totals.
  for (const anti of _ANTI_KEYWORDS) {
    if (labelProbe.includes(anti) || idProbe.includes(anti.replace(/ /g, '_'))) {
      return null;
    }
  }

  for (const kw of _GRAND_TOTAL_KEYWORDS) {
    if (idProbe.includes(kw.replace(/ /g, '_')) || labelProbe.includes(kw)) {
      return 'grand_total';
    }
  }
  for (const kw of _SUBTOTAL_KEYWORDS) {
    if (idProbe.includes(kw.replace(/ /g, '_')) || labelProbe.includes(kw)) {
      return 'subtotal';
    }
  }
  return null;
}

/** Same role detection as detectRowRole, but for kv_grid pairs.
 *
 * Sometimes the model composes summary metrics (Net Operating Income, Total
 * Operating Expenses) as kv_grid pairs instead of as rows in the main
 * operating-statement table. The kv_grid pair labels still match the
 * subtotal/grand_total keyword sets, so we apply the same bold styling.
 */
export function detectPairRole(label: string): 'subtotal' | 'grand_total' | null {
  const probe = _normalizeRowProbe(label);
  for (const anti of _ANTI_KEYWORDS) {
    if (probe.includes(anti)) return null;
  }
  for (const kw of _GRAND_TOTAL_KEYWORDS) {
    if (probe.includes(kw)) return 'grand_total';
  }
  for (const kw of _SUBTOTAL_KEYWORDS) {
    if (probe.includes(kw)) return 'subtotal';
  }
  return null;
}

interface EditableCellProps {
  value: string | number | null;
  editable: boolean;
  path: string[];
  onUpdate: (patch: JsonPatchOp[]) => void;
  /** When true, value is rendered via formatCellValue (accounting style). */
  formatNumeric?: boolean;
}

function EditableCell({ value, editable, path, onUpdate, formatNumeric = true }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value == null ? '' : String(value));

  // Display path: format via tabular standard for non-editing state.
  const display = formatNumeric
    ? formatCellValue(value)
    : (value == null ? '—' : value);

  if (!editable) {
    return <>{display}</>;
  }

  if (!editing) {
    return (
      <span
        className={styles.editableCell}
        onDoubleClick={() => {
          setDraft(value == null ? '' : String(value));
          setEditing(true);
        }}
        title="Double-click to edit"
      >
        {display}
      </span>
    );
  }

  const commit = () => {
    setEditing(false);
    if (draft !== (value == null ? '' : String(value))) {
      // Coerce numeric-looking input to number so the diff matches DB types.
      const coerced = coerceCellValue(draft, value);
      onUpdate([
        {
          op: 'replace',
          path: '/' + path.map(escapeJsonPointer).join('/'),
          value: coerced,
        },
      ]);
    }
  };

  return (
    <input
      type="text"
      className={styles.editInput}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setEditing(false);
        }
      }}
    />
  );
}

/* ─── Key-value grid ─────────────────────────────────────────────────── */

interface KeyValueGridBlockRendererProps {
  block: KeyValueGridBlock;
  blockPath: string[];
  sourcePointers: SourcePointersMap;
  currentValues: CurrentValueMap;
  onUpdate: (patch: JsonPatchOp[]) => void;
}

function KeyValueGridBlockRenderer({
  block,
  blockPath,
  sourcePointers,
  currentValues,
  onUpdate,
}: KeyValueGridBlockRendererProps) {
  const cols = block.columns ?? 2;
  return (
    <div>
      {block.title && <div className={styles.tableTitle} style={{ marginBottom: 4 }}>{block.title}</div>}
      <div
        className={styles.kvGrid}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {block.pairs.map((pair, pIdx) => {
          const pairPath = [...blockPath, 'pairs', String(pIdx)];
          const driftState = computePairDriftState(pair, currentValues);
          return (
            <KeyValuePairRenderer
              key={`${pair.label}-${pIdx}`}
              pair={pair}
              driftState={driftState}
              path={pairPath}
              onUpdate={onUpdate}
            />
          );
        })}
      </div>
    </div>
  );
}

interface KeyValuePairRendererProps {
  pair: KeyValuePair;
  driftState: DriftState;
  path: string[];
  onUpdate: (patch: JsonPatchOp[]) => void;
}

function KeyValuePairRenderer({ pair, driftState, path, onUpdate }: KeyValuePairRendererProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(pair.value ?? ''));
  const editable = Boolean(pair.editable);

  // Apply role-based bold styling for pairs that match subtotal/total keywords.
  // This catches cases where the model composes summary metrics (Net Operating
  // Income, Total Operating Expenses) as kv_grid pairs instead of as rows in
  // the main operating-statement table.
  const role = detectPairRole(pair.label);
  const roleClass =
    role === 'grand_total' ? styles.kvPairGrandTotal
    : role === 'subtotal' ? styles.kvPairSubtotal
    : '';

  const valueClass = editable
    ? `${styles.kvValue} ${styles.kvValueEditable}`
    : styles.kvValue;

  // Apply tabular formatting standard to the value (thousand separators,
  // parens for negatives, em-dash for zero/null, no $ symbol).
  const display = formatCellValue(pair.value as string | number | null);

  return (
    <div className={`${styles.kvPair} ${roleClass}`}>
      <span className={styles.kvLabel}>
        {driftState !== 'unchanged' && (
          <span style={{ marginRight: 4 }}>
            <DriftDot state={driftState} />
          </span>
        )}
        {pair.label}
      </span>
      {editing ? (
        <input
          type="text"
          className={styles.editInput}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (draft !== String(pair.value ?? '')) {
              const coerced = coerceCellValue(draft, pair.value);
              onUpdate([
                {
                  op: 'replace',
                  path: '/' + [...path, 'value'].map(escapeJsonPointer).join('/'),
                  value: coerced,
                },
              ]);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <span
          className={valueClass}
          onDoubleClick={editable ? () => setEditing(true) : undefined}
          title={editable ? 'Double-click to edit' : undefined}
        >
          {display}
        </span>
      )}
    </div>
  );
}

/* ─── Text block ─────────────────────────────────────────────────────── */

function TextBlockRenderer({ block }: { block: TextBlock }) {
  const variant = block.variant || 'body';
  const className =
    variant === 'caption' ? styles.textCaption :
    variant === 'callout' ? styles.textCallout :
    styles.textBody;

  // Restricted markdown: **bold** and *italic* only. No library; regex parse.
  const html = renderRestrictedMarkdown(block.content);

  if (variant === 'callout') {
    return <aside className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (variant === 'caption') {
    return <small className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <p className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function renderRestrictedMarkdown(input: string): string {
  // Escape HTML first so user content can't inject markup.
  const escaped = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  // Then apply the two allowed tokens. Order matters: bold (**) before italic (*).
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/* ─── Drift indicators ───────────────────────────────────────────────── */

interface DriftIndicatorProps {
  state: DriftState;
  row: TableRow;
  sourcePointers: SourcePointersMap;
  currentValues: CurrentValueMap;
  rowPath: string[];
}

function DriftIndicator({ state, row, sourcePointers, currentValues, rowPath }: DriftIndicatorProps) {
  const [open, setOpen] = useState(false);

  if (state === 'unchanged') return null;

  const ref = row.source_ref ?? sourcePointers[rowPath.join('/')];
  const currentKey = ref ? `${ref.table}:${ref.row_id}` : null;
  const currentValue = currentKey ? currentValues[currentKey] : undefined;

  return (
    <span
      style={{ position: 'relative', cursor: 'help' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      role="img"
      aria-label={state === 'stale' ? 'value changed in source' : 'source row removed'}
    >
      <DriftDot state={state} />
      {open && (
        <div className={styles.driftPopover}>
          <span className={styles.driftPopoverLabel}>
            {state === 'stale' ? 'Value drifted' : 'Source row removed'}
          </span>
          {ref && (
            <>
              <div>
                <strong>Snapshot:</strong>{' '}
                {ref.captured_value == null ? '—' : String(ref.captured_value)}{' '}
                <span style={{ color: 'var(--cui-secondary-color)' }}>
                  ({new Date(ref.captured_at).toLocaleDateString()})
                </span>
              </div>
              {state === 'stale' && (
                <div>
                  <strong>Current:</strong>{' '}
                  {currentValue == null ? '—' : String(currentValue)}
                </div>
              )}
              <div style={{ color: 'var(--cui-secondary-color)' }}>
                {ref.table} · row {String(ref.row_id)}
              </div>
            </>
          )}
        </div>
      )}
    </span>
  );
}

function DriftDot({ state }: { state: DriftState }) {
  if (state === 'unchanged' || state === 'new') return null;
  const cls =
    state === 'stale' ? styles.driftDotStale :
    state === 'removed' ? styles.driftDotRemoved :
    styles.driftDotStale;
  return <span className={`${styles.driftDot} ${cls}`} />;
}

/* ─── Drift computation ──────────────────────────────────────────────── */

function computeRowDriftState(
  row: TableRow,
  sourcePointers: SourcePointersMap,
  currentValues: CurrentValueMap,
  rowPath: string[],
): DriftState {
  const ref = row.source_ref ?? sourcePointers[rowPath.join('/')];
  if (!ref) return 'unchanged';
  const key = `${ref.table}:${ref.row_id}`;
  const current = currentValues[key];
  if (current === undefined) {
    // Caller didn't populate currentValues for this pointer — treat as
    // unchanged in Phase 2; Phase 3 wires real lookups.
    return 'unchanged';
  }
  if (ref.captured_value === undefined) return 'unchanged';
  return current === ref.captured_value ? 'unchanged' : 'stale';
}

function computePairDriftState(
  pair: KeyValuePair,
  currentValues: CurrentValueMap,
): DriftState {
  const ref = pair.source_ref;
  if (!ref) return 'unchanged';
  const key = `${ref.table}:${ref.row_id}`;
  const current = currentValues[key];
  if (current === undefined) return 'unchanged';
  if (ref.captured_value === undefined) return 'unchanged';
  return current === ref.captured_value ? 'unchanged' : 'stale';
}

function computeDriftSummary(
  schema: BlockDocument,
  sourcePointers: SourcePointersMap,
  currentValues: CurrentValueMap,
  removedRowPaths: Set<string> | undefined,
): { stale: number; removed: number } {
  let stale = 0;
  let removed = 0;
  walkBlocks(schema.blocks, ['blocks'], (block, path) => {
    if (block.type === 'table') {
      block.rows.forEach((row, rIdx) => {
        const rowPath = [...path, 'rows', String(rIdx)];
        const rowPathStr = rowPath.join('/');
        if (removedRowPaths?.has(rowPathStr)) {
          removed += 1;
          return;
        }
        const state = computeRowDriftState(row, sourcePointers, currentValues, rowPath);
        if (state === 'stale') stale += 1;
      });
    } else if (block.type === 'key_value_grid') {
      block.pairs.forEach((pair) => {
        const state = computePairDriftState(pair, currentValues);
        if (state === 'stale') stale += 1;
      });
    }
  });
  return { stale, removed };
}

function walkBlocks(
  blocks: Block[],
  basePath: string[],
  visitor: (block: Block, path: string[]) => void,
): void {
  blocks.forEach((block, idx) => {
    const path = [...basePath, String(idx)];
    visitor(block, path);
    if (block.type === 'section') {
      walkBlocks(block.children, [...path, 'children'], visitor);
    }
  });
}

/**
 * Walk the schema synchronously and collect repr strings for any block
 * whose `type` is outside the v1 vocabulary. Used by the artifact header
 * to render the schema-warning indicator BEFORE children render — refs
 * populated during child render don't surface in the parent's first pass.
 *
 * Walks raw `unknown` blocks (not the typed Block union) because schemas
 * arriving from the backend may include unknown block types that the
 * frontend strictly rejects per spec §13.3.
 */
function collectUnknownBlocks(schema: BlockDocument): string[] {
  const KNOWN = new Set(['section', 'table', 'key_value_grid', 'text']);
  const rejected: string[] = [];
  const stack: unknown[] = [...schema.blocks];
  while (stack.length > 0) {
    const block = stack.shift();
    if (!block || typeof block !== 'object') continue;
    const b = block as { type?: string; id?: string; children?: unknown };
    if (!KNOWN.has(b.type ?? '')) {
      rejected.push(`${b.type ?? 'unknown'}#${b.id ?? '<no-id>'}`);
      // Don't recurse into unknown blocks — they have no schema contract.
      continue;
    }
    // Recurse into children of section blocks (the only block type with children).
    if (b.type === 'section' && Array.isArray(b.children)) {
      stack.unshift(...(b.children as unknown[]));
    }
  }
  return rejected;
}

function refreshAllStale(
  schema: BlockDocument,
  sourcePointers: SourcePointersMap,
  currentValues: CurrentValueMap,
  onUpdate: (patch: JsonPatchOp[]) => void,
): void {
  const ops: JsonPatchOp[] = [];
  walkBlocks(schema.blocks, ['blocks'], (block, path) => {
    if (block.type === 'table') {
      block.rows.forEach((row, rIdx) => {
        const rowPath = [...path, 'rows', String(rIdx)];
        const ref = row.source_ref ?? sourcePointers[rowPath.join('/')];
        if (!ref) return;
        const key = `${ref.table}:${ref.row_id}`;
        const current = currentValues[key];
        if (current === undefined || current === ref.captured_value) return;
        // Replace the cell that the source_ref points at, if column known.
        if (ref.column) {
          ops.push({
            op: 'replace',
            path: '/' + [...rowPath, 'cells', ref.column].map(escapeJsonPointer).join('/'),
            value: current as string | number | null,
          });
        }
      });
    }
  });
  if (ops.length > 0) onUpdate(ops);
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function alignClass(align?: 'left' | 'right' | 'center'): string {
  if (align === 'right') return styles.alignRight;
  if (align === 'center') return styles.alignCenter;
  return styles.alignLeft;
}

function escapeJsonPointer(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

function coerceCellValue(draft: string, original: string | number | null | undefined): string | number | null {
  if (draft === '') return null;
  // If the original was numeric and the draft parses as a number, coerce.
  if (typeof original === 'number') {
    const stripped = draft.replace(/[$,\s]/g, '');
    const n = Number(stripped);
    if (!Number.isNaN(n)) return n;
  }
  return draft;
}
