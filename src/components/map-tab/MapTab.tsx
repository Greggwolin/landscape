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
  CFormCheck,
} from '@coreui/react';
import type { FeatureCollection, Feature, Geometry, Polygon, MultiPolygon } from 'geojson';
import * as turf from '@turf/turf';
import { escapeHtml, splitAddressLines } from '@/lib/maps/addressFormat';

import type {
  MapTabProps,
  BasemapStyle,
  DrawTool,
  LayerGroup,
  LayerGroupId,
  MapFeature,
  MapViewState,
  FeatureCategory,
  SitePlanLegendItem,
  AnnotationLegendItem,
} from './types';
import { MapCanvas, MARICOPA_PARCEL_OUTLINE_LAYER_ID } from './MapCanvas';
import type { MapCanvasRef } from './MapCanvas';
import type { MapMouseEvent } from 'maplibre-gl';
import { LayerPanel } from './LayerPanel';
import { DrawToolbar } from './DrawToolbar';
import { FeatureModal } from './FeatureModal';
import type { FeatureGeometryType } from './FeatureModal';
import { CompetitorDetailPanel } from './CompetitorDetailPanel';
import { useMapDraw } from './hooks/useMapDraw';
import type { DrawnFeature } from './hooks/useMapDraw';
import { useMapFeatures } from './hooks/useMapFeatures';
import { fetchJson } from '@/lib/fetchJson';
import { arrayMove } from '@dnd-kit/sortable';
import {
  applyStoredLayerOrder,
  readStoredLayerOrder,
  writeStoredLayerOrder,
} from '@/lib/maps/layerOrder';
import { getDefaultLayerGroups, BASEMAP_OPTIONS, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from './constants';
import {
  useDemographics,
  DEMOGRAPHIC_FIELDS,
  formatDemographicValue,
} from '@/components/location-intelligence';
import type { RingDemographics } from '@/components/location-intelligence';
import { fetchParcelsByAPN, fetchParcelsByBbox } from '@/lib/gis/laCountyParcels';
import { queryParcelsByBounds } from '@/lib/gis/parcelServiceClient';
import { uploadOverlayImageDurable, toRenderableOverlayUrl } from '@/lib/gis/overlayImageStore';
import { useSitePlanOverlay } from './overlay/useSitePlanOverlay';
import { SitePlanOverlayControls } from './overlay/SitePlanOverlayControls';
import { useSitePlanOverlays, type OverlayControlPoint } from './hooks/useSitePlanOverlays';
import { addImageOverlay, type OverlayHandle } from '@/lib/gis/imageOverlay';
import PlanExtractCanvas, { type ExtractedRegion } from './extract/PlanExtractCanvas';
import { georeference, snapToVertex, recommendTpsWarp, type ControlPoint } from '@/lib/gis/controlPoints';
import { takePendingPlanExtract } from '@/lib/gis/planExtractBridge';
import { COUNTY_PARCEL_SERVICES, type CountyCode } from '@/lib/gis/countyServices';
import { LAND_DEVELOPMENT_SUBTYPES } from '@/types/project-taxonomy';
import { useSfComps } from '@/hooks/analysis/useSfComps';
import { useMarketCompetitors, type MarketCompetitiveProject } from '@/hooks/useMarketData';

import { getAuthHeaders } from '@/lib/authHeaders';
import './map-tab.css';

/** Flatten a GeoJSON geometry's coordinates into [lng,lat] vertices (parcel snap candidates, D16). */
function flattenGeoVertices(geom: GeoJSON.Geometry | undefined): Array<[number, number]> {
  if (!geom) return [];
  const out: Array<[number, number]> = [];
  const ring = (r: number[][]) => r.forEach((p) => out.push([p[0], p[1]]));
  switch (geom.type) {
    case 'Point': out.push([geom.coordinates[0], geom.coordinates[1]]); break;
    case 'LineString': ring(geom.coordinates); break;
    case 'MultiLineString': geom.coordinates.forEach(ring); break;
    case 'Polygon': geom.coordinates.forEach(ring); break;
    case 'MultiPolygon': geom.coordinates.forEach((poly) => poly.forEach(ring)); break;
    default: break;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const parseCoordinate = (value?: number | string | null): number | null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeCountyValue = (value?: string | null): CountyCode | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(' county', '').trim();
  return normalized in COUNTY_PARCEL_SERVICES ? (normalized as CountyCode) : null;
};

const formatCountyLabel = (county: CountyCode): string =>
  `${county.charAt(0).toUpperCase()}${county.slice(1)} County`;

const getParcelIdFromProps = (props: Record<string, unknown>, featureId?: unknown): string => {
  const candidate =
    props.parcel_id ??
    props.tax_parcel_id ??
    props.PARCELID ??
    props.APN ??
    props.OBJECTID ??
    props.ObjectID ??
    props.OBJECTID_1 ??
    featureId;
  if (candidate == null) return '';
  const value = String(candidate).trim();
  return value;
};

const getParcelAddressFromProps = (props: Record<string, unknown>): string => {
  const candidate =
    props.address ??
    props.SITUS_ADDRESS ??
    props.SITEADDRESS ??
    props.situs_address ??
    props.siteaddress;
  return typeof candidate === 'string' ? candidate : '';
};

const getParcelAcresFromProps = (props: Record<string, unknown>): number | null => {
  const candidate = props.acres ?? props.ACRES ?? props.GROSSAC ?? props.grossac;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeLatLon = (lat: number | null, lon: number | null): { lat: number | null; lon: number | null } => {
  if (lat === null || lon === null) return { lat, lon };
  const latValid = Math.abs(lat) <= 90;
  const lonValid = Math.abs(lon) <= 180;
  if (latValid && lonValid) return { lat, lon };
  const swappedLatValid = Math.abs(lon) <= 90;
  const swappedLonValid = Math.abs(lat) <= 180;
  if (swappedLatValid && swappedLonValid) return { lat: lon, lon: lat };
  return {
    lat: latValid ? lat : null,
    lon: lonValid ? lon : null,
  };
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

function normalizeParcelFeatureCollection(collection: FeatureCollection): FeatureCollection {
  const features = collection.features.map((feature) => {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const parcelId = getParcelIdFromProps(props, feature.id);
    if (parcelId) {
      props.parcel_id = parcelId;
    }
    return {
      ...feature,
      id: parcelId || feature.id,
      properties: props,
    };
  });
  return { ...collection, features };
}

// ─────────────────────────────────────────────────────────────────────────────
// MapTab Component
// ─────────────────────────────────────────────────────────────────────────────

export function MapTab({ project, onProjectUpdated }: MapTabProps) {
  const projectId = project.project_id;
  const initialCountyValue = useMemo(() => {
    const candidate =
      (project as Record<string, unknown>).county ??
      (project as Record<string, unknown>).jurisdiction_county ??
      null;
    return typeof candidate === 'string' ? candidate : null;
  }, [project]);
  const [projectCounty, setProjectCounty] = useState<string | null>(initialCountyValue);
  const lastProjectIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (lastProjectIdRef.current !== projectId) {
      lastProjectIdRef.current = projectId;
      setProjectCounty(initialCountyValue);
      return;
    }
    if (initialCountyValue && initialCountyValue !== projectCounty) {
      setProjectCounty(initialCountyValue);
    }
  }, [initialCountyValue, projectCounty, projectId]);
  const isDevelopmentProject = useMemo(() => {
    const perspective = typeof project.analysis_perspective === 'string'
      ? project.analysis_perspective.toUpperCase()
      : '';
    const analysisType = typeof project.analysis_type === 'string'
      ? project.analysis_type.toUpperCase()
      : '';
    const subtype = typeof project.property_subtype === 'string' ? project.property_subtype : '';

    if (perspective === 'DEVELOPMENT') return true;
    if (analysisType === 'DEVELOPMENT' || analysisType === 'FEASIBILITY') return true;
    if (subtype && LAND_DEVELOPMENT_SUBTYPES.includes(subtype as (typeof LAND_DEVELOPMENT_SUBTYPES)[number])) {
      return true;
    }
    return false;
  }, [project.analysis_perspective, project.analysis_type, project.property_subtype]);

  // Phoenix MSA check — county parcel overlays only available for Maricopa/Pinal
  const isPhoenixMSA = useMemo(() => {
    const state = typeof project.state === 'string' ? project.state.toUpperCase().trim() : '';
    const county = (projectCounty ?? '').toLowerCase();
    // Show county parcels panel only for AZ projects, or if county is already Maricopa/Pinal
    if (state === 'AZ' || state === 'ARIZONA') return true;
    if (county.includes('maricopa') || county.includes('pinal')) return true;
    return false;
  }, [project.state, projectCounty]);

  // ───── Coordinates ─────
  const { lat: projectLat, lon: projectLon } = useMemo(() => {
    const primary = normalizeLatLon(
      parseCoordinate(project.location_lat ?? null),
      parseCoordinate(project.location_lon ?? null)
    );
    if (primary.lat !== null && primary.lon !== null) return primary;

    const fallback = normalizeLatLon(
      parseCoordinate(project.latitude ?? null),
      parseCoordinate(project.longitude ?? null)
    );
    if (fallback.lat !== null && fallback.lon !== null) return fallback;

    return {
      lat: primary.lat ?? fallback.lat ?? null,
      lon: primary.lon ?? fallback.lon ?? null,
    };
  }, [project.location_lat, project.location_lon, project.latitude, project.longitude]);

  const hasProjectCenter = projectLat !== null && projectLon !== null;

  const projectCenter = useMemo<[number, number]>(() => {
    if (projectLat !== null && projectLon !== null) return [projectLon, projectLat]; // MapLibre uses [lng, lat]
    return DEFAULT_MAP_CENTER;
  }, [projectLat, projectLon]);

  const [resolvedCenter, setResolvedCenter] = useState<[number, number] | null>(
    hasProjectCenter ? projectCenter : null
  );
  const [mapApiCenter, setMapApiCenter] = useState<[number, number] | null>(null);
  const [mapLocationOverride, setMapLocationOverride] = useState(false);

  useEffect(() => {
    if (!hasProjectCenter) return;
    setResolvedCenter((prev) => {
      if (!prev || prev[0] !== projectCenter[0] || prev[1] !== projectCenter[1]) {
        return projectCenter;
      }
      return prev;
    });
  }, [hasProjectCenter, projectCenter]);

  useEffect(() => {
    if (!mapApiCenter) return;
    setResolvedCenter((prev) => {
      if (!prev || prev[0] !== mapApiCenter[0] || prev[1] !== mapApiCenter[1]) {
        return mapApiCenter;
      }
      return prev;
    });
  }, [mapApiCenter]);

  // ───── Map UI State ─────
  const [basemap, setBasemap] = useState<BasemapStyle>('hybrid');
  const [activeTool, setActiveTool] = useState<DrawTool>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [layers, setLayers] = useState<LayerGroup[]>(() => getDefaultLayerGroups());
  // Terrain: hillshade relief on by default (subtle, from the free DEM); the
  // dramatic 3D tilt is opt-in. Both survive basemap switches (see MapCanvas).
  const [hillshadeEnabled, setHillshadeEnabled] = useState(true);
  const [terrain3dEnabled, setTerrain3dEnabled] = useState(false);
  const mapCanvasRef = useRef<MapCanvasRef>(null);
  const [mapBounds, setMapBounds] = useState<[number, number, number, number] | null>(null);

  // ───── Feature Modal State ─────
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [pendingFeature, setPendingFeature] = useState<DrawnFeature | null>(null);
  // FB-323: competitor whose in-map detail drawer is open (null = closed).
  const [selectedCompetitor, setSelectedCompetitor] = useState<MarketCompetitiveProject | null>(null);
  const [featureSaving, setFeatureSaving] = useState(false);
  // Click-to-edit a saved drawn shape (B): the selected feature opens in the
  // FeatureModal in edit mode. Distinct from `pendingFeature` (a fresh draw).
  const [editingFeature, setEditingFeature] = useState<MapFeature | null>(null);
  const [featureDeleting, setFeatureDeleting] = useState(false);
  // Vertex-reshape (direct_select) of a saved shape. While set, that feature is
  // hidden from the read-only canvas layer (its editable draw copy is shown
  // instead) and draw.update persists its geometry. Ref mirrors state so the
  // draw callback (created before this point) can read it without a stale closure.
  const [reshapingFeatureId, setReshapingFeatureId] = useState<string | null>(null);
  const reshapingFeatureIdRef = useRef<string | null>(null);
  // After a vertex reshape finishes, reopen the edit modal for this feature so
  // the user can review/save other changes (name, color). Resolved against the
  // freshly-persisted geometry by an effect once reshape state has cleared.
  const [reopenEditId, setReopenEditId] = useState<string | null>(null);
  // Per-overlay legend visibility (A). Overlay ids present here are HIDDEN;
  // absence = visible (default). Site-plan records have no persisted visible flag.
  const [hiddenOverlayIds, setHiddenOverlayIds] = useState<Set<number>>(() => new Set());
  // Overlays whose source_uri image fails to load (C). Surfaced in the legend as
  // "image unavailable — re-drape" and skipped by the read-only drape loop so a
  // missing image reads as an explicit broken state, not a silent blank.
  const [unavailableOverlayIds, setUnavailableOverlayIds] = useState<Set<number>>(() => new Set());

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
  const [parcelCountyOverride, setParcelCountyOverride] = useState<CountyCode | null>(null);
  const [isCountyPromptOpen, setIsCountyPromptOpen] = useState(false);
  const [parcelSelectionSaving, setParcelSelectionSaving] = useState(false);
  const [parcelSelectionError, setParcelSelectionError] = useState<string | null>(null);
  const [selectedTaxParcels, setSelectedTaxParcels] = useState<Record<string, Feature>>({});

  // ───── Toast ─────
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);

  const PARCEL_MIN_ZOOM = 12.5;
  const COUNTY_PARCEL_MIN_ZOOM = 12.5;
  // County GIS circuit-breaker tuning.
  const COUNTY_FAILURE_THRESHOLD = 2;
  const COUNTY_COOLDOWN_MS = 60_000;

  const autoCounty = useMemo(
    () => normalizeCountyValue(projectCounty ?? null),
    [projectCounty]
  );
  const resolvedCounty = parcelCountyOverride ?? autoCounty;
  const selectedTaxParcelIds = useMemo(() => Object.keys(selectedTaxParcels), [selectedTaxParcels]);
  const taxParcelsLayerVisible = useMemo(() => {
    const group = layers.find((layerGroup) => layerGroup.id === 'project-boundary');
    const layer = group?.layers.find((entry) => entry.id === 'tax-parcels');
    return Boolean(layer?.visible);
  }, [layers]);
  const parcelOutlineEnabled = resolvedCounty === 'maricopa' && taxParcelsLayerVisible;
  const isLosAngelesCounty = useMemo(() => {
    const value = typeof projectCounty === 'string' ? projectCounty.toLowerCase() : '';
    return value.includes('los angeles');
  }, [projectCounty]);
  const countyOptions = useMemo(
    () => Object.keys(COUNTY_PARCEL_SERVICES) as CountyCode[],
    []
  );
  const resolvedCountyLabel = useMemo(
    () => (resolvedCounty ? formatCountyLabel(resolvedCounty) : 'Select county'),
    [resolvedCounty]
  );
  const countyPromptMessage = useMemo(() => {
    if (autoCounty) {
      return `Project county detected as ${formatCountyLabel(autoCounty)}. Select a county to override.`;
    }
    return 'Select Maricopa or Pinal County to load parcel overlays.';
  }, [autoCounty]);

  // ───── Demographics (Ring) State ─────
  const [selectedRingRadius, setSelectedRingRadius] = useState<number | null>(null);
  const [selectedRingStats, setSelectedRingStats] = useState<RingDemographics | null>(null);
  const [isRingModalOpen, setIsRingModalOpen] = useState(false);

  const hasResolvedCenter = resolvedCenter !== null;
  const resolvedLat = resolvedCenter ? resolvedCenter[1] : null;
  const resolvedLon = resolvedCenter ? resolvedCenter[0] : null;

  const {
    demographics,
    isLoading: demographicsLoading,
    error: demographicsError,
    refetch: refetchDemographics,
  } = useDemographics({
    lat: resolvedLat ?? 0,
    lon: resolvedLon ?? 0,
    projectId: String(projectId),
    enabled: hasResolvedCenter,
  });

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    setParcelCountyOverride(null);
    setSelectedTaxParcels({});
    setParcelSelectionError(null);
  }, [projectId, autoCounty]);

  useEffect(() => {
    if (projectCounty) return;
    const controller = new AbortController();

    const loadProjectDetails = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/details`, { headers: getAuthHeaders(), signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = await response.json();
        const nextCounty = payload?.county ?? payload?.jurisdiction_county ?? null;
        if (typeof nextCounty === 'string' && nextCounty.trim()) {
          setProjectCounty(nextCounty);
        }
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return;
        console.warn('Failed to load project county:', error);
      }
    };

    loadProjectDetails();

    return () => {
      controller.abort();
    };
  }, [projectCounty, projectId]);


  const handleSelectCounty = useCallback((county: CountyCode) => {
    setParcelCountyOverride(county);
    setIsCountyPromptOpen(false);
    setParcelSelectionError(null);
    setLayers((prev) =>
      prev.map((group) => {
        if (group.id !== 'project-boundary') return group;
        return {
          ...group,
          layers: group.layers.map((layer) =>
            layer.id === 'tax-parcels' ? { ...layer, visible: true } : layer
          ),
        };
      })
    );
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
  // Project profile (APN)
  // ─────────────────────────────────────────────────────────────────────────

  const [profileApn, setProfileApn] = useState<string>('');
  const mapCenterRequestRef = useRef(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadProfile = async () => {
      try {
        const profile = await fetchJson<{ apn?: string | null }>(
          `/api/projects/${projectId}/profile`,
          { signal: controller.signal }
        );
        if (!active) return;
        const apnValue = typeof profile?.apn === 'string' ? profile.apn.trim() : '';
        setProfileApn(apnValue);
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return;
        console.warn('Failed to load project profile APN:', error);
        if (active) setProfileApn('');
      }
    };

    loadProfile();
    return () => {
      active = false;
      controller.abort();
    };
  }, [projectId]);

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

  const [saleComps, setSaleComps] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadSalesComps = async () => {
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

        if (!features.length) {
          setSaleComps(null);
          return;
        }

        const enriched = features.map((feature: any, index: any) => {
          const props = (feature.properties ?? {}) as Record<string, unknown>;
          return {
            ...feature,
            properties: {
              ...props,
              popup_html: buildSaleCompPopupHtml(props, `Comp ${index + 1}`),
            },
          };
        });

        setSaleComps({ type: 'FeatureCollection', features: enriched });
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return;
        console.warn('Failed to load sales comps:', error);
        setSaleComps(null);
      }
    };

    loadSalesComps();
    return () => controller.abort();
  }, [buildSaleCompPopupHtml, getAuthHeaders, projectId]);

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
    const addressLines = splitAddressLines(addressValue);
    const addressHtml = addressLines
      ? `<div class="comparable-popup-address">${escapeHtml(addressLines.line1)}</div>${
        addressLines.line2 ? `<div class="comparable-popup-address">${escapeHtml(addressLines.line2)}</div>` : ''
      }`
      : '';
    const nameValue = comp.property_name ?? comp.name ?? 'Rent Comp';

    return `<div class="comparable-popup-content">
      <div class="comparable-popup-name" style="color: ${color};">${escapeHtml(nameValue)}</div>
      ${addressHtml}
      <div class="comparable-popup-details">${bedroomsValue}BR/${bathroomsValue}BA · ${sqftValue > 0 ? sqftValue.toLocaleString() : '—'} SF</div>
      <div class="comparable-popup-rent">$${Math.round(rentValue).toLocaleString()}/mo</div>
      ${comp.distance_miles ? `<div class="comparable-popup-distance">${comp.distance_miles} mi away</div>` : ''}
    </div>`;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadRentComps = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/rental-comparables`, { headers: getAuthHeaders(), signal: controller.signal,
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

        const grouped = new Map<string, {
          lat: number;
          lng: number;
          name: string;
          address?: string;
          distance_miles?: number | null;
          year_built?: number | null;
          total_units?: number | null;
          floorplans: Array<Record<string, unknown>>;
        }>();

        json.data.forEach((row: Record<string, unknown>) => {
          const lat = parseCoordinate(row.latitude as number | string | null | undefined);
          const lng = parseCoordinate(row.longitude as number | string | null | undefined);
          if (lat === null || lng === null) return;

          const name = (row.property_name as string) || (row.name as string) || 'Rent Comp';
          const address = row.address as string | undefined;
          const key = `${name}|${address ?? ''}|${lat}|${lng}`;

          const entry = grouped.get(key) ?? {
            lat,
            lng,
            name,
            address,
            distance_miles: row.distance_miles != null ? Number(row.distance_miles) : null,
            year_built: row.year_built != null ? Number(row.year_built) : null,
            total_units: row.total_units != null ? Number(row.total_units) : null,
            floorplans: [],
          };

          if (row.distance_miles != null) {
            const next = Number(row.distance_miles);
            if (Number.isFinite(next)) {
              entry.distance_miles = entry.distance_miles == null ? next : Math.min(entry.distance_miles, next);
            }
          }
          if (row.year_built != null) {
            const next = Number(row.year_built);
            if (Number.isFinite(next)) {
              entry.year_built = entry.year_built == null ? next : Math.min(entry.year_built, next);
            }
          }
          if (row.total_units != null) {
            const next = Number(row.total_units);
            if (Number.isFinite(next)) {
              entry.total_units = entry.total_units == null ? next : Math.max(entry.total_units, next);
            }
          }

          entry.floorplans.push({
            unit_type: row.unit_type ?? row.unitType ?? '',
            bedrooms: row.bedrooms ?? null,
            bathrooms: row.bathrooms ?? null,
            avg_sqft: row.avg_sqft ?? row.avgSqft ?? null,
            asking_rent: row.asking_rent ?? row.askingRent ?? null,
            effective_rent: row.effective_rent ?? row.effectiveRent ?? null,
          });

          grouped.set(key, entry);
        });

        const features = Array.from(grouped.values()).map((entry, index) => {
          const color = getComparableColor(entry.name);
          return {
            type: 'Feature' as const,
            id: `rent-${index}-${entry.lng}-${entry.lat}`,
            properties: {
              name: entry.name,
              address: entry.address ?? null,
              distance_miles: entry.distance_miles ?? null,
              year_built: entry.year_built ?? null,
              total_units: entry.total_units ?? null,
              floorplans: entry.floorplans,
              color,
            },
            geometry: {
              type: 'Point' as const,
              coordinates: [entry.lng, entry.lat],
            },
          };
        });

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
  // Market Layer Data: Recent Sales (Redfin SF Comps)
  // ─────────────────────────────────────────────────────────────────────────

  const recentSalesLayerVisible = useMemo(() => {
    const marketGroup = layers.find((g) => g.id === 'market');
    return marketGroup?.layers.find((l) => l.id === 'recent-sales')?.visible ?? false;
  }, [layers]);

  const { data: sfCompsData } = useSfComps(projectId, {
    radiusMiles: 5,
    soldWithinDays: 365,
  });

  const recentSales = useMemo<FeatureCollection | null>(() => {
    if (!recentSalesLayerVisible || !sfCompsData?.comps?.length) return null;

    const p25 = sfCompsData.stats.p25Price ?? 0;
    const p75 = sfCompsData.stats.p75Price ?? Infinity;

    const features = sfCompsData.comps
      .filter((comp) => Number.isFinite(comp.lat) && Number.isFinite(comp.lng))
      .map((comp, i) => {
        // Color by price tier: green = below 25th %ile, yellow = 25-75th, red = above 75th
        let tierColor = '#eab308'; // yellow (mid)
        if (comp.salePrice <= p25) tierColor = '#22c55e'; // green (low)
        else if (comp.salePrice >= p75) tierColor = '#ef4444'; // red (high)

        const priceFmt = comp.salePrice ? `$${comp.salePrice.toLocaleString()}` : '';
        const psfFmt = comp.pricePerSqft ? `$${Math.round(comp.pricePerSqft)}/sf` : '';
        const sqftFmt = comp.sqft ? `${comp.sqft.toLocaleString()} sf` : '';
        const bedBath = [comp.beds ? `${comp.beds}bd` : '', comp.baths ? `${comp.baths}ba` : '']
          .filter(Boolean)
          .join(' / ');

        return {
          type: 'Feature' as const,
          id: `redfin-${comp.mlsId || i}`,
          geometry: { type: 'Point' as const, coordinates: [comp.lng, comp.lat] },
          properties: {
            name: comp.address || `Sale ${i + 1}`,
            price: comp.salePrice,
            price_per_sqft: comp.pricePerSqft,
            sqft: comp.sqft,
            beds: comp.beds,
            baths: comp.baths,
            year_built: comp.yearBuilt,
            sale_date: comp.saleDate,
            color: tierColor,
            popover_title: escapeHtml(comp.address || `Sale ${i + 1}`),
            popover_rows: JSON.stringify([
              { label: 'Price', value: priceFmt + (psfFmt ? ` (${psfFmt})` : '') },
              { label: 'Size', value: sqftFmt },
              { label: 'Bed/Bath', value: bedBath },
              { label: 'Built', value: comp.yearBuilt ? String(comp.yearBuilt) : '' },
              { label: 'Sold', value: comp.saleDate ? new Date(comp.saleDate).toLocaleDateString() : '' },
            ]),
          },
        };
      });

    return { type: 'FeatureCollection', features };
  }, [recentSalesLayerVisible, sfCompsData]);

  // ─────────────────────────────────────────────────────────────────────────
  // Market Layer Data: Competitive Projects
  // ─────────────────────────────────────────────────────────────────────────

  const competitiveLayerVisible = useMemo(() => {
    const marketGroup = layers.find((g) => g.id === 'market');
    return marketGroup?.layers.find((l) => l.id === 'competitive-projects')?.visible ?? false;
  }, [layers]);

  const { data: competitorData } = useMarketCompetitors(projectId);

  const competitiveProjects = useMemo<FeatureCollection | null>(() => {
    if (!competitiveLayerVisible || !competitorData?.length) return null;

    const statusColors: Record<string, string> = {
      selling: '#22c55e',
      sold_out: '#6b7280',
      planned: '#06b6d4',
    };

    const features = competitorData
      .filter((c) => {
        const lat = Number(c.latitude);
        const lon = Number(c.longitude);
        return Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0;
      })
      .map((comp, i) => {
        const lat = Number(comp.latitude);
        const lon = Number(comp.longitude);
        const color = statusColors[comp.status] || '#f43f5e';
        const priceRange =
          comp.price_min && comp.price_max
            ? `$${Number(comp.price_min).toLocaleString()} – $${Number(comp.price_max).toLocaleString()}`
            : comp.price_min
              ? `From $${Number(comp.price_min).toLocaleString()}`
              : '';

        return {
          type: 'Feature' as const,
          id: `competitor-${comp.id || i}`,
          geometry: { type: 'Point' as const, coordinates: [lon, lat] },
          properties: {
            name: comp.comp_name,
            builder: comp.builder_name || '',
            status: comp.status,
            total_units: comp.total_units,
            absorption_rate: comp.absorption_rate_monthly,
            color,
            popover_title: escapeHtml(comp.comp_name),
            popover_rows: JSON.stringify([
              { label: 'Builder', value: comp.builder_name || '' },
              { label: 'Status', value: comp.status ? comp.status.replace('_', ' ') : '' },
              { label: 'Units', value: comp.total_units ? String(comp.total_units) : '' },
              { label: 'Price', value: priceRange },
              { label: 'Absorption', value: comp.absorption_rate_monthly ? `${comp.absorption_rate_monthly}/mo` : '' },
            ]),
          },
        };
      });

    return { type: 'FeatureCollection', features };
  }, [competitiveLayerVisible, competitorData]);

  // FB-323: map a clicked competitor marker (feature id "competitor-<id|idx>")
  // back to its full record and open the in-map detail drawer. Mirrors the
  // exact filter + indexing used to build competitiveProjects above.
  const handleCompetitorClick = useCallback(
    (featureId: string) => {
      if (!competitorData?.length) return;
      const valid = competitorData.filter((c) => {
        const lat = Number(c.latitude);
        const lon = Number(c.longitude);
        return Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0;
      });
      const match = valid.find((c, i) => `competitor-${c.id || i}` === featureId);
      if (match) setSelectedCompetitor(match);
    },
    [competitorData]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Hooks: useMapFeatures (Django CRUD)
  // ─────────────────────────────────────────────────────────────────────────

  const {
    features: savedFeatures,
    fetchFeatures,
    saveFeature,
    updateFeature,
    deleteFeature,
  } = useMapFeatures(projectId);

  // Fetch features on mount
  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  // Convert saved features to MapFeature[] for MapCanvas
  const mapFeatures = useMemo<MapFeature[]>(() => {
    return savedFeatures
      .filter((f) => f.id !== reshapingFeatureId)
      .map((f) => ({
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
  }, [savedFeatures, reshapingFeatureId]);

  // ─────────────────────────────────────────────────────────────────────────
  // Hooks: useMapDraw (MapboxDraw integration)
  // ─────────────────────────────────────────────────────────────────────────

  const mapInstance = mapCanvasRef.current?.getMap() ?? null;

  // Parcel-association (P3 / Gesture C): when a "Draw Boundary" gesture is
  // active, route the created polygon to the attach flow instead of the
  // FeatureModal. These refs let handleFeatureCreated (wired into useMapDraw
  // below) reach state/handlers declared further down without forward refs.
  const attachDrawActiveRef = useRef(false);
  const handleDrawnAttachRef = useRef<((feature: DrawnFeature) => void) | null>(null);

  const handleFeatureCreated = useCallback((feature: DrawnFeature) => {
    if (attachDrawActiveRef.current && feature.type === 'Polygon') {
      handleDrawnAttachRef.current?.(feature);
      return;
    }
    setPendingFeature(feature);
    setFeatureModalOpen(true);
  }, []);

  // Persist a reshaped saved shape: draw.update fires (with recomputed area)
  // while in direct_select; only persist for the feature we put into reshape.
  const handleFeatureGeometryUpdated = useCallback(
    async (df: DrawnFeature) => {
      if (!reshapingFeatureIdRef.current || df.id !== reshapingFeatureIdRef.current) return;
      try {
        await updateFeature(df.id, {
          geometry: { type: df.type, coordinates: df.coordinates } as GeoJSON.Geometry,
          area_sqft: df.properties.area_sqft,
          area_acres: df.properties.area_acres,
          perimeter_ft: df.properties.perimeter_ft,
          length_ft: df.properties.length_ft,
        });
      } catch (err) {
        showToast(`Error saving shape: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    },
    [updateFeature, showToast]
  );

  const {
    initializeDraw,
    liveMeasurement,
    isDrawing,
    startDrawPoint,
    startDrawLine,
    startDrawPolygon,
    startMeasure,
    startEdit,
    deleteSelected,
    cancelDraw,
    clearCurrentFeature,
    editFeatureGeometry,
  } = useMapDraw(mapInstance, {
    onFeatureCreated: handleFeatureCreated,
    onFeatureUpdated: handleFeatureGeometryUpdated,
    // Measure mode is ephemeral; once a measurement finishes, drop the tool
    // back to neutral so the toolbar button doesn't look stuck "active".
    onMeasureComplete: () => setActiveTool(null),
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
    if (!isDevelopmentProject) {
      setPlanParcels(null);
      setPlanLoading(false);
      setPlanError(null);
      return undefined;
    }
    const controller = new AbortController();

    const loadPlanParcels = async () => {
      setPlanLoading(true);
      setPlanError(null);
      try {
        const response = await fetch(
          `/api/gis/plan-parcels?project_id=${projectId}&include_geometry=true&format=geojson`, { headers: getAuthHeaders(), signal: controller.signal });
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
  }, [projectId, isDevelopmentProject]);

  // 2. Project Boundary
  useEffect(() => {
    const controller = new AbortController();

    const loadBoundary = async () => {
      setBoundaryLoading(true);
      setBoundaryError(null);
      try {
        const response = await fetch(`/api/gis/ingest-parcels?project_id=${projectId}`, { headers: getAuthHeaders(), signal: controller.signal,
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
    if (resolvedCounty) return;
    if (!bboxParam) return;
    const controller = new AbortController();

    const loadTaxParcels = async () => {
      setTaxLoading(true);
      setTaxError(null);
      try {
        const response = await fetch(`/api/gis/tax-parcels?bbox=${bboxParam}`, { headers: getAuthHeaders(), signal: controller.signal,
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
  }, [bboxParam, resolvedCounty]);

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-fit bounds after GIS data loads — ONCE per project
  // ─────────────────────────────────────────────────────────────────────────

  // Latch the initial fit so it fires only the first time real data is
  // available. Without it, move-driven parcel reloads (which mutate taxParcels/
  // saleComps/rentComps on every pan/zoom) re-run this effect and yank the
  // camera back out. Resets per project so a new project re-fits once.
  const didAutoFitRef = useRef(false);
  useEffect(() => {
    didAutoFitRef.current = false;
  }, [projectId]);

  useEffect(() => {
    const m = mapCanvasRef.current?.getMap();
    if (!m) return;
    if (didAutoFitRef.current) return;
    if (hasResolvedCenter) return;

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
      didAutoFitRef.current = true; // fitted once; later reloads are no-ops
    } catch {
      // ignore bbox calculation errors
    }
  }, [planParcels, projectBoundary, taxParcels, saleComps, rentComps, hasResolvedCenter]);

  // ─────────────────────────────────────────────────────────────────────────
  // Update layer counts from loaded data
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const hasProjectLocation = Boolean(resolvedCenter ?? projectCenter);
    setLayers((prev) =>
      prev.map((group) => {
        if (group.id === 'project-boundary') {
          return {
            ...group,
            layers: group.layers.map((layer) => {
              if (layer.id === 'plan-parcels') {
                return {
                  ...layer,
                  count: isDevelopmentProject ? planParcels?.features?.length ?? 0 : 0,
                };
              }
              if (layer.id === 'tax-parcels') return { ...layer, count: taxParcels?.features?.length ?? 0 };
              if (layer.id === 'site-boundary') return { ...layer, count: hasProjectLocation ? 1 : 0 };
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
              if (layer.id === 'land-sales') return { ...layer, count: 0 };
              return layer;
            }),
          };
        }
        if (group.id === 'market') {
          const sfCount = sfCompsData?.comps?.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng)).length ?? 0;
          const compCount = competitorData?.filter((c) => {
            const lat = Number(c.latitude);
            const lon = Number(c.longitude);
            return Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0;
          }).length ?? 0;
          return {
            ...group,
            layers: group.layers.map((layer) => {
              if (layer.id === 'recent-sales') return { ...layer, count: sfCount };
              if (layer.id === 'competitive-projects') return { ...layer, count: compCount };
              return layer;
            }),
          };
        }
        return group;
      })
    );
  }, [planParcels, taxParcels, projectBoundary, saleComps, rentComps, projectCenter, resolvedCenter, isDevelopmentProject, sfCompsData, competitorData]);

  // ─────────────────────────────────────────────────────────────────────────
  // Callbacks: Layer Panel
  // ─────────────────────────────────────────────────────────────────────────

  const handleToggleLayer = useCallback((groupId: LayerGroupId, layerId: string) => {
    if (layerId === 'tax-parcels' && !resolvedCounty) {
      setTaxError('Select a county to load tax parcels.');
    }
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
  }, [resolvedCounty]);

  const handleToggleGroup = useCallback((groupId: LayerGroupId) => {
    setLayers((prev) =>
      prev.map((group) => {
        if (group.id !== groupId) return group;
        return { ...group, expanded: !group.expanded };
      })
    );
  }, []);

  // Persisted per-project layer order. No backend map-pref path exists, so this
  // uses localStorage (ParcelHunt precedent), keyed by project id.
  const layerOrderStorageKey = useMemo(() => `mapLayerOrder:${projectId}`, [projectId]);

  // Restore a saved order on mount / project switch (client-side only).
  useEffect(() => {
    const stored = readStoredLayerOrder(layerOrderStorageKey);
    if (!stored) return;
    setLayers((prev) => applyStoredLayerOrder(prev, stored));
  }, [layerOrderStorageKey]);

  // Drag-reorder a data-layer row within its group: update the ordered state and
  // persist it. MapCanvas re-stacks the actual MapLibre layers off this order
  // (legend order = draw order), so the on-screen stacking follows the legend.
  const handleReorderLayer = useCallback(
    (groupId: LayerGroupId, activeId: string, overId: string) => {
      setLayers((prev) => {
        const next = prev.map((group) => {
          if (group.id !== groupId) return group;
          const from = group.layers.findIndex((l) => l.id === activeId);
          const to = group.layers.findIndex((l) => l.id === overId);
          if (from === -1 || to === -1 || from === to) return group;
          return { ...group, layers: arrayMove(group.layers, from, to) };
        });
        writeStoredLayerOrder(layerOrderStorageKey, next);
        return next;
      });
    },
    [layerOrderStorageKey],
  );

  const handleZoomToLayer = useCallback((_groupId: LayerGroupId, layerId: string) => {
    const m = mapCanvasRef.current?.getMap();
    if (!m) return;

    let data: FeatureCollection | Feature | null = null;
    if (layerId === 'plan-parcels') data = planParcels;
    else if (layerId === 'tax-parcels') data = taxParcels;
    else if (layerId === 'site-boundary') data = projectBoundary;

    if (!data && layerId === 'site-boundary') {
      const fallbackCenter = resolvedCenter ?? projectCenter;
      if (fallbackCenter) {
        m.flyTo({ center: fallbackCenter, zoom: 16, speed: 0.8 });
      }
      return;
    }

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
  }, [planParcels, taxParcels, projectBoundary, projectCenter, resolvedCenter]);

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
        case 'measure':
          startMeasure();
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
    [activeTool, cancelDraw, startDrawPoint, startDrawLine, startDrawPolygon, startMeasure, startEdit, deleteSelected]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Callbacks: Feature Modal (save drawn feature)
  // ─────────────────────────────────────────────────────────────────────────

  const handleFeatureModalSave = useCallback(
    async (data: { label: string; category: FeatureCategory; notes: string; color?: string }) => {
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
          style: data.color ? { color: data.color } : undefined,
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
  // Callbacks: Feature edit/delete (click a saved drawn shape → edit it)
  // ─────────────────────────────────────────────────────────────────────────

  const handleFeatureEditSave = useCallback(
    async (data: { label: string; category: FeatureCategory; notes: string; color?: string }) => {
      if (!editingFeature) return;
      setFeatureSaving(true);
      try {
        await updateFeature(editingFeature.id, {
          label: data.label,
          category: data.category,
          notes: data.notes,
          style: { ...editingFeature.style, ...(data.color ? { color: data.color } : {}) },
        });
        showToast(`Feature "${data.label}" updated`);
        setEditingFeature(null);
        setSelectedFeatureId(null);
      } catch (err) {
        showToast(`Error updating feature: ${err instanceof Error ? err.message : 'unknown'}`);
      } finally {
        setFeatureSaving(false);
      }
    },
    [editingFeature, updateFeature, showToast]
  );

  const handleFeatureDelete = useCallback(async () => {
    if (!editingFeature) return;
    setFeatureDeleting(true);
    try {
      await deleteFeature(editingFeature.id);
      showToast('Feature deleted');
      setEditingFeature(null);
      setSelectedFeatureId(null);
    } catch (err) {
      showToast(`Error deleting feature: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setFeatureDeleting(false);
    }
  }, [editingFeature, deleteFeature, showToast]);

  const handleFeatureEditClose = useCallback(() => {
    setEditingFeature(null);
  }, []);

  // Enter vertex-reshape from the edit modal: hide the read-only copy, load the
  // geometry into MapboxDraw in direct_select.
  const handleReshapeFeature = useCallback(() => {
    if (!editingFeature) return;
    const f = editingFeature;
    setEditingFeature(null);
    setSelectedFeatureId(null);
    reshapingFeatureIdRef.current = f.id;
    setReshapingFeatureId(f.id);
    editFeatureGeometry({
      type: 'Feature',
      id: f.id,
      geometry: f.geometry,
      properties: {},
    });
  }, [editingFeature, editFeatureGeometry]);

  // Finish reshaping: drop back to simple_select, remove the editable draw copy
  // (the saved layer re-renders the persisted geometry), clear reshape state, and
  // reopen the edit modal so the user can save/adjust the rest of the shape.
  const handleFinishReshape = useCallback(() => {
    const id = reshapingFeatureIdRef.current;
    cancelDraw();
    reshapingFeatureIdRef.current = null;
    setReshapingFeatureId(null);
    if (id) setReopenEditId(id);
    showToast('Shape updated');
  }, [cancelDraw, showToast]);

  // Reopen the edit modal once reshape state has cleared (so mapFeatures includes
  // the reshaped feature again, with its updated geometry/area).
  useEffect(() => {
    if (!reopenEditId) return;
    const f = mapFeatures.find((x) => x.id === reopenEditId);
    if (f) {
      setSelectedFeatureId(f.id);
      setEditingFeature(f);
    }
    setReopenEditId(null);
  }, [reopenEditId, mapFeatures]);

  // While reshaping, a double-click finishes the edit (and reopens the modal) —
  // "save by double-clicking a vertex". Geometry is already persisted live on each
  // draw.update; this is the explicit commit/exit gesture the user expects.
  useEffect(() => {
    if (!mapInstance || !reshapingFeatureId) return;
    const map = mapInstance;
    const onDblClick = (e: MapMouseEvent) => {
      e.preventDefault(); // suppress map double-click zoom
      handleFinishReshape();
    };
    map.on('dblclick', onDblClick);
    return () => { map.off('dblclick', onDblClick); };
  }, [mapInstance, reshapingFeatureId, handleFinishReshape]);

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
    // Open the clicked drawn shape for editing (B).
    setEditingFeature(feature);
  }, []);

  const handleTaxParcelToggle = useCallback((feature: Feature) => {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const parcelId = getParcelIdFromProps(props, feature.id);
    if (!parcelId) return;

    setParcelSelectionError(null);
    setSelectedTaxParcels((prev) => {
      const next = { ...prev };
      if (next[parcelId]) {
        delete next[parcelId];
      } else {
        next[parcelId] = feature;
      }
      return next;
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Parcel association (P1): click a parcel → confirm → attach APN + boundary + point
  // ─────────────────────────────────────────────────────────────────────────

  const [attachMode, setAttachMode] = useState(false);
  const [attachCandidate, setAttachCandidate] = useState<{
    kind: 'parcel' | 'drawn';
    feature: Feature;
    apn: string;
    acres: number | null;
    centroid: [number, number]; // [lon, lat] — parcel/polygon centroid
    droppedPoint?: [number, number]; // [lon, lat] — drag landing point (P2)
    boundaryGeometry?: Geometry; // GeoJSON polygon to write (P3 drawn)
  } | null>(null);
  const [attachSaving, setAttachSaving] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [attachSnapToCenter, setAttachSnapToCenter] = useState(false);
  const [attachDrawActive, setAttachDrawActive] = useState(false);

  // Keep the ref the draw callback reads in sync with the flag.
  useEffect(() => {
    attachDrawActiveRef.current = attachDrawActive;
  }, [attachDrawActive]);

  const handleParcelAttach = useCallback((feature: Feature) => {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const apn = getParcelIdFromProps(props, feature.id);
    let acres: number | null = null;
    let centroid: [number, number] | null = null;
    try {
      acres = turf.area(feature as turf.AllGeoJSON) / 4046.8564224;
      const c = turf.centroid(feature as turf.AllGeoJSON);
      const coords = c.geometry?.coordinates as [number, number] | undefined;
      if (coords && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
        centroid = [coords[0], coords[1]];
      }
    } catch {
      // ignore geometry errors
    }
    if (!centroid) return;
    setAttachError(null);
    setAttachSnapToCenter(false);
    setAttachCandidate({ kind: 'parcel', feature, apn, acres, centroid });
  }, []);

  // P2 / Gesture B: subject pin dragged onto the map. Find the first parcel
  // under the drop point; if found, open the same confirm modal pre-filled
  // from the matched parcel, carrying the dropped point so the modal can offer
  // a "snap to parcel center" toggle.
  const handleSubjectDragEnd = useCallback(
    (lngLat: [number, number]) => {
      const features = taxParcels?.features;
      if (!features?.length) {
        showToast('No parcel under the pin');
        return;
      }
      const pt = turf.point(lngLat);
      let match: Feature | null = null;
      for (const f of features) {
        const geomType = f.geometry?.type;
        if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') continue;
        try {
          if (turf.booleanPointInPolygon(pt, f as Feature<Polygon | MultiPolygon>)) {
            match = f as Feature;
            break;
          }
        } catch {
          // ignore malformed geometry
        }
      }
      if (!match) {
        showToast('No parcel under the pin');
        return;
      }
      const props = (match.properties ?? {}) as Record<string, unknown>;
      const apn = getParcelIdFromProps(props, match.id);
      let acres: number | null = null;
      let centroid: [number, number] | null = null;
      try {
        acres = turf.area(match as turf.AllGeoJSON) / 4046.8564224;
        const c = turf.centroid(match as turf.AllGeoJSON);
        const coords = c.geometry?.coordinates as [number, number] | undefined;
        if (coords && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
          centroid = [coords[0], coords[1]];
        }
      } catch {
        // ignore geometry errors
      }
      if (!centroid) {
        showToast('No parcel under the pin');
        return;
      }
      setAttachError(null);
      setAttachSnapToCenter(false);
      setAttachCandidate({
        kind: 'parcel',
        feature: match,
        apn,
        acres,
        centroid,
        droppedPoint: lngLat,
      });
    },
    [taxParcels, showToast]
  );

  // P3 / Gesture C: a polygon drawn while "Draw Boundary" is active. Build the
  // boundary geometry, best-effort APN from a single intersecting parcel, and
  // open the confirm modal in 'drawn' mode.
  const handleDrawnAttach = useCallback(
    (feature: DrawnFeature) => {
      const geom: Geometry = {
        type: 'Polygon',
        coordinates: feature.coordinates as GeoJSON.Position[][],
      };
      let acres: number | null =
        typeof feature.properties?.area_acres === 'number'
          ? feature.properties.area_acres
          : null;
      let centroid: [number, number] | null = null;
      const geomFeature: Feature = { type: 'Feature', geometry: geom, properties: {} };
      try {
        if (acres == null) acres = turf.area(geomFeature as turf.AllGeoJSON) / 4046.8564224;
        const c = turf.centroid(geomFeature as turf.AllGeoJSON);
        const coords = c.geometry?.coordinates as [number, number] | undefined;
        if (coords && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
          centroid = [coords[0], coords[1]];
        }
      } catch {
        // ignore geometry errors
      }

      // Best-effort APN: exactly one intersecting parcel → use its parcel_id.
      let apn = '';
      const features = taxParcels?.features;
      if (features?.length) {
        const hits: Feature[] = [];
        for (const f of features) {
          const gt = f.geometry?.type;
          if (gt !== 'Polygon' && gt !== 'MultiPolygon') continue;
          try {
            if (turf.booleanIntersects(geomFeature as Feature, f as Feature)) {
              hits.push(f as Feature);
              if (hits.length > 1) break;
            }
          } catch {
            // ignore malformed geometry
          }
        }
        if (hits.length === 1) {
          apn = getParcelIdFromProps((hits[0].properties ?? {}) as Record<string, unknown>, hits[0].id);
        }
      }

      setAttachError(null);
      setAttachSnapToCenter(false);
      setAttachCandidate({
        kind: 'drawn',
        feature: geomFeature,
        apn,
        acres,
        centroid: centroid ?? [0, 0],
        boundaryGeometry: geom,
      });
      setAttachDrawActive(false);
      clearCurrentFeature();
    },
    [taxParcels, clearCurrentFeature]
  );

  // Wire the drawn-attach handler into the ref the draw callback reads.
  useEffect(() => {
    handleDrawnAttachRef.current = handleDrawnAttach;
  }, [handleDrawnAttach]);

  const handleAttachCancel = useCallback(() => {
    setAttachCandidate(null);
    setAttachError(null);
    setAttachSnapToCenter(false);
  }, []);

  const handleAttachConfirm = useCallback(async () => {
    if (!attachCandidate) return;
    setAttachSaving(true);
    setAttachError(null);
    const djangoUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
    // Effective subject point: a dragged drop point wins unless the user opted
    // to snap to the parcel center. Gesture A (click) has no droppedPoint →
    // always the centroid. Drawn boundaries use the polygon centroid.
    const useDropped = !!attachCandidate.droppedPoint && !attachSnapToCenter;
    const [lon, lat] = useDropped ? attachCandidate.droppedPoint! : attachCandidate.centroid;
    const countyLabel = resolvedCounty
      ? resolvedCounty.charAt(0).toUpperCase() + resolvedCounty.slice(1)
      : null;
    try {
      // 1) APN + county + relocated point on the project. Blank APN (drawn over
      //    unparceled ground) is allowed → apn_primary null.
      const patchRes = await fetch(`${djangoUrl}/api/projects/${projectId}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          apn_primary: attachCandidate.apn || null,
          ...(countyLabel ? { county: countyLabel } : {}),
          location_lat: lat,
          location_lon: lon,
        }),
      });
      if (!patchRes.ok) {
        const payload = await patchRes.text();
        throw new Error(payload || `Project update failed (${patchRes.status})`);
      }

      // 2) Boundary write — branches by gesture kind.
      try {
        if (attachCandidate.kind === 'drawn' && attachCandidate.boundaryGeometry) {
          // P3: write the drawn polygon directly to the boundary endpoint.
          const boundaryRes = await fetch(`${djangoUrl}/api/gis/boundary-set/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              projectId,
              geometry: attachCandidate.boundaryGeometry,
              source: 'drawn',
            }),
          });
          if (boundaryRes.ok) {
            const payload = await boundaryRes.json();
            if (payload?.boundary?.geometry) {
              setProjectBoundary(
                buildBoundaryFeature(payload.boundary.geometry, {
                  acres: payload.boundary.acres,
                  source: payload.boundary.source,
                  created_at: payload.boundary.created_at,
                })
              );
            }
          }
        } else {
          // P1/P2: reuse the parcel-ingest write (dissolves into gis_project_boundary).
          const props = (attachCandidate.feature.properties ?? {}) as Record<string, unknown>;
          const ingestRes = await fetch(`${djangoUrl}/api/gis/parcel-ingest/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              projectId,
              county: resolvedCounty,
              parcels: [
                {
                  parcelId: attachCandidate.apn,
                  geom: attachCandidate.feature.geometry,
                  properties: { ...props, PARCELID: attachCandidate.apn },
                },
              ],
              source: 'parcel_association',
            }),
          });
          if (ingestRes.ok) {
            const payload = await ingestRes.json();
            if (payload?.boundary?.geometry) {
              setProjectBoundary(
                buildBoundaryFeature(payload.boundary.geometry, {
                  acres: payload.boundary.acres,
                  source: payload.boundary.source,
                  created_at: payload.boundary.created_at,
                })
              );
            }
          }
        }
      } catch (boundaryErr) {
        // Best-effort: APN + point already persisted; don't fail the whole attach.
        console.warn('Boundary write failed during attach:', boundaryErr);
      }

      // 3) Move the subject locally → instant re-center + demographics re-key.
      setResolvedCenter([lon, lat]);
      setMapLocationOverride(true);

      // 4) Refresh the project-keyed demographics cache for the new point, then refetch.
      fetch(`${djangoUrl}/api/v1/location-intelligence/demographics/project/${projectId}/cache/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ lat, lon }),
      }).catch(() => {});
      refetchDemographics();

      // 5) Let the host (chat-first wrapper) re-pull the project.
      onProjectUpdated?.();

      showToast(attachCandidate.kind === 'drawn' ? 'Boundary attached' : 'Parcel attached');
      setAttachCandidate(null);
      setAttachSnapToCenter(false);
      setAttachDrawActive(false);
      setAttachMode(false);
    } catch (error) {
      setAttachError(error instanceof Error ? error.message : 'Failed to attach parcel');
    } finally {
      setAttachSaving(false);
    }
  }, [
    attachCandidate,
    attachSnapToCenter,
    getAuthHeaders,
    projectId,
    resolvedCounty,
    refetchDemographics,
    onProjectUpdated,
    showToast,
  ]);

  const handleConfirmBoundary = useCallback(async () => {
    if (!resolvedCounty) {
      setIsCountyPromptOpen(true);
      return;
    }
    if (selectedTaxParcelIds.length === 0) {
      setParcelSelectionError('Select at least one parcel to confirm the boundary.');
      return;
    }

    setParcelSelectionSaving(true);
    setParcelSelectionError(null);

    try {
      const djangoUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://127.0.0.1:8000';
      const features = selectedTaxParcelIds
        .map((id) => selectedTaxParcels[id])
        .filter(Boolean)
        .map((feature) => {
          const props = (feature.properties ?? {}) as Record<string, unknown>;
          const parcelId = getParcelIdFromProps(props, feature.id);
          return {
            parcelId,
            geom: feature.geometry,
            properties: { ...props, PARCELID: parcelId },
          };
        });

      const response = await fetch(`${djangoUrl}/api/gis/parcel-ingest/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          projectId,
          county: resolvedCounty,
          parcels: features,
          source: 'county_parcel_feed',
        }),
      });

      if (!response.ok) {
        const payload = await response.text();
        throw new Error(payload || `Parcel ingest failed (${response.status})`);
      }

      const payload = await response.json();
      if (payload?.boundary?.geometry) {
        setProjectBoundary(
          buildBoundaryFeature(payload.boundary.geometry, {
            acres: payload.boundary.acres,
            source: payload.boundary.source,
            created_at: payload.boundary.created_at,
          })
        );
      }

      showToast(`Boundary saved (${selectedTaxParcelIds.length} parcels)`);
    } catch (error) {
      console.error('Parcel ingest failed:', error);
      setParcelSelectionError('Failed to save boundary. Please try again.');
    } finally {
      setParcelSelectionSaving(false);
    }
  }, [
    getAuthHeaders,
    projectId,
    resolvedCounty,
    selectedTaxParcelIds,
    selectedTaxParcels,
    showToast,
  ]);

  const handleRemoveSelectedParcel = useCallback((parcelId: string) => {
    setSelectedTaxParcels((prev) => {
      if (!prev[parcelId]) return prev;
      const next = { ...prev };
      delete next[parcelId];
      return next;
    });
  }, []);

  const handleViewStateChange = useCallback((viewState: MapViewState) => {
    setMapZoom(viewState.zoom);
    if (viewState.bounds) {
      setMapBounds([
        viewState.bounds[0][0],
        viewState.bounds[0][1],
        viewState.bounds[1][0],
        viewState.bounds[1][1],
      ]);
    }
  }, []);

  const subjectApn = useMemo(() => {
    const candidate =
      (project as Record<string, unknown>).apn_primary ??
      (project as Record<string, unknown>).apn ??
      (project as Record<string, unknown>).apn_secondary ??
      (project as Record<string, unknown>).parcel_apn ??
      (project as Record<string, unknown>).parcel_apn_primary ??
      (project as Record<string, unknown>).parcel_apn_secondary;
    const resolved = typeof candidate === 'string' ? candidate.trim() : '';
    return resolved || profileApn;
  }, [project, profileApn]);

  useEffect(() => {
    if (!subjectApn || !isDevelopmentProject || mapLocationOverride) return;

    let active = true;

    const resolveParcelCenter = async () => {
      try {
        const collection = await fetchParcelsByAPN([subjectApn]);
        if (!active) return;
        if (!collection.features?.length) return;

        const centerFeature = turf.center(collection);
        const coords = centerFeature.geometry?.coordinates as [number, number] | undefined;
        if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) return;

        setResolvedCenter([coords[0], coords[1]]);
      } catch (error) {
        if (!active) return;
        console.warn('Failed to resolve parcel center from APN:', error);
      }
    };

    resolveParcelCenter();

    return () => {
      active = false;
    };
  }, [subjectApn, isDevelopmentProject, mapLocationOverride]);

  useEffect(() => {
    if (mapCenterRequestRef.current) return;

    let active = true;
    const controller = new AbortController();
    mapCenterRequestRef.current = true;

    const resolveMapCenter = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/map`, { headers: getAuthHeaders(), signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Map center lookup failed (${response.status})`);
        }
        const payload = await response.json();
        const center = payload?.center as [number, number] | undefined;
        if (!active || !center) return;
        if (!Number.isFinite(center[0]) || !Number.isFinite(center[1])) return;
        setMapApiCenter(center);
        setMapLocationOverride(Boolean(payload?.location_override));
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return;
        console.warn('Failed to resolve project map center:', error);
      }
    };

    resolveMapCenter();

    return () => {
      active = false;
      controller.abort();
    };
  }, [projectId]);

  const compApns = useMemo(() => {
    const apns: string[] = [];
    const features = saleComps?.features ?? [];
    features.forEach((feature) => {
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const candidate =
        props.APN ??
        props.apn ??
        props.parcel_apn ??
        props.apn_primary ??
        props.apn_secondary ??
        props.AIN ??
        props.ain;
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) apns.push(trimmed);
      }
    });
    return apns;
  }, [saleComps]);

  const parcelBoundsKey = useMemo(() => {
    if (!mapBounds) return '';
    return mapBounds.map((value) => value.toFixed(5)).join('|');
  }, [mapBounds]);

  const countyParcelBoundsKey = useMemo(() => {
    if (!mapBounds || !resolvedCounty) return '';
    return `${resolvedCounty}:${mapBounds.map((value) => value.toFixed(5)).join('|')}`;
  }, [mapBounds, resolvedCounty]);

  const [parcelCollection, setParcelCollection] = useState<FeatureCollection | null>(null);
  const lastParcelKeyRef = useRef<string>('');
  const lastCountyParcelKeyRef = useRef<string>('');
  const countyParcelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Circuit-breaker for a slow/down county GIS service. After
  // COUNTY_FAILURE_THRESHOLD consecutive failures we stop auto-querying on
  // viewport changes for COUNTY_COOLDOWN_MS so a dead service isn't hammered
  // on every pan. Reset on the next success, an explicit retry, or county
  // change.
  const countyFailureCountRef = useRef(0);
  const countyCooldownUntilRef = useRef(0);

  useEffect(() => {
    lastCountyParcelKeyRef.current = '';
    countyFailureCountRef.current = 0;
    countyCooldownUntilRef.current = 0;
    setTaxParcels(null);
    setSelectedTaxParcels({});
    setTaxError(null);
  }, [resolvedCounty]);

  // Treat turning the tax-parcels layer on as an explicit retry: clear the
  // circuit-breaker so the user can force a fresh county query (and a new key)
  // without waiting out the cooldown.
  const prevTaxLayerVisibleRef = useRef(false);
  useEffect(() => {
    if (taxParcelsLayerVisible && !prevTaxLayerVisibleRef.current) {
      countyFailureCountRef.current = 0;
      countyCooldownUntilRef.current = 0;
      lastCountyParcelKeyRef.current = '';
    }
    prevTaxLayerVisibleRef.current = taxParcelsLayerVisible;
  }, [taxParcelsLayerVisible]);

  useEffect(() => {
    if (!isLosAngelesCounty) return;
    if (mapZoom < PARCEL_MIN_ZOOM || !mapBounds) return;
    if (!parcelBoundsKey) return;
    if (lastParcelKeyRef.current === parcelBoundsKey) return;

    let active = true;

    const loadParcels = async () => {
      try {
        const result = await fetchParcelsByBbox(mapBounds);
        if (!active) return;
        setParcelCollection(result);
        lastParcelKeyRef.current = parcelBoundsKey;
      } catch (error) {
        if (!active) return;
        console.warn('Failed to fetch LA County parcels for map tab:', error);
        setParcelCollection(null);
      }
    };

    loadParcels();

    return () => {
      active = false;
    };
  }, [mapZoom, mapBounds, parcelBoundsKey, isLosAngelesCounty]);

  useEffect(() => {
    if (!resolvedCounty) return;
    if (!taxParcelsLayerVisible) return;
    if (mapZoom < COUNTY_PARCEL_MIN_ZOOM || !mapBounds) {
      setTaxParcels(null);
      return;
    }
    if (!countyParcelBoundsKey) return;
    if (lastCountyParcelKeyRef.current === countyParcelBoundsKey) return;

    // Circuit-breaker: while the county service is in cooldown after repeated
    // failures, don't auto-query on viewport changes. Surface the quiet note
    // once and keep whatever parcels are already on the map.
    if (Date.now() < countyCooldownUntilRef.current) {
      setTaxError('County parcels temporarily unavailable');
      return;
    }

    if (countyParcelTimerRef.current) {
      clearTimeout(countyParcelTimerRef.current);
    }

    let active = true;
    countyParcelTimerRef.current = setTimeout(() => {
      const loadCountyParcels = async () => {
        setTaxLoading(true);
        setTaxError(null);
        try {
          const result = await queryParcelsByBounds(
            resolvedCounty,
            mapBounds,
            getAuthHeaders()
          );
          if (!active) return;
          const normalized = normalizeParcelFeatureCollection(result);
          setTaxParcels(normalized);
          lastCountyParcelKeyRef.current = countyParcelBoundsKey;
          // Service is healthy again — reset the breaker.
          countyFailureCountRef.current = 0;
          countyCooldownUntilRef.current = 0;
        } catch (error) {
          if (!active) return;
          console.warn('Failed to fetch county parcels:', error);
          countyFailureCountRef.current += 1;
          // Keep the last good parcel set on a transient failure; only blank
          // when we have nothing to show.
          setTaxParcels((prev) =>
            prev && (prev.features?.length ?? 0) > 0 ? prev : null
          );
          if (countyFailureCountRef.current >= COUNTY_FAILURE_THRESHOLD) {
            // Trip the breaker: stop hammering for the cooldown window and
            // show a single quiet note instead of flooding on every pan.
            countyCooldownUntilRef.current = Date.now() + COUNTY_COOLDOWN_MS;
            setTaxError('County parcels temporarily unavailable');
          } else {
            setTaxError('Unable to load county parcels');
          }
        } finally {
          if (active) setTaxLoading(false);
        }
      };

      void loadCountyParcels();
    }, 300);

    return () => {
      active = false;
      if (countyParcelTimerRef.current) {
        clearTimeout(countyParcelTimerRef.current);
      }
    };
  }, [
    resolvedCounty,
    taxParcelsLayerVisible,
    mapZoom,
    mapBounds,
    countyParcelBoundsKey,
    getAuthHeaders,
    COUNTY_PARCEL_MIN_ZOOM,
    COUNTY_FAILURE_THRESHOLD,
    COUNTY_COOLDOWN_MS,
  ]);

  const selectedParcelList = useMemo(
    () => selectedTaxParcelIds.map((id) => selectedTaxParcels[id]).filter(Boolean),
    [selectedTaxParcelIds, selectedTaxParcels]
  );

  const totalSelectedAcres = useMemo(() => {
    return selectedParcelList.reduce((sum, feature) => {
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const acres = getParcelAcresFromProps(props);
      return sum + (acres ?? 0);
    }, 0);
  }, [selectedParcelList]);

  // ─────────────────────────────────────────────────────────────────────────
  // Site-Plan Overlay (Phase 1: snap + pin) — LSCMD-CW-OVERLAY-P1-0613-GV
  // ─────────────────────────────────────────────────────────────────────────

  // Editor is active whenever an image URL is held. editingOverlayId === null
  // means a freshly uploaded (unsaved) overlay; a number means re-editing a
  // saved row.
  const [overlayImageUrl, setOverlayImageUrl] = useState<string | null>(null);
  const [editingOverlayId, setEditingOverlayId] = useState<number | null>(null);
  // Editable overlay name, bound to the editor's name field. Defaults to 'Overlay'
  // for a fresh drape; seeded from the saved title when editing an existing one.
  const [overlayTitle, setOverlayTitle] = useState<string>('Overlay');
  // Source-document provenance for an extracted-plan overlay (Phase 1). Null
  // for the manual-upload path; carried into createOverlay on Save.
  const [overlayProvenance, setOverlayProvenance] = useState<{
    source_doc_id?: number | null;
    source_page?: number | null;
    source_crop_bbox?: { x0: number; y0: number; x1: number; y1: number } | null;
  } | null>(null);

  // Click-to-extract (D15) + control-point georeferencing (D16) state.
  const [extractCanvasSrc, setExtractCanvasSrc] = useState<string | null>(null); // data URL → canvas modal
  const [cpImageSrc, setCpImageSrc] = useState<string | null>(null);             // extracted PNG for the image-side picker
  const [cpImgDims, setCpImgDims] = useState<{ w: number; h: number } | null>(null); // extracted image pixel space (= crop bbox)
  const [cpMode, setCpMode] = useState(false);
  const [controlPoints, setControlPoints] = useState<OverlayControlPoint[]>([]);
  // "Add Site Plan" picker (#1): plans already extracted into the project's media.
  const [planPicker, setPlanPicker] = useState<{
    open: boolean;
    loading: boolean;
    items: Array<{
      media_id: number;
      thumbnail_uri?: string | null;
      storage_uri: string;
      source_page?: number | null;
      doc_id?: number | null;
      asset_name?: string | null;
    }>;
  }>({ open: false, loading: false, items: [] });
  const [pendingImgPt, setPendingImgPt] = useState<{ x: number; y: number } | null>(null);
  const [georefInfo, setGeorefInfo] = useState<{ kind: string; rmsMeters: number; recommendTps: boolean } | null>(null);
  // Source-doc provenance when the canvas was opened from a chat extract (D15/D16
  // chat mount). Null for the classic file-upload path. Merged into the overlay
  // provenance on region export so Save records which doc/page the trace came from.
  const [extractDocProvenance, setExtractDocProvenance] = useState<{ source_doc_id: number | null; source_page: number | null } | null>(null);

  // Reset all click-to-extract / control-point state (on save, cancel, or new region).
  const resetExtractState = useCallback(() => {
    setControlPoints([]);
    setGeorefInfo(null);
    setPendingImgPt(null);
    setCpMode(false);
    setCpImgDims(null);
    setExtractDocProvenance(null);
    setCpImageSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);
  const [overlayInitial, setOverlayInitial] = useState<
    { corners?: [[number, number], [number, number], [number, number], [number, number]]; opacity?: number; rotationDeg?: number } | undefined
  >(undefined);
  const [overlaySaving, setOverlaySaving] = useState(false);
  const [overlaySaveError, setOverlaySaveError] = useState<string | null>(null);
  const [uploadingPlan, setUploadingPlan] = useState(false);
  const planFileInputRef = useRef<HTMLInputElement>(null);

  // Reuse whatever vector parcel FeatureCollection is already loaded as snap
  // targets: taxParcels (county vector, incl. Maricopa for Peoria Meadows),
  // then LA county parcels, then plan parcels. Null → free drag, no snapping.
  const overlayParcels = useMemo(
    () => taxParcels ?? parcelCollection ?? planParcels ?? null,
    [taxParcels, parcelCollection, planParcels]
  );

  // Drape sits beneath the lowest existing parcel layer so outlines stay on top.
  const overlayBeneathLayerId = useMemo(() => {
    const m = mapCanvasRef.current?.getMap();
    if (!m) return undefined;
    const candidates = [
      MARICOPA_PARCEL_OUTLINE_LAYER_ID,
      'tax-parcels-fill',
      'la-parcels-all-fill',
      'plan-parcels-fill',
    ];
    return candidates.find((id) => m.getLayer(id)) ?? undefined;
    // Intentional deps: m.getLayer() reads live map state the linter can't see,
    // so recompute when parcel data / basemap swaps change which layers exist.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxParcels, parcelCollection, planParcels, parcelOutlineEnabled, overlayImageUrl, basemap]);

  const overlayEditor = useSitePlanOverlay({
    map: mapInstance,
    // overlayImageUrl is the durable (R2) source_uri saved on the overlay; wrap it
    // through the same-origin proxy for rendering since R2's public bucket isn't
    // CORS-enabled and MapLibre's image source fetches the bytes. The raw,
    // unwrapped overlayImageUrl is what gets persisted as source_uri on Save.
    imageUrl: overlayImageUrl ? toRenderableOverlayUrl(overlayImageUrl) : null,
    parcels: overlayParcels,
    beneathLayerId: overlayBeneathLayerId,
    initial: overlayInitial,
  });

  const {
    overlays: savedOverlays,
    fetchOverlays,
    createOverlay,
    updateOverlay,
    deleteOverlay,
  } = useSitePlanOverlays(projectId);

  // Load saved overlays on open.
  useEffect(() => {
    fetchOverlays();
  }, [fetchOverlays]);

  const handleAddSitePlanClick = useCallback(async () => {
    // Default to plans already in the project: check for extracted media first;
    // fall back to the local-file picker when there's none (or on any error).
    if (!projectId) { planFileInputRef.current?.click(); return; }
    setPlanPicker((p) => ({ ...p, loading: true }));
    try {
      const base = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
      const res = await fetch(
        `${base}/api/dms/media/available/?project_id=${projectId}`,
        { headers: getAuthHeaders() },
      );
      const data = res.ok ? await res.json() : { items: [] };
      const items = Array.isArray(data?.items) ? data.items : [];
      if (items.length) {
        setPlanPicker({ open: true, loading: false, items });
      } else {
        setPlanPicker({ open: false, loading: false, items: [] });
        planFileInputRef.current?.click();
      }
    } catch {
      setPlanPicker({ open: false, loading: false, items: [] });
      planFileInputRef.current?.click();
    }
  }, [projectId, getAuthHeaders]);

  const handlePlanFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = ''; // allow re-selecting the same file later
      if (!file) return;
      if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
        showToast('Overlay image must be a PNG or JPG');
        return;
      }
      // Open the click-to-extract canvas with a CORS-clean data URL (no canvas taint).
      // Classic upload carries no source-doc provenance.
      setExtractDocProvenance(null);
      const reader = new FileReader();
      reader.onload = () =>
        setExtractCanvasSrc(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => showToast('Could not read the image file');
      reader.readAsDataURL(file);
    },
    [showToast]
  );

  // A traced region was exported from the canvas → re-upload the transparent PNG
  // via the existing UploadThing flow and drape it; keep the crop for control points.
  const handleExportRegion = useCallback(
    async (region: ExtractedRegion) => {
      setUploadingPlan(true);
      setOverlaySaveError(null);
      try {
        const file = new File([region.blob], 'plan_region.png', { type: 'image/png' });
        // Durable R2 store (NOT UploadThing) so the saved drape never gets orphan-swept.
        const url = await uploadOverlayImageDurable(projectId, file, getAuthHeaders());
        // Capture doc provenance (chat mount) before resetExtractState clears it.
        const docProv = extractDocProvenance;
        resetExtractState();
        setCpImageSrc(URL.createObjectURL(region.blob));
        setCpImgDims({ w: region.bbox.x1 - region.bbox.x0, h: region.bbox.y1 - region.bbox.y0 });
        setOverlayProvenance({
          source_doc_id: docProv?.source_doc_id ?? null,
          source_page: docProv?.source_page ?? null,
          source_crop_bbox: region.bbox,
        });
        setEditingOverlayId(null);
        setOverlayInitial(undefined);
        setOverlayImageUrl(url);
        setExtractCanvasSrc(null);
        showToast('Region extracted — drag corners to fit, or place control points');
      } catch (err) {
        showToast(`Extract failed: ${err instanceof Error ? err.message : 'unknown error'}`);
      } finally {
        setUploadingPlan(false);
      }
    },
    [projectId, getAuthHeaders, showToast, resetExtractState, extractDocProvenance]
  );

  // Drape a plan image produced by the Landscaper extract_plan_image tool
  // (action "place_plan_overlay"). The PNG lives in Django default_storage; we
  // re-upload it through the SAME UploadThing flow the manual path uses, then
  // enter the overlay editor with provenance attached so Save persists which
  // doc/page/region it came from. Anchor/fit reuses the existing editor.
  const applyExtractedPlanOverlay = useCallback(
    async (payload: {
      source_uri: string;
      source_doc_id?: number | null;
      source_page?: number | null;
      source_crop_bbox?: { x0: number; y0: number; x1: number; y1: number } | null;
    }) => {
      if (!payload?.source_uri) return;
      setUploadingPlan(true);
      setOverlaySaveError(null);
      try {
        const resp = await fetch(payload.source_uri);
        if (!resp.ok) throw new Error(`Could not load extracted image (${resp.status})`);
        const blob = await resp.blob();
        const file = new File(
          [blob],
          `plan_extract_${payload.source_doc_id ?? 'doc'}_p${payload.source_page ?? 1}.png`,
          { type: 'image/png' }
        );
        // Durable R2 store (NOT UploadThing) so the saved drape never gets orphan-swept.
        const url = await uploadOverlayImageDurable(projectId, file, getAuthHeaders());
        setEditingOverlayId(null);
        setOverlayInitial(undefined);
        setOverlayProvenance({
          source_doc_id: payload.source_doc_id ?? null,
          source_page: payload.source_page ?? null,
          source_crop_bbox: payload.source_crop_bbox ?? null,
        });
        setOverlayImageUrl(url);
        showToast('Plan image added — drag the corners to fit, then Save');
      } catch (err) {
        showToast(`Plan extract failed: ${err instanceof Error ? err.message : 'unknown error'}`);
      } finally {
        setUploadingPlan(false);
      }
    },
    [projectId, getAuthHeaders, showToast]
  );

  // Open the trace canvas for a plan rendered server-side (chat-first mount):
  // fetch the page → CORS-clean data URL → the SAME canvas the upload path uses.
  const openExtractCanvasFromUrl = useCallback(
    async (url: string, sourceDocId: number | null, sourcePage: number | null) => {
      try {
        // Extracted media lives on a public R2 bucket (*.r2.dev). A direct cross-origin fetch of it
        // is CORS-blocked ("failed to fetch"); route those through the same-origin proxy so the
        // canvas can read the bytes. Same-origin / Django URLs fetch directly.
        const isR2 = /^https:\/\/[^/]*\.r2\.dev\//i.test(url);
        const fetchUrl = isR2 ? `/api/media/proxy?url=${encodeURIComponent(url)}` : url;
        const resp = await fetch(fetchUrl);
        if (!resp.ok) throw new Error(`Could not load plan page (${resp.status})`);
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => reject(new Error('read failed'));
          reader.readAsDataURL(blob);
        });
        if (!dataUrl) throw new Error('Empty image');
        setExtractDocProvenance({ source_doc_id: sourceDocId, source_page: sourcePage });
        setExtractCanvasSrc(dataUrl);
      } catch (err) {
        showToast(`Could not open plan canvas: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    },
    [showToast]
  );

  // Cross-tree seam (same rationale as the command bus): CenterChatPanel dispatches
  // a live CustomEvent AND latches the payload (planExtractBridge) so this works
  // whether MapTab was already mounted (event) or mounts after navigation (latch).
  // 'place_plan_overlay' → drape a server crop; 'extract_plan_canvas' → open the
  // trace canvas. Both reuse the existing handlers — no duplicated logic.
  useEffect(() => {
    const onOverlay = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      takePendingPlanExtract(); // consumed live → clear the latch
      if (detail) applyExtractedPlanOverlay(detail);
    };
    const onCanvas = () => {
      const p = takePendingPlanExtract();
      if (p?.kind === 'canvas') {
        openExtractCanvasFromUrl(p.payload.url, p.payload.sourceDocId ?? null, p.payload.sourcePage ?? null);
      }
    };
    window.addEventListener('landscaper:place_plan_overlay', onOverlay);
    window.addEventListener('landscaper:extract_plan_canvas', onCanvas);
    // Drain anything latched before this map mounted (chat → map navigation).
    const pending = takePendingPlanExtract();
    if (pending?.kind === 'overlay') {
      applyExtractedPlanOverlay(pending.payload);
    } else if (pending?.kind === 'canvas') {
      openExtractCanvasFromUrl(pending.payload.url, pending.payload.sourceDocId ?? null, pending.payload.sourcePage ?? null);
    }
    return () => {
      window.removeEventListener('landscaper:place_plan_overlay', onOverlay);
      window.removeEventListener('landscaper:extract_plan_canvas', onCanvas);
    };
  }, [applyExtractedPlanOverlay, openExtractCanvasFromUrl]);

  // Control-point image-side pick: click the extracted plan thumbnail → image pixel.
  const handleCpImageClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      if (!cpImgDims) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * cpImgDims.w;
      const y = ((e.clientY - rect.top) / rect.height) * cpImgDims.h;
      setPendingImgPt({ x, y });
      showToast('Now click the matching point on the parcel map');
    },
    [cpImgDims, showToast]
  );

  // Control-point map-side pick: a map click (after an image pick) snaps to a
  // nearby parcel vertex, forms a control point, and re-georeferences live (D16).
  useEffect(() => {
    if (!mapInstance || !cpMode) return;
    const map = mapInstance;
    const onMapClick = (e: MapMouseEvent) => {
      if (!pendingImgPt || !cpImgDims) return;
      const clicked: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const layerIds = [
        'tax-parcels-fill', 'la-parcels-all-fill', 'plan-parcels-fill',
        MARICOPA_PARCEL_OUTLINE_LAYER_ID,
      ].filter((id) => map.getLayer(id));
      let vertices: Array<[number, number]> = [];
      if (layerIds.length) {
        const b = 14;
        const feats = map.queryRenderedFeatures(
          [[e.point.x - b, e.point.y - b], [e.point.x + b, e.point.y + b]],
          { layers: layerIds },
        );
        vertices = feats.flatMap((f) => flattenGeoVertices(f.geometry));
      }
      const { point, snapped } = snapToVertex(clicked, vertices, 8);
      const next: OverlayControlPoint[] = [
        ...controlPoints,
        { img: pendingImgPt, map: point, snapped },
      ];
      setControlPoints(next);
      setPendingImgPt(null);
      if (next.length >= 2) {
        try {
          const result = georeference(cpImgDims.w, cpImgDims.h, next as ControlPoint[]);
          overlayEditor.setCorners(result.corners);
          setGeorefInfo({
            kind: result.kind,
            rmsMeters: result.rmsMeters,
            recommendTps: recommendTpsWarp(result, next.length),
          });
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Could not georeference — move points apart');
        }
      } else {
        showToast(`Control point ${next.length} placed — add at least one more`);
      }
    };
    map.on('click', onMapClick);
    return () => { map.off('click', onMapClick); };
  }, [mapInstance, cpMode, pendingImgPt, cpImgDims, controlPoints, overlayEditor, showToast]);

  const handleOverlaySave = useCallback(async () => {
    if (!overlayImageUrl) return;
    setOverlaySaving(true);
    setOverlaySaveError(null);
    try {
      const state = overlayEditor.getState();
      const title = overlayTitle.trim() || 'Overlay';
      if (editingOverlayId != null) {
        await updateOverlay(editingOverlayId, {
          title,
          corners: state.corners,
          opacity: state.opacity,
          rotation_deg: state.rotationDeg,
        });
        showToast('Overlay updated');
      } else {
        await createOverlay({
          title,
          source_uri: overlayImageUrl,
          corners: state.corners,
          opacity: state.opacity,
          rotation_deg: state.rotationDeg,
          // Provenance only present for extracted plans; spread-empty otherwise
          // so manual overlays POST exactly as before.
          ...(overlayProvenance ?? {}),
          // Control-point inputs (D16) — omitted for manual 4-corner drapes.
          control_points: controlPoints.length ? controlPoints : undefined,
        });
        showToast('Overlay saved');
      }
      // Exit edit mode → the saved overlay re-drapes read-only.
      setOverlayImageUrl(null);
      setEditingOverlayId(null);
      setOverlayInitial(undefined);
      setOverlayProvenance(null);
      setOverlayTitle('Overlay');
      resetExtractState();
    } catch (err) {
      setOverlaySaveError(err instanceof Error ? err.message : 'Failed to save overlay');
    } finally {
      setOverlaySaving(false);
    }
  }, [overlayImageUrl, overlayTitle, editingOverlayId, overlayEditor, updateOverlay, createOverlay, showToast, overlayProvenance, controlPoints, resetExtractState]);

  const handleOverlayCancel = useCallback(() => {
    setOverlayImageUrl(null);
    setEditingOverlayId(null);
    setOverlayProvenance(null);
    setOverlayTitle('Overlay');
    resetExtractState();
    setOverlayInitial(undefined);
    setOverlaySaveError(null);
  }, [resetExtractState]);

  const handleEditOverlay = useCallback(
    (overlay: { overlay_id: number; title?: string | null; source_uri: string; corners: [[number, number], [number, number], [number, number], [number, number]]; opacity: number; rotation_deg: number }) => {
      setOverlaySaveError(null);
      setEditingOverlayId(overlay.overlay_id);
      setOverlayTitle(overlay.title?.trim() || 'Overlay');
      setOverlayInitial({
        corners: overlay.corners,
        opacity: overlay.opacity,
        rotationDeg: overlay.rotation_deg,
      });
      setOverlayImageUrl(overlay.source_uri);
    },
    []
  );

  const handleDeleteOverlay = useCallback(
    async (overlayId: number) => {
      try {
        if (editingOverlayId === overlayId) handleOverlayCancel();
        await deleteOverlay(overlayId);
        showToast('Overlay removed');
      } catch {
        showToast('Failed to remove overlay');
      }
    },
    [deleteOverlay, editingOverlayId, handleOverlayCancel, showToast]
  );

  // Site plans surfaced in the legend (A) — title + per-plan visibility + edit state.
  const sitePlansForLegend = useMemo<SitePlanLegendItem[]>(
    () =>
      savedOverlays.map((ov) => ({
        overlay_id: ov.overlay_id,
        title: ov.title || `Overlay ${ov.overlay_id}`,
        visible: !hiddenOverlayIds.has(ov.overlay_id),
        editing: editingOverlayId === ov.overlay_id,
        unavailable: unavailableOverlayIds.has(ov.overlay_id),
      })),
    [savedOverlays, hiddenOverlayIds, editingOverlayId, unavailableOverlayIds]
  );

  const handleToggleSitePlanVisibility = useCallback((overlayId: number) => {
    setHiddenOverlayIds((prev) => {
      const next = new Set(prev);
      if (next.has(overlayId)) next.delete(overlayId);
      else next.add(overlayId);
      return next;
    });
  }, []);

  const handleEditSitePlan = useCallback(
    (overlayId: number) => {
      const ov = savedOverlays.find((o) => o.overlay_id === overlayId);
      if (ov) handleEditOverlay(ov);
    },
    [savedOverlays, handleEditOverlay]
  );

  // Rename a saved overlay in place from the legend (editable name after creation).
  const handleRenameSitePlan = useCallback(
    async (overlayId: number, title: string) => {
      const next = title.trim();
      if (!next) return;
      const ov = savedOverlays.find((o) => o.overlay_id === overlayId);
      if (ov && (ov.title ?? '') === next) return; // no-op if unchanged
      try {
        await updateOverlay(overlayId, { title: next });
        showToast('Overlay renamed');
      } catch {
        showToast('Failed to rename overlay');
      }
    },
    [savedOverlays, updateOverlay, showToast]
  );

  // Drawn shapes surfaced in the legend's "Annotations" section — one row per
  // saved feature, with a user-editable name. Falls back to a type-based label
  // when the feature has no name yet.
  const annotationsForLegend = useMemo<AnnotationLegendItem[]>(
    () =>
      savedFeatures.map((f, i) => ({
        id: f.id,
        label: f.label?.trim() || `${f.feature_type ?? 'Annotation'} ${i + 1}`,
        feature_type: f.feature_type ?? undefined,
      })),
    [savedFeatures]
  );

  // Rename a drawn shape in place from the legend (persists feature.label).
  const handleRenameAnnotation = useCallback(
    async (featureId: string, label: string) => {
      const next = label.trim();
      if (!next) return;
      const f = savedFeatures.find((x) => x.id === featureId);
      if (f && (f.label ?? '') === next) return; // no-op if unchanged
      try {
        await updateFeature(featureId, { label: next });
        showToast('Annotation renamed');
      } catch {
        showToast('Failed to rename annotation');
      }
    },
    [savedFeatures, updateFeature, showToast]
  );

  // Open a drawn shape for editing (reshape / color / delete) from the legend.
  // Resolve against mapFeatures (typed MapFeature[]) so the edit modal gets the
  // shape the rest of the edit flow expects.
  const handleEditAnnotation = useCallback(
    (featureId: string) => {
      const f = mapFeatures.find((x) => x.id === featureId);
      if (f) {
        setSelectedFeatureId(f.id);
        setEditingFeature(f);
      }
    },
    [mapFeatures]
  );

  // Remove a drawn shape from the legend.
  const handleRemoveAnnotation = useCallback(
    async (featureId: string) => {
      try {
        await deleteFeature(featureId);
        showToast('Annotation removed');
      } catch {
        showToast('Failed to remove annotation');
      }
    },
    [deleteFeature, showToast]
  );

  // Probe each saved overlay's image so a 404'd drape (e.g. the legacy
  // orphan-swept UploadThing URLs) surfaces as an explicit "unavailable" state (C)
  // instead of a silent blank. An <img> load works cross-origin without CORS, so
  // it detects availability for both R2 (via proxy) and legacy UploadThing URLs.
  // Keyed by the URL last probed so a re-draped overlay (new source_uri) re-checks.
  const probedOverlaySourcesRef = useRef<Map<number, string>>(new Map());
  useEffect(() => {
    for (const ov of savedOverlays) {
      if (probedOverlaySourcesRef.current.get(ov.overlay_id) === ov.source_uri) continue;
      probedOverlaySourcesRef.current.set(ov.overlay_id, ov.source_uri);
      const id = ov.overlay_id;
      const img = new Image();
      img.onload = () =>
        setUnavailableOverlayIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      img.onerror = () =>
        setUnavailableOverlayIds((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      img.src = toRenderableOverlayUrl(ov.source_uri);
    }
    // Drop probe cache + unavailable flags for overlays no longer present.
    const liveIds = new Set(savedOverlays.map((o) => o.overlay_id));
    for (const cachedId of probedOverlaySourcesRef.current.keys()) {
      if (!liveIds.has(cachedId)) probedOverlaySourcesRef.current.delete(cachedId);
    }
    setUnavailableOverlayIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const flaggedId of prev) {
        if (!liveIds.has(flaggedId)) {
          next.delete(flaggedId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [savedOverlays]);

  // Read-only drapes for every saved overlay NOT currently being edited.
  const savedDrapeHandlesRef = useRef<Map<number, OverlayHandle>>(new Map());
  useEffect(() => {
    const m = mapCanvasRef.current?.getMap();
    if (!m || !mapIsLoaded) return;
    const handles = savedDrapeHandlesRef.current;
    const wanted = new Set<number>();

    for (const ov of savedOverlays) {
      if (editingOverlayId === ov.overlay_id) continue; // editor owns it (with handles)
      if (hiddenOverlayIds.has(ov.overlay_id)) continue; // hidden via legend toggle (A)
      if (unavailableOverlayIds.has(ov.overlay_id)) continue; // image 404 → legend shows re-drape (C)
      wanted.add(ov.overlay_id);
      const existing = handles.get(ov.overlay_id);
      if (existing) {
        existing.setCorners(ov.corners);
        existing.setOpacity(ov.opacity);
      } else {
        handles.set(
          ov.overlay_id,
          addImageOverlay(m, {
            id: `saved-${ov.overlay_id}`,
            // R2 source_uris aren't CORS-enabled for MapLibre's image-source fetch;
            // route them through the same-origin proxy. Legacy/UploadThing URLs pass through.
            url: toRenderableOverlayUrl(ov.source_uri),
            corners: ov.corners,
            opacity: ov.opacity,
            // No beforeId: a SAVED drape sits on TOP of the stack (parcels,
            // basemap) so it reads as the finished site plan. During editing the
            // active overlay still drops beneath the parcel layer for alignment.
          })
        );
      }
    }

    for (const [id, handle] of handles) {
      if (!wanted.has(id)) {
        handle.remove();
        handles.delete(id);
      }
    }
  }, [savedOverlays, editingOverlayId, mapIsLoaded, overlayBeneathLayerId, hiddenOverlayIds, unavailableOverlayIds]);

  // Tear down all read-only drapes on unmount.
  useEffect(() => {
    const handles = savedDrapeHandlesRef.current;
    return () => {
      handles.forEach((handle) => handle.remove());
      handles.clear();
    };
  }, []);

  // Keep saved drapes pinned to the TOP of the layer stack (Gregg's call: draped
  // plans always on top). Drawn-shape / feature layers are (re)added by MapCanvas
  // AFTER the overlay, so without this they cover the drape. Re-runs whenever the
  // overlay set, per-overlay visibility, or the feature set changes. Parent
  // effects run after MapCanvas's child effects, so the feature layers already
  // exist when this moves the overlays above them. Hidden overlays have no handle
  // (removed by the drape effect), so they stay hidden. Raster layers don't
  // capture clicks, so shapes underneath stay selectable / reshapable.
  useEffect(() => {
    const m = mapCanvasRef.current?.getMap();
    if (!m || !mapIsLoaded) return;
    // Lift saved drapes to the very top of the stack so the overlay always renders
    // ON TOP — above parcels/basemap AND above drawn shapes (Gregg's call). The
    // raster drape is non-interactive: the layer-scoped click handlers on the
    // drawn-shape layers (user-features-*) still fire underneath it
    // (queryRenderedFeatures ignores occlusion), so shapes stay selectable and
    // editable even where the drape covers them.
    const lift = () => {
      savedDrapeHandlesRef.current.forEach((handle) => {
        try {
          if (m.getLayer(handle.layerId)) m.moveLayer(handle.layerId);
        } catch { /* ignore */ }
      });
    };
    lift();
    // Re-assert on the next frame so the drape wins even when MapCanvas re-adds the
    // shape/draw layers AFTER this effect — e.g. right after a vertex reshape, where
    // the drape was otherwise left sitting behind the re-rendered shape.
    const raf = requestAnimationFrame(lift);
    return () => cancelAnimationFrame(raf);
    // `layers` is included so a legend drag-reorder (which restacks data layers
    // via MapCanvas) re-asserts the drape-on-top invariant right after.
  }, [savedOverlays, hiddenOverlayIds, mapFeatures, editingOverlayId, mapIsLoaded, reshapingFeatureId, layers]);

  // ─────────────────────────────────────────────────────────────────────────
  // Loading indicator
  // ─────────────────────────────────────────────────────────────────────────

  const isAnyLoading = planLoading || boundaryLoading || taxLoading;
  const loadingErrors = [planError, boundaryError, taxError].filter(Boolean);

  // Layer state wrapper for MapCanvas
  const layerState = useMemo(() => ({ groups: layers }), [layers]);
  const panelLayerState = useMemo(() => {
    const filteredGroups = layers
      .map((group) => {
        let filteredLayers = group.layers.map((layer) => ({ ...layer, disabled: false }));
        if (!isDevelopmentProject) {
          filteredLayers = filteredLayers.filter((layer) => layer.id !== 'plan-parcels');
        }
        filteredLayers = filteredLayers.filter((layer) => {
          if (layer.id === 'tax-parcels') return true;
          return layer.count === undefined || layer.count > 0;
        });
        return {
          ...group,
          layers: filteredLayers,
        };
      })
      .filter((group) => group.layers.length > 0);
    return { groups: filteredGroups };
  }, [layers, isDevelopmentProject, resolvedCounty]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="map-tab">
      {/* ─── Sidebar: Layers + Draw Tools ─── */}
      <div className="map-tab-sidebar">
        <LayerPanel
          layers={panelLayerState}
          onToggleLayer={handleToggleLayer}
          onToggleGroup={handleToggleGroup}
          onZoomToLayer={handleZoomToLayer}
          sitePlans={sitePlansForLegend}
          onToggleSitePlan={handleToggleSitePlanVisibility}
          onEditSitePlan={handleEditSitePlan}
          onRemoveSitePlan={handleDeleteOverlay}
          onRenameSitePlan={handleRenameSitePlan}
          annotations={annotationsForLegend}
          onRenameAnnotation={handleRenameAnnotation}
          onEditAnnotation={handleEditAnnotation}
          onRemoveAnnotation={handleRemoveAnnotation}
          onReorderLayer={handleReorderLayer}
        />
        {isPhoenixMSA && (
        <div className="map-tab-parcel-panel">
          <div className="map-tab-panel-header">
            <div>
              <div className="map-tab-panel-title">County Parcels</div>
              <div className="map-tab-panel-subtitle">
                {resolvedCountyLabel}
              </div>
            </div>
            {!resolvedCounty && (
              <button
                type="button"
                className="map-tab-panel-action"
                onClick={() => setIsCountyPromptOpen(true)}
              >
                Select
              </button>
            )}
          </div>
          <div className="map-tab-panel-body">
            {!resolvedCounty && (
              <div className="map-tab-panel-message">
                Select Maricopa or Pinal County to enable parcel overlays.
              </div>
            )}
            {resolvedCounty && (
              <>
                {!taxParcelsLayerVisible && (
                  <div className="map-tab-panel-message">
                    Enable the Tax Parcels layer to view parcels and select boundaries.
                  </div>
                )}
                {taxLoading && (
                  <div className="map-tab-panel-message">Loading parcels…</div>
                )}
                {taxError && (
                  <div className="map-tab-panel-error">{taxError}</div>
                )}
                <div className="map-tab-parcel-summary">
                  <div className="map-tab-parcel-metric">
                    <span>Selected</span>
                    <strong>{selectedTaxParcelIds.length}</strong>
                  </div>
                  <div className="map-tab-parcel-metric">
                    <span>Total Acres</span>
                    <strong>{totalSelectedAcres.toFixed(2)}</strong>
                  </div>
                </div>
                {selectedParcelList.length === 0 ? (
                  <div className="map-tab-panel-message">
                    Click parcels on the map to add them to the boundary.
                  </div>
                ) : (
                  <div className="map-tab-parcel-list">
                    {selectedParcelList.map((feature, index) => {
                      const props = (feature.properties ?? {}) as Record<string, unknown>;
                      const parcelId = getParcelIdFromProps(props, feature.id);
                      const address = getParcelAddressFromProps(props);
                      const addressLines = splitAddressLines(address);
                      const acres = getParcelAcresFromProps(props);
                      return (
                        <div
                          key={parcelId || feature.id?.toString() || `parcel-${index}`}
                          className="map-tab-parcel-item"
                        >
                          <div className="map-tab-parcel-meta">
                            <div className="map-tab-parcel-id">{parcelId || 'Parcel'}</div>
                            {addressLines ? (
                              <div className="map-tab-parcel-address">
                                <div>{addressLines.line1}</div>
                                {addressLines.line2 && <div>{addressLines.line2}</div>}
                              </div>
                            ) : address ? (
                              <div className="map-tab-parcel-address">{address}</div>
                            ) : null}
                          </div>
                          <div className="map-tab-parcel-actions">
                            <div className="map-tab-parcel-acres">
                              {acres != null ? `${acres.toFixed(2)} ac` : '—'}
                            </div>
                            {parcelId && (
                              <button
                                type="button"
                                className="map-tab-parcel-remove"
                                onClick={() => handleRemoveSelectedParcel(parcelId)}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {parcelSelectionError && (
                  <div className="map-tab-panel-error">{parcelSelectionError}</div>
                )}
                {attachMode && (
                  <div className="map-tab-panel-message">
                    {attachDrawActive
                      ? 'Draw a polygon on the map to set the boundary.'
                      : `Click a parcel, or drag the subject pin onto one, to attach it to ${project.project_name || 'the subject'}. Or draw the boundary by hand.`}
                  </div>
                )}
                <div className="map-tab-panel-actions">
                  <CButton
                    color="primary"
                    size="sm"
                    disabled={selectedTaxParcelIds.length === 0 || parcelSelectionSaving}
                    onClick={handleConfirmBoundary}
                  >
                    {parcelSelectionSaving ? 'Saving...' : 'Confirm Boundary'}
                  </CButton>
                  <CButton
                    color="primary"
                    variant={attachMode ? undefined : 'outline'}
                    size="sm"
                    onClick={() => {
                      setAttachMode((v) => {
                        const next = !v;
                        if (!next) {
                          // Leaving attach mode: clear any in-progress draw.
                          setAttachDrawActive(false);
                          cancelDraw();
                          clearCurrentFeature();
                        }
                        return next;
                      });
                      setAttachCandidate(null);
                    }}
                  >
                    {attachMode ? 'Cancel Attach' : 'Attach Parcel'}
                  </CButton>
                  {attachMode && (
                    <CButton
                      color="primary"
                      variant={attachDrawActive ? undefined : 'outline'}
                      size="sm"
                      disabled={attachDrawActive}
                      onClick={() => {
                        setAttachDrawActive(true);
                        startDrawPolygon();
                      }}
                    >
                      {attachDrawActive ? 'Drawing…' : 'Draw Boundary'}
                    </CButton>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        )}
        <div className="map-tab-tools">
          <div className="map-tab-tools-header">Draw / Measure</div>
          <DrawToolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
          />
        </div>

        {/* ─── Overlays ─── */}
        <div className="map-tab-tools">
          <div className="map-tab-tools-header">Overlays</div>
          <input
            ref={planFileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            style={{ display: 'none' }}
            onChange={handlePlanFileChange}
          />
          {!overlayImageUrl && (
            <CButton
              color="primary"
              variant="outline"
              size="sm"
              disabled={uploadingPlan}
              onClick={handleAddSitePlanClick}
            >
              {uploadingPlan ? 'Uploading…' : 'Add Overlay'}
            </CButton>
          )}
          {savedOverlays.length > 0 && (
            <div className="map-tab-parcel-list" style={{ marginTop: 8 }}>
              {savedOverlays.map((ov) => (
                <div key={ov.overlay_id} className="map-tab-parcel-item">
                  <div className="map-tab-parcel-meta">
                    <div className="map-tab-parcel-id">
                      {ov.title || `Overlay ${ov.overlay_id}`}
                    </div>
                  </div>
                  <div className="map-tab-parcel-actions">
                    <button
                      type="button"
                      className="map-tab-parcel-remove"
                      onClick={() => handleEditOverlay(ov)}
                      disabled={editingOverlayId === ov.overlay_id}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="map-tab-parcel-remove"
                      onClick={() => handleDeleteOverlay(ov.overlay_id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {overlayImageUrl && (
          <SitePlanOverlayControls
            title={overlayTitle}
            onTitleChange={setOverlayTitle}
            opacity={overlayEditor.opacity}
            rotationDeg={overlayEditor.rotationDeg}
            snapping={Boolean(overlayParcels?.features?.length)}
            lastSnapped={overlayEditor.lastSnapped}
            saving={overlaySaving}
            saveError={overlaySaveError}
            onOpacityChange={overlayEditor.setOpacity}
            onRotationChange={overlayEditor.setRotation}
            onSave={handleOverlaySave}
            onCancel={handleOverlayCancel}
          />
        )}

        {/* ─── Control-point georeferencing (D16) ─── */}
        {overlayImageUrl && cpImageSrc && (
          <div className="map-tab-tools" style={{ marginTop: 8 }}>
            <div className="map-tab-tools-header">Control Points</div>
            <CButton
              color={cpMode ? 'secondary' : 'primary'}
              variant="outline"
              size="sm"
              onClick={() => { setCpMode((v) => !v); setPendingImgPt(null); }}
            >
              {cpMode ? 'Done placing points' : 'Place control points'}
            </CButton>
            {cpMode && (
              <>
                <div style={{ fontSize: 11, margin: '6px 0', opacity: 0.8 }}>
                  {pendingImgPt
                    ? 'Now click the matching point on the parcel map (snaps to vertices).'
                    : 'Click a recognizable point on the plan image, then its match on the map.'}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cpImageSrc}
                  alt="Extracted plan"
                  onClick={handleCpImageClick}
                  style={{
                    width: '100%', cursor: 'crosshair', borderRadius: 4,
                    border: '1px solid var(--cui-border-color)',
                  }}
                />
              </>
            )}
            <div style={{ fontSize: 11, marginTop: 6 }}>
              {controlPoints.length} control point{controlPoints.length === 1 ? '' : 's'}
              {georefInfo && <> · {georefInfo.kind} · RMS {georefInfo.rmsMeters.toFixed(1)} m</>}
            </div>
            {georefInfo?.recommendTps && (
              <div style={{ fontSize: 11, color: 'var(--cui-warning)', marginTop: 4 }}>
                A warp (TPS) would fit tighter — later slice.
              </div>
            )}
            {controlPoints.length > 0 && (
              <button
                type="button"
                className="map-tab-parcel-remove"
                style={{ marginTop: 6 }}
                onClick={() => { setControlPoints([]); setGeorefInfo(null); setPendingImgPt(null); }}
              >
                Clear points
              </button>
            )}
          </div>
        )}

        {/* ─── "Use a plan already in the project" picker (#1) ─── */}
        {planPicker.open && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setPlanPicker((p) => ({ ...p, open: false }))}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: 'min(720px,90vw)', maxHeight: '80vh', overflow: 'auto', background: 'var(--cui-body-bg, #1A1E28)', border: '1px solid var(--cui-border-color)', borderRadius: 8, padding: 16 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <strong>Use a plan already in this project</strong>
                <button className="btn btn-sm btn-ghost-secondary" onClick={() => setPlanPicker((p) => ({ ...p, open: false }))}>✕</button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--cui-medium-emphasis-color,#9aa7ba)', marginBottom: 12 }}>
                Pick an image already pulled from this project&apos;s documents, or search your computer.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                {planPicker.items.map((it) => (
                  <button
                    key={it.media_id}
                    type="button"
                    onClick={() => {
                      setPlanPicker((p) => ({ ...p, open: false }));
                      openExtractCanvasFromUrl(it.storage_uri, it.doc_id ?? null, it.source_page ?? null);
                    }}
                    style={{ padding: 0, border: '1px solid var(--cui-border-color)', borderRadius: 6, background: 'var(--cui-tertiary-bg, #222b3a)', cursor: 'pointer', overflow: 'hidden', textAlign: 'left' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.thumbnail_uri || it.storage_uri} alt={it.asset_name || 'plan media'} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                    <div style={{ fontSize: 11, padding: '4px 6px', color: 'var(--cui-body-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {it.asset_name || `Page ${it.source_page ?? '?'}`}
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => { setPlanPicker((p) => ({ ...p, open: false })); planFileInputRef.current?.click(); }}
                >
                  Search local files…
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Click-to-extract canvas modal (D15) ─── */}
        {extractCanvasSrc && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.6)' }}>
            <div style={{ position: 'absolute', inset: '3%', borderRadius: 8, overflow: 'hidden', background: 'var(--cui-body-bg, #1A1E28)' }}>
              <PlanExtractCanvas
                imageSrc={extractCanvasSrc}
                onExportRegion={handleExportRegion}
                onClose={() => setExtractCanvasSrc(null)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Map Content Area ─── */}
      <div className="map-tab-content">
        <MapCanvas
          ref={mapCanvasRef}
          center={resolvedCenter ?? projectCenter}
          zoom={DEFAULT_MAP_ZOOM}
          basemap={basemap}
          layers={layerState}
          features={mapFeatures}
          activeTool={activeTool}
          selectedFeatureId={selectedFeatureId}
          planParcels={planParcels}
          projectBoundary={projectBoundary}
          taxParcels={taxParcels}
          selectedTaxParcelIds={selectedTaxParcelIds}
          parcelOutlineEnabled={parcelOutlineEnabled}
          saleComps={saleComps}
          rentComps={rentComps}
          recentSales={recentSales}
          competitiveProjects={competitiveProjects}
          parcelCollection={parcelCollection}
          parcelSubjectApn={subjectApn || null}
          parcelCompApns={compApns}
          selectedRingRadius={selectedRingRadius}
          onMapClick={handleMapClick}
          onRingClick={handleRingClick}
          onFeatureClick={handleFeatureClick}
          onTaxParcelToggle={handleTaxParcelToggle}
          onViewStateChange={handleViewStateChange}
          attachMode={attachMode}
          attachDrawActive={attachDrawActive}
          onParcelAttach={handleParcelAttach}
          onSubjectDragEnd={handleSubjectDragEnd}
          onCompetitorClick={handleCompetitorClick}
          hillshadeEnabled={hillshadeEnabled}
          terrain3dEnabled={terrain3dEnabled}
        />

        {/* FB-323: in-map competitor detail drawer */}
        <CompetitorDetailPanel
          competitor={selectedCompetitor}
          onClose={() => setSelectedCompetitor(null)}
        />

        {/* ─── Parcel Attach Confirm (P1 click · P2 drag · P3 draw) ─── */}
        <CModal visible={attachCandidate !== null} onClose={handleAttachCancel} alignment="center">
          <CModalHeader>
            <CModalTitle>
              {attachCandidate?.kind === 'drawn' ? 'Set boundary for ' : 'Attach parcel to '}
              {project.project_name || 'subject'}?
            </CModalTitle>
          </CModalHeader>
          <CModalBody>
            {attachCandidate && (() => {
              const effPoint: [number, number] =
                attachCandidate.droppedPoint && !attachSnapToCenter
                  ? attachCandidate.droppedPoint
                  : attachCandidate.centroid;
              return (
              <div className="d-flex flex-column gap-2" style={{ fontSize: 14 }}>
                <div className="d-flex justify-content-between">
                  <span style={{ color: 'var(--cui-secondary-color)' }}>Parcel (APN)</span>
                  <strong>{attachCandidate.apn || '— none'}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span style={{ color: 'var(--cui-secondary-color)' }}>Site boundary</span>
                  <strong>
                    {attachCandidate.acres != null
                      ? `captured (${attachCandidate.acres.toFixed(2)} ac)`
                      : 'captured'}
                  </strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span style={{ color: 'var(--cui-secondary-color)' }}>Subject location</span>
                  <strong>
                    {effPoint[1].toFixed(5)}, {effPoint[0].toFixed(5)}
                  </strong>
                </div>
                {attachCandidate.droppedPoint && (
                  <CFormCheck
                    id="attach-snap-to-center"
                    label="Snap subject to parcel center"
                    checked={attachSnapToCenter}
                    onChange={(e) => setAttachSnapToCenter(e.target.checked)}
                  />
                )}
                {attachError && <div style={{ color: 'var(--cui-danger)' }}>{attachError}</div>}
              </div>
              );
            })()}
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={handleAttachCancel} disabled={attachSaving}>
              Cancel
            </CButton>
            <CButton color="primary" onClick={handleAttachConfirm} disabled={attachSaving}>
              {attachSaving ? 'Attaching…' : 'Attach'}
            </CButton>
          </CModalFooter>
        </CModal>

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

          {/* Terrain controls — hillshade (default on) + opt-in 3D tilt. Both
              survive basemap switches and are fed by the free AWS DEM. */}
          <div className="map-tab-terrain-controls">
            <label className="map-tab-terrain-toggle" title="Elevation relief shading from a free global DEM">
              <input
                type="checkbox"
                checked={hillshadeEnabled}
                onChange={(e) => setHillshadeEnabled(e.target.checked)}
              />
              <span>Hillshade</span>
            </label>
            <label className="map-tab-terrain-toggle" title="Tilt the map into 3D terrain">
              <input
                type="checkbox"
                checked={terrain3dEnabled}
                onChange={(e) => setTerrain3dEnabled(e.target.checked)}
              />
              <span>3D</span>
            </label>
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

      {/* ─── County Parcel Modal ─── */}
      <CModal
        visible={isCountyPromptOpen}
        onClose={() => setIsCountyPromptOpen(false)}
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>Select County</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div style={{ color: 'var(--cui-secondary-color)' }}>
            {countyPromptMessage}
          </div>
        </CModalBody>
        <CModalFooter className="d-flex flex-wrap gap-2">
          {countyOptions.map((county) => (
            <CButton
              key={county}
              color="primary"
              variant={resolvedCounty === county ? undefined : 'outline'}
              onClick={() => handleSelectCounty(county)}
            >
              {formatCountyLabel(county)}
            </CButton>
          ))}
          <CButton color="secondary" variant="outline" onClick={() => setIsCountyPromptOpen(false)}>
            Cancel
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

      {/* ─── Feature Edit Modal (click a saved drawn shape → edit/delete) ─── */}
      {editingFeature && (
        <FeatureModal
          isOpen={Boolean(editingFeature)}
          featureType={editingFeature.feature_type}
          coordinates={
            ('coordinates' in editingFeature.geometry
              ? editingFeature.geometry.coordinates
              : null) as GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][] | null
          }
          measurements={{
            length_ft: editingFeature.length_ft ?? undefined,
            area_sqft: editingFeature.area_sqft ?? undefined,
            area_acres: editingFeature.area_acres ?? undefined,
            perimeter_ft: editingFeature.perimeter_ft ?? undefined,
          }}
          feature={editingFeature}
          onClose={handleFeatureEditClose}
          onSave={handleFeatureEditSave}
          onDelete={handleFeatureDelete}
          onReshape={handleReshapeFeature}
          isSaving={featureSaving}
          isDeleting={featureDeleting}
        />
      )}

      {/* ─── Reshape banner (vertex editing in progress) ─── */}
      {reshapingFeatureId && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 14px',
            borderRadius: 6,
            background: 'var(--cui-body-bg, #1f2430)',
            color: 'var(--cui-body-color, #e5e5e5)',
            border: '1px solid var(--cui-border-color)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            fontSize: 13,
          }}
        >
          <span>Reshaping — drag a vertex, click an edge midpoint to add one, or select a vertex and press Delete to remove it.</span>
          <button type="button" className="btn-save" onClick={handleFinishReshape}>
            Done
          </button>
        </div>
      )}

      {/* ─── Toast ─── */}
      {toast && (
        <div className="map-tab-toast">{toast}</div>
      )}
    </div>
  );
}

export default MapTab;
