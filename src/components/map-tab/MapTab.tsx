/**
 * MapTab Component
 *
 * Full orchestrator for the Map tab — replaces the basic Leaflet view with
 * the advanced MapLibre GIS system: Google basemaps, plan parcels, project
 * boundary, tax parcels, draw tools, and feature persistence via Django API.
 */

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CButton,
} from '@coreui/react';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import * as turf from '@turf/turf';

import type {
  MapTabProps,
  BasemapStyle,
  DrawTool,
  LayerGroup,
  LayerGroupId,
  MapFeature,
  MapViewState,
  FeatureCategory,
} from './types';
import { MapCanvas } from './MapCanvas';
import type { MapCanvasRef } from './MapCanvas';
import { LayerPanel } from './LayerPanel';
import { DrawToolbar } from './DrawToolbar';
import { FeatureModal } from './FeatureModal';
import type { FeatureGeometryType } from './FeatureModal';
import { useMapDraw } from './hooks/useMapDraw';
import type { DrawnFeature } from './hooks/useMapDraw';
import { useMapFeatures } from './hooks/useMapFeatures';
import { useCompsMapData } from '@/lib/map/hooks';
import { getDefaultLayerGroups, BASEMAP_OPTIONS, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from './constants';
import {
  useDemographics,
  DEMOGRAPHIC_FIELDS,
  formatDemographicValue,
} from '@/components/location-intelligence';
import type { RingDemographics } from '@/components/location-intelligence';

import './map-tab.css';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const parseCoordinate = (value?: number | string | null): number | null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildBoundaryFeature = (geojson: Geometry, metadata: Record<string, unknown>): Feature<Geometry> => ({
  type: 'Feature',
  geometry: geojson,
  properties: metadata,
});

/**
 * Compute [west, south, east, north] bbox string from a FeatureCollection
 * using Turf.js (no Leaflet dependency).
 */
function computeBboxParam(fc: FeatureCollection | null): string {
  if (!fc || !fc.features?.length) return '';
  try {
    const bbox = turf.bbox(fc);
    const padding = 0.001;
    return [bbox[0] - padding, bbox[1] - padding, bbox[2] + padding, bbox[3] + padding].join(',');
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MapTab Component
// ─────────────────────────────────────────────────────────────────────────────

export function MapTab({ project }: MapTabProps) {
  const projectId = project.project_id;

  // ───── Coordinates ─────
  const projectLat = parseCoordinate(project.location_lat ?? project.latitude ?? null);
  const projectLon = parseCoordinate(project.location_lon ?? project.longitude ?? null);
  const hasProjectCenter = projectLat !== null && projectLon !== null;

  const projectCenter = useMemo<[number, number]>(() => {
    if (projectLat !== null && projectLon !== null) return [projectLon, projectLat]; // MapLibre uses [lng, lat]
    return DEFAULT_MAP_CENTER;
  }, [projectLat, projectLon]);

  // ───── Map UI State ─────
  const [basemap, setBasemap] = useState<BasemapStyle>('hybrid');
  const [activeTool, setActiveTool] = useState<DrawTool>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [layers, setLayers] = useState<LayerGroup[]>(() => getDefaultLayerGroups());
  const mapCanvasRef = useRef<MapCanvasRef>(null);

  // ───── Feature Modal State ─────
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [pendingFeature, setPendingFeature] = useState<DrawnFeature | null>(null);
  const [featureSaving, setFeatureSaving] = useState(false);

  // ───── GIS Data State ─────
  const [planParcels, setPlanParcels] = useState<FeatureCollection | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [projectBoundary, setProjectBoundary] = useState<Feature<Geometry> | null>(null);
  const [boundaryLoading, setBoundaryLoading] = useState(false);
  const [boundaryError, setBoundaryError] = useState<string | null>(null);

  const [taxParcels, setTaxParcels] = useState<FeatureCollection | null>(null);
  const [taxLoading, setTaxLoading] = useState(false);
  const [taxError, setTaxError] = useState<string | null>(null);

  // ───── Toast ─────
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ───── Demographics (Ring) State ─────
  const [selectedRingRadius, setSelectedRingRadius] = useState<number | null>(null);
  const [selectedRingStats, setSelectedRingStats] = useState<RingDemographics | null>(null);
  const [isRingModalOpen, setIsRingModalOpen] = useState(false);

  const {
    demographics,
    isLoading: demographicsLoading,
    error: demographicsError,
  } = useDemographics({
    lat: projectLat ?? 0,
    lon: projectLon ?? 0,
    projectId: String(projectId),
    enabled: hasProjectCenter,
  });

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (!selectedRingRadius || !demographics?.rings?.length) {
      setSelectedRingStats(null);
      return;
    }
    const ring = demographics.rings.find((r) => r.radius_miles === selectedRingRadius) ?? null;
    setSelectedRingStats(ring);
  }, [demographics, selectedRingRadius]);

  // ─────────────────────────────────────────────────────────────────────────
  // Hooks: useCompsMapData (Sale Comparables)
  // ─────────────────────────────────────────────────────────────────────────

  const { data: compsMapData } = useCompsMapData(String(projectId));

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

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
  }, []);

  const formatShortCurrency = useCallback((value?: number | null) => {
    if (value == null || !Number.isFinite(value)) return '';
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `$${Math.round(value / 1_000)}K`;
    }
    return `$${Math.round(value).toLocaleString()}`;
  }, []);

  const buildSaleCompPopupHtml = useCallback((props: Record<string, unknown>, fallbackName: string) => {
    const priceLabel = formatShortCurrency(Number(props.price ?? props.sale_price));
    const unitLabel = formatShortCurrency(Number(props.price_per_unit ?? props.pricePerUnit));
    const priceLine = priceLabel
      ? `${priceLabel}${unitLabel ? `&nbsp;&nbsp;<span style="color:#94a3b8;">${unitLabel} / unit</span>` : ''}`
      : '';
    const dateValue = props.date ?? props.sale_date;
    const nameValue = (props.name as string) || (props.property_name as string) || fallbackName;

    return `
      <div style="padding: 10px 12px; min-width: 220px; color: #f8fafc; font-family: system-ui, -apple-system, Segoe UI, sans-serif;">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #ffffff;">
          <span style="color:#cbd5f5; font-weight:600;">Name:</span> ${nameValue}
        </div>
        ${priceLine ? `<div style="font-size: 13px; color: #e2e8f0; margin-bottom: 6px;">
          <span style="color:#cbd5f5; font-weight:600;">Price:</span> ${priceLine}
        </div>` : ''}
        ${dateValue ? `<div style="font-size: 13px; color: #e2e8f0; margin-bottom: 6px;">
          <span style="color:#cbd5f5; font-weight:600;">Date:</span> ${new Date(String(dateValue)).toLocaleDateString()}
        </div>` : ''}
      </div>
    `;
  }, [formatShortCurrency]);

  // Extract comps FeatureCollection (cast to standard GeoJSON for MapCanvas)
  const rawSaleComps = useMemo<FeatureCollection | null>(() => {
    if (!compsMapData?.comps?.features?.length) return null;
    return compsMapData.comps as unknown as FeatureCollection;
  }, [compsMapData]);

  const [fallbackSaleComps, setFallbackSaleComps] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (rawSaleComps?.features?.length) {
      setFallbackSaleComps(null);
      return;
    }

    const controller = new AbortController();

    const loadSalesCompsFallback = async () => {
      try {
        const djangoUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
        const response = await fetch(`${djangoUrl}/api/projects/${projectId}/sales-comparables/`, {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.text();
          throw new Error(`${response.status}: ${payload}`);
        }

        const payload = await response.json();
        const comps = Array.isArray(payload) ? payload : payload?.results ?? payload?.comparables ?? [];
        const features = comps
          .map((comp: Record<string, unknown>, index: number) => {
            const lat = parseCoordinate(comp.latitude as number | string | null | undefined);
            const lng = parseCoordinate(comp.longitude as number | string | null | undefined);
            if (lat === null || lng === null) return null;

            const properties = {
              name: comp.property_name ?? comp.address ?? `Comp ${index + 1}`,
              price: comp.sale_price != null ? Number(comp.sale_price) : null,
              price_per_unit: comp.price_per_unit != null ? Number(comp.price_per_unit) : null,
              date: comp.sale_date ?? null,
              color: '#f59e0b',
            };

            return {
              type: 'Feature' as const,
              id: `comp-${comp.comparable_id ?? index}`,
              properties,
              geometry: {
                type: 'Point' as const,
                coordinates: [lng, lat],
              },
            };
          })
          .filter(Boolean);

        setFallbackSaleComps(
          features.length
            ? ({ type: 'FeatureCollection', features } as FeatureCollection)
            : null
        );
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return;
        console.warn('Failed to load sales comps fallback:', error);
        setFallbackSaleComps(null);
      }
    };

    loadSalesCompsFallback();
    return () => controller.abort();
  }, [getAuthHeaders, projectId, rawSaleComps]);

  const saleComps = useMemo<FeatureCollection | null>(() => {
    const source = rawSaleComps ?? fallbackSaleComps;
    if (!source?.features?.length) return null;

    return {
      ...source,
      features: source.features.map((feature, index) => {
        const props = (feature.properties ?? {}) as Record<string, unknown>;
        const popup = buildSaleCompPopupHtml(props, `Comp ${index + 1}`);
        const color = (props.color as string) || '#f59e0b';
        return {
          ...feature,
          properties: {
            ...props,
            popup_html: popup,
            color,
          },
        };
      }),
    };
  }, [buildSaleCompPopupHtml, fallbackSaleComps, rawSaleComps]);

  // ─────────────────────────────────────────────────────────────────────────
  // Rental Comparables (Rent Comps)
  // ─────────────────────────────────────────────────────────────────────────

  const [rentComps, setRentComps] = useState<FeatureCollection | null>(null);

  const getComparableColor = useCallback((propertyName: string): string => {
    const palette = ['#3b82f6', '#22c55e', '#06b6d4', '#f59e0b', '#ef4444'];
    let hash = 0;
    for (let i = 0; i < propertyName.length; i += 1) {
      hash = (hash * 31 + propertyName.charCodeAt(i)) >>> 0;
    }
    return palette[hash % palette.length];
  }, []);

  const buildRentCompPopupHtml = useCallback((comp: Record<string, unknown>, color: string) => {
    const rentValue = Number(comp.asking_rent ?? comp.askingRent ?? 0);
    const sqftValue = Number(comp.avg_sqft ?? comp.avgSqft ?? 0);
    const bedroomsValue = Number(comp.bedrooms ?? 0);
    const bathroomsValue = Number(comp.bathrooms ?? 0);
    const addressValue = comp.address as string | undefined;

    return `<div class="comparable-popup-content">
      <div class="comparable-popup-name" style="color: ${color};">${comp.property_name ?? comp.name ?? 'Rent Comp'}</div>
      ${addressValue ? `<div class="comparable-popup-address">${addressValue}</div>` : ''}
      <div class="comparable-popup-details">${bedroomsValue}BR/${bathroomsValue}BA · ${sqftValue > 0 ? sqftValue.toLocaleString() : '—'} SF</div>
      <div class="comparable-popup-rent">$${Math.round(rentValue).toLocaleString()}/mo</div>
      ${comp.distance_miles ? `<div class="comparable-popup-distance">${comp.distance_miles} mi away</div>` : ''}
    </div>`;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadRentComps = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/rental-comparables`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.text();
          throw new Error(`${response.status}: ${payload}`);
        }
        const json = await response.json();
        if (!json?.success || !Array.isArray(json?.data)) {
          setRentComps(null);
          return;
        }

        const features = json.data
          .map((row: Record<string, unknown>) => {
            const lat = parseCoordinate(row.latitude as number | string | null | undefined);
            const lng = parseCoordinate(row.longitude as number | string | null | undefined);
            if (lat === null || lng === null) return null;

            const name = (row.property_name as string) || (row.name as string) || 'Rent Comp';
            const color = getComparableColor(name);

            return {
              type: 'Feature' as const,
              id: `rent-${row.comparable_id ?? row.id ?? `${lng}-${lat}`}`,
              properties: {
                name,
                asking_rent: row.asking_rent ?? row.askingRent ?? null,
                effective_rent: row.effective_rent ?? row.effectiveRent ?? null,
                unit_type: row.unit_type ?? row.unitType ?? null,
                distance_miles: row.distance_miles ?? row.distance ?? null,
                popup_html: buildRentCompPopupHtml(row, color),
                color,
              },
              geometry: {
                type: 'Point' as const,
                coordinates: [lng, lat],
              },
            };
          })
          .filter(Boolean);

        setRentComps(
          features.length
            ? ({ type: 'FeatureCollection', features } as FeatureCollection)
            : null
        );
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return;
        console.warn('Failed to load rental comparables:', error);
        setRentComps(null);
      }
    };

    loadRentComps();
    return () => controller.abort();
  }, [projectId]);

  // ─────────────────────────────────────────────────────────────────────────
  // Hooks: useMapFeatures (Django CRUD)
  // ─────────────────────────────────────────────────────────────────────────

  const {
    features: savedFeatures,
    fetchFeatures,
    saveFeature,
  } = useMapFeatures(projectId);

  // Fetch features on mount
  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  // Convert saved features to MapFeature[] for MapCanvas
  const mapFeatures = useMemo<MapFeature[]>(() => {
    return savedFeatures.map((f) => ({
      id: f.id,
      project_id: f.project_id,
      feature_type: f.feature_type as MapFeature['feature_type'],
      category: (f.category as FeatureCategory) || null,
      geometry: f.geometry,
      label: f.label || null,
      notes: f.notes || null,
      style: (f.style as MapFeature['style']) || {},
      linked_table: f.linked_table || null,
      linked_id: f.linked_id || null,
      area_sqft: f.area_sqft || null,
      area_acres: f.area_acres || null,
      perimeter_ft: f.perimeter_ft || null,
      length_ft: f.length_ft || null,
      created_by: f.created_by || null,
      created_at: f.created_at,
      updated_at: f.updated_at,
    }));
  }, [savedFeatures]);

  // ─────────────────────────────────────────────────────────────────────────
  // Hooks: useMapDraw (MapboxDraw integration)
  // ─────────────────────────────────────────────────────────────────────────

  const mapInstance = mapCanvasRef.current?.getMap() ?? null;

  const handleFeatureCreated = useCallback((feature: DrawnFeature) => {
    setPendingFeature(feature);
    setFeatureModalOpen(true);
  }, []);

  const {
    initializeDraw,
    liveMeasurement,
    isDrawing,
    startDrawPoint,
    startDrawLine,
    startDrawPolygon,
    startEdit,
    deleteSelected,
    cancelDraw,
    clearCurrentFeature,
  } = useMapDraw(mapInstance, {
    onFeatureCreated: handleFeatureCreated,
  });

  // Initialize draw control once map is ready
  const mapIsLoaded = mapCanvasRef.current?.isLoaded() ?? false;
  const drawInitialized = useRef(false);

  useEffect(() => {
    if (mapIsLoaded && mapInstance && !drawInitialized.current) {
      const cleanup = initializeDraw();
      drawInitialized.current = true;
      return () => {
        cleanup?.();
        drawInitialized.current = false;
      };
    }
  }, [mapIsLoaded, mapInstance, initializeDraw]);

  // ─────────────────────────────────────────────────────────────────────────
  // GIS Data Fetching
  // ─────────────────────────────────────────────────────────────────────────

  // 1. Plan Parcels
  useEffect(() => {
    const controller = new AbortController();

    const loadPlanParcels = async () => {
      setPlanLoading(true);
      setPlanError(null);
      try {
        const response = await fetch(
          `/api/gis/plan-parcels?project_id=${projectId}&include_geometry=true&format=geojson`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          const payload = await response.text();
          throw new Error(`${response.status}: ${payload}`);
        }
        const data = (await response.json()) as FeatureCollection;
        setPlanParcels(data);
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return;
        setPlanError(error instanceof Error ? error.message : 'Unable to load plan parcels');
      } finally {
        setPlanLoading(false);
      }
    };

    loadPlanParcels();
    return () => controller.abort();
  }, [projectId]);

  // 2. Project Boundary
  useEffect(() => {
    const controller = new AbortController();

    const loadBoundary = async () => {
      setBoundaryLoading(true);
      setBoundaryError(null);
      try {
        const response = await fetch(`/api/gis/ingest-parcels?project_id=${projectId}`, {
          signal: controller.signal,
        });
        if (response.status === 404) {
          // No boundary data for this project — not an error, just no data yet
          setProjectBoundary(null);
          return;
        }
        if (!response.ok) {
          const payload = await response.text();
          throw new Error(`${response.status}: ${payload}`);
        }
        const json = await response.json();
        if (json?.boundary?.geometry) {
          setProjectBoundary(
            buildBoundaryFeature(json.boundary.geometry, {
              acres: json.boundary.acres,
              source: json.boundary.source,
              created_at: json.boundary.created_at,
            })
          );
        } else {
          setBoundaryError('Boundary geometry missing');
        }
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return;
        setBoundaryError(error instanceof Error ? error.message : 'Unable to load project boundary');
      } finally {
        setBoundaryLoading(false);
      }
    };

    loadBoundary();
    return () => controller.abort();
  }, [projectId]);

  // 3. Tax Parcels (depends on plan parcels bbox)
  const bboxParam = useMemo(() => computeBboxParam(planParcels), [planParcels]);

  useEffect(() => {
    if (!bboxParam) return;
    const controller = new AbortController();

    const loadTaxParcels = async () => {
      setTaxLoading(true);
      setTaxError(null);
      try {
        const response = await fetch(`/api/gis/tax-parcels?bbox=${bboxParam}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.text();
          throw new Error(`${response.status}: ${payload}`);
        }
        const data = (await response.json()) as FeatureCollection;
        setTaxParcels(data);
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return;
        setTaxError(error instanceof Error ? error.message : 'Unable to load tax parcels');
      } finally {
        setTaxLoading(false);
      }
    };

    loadTaxParcels();
    return () => controller.abort();
  }, [bboxParam]);

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-fit bounds after GIS data loads
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const m = mapCanvasRef.current?.getMap();
    if (!m) return;

    // Collect all loaded GeoJSON features for bounding
    const allFeatures: Feature[] = [];
    if (planParcels?.features) allFeatures.push(...planParcels.features);
    if (projectBoundary) allFeatures.push(projectBoundary);
    if (taxParcels?.features) allFeatures.push(...taxParcels.features);
    if (saleComps?.features) allFeatures.push(...saleComps.features);
    if (rentComps?.features) allFeatures.push(...rentComps.features);

    if (allFeatures.length === 0) return;

    try {
      const fc: FeatureCollection = { type: 'FeatureCollection', features: allFeatures };
      const bbox = turf.bbox(fc);
      m.fitBounds(
        [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
        { padding: 40, maxZoom: 16, duration: 1200 }
      );
    } catch {
      // ignore bbox calculation errors
    }
  }, [planParcels, projectBoundary, taxParcels, saleComps, rentComps]);

  // ─────────────────────────────────────────────────────────────────────────
  // Update layer counts from loaded data
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    setLayers((prev) =>
      prev.map((group) => {
        if (group.id === 'project-boundary') {
          return {
            ...group,
            layers: group.layers.map((layer) => {
              if (layer.id === 'plan-parcels') return { ...layer, count: planParcels?.features?.length ?? 0 };
              if (layer.id === 'tax-parcels') return { ...layer, count: taxParcels?.features?.length ?? 0 };
              if (layer.id === 'site-boundary') return { ...layer, count: projectBoundary ? 1 : 0 };
              return layer;
            }),
          };
        }
        if (group.id === 'comparables') {
          return {
            ...group,
            layers: group.layers.map((layer) => {
              if (layer.id === 'sale-comps') return { ...layer, count: saleComps?.features?.length ?? 0 };
              if (layer.id === 'rent-comps') return { ...layer, count: rentComps?.features?.length ?? 0 };
              return layer;
            }),
          };
        }
        return group;
      })
    );
  }, [planParcels, taxParcels, projectBoundary, saleComps, rentComps]);

  // ─────────────────────────────────────────────────────────────────────────
  // Callbacks: Layer Panel
  // ─────────────────────────────────────────────────────────────────────────

  const handleToggleLayer = useCallback((groupId: LayerGroupId, layerId: string) => {
    setLayers((prev) =>
      prev.map((group) => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          layers: group.layers.map((layer) =>
            layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
          ),
        };
      })
    );
  }, []);

  const handleToggleGroup = useCallback((groupId: LayerGroupId) => {
    setLayers((prev) =>
      prev.map((group) => {
        if (group.id !== groupId) return group;
        return { ...group, expanded: !group.expanded };
      })
    );
  }, []);

  const handleZoomToLayer = useCallback((_groupId: LayerGroupId, layerId: string) => {
    const m = mapCanvasRef.current?.getMap();
    if (!m) return;

    let data: FeatureCollection | Feature | null = null;
    if (layerId === 'plan-parcels') data = planParcels;
    else if (layerId === 'tax-parcels') data = taxParcels;
    else if (layerId === 'site-boundary') data = projectBoundary;

    if (!data) return;

    try {
      const bbox = turf.bbox(data as FeatureCollection);
      m.fitBounds(
        [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
        { padding: 40, maxZoom: 16, duration: 800 }
      );
    } catch {
      // ignore
    }
  }, [planParcels, taxParcels, projectBoundary]);

  // ─────────────────────────────────────────────────────────────────────────
  // Callbacks: Draw Toolbar
  // ─────────────────────────────────────────────────────────────────────────

  const handleToolChange = useCallback(
    (tool: DrawTool) => {
      if (activeTool === tool) {
        // Deactivate
        cancelDraw();
        setActiveTool(null);
        return;
      }

      setActiveTool(tool);
      switch (tool) {
        case 'point':
          startDrawPoint();
          break;
        case 'line':
          startDrawLine();
          break;
        case 'polygon':
          startDrawPolygon();
          break;
        case 'edit':
          startEdit();
          break;
        case 'delete':
          deleteSelected();
          setActiveTool(null);
          break;
        default:
          break;
      }
    },
    [activeTool, cancelDraw, startDrawPoint, startDrawLine, startDrawPolygon, startEdit, deleteSelected]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Callbacks: Feature Modal (save drawn feature)
  // ─────────────────────────────────────────────────────────────────────────

  const handleFeatureModalSave = useCallback(
    async (data: { label: string; category: FeatureCategory; notes: string }) => {
      if (!pendingFeature) return;

      setFeatureSaving(true);
      try {
        const geometry: GeoJSON.Geometry = {
          type: pendingFeature.type,
          coordinates: pendingFeature.coordinates,
        } as GeoJSON.Geometry;

        await saveFeature(geometry, pendingFeature.type.toLowerCase(), {
          label: data.label,
          category: data.category,
          notes: data.notes,
          area_sqft: pendingFeature.properties.area_sqft,
          area_acres: pendingFeature.properties.area_acres,
          perimeter_ft: pendingFeature.properties.perimeter_ft,
          length_ft: pendingFeature.properties.length_ft,
        });

        showToast(`Feature "${data.label}" saved`);
        clearCurrentFeature();
        setFeatureModalOpen(false);
        setPendingFeature(null);
        setActiveTool(null);
      } catch (err) {
        showToast(`Error saving feature: ${err instanceof Error ? err.message : 'unknown'}`);
      } finally {
        setFeatureSaving(false);
      }
    },
    [pendingFeature, saveFeature, showToast, clearCurrentFeature]
  );

  const handleFeatureModalClose = useCallback(() => {
    setFeatureModalOpen(false);
    setPendingFeature(null);
    clearCurrentFeature();
  }, [clearCurrentFeature]);

  // ─────────────────────────────────────────────────────────────────────────
  // Callbacks: MapCanvas
  // ─────────────────────────────────────────────────────────────────────────

  const handleMapClick = useCallback((_coordinates: [number, number]) => {
    // Future: context menu, inspect, etc.
  }, []);

  const handleRingClick = useCallback(
    (radius: number) => {
      setSelectedRingRadius(radius);
      const ring = demographics?.rings?.find((r) => r.radius_miles === radius) ?? null;
      setSelectedRingStats(ring);
      setIsRingModalOpen(true);
    },
    [demographics]
  );

  const handleFeatureClick = useCallback((feature: MapFeature) => {
    setSelectedFeatureId(feature.id);
  }, []);

  const handleViewStateChange = useCallback((_viewState: MapViewState) => {
    // Optionally store view state for persistence
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Loading indicator
  // ─────────────────────────────────────────────────────────────────────────

  const isAnyLoading = planLoading || boundaryLoading || taxLoading;
  const loadingErrors = [planError, boundaryError, taxError].filter(Boolean);

  // Layer state wrapper for MapCanvas
  const layerState = useMemo(() => ({ groups: layers }), [layers]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="map-tab">
      {/* ─── Sidebar: Layers + Draw Tools ─── */}
      <div className="map-tab-sidebar">
        <LayerPanel
          layers={layerState}
          onToggleLayer={handleToggleLayer}
          onToggleGroup={handleToggleGroup}
          onZoomToLayer={handleZoomToLayer}
        />
        <div className="map-tab-tools">
          <div className="map-tab-tools-header">Draw / Measure</div>
          <DrawToolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
          />
        </div>
      </div>

      {/* ─── Map Content Area ─── */}
      <div className="map-tab-content">
        <MapCanvas
          ref={mapCanvasRef}
          center={projectCenter}
          zoom={DEFAULT_MAP_ZOOM}
          basemap={basemap}
          layers={layerState}
          features={mapFeatures}
          activeTool={activeTool}
          selectedFeatureId={selectedFeatureId}
          planParcels={planParcels}
          projectBoundary={projectBoundary}
          taxParcels={taxParcels}
          saleComps={saleComps}
          rentComps={rentComps}
          selectedRingRadius={selectedRingRadius}
          onMapClick={handleMapClick}
          onRingClick={handleRingClick}
          onFeatureClick={handleFeatureClick}
          onViewStateChange={handleViewStateChange}
        />

        {/* Live measurement overlay during drawing */}
        {isDrawing && liveMeasurement && (
          <div className="map-tab-measurement-overlay">
            {liveMeasurement}
          </div>
        )}

        {/* Loading/Error indicators */}
        {isAnyLoading && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              padding: '6px 12px',
              background: 'rgba(0,0,0,0.7)',
              borderRadius: 6,
              fontSize: 12,
              color: '#e5e5e5',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            Loading GIS data...
          </div>
        )}
        {loadingErrors.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: isAnyLoading ? 48 : 12,
              left: 12,
              padding: '6px 12px',
              background: 'rgba(220,38,38,0.8)',
              borderRadius: 6,
              fontSize: 12,
              color: '#fff',
              zIndex: 10,
              maxWidth: 300,
            }}
          >
            {loadingErrors.join('; ')}
          </div>
        )}

        {/* ─── Bottom Toolbar: Basemap + Search + Export ─── */}
        <div className="map-tab-bottom-toolbar">
          <div className="map-tab-basemap-selector">
            <label htmlFor="basemap-select">Basemap</label>
            <select
              id="basemap-select"
              value={basemap}
              onChange={(e) => setBasemap(e.target.value as BasemapStyle)}
            >
              {BASEMAP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="map-tab-search">
            <input
              type="text"
              className="map-tab-search-input"
              placeholder="Search parcels..."
              disabled
            />
          </div>

          <button type="button" className="map-tab-export-btn" disabled>
            Export
          </button>
        </div>
      </div>

      {/* ─── Ring Demographics Modal ─── */}
      <CModal
        visible={isRingModalOpen}
        onClose={() => setIsRingModalOpen(false)}
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>
            {selectedRingRadius ? `${selectedRingRadius}-Mile Ring Demographics` : 'Ring Demographics'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {demographicsLoading && (
            <div style={{ color: 'var(--cui-secondary-color)' }}>
              Loading demographics...
            </div>
          )}
          {!demographicsLoading && (demographicsError || !selectedRingStats) && (
            <div style={{ color: demographicsError ? 'var(--cui-danger)' : 'var(--cui-secondary-color)' }}>
              {demographicsError || 'No demographics data available for this ring.'}
            </div>
          )}
          {selectedRingStats && (
            <div className="d-flex flex-column gap-2">
              {DEMOGRAPHIC_FIELDS.map((field) => {
                const value = selectedRingStats[field.key as keyof RingDemographics];
                const numericValue = typeof value === 'number' ? value : null;
                return (
                  <div
                    key={field.key}
                    className="d-flex justify-content-between align-items-center"
                    style={{ borderBottom: '1px solid var(--cui-border-color)', paddingBottom: '0.35rem' }}
                  >
                    <span style={{ color: 'var(--cui-secondary-color)' }}>{field.label}</span>
                    <span style={{ fontWeight: 600 }}>
                      {formatDemographicValue(numericValue, field.format)}
                    </span>
                  </div>
                );
              })}
              <div className="d-flex justify-content-between align-items-center">
                <span style={{ color: 'var(--cui-secondary-color)' }}>Block Groups</span>
                <span style={{ fontWeight: 600 }}>{selectedRingStats.block_groups_included ?? '—'}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span style={{ color: 'var(--cui-secondary-color)' }}>Land Area</span>
                <span style={{ fontWeight: 600 }}>
                  {selectedRingStats.total_land_area_sqmi !== null && selectedRingStats.total_land_area_sqmi !== undefined
                    ? `${selectedRingStats.total_land_area_sqmi.toFixed(1)} sq mi`
                    : '—'}
                </span>
              </div>
              <div style={{ color: 'var(--cui-secondary-color)', fontSize: '0.85rem' }}>
                {demographicsLoading
                  ? 'Refreshing demographics…'
                  : demographicsError || 'Click inside 1, 3, or 5-mile ring areas to switch.'}
              </div>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setIsRingModalOpen(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ─── Feature Modal ─── */}
      {pendingFeature && (
        <FeatureModal
          isOpen={featureModalOpen}
          featureType={pendingFeature.type as FeatureGeometryType}
          coordinates={pendingFeature.coordinates}
          measurements={pendingFeature.properties}
          onClose={handleFeatureModalClose}
          onSave={handleFeatureModalSave}
          isSaving={featureSaving}
        />
      )}

      {/* ─── Toast ─── */}
      {toast && (
        <div className="map-tab-toast">{toast}</div>
      )}
    </div>
  );
}

export default MapTab;
