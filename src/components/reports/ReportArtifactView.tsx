'use client';

/**
 * ReportArtifactView — wires the ReportToolbar's draft spec to the generic
 * ArtifactRenderer so column toggles, sort, and column reorder apply live
 * in the preview before the user clicks Update.
 *
 * Spec → applied-schema pipeline runs in this component, not on the server:
 * the toolbar emits a draft ModificationSpec, this view filters the
 * artifact's schema accordingly, then hands the filtered schema to the
 * generic ArtifactRenderer. Clicking Update in the toolbar persists the
 * same spec to the database so the next render comes back identical.
 *
 * RP-CFRPT-2605 Phase 3.
 */

import React, { useMemo, useState } from 'react';

import { ArtifactRenderer } from '@/components/wrapper/ArtifactRenderer';
import { ReportToolbar, type ReportToolbarColumn } from './ReportToolbar';
import type { ArtifactRendererProps } from '@/types/artifact';
import type { ModificationSpec } from '@/hooks/useReportLibrary';

interface ActiveReportArtifact {
  artifact_id: number;
  title: string;
  current_state_json: { blocks?: unknown[] } | unknown;
  source_pointers_json?: unknown;
  edit_target_json?: unknown;
  pinned_label?: string | null;
  tool_name?: string;
  params_json?: unknown;
}

export interface ReportArtifactViewProps {
  artifact: ActiveReportArtifact;
  loading?: boolean;
  onClose: () => void;
  onUpdate: ArtifactRendererProps['onUpdate'];
  onCommitFieldEdit: ArtifactRendererProps['onCommitFieldEdit'];
  /**
   * Pin a report artifact. The second arg is the current draft
   * modification_spec (visible columns, sort, etc.) — when present the
   * parent should persist it into params_json so reopening restores the
   * same view. ReportArtifactView always passes its draftSpec, so callers
   * can rely on this arg being defined for report artifacts.
   * (LSCMD-PIN-SAVES-VIEW-0519)
   */
  onPin: (label: string, modificationSpec?: ModificationSpec) => void;
  onUnpin: ArtifactRendererProps['onUnpin'];
  /**
   * Save-version path mirrors onPin — also carries the current draft
   * modification_spec so the user's view state persists whether they
   * click the pin icon or the save (floppy) icon.
   * (LSCMD-PIN-SAVES-VIEW-0519)
   */
  onSaveAsNewVersion: (label: string | undefined, modificationSpec?: ModificationSpec) => void;
  onOpenModal: ArtifactRendererProps['onOpenModal'];
}

export function ReportArtifactView(props: ReportArtifactViewProps) {
  const { artifact } = props;

  // Extract report metadata from the artifact's params_json (stamped by
  // render_report_as_artifact at creation time).
  const params = (artifact.params_json ?? {}) as {
    report_code?: string;
    modification_spec?: ModificationSpec;
    report_name?: string;
  };
  const reportCode = params.report_code ?? '';

  // appliedSpec MUST be a stable reference until the upstream artifact's
  // stored spec actually changes — otherwise the toolbar's
  // useEffect([appliedSpec]) refires on every render and resets the user's
  // in-progress draft (clicks a checkbox → instantly re-checked). The JSON
  // signature is a cheap stable-key for that comparison.
  const appliedSpec = useMemo<ModificationSpec>(
    () => (params.modification_spec ?? {}) as ModificationSpec,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(params.modification_spec ?? {})],
  );

  // The toolbar emits its draft spec via onDraftChange — we mirror it into
  // local state so we can apply it to the schema before render.
  const [draftSpec, setDraftSpec] = useState<ModificationSpec>(appliedSpec);

  // Available columns surface from the artifact's first table block.
  const availableColumns = useMemo<ReportToolbarColumn[]>(
    () =>
      collectFirstTableColumns(
        ((artifact.current_state_json as { blocks?: unknown[] })?.blocks) ?? [],
      ),
    [artifact.current_state_json],
  );

  // Apply the draft spec to the schema client-side so unchecking a column
  // hides it in the preview immediately. Sort + column reorder ride along.
  const filteredSchema = useMemo(
    () => applySpecToSchema(artifact.current_state_json, draftSpec),
    [artifact.current_state_json, draftSpec],
  );

  // Resolve a friendly title for the toolbar's popover header — fall back
  // to the report code when the generator didn't supply a name.
  const reportName = params.report_name || artifact.title || reportCode;

  const toolbar = reportCode ? (
    <ReportToolbar
      reportCode={reportCode}
      reportName={reportName}
      availableColumns={availableColumns}
      appliedSpec={appliedSpec}
      onDraftChange={setDraftSpec}
      // Toolbar's Update button also patches the current artifact's
      // params_json (in addition to the personal-default write) so the
      // user's view sticks on THIS artifact, not just on future fresh
      // renders of the report. Reuses the save-version patch path —
      // no label, just the spec. (LSCMD-UPDATE-SAVES-VIEW-0519)
      onArtifactPersist={(spec) => props.onSaveAsNewVersion(undefined, spec)}
    />
  ) : null;

  // Wrap onPin so the user's CURRENT draft spec (visible columns, sort,
  // etc.) gets persisted alongside the pin write. Without this, pinning
  // saves only the label and the user's column toggles are lost when
  // they reopen the artifact. ArtifactRenderer's pin button calls
  // onPin(label) — we tack on draftSpec here so the parent can include
  // it in the same patch. (LSCMD-PIN-SAVES-VIEW-0519)
  const handlePin = (label: string) => {
    props.onPin(label, draftSpec);
  };

  // Save-version (floppy icon) gets the same treatment as pin — both are
  // user-initiated "persist this view" actions, so both should snapshot
  // the current draft spec into params_json.
  const handleSaveAsNewVersion = (label: string | undefined) => {
    props.onSaveAsNewVersion(label, draftSpec);
  };

  return (
    <ArtifactRenderer
      artifactId={artifact.artifact_id}
      title={artifact.title}
      schema={filteredSchema as ArtifactRendererProps['schema']}
      sourcePointers={artifact.source_pointers_json as ArtifactRendererProps['sourcePointers']}
      currentValues={undefined}
      removedRowPaths={undefined}
      newRowsAvailable={false}
      editTarget={undefined}
      pinnedLabel={artifact.pinned_label}
      headerExtras={toolbar}
      loading={props.loading}
      onClose={props.onClose}
      onUpdate={props.onUpdate}
      onCommitFieldEdit={props.onCommitFieldEdit}
      onPin={handlePin}
      onUnpin={props.onUnpin}
      onSaveAsNewVersion={handleSaveAsNewVersion}
      onOpenModal={props.onOpenModal}
    />
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function collectFirstTableColumns(blocks: unknown[]): ReportToolbarColumn[] {
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const b = block as { type?: string; columns?: unknown; children?: unknown[] };
    if (b.type === 'table' && Array.isArray(b.columns)) {
      return (b.columns as Array<{ key: string; label: string }>).map((c) => ({
        key: c.key,
        label: c.label,
      }));
    }
    if (b.type === 'section' && Array.isArray(b.children)) {
      const inner = collectFirstTableColumns(b.children);
      if (inner.length > 0) return inner;
    }
  }
  return [];
}

/**
 * Apply the toolbar's draft modification_spec to a block-document schema
 * client-side. Mirrors what the server does in apply_spec() for the
 * canonical render path. Only handles the pieces the toolbar can produce
 * today: column visibility, column order, and sort. Filters / grouping /
 * computed columns are reserved for the chat path (Phase 4).
 */
function applySpecToSchema(
  schema: unknown,
  spec: ModificationSpec | undefined,
): unknown {
  if (!schema || typeof schema !== 'object') return schema;
  if (!spec || Object.keys(spec).length === 0) return schema;

  // Deep clone via JSON so we don't mutate the upstream artifact cache.
  const out = JSON.parse(JSON.stringify(schema)) as { blocks?: unknown[] };
  walkBlocks(out.blocks ?? [], spec);
  return out;
}

function walkBlocks(blocks: unknown[], spec: ModificationSpec): void {
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const b = block as {
      type?: string;
      columns?: Array<{ key: string; label: string }>;
      rows?: Array<Record<string, unknown>>;
      children?: unknown[];
    };
    if (b.type === 'table' && Array.isArray(b.columns)) {
      applySpecToTableBlock(b, spec);
    }
    if (b.type === 'section' && Array.isArray(b.children)) {
      walkBlocks(b.children, spec);
    }
  }
}

function applySpecToTableBlock(
  block: {
    columns?: Array<{
      key: string;
      label: string;
      align?: 'left' | 'right' | 'center';
      header_align?: 'left' | 'right' | 'center';
    }>;
    rows?: Array<Record<string, unknown>>;
  },
  spec: ModificationSpec,
): void {
  let columns = block.columns ?? [];

  // Column visibility (allowlist): keep only listed columns.
  const visible = spec.columns?.visible;
  if (visible && visible.length > 0) {
    const visibleSet = new Set(visible);
    columns = columns.filter((c) => visibleSet.has(c.key));
  }

  // Column hidden (denylist): drop just the listed columns. Applied AFTER
  // visible so users can use just `hidden` to remove a couple columns
  // without enumerating the entire keep-list. The bridge tool's STRICT
  // RULES guide LS to prefer this over `visible` for hide requests.
  // (LSCMD-SPEC-EXTEND-0521)
  const hidden = spec.columns?.hidden;
  if (hidden && hidden.length > 0) {
    const hiddenSet = new Set(hidden);
    columns = columns.filter((c) => !hiddenSet.has(c.key));
  }

  // Column order: reorder per the user's drag/up/down picks; unknown keys
  // keep their natural relative position at the end.
  const order = spec.columns?.order;
  if (order && order.length > 0) {
    const idx = new Map(order.map((k, i) => [k, i]));
    columns = [...columns].sort((a, b) => {
      const ai = idx.get(a.key) ?? Number.MAX_SAFE_INTEGER;
      const bi = idx.get(b.key) ?? Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  }

  // Column rename: swap labels where the user provided one.
  const rename = spec.columns?.rename;
  if (rename) {
    columns = columns.map((c) =>
      rename[c.key] ? { ...c, label: rename[c.key] } : c,
    );
  }

  // Per-column body-cell alignment override — replaces col.align for keys
  // listed in `align`. (LSCMD-SPEC-EXTEND-0521)
  const align = spec.columns?.align;
  if (align) {
    columns = columns.map((c) =>
      align[c.key] ? { ...c, align: align[c.key] } : c,
    );
  }

  // All-headers alignment override — stamps header_align on every column
  // so the renderer's thead cells pick it up. Independent of body
  // alignment so numerics stay right-justified in data rows even when
  // the header strip is centered. (LSCMD-SPEC-EXTEND-0521)
  const headerAlign = spec.columns?.header_align;
  if (headerAlign) {
    columns = columns.map((c) => ({ ...c, header_align: headerAlign }));
  }

  block.columns = columns;

  // Sort the rows by the toolbar's sort spec. Single-column for now;
  // multi-column will fall out as soon as the toolbar gains the controls.
  const sortSpec = spec.sort;
  if (sortSpec && sortSpec.length > 0 && Array.isArray(block.rows)) {
    const rows = [...block.rows];
    for (const clause of [...sortSpec].reverse()) {
      const key = clause.key;
      const reverse = clause.direction === 'desc';
      rows.sort((a, b) => {
        const av = a?.[key];
        const bv = b?.[key];
        const aNull = av === null || av === undefined;
        const bNull = bv === null || bv === undefined;
        if (aNull && bNull) return 0;
        if (aNull) return 1;
        if (bNull) return -1;
        if (typeof av === 'number' && typeof bv === 'number') {
          return reverse ? bv - av : av - bv;
        }
        const as = String(av);
        const bs = String(bv);
        return reverse ? bs.localeCompare(as) : as.localeCompare(bs);
      });
    }
    block.rows = rows;
  }
}
