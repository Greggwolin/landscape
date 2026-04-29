/**
 * Block-document schema types for generative artifacts (Finding #4, Phase 2).
 *
 * Mirrors backend/apps/artifacts/schema_validation.py exactly. The backend
 * is strict — block types outside the union below are rejected at the API
 * boundary and the renderer logs a console.warn + renders nothing for any
 * unknown block.
 *
 * Spec: SPEC_FINDING4_GENERATIVE_ARTIFACTS.md §7.1
 */

/* ─── Source pointers (drift detection) ────────────────────────────────── */

export interface SourceRef {
  table: string;
  row_id: number | string;
  column?: string;
  /** ISO timestamp at the moment the artifact was captured. */
  captured_at: string;
  /** Value at capture time, used for diff display. `unknown` for TS-strict friendliness. */
  captured_value?: unknown;
}

/** State of a row's source data relative to the artifact's captured snapshot. */
export type DriftState = 'unchanged' | 'stale' | 'removed' | 'new';

/* ─── Block types (discriminated union on `type`) ──────────────────────── */

export interface SectionBlock {
  type: 'section';
  id: string;
  title: string;
  /** Default false (expanded). */
  collapsed?: boolean;
  children: Block[];
}

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

export interface TableRow {
  id: string;
  cells: Record<string, string | number | null>;
  /** Per-row source pointer — used for drift detection and dependency graph. */
  source_ref?: SourceRef;
  /** Per-cell source pointer (opt-in for high-fidelity diff cases). */
  cell_source_refs?: Record<string, SourceRef>;
  /** When true, cells in this row can be edited inline via double-click. */
  editable?: boolean;
}

export interface TableBlock {
  type: 'table';
  id: string;
  title?: string;
  columns: TableColumn[];
  rows: TableRow[];
}

export interface KeyValuePair {
  label: string;
  value: string | number;
  source_ref?: SourceRef;
  editable?: boolean;
}

export interface KeyValueGridBlock {
  type: 'key_value_grid';
  id: string;
  title?: string;
  /** Default 2. */
  columns?: number;
  pairs: KeyValuePair[];
}

export interface TextBlock {
  type: 'text';
  id: string;
  /** Plain text or restricted markdown (only **bold** and *italic* are interpreted). */
  content: string;
  variant?: 'body' | 'caption' | 'callout';
}

export type Block = SectionBlock | TableBlock | KeyValueGridBlock | TextBlock;

export interface BlockDocument {
  blocks: Block[];
}

/* ─── Edit-target mapping (artifact → modal) ───────────────────────────── */

export interface EditTargetSingle {
  modal_name: string;
}

export interface EditTargetListItem {
  modal_name: string;
  label: string;
}

/** Single artifact edit_target (one modal) or list (synthesis with multiple modals). */
export type EditTarget = EditTargetSingle | EditTargetListItem[];

/* ─── Source pointers map ──────────────────────────────────────────────── */

/**
 * Map from row path (e.g. "blocks/1/children/0/rows/2") to the SourceRef
 * captured at artifact creation. Backend returns this as part of the
 * artifact detail payload. Drift detection compares each pointer's
 * captured state against the current DB row.
 */
export type SourcePointersMap = Record<string, SourceRef>;

/**
 * Map from `<table>:<row_id>` to the current value the renderer can compare
 * against `SourceRef.captured_value`. Phase 2 accepts this as a prop and
 * stubs it in the test route; Phase 3 wires real backend lookups.
 */
export type CurrentValueMap = Record<string, unknown>;

/* ─── ArtifactRenderer props ───────────────────────────────────────────── */

export interface ArtifactRendererProps {
  artifactId: number;
  title: string;
  schema: BlockDocument;
  /** Source pointers as captured at artifact creation. */
  sourcePointers?: SourcePointersMap;
  /** Current values keyed by `<table>:<row_id>`. Phase 3 populates this; Phase 2 stubs. */
  currentValues?: CurrentValueMap;
  /** Set of row paths whose source rows are deleted ("removed" drift state). */
  removedRowPaths?: Set<string>;
  /** When true, banner offers to add new source rows that aren't in the artifact yet. */
  newRowsAvailable?: boolean;
  /** Edit-modal mapping (single or list). Edit button hidden when undefined. */
  editTarget?: EditTarget;
  /** When set, header shows "Pinned: <label>". Click "Unpin" to clear. */
  pinnedLabel?: string | null;
  /** True while a backend mutation is in flight. */
  loading?: boolean;
  /* Callbacks */
  onClose: () => void;
  /** Called with an RFC-6902 JSON Patch for inline edits and bulk drift refreshes. */
  onUpdate: (patch: JsonPatchOp[]) => void;
  onPin: (label: string) => void;
  onUnpin: () => void;
  /** Optional label for the pinned new-version reference. */
  onSaveAsNewVersion: (label?: string) => void;
  /** Hook into the parent's modal-open infra. Phase 3 wires real opens. */
  onOpenModal: (modalName: string) => void;
}

/* ─── JSON Patch (RFC-6902) ────────────────────────────────────────────── */

export type JsonPatchOp =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'move'; path: string; from: string }
  | { op: 'copy'; path: string; from: string }
  | { op: 'test'; path: string; value: unknown };

/* ─── Utility: compute the JSON Patch path for a cell or pair ──────────── */

/**
 * Build an RFC-6902 path for a table cell. Caller knows the structural
 * indices (block index, section nesting, row index).
 *
 * Example: `blocksPath(1, ['children', 0])` → `/blocks/1/children/0`
 */
export function blocksPath(blockIndex: number, rest: Array<string | number> = []): string {
  const tokens = ['blocks', String(blockIndex), ...rest.map(String)];
  return '/' + tokens.map(escapePathToken).join('/');
}

function escapePathToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}
