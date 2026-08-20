'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SourceRef } from '@/types/artifact';

/**
 * Shared staging store for inline table-cell edits (budget slice 2).
 *
 * WHY THIS EXISTS AS ITS OWN MODULE
 * ---------------------------------
 * CB8 built staging inside ArtifactRenderer, which was the only surface that
 * needed it at the time. ScheduleArtifact is a second surface with the same
 * requirement — stage several cells, show the prior value while dirty, land the
 * set through ONE batch request, keep the failures staged with their reason.
 * Copying that logic would create two implementations of the same rule, and the
 * one nobody is looking at is the one that drifts. So the behaviour lives here
 * once and both renderers consume it.
 *
 * Deliberately NOT a React context: ArtifactRenderer needs a context because
 * EditableCell is buried under BlockList → Block → Section → Table, but
 * ScheduleArtifact renders its own cells directly. The hook is the shared part;
 * ArtifactRenderer keeps its context and feeds it from here.
 */

export interface StagedEdit {
  path: string[];
  value: string;
  /**
   * CC13: the source_ref this cell was showing when the user typed. Sent with
   * the commit so the server can refuse if that position now resolves to a
   * different row (schedules reorder on write).
   */
  expectedRef?: SourceRef;
  /** Inline reason when this cell's commit failed (kept staged + dirty). */
  error?: string;
}

export interface CommitEditsResponse {
  success: boolean;
  results?: Array<{
    index: number;
    status: 'applied' | 'error';
    cell_path?: string[] | null;
    pair_path?: string[] | null;
    error?: string;
    detail?: string;
    suggested_user_question?: string;
  }>;
  applied_count?: number;
  error_count?: number;
  impact_line?: string;
  error?: string;
  detail?: string;
}

export type CommitEditsFn = (
  edits: Array<{
    cell_path?: string[];
    pair_path?: string[];
    new_value: string;
    expected_ref?: SourceRef;
  }>,
) => Promise<CommitEditsResponse>;

export const stagedKey = (path: string[]) => path.join('/');

export interface UseStagedEditsResult {
  /** Keyed by path.join('/'). */
  staged: Record<string, StagedEdit>;
  /** Stage (or unstage, if newValue equals the committed value) one cell. */
  stageEdit: (
    path: string[],
    newValue: string,
    committed: string | number | null,
    expectedRef?: SourceRef,
  ) => void;
  discardStaged: () => void;
  commitStaged: () => Promise<void>;
  stagedCount: number;
  committing: boolean;
  /** True when at least one cell is staged (marks calculated cells stale). */
  active: boolean;
}

/**
 * @param onCommitFieldEdits batch commit callback; staging is inert without it.
 * @param resetKey           changing this clears staging (switching artifacts).
 */
export function useStagedEdits(
  onCommitFieldEdits: CommitEditsFn | undefined,
  resetKey?: string | number,
): UseStagedEditsResult {
  const [staged, setStaged] = useState<Record<string, StagedEdit>>({});
  const [committing, setCommitting] = useState(false);

  // Clear staging when switching to a different artifact. Staged edits carry
  // paths into a specific artifact's schema; carrying them across would aim
  // them at whatever now sits at that position.
  useEffect(() => {
    setStaged({});
  }, [resetKey]);

  const stageEdit = useCallback(
    (
      path: string[],
      newValue: string,
      committed: string | number | null,
      expectedRef?: SourceRef,
    ) => {
      const key = stagedKey(path);
      const committedStr = committed == null ? '' : String(committed);
      setStaged((prev) => {
        const next = { ...prev };
        if (newValue === committedStr) {
          // Reverted to the committed value — drop it from staging.
          delete next[key];
        } else {
          next[key] = { path, value: newValue, expectedRef };
        }
        return next;
      });
    },
    [],
  );

  const discardStaged = useCallback(() => setStaged({}), []);

  const commitStaged = useCallback(async () => {
    if (!onCommitFieldEdits) return;
    const entries = Object.values(staged);
    if (!entries.length) return;
    setCommitting(true);
    try {
      const edits = entries.map((e) => ({
        cell_path: e.path,
        new_value: e.value,
        expected_ref: e.expectedRef,
      }));
      const resp = await onCommitFieldEdits(edits);
      if (!resp?.success) {
        // Batch-level rejection (e.g. duplicate_target) — keep everything
        // staged and annotate each cell with the reason.
        const msg = resp?.detail || resp?.error || 'Commit failed.';
        setStaged((prev) => {
          const next: Record<string, StagedEdit> = {};
          for (const [k, v] of Object.entries(prev)) next[k] = { ...v, error: msg };
          return next;
        });
        return;
      }
      // Per-edit results: clear the ones that landed, keep the failed ones
      // staged + dirty with their reason. Never silently drop a typed edit.
      const results = resp.results || [];
      setStaged((prev) => {
        const next: Record<string, StagedEdit> = {};
        for (const [k, v] of Object.entries(prev)) {
          const r = results.find(
            (rr) => Array.isArray(rr.cell_path) && rr.cell_path.join('/') === k,
          );
          if (r && r.status === 'error') {
            next[k] = {
              ...v,
              error:
                r.suggested_user_question || r.detail || r.error || 'Could not save.',
            };
          }
          // applied (or unmatched) → cleared; the refetched artifact shows the
          // canonical committed value.
        }
        return next;
      });
    } finally {
      setCommitting(false);
    }
  }, [onCommitFieldEdits, staged]);

  const stagedCount = Object.keys(staged).length;

  return useMemo(
    () => ({
      staged,
      stageEdit,
      discardStaged,
      commitStaged,
      stagedCount,
      committing,
      active: stagedCount > 0,
    }),
    [staged, stageEdit, discardStaged, commitStaged, stagedCount, committing],
  );
}
