'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { RecentChatsList } from './RecentChatsList';

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
 * UserDashboard — the authenticated landing surface in the chat-forward UI.
 *
 * Three regions stacked vertically:
 *   1. Header — the user's display name (per v2 spec, this is the visual cue
 *      that they're in "personal/general territory" — the home project's name
 *      field is the username, Phase 2 work).
 *   2. Prompt input — "What are we working on today?" Auto-focused.
 *   3. Recent conversations — top 7 across all projects.
 *
 * Phase 1 scope: layout shell only. Submitting the prompt routes to the
 * unassigned chat surface (`/w/chat?seed=...`) and lets the existing chat
 * panel handle thread creation. Phase 3 wires the prompt directly to
 * Landscaper with intent classification.
 *
 * Rendered IN PLACE OF CenterChatPanel on the /w/dashboard route — see
 * `src/app/w/layout.tsx` for the route-aware swap.
 */

const PROMPT_PLACEHOLDER = 'What are we working on today?';

export function UserDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Home project id — resolved once on mount. Used by tile click logic to
  // route home-project chats into the dashboard rather than a real project
  // workspace. /api/projects/home is idempotent (creates on first call),
  // so this also self-heals for any existing user the backfill missed.
  const [homeProjectId, setHomeProjectId] = useState<number | null>(null);

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

  // Auto-focus on mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-grow the textarea up to a cap. Keeps the prompt feeling like a
  // single-line input until the user types more.
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text) {
      // Empty submit = same as "New chat" — go to the chat surface and let
      // the user start fresh.
      router.push('/w/chat');
      return;
    }
    // Phase 1: pass the prompt through a query param. The chat panel reads
    // this on mount (Phase 3 wires the read; until then the user types again
    // — acceptable for a layout-only first cut).
    router.push(`/w/chat?seed=${encodeURIComponent(text)}`);
  }, [router, value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit]
  );

  const displayName = (() => {
    if (!user) return '';
    const full = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return full || user.username || '';
  })();

  return (
    <section className="user-dashboard">
      <header className="user-dashboard-header">
        <h1 className="user-dashboard-greeting">
          {displayName ? `Welcome back, ${displayName.split(' ')[0]}.` : 'Welcome back.'}
        </h1>
      </header>

      <div className="user-dashboard-prompt-wrap">
        <div className="user-dashboard-prompt">
          <textarea
            ref={inputRef}
            className="user-dashboard-prompt-input"
            placeholder={PROMPT_PLACEHOLDER}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={1}
            aria-label="Start a conversation"
          />
          <button
            type="button"
            className="user-dashboard-prompt-send"
            onClick={submit}
            aria-label="Send"
            disabled={!value.trim()}
          >
            ↵
          </button>
        </div>
      </div>

      <div className="user-dashboard-list-wrap">
        <RecentChatsList
          homeProjectLabel={displayName || undefined}
          homeProjectId={homeProjectId}
        />
      </div>
    </section>
  );
}
