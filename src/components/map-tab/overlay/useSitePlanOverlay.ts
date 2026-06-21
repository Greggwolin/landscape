/**
 * useSitePlanOverlay — drive a draggable, snap-to-parcel image drape on a MapLibre map.
 *
 * Site-plan overlay "first slice" (snap + pin). Given an existing map instance, an
 * image URL, and (optionally) parcel geometry to snap against, this hook:
 *   - drapes the image as a four-corner quad (see lib/gis/imageOverlay)
 *   - renders four draggable corner handles
 *   - snaps a dragged handle to the nearest parcel vertex/edge (see lib/gis/snapIndex)
 *   - exposes opacity + rotation + getCorners for the controls UI and save path
 *
 * Map-surface-agnostic: works with the chat-first MapArtifactRenderer map or the
 * legacy MapTab/MapCanvas map. Persistence is the caller's job (onChange / getState).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MlMap, type Marker } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import {
  addImageOverlay,
  defaultCorners,
  rotateCorners,
  type Corners,
  type OverlayHandle,
} from '@/lib/gis/imageOverlay';
import { buildSnapIndex, emptySnapIndex, type SnapIndex } from '@/lib/gis/snapIndex';

export interface SitePlanOverlayState {
  corners: Corners;
  opacity: number;
  rotationDeg: number;
}

export interface UseSitePlanOverlayOptions {
  map: MlMap | null;
  imageUrl: string | null;
  /** Parcel geometry to snap handles to. Null/empty → free drag, no snapping. */
  parcels?: FeatureCollection | null;
  /** Insert the drape beneath this layer id (e.g. parcel outlines) if it exists. */
  beneathLayerId?: string;
  initial?: Partial<SitePlanOverlayState>;
  /** Pixel tolerance for snapping. Default 12. */
  snapTolerancePx?: number;
  onChange?: (state: SitePlanOverlayState) => void;
}

export interface UseSitePlanOverlayResult {
  ready: boolean;
  opacity: number;
  rotationDeg: number;
  /** Whether the most recent handle drag landed on a parcel line/vertex. */
  lastSnapped: boolean;
  setOpacity: (value: number) => void;
  setRotation: (deg: number) => void;
  /** Externally drive the four corners (control-point georeference preview, D16). */
  setCorners: (corners: Corners) => void;
  getState: () => SitePlanOverlayState;
}

const HANDLE_COLOR = '#2f6db0';
const HANDLE_SNAP_COLOR = '#2e9c6f';

function makeHandleEl(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = '16px';
  el.style.height = '16px';
  el.style.boxSizing = 'border-box';
  el.style.borderRadius = '50%';
  el.style.background = HANDLE_COLOR;
  el.style.border = '2px solid #fff';
  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.45)';
  el.style.cursor = 'grab';
  el.dataset.snapped = 'false';
  return el;
}

export function useSitePlanOverlay(
  opts: UseSitePlanOverlayOptions
): UseSitePlanOverlayResult {
  const { map, imageUrl, parcels, beneathLayerId, initial, snapTolerancePx = 12, onChange } = opts;

  const overlayRef = useRef<OverlayHandle | null>(null);
  const handlesRef = useRef<Marker[]>([]);
  const cornersRef = useRef<Corners | null>(null);
  const snapIndexRef = useRef<SnapIndex>(emptySnapIndex());
  const rotationRef = useRef<number>(initial?.rotationDeg ?? 0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [ready, setReady] = useState(false);
  const [opacity, setOpacityState] = useState<number>(initial?.opacity ?? 0.7);
  const [rotationDeg, setRotationState] = useState<number>(initial?.rotationDeg ?? 0);
  const [lastSnapped, setLastSnapped] = useState(false);

  // Rebuild snap index when parcels change.
  useEffect(() => {
    snapIndexRef.current = parcels ? buildSnapIndex(parcels) : emptySnapIndex();
  }, [parcels]);

  const emitChange = useCallback(() => {
    if (!cornersRef.current) return;
    onChangeRef.current?.({
      corners: cornersRef.current,
      opacity,
      rotationDeg: rotationRef.current,
    });
  }, [opacity]);

  // Sync a single corner from its handle's position, applying snap.
  const handleDrag = useCallback(
    (index: number, marker: Marker) => {
      if (!map || !cornersRef.current || !overlayRef.current) return;
      const ll = marker.getLngLat();
      const snap = snapIndexRef.current.snap({ lng: ll.lng, lat: ll.lat }, map, snapTolerancePx);

      const el = marker.getElement();
      if (snap) {
        marker.setLngLat([snap.lngLat.lng, snap.lngLat.lat]);
        el.style.background = HANDLE_SNAP_COLOR;
        el.dataset.snapped = 'true';
        setLastSnapped(true);
      } else {
        el.style.background = HANDLE_COLOR;
        el.dataset.snapped = 'false';
        setLastSnapped(false);
      }

      const finalLl = marker.getLngLat();
      const next = cornersRef.current.map((c, i) =>
        i === index ? ([finalLl.lng, finalLl.lat] as [number, number]) : c
      ) as Corners;
      cornersRef.current = next;
      overlayRef.current.setCorners(next);
    },
    [map, snapTolerancePx]
  );

  // Build the overlay + handles once the map + image are ready.
  useEffect(() => {
    if (!map || !imageUrl) return;
    let cancelled = false;

    const setup = () => {
      if (cancelled || !map.isStyleLoaded()) return;

      const startCorners: Corners =
        initial?.corners ?? defaultCorners(map.getCenter().toArray() as [number, number]);
      cornersRef.current = startCorners;

      overlayRef.current = addImageOverlay(map, {
        id: 'active',
        url: imageUrl,
        corners: startCorners,
        opacity: initial?.opacity ?? 0.7,
        beforeId: beneathLayerId,
      });

      // Four draggable corner handles.
      handlesRef.current = startCorners.map((corner, index) => {
        const marker = new maplibregl.Marker({ element: makeHandleEl(), draggable: true })
          .setLngLat(corner)
          .addTo(map);
        marker.on('drag', () => handleDrag(index, marker));
        marker.on('dragend', () => emitChange());
        return marker;
      });

      setReady(true);
    };

    if (map.isStyleLoaded()) setup();
    else map.once('load', setup);

    return () => {
      cancelled = true;
      handlesRef.current.forEach((m) => m.remove());
      handlesRef.current = [];
      overlayRef.current?.remove();
      overlayRef.current = null;
      cornersRef.current = null;
      setReady(false);
    };
    // imageUrl + map identity drive (re)build; handlers read refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, imageUrl, beneathLayerId]);

  const setOpacity = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(1, value));
      setOpacityState(clamped);
      overlayRef.current?.setOpacity(clamped);
      if (cornersRef.current) {
        onChangeRef.current?.({
          corners: cornersRef.current,
          opacity: clamped,
          rotationDeg: rotationRef.current,
        });
      }
    },
    []
  );

  // Rotation is absolute (deg from original). Apply delta from the previous rotation.
  const setRotation = useCallback(
    (deg: number) => {
      if (!cornersRef.current || !overlayRef.current) {
        rotationRef.current = deg;
        setRotationState(deg);
        return;
      }
      const delta = deg - rotationRef.current;
      const next = rotateCorners(cornersRef.current, delta);
      cornersRef.current = next;
      overlayRef.current.setCorners(next);
      // Move handles to follow rotated corners.
      handlesRef.current.forEach((m, i) => m.setLngLat(next[i]));
      rotationRef.current = deg;
      setRotationState(deg);
      onChangeRef.current?.({ corners: next, opacity, rotationDeg: deg });
    },
    [opacity]
  );

  const getState = useCallback(
    (): SitePlanOverlayState => ({
      corners: cornersRef.current ?? defaultCorners([0, 0]),
      opacity,
      rotationDeg: rotationRef.current,
    }),
    [opacity]
  );

  // Externally set all four corners (control-point georeference preview, D16).
  // Mirrors setRotation's corner+handle sync; no-op until the overlay is built.
  const setCorners = useCallback(
    (next: Corners) => {
      if (!cornersRef.current || !overlayRef.current) return;
      cornersRef.current = next;
      overlayRef.current.setCorners(next);
      handlesRef.current.forEach((m, i) => m.setLngLat(next[i]));
      onChangeRef.current?.({ corners: next, opacity, rotationDeg: rotationRef.current });
    },
    [opacity]
  );

  return { ready, opacity, rotationDeg, lastSnapped, setOpacity, setRotation, setCorners, getState };
}
