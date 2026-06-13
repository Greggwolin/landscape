/**
 * useSitePlanOverlays Hook
 *
 * CRUD for saved site-plan image overlays via the Django API. Mirrors
 * useMapFeatures: keeps a local list in sync with landscape.tbl_project_overlay.
 *
 * Endpoints (registered in apps/projects/urls.py):
 *   GET    /api/projects/<id>/overlays/  -> list
 *   POST   /api/projects/<id>/overlays/  -> create
 *   PATCH  /api/overlays/<overlay_id>/   -> update
 *   DELETE /api/overlays/<overlay_id>/   -> delete
 *
 * LSCMD-CW-OVERLAY-P1-0613-GV
 */

import { useCallback, useState } from 'react';
import type { Corners } from '@/lib/gis/imageOverlay';

const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    try {
      const tokensStr = localStorage.getItem('auth_tokens');
      if (tokensStr) {
        const tokens = JSON.parse(tokensStr);
        if (typeof tokens?.access === 'string' && tokens.access.trim()) {
          headers.Authorization = `Bearer ${tokens.access}`;
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return headers;
}

export interface SitePlanOverlayRecord {
  overlay_id: number;
  project_id: number;
  title: string | null;
  source_uri: string;
  corners: Corners;
  opacity: number;
  rotation_deg: number;
  created_at: string;
  updated_at: string;
}

export interface SitePlanOverlayInput {
  title?: string | null;
  source_uri: string;
  corners: Corners;
  opacity: number;
  rotation_deg: number;
}

export function useSitePlanOverlays(projectId: number | undefined) {
  const [overlays, setOverlays] = useState<SitePlanOverlayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverlays = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE}/api/projects/${projectId}/overlays/`,
        { credentials: 'include', headers: getAuthHeaders() }
      );
      if (!response.ok) {
        // No overlays / auth gaps degrade gracefully — never block the map.
        if (response.status === 404) {
          setOverlays([]);
          return;
        }
        if (response.status === 401 || response.status === 403) {
          console.warn('Site-plan overlays: auth failed, showing none');
          setOverlays([]);
          return;
        }
        throw new Error(`Failed to fetch overlays: ${response.status}`);
      }
      const data = await response.json();
      setOverlays(Array.isArray(data?.results) ? data.results : []);
    } catch (err) {
      console.error('Error fetching site-plan overlays:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createOverlay = useCallback(
    async (input: SitePlanOverlayInput): Promise<SitePlanOverlayRecord> => {
      if (!projectId) throw new Error('No project ID');
      const response = await fetch(
        `${API_BASE}/api/projects/${projectId}/overlays/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: getAuthHeaders(),
          body: JSON.stringify(input),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save overlay: ${response.status}`);
      }
      const saved: SitePlanOverlayRecord = await response.json();
      setOverlays((prev) => [...prev, saved]);
      return saved;
    },
    [projectId]
  );

  const updateOverlay = useCallback(
    async (
      overlayId: number,
      updates: Partial<SitePlanOverlayInput>
    ): Promise<SitePlanOverlayRecord> => {
      const response = await fetch(`${API_BASE}/api/overlays/${overlayId}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update overlay: ${response.status}`);
      }
      const updated: SitePlanOverlayRecord = await response.json();
      setOverlays((prev) =>
        prev.map((o) => (o.overlay_id === overlayId ? updated : o))
      );
      return updated;
    },
    []
  );

  const deleteOverlay = useCallback(async (overlayId: number): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/overlays/${overlayId}/`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete overlay: ${response.status}`);
    }
    setOverlays((prev) => prev.filter((o) => o.overlay_id !== overlayId));
  }, []);

  return {
    overlays,
    loading,
    error,
    fetchOverlays,
    createOverlay,
    updateOverlay,
    deleteOverlay,
  };
}
