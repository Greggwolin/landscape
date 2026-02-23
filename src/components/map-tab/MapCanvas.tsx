/**
 * MapCanvas Component
 *
 * MapLibre GL JS map with layer rendering, draw controls, and feature display.
 * Renders GIS data layers: plan parcels, project boundary, tax parcels.
 * Uses styleRevision pattern to survive basemap switches (setStyle destroys layers).
 */

'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import type { MapCanvasProps, BasemapStyle } from './types';
import { LAYER_COLORS } from './constants';
import { RING_COLORS } from '@/components/location-intelligence';
import { registerGoogleProtocol } from '@/lib/maps/registerGoogleProtocol';
import { getGoogleBasemapStyle } from '@/lib/maps/googleBasemaps';
import { registerRasterDim } from '@/lib/maps/rasterDim';
import type { GoogleBasemapType } from '@/lib/maps/googleBasemaps';
import { escapeHtml, splitAddressLines } from '@/lib/maps/addressFormat';

// Expose map instance to parent via ref
export interface MapCanvasRef {
  getMap: () => maplibregl.Map | null;
  isLoaded: () => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Map Style Generators — Google Map Tiles via maplibre-google-maps
// ─────────────────────────────────────────────────────────────────────────────

/** Map BasemapStyle values to GoogleBasemapType */
const BASEMAP_TO_GOOGLE: Record<BasemapStyle, GoogleBasemapType> = {
  satellite: 'satellite',
  hybrid: 'hybrid',
  streets: 'roadmap',
  roadmap: 'roadmap',
  terrain: 'terrain',
};

function getMapStyle(basemap: BasemapStyle): maplibregl.StyleSpecification {
  const googleType = BASEMAP_TO_GOOGLE[basemap] ?? 'roadmap';
  return getGoogleBasemapStyle(googleType);
}

// Helper: safely remove a layer + source
function safeRemoveLayer(m: maplibregl.Map, layerId: string) {
  if (m.getLayer(layerId)) m.removeLayer(layerId);
}
function safeRemoveSource(m: maplibregl.Map, sourceId: string) {
  if (m.getSource(sourceId)) m.removeSource(sourceId);
}

const PARCEL_MIN_ZOOM = 15;
const TAX_PARCEL_MIN_ZOOM = 15;
const ALL_PARCEL_SOURCE_ID = 'la-parcels-all';
const SUBJECT_PARCEL_SOURCE_ID = 'la-parcels-subject';
const COMPS_PARCEL_SOURCE_ID = 'la-parcels-comps';
const ALL_PARCEL_FILL_ID = 'la-parcels-all-fill';
const ALL_PARCEL_LINE_ID = 'la-parcels-all-line';
const SUBJECT_PARCEL_FILL_ID = 'la-parcels-subject-fill';
const SUBJECT_PARCEL_LINE_ID = 'la-parcels-subject-line';
const COMPS_PARCEL_FILL_ID = 'la-parcels-comps-fill';
const COMPS_PARCEL_LINE_ID = 'la-parcels-comps-line';

const normalizeParcelId = (value: string) => value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();

const readCssVar = (name: string) => {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

const buildParcelColors = () => {
  const primaryRgb = readCssVar('--cui-primary-rgb');
  const infoRgb = readCssVar('--cui-info-rgb');
  const primaryFallback = readCssVar('--cui-primary');
  const infoFallback = readCssVar('--cui-info');
  const borderFallback = readCssVar('--cui-border-color');
  const whiteFallback = readCssVar('--cui-white');
  const bodyRgb = readCssVar('--cui-body-color-rgb');
  const secondaryBg = readCssVar('--cui-secondary-bg');

  const subjectStroke = primaryRgb ? `rgb(${primaryRgb})` : primaryFallback;
  const compStroke = infoRgb ? `rgb(${infoRgb})` : infoFallback;
  const subjectFill = primaryRgb ? `rgba(${primaryRgb}, 0.18)` : primaryFallback;
  const compFill = infoRgb ? `rgba(${infoRgb}, 0.1)` : infoFallback;
  const neutralStroke = whiteFallback || borderFallback || compStroke;
  const neutralFill = bodyRgb ? `rgba(${bodyRgb}, 0.08)` : secondaryBg || neutralStroke;

  return {
    subjectStroke,
    compStroke,
    subjectFill,
    compFill,
    neutralStroke,
    neutralFill,
  };
};

const getWhiteStroke = () =>
  readCssVar('--cui-white') ||
  readCssVar('--cui-body-color') ||
  readCssVar('--cui-border-color');

const buildPopoverRows = (rows: Array<{ label: string; value: string }>): string => {
  return rows
    .filter((row) => row.value)
    .map(
      (row) =>
        `<div class="map-tab-popover-row"><span class="map-tab-popover-label">${escapeHtml(row.label)}</span><span class="map-tab-popover-value">${escapeHtml(row.value)}</span></div>`
    )
    .join('');
};

const buildPopoverHtml = (
  title: string,
  rows: Array<{ label: string; value: string }>
): string => {
  const safeTitle = escapeHtml(title);
  const body = buildPopoverRows(rows);

  return `
    <div class="map-tab-popover">
      <div class="map-tab-popover-header">${safeTitle}</div>
      <div class="map-tab-popover-body">
        ${body || '<div class="map-tab-popover-empty">No details available</div>'}
      </div>
    </div>
  `;
};

const buildFloorplanTable = (floorplans: Array<Record<string, unknown>>): string => {
  if (!floorplans.length) return '<div class="map-tab-popover-empty">No floorplans available</div>';

  const rows = floorplans
    .map((plan) => {
      const unitType = escapeHtml(plan.unit_type ?? '');
      const bedValue = plan.bedrooms != null ? Number(plan.bedrooms) : null;
      const bathValue = plan.bathrooms != null ? Number(plan.bathrooms) : null;
      const beds = Number.isFinite(bedValue) ? String(Math.round(bedValue as number)) : '';
      const baths = Number.isFinite(bathValue)
        ? Number.isInteger(bathValue as number)
          ? String(Math.round(bathValue as number))
          : String(bathValue)
        : '';
      const sqft = plan.avg_sqft != null ? escapeHtml(Number(plan.avg_sqft).toLocaleString()) : '';
      const rentValue = plan.asking_rent ?? plan.effective_rent ?? null;
      const rent = rentValue != null && Number.isFinite(Number(rentValue))
        ? `$${Number(rentValue).toLocaleString()}`
        : '';

      return `
        <tr>
          <td>${unitType}</td>
          <td>${beds}</td>
          <td>${baths}</td>
          <td>${sqft}</td>
          <td>${rent}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="map-tab-popover-table-wrap">
      <table class="map-tab-popover-table">
        <thead>
          <tr>
            <th>Unit Type</th>
            <th>Bed</th>
            <th>Bath</th>
            <th>SF</th>
            <th>Rent</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};

const getParcelIdFromProps = (
  props: Record<string, unknown>,
  featureId?: unknown
): string => {
  const candidate =
    props.parcel_id ??
    props.tax_parcel_id ??
    props.PARCELID ??
    props.APN ??
    featureId;
  if (candidate == null) return '';
  const value = String(candidate).trim();
  return value;
};

const resolveParcelProps = (props: Record<string, unknown>): Record<string, unknown> => {
  const assessor = props.assessor_attrs;
  if (assessor && typeof assessor === 'object' && !Array.isArray(assessor)) {
    return assessor as Record<string, unknown>;
  }
  return props;
};

const buildParcelPopupHtml = (rawProps: Record<string, unknown>, parcelId: string): string => {
  const props = resolveParcelProps(rawProps);
  const owner = props.owner ?? props.OWNER_NAME ?? props.OWNERNME1 ?? '';
  const address = props.address ?? props.SITUS_ADDRESS ?? props.SITEADDRESS ?? '';
  const acresValue = props.acres ?? props.ACRES ?? props.GROSSAC ?? '';
  const useCode = props.use_code ?? props.USE_CODE ?? props.USECD ?? '';
  const useDesc = props.use_desc ?? props.USE_DESC ?? props.USEDSCRP ?? '';

  const addressLines = typeof address === 'string' ? splitAddressLines(address) : null;
  const addressHtml = addressLines
    ? `
      <div class="map-tab-popover-address">
        <div class="map-tab-popover-address-line">${escapeHtml(addressLines.line1)}</div>
        ${addressLines.line2 ? `<div class="map-tab-popover-address-line">${escapeHtml(addressLines.line2)}</div>` : ''}
      </div>
    `
    : '';

  const rows: Array<{ label: string; value: string }> = [];
  if (parcelId) rows.push({ label: 'Parcel ID', value: parcelId });
  if (owner) rows.push({ label: 'Owner', value: String(owner) });
  if (acresValue !== '' && acresValue != null) {
    const acresNum = Number(acresValue);
    rows.push({
      label: 'Acres',
      value: Number.isFinite(acresNum) ? acresNum.toFixed(2) : String(acresValue),
    });
  }
  if (useCode) rows.push({ label: 'Use Code', value: String(useCode) });
  if (useDesc) rows.push({ label: 'Use Desc', value: String(useDesc) });

  const usedKeys = new Set<string>([
    'owner',
    'OWNER_NAME',
    'OWNERNME1',
    'address',
    'SITUS_ADDRESS',
    'SITEADDRESS',
    'acres',
    'ACRES',
    'GROSSAC',
    'use_code',
    'USE_CODE',
    'USECD',
    'use_desc',
    'USE_DESC',
    'USEDSCRP',
  ]);

  Object.entries(props).forEach(([key, value]) => {
    if (usedKeys.has(key)) return;
    if (value == null) return;
    if (typeof value === 'object') return;
    rows.push({ label: key, value: String(value) });
  });

  const rowsHtml = buildPopoverRows(rows);

  return `
    <div class="map-tab-popover">
      <div class="map-tab-popover-header">${escapeHtml(parcelId ? `Parcel ${parcelId}` : 'Parcel')}</div>
      <div class="map-tab-popover-body">
        ${addressHtml}
        ${rowsHtml || (!addressHtml ? '<div class="map-tab-popover-empty">No parcel details available</div>' : '')}
      </div>
    </div>
  `;
};

const splitParcelFeatures = (
  collection: GeoJSON.FeatureCollection,
  subjectApn?: string | null,
  compApns?: string[]
) => {
  const subjectKey = subjectApn ? normalizeParcelId(subjectApn) : '';
  const compKeys = new Set((compApns ?? []).map(normalizeParcelId).filter(Boolean));

  const subjectFeatures: GeoJSON.Feature[] = [];
  const compFeatures: GeoJSON.Feature[] = [];
  const otherFeatures: GeoJSON.Feature[] = [];

  collection.features.forEach((feature) => {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const apn = typeof props.APN === 'string' ? props.APN : '';
    const ain = typeof props.AIN === 'string' ? props.AIN : '';
    const keys = [apn, ain].map(normalizeParcelId).filter(Boolean);

    const isSubject = subjectKey && keys.includes(subjectKey);
    const isComp = keys.some((key) => compKeys.has(key));

    if (isSubject) {
      subjectFeatures.push(feature);
    } else if (isComp) {
      compFeatures.push(feature);
    } else {
      otherFeatures.push(feature);
    }
  });

  return { subjectFeatures, compFeatures, otherFeatures };
};

// ─────────────────────────────────────────────────────────────────────────────
// MapCanvas Component
// ─────────────────────────────────────────────────────────────────────────────

export const MapCanvas = forwardRef<MapCanvasRef, MapCanvasProps>(function MapCanvas(
  {
    center,
    zoom,
    basemap,
    layers,
    features,
    activeTool,
    selectedFeatureId,
    planParcels,
    projectBoundary,
    taxParcels,
    selectedTaxParcelIds,
    saleComps,
    rentComps,
    parcelCollection,
    parcelSubjectApn,
    parcelCompApns,
    selectedRingRadius,
    onMapClick,
    onRingClick,
    onFeatureClick,
    onTaxParcelToggle,
    onViewStateChange,
  },
  ref
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleRevision, setStyleRevision] = useState(0);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const saleCompMarkersRef = useRef<maplibregl.Marker[]>([]);
  const rentCompMarkersRef = useRef<maplibregl.Marker[]>([]);
  const subjectMarkerRef = useRef<maplibregl.Marker | null>(null);
  const rasterDimCleanupRef = useRef<(() => void) | null>(null);
  const lastCenterRef = useRef<[number, number] | null>(null);

  // Expose map to parent component
  useImperativeHandle(ref, () => ({
    getMap: () => map.current,
    isLoaded: () => mapLoaded,
  }), [mapLoaded]);

  // Keep callbacks current with refs
  const onMapClickRef = useRef(onMapClick);
  const onRingClickRef = useRef(onRingClick);
  const onFeatureClickRef = useRef(onFeatureClick);
  const onTaxParcelToggleRef = useRef(onTaxParcelToggle);
  const onViewStateChangeRef = useRef(onViewStateChange);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onRingClickRef.current = onRingClick;
  }, [onRingClick]);

  useEffect(() => {
    onFeatureClickRef.current = onFeatureClick;
  }, [onFeatureClick]);

  useEffect(() => {
    onTaxParcelToggleRef.current = onTaxParcelToggle;
  }, [onTaxParcelToggle]);

  useEffect(() => {
    onViewStateChangeRef.current = onViewStateChange;
  }, [onViewStateChange]);

  const clearMarkers = (refList: React.MutableRefObject<maplibregl.Marker[]>) => {
    refList.current.forEach((marker) => marker.remove());
    refList.current = [];
  };

  const buildPinSvg = (color: string, stroke = 'var(--cui-body-color)') => `
    <svg width="30" height="30" viewBox="0 0 24 24" fill="${color}" stroke="${stroke}" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;

  // ─────────────────────────────────────────────────────────────────────────
  // Initialize Map
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    registerGoogleProtocol();
    const style = getMapStyle(basemap);

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style,
      center,
      zoom,
      antialias: true,
    });

    rasterDimCleanupRef.current = registerRasterDim(map.current, 0.1);

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-right');

    const emitViewState = () => {
      if (!map.current || !onViewStateChangeRef.current) return;
      const mapCenter = map.current.getCenter();
      const mapZoom = map.current.getZoom();
      const mapBounds = map.current.getBounds();
      onViewStateChangeRef.current({
        center: [mapCenter.lng, mapCenter.lat],
        zoom: mapZoom,
        bounds: [
          [mapBounds.getWest(), mapBounds.getSouth()],
          [mapBounds.getEast(), mapBounds.getNorth()],
        ],
      });
    };

    map.current.on('load', () => {
      setMapLoaded(true);
      // Trigger resize to ensure map fills container correctly
      setTimeout(() => {
        map.current?.resize();
        emitViewState();
      }, 100);
    });

    // Handle map clicks
    map.current.on('click', (e) => {
      if (onMapClickRef.current) {
        onMapClickRef.current([e.lngLat.lng, e.lngLat.lat]);
      }
    });

    // Track view state changes
    map.current.on('moveend', emitViewState);
    map.current.on('zoomend', emitViewState);

    return () => {
      rasterDimCleanupRef.current?.();
      rasterDimCleanupRef.current = null;
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run once on mount, using initial values
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Update Basemap Style + styleRevision bump
  // ─────────────────────────────────────────────────────────────────────────

  const prevBasemapRef = useRef(basemap);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    if (basemap === prevBasemapRef.current) return;
    prevBasemapRef.current = basemap;

    const style = getMapStyle(basemap);
    map.current.setStyle(style);

    // Bump styleRevision after new style loads so all data-layer effects re-fire
    const handleStyleLoad = () => {
      setStyleRevision((prev) => prev + 1);
    };
    map.current.once('style.load', handleStyleLoad);

    return () => {
      map.current?.off('style.load', handleStyleLoad);
    };
  }, [basemap, mapLoaded]);

  // ─────────────────────────────────────────────────────────────────────────
  // Recenter Map When Center Prop Changes
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const prev = lastCenterRef.current;
    if (!prev || prev[0] !== center[0] || prev[1] !== center[1]) {
      map.current.jumpTo({ center });
      lastCenterRef.current = center;
    }
  }, [center, mapLoaded]);

  // ─────────────────────────────────────────────────────────────────────────
  // Update Cursor for Active Tool
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current) return;

    const cursor = activeTool === 'point' || activeTool === 'line' || activeTool === 'polygon'
      ? 'crosshair'
      : activeTool === 'edit'
      ? 'move'
      : activeTool === 'delete'
      ? 'not-allowed'
      : '';

    map.current.getCanvas().style.cursor = cursor;
  }, [activeTool]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render Plan Parcels (green)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const srcId = 'plan-parcels-src';
    const fillId = 'plan-parcels-fill';
    const lineId = 'plan-parcels-line';

    // Clean up previous
    safeRemoveLayer(map.current, fillId);
    safeRemoveLayer(map.current, lineId);
    safeRemoveSource(map.current, srcId);

    // Check layer visibility
    const planParcelsLayer = layers.groups
      .find((g) => g.id === 'project-boundary')
      ?.layers.find((l) => l.id === 'plan-parcels');

    if (!planParcelsLayer?.visible || !planParcels || !planParcels.features?.length) return;

    map.current.addSource(srcId, {
      type: 'geojson',
      data: planParcels,
    });

    map.current.addLayer({
      id: fillId,
      type: 'fill',
      source: srcId,
      paint: {
        'fill-color': LAYER_COLORS.planParcels,
        'fill-opacity': 0.15,
      },
    });

    map.current.addLayer({
      id: lineId,
      type: 'line',
      source: srcId,
      paint: {
        'line-color': LAYER_COLORS.planParcels,
        'line-width': 2,
        'line-opacity': 0.8,
      },
    });

    // Click handler for plan parcel popups
    const handleClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features?.length || !map.current) return;
      const props = e.features[0].properties || {};

      const rows: string[] = [];
      if (props.parcel_id) rows.push(`<strong>Parcel:</strong> ${props.parcel_id}`);
      if (props.parcel_name) rows.push(`<strong>Name:</strong> ${props.parcel_name}`);
      if (props.area_name) rows.push(`<strong>Area:</strong> ${props.area_name}`);
      if (props.phase_name) rows.push(`<strong>Phase:</strong> ${props.phase_name}`);
      if (props.gross_acres) rows.push(`<strong>Gross Acres:</strong> ${Number(props.gross_acres).toFixed(2)}`);
      if (props.net_acres) rows.push(`<strong>Net Acres:</strong> ${Number(props.net_acres).toFixed(2)}`);
      if (props.confidence) rows.push(`<strong>Confidence:</strong> ${(Number(props.confidence) * 100).toFixed(0)}%`);
      if (props.land_use_product) rows.push(`<strong>Product:</strong> ${props.land_use_product}`);

      if (rows.length === 0) {
        rows.push('<em>No parcel details available</em>');
      }

      // Remove existing popup
      popupRef.current?.remove();

      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        className: 'map-tab-popup',
        maxWidth: '280px',
      })
        .setLngLat(e.lngLat)
        .setHTML(`<div class="map-tab-popup-content">${rows.join('<br/>')}</div>`)
        .addTo(map.current);
    };

    map.current.on('click', fillId, handleClick);

    // Pointer cursor on hover
    map.current.on('mouseenter', fillId, () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', fillId, () => {
      if (map.current && !activeTool) map.current.getCanvas().style.cursor = '';
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, styleRevision, planParcels, layers]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render Project Location (boundary polygon or point fallback)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const srcId = 'project-boundary-src';
    const lineId = 'project-boundary-line';
    const fillId = 'project-boundary-fill';
    const pointId = 'project-location-point';

    // Clean up previous
    safeRemoveLayer(map.current, lineId);
    safeRemoveLayer(map.current, fillId);
    safeRemoveLayer(map.current, pointId);
    safeRemoveSource(map.current, srcId);

    // Check layer visibility
    const boundaryLayer = layers.groups
      .find((g) => g.id === 'project-boundary')
      ?.layers.find((l) => l.id === 'site-boundary');

    if (!boundaryLayer?.visible) return;

    const fallbackPoint: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: center },
      properties: {},
    };
    const feature = projectBoundary ?? fallbackPoint;

    // Wrap single Feature in a FeatureCollection for the source
    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [feature],
    };

    map.current.addSource(srcId, {
      type: 'geojson',
      data: fc,
    });

    const geomType = feature.geometry?.type;
    if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
      // Subtle fill
      map.current.addLayer({
        id: fillId,
        type: 'fill',
        source: srcId,
        paint: {
          'fill-color': LAYER_COLORS.siteBoundary,
          'fill-opacity': 0.05,
        },
      });

      // Thick dashed stroke
      map.current.addLayer({
        id: lineId,
        type: 'line',
        source: srcId,
        paint: {
          'line-color': LAYER_COLORS.siteBoundary,
          'line-width': 3,
          'line-dasharray': [4, 3],
          'line-opacity': 0.9,
        },
      });
    } else {
      map.current.addLayer({
        id: pointId,
        type: 'circle',
        source: srcId,
        paint: {
          'circle-color': LAYER_COLORS.siteBoundary,
          'circle-radius': 6,
          'circle-stroke-color': LAYER_COLORS.siteBoundary,
          'circle-stroke-width': 2,
        },
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, styleRevision, projectBoundary, layers, center]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render Tax Parcels (blue, subtle reference overlay)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const srcId = 'tax-parcels-src';
    const fillId = 'tax-parcels-fill';
    const lineId = 'tax-parcels-line';
    const selectedFillId = 'tax-parcels-selected-fill';
    const selectedHighlightId = 'tax-parcels-selected-highlight';
    const selectedLineId = 'tax-parcels-selected-line';

    // Clean up previous
    safeRemoveLayer(map.current, fillId);
    safeRemoveLayer(map.current, lineId);
    safeRemoveLayer(map.current, selectedFillId);
    safeRemoveLayer(map.current, selectedHighlightId);
    safeRemoveLayer(map.current, selectedLineId);
    safeRemoveSource(map.current, srcId);

    // Check layer visibility
    const taxParcelsLayer = layers.groups
      .find((g) => g.id === 'project-boundary')
      ?.layers.find((l) => l.id === 'tax-parcels');

    if (!taxParcelsLayer?.visible || !taxParcels || !taxParcels.features?.length) return;

    map.current.addSource(srcId, {
      type: 'geojson',
      data: taxParcels,
    });

    const whiteStroke = getWhiteStroke();

    map.current.addLayer({
      id: fillId,
      type: 'fill',
      source: srcId,
      minzoom: TAX_PARCEL_MIN_ZOOM,
      paint: {
        'fill-color': LAYER_COLORS.taxParcels,
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.18,
          0.08,
        ],
      },
    });

    map.current.addLayer({
      id: lineId,
      type: 'line',
      source: srcId,
      minzoom: TAX_PARCEL_MIN_ZOOM,
      paint: {
        'line-color': whiteStroke,
        'line-width': 1.6,
        'line-opacity': 1,
      },
    });

    const selectedIds = (selectedTaxParcelIds ?? []).filter(Boolean);
    if (selectedIds.length > 0) {
      map.current.addLayer({
        id: selectedFillId,
        type: 'fill',
        source: srcId,
        minzoom: TAX_PARCEL_MIN_ZOOM,
        paint: {
          'fill-color': LAYER_COLORS.siteBoundary,
          'fill-opacity': 0.3,
        },
        filter: ['in', ['get', 'parcel_id'], ['literal', selectedIds]],
      });

      map.current.addLayer({
        id: selectedHighlightId,
        type: 'line',
        source: srcId,
        minzoom: TAX_PARCEL_MIN_ZOOM,
        paint: {
          'line-color': LAYER_COLORS.taxParcels,
          'line-width': 3.2,
          'line-opacity': 1,
        },
        filter: ['in', ['get', 'parcel_id'], ['literal', selectedIds]],
      });

      map.current.addLayer({
        id: selectedLineId,
        type: 'line',
        source: srcId,
        minzoom: TAX_PARCEL_MIN_ZOOM,
        paint: {
          'line-color': LAYER_COLORS.taxParcels,
          'line-width': 2,
          'line-opacity': 1,
        },
        filter: ['in', ['get', 'parcel_id'], ['literal', selectedIds]],
      });
    }

    let hoveredId: string | number | null = null;

    const handleMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!map.current) return;
      const feature = e.features?.[0];
      const featureId = feature?.id;
      if (featureId == null) return;
      if (hoveredId !== null && hoveredId !== featureId) {
        map.current.setFeatureState({ source: srcId, id: hoveredId }, { hover: false });
      }
      hoveredId = featureId;
      map.current.setFeatureState({ source: srcId, id: featureId }, { hover: true });
      map.current.getCanvas().style.cursor = 'pointer';
    };

    const handleLeave = () => {
      if (!map.current) return;
      if (hoveredId !== null) {
        map.current.setFeatureState({ source: srcId, id: hoveredId }, { hover: false });
      }
      hoveredId = null;
      if (!activeTool) map.current.getCanvas().style.cursor = '';
    };

    const handleClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!map.current || !e.features?.length) return;
      const feature = e.features[0];
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const parcelId = getParcelIdFromProps(props, feature.id);
      if (!parcelId) return;

      if (onTaxParcelToggleRef.current) {
        onTaxParcelToggleRef.current({
          type: 'Feature',
          geometry: feature.geometry as GeoJSON.Geometry,
          properties: props,
          id: feature.id ?? parcelId,
        });
      }

      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        className: 'map-tab-popover',
        maxWidth: '320px',
      })
        .setLngLat(e.lngLat)
        .setHTML(buildParcelPopupHtml(props, parcelId))
        .addTo(map.current);
    };

    map.current.on('mousemove', fillId, handleMove);
    map.current.on('mouseleave', fillId, handleLeave);
    map.current.on('click', fillId, handleClick);

    return () => {
      if (!map.current) return;
      map.current.off('mousemove', fillId, handleMove);
      map.current.off('mouseleave', fillId, handleLeave);
      map.current.off('click', fillId, handleClick);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, styleRevision, taxParcels, layers, selectedTaxParcelIds, activeTool]);

  // ─────────────────────────────────────────────────────────────────────────
  // LA County Parcel Overlays (subject + comps)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const colors = buildParcelColors();
    const whiteStroke = getWhiteStroke();

    const removeParcelLayers = () => {
      safeRemoveLayer(map.current!, ALL_PARCEL_FILL_ID);
      safeRemoveLayer(map.current!, ALL_PARCEL_LINE_ID);
      safeRemoveLayer(map.current!, SUBJECT_PARCEL_FILL_ID);
      safeRemoveLayer(map.current!, SUBJECT_PARCEL_LINE_ID);
      safeRemoveLayer(map.current!, COMPS_PARCEL_FILL_ID);
      safeRemoveLayer(map.current!, COMPS_PARCEL_LINE_ID);
      safeRemoveSource(map.current!, ALL_PARCEL_SOURCE_ID);
      safeRemoveSource(map.current!, SUBJECT_PARCEL_SOURCE_ID);
      safeRemoveSource(map.current!, COMPS_PARCEL_SOURCE_ID);
    };

    removeParcelLayers();

    if (!parcelCollection?.features?.length) {
      return;
    }

    const { subjectFeatures, compFeatures, otherFeatures } = splitParcelFeatures(
      parcelCollection,
      parcelSubjectApn ?? undefined,
      parcelCompApns
    );

    if (!subjectFeatures.length && !compFeatures.length && !otherFeatures.length) {
      return;
    }

    if (otherFeatures.length) {
      map.current.addSource(ALL_PARCEL_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: otherFeatures },
      });
      map.current.addLayer({
        id: ALL_PARCEL_FILL_ID,
        type: 'fill',
        source: ALL_PARCEL_SOURCE_ID,
        minzoom: PARCEL_MIN_ZOOM,
        paint: {
          'fill-color': colors.neutralFill,
          'fill-opacity': 0.2,
          'fill-outline-color': whiteStroke,
        },
      });
      map.current.addLayer({
        id: ALL_PARCEL_LINE_ID,
        type: 'line',
        source: ALL_PARCEL_SOURCE_ID,
        minzoom: PARCEL_MIN_ZOOM,
        paint: {
          'line-color': whiteStroke,
          'line-width': 1.6,
          'line-opacity': 0.9,
        },
      });
    }

    if (compFeatures.length) {
      map.current.addSource(COMPS_PARCEL_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: compFeatures },
      });
      map.current.addLayer({
        id: COMPS_PARCEL_FILL_ID,
        type: 'fill',
        source: COMPS_PARCEL_SOURCE_ID,
        minzoom: PARCEL_MIN_ZOOM,
        paint: {
          'fill-color': colors.compFill,
          'fill-opacity': 0.4,
          'fill-outline-color': colors.compStroke,
        },
      });
      map.current.addLayer({
        id: COMPS_PARCEL_LINE_ID,
        type: 'line',
        source: COMPS_PARCEL_SOURCE_ID,
        minzoom: PARCEL_MIN_ZOOM,
        paint: {
          'line-color': colors.compStroke,
          'line-width': 2.2,
        },
      });
    }

    if (subjectFeatures.length) {
      map.current.addSource(SUBJECT_PARCEL_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: subjectFeatures },
      });
      map.current.addLayer({
        id: SUBJECT_PARCEL_FILL_ID,
        type: 'fill',
        source: SUBJECT_PARCEL_SOURCE_ID,
        minzoom: PARCEL_MIN_ZOOM,
        paint: {
          'fill-color': colors.subjectFill,
          'fill-opacity': 0.65,
          'fill-outline-color': colors.subjectStroke,
        },
      });
      map.current.addLayer({
        id: SUBJECT_PARCEL_LINE_ID,
        type: 'line',
        source: SUBJECT_PARCEL_SOURCE_ID,
        minzoom: PARCEL_MIN_ZOOM,
        paint: {
          'line-color': colors.subjectStroke,
          'line-width': 2.8,
        },
      });
    }

    const parcelLayerIds = [
      ALL_PARCEL_FILL_ID,
      COMPS_PARCEL_FILL_ID,
      SUBJECT_PARCEL_FILL_ID,
    ].filter((layerId) => map.current?.getLayer(layerId));

    const handleParcelClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!map.current || !e.features?.length) return;
      const props = e.features[0].properties || {};
      const apn = props.APN || props.apn || '';
      const ain = props.AIN || props.ain || '';
      const address = props.SitusFullAddress || props.situs_full_address || props.address || '';
      const addressLines = typeof address === 'string' ? splitAddressLines(address) : null;
      const useDesc = props.UseDescription || props.use_description || '';

      const rows: string[] = [];
      if (apn) rows.push(`<strong>APN:</strong> ${apn}`);
      if (ain) rows.push(`<strong>AIN:</strong> ${ain}`);
      if (addressLines) {
        const line1 = escapeHtml(addressLines.line1);
        const line2 = addressLines.line2 ? `<br/>${escapeHtml(addressLines.line2)}` : '';
        rows.push(`${line1}${line2}`);
      }
      if (useDesc) rows.push(`<strong>Use:</strong> ${useDesc}`);
      if (rows.length === 0) {
        rows.push('<em>No parcel details available</em>');
      }

      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        className: 'map-tab-popup map-tab-popup-compact',
        maxWidth: '300px',
      })
        .setLngLat(e.lngLat)
        .setHTML(`<div class="map-tab-popup-compact-content">${rows.join('<br/>')}</div>`)
        .addTo(map.current);
    };

    const handleParcelEnter = () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    };
    const handleParcelLeave = () => {
      if (map.current && !activeTool) map.current.getCanvas().style.cursor = '';
    };

    parcelLayerIds.forEach((layerId) => {
      map.current?.on('click', layerId, handleParcelClick);
      map.current?.on('mouseenter', layerId, handleParcelEnter);
      map.current?.on('mouseleave', layerId, handleParcelLeave);
    });

    if (map.current.getLayer('project-center')) {
      map.current.moveLayer('project-center');
    }

    return () => {
      removeParcelLayers();
      parcelLayerIds.forEach((layerId) => {
        map.current?.off('click', layerId, handleParcelClick);
        map.current?.off('mouseenter', layerId, handleParcelEnter);
        map.current?.off('mouseleave', layerId, handleParcelLeave);
      });
    };
  }, [mapLoaded, styleRevision, parcelCollection, parcelSubjectApn, parcelCompApns]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render Sale Comparables (red)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const srcId = 'sale-comps-src';
    const fillId = 'sale-comps-fill';
    const lineId = 'sale-comps-line';

    // Clean up previous
    safeRemoveLayer(map.current, fillId);
    safeRemoveLayer(map.current, lineId);
    safeRemoveSource(map.current, srcId);
    clearMarkers(saleCompMarkersRef);

    // Check layer visibility
    const saleCompsLayer = layers.groups
      .find((g) => g.id === 'comparables')
      ?.layers.find((l) => l.id === 'sale-comps');

    if (!saleCompsLayer?.visible || !saleComps || !saleComps.features?.length) return;

    map.current.addSource(srcId, {
      type: 'geojson',
      data: saleComps as GeoJSON.FeatureCollection,
    });

    map.current.addLayer({
      id: fillId,
      type: 'fill',
      source: srcId,
      filter: ['!=', '$type', 'Point'],
      paint: {
        'fill-color': ['coalesce', ['get', 'color'], LAYER_COLORS.saleComps],
        'fill-opacity': 0.25,
      },
    });

    map.current.addLayer({
      id: lineId,
      type: 'line',
      source: srcId,
      filter: ['!=', '$type', 'Point'],
      paint: {
        'line-color': ['coalesce', ['get', 'color'], LAYER_COLORS.saleComps],
        'line-width': 2,
        'line-opacity': 0.8,
      },
    });

    const markerTargets: Array<{ feature: GeoJSON.Feature; coords: [number, number] }> = [];

    saleComps.features.forEach((feature) => {
      const geometry = feature.geometry;
      if (!geometry) return;
      const type = geometry.type;

      if (type === 'Point') {
        const coords = geometry.coordinates as [number, number];
        markerTargets.push({ feature, coords });
        return;
      }

      if (type === 'MultiPoint') {
        const coords = (geometry.coordinates as [number, number][])[0];
        if (coords) markerTargets.push({ feature, coords });
        return;
      }

      if (type === 'Polygon' || type === 'MultiPolygon') {
        try {
          const centroid = turf.centroid(feature as turf.AllGeoJSON);
          const coords = centroid.geometry.coordinates as [number, number];
          markerTargets.push({ feature, coords });
        } catch {
          // ignore centroid errors
        }
      }
    });

    markerTargets.forEach(({ feature, coords }) => {
      if (!map.current) return;
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const color = (props.color as string) || LAYER_COLORS.saleComps;
      const name = typeof props.name === 'string' ? props.name : '';
      const price = Number(props.price ?? 0);
      const pricePerUnit = Number(props.price_per_unit ?? 0);
      const dateValue = props.date ? new Date(String(props.date)).toLocaleDateString() : '';
      const typeValue = typeof props.type === 'string' ? props.type : '';

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        className: 'map-tab-popover',
        maxWidth: '320px',
      });

      popup.setHTML(
        buildPopoverHtml(name ? `Sale Comp: ${name}` : 'Sale Comp', [
          { label: 'Price', value: Number.isFinite(price) && price > 0 ? `$${price.toLocaleString()}` : '' },
          { label: '$/Unit', value: Number.isFinite(pricePerUnit) && pricePerUnit > 0 ? `$${pricePerUnit.toLocaleString()}` : '' },
          { label: 'Date', value: dateValue },
          { label: 'Type', value: typeValue },
        ])
      );

      const markerEl = document.createElement('div');
      markerEl.className = 'map-tab-marker';
      markerEl.innerHTML = buildPinSvg(color, 'var(--cui-white)');
      markerEl.style.cursor = 'pointer';

      const marker = new maplibregl.Marker({ element: markerEl })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map.current!);

      markerEl.addEventListener('click', (event) => {
        event.stopPropagation();
        if (marker.getPopup()) {
          marker.togglePopup();
        }
      });

      saleCompMarkersRef.current.push(marker);
    });

    // Click handler for comp popups
    const handleClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features?.length || !map.current) return;
      const props = e.features[0].properties || {};

      const name = typeof props.name === 'string' ? props.name : '';
      const price = Number(props.price ?? 0);
      const pricePerUnit = Number(props.price_per_unit ?? 0);
      const dateValue = props.date ? new Date(String(props.date)).toLocaleDateString() : '';
      const typeValue = typeof props.type === 'string' ? props.type : '';

      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        className: 'map-tab-popover',
        maxWidth: '320px',
      })
        .setLngLat(e.lngLat)
        .setHTML(
          buildPopoverHtml(name ? `Sale Comp: ${name}` : 'Sale Comp', [
            { label: 'Price', value: Number.isFinite(price) && price > 0 ? `$${price.toLocaleString()}` : '' },
            { label: '$/Unit', value: Number.isFinite(pricePerUnit) && pricePerUnit > 0 ? `$${pricePerUnit.toLocaleString()}` : '' },
            { label: 'Date', value: dateValue },
            { label: 'Type', value: typeValue },
          ])
        )
        .addTo(map.current);
    };

    map.current.on('click', fillId, handleClick);

    const handleEnter = () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    };
    const handleLeave = () => {
      if (map.current && !activeTool) map.current.getCanvas().style.cursor = '';
    };

    map.current.on('mouseenter', fillId, handleEnter);
    map.current.on('mouseleave', fillId, handleLeave);

    return () => {
      if (!map.current) return;
      map.current.off('click', fillId, handleClick);
      map.current.off('mouseenter', fillId, handleEnter);
      map.current.off('mouseleave', fillId, handleLeave);
      clearMarkers(saleCompMarkersRef);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, styleRevision, saleComps, layers]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render Rent Comparables (orange points)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const srcId = 'rent-comps-src';

    // Clean up previous
    safeRemoveSource(map.current, srcId);
    clearMarkers(rentCompMarkersRef);

    // Check layer visibility
    const rentCompsLayer = layers.groups
      .find((g) => g.id === 'comparables')
      ?.layers.find((l) => l.id === 'rent-comps');

    if (!rentCompsLayer?.visible || !rentComps || !rentComps.features?.length) return;

    map.current.addSource(srcId, {
      type: 'geojson',
      data: rentComps as GeoJSON.FeatureCollection,
    });

    const pointFeatures = rentComps.features.filter((feature) => feature.geometry?.type === 'Point');
    pointFeatures.forEach((feature) => {
      if (!map.current) return;
      const coords = (feature.geometry as GeoJSON.Point).coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return;

      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const color = (props.color as string) || LAYER_COLORS.rentComps;

      const markerEl = document.createElement('div');
      markerEl.className = 'map-tab-marker';
      markerEl.innerHTML = buildPinSvg(color);
      markerEl.style.cursor = 'pointer';

      const name = typeof props.name === 'string' ? props.name : '';
      const address = typeof props.address === 'string' ? props.address : '';
      const addressLines = splitAddressLines(address);
      const distance = Number(props.distance_miles ?? 0);
      const yearBuilt = Number(props.year_built ?? 0);
      const totalUnits = Number(props.total_units ?? 0);
      const floorplans = Array.isArray(props.floorplans) ? (props.floorplans as Array<Record<string, unknown>>) : [];

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        className: 'map-tab-popover',
        maxWidth: '280px',
      });

      const header = name ? `Rent Comp: ${name}` : 'Rent Comp';
      const addressHtml = addressLines
        ? `
          <div class="map-tab-popover-address">
            <div class="map-tab-popover-address-line">${escapeHtml(addressLines.line1)}</div>
            ${addressLines.line2 ? `<div class="map-tab-popover-address-line">${escapeHtml(addressLines.line2)}</div>` : ''}
          </div>
        `
        : '';
      const rowsHtml = buildPopoverRows([
        {
          label: 'Distance',
          value: Number.isFinite(distance) && distance > 0 ? `${distance.toFixed(2)} mi` : '',
        },
        {
          label: 'Year Built',
          value: Number.isFinite(yearBuilt) && yearBuilt > 0 ? String(yearBuilt) : '',
        },
        {
          label: 'Units',
          value: Number.isFinite(totalUnits) && totalUnits > 0 ? String(totalUnits) : '',
        },
      ]);
      const floorplanHtml = buildFloorplanTable(floorplans);

      popup.setHTML(`
        <div class="map-tab-popover">
          <div class="map-tab-popover-header">${escapeHtml(header)}</div>
          <div class="map-tab-popover-body">
            ${addressHtml}
            ${rowsHtml || (!addressHtml ? '<div class="map-tab-popover-empty">No details available</div>' : '')}
            ${floorplanHtml}
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: markerEl })
        .setLngLat([coords[0], coords[1]])
        .setPopup(popup)
        .addTo(map.current);

      markerEl.addEventListener('click', (event) => {
        event.stopPropagation();
        if (marker.getPopup()) {
          marker.togglePopup();
        }
      });

      rentCompMarkersRef.current.push(marker);
    });

    return () => {
      if (!map.current) return;
      clearMarkers(rentCompMarkersRef);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, styleRevision, rentComps, layers]);

  // ─────────────────────────────────────────────────────────────────────────
  // Project Center Marker (always visible, independent of demo-rings)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (subjectMarkerRef.current) {
      subjectMarkerRef.current.remove();
      subjectMarkerRef.current = null;
    }

    const markerEl = document.createElement('div');
    markerEl.className = 'map-subject-marker';
    markerEl.style.cursor = 'pointer';

    const subjectPopup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      className: 'map-tab-popover',
      maxWidth: '280px',
    }).setHTML(
      buildPopoverHtml('Subject Property', [
        { label: 'Latitude', value: Number.isFinite(center[1]) ? center[1].toFixed(6) : '' },
        { label: 'Longitude', value: Number.isFinite(center[0]) ? center[0].toFixed(6) : '' },
      ])
    );

    subjectMarkerRef.current = new maplibregl.Marker({ element: markerEl, anchor: 'center' })
      .setLngLat([center[0], center[1]])
      .setPopup(subjectPopup)
      .addTo(map.current);

    markerEl.addEventListener('click', (event) => {
      event.stopPropagation();
      if (subjectMarkerRef.current?.getPopup()) {
        subjectMarkerRef.current.togglePopup();
      }
    });

    return () => {
      subjectMarkerRef.current?.remove();
      subjectMarkerRef.current = null;
    };
  }, [mapLoaded, styleRevision, center]);

  // ─────────────────────────────────────────────────────────────────────────
  // Draw Demo Rings (from location intel layers)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const demoRingsLayer = layers.groups
      .find((g) => g.id === 'location-intel')
      ?.layers.find((l) => l.id === 'demo-rings');

    if (!demoRingsLayer?.visible) {
      // Remove ring layers if hidden
      [1, 3, 5].forEach((radius) => {
        if (map.current) {
          safeRemoveLayer(map.current, `ring-${radius}-fill`);
          safeRemoveLayer(map.current, `ring-${radius}-stroke-white`);
          safeRemoveLayer(map.current, `ring-${radius}-stroke`);
          safeRemoveSource(map.current, `ring-${radius}`);
        }
      });
      return;
    }

    // Add ring circles
    const ringClickHandlers: Array<{
      id: string;
      click: (e: maplibregl.MapMouseEvent) => void;
      enter: () => void;
      leave: () => void;
    }> = [];

    [1, 3, 5].forEach((radius) => {
      const colors = RING_COLORS[radius];
      if (!colors) return;

      const sourceId = `ring-${radius}`;

      // Remove if already exists (needed for styleRevision re-add)
      if (map.current) {
        safeRemoveLayer(map.current, `ring-${radius}-fill`);
        safeRemoveLayer(map.current, `ring-${radius}-stroke-white`);
        safeRemoveLayer(map.current, `ring-${radius}-stroke`);
        safeRemoveSource(map.current, sourceId);
      }

      // Create circle using Turf.js
      const circleGeoJSON = turf.circle(center, radius, {
        steps: 64,
        units: 'miles',
      });

      map.current?.addSource(sourceId, {
        type: 'geojson',
        data: circleGeoJSON,
      });

      // Fill layer
      const isSelected = selectedRingRadius === radius;
      const ringLineWidth = isSelected ? 3.4 : 1.9;

      map.current?.addLayer({
        id: `ring-${radius}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': colors.stroke,
          'fill-opacity': isSelected ? 0.42 : 0.26,
        },
      });

      // White halo stroke for stronger contrast on aerial imagery
      map.current?.addLayer({
        id: `ring-${radius}-stroke-white`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#FFFFFF',
          'line-width': ringLineWidth + 2,
          'line-opacity': 1,
        },
      });

      // Stroke layer
      map.current?.addLayer({
        id: `ring-${radius}-stroke`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#000000',
          'line-width': ringLineWidth,
          'line-opacity': 1,
        },
      });

      const fillLayerId = `ring-${radius}-fill`;
      const handleClick = (e: maplibregl.MapMouseEvent) => {
        if (activeTool) return;
        if (onRingClickRef.current) {
          onRingClickRef.current(radius, [e.lngLat.lng, e.lngLat.lat]);
        }
      };
      const handleEnter = () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      };
      const handleLeave = () => {
        if (map.current && !activeTool) map.current.getCanvas().style.cursor = '';
      };

      map.current?.on('click', fillLayerId, handleClick);
      map.current?.on('mouseenter', fillLayerId, handleEnter);
      map.current?.on('mouseleave', fillLayerId, handleLeave);

      ringClickHandlers.push({
        id: fillLayerId,
        click: handleClick,
        enter: handleEnter,
        leave: handleLeave,
      });
    });

    // Ensure important markers/layers sit above ring shading
    if (map.current.getLayer('project-center')) {
      map.current.moveLayer('project-center');
    }
    if (map.current.getLayer('sale-comps-fill')) {
      map.current.moveLayer('sale-comps-fill');
    }
    if (map.current.getLayer('sale-comps-line')) {
      map.current.moveLayer('sale-comps-line');
    }

    return () => {
      if (!map.current) return;
      ringClickHandlers.forEach(({ id, click, enter, leave }) => {
        map.current?.off('click', id, click);
        map.current?.off('mouseenter', id, enter);
        map.current?.off('mouseleave', id, leave);
      });
    };
  }, [mapLoaded, styleRevision, layers, center, selectedRingRadius, activeTool]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render User Features (drawn shapes)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const drawnShapesLayer = layers.groups
      .find((g) => g.id === 'annotations')
      ?.layers.find((l) => l.id === 'drawn-shapes');

    const sourceId = 'user-features';

    // Remove existing source/layers
    safeRemoveLayer(map.current, 'user-features-fill');
    safeRemoveLayer(map.current, 'user-features-line');
    safeRemoveLayer(map.current, 'user-features-point');
    safeRemoveSource(map.current, sourceId);

    if (!drawnShapesLayer?.visible || features.length === 0) return;

    // Convert features to GeoJSON
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: features.map((f) => ({
        type: 'Feature' as const,
        id: f.id,
        properties: {
          id: f.id,
          label: f.label,
          category: f.category,
          selected: f.id === selectedFeatureId,
        },
        geometry: f.geometry,
      })),
    };

    map.current.addSource(sourceId, {
      type: 'geojson',
      data: geojson,
    });

    // Add polygon fill layer
    map.current.addLayer({
      id: 'user-features-fill',
      type: 'fill',
      source: sourceId,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color': '#06b6d4',
        'fill-opacity': ['case', ['get', 'selected'], 0.4, 0.2],
      },
    });

    // Add line layer
    map.current.addLayer({
      id: 'user-features-line',
      type: 'line',
      source: sourceId,
      filter: ['any', ['==', '$type', 'LineString'], ['==', '$type', 'Polygon']],
      paint: {
        'line-color': '#06b6d4',
        'line-width': ['case', ['get', 'selected'], 3, 2],
      },
    });

    // Add point layer
    map.current.addLayer({
      id: 'user-features-point',
      type: 'circle',
      source: sourceId,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': ['case', ['get', 'selected'], 10, 8],
        'circle-color': '#06b6d4',
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2,
      },
    });

    // Handle clicks on features
    const handleFillClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (e.features?.[0] && onFeatureClickRef.current) {
        const featureId = e.features[0].properties?.id;
        const feature = features.find((f) => f.id === featureId);
        if (feature) onFeatureClickRef.current(feature);
      }
    };
    const handlePointClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (e.features?.[0] && onFeatureClickRef.current) {
        const featureId = e.features[0].properties?.id;
        const feature = features.find((f) => f.id === featureId);
        if (feature) onFeatureClickRef.current(feature);
      }
    };

    map.current.on('click', 'user-features-fill', handleFillClick);
    map.current.on('click', 'user-features-point', handlePointClick);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, styleRevision, layers, features, selectedFeatureId]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="map-canvas-container">
      <div ref={mapContainer} className="map-canvas" />

      {!mapLoaded && (
        <div className="map-canvas-loading">
          <div className="map-canvas-spinner" />
          <span>Loading map...</span>
        </div>
      )}
    </div>
  );
});

export default MapCanvas;
