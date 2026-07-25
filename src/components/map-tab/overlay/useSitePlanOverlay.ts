/**
 * useSitePlanOverlay — drive a draggable, snap-to-parcel image drape on a MapLibre map.
 *
 * Site-plan overlay drape editor. Given an existing map instance, an image URL, and
 * (optionally) parcel geometry to snap against, this hook:
 *   - drapes the image as a four-corner quad (see lib/gis/imageOverlay)
 *   - renders four draggable corner handles
 *   - snaps a dragged handle to the nearest parcel vertex/edge (see lib/gis/snapIndex)
 *   - exposes opacity + rotation + scale + lock + warp-mode + getState for controls/save
 *
 * SS14 additions (all additive; the 4-corner "quad" path is unchanged and default):
 *   - scale: discrete uniform scale of the quad about its centroid
 *   - locked: freeze the transform (handles non-draggable, rotate/scale/setCorners no-op)
 *   - warpMode 'quad'|'tps': 'tps' renders a thin-plate-spline rubber-sheet warp
 *     (lib/gis/tpsOverlay) solved from the control points, as a SEPARATE canvas overlay;
 *     the quad image layer + handles are hidden while TPS is active. Falls back to quad
 *     when there are too few control points to solve a warp.
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
  scaleCorners,
  type Corners,
  type OverlayHandle,
} from '@/lib/gis/imageOverlay';
import { addTpsOverlay, type TpsOverlayHandle } from '@/lib/gis/tpsOverlay';
import { solveTps, type ControlPoint } from '@/lib/gis/controlPoints';
import { buildSnapIndex, emptySnapIndex, type SnapIndex } from '@/lib/gis/snapIndex';

export type WarpMode = 'quad' | 'tps';

export interface SitePlanOverlayState {
  corners: Corners;
  opacity: number;
  rotationDeg: number;
  /** Discrete uniform scale factor applied to the quad about its centroid (SS14). */
  scale: number;
  /** Frozen transform — no drag/rotate/scale (SS14). */
  locked: boolean;
  /** 'quad' = 4-corner image drape (default); 'tps' = rubber-sheet warp (SS14). */
  warpMode: WarpMode;
}

/** A control point (image pixel ↔ map lng/lat) used to solve the TPS warp. */
export interface OverlayControlPointInput {
  img: { x: number; y: number };
  map: [number, number];
  snapped?: boolean;
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
  /** Control points for the TPS warp mode (SS14). Ignored in quad mode. */
  controlPoints?: OverlayControlPointInput[];
  /** Extracted-image pixel dimensions — required to solve the TPS warp (SS14). */
  imgDims?: { w: number; h: number } | null;
  onChange?: (state: SitePlanOverlayState) => void;
}

export interface UseSitePlanOverlayResult {
  ready: boolean;
  opacity: number;
  rotationDeg: number;
  scale: number;
  locked: boolean;
  warpMode: WarpMode;
  /** Whether the most recent handle drag landed on a parcel line/vertex. */
  lastSnapped: boolean;
  setOpacity: (value: number) => void;
  setRotation: (deg: number) => void;
  setScale: (factor: number) => void;
  setLocked: (locked: boolean) => void;
  setWarpMode: (mode: WarpMode) => void;
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
  const {
    map, imageUrl, parcels, beneathLayerId, initial, snapTolerancePx = 12,
    controlPoints, imgDims, onChange,
  } = opts;

  const overlayRef = useRef<OverlayHandle | null>(null);
  const handlesRef = useRef<Marker[]>([]);
  const cornersRef = useRef<Corners | null>(null);
  const snapIndexRef = useRef<SnapIndex>(emptySnapIndex());
  const rotationRef = useRef<number>(initial?.rotationDeg ?? 0);
  const scaleRef = useRef<number>(initial?.scale ?? 1);
  const lockedRef = useRef<boolean>(initial?.locked ?? false);
  const warpModeRef = useRef<WarpMode>(initial?.warpMode ?? 'quad');
  const tpsRef = useRef<TpsOverlayHandle | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [ready, setReady] = useState(false);
  const [opacity, setOpacityState] = useState<number>(initial?.opacity ?? 0.7);
  const [rotationDeg, setRotationState] = useState<number>(initial?.rotationDeg ?? 0);
  const [scale, setScaleState] = useState<number>(initial?.scale ?? 1);
  const [locked, setLockedState] = useState<boolean>(initial?.locked ?? false);
  const [warpMode, setWarpModeState] = useState<WarpMode>(initial?.warpMode ?? 'quad');
  const [lastSnapped, setLastSnapped] = useState(false);

  // Rebuild snap index when parcels change.
  useEffect(() => {
    snapIndexRef.current = parcels ? buildSnapIndex(parcels) : emptySnapIndex();
  }, [parcels]);

  // Single emit point — always reports the FULL transform state from the refs so
  // every mutator (opacity/rotation/scale/lock/warp/corners) persists consistently.
  const emitState = useCallback(() => {
    if (!cornersRef.current) return;
    onChangeRef.current?.({
      corners: cornersRef.current,
      opacity,
      rotationDeg: rotationRef.current,
      scale: scaleRef.current,
      locked: lockedRef.current,
      warpMode: warpModeRef.current,
    });
  }, [opacity]);

  // Sync a single corner from its handle's position, applying snap.
  const handleDrag = useCallback(
    (index: number, marker: Marker) => {
      if (lockedRef.current) return; // frozen — ignore drags
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

  // Show/hide the quad image layer + handles (TPS mode owns the surface instead).
  const setQuadVisible = useCallback((visible: boolean) => {
    if (map && overlayRef.current && map.getLayer(overlayRef.current.layerId)) {
      map.setLayoutProperty(overlayRef.current.layerId, 'visibility', visible ? 'visible' : 'none');
    }
    handlesRef.current.forEach((m) => {
      m.getElement().style.display = visible ? '' : 'none';
    });
  }, [map]);

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
        const marker = new maplibregl.Marker({
          element: makeHandleEl(),
          draggable: !lockedRef.current,
        })
          .setLngLat(corner)
          .addTo(map);
        marker.on('drag', () => handleDrag(index, marker));
        marker.on('dragend', () => emitState());
        return marker;
      });

      // Restore a persisted TPS mode on (re)build: the TPS effect will render it and
      // hide the quad; until then keep the quad visible so nothing flashes empty.
      if (warpModeRef.current === 'tps') setQuadVisible(false);

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
      tpsRef.current?.remove();
      tpsRef.current = null;
      cornersRef.current = null;
      setReady(false);
    };
    // imageUrl + map identity drive (re)build; handlers read refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, imageUrl, beneathLayerId]);

  // TPS warp overlay — active only in 'tps' mode with enough control points.
  useEffect(() => {
    if (!map || !imageUrl || !ready) return;
    const wantTps = warpMode === 'tps';
    const pts = controlPoints ?? [];

    if (wantTps && imgDims && pts.length >= 3) {
      try {
        const { warp } = solveTps(imgDims.w, imgDims.h, pts as ControlPoint[]);
        if (tpsRef.current) {
          tpsRef.current.setWarp(warp, imgDims.w, imgDims.h);
        } else {
          tpsRef.current = addTpsOverlay(map, {
            id: 'active',
            imageUrl,
            warp,
            imgWidth: imgDims.w,
            imgHeight: imgDims.h,
            opacity,
            beforeId: beneathLayerId,
          });
        }
        setQuadVisible(false); // hide the quad drape + handles while TPS renders
        return;
      } catch {
        // Too few / degenerate points → fall through to quad below.
      }
    }

    // Quad mode (or TPS unavailable): tear down any TPS overlay, restore the quad.
    if (tpsRef.current) {
      tpsRef.current.remove();
      tpsRef.current = null;
    }
    setQuadVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, imageUrl, ready, warpMode, controlPoints, imgDims, beneathLayerId]);

  const setOpacity = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(1, value));
      setOpacityState(clamped);
      overlayRef.current?.setOpacity(clamped);
      tpsRef.current?.setOpacity(clamped);
      if (cornersRef.current) {
        onChangeRef.current?.({
          corners: cornersRef.current,
          opacity: clamped,
          rotationDeg: rotationRef.current,
          scale: scaleRef.current,
          locked: lockedRef.current,
          warpMode: warpModeRef.current,
        });
      }
    },
    []
  );

  // Rotation is absolute (deg from original). Apply delta from the previous rotation.
  const setRotation = useCallback(
    (deg: number) => {
      if (lockedRef.current) return;
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
      emitState();
    },
    [emitState]
  );

  // Scale is absolute (factor from original). Apply the delta from the previous scale
  // about the quad centroid, mirroring setRotation. No-op when locked.
  const setScale = useCallback(
    (factor: number) => {
      if (lockedRef.current) return;
      const f = factor > 0 ? factor : 1e-6;
      if (!cornersRef.current || !overlayRef.current) {
        scaleRef.current = f;
        setScaleState(f);
        return;
      }
      const delta = f / (scaleRef.current || 1);
      const next = scaleCorners(cornersRef.current, delta);
      cornersRef.current = next;
      overlayRef.current.setCorners(next);
      handlesRef.current.forEach((m, i) => m.setLngLat(next[i]));
      scaleRef.current = f;
      setScaleState(f);
      emitState();
    },
    [emitState]
  );

  const setLocked = useCallback(
    (value: boolean) => {
      lockedRef.current = value;
      setLockedState(value);
      handlesRef.current.forEach((m) => m.setDraggable(!value));
      emitState();
    },
    [emitState]
  );

  const setWarpMode = useCallback(
    (mode: WarpMode) => {
      warpModeRef.current = mode;
      setWarpModeState(mode);
      emitState();
    },
    [emitState]
  );

  const getState = useCallback(
    (): SitePlanOverlayState => ({
      corners: cornersRef.current ?? defaultCorners([0, 0]),
      opacity,
      rotationDeg: rotationRef.current,
      scale: scaleRef.current,
      locked: lockedRef.current,
      warpMode: warpModeRef.current,
    }),
    [opacity]
  );

  // Externally set all four corners (control-point georeference preview, D16).
  // Mirrors setRotation's corner+handle sync; no-op until the overlay is built or
  // when the transform is locked.
  const setCorners = useCallback(
    (next: Corners) => {
      if (lockedRef.current) return;
      if (!cornersRef.current || !overlayRef.current) return;
      cornersRef.current = next;
      overlayRef.current.setCorners(next);
      handlesRef.current.forEach((m, i) => m.setLngLat(next[i]));
      emitState();
    },
    [emitState]
  );

  return {
    ready, opacity, rotationDeg, scale, locked, warpMode, lastSnapped,
    setOpacity, setRotation, setScale, setLocked, setWarpMode, setCorners, getState,
  };
}
