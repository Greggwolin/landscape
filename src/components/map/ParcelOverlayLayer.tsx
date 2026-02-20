'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import { fetchParcelsByAPN } from '@/lib/gis/laCountyParcels';
import { useMapOblique } from './MapOblique';

export interface ParcelOverlayProps {
  subjectApn?: string;
  compApns?: string[];
}

const SUBJECT_SOURCE_ID = 'la-parcels-subject';
const COMPS_SOURCE_ID = 'la-parcels-comps';
const SUBJECT_FILL_LAYER_ID = 'la-parcels-subject-fill';
const SUBJECT_LINE_LAYER_ID = 'la-parcels-subject-line';
const COMPS_FILL_LAYER_ID = 'la-parcels-comps-fill';
const COMPS_LINE_LAYER_ID = 'la-parcels-comps-line';
const MIN_PARCEL_ZOOM = 17.5;

const normalizeId = (value: string) => value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();

const readCssVar = (name: string) => {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

const buildColors = () => {
  const primaryRgb = readCssVar('--cui-primary-rgb');
  const infoRgb = readCssVar('--cui-info-rgb');
  const primaryFallback = readCssVar('--cui-primary');
  const infoFallback = readCssVar('--cui-info');

  const subjectStroke = primaryRgb ? `rgb(${primaryRgb})` : primaryFallback;
  const compStroke = infoRgb ? `rgb(${infoRgb})` : infoFallback;
  const subjectFill = primaryRgb ? `rgba(${primaryRgb}, 0.18)` : primaryFallback;
  const compFill = infoRgb ? `rgba(${infoRgb}, 0.1)` : infoFallback;

  return {
    subjectStroke,
    compStroke,
    subjectFill,
    compFill,
  };
};

const splitFeaturesByApn = (
  collection: FeatureCollection,
  subjectApn?: string,
  compApns?: string[]
) => {
  const subjectKey = subjectApn ? normalizeId(subjectApn) : '';
  const compKeys = new Set(
    (compApns ?? []).map((value) => normalizeId(value)).filter(Boolean)
  );

  const subjectFeatures: Feature[] = [];
  const compFeatures: Feature[] = [];

  collection.features.forEach((feature) => {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const apn = typeof props.APN === 'string' ? props.APN : '';
    const ain = typeof props.AIN === 'string' ? props.AIN : '';
    const keys = [apn, ain].map(normalizeId).filter(Boolean);

    const isSubject = subjectKey.length > 0 && keys.includes(subjectKey);
    const isComp = keys.some((key) => compKeys.has(key));

    if (isSubject) {
      subjectFeatures.push(feature);
    } else if (isComp) {
      compFeatures.push(feature);
    }
  });

  return { subjectFeatures, compFeatures };
};

const emptyCollection = (): FeatureCollection => ({
  type: 'FeatureCollection',
  features: [],
});

const removeLayers = (map: maplibregl.Map) => {
  // Guard: map style may already be destroyed during cleanup
  try {
    if (!map.getStyle()) return;
  } catch {
    return;
  }

  const layerIds = [
    SUBJECT_FILL_LAYER_ID,
    SUBJECT_LINE_LAYER_ID,
    COMPS_FILL_LAYER_ID,
    COMPS_LINE_LAYER_ID,
  ];
  layerIds.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  });

  const sourceIds = [SUBJECT_SOURCE_ID, COMPS_SOURCE_ID];
  sourceIds.forEach((sourceId) => {
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  });
};

export function ParcelOverlayLayer({ subjectApn, compApns }: ParcelOverlayProps) {
  const map = useMapOblique();
  const [collection, setCollection] = useState<FeatureCollection>(emptyCollection());
  const [colors, setColors] = useState(() => buildColors());
  const [isZoomEligible, setIsZoomEligible] = useState(false);
  const lastFetchedKeyRef = useRef<string>('');

  const normalizedSubjectApn = subjectApn?.trim() || '';
  const normalizedCompApns = useMemo(
    () => (compApns ?? []).map((value) => value.trim()).filter(Boolean),
    [compApns]
  );

  const apnKey = useMemo(
    () => [normalizedSubjectApn, ...normalizedCompApns].filter(Boolean).join('|'),
    [normalizedSubjectApn, normalizedCompApns]
  );

  useEffect(() => {
    if (!map) return;

    const updateZoom = () => {
      setIsZoomEligible(map.getZoom() >= MIN_PARCEL_ZOOM);
    };

    updateZoom();
    map.on('zoomend', updateZoom);
    map.on('load', updateZoom);

    return () => {
      map.off('zoomend', updateZoom);
      map.off('load', updateZoom);
    };
  }, [map]);

  useEffect(() => {
    setColors(buildColors());
  }, []);

  useEffect(() => {
    let active = true;

    if (!apnKey) {
      setCollection(emptyCollection());
      lastFetchedKeyRef.current = '';
      return () => {
        active = false;
      };
    }

    if (!isZoomEligible) {
      if (lastFetchedKeyRef.current !== apnKey) {
        setCollection(emptyCollection());
      }
      return () => {
        active = false;
      };
    }

    if (lastFetchedKeyRef.current === apnKey && collection.features.length) {
      return () => {
        active = false;
      };
    }

    const loadParcels = async () => {
      const apns = [normalizedSubjectApn, ...normalizedCompApns].filter(Boolean);
      const result = await fetchParcelsByAPN(apns);
      if (!active) return;
      if (!result.features.length) {
        console.warn('No LA County parcel geometry returned for APNs:', apns);
      }
      lastFetchedKeyRef.current = apnKey;
      setCollection(result);
    };

    loadParcels().catch((error) => {
      if (!active) return;
      console.warn('Failed to load LA County parcels:', error);
      setCollection(emptyCollection());
    });

    return () => {
      active = false;
    };
  }, [apnKey, normalizedSubjectApn, normalizedCompApns, isZoomEligible, collection.features.length]);

  useEffect(() => {
    if (!map) return;

    const applyLayers = () => {
      removeLayers(map);

      if (!collection.features.length) {
        return;
      }

      const { subjectFeatures, compFeatures } = splitFeaturesByApn(
        collection,
        normalizedSubjectApn,
        normalizedCompApns
      );

      if (!subjectFeatures.length && !compFeatures.length) {
        return;
      }

      if (subjectFeatures.length) {
        map.addSource(SUBJECT_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: subjectFeatures }
        });
        map.addLayer({
          id: SUBJECT_FILL_LAYER_ID,
          type: 'fill',
          source: SUBJECT_SOURCE_ID,
          minzoom: MIN_PARCEL_ZOOM,
          paint: {
            'fill-color': colors.subjectFill,
            'fill-opacity': 0.65,
            'fill-outline-color': colors.subjectStroke,
          },
        });
        map.addLayer({
          id: SUBJECT_LINE_LAYER_ID,
          type: 'line',
          source: SUBJECT_SOURCE_ID,
          minzoom: MIN_PARCEL_ZOOM,
          paint: {
            'line-color': colors.subjectStroke,
            'line-width': 2.2,
          },
        });
      }

      if (compFeatures.length) {
        map.addSource(COMPS_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: compFeatures }
        });
        map.addLayer({
          id: COMPS_FILL_LAYER_ID,
          type: 'fill',
          source: COMPS_SOURCE_ID,
          minzoom: MIN_PARCEL_ZOOM,
          paint: {
            'fill-color': colors.compFill,
            'fill-opacity': 0.4,
            'fill-outline-color': colors.compStroke,
          },
        });
        map.addLayer({
          id: COMPS_LINE_LAYER_ID,
          type: 'line',
          source: COMPS_SOURCE_ID,
          minzoom: MIN_PARCEL_ZOOM,
          paint: {
            'line-color': colors.compStroke,
            'line-width': 1.4,
          },
        });
      }
    };

    if (!map.isStyleLoaded()) {
      map.once('load', applyLayers);
      return () => {
        map.off('load', applyLayers);
      };
    }

    applyLayers();

    return () => {
      removeLayers(map);
    };
  }, [map, collection, colors, normalizedSubjectApn, normalizedCompApns]);

  return null;
}
