'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFileDrop } from '@/contexts/FileDropContext';
import { RecentChatsList } from './RecentChatsList';
import { WrapperHeader, ChatToggleButton } from './WrapperHeader';

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
  const { addFiles } = useFileDrop();
  const [value, setValue] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, []);

  // File picker — opens native file selector. Selected files are queued via
  // FileDropContext so the chat surface picks them up after navigation via
  // the same path it already handles drag-drop on. Multi-select supported.
  const handleAddFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFilesChosen = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length === 0) return;
      setPendingFiles((prev) => [...prev, ...files]);
      // Reset the input value so picking the same file again still fires
      // the change event.
      e.target.value = '';
    },
    []
  );

  const removeFile = useCallback((idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const submit = useCallback(() => {
    const text = value.trim();
    const hasFiles = pendingFiles.length > 0;

    // Queue files in the shared drop context so the chat panel's existing
    // dropzone handler picks them up on the other side of the navigation.
    if (hasFiles) {
      addFiles(pendingFiles);
    }

    if (!text && !hasFiles) {
      router.push('/w/chat');
      return;
    }

    if (text) {
      router.push(`/w/chat?seed=${encodeURIComponent(text)}`);
    } else {
      // Files only — navigate without a seed; chat panel handles the file
      // intake flow when it sees pending files in context.
      router.push('/w/chat');
    }
  }, [router, value, pendingFiles, addFiles]);

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

  // Live date/time for the header bar — updates every minute.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const headerDateTime = useMemo(() => {
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${dateStr} · ${timeStr}`;
  }, [now]);

  return (
    <section className="user-dashboard">
      <WrapperHeader
        leading={<ChatToggleButton />}
        title={displayName || 'Home'}
        subtitle={headerDateTime}
      />
      <div className="user-dashboard-content">
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
            rows={3}
            aria-label="Start a conversation"
          />

          {pendingFiles.length > 0 && (
            <div className="user-dashboard-prompt-files">
              {pendingFiles.map((file, idx) => (
                <span key={`${file.name}-${idx}`} className="user-dashboard-file-chip">
                  <span className="user-dashboard-file-chip-name" title={file.name}>
                    {file.name}
                  </span>
                  <button
                    type="button"
                    className="user-dashboard-file-chip-remove"
                    onClick={() => removeFile(idx)}
                    aria-label={`Remove ${file.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="user-dashboard-prompt-actions">
            <button
              type="button"
              className="user-dashboard-prompt-attach"
              onClick={handleAddFiles}
              aria-label="Add document"
              title="Add document"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={handleFilesChosen}
            />
            <div className="user-dashboard-prompt-spacer" />
            <button
              type="button"
              className="user-dashboard-prompt-send"
              onClick={submit}
              aria-label="Send"
              disabled={!value.trim() && pendingFiles.length === 0}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="user-dashboard-list-wrap">
        <RecentChatsList
          homeProjectLabel={displayName || undefined}
          homeProjectId={homeProjectId}
        />
      </div>
      </div>
    </section>
  );
}
