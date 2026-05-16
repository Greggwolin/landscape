/**
 * React Query hooks for the generative artifact REST endpoints (Phase 1).
 *
 * Endpoints:
 *   GET    /api/artifacts/?...        — list (panel)
 *   GET    /api/artifacts/<id>/       — full retrieval
 *   PATCH  /api/artifacts/<id>/       — pin / unpin / archive / title
 *   GET    /api/artifacts/<id>/versions/   — version log
 *   POST   /api/artifacts/<id>/restore/    — restore action
 *
 * `create_artifact` and `update_artifact` flow through the Landscaper tool
 * dispatcher in production — they are NOT REST endpoints. Phase 2's test
 * route stubs the update path with a console.log; Phase 3 wires the real
 * tool-call dispatcher.
 *
 * Spec: SPEC_FINDING4_GENERATIVE_ARTIFACTS.md §6, §13.1
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BlockDocument,
  EditTarget,
  JsonPatchOp,
  SourcePointersMap,
} from '@/types/artifact';
import { getAuthHeaders } from '@/lib/authHeaders';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

/* ─── Types matching backend serializers ──────────────────────────────── */

export interface ArtifactSummary {
  artifact_id: number;
  project_id: number | null;
  thread_id: string | null;
  tool_name: string;
  title: string;
  pinned_label: string | null;
  edit_target_json: EditTarget | null;
  created_at: string;
  last_edited_at: string;
  created_by_user_id: string;
  is_archived: boolean;
}

export interface ArtifactDetail extends ArtifactSummary {
  params_json: Record<string, unknown>;
  current_state_json: BlockDocument;
  source_pointers_json: SourcePointersMap;
}

export interface ArtifactVersion {
  version_id: number;
  artifact_id: number;
  version_seq: number;
  edited_at: string;
  edited_by_user_id: string;
  edit_source: string;
  summary: string;
}

export interface ArtifactListResponse {
  count: number;
  results: ArtifactSummary[];
}

export interface ArtifactVersionsResponse {
  success: boolean;
  versions?: ArtifactVersion[];
  count?: number;
  error?: string;
}

export interface ArtifactPatchInput {
  pinned_label?: string | null;
  is_archived?: boolean;
  title?: string;
}

export interface RestoreInput {
  /** "original" | "previous" | version_seq number | ISO timestamp | row revert object */
  target: string | number | { row_filter: string; version_seq: number };
}

/* ─── List filters ────────────────────────────────────────────────────── */

export interface ArtifactListFilters {
  project_id?: number;
  /** When true and project_id is undefined, includes unassigned artifacts. */
  include_unassigned?: boolean;
  thread_id?: string;
  pinned_only?: boolean;
  archived?: boolean;
  limit?: number;
}

/* ─── Hooks ───────────────────────────────────────────────────────────── */

export function useArtifactList(filters: ArtifactListFilters = {}) {
  return useQuery<ArtifactListResponse>({
    queryKey: ['artifacts', 'list', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.project_id != null) params.append('project_id', String(filters.project_id));
      if (filters.include_unassigned) params.append('include_unassigned', '1');
      if (filters.thread_id) params.append('thread_id', filters.thread_id);
      if (filters.pinned_only) params.append('pinned_only', '1');
      if (filters.archived) params.append('archived', '1');
      if (filters.limit != null) params.append('limit', String(filters.limit));

      const url = `${DJANGO_API_URL}/api/artifacts/${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch artifacts: ${res.status}`);
      return res.json();
    },
  });
}

export function useArtifact(artifactId: number | null) {
  return useQuery<ArtifactDetail>({
    queryKey: ['artifacts', 'detail', artifactId],
    enabled: artifactId != null,
    queryFn: async () => {
      const res = await fetch(`${DJANGO_API_URL}/api/artifacts/${artifactId}/`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch artifact ${artifactId}: ${res.status}`);
      return res.json();
    },
  });
}

export function useArtifactPatch() {
  const qc = useQueryClient();
  return useMutation<ArtifactDetail, Error, { artifactId: number; patch: ArtifactPatchInput }>({
    mutationFn: async ({ artifactId, patch }) => {
      const res = await fetch(`${DJANGO_API_URL}/api/artifacts/${artifactId}/`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`Failed to patch artifact ${artifactId}: ${res.status}`);
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['artifacts', 'detail', data.artifact_id] });
      qc.invalidateQueries({ queryKey: ['artifacts', 'list'] });
    },
  });
}

export function useArtifactVersions(artifactId: number | null, opts: { limit?: number; since?: string; row_filter?: string } = {}) {
  return useQuery<ArtifactVersionsResponse>({
    queryKey: ['artifacts', 'versions', artifactId, opts],
    enabled: artifactId != null,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opts.limit != null) params.append('limit', String(opts.limit));
      if (opts.since) params.append('since', opts.since);
      if (opts.row_filter) params.append('row_filter', opts.row_filter);
      const qs = params.toString() ? '?' + params.toString() : '';
      const res = await fetch(`${DJANGO_API_URL}/api/artifacts/${artifactId}/versions/${qs}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch versions for ${artifactId}: ${res.status}`);
      return res.json();
    },
  });
}

export function useArtifactRestore() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { artifactId: number; input: RestoreInput }>({
    mutationFn: async ({ artifactId, input }) => {
      const res = await fetch(`${DJANGO_API_URL}/api/artifacts/${artifactId}/restore/`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Failed to restore artifact ${artifactId}: ${res.status}`);
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['artifacts', 'detail', vars.artifactId] });
      qc.invalidateQueries({ queryKey: ['artifacts', 'versions', vars.artifactId] });
    },
  });
}

/* ─── Phase 4 — inline-edit write path ─────────────────────────────────
 * POSTs to the Phase 4 `update_state` action. The backend route lands in
 * `update_artifact_record`, the same code the Landscaper tool dispatcher
 * uses, and fires the dependency cascade hook on success.
 */

export interface ArtifactUpdateStateInput {
  schema_diff?: JsonPatchOp[];
  full_schema?: BlockDocument;
  source_pointers_diff?: unknown;
  edit_source?: 'user_edit' | 'drift_pull' | 'extraction_commit' | 'modal_save' | 'cascade';
  /** Optional cascade hint — when the edited cells carry source_refs, pass
   *  them here so the backend can fan out to dependent artifacts. */
  changed_rows?: Array<{ table: string; row_id: number | string }>;
}

export interface ArtifactUpdateStateResponse {
  success: boolean;
  action?: string;
  artifact_id?: number;
  new_state?: BlockDocument;
  version_id?: number;
  error?: string;
  dependency_notification?: {
    cascade_mode: 'auto' | 'manual';
    cascaded_artifacts?: Array<{ artifact_id: number; title?: string; affected_rows?: string[] }>;
    skipped?: Array<{ artifact_id: number | null; reason: string }>;
    dependent_artifacts?: Array<{ artifact_id: number; title?: string; affected_rows?: string[]; last_edited_at?: string | null }>;
    wide_graph_fallback?: boolean;
  };
}

export function useArtifactUpdateState() {
  const qc = useQueryClient();
  return useMutation<
    ArtifactUpdateStateResponse,
    Error,
    { artifactId: number; input: ArtifactUpdateStateInput }
  >({
    mutationFn: async ({ artifactId, input }) => {
      const res = await fetch(
        `${DJANGO_API_URL}/api/artifacts/${artifactId}/update_state/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      );
      const data = await res.json().catch(() => ({} as ArtifactUpdateStateResponse));
      if (!res.ok || !data?.success) {
        throw new Error(
          data?.error || `Failed to update artifact ${artifactId}: ${res.status}`,
        );
      }
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['artifacts', 'detail', vars.artifactId] });
      qc.invalidateQueries({ queryKey: ['artifacts', 'versions', vars.artifactId] });
      qc.invalidateQueries({ queryKey: ['artifacts', 'list'] });
    },
  });
}

/* ─── Phase 5 — inline-edit-with-write-back ──────────────────────────────
 * POSTs to `commit_field_edit` when an editable kv_pair carries a
 * `source_ref`. The backend resolves the ref to (table, row_id, column),
 * coerces the user's input, writes through to the underlying source row,
 * then re-builds the artifact via its tool's schema builder so the user
 * sees the canonical formatted value (currency, dates, MSA name) come
 * back even when their input was loose ("$5.5M" / "5/1/26" / "phoenix").
 *
 * Errors come back as a structured envelope. Common ones:
 *   - field_not_writable   — column not in MUTABLE_FIELDS
 *   - invalid_value        — coercion failed
 *   - ambiguous            — multiple FK candidates; carries
 *                            `suggested_user_question` + `candidates`
 *   - no FK match          — `suggested_user_question` only
 *   - db_error             — constraint violation, etc.
 *
 * The renderer surfaces `error` + (optional) `suggested_user_question`
 * inline below the field so the user can correct without context-switch.
 */

export interface ArtifactCommitFieldEditInput {
  /** Path to the kv_pair, shaped like ["blocks", "0", "pairs", "12"]. */
  pair_path: string[];
  /** Raw input string from the user. Backend coerces by column type. */
  new_value: string;
  user_id?: string;
}

export interface ArtifactCommitFieldEditResponse {
  success: boolean;
  action?: string;
  artifact_id?: number;
  /** Refreshed block document — the renderer should drop its draft. */
  new_state?: BlockDocument;
  /** Echoed back so the chat layer can log the change. */
  coerced_value?: unknown;
  /** Per-field metadata (e.g. resolved msa_name on FK writes). */
  meta?: Record<string, unknown>;
  /** Error code on failure (field_not_writable, invalid_value, ambiguous, ...). */
  error?: string;
  detail?: string;
  /** Surfaced verbatim in the inline error UI when the writer wants the
   *  renderer to ask a follow-up (e.g. ambiguous FK match). */
  suggested_user_question?: string;
  candidates?: Array<Record<string, unknown>>;
}

export function useArtifactCommitFieldEdit() {
  const qc = useQueryClient();
  return useMutation<
    ArtifactCommitFieldEditResponse,
    Error,
    { artifactId: number; input: ArtifactCommitFieldEditInput }
  >({
    mutationFn: async ({ artifactId, input }) => {
      const res = await fetch(
        `${DJANGO_API_URL}/api/artifacts/${artifactId}/commit_field_edit/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      );
      const data = await res
        .json()
        .catch(() => ({} as ArtifactCommitFieldEditResponse));
      // We intentionally do NOT throw on non-2xx here. The renderer wants
      // the structured error envelope (error code + suggested_user_question)
      // so it can show inline UI rather than a red toast.
      return data;
    },
    onSuccess: (data, vars) => {
      if (data?.success) {
        qc.invalidateQueries({ queryKey: ['artifacts', 'detail', vars.artifactId] });
        qc.invalidateQueries({ queryKey: ['artifacts', 'versions', vars.artifactId] });
        qc.invalidateQueries({ queryKey: ['artifacts', 'list'] });
      }
    },
  });
}
