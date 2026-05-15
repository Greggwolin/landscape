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
 * the user's home project — BUT only when the home project actually has
 * artifacts or documents to show. Empty home → no panel rail (a fresh dashboard
 * is just the greeting + prompt + recent chats, no empty side rail).
 *
 * Section labels in the panel are adjusted for the home context: "Project
 * Documents" → "Documents" (there's no project to qualify the label).
 *
 * The home project id is resolved via /api/projects/home (idempotent — creates
 * on first hit so existing users self-heal). Artifact and document counts are
 * pre-fetched here purely to decide whether to render the panel. The panel
 * itself re-fetches its own data when mounted.
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

/**
 * Quick existence probe — returns true if the home project has at least one
 * artifact (or unassigned artifact) OR at least one document. Used to decide
 * whether to mount the artifacts panel at all.
 *
 * Why include unassigned: until Phase 3 attaches dashboard chats to the home
 * project, threads created from the home dashboard are unassigned
 * (project_id=null), and so are their artifacts. Without folding unassigned
 * into the probe, the user creates an artifact from the home page and it
 * silently doesn't appear when they come back. The artifacts panel itself
 * is told to include unassigned for the same reason (see the
 * includeUnassigned prop on ProjectArtifactsPanel below).
 */
async function homeHasContent(projectId: number): Promise<boolean> {
  const headers = getAuthHeaders();
  const [artifactsHomeRes, artifactsUnassignedRes, docRes] = await Promise.allSettled([
    fetch(`${DJANGO_API_URL}/api/artifacts/?project_id=${projectId}&limit=1`, { headers }),
    fetch(`${DJANGO_API_URL}/api/artifacts/?include_unassigned=true&limit=1`, { headers }),
    fetch(`${DJANGO_API_URL}/api/dms/documents/?project_id=${projectId}`, { headers }),
  ]);

  const anyArtifacts = async (
    settled: PromiseSettledResult<Response>,
  ): Promise<boolean> => {
    if (settled.status !== 'fulfilled' || !settled.value.ok) return false;
    try {
      const data = await settled.value.json();
      if (Array.isArray(data?.results)) return data.results.length > 0;
      if (Array.isArray(data)) return data.length > 0;
      return false;
    } catch {
      return false;
    }
  };

  const hasArtifacts =
    (await anyArtifacts(artifactsHomeRes)) || (await anyArtifacts(artifactsUnassignedRes));

  const hasDocs = await (async () => {
    if (docRes.status !== 'fulfilled' || !docRes.value.ok) return false;
    try {
      const data = await docRes.value.json();
      if (Array.isArray(data)) return data.length > 0;
      if (Array.isArray(data?.results)) return data.results.length > 0;
      if (Array.isArray(data?.documents)) return data.documents.length > 0;
      return false;
    } catch {
      return false;
    }
  })();

  return hasArtifacts || hasDocs;
}

export default function WrapperDashboardPage() {
  const { setRightPanelNarrow } = useWrapperUI();
  const [homeProjectId, setHomeProjectId] = useState<number | null>(null);
  const [shouldMount, setShouldMount] = useState<boolean>(false);

  // Resolve the home project id, then probe for existing artifacts/documents.
  // Panel only mounts if at least one exists — fresh dashboards stay clean.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${DJANGO_API_URL}/api/projects/home/`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.project_id) return;
        const pid = Number(data.project_id);
        setHomeProjectId(pid);
        const has = await homeHasContent(pid);
        if (!cancelled && has) setShouldMount(true);
      } catch {
        /* swallow — leave panel hidden on errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // rightPanelNarrow is only meaningful when the panel actually renders.
  // Toggling it only when shouldMount flips true prevents a flash of the
  // narrow-main layout on empty dashboards.
  useEffect(() => {
    if (!shouldMount) return;
    setRightPanelNarrow(true);
    return () => setRightPanelNarrow(false);
  }, [shouldMount, setRightPanelNarrow]);

  if (!shouldMount || !homeProjectId) return null;
  return (
    <ProjectArtifactsPanel
      projectId={homeProjectId}
      documentsLabel="Documents"
      includeUnassigned
    />
  );
}
