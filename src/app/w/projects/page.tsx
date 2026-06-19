'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, MoreVertical, ExternalLink, Archive, Trash2 } from 'lucide-react';
import { RightContentPanel } from '@/components/wrapper/RightContentPanel';
import { useWrapperUI } from '@/contexts/WrapperUIContext';
import { getAuthHeaders, redirectToLoginExpired } from '@/lib/authHeaders';
import {
  getPropertyTypeLabel,
  getPropertyTypeBadgeStyle,
  getPropertyTypeTokenRef,
} from '@/config/propertyTypeTokens';

interface ProjectRow {
  project_id: number;
  project_name: string;
  project_type_code?: string | null;
  property_subtype?: string | null;
  analysis_type?: string | null;
  analysis_purpose?: string | null;
  location?: string | null;
  jurisdiction_city?: string | null;
  jurisdiction_state?: string | null;
  location_description?: string | null;
  updated_at?: string | null;
  is_active?: boolean | null;
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const ms = Date.now() - d;
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `Updated ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Updated ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `Updated ${days}d ago`;
}

// FB-318: shared style for the per-tile action menu items.
const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '7px 10px',
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  color: 'var(--w-text-primary, #e5e7eb)',
  fontSize: '0.85rem',
  textAlign: 'left',
  cursor: 'pointer',
};

function buildLocation(p: ProjectRow): string {
  if (p.location) return p.location;
  if (p.location_description) return p.location_description;
  const parts = [p.jurisdiction_city, p.jurisdiction_state].filter(Boolean);
  return parts.join(', ');
}

export default function WrapperProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // FB-308: when arriving here because a project-scoped page (Reports/Map) was
  // clicked with no active project, `goto` carries that intent so we prompt the
  // user to pick a project and then open that page for the chosen project.
  const goto = searchParams.get('goto');
  const gotoLabel = goto === 'reports' ? 'Reports' : goto === 'map' ? 'Map' : goto;
  const { closeChat } = useWrapperUI();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // FB-318: per-tile actions (Open / Archive / Delete)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Close the open action menu on any outside click.
  useEffect(() => {
    if (menuOpenId === null) return;
    const close = () => setMenuOpenId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuOpenId]);

  function openProject(id: number) {
    router.push(`/w/projects/${id}`);
  }

  // Archive = turn the active flag off; the list already hides inactive projects.
  async function archiveProject(id: number) {
    setMenuOpenId(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });
      if (res.status === 401) { redirectToLoginExpired(); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProjects((prev) => prev.filter((p) => p.project_id !== id));
    } catch (e) {
      setError(`Could not archive project: ${String((e as Error)?.message || e)}`);
    } finally {
      setBusyId(null);
    }
  }

  // Delete = soft-delete (recoverable), confirmed first.
  async function deleteProject(id: number, name: string) {
    setMenuOpenId(null);
    const ok = window.confirm(
      `Delete "${name}"?\n\nThe project is removed from your list. This is a soft delete — it can be recovered if needed.`
    );
    if (!ok) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.status === 401) { redirectToLoginExpired(); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProjects((prev) => prev.filter((p) => p.project_id !== id));
    } catch (e) {
      setError(`Could not delete project: ${String((e as Error)?.message || e)}`);
    } finally {
      setBusyId(null);
    }
  }

  // Projects selector opens with chat panel closed — full width for the grid
  useEffect(() => { closeChat(); }, [closeChat]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/projects', { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) {
          redirectToLoginExpired();
          throw new Error('Unauthenticated');
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const rows: ProjectRow[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.projects)
          ? data.projects
          : [];
        setProjects(rows);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e?.message || e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // FB-324: order project tiles by most-recent interaction (updated_at desc).
  // Sort a copy so the underlying fetch order is untouched.
  const sorted = [...projects].sort((a, b) =>
    (b.updated_at || '').localeCompare(a.updated_at || '')
  );
  const filtered = search
    ? sorted.filter((p) =>
        (p.project_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : sorted;

  return (
    <RightContentPanel
      title="Projects"
      actions={
        <button className="wrapper-btn wrapper-btn-primary">
          <Plus size={14} />
          New Project
        </button>
      }
    >
      <div className="w-projects-body">
        {goto && (
          <div
            style={{
              padding: '10px 14px',
              marginBottom: 12,
              borderRadius: 6,
              background: 'var(--w-accent-soft, rgba(99,102,241,0.12))',
              border: '1px solid var(--w-border, rgba(255,255,255,0.12))',
              color: 'var(--w-text-secondary)',
              fontSize: '0.875rem',
            }}
          >
            Select a project to open its {gotoLabel}.
          </div>
        )}
        <input
          type="text"
          className="w-search-input"
          placeholder="🔍 Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading && (
          <div style={{ padding: 16, color: 'var(--w-text-secondary)' }}>Loading projects…</div>
        )}
        {error && (
          <div style={{ padding: 16, color: '#f87171' }}>Failed to load projects: {error}</div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ padding: 16, color: 'var(--w-text-secondary)' }}>No projects found.</div>
        )}

        <div className="w-project-list">
          {filtered.map((p) => {
            const loc = buildLocation(p);
            const typeLabel = getPropertyTypeLabel(p.project_type_code);
            const typeBadgeStyle = getPropertyTypeBadgeStyle(p.project_type_code, 'soft');
            const hasType = !!getPropertyTypeTokenRef(p.project_type_code);

            // Subtype badge — uses parent type color with outline variant
            const subtypeLabel = p.property_subtype
              ? getPropertyTypeLabel(p.property_subtype)
              : null;
            const subtypeBadgeStyle = p.property_subtype
              ? getPropertyTypeBadgeStyle(p.project_type_code, 'outline')
              : null;

            return (
              <div
                key={p.project_id}
                className="w-project-row"
                style={{ position: 'relative', opacity: busyId === p.project_id ? 0.5 : 1 }}
                onClick={() =>
                  router.push(
                    goto
                      ? `/w/projects/${p.project_id}/${goto}`
                      : `/w/projects/${p.project_id}`
                  )
                }
              >
                {/* FB-318: per-tile actions */}
                <button
                  type="button"
                  aria-label="Project actions"
                  className="w-project-row-actions-btn"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: 'none',
                    background: menuOpenId === p.project_id ? 'var(--w-border, rgba(255,255,255,0.12))' : 'transparent',
                    color: 'var(--w-text-secondary)',
                    cursor: 'pointer',
                  }}
                  disabled={busyId === p.project_id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === p.project_id ? null : p.project_id);
                  }}
                >
                  <MoreVertical size={16} />
                </button>
                {menuOpenId === p.project_id && (
                  <div
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: 38,
                      right: 8,
                      zIndex: 20,
                      minWidth: 160,
                      padding: 4,
                      borderRadius: 8,
                      background: 'var(--w-surface, #1f2430)',
                      border: '1px solid var(--w-border, rgba(255,255,255,0.12))',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                  >
                    <button type="button" role="menuitem" className="w-project-row-menu-item"
                      style={menuItemStyle}
                      onClick={(e) => { e.stopPropagation(); openProject(p.project_id); }}>
                      <ExternalLink size={14} /> Open
                    </button>
                    <button type="button" role="menuitem" className="w-project-row-menu-item"
                      style={menuItemStyle}
                      onClick={(e) => { e.stopPropagation(); archiveProject(p.project_id); }}>
                      <Archive size={14} /> Archive
                    </button>
                    <button type="button" role="menuitem" className="w-project-row-menu-item"
                      style={{ ...menuItemStyle, color: '#f87171' }}
                      onClick={(e) => { e.stopPropagation(); deleteProject(p.project_id, p.project_name); }}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
                <span className="w-project-row-name">{p.project_name}</span>
                {loc && <div className="w-project-row-desc">{loc}</div>}
                <div className="w-project-row-badges">
                  {hasType && (
                    <span className="w-project-badge" style={typeBadgeStyle}>
                      {typeLabel}
                    </span>
                  )}
                  {subtypeLabel && subtypeBadgeStyle && (
                    <span className="w-project-badge" style={subtypeBadgeStyle}>
                      {subtypeLabel}
                    </span>
                  )}
                </div>
                {p.updated_at && (
                  <span className="w-project-row-updated">{timeAgo(p.updated_at)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </RightContentPanel>
  );
}
