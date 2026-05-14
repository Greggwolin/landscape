'use client';

import React, { useEffect, useState } from 'react';
import { RecentChatTile, type RecentChatTileData } from './RecentChatTile';

/**
 * RecentChatsList — the "pick up where you left off" panel on the dashboard.
 *
 * Fetches recent threads across ALL projects (project-scoped + unassigned)
 * from /api/landscaper/threads/?all_user_threads=true and renders the top N
 * as RecentChatTiles. "Show more" expands the cap.
 *
 * Empty state (zero threads) renders nothing — the dashboard's parent
 * UserDashboard component decides what to show in that case (per v2 spec:
 * empty-state shows only the prompt box).
 *
 * Phase 1: pulls from the existing threads endpoint. The sidebar consumes
 * the same endpoint, so no new API work needed here.
 */

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
const INITIAL_CAP = 7;
const EXPANDED_CAP = 20;

interface ThreadRowFromApi {
  threadId: string;
  title: string | null;
  firstUserMessage: string | null;
  projectId: number | null;
  projectName: string | null;
  pageContext: string | null;
  updatedAt: string;
  isActive: boolean;
  // The API may also return project_type_code on enriched rows. Phase 1
  // tolerates its absence — tiles fall back to a neutral dot.
  projectTypeCode?: string | null;
}

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

interface RecentChatsListProps {
  /** Label used for home-project tiles (typically the user's display name). */
  homeProjectLabel?: string;
  /** The current user's home project id. Tiles whose projectId matches will
   *  route to /w/dashboard instead of a project workspace. */
  homeProjectId?: number | null;
}

export function RecentChatsList({ homeProjectLabel, homeProjectId }: RecentChatsListProps) {
  const [threads, setThreads] = useState<ThreadRowFromApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${DJANGO_API_URL}/api/landscaper/threads/?all_user_threads=true`, {
      headers: getAuthHeaders(),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data?.threads) ? (data.threads as ThreadRowFromApi[]) : [];
        // Backend already sorts by recency; if not, sort defensively.
        rows.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        setThreads(rows);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e?.message || e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="user-dashboard-list-error">
        Couldn&apos;t load recent conversations: {error}
      </div>
    );
  }

  if (threads === null) {
    return <div className="user-dashboard-list-loading">Loading conversations…</div>;
  }

  if (threads.length === 0) {
    // Per v2 spec: empty state shows only the prompt box. Render nothing here.
    return null;
  }

  const cap = expanded ? EXPANDED_CAP : INITIAL_CAP;
  const visible = threads.slice(0, cap);
  const hasMore = threads.length > cap;

  return (
    <div className="user-dashboard-list">
      <div className="user-dashboard-list-header">Recent conversations</div>
      <div className="user-dashboard-list-rows">
        {visible.map((t) => (
          <RecentChatTile
            key={t.threadId}
            homeProjectLabel={homeProjectLabel}
            homeProjectId={homeProjectId}
            data={{
              threadId: t.threadId,
              title: t.title,
              firstUserMessage: t.firstUserMessage,
              projectId: t.projectId,
              projectName: t.projectName,
              projectTypeCode: t.projectTypeCode ?? null,
              updatedAt: t.updatedAt,
            }}
          />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="user-dashboard-list-more"
          onClick={() => setExpanded(true)}
        >
          Show more
        </button>
      )}
    </div>
  );
}
