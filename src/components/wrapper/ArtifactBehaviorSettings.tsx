'use client';

import React, { useState } from 'react';
import { CCard, CCardBody, CFormSwitch } from '@coreui/react';

import { getAuthHeaders } from '@/lib/authHeaders';
const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

type CascadeMode = 'auto' | 'manual';

interface ArtifactBehaviorSettingsProps {
  projectId: number;
  /** Current value from `tbl_project.artifact_cascade_mode`. */
  initialMode: CascadeMode;
  /** Optional callback fired when the mode is successfully persisted. */
  onChange?: (mode: CascadeMode) => void;
}

/**
 * Small Project Settings panel exposing the cascade-mode toggle
 * (Finding #4 Phase 4, spec §10.5).
 *
 * Auto cascade ON  → `artifact_cascade_mode = 'auto'`. Edits to upstream
 *                    values silently propagate to dependent artifacts.
 * Auto cascade OFF → `artifact_cascade_mode = 'manual'`. Same edits
 *                    surface a notification toast with per-artifact
 *                    Refresh buttons; nothing changes until the user
 *                    clicks.
 *
 * Persists via the existing legacy Next.js route
 * `PATCH /api/projects/<id>/details` with `{artifact_cascade_mode}`. The
 * route is permissive about field names — Phase 1's migration already
 * exposed the column on `tbl_project`, so the PATCH writes directly.
 */
export function ArtifactBehaviorSettings({
  projectId,
  initialMode,
  onChange,
}: ArtifactBehaviorSettingsProps) {
  const [mode, setMode] = useState<CascadeMode>(initialMode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (next: CascadeMode) => {
    if (next === mode || pending) return;
    setPending(true);
    setError(null);
    const previous = mode;
    setMode(next); // optimistic
    try {
      const res = await fetch(`/api/projects/${projectId}/details`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifact_cascade_mode: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error || `Failed to update cascade mode (${res.status})`,
        );
      }
      // Some Django proxies also accept the same field via the Django
      // PATCH /api/projects/<id>/ endpoint. The legacy /details route is
      // the canonical write path for tbl_project today; keep it simple.
      void DJANGO_API_URL;
      onChange?.(next);
    } catch (err) {
      setMode(previous);
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setPending(false);
    }
  };

  return (
    <CCard
      style={{
        background: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)',
      }}
      className="mb-3"
    >
      <CCardBody style={{ padding: '12px 16px' }}>
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              color: 'var(--cui-secondary-color)',
              marginBottom: 4,
            }}
          >
            Artifact Behavior
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--cui-body-color)',
            }}
          >
            Auto-cascade artifact updates
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <CFormSwitch
            checked={mode === 'auto'}
            disabled={pending}
            onChange={(e) =>
              handleToggle((e.target as HTMLInputElement).checked ? 'auto' : 'manual')
            }
            id={`artifact-cascade-${projectId}`}
            aria-label="Toggle auto-cascade artifact updates"
          />
          <span
            style={{
              fontSize: 12,
              color: 'var(--cui-secondary-color)',
            }}
          >
            {mode === 'auto'
              ? 'On — dependents update silently when you change source values.'
              : 'Off — you will be notified and refresh manually.'}
          </span>
        </div>

        <p
          style={{
            fontSize: 11,
            color: 'var(--cui-secondary-color)',
            marginTop: 8,
            marginBottom: 0,
          }}
        >
          Useful when preparing a deliverable where values must stay frozen.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 8,
              fontSize: 11,
              color: 'var(--cui-danger)',
            }}
          >
            {error}
          </div>
        )}
      </CCardBody>
    </CCard>
  );
}

export default ArtifactBehaviorSettings;
