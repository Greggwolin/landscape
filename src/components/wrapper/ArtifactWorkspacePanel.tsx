'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Pin, Clock, Database } from 'lucide-react';
import { useWrapperUI } from '@/contexts/WrapperUIContext';
import { useModalRegistrySafe } from '@/contexts/ModalRegistryContext';
import {
  type ArtifactSummary,
  useArtifact,
  useArtifactList,
  useArtifactPatch,
  useArtifactRestore,
  useArtifactUpdateState,
} from '@/hooks/useArtifact';
import type { EditTarget, JsonPatchOp, SourceRef } from '@/types/artifact';
import { ArtifactRenderer } from './ArtifactRenderer';

interface ArtifactWorkspacePanelProps {
  /** Project context — null for unassigned threads. */
  projectId: number | null;
}

/**
 * Right-panel workspace for generative artifacts (Finding #4, Phase 3).
 *
 * Four collapsible sections:
 *   1. Pinned Artifacts (collapsed by default)
 *   2. Recent Artifacts (collapsed by default)
 *   3. Active Artifact (always expanded — hosts ArtifactRenderer)
 *   4. Source Pointers (collapsed by default — shows the active artifact's
 *      source-of-truth pointers with drift status)
 *
 * Switching artifacts: one click in Pinned or Recent sets `activeArtifactId`
 * in WrapperUIContext, which swaps the Active section content.
 *
 * Auto-open on create: handled in CenterChatPanel.handleToolResult — when
 * `create_artifact` returns with `action: 'show_artifact'`, the active id
 * is set and the artifacts panel is opened. This component just renders.
 *
 * Spec: SPEC_FINDING4_GENERATIVE_ARTIFACTS.md §9
 */
export function ArtifactWorkspacePanel({ projectId }: ArtifactWorkspacePanelProps) {
  const { activeArtifactId, setActiveArtifactId, toggleArtifacts } = useWrapperUI();
  const modalRegistry = useModalRegistrySafe();

  // Pinned artifacts — always show (small list).
  const pinnedQuery = useArtifactList({
    project_id: projectId ?? undefined,
    pinned_only: true,
    include_unassigned: projectId == null,
    limit: 50,
  });

  // Recent artifacts (excluding pinned, top 10) — same query parameters but
  // unfiltered for pinned. Frontend filters out pinned ids client-side.
  const recentQuery = useArtifactList({
    project_id: projectId ?? undefined,
    include_unassigned: projectId == null,
    limit: 10,
  });

  const pinnedArtifacts: ArtifactSummary[] = pinnedQuery.data?.results ?? [];
  const pinnedIds = useMemo(
    () => new Set(pinnedArtifacts.map((a) => a.artifact_id)),
    [pinnedArtifacts],
  );
  const recentArtifacts: ArtifactSummary[] = (recentQuery.data?.results ?? []).filter(
    (a) => !pinnedIds.has(a.artifact_id),
  );

  // Active artifact — full detail.
  const activeQuery = useArtifact(activeArtifactId);
  const active = activeQuery.data ?? null;

  // Mutations.
  const patchMutation = useArtifactPatch();
  const restoreMutation = useArtifactRestore();
  const updateStateMutation = useArtifactUpdateState();

  // Section collapsed state — Pinned and Recent default collapsed; Source Pointers default collapsed.
  const [pinnedCollapsed, setPinnedCollapsed] = useState(true);
  const [recentCollapsed, setRecentCollapsed] = useState(true);
  const [pointersCollapsed, setPointersCollapsed] = useState(true);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--cui-body-bg)',
        color: 'var(--cui-body-color)',
      }}
    >
      {/* ── Pinned Artifacts ── */}
      <CollapsibleSection
        title="Pinned Artifacts"
        icon={<Pin size={12} />}
        count={pinnedArtifacts.length}
        collapsed={pinnedCollapsed}
        onToggle={() => setPinnedCollapsed((v) => !v)}
      >
        {pinnedArtifacts.length === 0 ? (
          <EmptyRow text="No pinned artifacts." />
        ) : (
          pinnedArtifacts.map((a) => (
            <ArtifactListRow
              key={a.artifact_id}
              artifact={a}
              isActive={a.artifact_id === activeArtifactId}
              onClick={() => setActiveArtifactId(a.artifact_id)}
            />
          ))
        )}
      </CollapsibleSection>

      {/* ── Recent Artifacts ── */}
      <CollapsibleSection
        title="Recent Artifacts"
        icon={<Clock size={12} />}
        count={recentArtifacts.length}
        collapsed={recentCollapsed}
        onToggle={() => setRecentCollapsed((v) => !v)}
      >
        {recentArtifacts.length === 0 ? (
          <EmptyRow text="No recent artifacts." />
        ) : (
          recentArtifacts.map((a) => (
            <ArtifactListRow
              key={a.artifact_id}
              artifact={a}
              isActive={a.artifact_id === activeArtifactId}
              onClick={() => setActiveArtifactId(a.artifact_id)}
            />
          ))
        )}
      </CollapsibleSection>

      {/* ── Active Artifact (always expanded, takes remaining space) ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          borderTop: '1px solid var(--cui-border-color)',
          borderBottom: '1px solid var(--cui-border-color)',
          background: 'var(--cui-body-bg)',
        }}
      >
        {activeArtifactId == null ? (
          <EmptyActiveState
            hasArtifacts={pinnedArtifacts.length + recentArtifacts.length > 0}
          />
        ) : activeQuery.isLoading ? (
          <div style={emptyStateStyle}>Loading artifact…</div>
        ) : activeQuery.error ? (
          <div style={{ ...emptyStateStyle, color: 'var(--cui-danger)' }}>
            Failed to load artifact #{activeArtifactId}.
          </div>
        ) : !active ? (
          <div style={emptyStateStyle}>Artifact not found.</div>
        ) : (
          <ArtifactRenderer
            artifactId={active.artifact_id}
            title={active.title}
            schema={active.current_state_json}
            sourcePointers={active.source_pointers_json}
            // Phase 3: currentValues map is not yet wired to a backend lookup —
            // Phase 4 fills this in via the dependency-tracking endpoints.
            currentValues={undefined}
            removedRowPaths={undefined}
            newRowsAvailable={false}
            editTarget={asEditTarget(active.edit_target_json)}
            pinnedLabel={active.pinned_label}
            loading={
              patchMutation.isPending
              || restoreMutation.isPending
              || updateStateMutation.isPending
            }
            onClose={() => {
              setActiveArtifactId(null);
            }}
            onUpdate={(patch: JsonPatchOp[]) => {
              // Phase 4 — real write path. Lands in update_artifact_record on
              // the backend (same code as the Landscaper tool dispatcher),
              // appends a version log entry, fires the dependency cascade
              // hook for the project. Detail + versions cache are invalidated
              // on success.
              if (!patch || patch.length === 0) return;
              updateStateMutation.mutate({
                artifactId: active.artifact_id,
                input: {
                  schema_diff: patch,
                  edit_source: 'user_edit',
                },
              });
            }}
            onPin={(label: string) => {
              patchMutation.mutate({
                artifactId: active.artifact_id,
                patch: { pinned_label: label },
              });
            }}
            onUnpin={() => {
              patchMutation.mutate({
                artifactId: active.artifact_id,
                patch: { pinned_label: null },
              });
            }}
            onSaveAsNewVersion={(label) => {
              // Phase 3: stub — pin-with-label path is the closest existing
              // primitive. Real "save as new version" creates a new artifact
              // row via the create_artifact tool dispatcher in Phase 4.
              if (label) {
                patchMutation.mutate({
                  artifactId: active.artifact_id,
                  patch: { pinned_label: label },
                });
              }
               
              console.log('[ArtifactWorkspacePanel] save-as-new-version (Phase 3 stub)', label);
            }}
            onOpenModal={(modalName: string) => {
              if (modalRegistry) {
                modalRegistry.openModal(modalName, {
                  source_artifact_id: active.artifact_id,
                });
              }
            }}
          />
        )}
      </div>

      {/* ── Source Pointers ── */}
      <CollapsibleSection
        title="Source Pointers"
        icon={<Database size={12} />}
        count={countSourcePointers(active?.source_pointers_json)}
        collapsed={pointersCollapsed}
        onToggle={() => setPointersCollapsed((v) => !v)}
        compact
      >
        {!active ? (
          <EmptyRow text="Select an artifact to see its source pointers." />
        ) : (
          renderSourcePointers(active.source_pointers_json)
        )}
      </CollapsibleSection>

      {/* Phase 3 hint — restore tool unused in this pass; surfaces in Phase 4 */}
      <div style={{ display: 'none' }} aria-hidden>
        {restoreMutation.status}
      </div>
      <CollapseToggleHint onCollapseAll={toggleArtifacts} />
    </div>
  );
}

/* ─── Section primitives ──────────────────────────────────────────────── */

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  collapsed: boolean;
  onToggle: () => void;
  compact?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  count,
  collapsed,
  onToggle,
  compact = false,
  children,
}: CollapsibleSectionProps) {
  return (
    <div
      style={{
        flexShrink: 0,
        borderBottom: '1px solid var(--cui-border-color)',
        background: 'var(--cui-tertiary-bg)',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          padding: compact ? '4px 12px' : '6px 12px',
          background: 'transparent',
          border: 'none',
          color: 'var(--cui-body-color)',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.3,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        {icon}
        <span style={{ flex: 1 }}>{title}</span>
        {typeof count === 'number' && count > 0 && (
          <span
            style={{
              fontSize: 10,
              color: 'var(--cui-secondary-color)',
              fontWeight: 500,
              padding: '0 6px',
              borderRadius: 8,
              background: 'var(--cui-secondary-bg)',
            }}
          >
            {count}
          </span>
        )}
      </button>
      {!collapsed && (
        <div
          style={{
            maxHeight: 240,
            overflowY: 'auto',
            background: 'var(--cui-body-bg)',
            borderTop: '1px solid var(--cui-border-color)',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface ArtifactListRowProps {
  artifact: ArtifactSummary;
  isActive: boolean;
  onClick: () => void;
}

function ArtifactListRow({ artifact, isActive, onClick }: ArtifactListRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '6px 12px',
        background: isActive ? 'var(--cui-secondary-bg)' : 'transparent',
        border: 'none',
        borderLeft: isActive
          ? '3px solid var(--cui-primary)'
          : '3px solid transparent',
        color: 'var(--cui-body-color)',
        fontSize: 12,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <FileText size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: isActive ? 600 : 500,
          }}
          title={artifact.title}
        >
          {artifact.pinned_label && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--cui-warning)',
                marginRight: 4,
              }}
            >
              [{artifact.pinned_label}]
            </span>
          )}
          {artifact.title}
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--cui-secondary-color)',
            marginTop: 1,
          }}
        >
          {formatRelative(artifact.last_edited_at)}
        </div>
      </div>
    </button>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        fontSize: 11,
        color: 'var(--cui-secondary-color)',
        fontStyle: 'italic',
      }}
    >
      {text}
    </div>
  );
}

const emptyStateStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  color: 'var(--cui-secondary-color)',
  fontSize: 12,
  textAlign: 'center',
};

interface EmptyActiveStateProps {
  hasArtifacts: boolean;
}

function EmptyActiveState({ hasArtifacts }: EmptyActiveStateProps) {
  return (
    <div style={emptyStateStyle}>
      <div style={{ maxWidth: 320, lineHeight: 1.5 }}>
        <FileText size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
        <div style={{ fontWeight: 600, color: 'var(--cui-body-color)', marginBottom: 4 }}>
          No artifact selected
        </div>
        {hasArtifacts ? (
          <div>Pick one from the Pinned or Recent sections above.</div>
        ) : (
          <div>
            Ask Landscaper to <em>show</em> or <em>summarize</em> something — operating
            statement, rent roll, comp comparison — and it will appear here.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Renders nothing — the artifact panel's own collapse toggle lives in
 * ProjectArtifactsPanel's header. This is a placeholder that keeps the
 * `toggleArtifacts` callback referenced so eslint doesn't drop it from
 * deps in future refactors.
 */
function CollapseToggleHint({ onCollapseAll: _onCollapseAll }: { onCollapseAll: () => void }) {
  return null;
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function asEditTarget(raw: unknown): EditTarget | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) {
    // Validate as EditTargetListItem[]
    if (raw.every((item) => item && typeof item === 'object' && 'modal_name' in item)) {
      return raw as EditTarget;
    }
    return undefined;
  }
  if (typeof raw === 'object' && 'modal_name' in (raw as Record<string, unknown>)) {
    return raw as EditTarget;
  }
  return undefined;
}

function countSourcePointers(pointers: unknown): number {
  if (!pointers || typeof pointers !== 'object') return 0;
  if (Array.isArray(pointers)) return pointers.length;
  return Object.keys(pointers as Record<string, unknown>).length;
}

function renderSourcePointers(pointers: unknown): React.ReactNode {
  if (!pointers || typeof pointers !== 'object') {
    return <EmptyRow text="No source pointers on this artifact." />;
  }
  const entries: Array<{ path: string; ref: SourceRef }> = [];
  if (Array.isArray(pointers)) {
    pointers.forEach((p, i) => {
      if (p && typeof p === 'object' && 'table' in p) {
        entries.push({ path: String((p as Record<string, unknown>).path ?? i), ref: p as SourceRef });
      }
    });
  } else {
    Object.entries(pointers as Record<string, unknown>).forEach(([path, ref]) => {
      if (ref && typeof ref === 'object' && 'table' in (ref as Record<string, unknown>)) {
        entries.push({ path, ref: ref as SourceRef });
      }
    });
  }
  if (entries.length === 0) {
    return <EmptyRow text="No source pointers on this artifact." />;
  }
  return (
    <div style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {entries.map(({ path, ref }) => (
        <div
          key={path}
          style={{
            fontSize: 11,
            color: 'var(--cui-body-color)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            padding: '2px 0',
            borderBottom: '1px dotted var(--cui-border-color)',
          }}
        >
          <span style={{ color: 'var(--cui-secondary-color)' }}>{path}</span>
          <span style={{ fontFamily: 'monospace' }}>
            {ref.table}:{String(ref.row_id)}
            {ref.column ? `.${ref.column}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
