'use client';

import React, { useEffect, useState } from 'react';
import { ProjectArtifactsPanel } from '@/components/wrapper/ProjectArtifactsPanel';
import { useWrapperUI } from '@/contexts/WrapperUIContext';

/**
 * /w/dashboard — authenticated landing route for the chat-forward UI.
 *
 * Mirrors the project-landing-page structure: center column hosts UserDashboard
 * (rendered by the layout's route-aware swap in place of CenterChatPanel), and
 * THIS page renders ProjectArtifactsPanel in the wrapper-main slot scoped to
 * the user's home project. Result: same three-pane shell as inside any real
 * project — sidebar / chat / persistent artifacts panel.
 *
 * The home project id is resolved via /api/projects/home (idempotent — creates
 * on first hit so existing users self-heal). While the id is loading, the
 * artifacts panel skeleton is intentionally hidden rather than rendering a
 * placeholder; the resolution is fast enough that flashing-and-replacing
 * would be more distracting than a brief empty rail.
 *
 * Layout-level details (rightPanelNarrow flag, wrapper-main visibility on
 * the dashboard route) are coordinated by /w/layout.tsx.
 *
 * LF-USERDASH-0514 Phase 2 follow-up.
 */

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access) return { Authorization: `Bearer ${parsed.access}` };
    }
  } catch {
    /* ignore */
  }
  return {};
}

export default function WrapperDashboardPage() {
  const { setRightPanelNarrow } = useWrapperUI();
  const [homeProjectId, setHomeProjectId] = useState<number | null>(null);

  // Mirror project root behavior — shrink wrapper-main to the artifacts panel
  // width so the chat surface (UserDashboard) gets the rest of the row.
  useEffect(() => {
    setRightPanelNarrow(true);
    return () => setRightPanelNarrow(false);
  }, [setRightPanelNarrow]);

  // Resolve the current user's home project id. The endpoint is idempotent —
  // creates on first call if missing, so this also self-heals for any user
  // the Phase 2 backfill didn't reach.
  useEffect(() => {
    let cancelled = false;
    fetch(`${DJANGO_API_URL}/api/projects/home/`, {
      headers: getAuthHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.project_id) setHomeProjectId(Number(data.project_id));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!homeProjectId) return null;
  return <ProjectArtifactsPanel projectId={homeProjectId} />;
}
