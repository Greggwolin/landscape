/**
 * useMapFeatures Hook
 *
 * Handles CRUD operations for map features via Django API.
 * Manages local state and syncs with the database.
 */

import { useState, useCallback } from 'react';

const API_BASE =
  process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export interface MapFeatureRecord {
  id: string;
  project_id: number;
  feature_type: string;
  category: string;
  geometry: GeoJSON.Geometry;
  label: string;
  notes?: string | null;
  style?: Record<string, unknown>;
  linked_table?: string | null;
  linked_id?: number | null;
  area_sqft?: number | null;
  area_acres?: number | null;
  perimeter_ft?: number | null;
  length_ft?: number | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

interface SaveFeatureParams {
  label: string;
  category: string;
  notes?: string;
  linked_table?: string;
  linked_id?: number;
  area_sqft?: number;
  area_acres?: number;
  perimeter_ft?: number;
  length_ft?: number;
}

export function useMapFeatures(projectId: number | undefined) {
  const [features, setFeatures] = useState<MapFeatureRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all features for the project
   */
  const fetchFeatures = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/map/features/${projectId}/`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // No features yet, that's OK
          setFeatures([]);
          return;
        }
        throw new Error(`Failed to fetch features: ${response.status}`);
      }

      const data = await response.json();
      setFeatures(data.features || []);
    } catch (err) {
      console.error('Error fetching map features:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  /**
   * Save a new feature to the database
   */
  const saveFeature = useCallback(
    async (
      geometry: GeoJSON.Geometry,
      featureType: string,
      params: SaveFeatureParams
    ): Promise<MapFeatureRecord> => {
      if (!projectId) throw new Error('No project ID');

      const response = await fetch(`${API_BASE}/api/v1/map/features/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          feature_type: featureType.toLowerCase(),
          geometry,
          label: params.label,
          category: params.category,
          notes: params.notes || null,
          linked_table: params.linked_table || null,
          linked_id: params.linked_id || null,
          area_sqft: params.area_sqft || null,
          area_acres: params.area_acres || null,
          perimeter_ft: params.perimeter_ft || null,
          length_ft: params.length_ft || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to save feature: ${response.status}`
        );
      }

      const saved = await response.json();
      setFeatures((prev) => [...prev, saved]);
      return saved;
    },
    [projectId]
  );

  /**
   * Update an existing feature
   */
  const updateFeature = useCallback(
    async (
      featureId: string,
      updates: Partial<SaveFeatureParams>
    ): Promise<MapFeatureRecord> => {
      const response = await fetch(
        `${API_BASE}/api/v1/map/features/${featureId}/`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to update feature: ${response.status}`
        );
      }

      const updated = await response.json();
      setFeatures((prev) =>
        prev.map((f) => (f.id === featureId ? updated : f))
      );
      return updated;
    },
    []
  );

  /**
   * Delete a feature from the database
   */
  const deleteFeature = useCallback(async (featureId: string): Promise<void> => {
    const response = await fetch(
      `${API_BASE}/api/v1/map/features/${featureId}/`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete feature: ${response.status}`);
    }

    setFeatures((prev) => prev.filter((f) => f.id !== featureId));
  }, []);

  /**
   * Convert features to GeoJSON FeatureCollection for loading into draw control
   */
  const toGeoJSON = useCallback((): GeoJSON.FeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: features.map((f) => ({
        type: 'Feature' as const,
        id: f.id,
        geometry: f.geometry,
        properties: {
          label: f.label,
          category: f.category,
          feature_type: f.feature_type,
          notes: f.notes,
          area_sqft: f.area_sqft,
          area_acres: f.area_acres,
          length_ft: f.length_ft,
          perimeter_ft: f.perimeter_ft,
        },
      })),
    };
  }, [features]);

  /**
   * Get a single feature by ID
   */
  const getFeatureById = useCallback(
    (featureId: string): MapFeatureRecord | undefined => {
      return features.find((f) => f.id === featureId);
    },
    [features]
  );

  /**
   * Get features by category
   */
  const getFeaturesByCategory = useCallback(
    (category: string): MapFeatureRecord[] => {
      return features.filter((f) => f.category === category);
    },
    [features]
  );

  /**
   * Clear all local features (doesn't delete from DB)
   */
  const clearLocalFeatures = useCallback(() => {
    setFeatures([]);
  }, []);

  return {
    features,
    loading,
    error,
    fetchFeatures,
    saveFeature,
    updateFeature,
    deleteFeature,
    toGeoJSON,
    getFeatureById,
    getFeaturesByCategory,
    clearLocalFeatures,
  };
}
