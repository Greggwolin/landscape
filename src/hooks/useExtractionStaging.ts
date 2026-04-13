'use client';

import { useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FolderTab } from '@/lib/utils/folderTabConfig';
import { formatFolderLabel } from '@/lib/utils/folderTabConfig';
import { getAuthHeaders } from '@/lib/authHeaders';

const DJANGO_API = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StagingRow {
  extraction_id: number;
  field_key: string;
  field_label: string;
  scope: string;
  extracted_value: unknown;
  confidence_score: number | null;
  /** Four-status classification set by backend at read time */
  status: 'new' | 'match' | 'pending' | 'conflict' | 'accepted' | 'applied' | 'rejected';
  source_label: string | null;
  source_snippet: string | null;
  doc_id: number | null;
  source_page: number | null;
  created_at: string;
  target_table: string | null;
  target_field: string | null;
  conflict_with_extraction_id?: number | null;
  /** Existing DB value for this field (populated by backend classification) */
  existing_value?: unknown;
  /** Source of existing value: "manual", "ingestion", or null */
  existing_source?: string | null;
  /** @deprecated — replaced by existing_value in four-status model */
  conflict_existing?: {
    existing_value: unknown;
    existing_confidence: number | null;
    existing_source: string | null;
  } | null;
  /** Folder ID assigned by scope→folder mapping (set by buildSections) */
  _folderId?: string;
}

/** The four input statuses + terminal statuses */
export type FieldStatus = 'new' | 'match' | 'pending' | 'conflict' | 'accepted' | 'rejected';

/** Counts per status for section headers */
export type StatusCounts = Record<FieldStatus, number>;

export interface StagingSection {
  id: string;
  label: string;
  /** DB scopes that map to this section (used for commit/accept-all calls) */
  scopes: string[];
  rows: StagingRow[];
  statusCounts: StatusCounts;
  authority: { source: string; color: string } | null;
}

interface ApiResponse {
  success: boolean;
  extractions: StagingRow[];
  scope_counts: Record<string, number>;
  status_counts: Record<string, number>;
  count: number;
}

// ---------------------------------------------------------------------------
// Scope → folder mapping
//
// Maps the DB `scope` column from ai_extraction_staging to a folder ID from
// folderTabConfig. The folder ID varies by property type (e.g. income
// properties use "operations" / "valuation", land dev uses "budget" /
// "feasibility"), so we list all variants here. The active folder set for
// the project filters which sections actually appear.
// ---------------------------------------------------------------------------

const SCOPE_TO_FOLDER: Record<string, string> = {
  // → "home" folder (label: "Project")
  project: 'home',
  mf_property: 'home',
  // → "property" folder
  unit_type: 'property',
  assumption: 'property',
  lot_or_product: 'property',
  lot_inventory: 'property',
  // → "operations" (income) or "budget" (land dev) folder
  income: 'operations',
  opex: 'operations',
  acquisition: 'operations',
  // → "valuation" (income) or "feasibility" (land dev) folder
  market: 'valuation',
  rent_comp: 'valuation',
  sales_comp: 'valuation',
  land_comp: 'valuation',
};

// Land dev aliases — same scopes map to different folder IDs
const SCOPE_TO_FOLDER_LAND: Record<string, string> = {
  ...SCOPE_TO_FOLDER,
  // Land dev parcels → "property" folder (labeled "Planning")
  lot_or_product: 'property',
  lot_inventory: 'property',
  income: 'budget',
  opex: 'budget',
  acquisition: 'budget',
  market: 'feasibility',
  rent_comp: 'feasibility',
  sales_comp: 'feasibility',
  land_comp: 'feasibility',
};

/** Sentinel folder ID for scopes not in the map */
const UNMAPPED_FOLDER_ID = '_other';
const UNMAPPED_FOLDER_LABEL = 'Other';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// detectConflicts() removed — backend now classifies rows into
// new/match/pending/conflict at read time (four-status model).

function computeAuthority(rows: StagingRow[]): { source: string; color: string } | null {
  const sourceCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.status === 'accepted' || row.status === 'applied') {
      const src = row.source_label || 'Unknown';
      sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
    }
  }
  if (sourceCounts.size === 0) return null;
  let maxSource = '';
  let maxCount = 0;
  for (const [src, count] of sourceCounts) {
    if (count > maxCount) { maxSource = src; maxCount = count; }
  }
  return { source: `${maxSource} authoritative`, color: 'var(--cui-success)' };
}

/**
 * Given the live folder list and property type, resolve a DB scope to
 * a folder ID. Returns UNMAPPED_FOLDER_ID for unknown scopes.
 */
function scopeToFolderId(
  scope: string,
  activeFolderIds: Set<string>,
  isLandDev: boolean,
): string {
  const map = isLandDev ? SCOPE_TO_FOLDER_LAND : SCOPE_TO_FOLDER;
  const folderId = map[scope];
  if (folderId && activeFolderIds.has(folderId)) return folderId;
  // Scope mapped to a folder that doesn't exist in this project's config
  if (folderId) return UNMAPPED_FOLDER_ID;
  // Completely unknown scope
  return UNMAPPED_FOLDER_ID;
}

/**
 * Build sections from rows using the live folder config.
 * Only creates sections for folders that have at least one non-rejected row.
 * Adds an "Other" catch-all section for unmapped scopes.
 */
function buildSections(
  rows: StagingRow[],
  folders: FolderTab[],
  isLandDev: boolean,
): StagingSection[] {
  // Backend now classifies rows — no client-side detectConflicts() needed
  const activeFolderIds = new Set(folders.map(f => f.id));

  // Only include folders that could contain extractable data
  // (skip reports, documents, map — they don't have extraction fields)
  const extractableFolders = new Set(['home', 'property', 'operations', 'budget', 'valuation', 'feasibility', 'capital']);

  // Group rows by folder ID
  const grouped = new Map<string, { rows: StagingRow[]; scopes: Set<string> }>();
  for (const row of rows) {
    if (row.status === 'rejected') continue;
    const folderId = scopeToFolderId(row.scope || '', activeFolderIds, isLandDev);
    if (!grouped.has(folderId)) grouped.set(folderId, { rows: [], scopes: new Set() });
    const group = grouped.get(folderId)!;
    group.rows.push({ ...row, _folderId: folderId });
    if (row.scope) group.scopes.add(row.scope);
  }

  // Build ordered sections: follow folder config order, then append "Other" if needed
  const sections: StagingSection[] = [];

  for (const folder of folders) {
    if (!extractableFolders.has(folder.id)) continue;
    const group = grouped.get(folder.id);
    if (!group || group.rows.length === 0) continue;

    const statusCounts: StatusCounts = {
      new: 0, match: 0, pending: 0, conflict: 0, accepted: 0, rejected: 0,
    };
    for (const row of group.rows) {
      const s = row.status;
      if (s === 'applied') {
        statusCounts.accepted++;
      } else if (s in statusCounts) {
        statusCounts[s as FieldStatus]++;
      }
    }

    sections.push({
      id: folder.id,
      label: formatFolderLabel(folder.label),
      scopes: [...group.scopes],
      rows: group.rows,
      statusCounts,
      authority: computeAuthority(group.rows),
    });
  }

  // Append "Other" catch-all for unmapped scopes
  const otherGroup = grouped.get(UNMAPPED_FOLDER_ID);
  if (otherGroup && otherGroup.rows.length > 0) {
    const statusCounts: StatusCounts = {
      new: 0, match: 0, pending: 0, conflict: 0, accepted: 0, rejected: 0,
    };
    for (const row of otherGroup.rows) {
      const s = row.status;
      if (s === 'applied') {
        statusCounts.accepted++;
      } else if (s in statusCounts) {
        statusCounts[s as FieldStatus]++;
      }
    }

    // Log unmapped scopes so dev knows the map needs updating
    console.warn(
      '[Workbench] Unmapped scopes landed in "Other":',
      [...otherGroup.scopes],
    );

    sections.push({
      id: UNMAPPED_FOLDER_ID,
      label: UNMAPPED_FOLDER_LABEL,
      scopes: [...otherGroup.scopes],
      rows: otherGroup.rows,
      statusCounts,
      authority: computeAuthority(otherGroup.rows),
    });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useExtractionStaging(
  projectId: number,
  folders: FolderTab[],
  isLandDev: boolean = false,
  /** When provided, scopes results to extractions from this document only */
  docId?: number | null,
) {
  const queryClient = useQueryClient();
  const queryKey = ['extraction-staging', projectId, docId ?? 'all'];

  // Track how long we've been polling with zero results (extraction may have failed)
  const emptyPollStartRef = useRef<number | null>(null);
  const EXTRACTION_TIMEOUT_MS = 90_000; // Stop fast-polling after 90s with no results

  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey,
    queryFn: async () => {
      const url = new URL(`${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-staging/`);
      if (docId) url.searchParams.set('doc_id', String(docId));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Failed to fetch staging data: ${res.status}`);
      return res.json();
    },
    enabled: !!projectId,
    refetchOnWindowFocus: false,
    staleTime: 5_000,
    // Poll aggressively (3s) when scoped to a doc and no rows have arrived yet
    // (extraction is in-flight). Slow to 15s once results exist (user is reviewing).
    // Stop fast-polling after EXTRACTION_TIMEOUT_MS to avoid hammering the server
    // when the extraction pipeline failed silently.
    refetchInterval: (query) => {
      if (!docId) return false; // No doc scope — no auto-polling
      const qData = query.state.data as ApiResponse | undefined;
      const hasRows = (qData?.extractions?.length ?? 0) > 0;

      if (hasRows) {
        emptyPollStartRef.current = null; // Reset timeout tracker
        return 15_000; // Results exist — slow poll for background updates
      }

      // No rows yet — track how long we've been waiting
      if (!emptyPollStartRef.current) {
        emptyPollStartRef.current = Date.now();
      }
      const elapsed = Date.now() - emptyPollStartRef.current;
      if (elapsed > EXTRACTION_TIMEOUT_MS) {
        return false; // Give up — extraction likely failed
      }
      return 3_000; // Still waiting — fast poll
    },
  });

  const allRows = data?.extractions || [];

  // True when we're scoped to a doc and the extraction pipeline hasn't produced
  // any staging rows yet — indicates extraction is still in-flight.
  // Goes false once polling times out (extraction likely failed).
  const extractionTimedOut = !!emptyPollStartRef.current &&
    (Date.now() - emptyPollStartRef.current) > EXTRACTION_TIMEOUT_MS;
  const isExtracting = !!docId && !isLoading && allRows.length === 0 && !extractionTimedOut;

  const sections = useMemo(
    () => buildSections(allRows, folders, isLandDev),
    [allRows, folders, isLandDev],
  );

  // Compute per-section counts for tab badges
  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sec of sections) {
      counts[sec.id] = sec.rows.length;
    }
    return counts;
  }, [sections]);

  const statusCounts = data?.status_counts || {};
  const nonRejectedRows = useMemo(
    () => allRows.filter(r => r.status !== 'rejected'),
    [allRows],
  );
  const totalExpected = nonRejectedRows.length || 1;
  const appliedOrAccepted = nonRejectedRows.filter(r => r.status === 'applied' || r.status === 'accepted').length;
  const modelReadyPct = Math.round((appliedOrAccepted / totalExpected) * 100);

  // Optimistic update helper
  const optimisticUpdate = (extractionId: number, newStatus: string) => {
    queryClient.setQueryData<ApiResponse>(queryKey, old => {
      if (!old) return old;
      return {
        ...old,
        extractions: old.extractions.map(row =>
          row.extraction_id === extractionId
            ? { ...row, status: newStatus as StagingRow['status'] }
            : row
        ),
      };
    });
  };

  const approveField = useMutation({
    mutationFn: async (extractionId: number) => {
      const res = await fetch(
        `${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-staging/${extractionId}/approve/`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error('Failed to approve');
      return res.json();
    },
    onMutate: (extractionId) => {
      optimisticUpdate(extractionId, 'accepted');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const rejectField = useMutation({
    mutationFn: async (extractionId: number) => {
      const res = await fetch(
        `${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-staging/${extractionId}/reject/`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error('Failed to reject');
      return res.json();
    },
    onMutate: (extractionId) => {
      optimisticUpdate(extractionId, 'rejected');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const acceptAllPending = useMutation({
    mutationFn: async (scopes?: string[]) => {
      const res = await fetch(
        `${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-staging/accept-all-pending/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: scopes ? JSON.stringify({ scopes }) : '{}',
        },
      );
      if (!res.ok) throw new Error('Failed to accept all');
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const commitSection = useMutation({
    mutationFn: async (scopes: string[]) => {
      const res = await fetch(
        `${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-staging/commit/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ scopes }),
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Section commit failed (${res.status}): ${text}`);
      }
      return res.json();
    },
    onError: (err) => {
      console.error('[Workbench] commitSection error:', err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateFieldValue = useMutation({
    mutationFn: async ({ extractionId, newValue }: { extractionId: number; newValue: string }) => {
      const res = await fetch(
        `${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-staging/${extractionId}/update-value/`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ value: newValue }),
        }
      );
      if (!res.ok) throw new Error('Failed to update value');
      return res.json();
    },
    onMutate: ({ extractionId, newValue }) => {
      // Optimistic update: show the new value immediately
      queryClient.setQueryData<ApiResponse>(queryKey, old => {
        if (!old) return old;
        return {
          ...old,
          extractions: old.extractions.map(row =>
            row.extraction_id === extractionId
              ? { ...row, extracted_value: newValue }
              : row
          ),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const commitAllAccepted = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-staging/commit/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ commit_all_accepted: true }),
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Commit failed (${res.status}): ${text}`);
      }
      const json = await res.json();
      if (json.failed > 0) {
        console.warn('[Workbench] Commit partial failure:', json.errors);
      }
      return json;
    },
    onError: (err) => {
      console.error('[Workbench] commitAllAccepted error:', err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  /**
   * Resolve a conflict — choose extracted value ("extracted") or keep existing ("existing").
   * Backend endpoint: POST .../extraction-staging/{id}/resolve/
   */
  const resolveConflict = useMutation({
    mutationFn: async ({ extractionId, choice }: { extractionId: number; choice: 'extracted' | 'existing' }) => {
      const res = await fetch(
        `${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-staging/${extractionId}/resolve/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ choice }),
        }
      );
      if (!res.ok) throw new Error('Failed to resolve conflict');
      return res.json();
    },
    onMutate: ({ extractionId, choice }) => {
      // Optimistic: mark as accepted (chose extracted) or rejected (kept existing)
      optimisticUpdate(extractionId, choice === 'extracted' ? 'accepted' : 'rejected');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  /** Bulk-accept all rows with status='match' (optionally scoped) */
  const acceptAllMatches = useMutation({
    mutationFn: async (scopes?: string[]) => {
      const res = await fetch(
        `${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-staging/accept-all-matches/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: scopes ? JSON.stringify({ scopes }) : '{}',
        },
      );
      if (!res.ok) throw new Error('Failed to accept all matches');
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  /** Bulk-accept all rows with status='new' (optionally scoped) */
  const acceptAllNew = useMutation({
    mutationFn: async (scopes?: string[]) => {
      const res = await fetch(
        `${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-staging/accept-all-new/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: scopes ? JSON.stringify({ scopes }) : '{}',
        },
      );
      if (!res.ok) throw new Error('Failed to accept all new');
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  /** Abandon session — bulk-reject pending rows and mark intake session abandoned */
  const abandonSession = useMutation({
    mutationFn: async (params: { docId?: number | null; intakeUuid?: string | null }) => {
      const res = await fetch(
        `${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-staging/abandon/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            doc_id: params.docId ?? undefined,
            intake_uuid: params.intakeUuid ?? undefined,
          }),
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Abandon failed (${res.status}): ${text}`);
      }
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    // Data
    sections,
    allRows: nonRejectedRows,
    statusCounts,
    sectionCounts,
    totalExpected,
    modelReadyPct,
    isExtracting,
    isLoading,
    error,
    // Mutations
    approveField: approveField.mutate,
    rejectField: rejectField.mutate,
    resolveConflict: resolveConflict.mutate,
    acceptAllPending: acceptAllPending.mutate,
    acceptAllMatches: acceptAllMatches.mutate,
    acceptAllNew: acceptAllNew.mutate,
    commitSection: commitSection.mutateAsync,
    commitAllAccepted: commitAllAccepted.mutateAsync,
    updateFieldValue: updateFieldValue.mutate,
    abandonSession: abandonSession.mutateAsync,
    // Loading states
    isApproving: approveField.isPending,
    isRejecting: rejectField.isPending,
    isResolving: resolveConflict.isPending,
    isCommitting: commitAllAccepted.isPending || commitSection.isPending,
    isCommitSuccess: commitAllAccepted.isSuccess,
    commitError: commitAllAccepted.error || commitSection.error,
    /** Last commit result — includes { committed, failed, errors[] } */
    commitResult: (commitAllAccepted.data || commitSection.data) as
      | { committed: number; failed: number; errors: Array<{ extraction_id: number; field_key: string; error: string }> }
      | undefined,
  };
}
