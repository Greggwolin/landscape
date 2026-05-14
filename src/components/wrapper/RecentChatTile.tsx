'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { getPropertyTypeBadgeStyle, getPropertyTypeTokenRef } from '@/config/propertyTypeTokens';

/**
 * RecentChatTile — one row in the dashboard's Recent Conversations list.
 *
 * Renders project label + last-message snippet + time-since. The colored dot
 * encodes property type (Land Dev / MF / Office / etc.). Threads not tied to
 * a real estate project (the user's "home" project, Phase 2) render with a
 * neutral dot and the user's name as the label.
 *
 * Click behavior mirrors the sidebar (WrapperLayout buildThreadItem):
 *   - project-scoped → /w/projects/{pid}?thread={tid}
 *   - unassigned → /w/chat/{tid}
 *
 * Phase 1 — RecentChatsList renders mock data first; the real fetch is wired
 * in this same phase against the existing /api/landscaper/threads/?all_user_threads=true
 * endpoint (the sidebar already consumes it).
 */

export interface RecentChatTileData {
  threadId: string;
  title: string | null;
  firstUserMessage: string | null;
  projectId: number | null;
  projectName: string | null;
  projectTypeCode: string | null;
  updatedAt: string; // ISO
}

interface RecentChatTileProps {
  data: RecentChatTileData;
  /** Fallback label for threads with no projectId (Phase 1: username; Phase 2: user home project's name field). */
  homeProjectLabel?: string;
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const ms = Date.now() - t;
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString();
}

function buildLabel(data: RecentChatTileData, homeProjectLabel?: string): string {
  if (data.projectName) return data.projectName;
  return homeProjectLabel || 'Personal';
}

function buildSnippet(data: RecentChatTileData): string {
  const source = (data.title && data.title.trim()) || (data.firstUserMessage && data.firstUserMessage.trim()) || '';
  if (!source) return 'New conversation';
  return source.length > 90 ? source.slice(0, 90).trimEnd() + '…' : source;
}

export function RecentChatTile({ data, homeProjectLabel }: RecentChatTileProps) {
  const router = useRouter();
  const label = buildLabel(data, homeProjectLabel);
  const snippet = buildSnippet(data);
  const time = timeAgo(data.updatedAt);

  // Color dot: property-type when known, neutral when this is a personal/home chat.
  const hasType = !!getPropertyTypeTokenRef(data.projectTypeCode);
  const dotStyle: React.CSSProperties = hasType
    ? {
        // Use the soft badge background color as the dot color
        background: getPropertyTypeBadgeStyle(data.projectTypeCode, 'soft').background as string,
      }
    : {
        background: 'var(--w-text-tertiary)',
      };

  const handleClick = () => {
    if (data.projectId) {
      router.push(`/w/projects/${data.projectId}?thread=${data.threadId}`);
    } else {
      router.push(`/w/chat/${data.threadId}`);
    }
  };

  return (
    <button type="button" className="user-dashboard-tile" onClick={handleClick}>
      <span className="user-dashboard-tile-dot" style={dotStyle} aria-hidden />
      <span className="user-dashboard-tile-body">
        <span className="user-dashboard-tile-label">{label}</span>
        <span className="user-dashboard-tile-snippet">{snippet}</span>
      </span>
      {time && <span className="user-dashboard-tile-time">{time}</span>}
    </button>
  );
}
