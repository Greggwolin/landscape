'use client';

/**
 * ReportToolbar — structured layout controls for report artifacts.
 *
 * Renders an icon button in the artifact header. Clicking opens a popover
 * with controls for paper/orientation, column visibility + order, and
 * sort. Update / Save As / Reset to base live at the bottom of the popover.
 *
 * Toolbar writes go directly to the library API — never through Landscaper
 * (RP-CFRPT-2605 handoff "token economy" rule). Free-form modifications
 * (computed columns, filters, discriminator overrides, lineage toggles)
 * are reserved for the chat path in Phase 4 and don't appear here.
 *
 * The component is self-contained: it owns its draft state, only commits
 * on Update / Save As, and emits onChange callbacks so the parent can
 * re-render the preview with the draft spec applied.
 *
 * RP-CFRPT-2605 Phase 3.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Save,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import {
  useCreateSavedReport,
  useResetPersonalDefault,
  useUpdatePersonalDefault,
  type ModificationSpec,
} from '@/hooks/useReportLibrary';

import styles from './ReportToolbar.module.css';

export interface ReportToolbarColumn {
  /** Stable key (matches generator preview column keys). */
  key: string;
  /** Display label from the preview output. */
  label: string;
}

export interface ReportToolbarProps {
  /** RPT_XX code. Required. */
  reportCode: string;
  /** Display name shown in the popover header. */
  reportName: string;
  /**
   * Columns surfaced by the canonical preview. Used to build the
   * visibility checklist and sort picker. Empty array = no column
   * controls shown.
   */
  availableColumns: ReportToolbarColumn[];
  /**
   * The currently-applied modification_spec from the preview response
   * (canonical = {} or empty object). Treated as the saved baseline —
   * Update / Reset compare against this.
   */
  appliedSpec: ModificationSpec;
  /**
   * Fires whenever the toolbar's DRAFT spec changes. Parent should
   * re-render the preview with this spec applied (via apply_spec on
   * the server, or client-side for the on-screen preview).
   */
  onDraftChange?: (draft: ModificationSpec) => void;
  /**
   * Optional callback fired after a successful Update / Save As / Reset.
   * Parent typically refetches its preview here.
   */
  onPersisted?: () => void;
  /**
   * Optional callback fired after the user clicks Update — receives the
   * current draft spec so the parent can also patch the SPECIFIC artifact
   * the toolbar is wired to (params_json.modification_spec). The personal-
   * default write is unchanged; this is an additional write so the
   * artifact's saved view doesn't drift from the user's intent.
   * (LSCMD-UPDATE-SAVES-VIEW-0519)
   */
  onArtifactPersist?: (spec: ModificationSpec) => void;
}

/** Deep-clone a spec to a fresh object (JSON-safe shape). */
function cloneSpec(spec: ModificationSpec): ModificationSpec {
  return JSON.parse(JSON.stringify(spec || {})) as ModificationSpec;
}

/** Shallow equality on the spec's surface fields. */
function specsEqual(a: ModificationSpec, b: ModificationSpec): boolean {
  return JSON.stringify(a || {}) === JSON.stringify(b || {});
}

/** Empty-or-meaningful — empty spec means canonical base. */
function isEmptySpec(spec: ModificationSpec): boolean {
  return !spec || Object.keys(spec).length === 0;
}

export function ReportToolbar({
  reportCode,
  reportName,
  availableColumns,
  appliedSpec,
  onDraftChange,
  onPersisted,
  onArtifactPersist,
}: ReportToolbarProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ModificationSpec>(cloneSpec(appliedSpec));
  const [savedAsName, setSavedAsName] = useState('');
  const [savedAsOpen, setSavedAsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const popoverRef = useRef<HTMLDivElement | null>(null);

  const updateMut = useUpdatePersonalDefault();
  const resetMut = useResetPersonalDefault();
  const saveAsMut = useCreateSavedReport();

  // Reset draft whenever the applied spec changes from the outside.
  useEffect(() => {
    setDraft(cloneSpec(appliedSpec));
  }, [appliedSpec]);

  // Click-outside to close the popover.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSavedAsOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const isDirty = useMemo(() => !specsEqual(draft, appliedSpec), [draft, appliedSpec]);
  const hasPersonalDefault = !isEmptySpec(appliedSpec);

  // Visibility / order: derived view of available columns with current state.
  const visibleSet = useMemo(() => {
    const v = draft.columns?.visible;
    if (!v) return new Set(availableColumns.map((c) => c.key));
    return new Set(v);
  }, [draft, availableColumns]);

  const orderedColumns = useMemo(() => {
    const order = draft.columns?.order;
    if (!order || order.length === 0) return availableColumns;
    const indexMap = new Map(order.map((k, i) => [k, i]));
    return [...availableColumns].sort((a, b) => {
      const ai = indexMap.get(a.key) ?? Number.MAX_SAFE_INTEGER;
      const bi = indexMap.get(b.key) ?? Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  }, [draft, availableColumns]);

  function mutateDraft(updater: (d: ModificationSpec) => void) {
    const next = cloneSpec(draft);
    updater(next);
    // Strip empty top-level keys so isEmptySpec stays accurate.
    pruneEmpty(next);
    setDraft(next);
    onDraftChange?.(next);
  }

  function toggleColumn(key: string) {
    mutateDraft((d) => {
      const visible = d.columns?.visible ?? availableColumns.map((c) => c.key);
      const has = visible.includes(key);
      const next = has ? visible.filter((k) => k !== key) : [...visible, key];
      d.columns = { ...(d.columns ?? {}), visible: next };
    });
  }

  function moveColumn(key: string, dir: -1 | 1) {
    mutateDraft((d) => {
      const order =
        d.columns?.order ?? orderedColumns.map((c) => c.key);
      const idx = order.indexOf(key);
      if (idx < 0) return;
      const swap = idx + dir;
      if (swap < 0 || swap >= order.length) return;
      [order[idx], order[swap]] = [order[swap], order[idx]];
      d.columns = { ...(d.columns ?? {}), order };
    });
  }

  function setSort(key: string | null, direction: 'asc' | 'desc' = 'asc') {
    mutateDraft((d) => {
      if (!key) {
        delete d.sort;
        return;
      }
      d.sort = [{ key, direction }];
    });
  }

  function setPresentation(field: 'paper_size' | 'orientation', value: string) {
    mutateDraft((d) => {
      d.presentation = { ...(d.presentation ?? {}), [field]: value as never };
    });
  }

  function resetDraft() {
    setDraft(cloneSpec(appliedSpec));
    onDraftChange?.(cloneSpec(appliedSpec));
  }

  async function handleUpdate() {
    setErrorMsg(null);
    try {
      await updateMut.mutateAsync({
        reportCode,
        modificationSpec: draft,
      });
      // Personal default write succeeded — also patch the current
      // artifact's params_json so reopening THIS artifact (vs running a
      // fresh render of the report) restores the same view. Without
      // this, Update silently dropped the user's view state on the
      // artifact they were actively viewing.
      // (LSCMD-UPDATE-SAVES-VIEW-0519)
      onArtifactPersist?.(draft);
      onPersisted?.();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  }

  async function handleReset() {
    setErrorMsg(null);
    try {
      await resetMut.mutateAsync({ reportCode });
      onPersisted?.();
    } catch (err) {
      // 404 from "no row to reset" is fine — coerce to silent
      const msg = (err as Error).message;
      if (msg.includes('404')) {
        onPersisted?.();
        return;
      }
      setErrorMsg(msg);
    }
  }

  async function handleSaveAs() {
    setErrorMsg(null);
    if (!savedAsName.trim()) {
      setErrorMsg('Name is required');
      return;
    }
    try {
      await saveAsMut.mutateAsync({
        baseReportCode: reportCode,
        name: savedAsName.trim(),
        modificationSpec: draft,
      });
      setSavedAsName('');
      setSavedAsOpen(false);
      onPersisted?.();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  }

  const currentSortKey = draft.sort?.[0]?.key ?? '';
  const currentSortDir = draft.sort?.[0]?.direction ?? 'asc';

  const paperSize = draft.presentation?.paper_size ?? 'letter';
  const orientation = draft.presentation?.orientation ?? 'portrait';

  return (
    <div className={styles.root} ref={popoverRef}>
      <button
        type="button"
        className={styles.triggerBtn}
        onClick={() => setOpen((v) => !v)}
        title="Customize report layout"
        aria-label="Customize report layout"
        aria-expanded={open}
      >
        <SlidersHorizontal size={14} />
        {hasPersonalDefault && <span className={styles.dot} aria-hidden />}
      </button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label="Report layout">
          <div className={styles.popoverHeader}>
            <div className={styles.popoverTitle}>{reportName}</div>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setOpen(false)}
              aria-label="Close"
              title="Close"
            >
              <X size={12} />
            </button>
          </div>

          {/* Columns section */}
          {availableColumns.length > 0 && (
            <Section title="Columns" defaultOpen>
              <div className={styles.columnList}>
                {orderedColumns.map((c, i) => {
                  const visible = visibleSet.has(c.key);
                  return (
                    <div key={c.key} className={styles.columnRow}>
                      <label className={styles.columnCheckLabel}>
                        <input
                          type="checkbox"
                          checked={visible}
                          onChange={() => toggleColumn(c.key)}
                        />
                        <span>{c.label}</span>
                      </label>
                      <div className={styles.columnReorder}>
                        <button
                          type="button"
                          className={styles.iconBtnTiny}
                          onClick={() => moveColumn(c.key, -1)}
                          disabled={i === 0}
                          aria-label={`Move ${c.label} up`}
                          title="Move up"
                        >
                          <ChevronUp size={10} />
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtnTiny}
                          onClick={() => moveColumn(c.key, 1)}
                          disabled={i === orderedColumns.length - 1}
                          aria-label={`Move ${c.label} down`}
                          title="Move down"
                        >
                          <ChevronDown size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Sort section */}
          {availableColumns.length > 0 && (
            <Section title="Sort">
              <div className={styles.sortRow}>
                <select
                  className={styles.select}
                  value={currentSortKey}
                  onChange={(e) =>
                    setSort(e.target.value || null, currentSortDir as 'asc' | 'desc')
                  }
                >
                  <option value="">(default)</option>
                  {availableColumns.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.iconBtn}
                  disabled={!currentSortKey}
                  onClick={() =>
                    setSort(
                      currentSortKey,
                      currentSortDir === 'asc' ? 'desc' : 'asc',
                    )
                  }
                  title={
                    currentSortDir === 'asc'
                      ? 'Ascending — click to switch to descending'
                      : 'Descending — click to switch to ascending'
                  }
                  aria-label="Toggle sort direction"
                >
                  {currentSortDir === 'asc' ? (
                    <ArrowUp size={11} />
                  ) : (
                    <ArrowDown size={11} />
                  )}
                </button>
              </div>
            </Section>
          )}

          {/* Presentation section */}
          <Section title="PDF Layout">
            <div className={styles.presentationGrid}>
              <label className={styles.presentationField}>
                <span>Paper</span>
                <select
                  className={styles.select}
                  value={paperSize}
                  onChange={(e) => setPresentation('paper_size', e.target.value)}
                >
                  <option value="letter">Letter</option>
                  <option value="legal">Legal</option>
                  <option value="tabloid">Tabloid</option>
                </select>
              </label>
              <label className={styles.presentationField}>
                <span>Orientation</span>
                <select
                  className={styles.select}
                  value={orientation}
                  onChange={(e) => setPresentation('orientation', e.target.value)}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </label>
            </div>
          </Section>

          {/* Footer actions */}
          <div className={styles.footer}>
            {errorMsg && (
              <div className={styles.errorBanner} role="alert">
                {errorMsg}
              </div>
            )}

            <div className={styles.footerRow}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={resetDraft}
                disabled={!isDirty}
                title="Discard pending changes"
              >
                Discard
              </button>

              <div className={styles.footerSpacer} />

              {hasPersonalDefault && (
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={handleReset}
                  disabled={resetMut.isPending}
                  title="Delete your personal layout and return to the canonical base"
                >
                  <RotateCcw size={11} />
                  Reset to base
                </button>
              )}

              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setSavedAsOpen((v) => !v)}
                disabled={!isDirty && !hasPersonalDefault}
                title="Save current layout as a named report"
              >
                <Save size={11} />
                Save as…
              </button>

              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleUpdate}
                disabled={!isDirty || updateMut.isPending}
                title="Save current layout as your personal default for this report"
              >
                <Check size={11} />
                {updateMut.isPending ? 'Saving…' : 'Update'}
              </button>
            </div>

            {savedAsOpen && (
              <div className={styles.savedAsRow}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Name this saved report"
                  value={savedAsName}
                  onChange={(e) => setSavedAsName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveAs();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setSavedAsOpen(false);
                      setSavedAsName('');
                    }
                  }}
                />
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleSaveAs}
                  disabled={saveAsMut.isPending || !savedAsName.trim()}
                >
                  {saveAsMut.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.sectionHeader}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{title}</span>
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}

/** Strip top-level empty objects / arrays so isEmptySpec works. */
function pruneEmpty(spec: ModificationSpec): void {
  const obj = spec as unknown as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === null || v === undefined) {
      delete obj[k];
      continue;
    }
    if (Array.isArray(v) && v.length === 0) {
      delete obj[k];
      continue;
    }
    if (typeof v === 'object' && Object.keys(v as object).length === 0) {
      delete obj[k];
      continue;
    }
    // Nested object: strip empty inner keys (one level deep is enough)
    if (typeof v === 'object' && !Array.isArray(v)) {
      const inner = v as Record<string, unknown>;
      for (const ik of Object.keys(inner)) {
        const iv = inner[ik];
        if (
          iv === null ||
          iv === undefined ||
          (Array.isArray(iv) && iv.length === 0) ||
          (typeof iv === 'object' && Object.keys(iv as object).length === 0)
        ) {
          delete inner[ik];
        }
      }
      if (Object.keys(inner).length === 0) delete obj[k];
    }
  }
}
