'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { RightContentPanel } from '@/components/wrapper/RightContentPanel';
import { useWrapperUI } from '@/contexts/WrapperUIContext';
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

function buildLocation(p: ProjectRow): string {
  if (p.location) return p.location;
  if (p.location_description) return p.location_description;
  const parts = [p.jurisdiction_city, p.jurisdiction_state].filter(Boolean);
  return parts.join(', ');
}

export default function WrapperProjectsPage() {
  const router = useRouter();
  const { closeChat } = useWrapperUI();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Projects selector opens with chat panel closed — full width for the grid
  useEffect(() => { closeChat(); }, [closeChat]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/projects')
      .then((r) => {
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

  const filtered = search
    ? projects.filter((p) =>
        (p.project_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : projects;

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
                onClick={() => router.push(`/w/projects/${p.project_id}`)}
              >
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
