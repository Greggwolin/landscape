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
import type { GoogleBasemapType } from '@/lib/maps/googleBasemaps';

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
    saleComps,
    rentComps,
    selectedRingRadius,
    onMapClick,
    onRingClick,
    onFeatureClick,
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

  // Expose map to parent component
  useImperativeHandle(ref, () => ({
    getMap: () => map.current,
    isLoaded: () => mapLoaded,
  }), [mapLoaded]);

  // Keep callbacks current with refs
  const onMapClickRef = useRef(onMapClick);
  const onRingClickRef = useRef(onRingClick);
  const onFeatureClickRef = useRef(onFeatureClick);
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
    onViewStateChangeRef.current = onViewStateChange;
  }, [onViewStateChange]);

  const clearMarkers = (refList: React.MutableRefObject<maplibregl.Marker[]>) => {
    refList.current.forEach((marker) => marker.remove());
    refList.current = [];
  };

  const buildPinSvg = (color: string) => `
    <svg width="30" height="30" viewBox="0 0 24 24" fill="${color}" stroke="#000000" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">
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

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-right');

    map.current.on('load', () => {
      setMapLoaded(true);
      // Trigger resize to ensure map fills container correctly
      setTimeout(() => {
        map.current?.resize();
      }, 100);
    });

    // Handle map clicks
    map.current.on('click', (e) => {
      if (onMapClickRef.current) {
        onMapClickRef.current([e.lngLat.lng, e.lngLat.lat]);
      }
    });

    // Track view state changes
    map.current.on('moveend', () => {
      if (!map.current || !onViewStateChangeRef.current) return;
      const mapCenter = map.current.getCenter();
      const mapZoom = map.current.getZoom();
      onViewStateChangeRef.current({
        center: [mapCenter.lng, mapCenter.lat],
        zoom: mapZoom,
      });
    });

    return () => {
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
  // Render Project Boundary (amber, dashed)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const srcId = 'project-boundary-src';
    const lineId = 'project-boundary-line';
    const fillId = 'project-boundary-fill';

    // Clean up previous
    safeRemoveLayer(map.current, lineId);
    safeRemoveLayer(map.current, fillId);
    safeRemoveSource(map.current, srcId);

    // Check layer visibility
    const boundaryLayer = layers.groups
      .find((g) => g.id === 'project-boundary')
      ?.layers.find((l) => l.id === 'site-boundary');

    if (!boundaryLayer?.visible || !projectBoundary) return;

    // Wrap single Feature in a FeatureCollection for the source
    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [projectBoundary],
    };

    map.current.addSource(srcId, {
      type: 'geojson',
      data: fc,
    });

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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, styleRevision, projectBoundary, layers]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render Tax Parcels (blue, subtle reference overlay)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const srcId = 'tax-parcels-src';
    const fillId = 'tax-parcels-fill';
    const lineId = 'tax-parcels-line';

    // Clean up previous
    safeRemoveLayer(map.current, fillId);
    safeRemoveLayer(map.current, lineId);
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

    map.current.addLayer({
      id: fillId,
      type: 'fill',
      source: srcId,
      paint: {
        'fill-color': LAYER_COLORS.taxParcels,
        'fill-opacity': 0.05,
      },
    });

    map.current.addLayer({
      id: lineId,
      type: 'line',
      source: srcId,
      paint: {
        'line-color': LAYER_COLORS.taxParcels,
        'line-width': 1,
        'line-opacity': 0.5,
      },
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, styleRevision, taxParcels, layers]);

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
      filter: ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'MultiPolygon']],
      paint: {
        'fill-color': ['coalesce', ['get', 'color'], LAYER_COLORS.saleComps],
        'fill-opacity': 0.25,
      },
    });

    map.current.addLayer({
      id: lineId,
      type: 'line',
      source: srcId,
      filter: ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'MultiPolygon']],
      paint: {
        'line-color': ['coalesce', ['get', 'color'], LAYER_COLORS.saleComps],
        'line-width': 2,
        'line-opacity': 0.8,
      },
    });

    const pointFeatures = saleComps.features.filter((feature) => {
      const type = feature.geometry?.type;
      return type === 'Point' || type === 'MultiPoint';
    });
    pointFeatures.forEach((feature) => {
      if (!map.current) return;
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const color = (props.color as string) || LAYER_COLORS.saleComps;
      const popupHtml = props.popup_html || props.popupHtml;

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        className: 'map-tab-popup',
        maxWidth: '320px',
      });

      if (popupHtml) {
        popup.setHTML(String(popupHtml));
      } else {
        const rows: string[] = [];
        if (props.name) rows.push(`<strong>${props.name}</strong>`);
        if (props.price) rows.push(`Price: $${Number(props.price).toLocaleString()}`);
        if (props.price_per_unit) rows.push(`$/Unit: $${Number(props.price_per_unit).toLocaleString()}`);
        if (props.date) rows.push(`Date: ${props.date}`);
        if (props.type) rows.push(`Type: ${props.type}`);
        popup.setHTML(`<div class="map-tab-popup-content">${rows.length ? rows.join('<br/>') : '<em>No comp details</em>'}</div>`);
      }

      const createMarker = (lng: number, lat: number) => {
        const markerEl = document.createElement('div');
        markerEl.className = 'map-tab-marker';
        markerEl.innerHTML = buildPinSvg(color);
        markerEl.style.cursor = 'pointer';

        const marker = new maplibregl.Marker({ element: markerEl })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current!);

        markerEl.addEventListener('click', (event) => {
          event.stopPropagation();
          if (marker.getPopup()) {
            marker.togglePopup();
          }
        });

        saleCompMarkersRef.current.push(marker);
      };

      if (feature.geometry?.type === 'Point') {
        const coords = (feature.geometry as GeoJSON.Point).coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
          createMarker(coords[0], coords[1]);
        }
      } else if (feature.geometry?.type === 'MultiPoint') {
        const coords = (feature.geometry as GeoJSON.MultiPoint).coordinates;
        coords.forEach((coord) => {
          if (Array.isArray(coord) && coord.length >= 2) {
            createMarker(coord[0], coord[1]);
          }
        });
      }
    });

    // Click handler for comp popups
    const handleClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features?.length || !map.current) return;
      const props = e.features[0].properties || {};

      const popupHtml = props.popup_html || props.popupHtml;
      if (popupHtml) {
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: true,
          className: 'map-tab-popup',
          maxWidth: '320px',
        })
          .setLngLat(e.lngLat)
          .setHTML(String(popupHtml))
          .addTo(map.current);
        return;
      }

      const rows: string[] = [];
      if (props.name) rows.push(`<strong>${props.name}</strong>`);
      if (props.price) rows.push(`Price: $${Number(props.price).toLocaleString()}`);
      if (props.price_per_unit) rows.push(`$/Unit: $${Number(props.price_per_unit).toLocaleString()}`);
      if (props.date) rows.push(`Date: ${props.date}`);
      if (props.type) rows.push(`Type: ${props.type}`);

      if (rows.length === 0) {
        rows.push('<em>No comp details</em>');
      }

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
      const popupHtml = props.popup_html || props.popupHtml;

      const markerEl = document.createElement('div');
      markerEl.className = 'map-tab-marker';
      markerEl.innerHTML = buildPinSvg(color);
      markerEl.style.cursor = 'pointer';

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        className: 'map-tab-popup',
        maxWidth: '280px',
      });

      if (popupHtml) {
        popup.setHTML(String(popupHtml));
      } else {
        const rows: string[] = [];
        if (props.name) rows.push(`<strong>${props.name}</strong>`);
        if (props.asking_rent) rows.push(`Asking Rent: $${Number(props.asking_rent).toLocaleString()}`);
        if (props.effective_rent) rows.push(`Effective Rent: $${Number(props.effective_rent).toLocaleString()}`);
        if (props.unit_type) rows.push(`Unit Type: ${props.unit_type}`);
        if (props.distance_miles) rows.push(`Distance: ${Number(props.distance_miles).toFixed(2)} mi`);
        popup.setHTML(`<div class="map-tab-popup-content">${rows.length ? rows.join('<br/>') : '<em>No rent comp details</em>'}</div>`);
      }

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

    const centerMarkerId = 'project-center';
    safeRemoveLayer(map.current, centerMarkerId);
    safeRemoveSource(map.current, centerMarkerId);

    map.current.addSource(centerMarkerId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: center,
        },
      },
    });

    map.current.addLayer({
      id: centerMarkerId,
      type: 'circle',
      source: centerMarkerId,
      paint: {
        'circle-radius': 10,
        'circle-color': '#fbbf24',
        'circle-stroke-color': '#000',
        'circle-stroke-width': 2,
      },
    });
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
