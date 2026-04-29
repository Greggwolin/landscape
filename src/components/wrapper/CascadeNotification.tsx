'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';
import { useWrapperUI, type CascadeNotificationPayload } from '@/contexts/WrapperUIContext';
import { useArtifactUpdateState } from '@/hooks/useArtifact';

/**
 * Cascade-mode notification toast (Finding #4 Phase 4).
 *
 * Two flavors driven by `cascade_mode` on the payload:
 *
 *   `'auto'`   — completed-status toast. Lists how many artifacts were
 *                cascaded and shows a "View changes" affordance that opens
 *                the first cascaded artifact in the workspace panel.
 *
 *   `'manual'` — pending-action notification. Lists each dependent artifact
 *                with a per-row "Refresh" button that fires update_artifact
 *                with edit_source='drift_pull'. A "Dismiss" closes the toast
 *                without refreshing.
 *
 * Rendered once at the page-shell level (PageShell mounts it). The toast
 * pulls its payload from WrapperUIContext.cascadeNotification — endpoints
 * that emit cascade results call `setCascadeNotification(payload)` from
 * their response handlers.
 *
 * Spec: SPEC_FINDING4_GENERATIVE_ARTIFACTS.md §10.3.
 */
export function CascadeNotification() {
  const {
    cascadeNotification,
    setCascadeNotification,
    setActiveArtifactId,
    artifactsOpen,
    toggleArtifacts,
  } = useWrapperUI();
  const updateState = useArtifactUpdateState();

  if (!cascadeNotification) return null;

  const handleDismiss = () => setCascadeNotification(null);

  const handleOpenArtifact = (artifactId: number) => {
    setActiveArtifactId(artifactId);
    if (!artifactsOpen) toggleArtifacts();
    setCascadeNotification(null);
  };

  const handleRefreshOne = (artifactId: number) => {
    // Manual-mode refresh — fire update_artifact with edit_source='drift_pull'
    // and an empty patch. The cascade helper bumps captured_at on affected
    // pointers; here we apply the same lightweight refresh from the client
    // side so the dependent artifact's drift indicator clears.
    updateState.mutate({
      artifactId,
      input: { schema_diff: [], edit_source: 'drift_pull' },
    });
  };

  const handleRefreshAll = () => {
    const dependents = cascadeNotification.dependent_artifacts ?? [];
    for (const dep of dependents) {
      handleRefreshOne(dep.artifact_id);
    }
    setCascadeNotification(null);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1080,
        width: 360,
        maxWidth: 'calc(100vw - 32px)',
        background: 'var(--cui-card-bg)',
        color: 'var(--cui-body-color)',
        border: '1px solid var(--cui-border-color)',
        borderRadius: 6,
        boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
      }}
    >
      {cascadeNotification.cascade_mode === 'auto' && !cascadeNotification.wide_graph_fallback ? (
        <AutoToastBody
          payload={cascadeNotification}
          onDismiss={handleDismiss}
          onView={handleOpenArtifact}
        />
      ) : (
        <ManualToastBody
          payload={cascadeNotification}
          onDismiss={handleDismiss}
          onRefreshOne={handleRefreshOne}
          onRefreshAll={handleRefreshAll}
          onOpenArtifact={handleOpenArtifact}
          isRefreshing={updateState.isPending}
        />
      )}
    </div>
  );
}

/* ─── Auto mode toast ─────────────────────────────────────────────────── */

interface AutoBodyProps {
  payload: CascadeNotificationPayload;
  onDismiss: () => void;
  onView: (artifactId: number) => void;
}

function AutoToastBody({ payload, onDismiss, onView }: AutoBodyProps) {
  const cascaded = payload.cascaded_artifacts ?? [];
  const skipped = payload.skipped ?? [];
  const firstId = cascaded[0]?.artifact_id;
  return (
    <div style={{ padding: '12px 14px' }}>
      <div className="d-flex align-items-start gap-2">
        <CheckCircle2 size={18} style={{ color: 'var(--cui-success)', flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
            Cascaded update to {cascaded.length}{' '}
            {cascaded.length === 1 ? 'artifact' : 'artifacts'}
          </div>
          {cascaded.length > 0 && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--cui-secondary-color)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={cascaded.map((c) => c.title).filter(Boolean).join(', ')}
            >
              {cascaded
                .slice(0, 3)
                .map((c) => c.title || `#${c.artifact_id}`)
                .join(', ')}
              {cascaded.length > 3 && ` +${cascaded.length - 3} more`}
            </div>
          )}
          {skipped.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--cui-warning)', marginTop: 4 }}>
              {skipped.length} skipped
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="btn btn-sm btn-ghost-secondary"
          style={{ flexShrink: 0, padding: '2px 6px' }}
        >
          <X size={14} />
        </button>
      </div>
      {firstId !== undefined && (
        <div className="d-flex justify-content-end mt-2">
          <button
            type="button"
            className="btn btn-sm btn-ghost-primary"
            onClick={() => onView(firstId)}
          >
            View changes
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Manual mode toast ───────────────────────────────────────────────── */

interface ManualBodyProps {
  payload: CascadeNotificationPayload;
  onDismiss: () => void;
  onRefreshOne: (artifactId: number) => void;
  onRefreshAll: () => void;
  onOpenArtifact: (artifactId: number) => void;
  isRefreshing: boolean;
}

function ManualToastBody({
  payload,
  onDismiss,
  onRefreshOne,
  onRefreshAll,
  onOpenArtifact,
  isRefreshing,
}: ManualBodyProps) {
  const dependents = payload.dependent_artifacts ?? [];
  const wideFallback = payload.wide_graph_fallback === true;
  return (
    <div style={{ padding: '12px 14px' }}>
      <div className="d-flex align-items-start gap-2">
        <AlertCircle
          size={18}
          style={{ color: 'var(--cui-warning)', flexShrink: 0, marginTop: 1 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
            {wideFallback
              ? 'Many artifacts affected — manual refresh required'
              : 'This change affects other artifacts'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--cui-secondary-color)' }}>
            {dependents.length}{' '}
            {dependents.length === 1 ? 'artifact references' : 'artifacts reference'}{' '}
            the rows you just changed.
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="btn btn-sm btn-ghost-secondary"
          style={{ flexShrink: 0, padding: '2px 6px' }}
        >
          <X size={14} />
        </button>
      </div>

      <div
        style={{
          marginTop: 10,
          maxHeight: 200,
          overflowY: 'auto',
          borderTop: '1px solid var(--cui-border-color)',
          paddingTop: 8,
        }}
      >
        {dependents.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--cui-secondary-color)' }}>
            No dependents listed.
          </div>
        ) : (
          dependents.map((dep) => (
            <div
              key={dep.artifact_id}
              className="d-flex align-items-center gap-2"
              style={{ padding: '4px 0' }}
            >
              <button
                type="button"
                onClick={() => onOpenArtifact(dep.artifact_id)}
                className="btn btn-link btn-sm"
                style={{
                  padding: 0,
                  textAlign: 'left',
                  fontSize: 12,
                  color: 'var(--cui-link-color)',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={dep.title}
              >
                {dep.title || `Artifact #${dep.artifact_id}`}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost-primary d-flex align-items-center gap-1"
                onClick={() => onRefreshOne(dep.artifact_id)}
                disabled={isRefreshing}
                style={{ fontSize: 11, padding: '2px 8px' }}
              >
                <RefreshCw size={11} />
                Refresh
              </button>
            </div>
          ))
        )}
      </div>

      {dependents.length > 1 && (
        <div className="d-flex justify-content-end gap-2 mt-2">
          <button
            type="button"
            className="btn btn-sm btn-ghost-secondary"
            onClick={onDismiss}
          >
            Dismiss
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={onRefreshAll}
            disabled={isRefreshing}
          >
            Refresh all
          </button>
        </div>
      )}
    </div>
  );
}

export default CascadeNotification;
