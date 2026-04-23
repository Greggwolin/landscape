'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LocationBriefArtifactConfig } from '@/contexts/WrapperUIContext';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access) return { Authorization: `Bearer ${parsed.access}` };
    }
  } catch { /* ignore */ }
  return {};
}

interface CreateProjectCTAProps {
  config: LocationBriefArtifactConfig;
}

/**
 * Renders a "Create Project" CTA inside the Location Brief artifact.
 * Only visible when config.project_ready === true (LS has enough info —
 * city + state + property_type — to scaffold a project).
 *
 * POSTs to Django /api/projects/ with the brief's resolved geo + property_type,
 * then navigates to the new project's wrapper home.
 */
export function CreateProjectCTA({ config }: CreateProjectCTAProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!config.project_ready) return null;

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        project_name: `${config.geo_hierarchy.city ?? config.location_display} – ${config.property_type_label}`,
        project_type_code: config.property_type,
        jurisdiction_city: config.geo_hierarchy.city,
        jurisdiction_state: config.geo_hierarchy.state_abbrev ?? config.geo_hierarchy.state,
        jurisdiction_county: config.geo_hierarchy.county,
      };
      if (Array.isArray(config.center) && config.center.length === 2) {
        body.centroid_lng = config.center[0];
        body.centroid_lat = config.center[1];
      }

      const res = await fetch(`${DJANGO_API_URL}/api/projects/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Create failed (${res.status}): ${txt.slice(0, 200)}`);
      }
      const data = await res.json();
      const newId = data?.project_id ?? data?.id;
      if (!newId) throw new Error('Create succeeded but no project_id returned.');
      router.push(`/w/projects/${newId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        marginBottom: 16,
        padding: '12px 14px',
        background: 'var(--cui-secondary-bg)',
        border: '1px solid var(--cui-border-color)',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cui-body-color)' }}>
          Ready to build this deal?
        </div>
        <div
          style={{
            fontSize: '11px',
            marginTop: 2,
            color: 'var(--w-text-tertiary, var(--cui-tertiary-color))',
          }}
        >
          Scaffold a {config.property_type_label} project in {config.location_display}.
          {error && (
            <span style={{ color: 'var(--cui-danger)', marginLeft: 6 }}>
              {error}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={handleCreate}
        disabled={creating}
        className="btn btn-primary"
        style={{ flexShrink: 0, fontSize: '12px', padding: '6px 12px' }}
      >
        {creating ? 'Creating…' : 'Create Project'}
      </button>
    </div>
  );
}
