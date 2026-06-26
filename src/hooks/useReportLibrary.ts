/**
 * React Query hooks for the chat-forward reports library
 * (RP-CFRPT-2605 Phase 2 backend, Phase 3 frontend).
 *
 * Endpoints wrapped:
 *   GET    /api/reports/library/                          → useReportLibrary()
 *   GET    /api/reports/library/<code>/preview/           → useLibraryReportPreview()
 *   PUT    /api/reports/library/<code>/personal/          → useUpdatePersonalDefault()
 *   DELETE /api/reports/library/<code>/personal/          → useResetPersonalDefault()
 *   POST   /api/reports/saved/                            → useCreateSavedReport()
 *   GET    /api/reports/saved/<uuid>/preview/             → useSavedReportPreview()
 *   PATCH  /api/reports/saved/<uuid>/                     → useUpdateSavedReport()
 *   DELETE /api/reports/saved/<uuid>/                     → useDeleteSavedReport()
 *
 * Auth: every request carries the Authorization header via getAuthHeaders().
 * The Django side inherits IsAuthenticated globally; missing token → 401.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { getAuthHeaders } from '@/lib/authHeaders';

const DJANGO_API_URL =
  process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

/* ─── Types mirroring backend serializers ──────────────────────────────── */

export type ScopeType =
  | 'global'
  | 'project'
  | 'entity'
  | 'master_lease'
  | 'cross_project';

export interface ModificationSpec {
  version?: number;
  presentation?: {
    paper_size?: 'letter' | 'legal' | 'tabloid';
    orientation?: 'portrait' | 'landscape';
  };
  columns?: {
    /** Allowlist — keep only these columns. */
    visible?: string[];
    /**
     * Denylist — drop just these columns. Applied AFTER visible.
     * Use when the user asks to hide specific columns; avoids the LLM
     * enumerating the entire keep-list and getting it wrong.
     * (LSCMD-SPEC-EXTEND-0521)
     */
    hidden?: string[];
    order?: string[];
    rename?: Record<string, string>;
    /**
     * Per-column body-cell alignment override. Maps column key to one
     * of 'left' | 'right' | 'center'. (LSCMD-SPEC-EXTEND-0521)
     */
    align?: Record<string, 'left' | 'right' | 'center'>;
    /**
     * All-headers alignment override. Independent of body alignment
     * so a "center all headers" request leaves numeric columns right-
     * aligned in the data rows. (LSCMD-SPEC-EXTEND-0521)
     */
    header_align?: 'left' | 'right' | 'center';
  };
  grouping?: { by?: string | null };
  sort?: Array<{ key: string; direction?: 'asc' | 'desc' }>;
  filters?: Array<{ key: string; op: string; value: unknown }>;
  computed_columns?: Array<{
    key: string;
    label: string;
    expr: string;
    format?: string;
  }>;
  scope?: { type?: ScopeType; id?: number | null };
  discriminator_overrides?: Record<string, string>;
  lineage?: {
    include_master_lease_lineage?: boolean;
    include_property_provenance?: boolean;
  };
  free_form_directives?: string[];
}

export interface LibraryCanonicalEntry {
  report_code: string;
  report_name: string;
  report_category: string;
  report_tier: string;
  property_types: string[];
  data_readiness: 'ready' | 'partial' | 'not_ready';
  description: string;
  is_personal_modified: boolean;
  personal_default_id: number | null;
  modification_spec_summary: string;
  scope: ScopeType;
}

export interface LibrarySavedEntry {
  uuid: string;
  name: string;
  description: string | null;
  base_report_code: string;
  base_report_name: string | null;
  scope: ScopeType;
  scope_id: number | null;
  updated_at: string | null;
  last_used_at: string | null;
}

export interface LibraryListResponse {
  canonical_entries: LibraryCanonicalEntry[];
  saved_reports: LibrarySavedEntry[];
}

export interface LibraryPreviewResponse {
  report_code: string;
  report_name: string;
  report_category: string;
  status: 'success' | 'error' | 'not_implemented';
  message?: string;
  generation_time_ms?: number;
  modification_spec: ModificationSpec;
  source: 'canonical' | 'global_personal' | 'project_personal' | 'entity_personal';
  personal_default_id: number | null;
  data: unknown;
}

export interface PersonalDefaultRow {
  id: number;
  report_code: string;
  report_name: string;
  scope_type: ScopeType;
  scope_id: number | null;
  modification_spec: ModificationSpec;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

export interface SavedReportRow {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  base_report_code: string;
  base_report_name: string | null;
  scope_type: ScopeType;
  scope_id: number | null;
  modification_spec: ModificationSpec;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${DJANGO_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ''}`,
    );
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

/* ─── Queries ──────────────────────────────────────────────────────────── */

/** Fetch the authenticated user's library (canonical + saved). */
export function useReportLibrary(projectId?: number | null) {
  return useQuery<LibraryListResponse>({
    queryKey: ['reportLibrary', projectId ?? null],
    queryFn: () => {
      const qs = projectId ? `?project_id=${projectId}` : '';
      return jsonFetch<LibraryListResponse>(`/api/reports/library/${qs}`);
    },
    staleTime: 30_000,
  });
}

/** Render the preview for a canonical report with personal default applied. */
export function useLibraryReportPreview(
  reportCode: string | null,
  projectId: number | null,
  enabled = true,
): UseQueryResult<LibraryPreviewResponse> {
  return useQuery<LibraryPreviewResponse>({
    queryKey: ['reportLibraryPreview', reportCode, projectId],
    queryFn: () =>
      jsonFetch<LibraryPreviewResponse>(
        `/api/reports/library/${reportCode}/preview/?project_id=${projectId}`,
      ),
    enabled: Boolean(reportCode && projectId && enabled),
    staleTime: 15_000,
  });
}

/** Render the preview for a saved report by uuid. */
export function useSavedReportPreview(
  uuid: string | null,
  projectId: number | null,
  enabled = true,
) {
  return useQuery<LibraryPreviewResponse>({
    queryKey: ['savedReportPreview', uuid, projectId],
    queryFn: () =>
      jsonFetch<LibraryPreviewResponse>(
        `/api/reports/saved/${uuid}/preview/?project_id=${projectId}`,
      ),
    enabled: Boolean(uuid && projectId && enabled),
    staleTime: 15_000,
  });
}

/* ─── Mutations ────────────────────────────────────────────────────────── */

interface UpdatePersonalInput {
  reportCode: string;
  modificationSpec: ModificationSpec;
  scopeType?: ScopeType;
  scopeId?: number | null;
}

/** PUT — upsert the user's personal default for a canonical report. */
export function useUpdatePersonalDefault() {
  const qc = useQueryClient();
  return useMutation<PersonalDefaultRow, Error, UpdatePersonalInput>({
    mutationFn: (input) =>
      jsonFetch<PersonalDefaultRow>(
        `/api/reports/library/${input.reportCode}/personal/`,
        {
          method: 'PUT',
          body: JSON.stringify({
            modification_spec: input.modificationSpec,
            scope_type: input.scopeType ?? 'global',
            scope_id: input.scopeId ?? null,
          }),
        },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['reportLibrary'] });
      qc.invalidateQueries({
        queryKey: ['reportLibraryPreview', vars.reportCode],
      });
    },
  });
}

interface ResetPersonalInput {
  reportCode: string;
  scopeType?: ScopeType;
  scopeId?: number | null;
}

/** DELETE — wipe the user's personal default ("Reset to base"). */
export function useResetPersonalDefault() {
  const qc = useQueryClient();
  return useMutation<void, Error, ResetPersonalInput>({
    mutationFn: ({ reportCode, scopeType = 'global', scopeId = null }) => {
      const qs = new URLSearchParams();
      qs.set('scope_type', scopeType);
      if (scopeId !== null) qs.set('scope_id', String(scopeId));
      return jsonFetch<void>(
        `/api/reports/library/${reportCode}/personal/?${qs}`,
        { method: 'DELETE' },
      );
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['reportLibrary'] });
      qc.invalidateQueries({
        queryKey: ['reportLibraryPreview', vars.reportCode],
      });
    },
  });
}

interface CreateSavedReportInput {
  name: string;
  description?: string;
  baseReportCode: string;
  modificationSpec: ModificationSpec;
  scopeType?: ScopeType;
  scopeId?: number | null;
}

/** POST — Save As: create a new named saved report. */
export function useCreateSavedReport() {
  const qc = useQueryClient();
  return useMutation<SavedReportRow, Error, CreateSavedReportInput>({
    mutationFn: (input) =>
      jsonFetch<SavedReportRow>(`/api/reports/saved/`, {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          description: input.description,
          base_report_code: input.baseReportCode,
          modification_spec: input.modificationSpec,
          scope_type: input.scopeType ?? 'global',
          scope_id: input.scopeId ?? null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportLibrary'] });
    },
  });
}

interface UpdateSavedReportInput {
  uuid: string;
  name?: string;
  description?: string | null;
  modificationSpec?: ModificationSpec;
  isArchived?: boolean;
}

/** PATCH — edit a saved report (rename, update spec, archive). */
export function useUpdateSavedReport() {
  const qc = useQueryClient();
  return useMutation<SavedReportRow, Error, UpdateSavedReportInput>({
    mutationFn: ({ uuid, ...rest }) => {
      const body: Record<string, unknown> = {};
      if (rest.name !== undefined) body.name = rest.name;
      if (rest.description !== undefined) body.description = rest.description;
      if (rest.modificationSpec !== undefined)
        body.modification_spec = rest.modificationSpec;
      if (rest.isArchived !== undefined) body.is_archived = rest.isArchived;
      return jsonFetch<SavedReportRow>(`/api/reports/saved/${uuid}/`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['reportLibrary'] });
      qc.invalidateQueries({ queryKey: ['savedReportPreview', vars.uuid] });
    },
  });
}

interface DeleteSavedReportInput {
  uuid: string;
  hard?: boolean;
}

/** DELETE — soft-delete (default) or hard-delete a saved report. */
export function useDeleteSavedReport() {
  const qc = useQueryClient();
  return useMutation<void, Error, DeleteSavedReportInput>({
    mutationFn: ({ uuid, hard = false }) =>
      jsonFetch<void>(
        `/api/reports/saved/${uuid}/${hard ? '?hard=true' : ''}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportLibrary'] });
    },
  });
}
