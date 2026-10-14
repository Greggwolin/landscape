'use client';

/**
 * DesignNavPanel — the expanded navigation of the Slice 1 reference (frame C2),
 * drawn to its measurements: 232px near-black column, 13px rows, "landscape «"
 * head, New chat + Search chats, Home / Projects ›, the open project's sections
 * under its name, Threads › and Artifacts › (expand in place), Platform
 * (Landscaper AI, Platform knowledge, Tools, Admin), the Chat / Classic / Design
 * switch, and the user at the foot. Pure presentation; every action is passed in.
 * The reference's "Scheduled" block is not drawn: its items were mocks and were
 * removed from the app on Gregg's instruction (2026-09-22).
 */
import React, { useState } from 'react';
import { UiModeSwitch } from '@/components/ui/UiModeSwitch';

export interface DesignNavLink { id: string; label: string; badge?: string }
export interface DesignNavThread { id: string; label: string; onClick: () => void }

interface DesignNavPanelProps {
  onCollapse: () => void;
  onNewChat: () => void;
  onSearch: () => void;
  onNavigate: (page: string) => void; // dashboard | projects | landscaper | platform-knowledge | tools | admin | help
  activePage?: string;
  project?: {
    name: string;
    sections: DesignNavLink[];
    activeSectionId?: string;
    onSelectSection: (id: string) => void;
  };
  threads?: DesignNavThread[];
  artifacts?: Array<{ id: number; title: string; onClick: () => void }>;
  user?: { name: string; initials: string; org?: string };
  isAdmin?: boolean;
  recentProjectId?: number | string | null;
  onLogout?: () => void;
}

export function DesignNavPanel({
  onCollapse, onNewChat, onSearch, onNavigate, activePage, project, threads = [], artifacts = [],
  user, isAdmin, recentProjectId, onLogout,
}: DesignNavPanelProps) {
  const [openThreads, setOpenThreads] = useState(false);
  const [openArtifacts, setOpenArtifacts] = useState(false);
  const row = (active: boolean) => (active ? 'ds-nav-row is-active' : 'ds-nav-row');

  return (
    <nav className="ds-nav" aria-label="Navigation">
      <div className="ds-nav-head">
        <span className="ds-nav-brand">landscape</span>
        <button type="button" className="ds-nav-collapse" title="Collapse navigation" onClick={onCollapse}>«</button>
      </div>
      <button type="button" className="ds-nav-newchat" onClick={onNewChat}>+ New chat</button>
      <button type="button" className="ds-nav-search" onClick={onSearch}>Search chats…</button>

      <button type="button" className={row(activePage === 'dashboard')} onClick={() => onNavigate('dashboard')}>Home</button>
      <button type="button" className={row(activePage === 'projects')} onClick={() => onNavigate('projects')}>
        Projects<span className="ds-nav-chev">›</span>
      </button>

      {project && (
        <>
          <div className="ds-nav-rule" />
          <div className="ds-nav-label">{project.name}</div>
          {project.sections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={row(s.id === project.activeSectionId) + ' ds-nav-sec'}
              onClick={() => project.onSelectSection(s.id)}
            >
              {s.label}
              {s.badge && <span className="ds-tag ds-tag-neutral ds-nav-badge">{s.badge}</span>}
            </button>
          ))}
        </>
      )}

      <button type="button" className="ds-nav-label ds-nav-toggle" onClick={() => setOpenThreads((v) => !v)}>
        Threads<span className="ds-nav-chev">{openThreads ? '⌄' : '›'}</span>
      </button>
      {openThreads &&
        (threads.length === 0 ? (
          <div className="ds-nav-note">No threads yet.</div>
        ) : (
          threads.slice(0, 12).map((t) => (
            <button key={t.id} type="button" className="ds-nav-row ds-nav-small" onClick={t.onClick} title={t.label}>
              {t.label}
            </button>
          ))
        ))}
      {project && (
        <>
          <button type="button" className="ds-nav-label ds-nav-toggle" onClick={() => setOpenArtifacts((v) => !v)}>
            Artifacts<span className="ds-nav-chev">{openArtifacts ? '⌄' : '›'}</span>
          </button>
          {openArtifacts &&
            (artifacts.length === 0 ? (
              <div className="ds-nav-note">No artifacts yet.</div>
            ) : (
              artifacts.slice(0, 12).map((a) => (
                <button key={a.id} type="button" className="ds-nav-row ds-nav-small" onClick={a.onClick} title={a.title}>
                  {a.title}
                </button>
              ))
            ))}
        </>
      )}

      <div className="ds-nav-rule" />
      <div className="ds-nav-label">Platform</div>
      <button type="button" className={row(activePage === 'landscaper') + ' ds-nav-small'} onClick={() => onNavigate('landscaper')}>Landscaper AI</button>
      <button type="button" className={row(activePage === 'platform-knowledge') + ' ds-nav-small'} onClick={() => onNavigate('platform-knowledge')}>Platform knowledge</button>
      <button type="button" className={row(activePage === 'tools') + ' ds-nav-small'} onClick={() => onNavigate('tools')}>Tools</button>
      {isAdmin !== false && (
        <button type="button" className={row(activePage === 'admin') + ' ds-nav-small'} onClick={() => onNavigate('admin')}>Admin</button>
      )}
      <button type="button" className="ds-nav-row ds-nav-small" onClick={() => onNavigate('help')}>Help</button>

      <div className="ds-nav-foot">
        <UiModeSwitch recentProjectId={recentProjectId ?? null} />
        <div className="ds-nav-user">
          <div className="ds-nav-avatar">{user?.initials || '··'}</div>
          <div className="ds-nav-user-meta">
            <div>{user?.name || ''}</div>
            {user?.org && <div className="ds-nav-org">{user.org}</div>}
          </div>
          {onLogout && (
            <button type="button" className="ds-nav-logout" onClick={onLogout} title="Sign out">⏻</button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default DesignNavPanel;
