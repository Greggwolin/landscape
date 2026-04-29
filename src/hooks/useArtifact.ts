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
import type { BlockDocument, EditTarget, SourcePointersMap } from '@/types/artifact';

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
      const res = await fetch(url);
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
      const res = await fetch(`${DJANGO_API_URL}/api/artifacts/${artifactId}/`);
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
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${DJANGO_API_URL}/api/artifacts/${artifactId}/versions/${qs}`);
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
        headers: { 'Content-Type': 'application/json' },
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
