'use client';

/**
 * PlanExtractCanvas — interactive click-to-extract for plan/plat images (D15).
 *
 * The user clicks points around the area to keep; drags to adjust; double-clicks a point
 * to delete it. Everything outside the active outline dims live. Multiple labelled regions
 * are supported (project outline + each parcel). Export produces a transparent PNG per
 * region, cropped to the polygon at the image's full resolution — drape-ready.
 *
 * Ported from the standalone prototype (Plan_Region_Extractor.html, chat ot4) validated
 * with Gregg. This component owns ONLY the extraction interaction; placement +
 * georeferencing happen downstream (control-point drape, see controlPoints.ts).
 *
 * Pure client component; no MapLibre dependency. The image must be CORS-clean (same-origin
 * data URL or a crossorigin-enabled URL) so the export canvas is not tainted.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ImgPoint {
  x: number;
  y: number;
}
export interface ExtractedRegion {
  name: string;
  blob: Blob;
  /** polygon in image-pixel space (for provenance / re-edit) */
  polygon: ImgPoint[];
  /** crop bbox in image-pixel space */
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface Region {
  name: string;
  color: string;
  pts: ImgPoint[];
}

interface Props {
  /** CORS-clean image source (data URL preferred). */
  imageSrc: string;
  /** Called once per region the user exports. */
  onExportRegion: (region: ExtractedRegion) => void;
  onClose?: () => void;
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

export default function PlanExtractCanvas({ imageSrc, onExportRegion, onClose }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const viewRef = useRef({ scale: 1, ox: 0, oy: 0 });
  const dragRef = useRef<{ region: number; index: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const spaceRef = useRef(false);

  const [regions, setRegions] = useState<Region[]>([{ name: 'Project outline', color: COLORS[0], pts: [] }]);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Loading…');

  // keep latest state available to imperative canvas handlers
  const regionsRef = useRef(regions);
  const activeRef = useRef(active);
  regionsRef.current = regions;
  activeRef.current = active;

  const baseScale = useCallback(() => {
    const img = imgRef.current, cv = canvasRef.current;
    if (!img || !cv) return 1;
    const m = 30;
    return Math.min((cv.width - 2 * m) / img.naturalWidth, (cv.height - 2 * m) / img.naturalHeight);
  }, []);

  const toScreen = (p: ImgPoint) => {
    const v = viewRef.current;
    return { x: p.x * v.scale + v.ox, y: p.y * v.scale + v.oy };
  };
  const toImage = (sx: number, sy: number) => {
    const v = viewRef.current;
    return { x: (sx - v.ox) / v.scale, y: (sy - v.oy) / v.scale };
  };

  const draw = useCallback(() => {
    const cv = canvasRef.current, img = imgRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#0c0f15';
    ctx.fillRect(0, 0, cv.width, cv.height);
    if (!img || !img.naturalWidth) return;
    const v = viewRef.current;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, v.ox, v.oy, img.naturalWidth * v.scale, img.naturalHeight * v.scale);

    const rs = regionsRef.current;
    const A = rs[activeRef.current];
    if (A && A.pts.length >= 3) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, cv.width, cv.height);
      A.pts.forEach((p, i) => {
        const s = toScreen(p);
        i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(8,11,17,.6)';
      ctx.fill('evenodd');
      ctx.restore();
    }

    rs.forEach((R, ri) => {
      if (!R.pts.length) return;
      const on = ri === activeRef.current;
      ctx.lineWidth = on ? 2.5 : 1.5;
      ctx.strokeStyle = R.color;
      ctx.fillStyle = R.color + '22';
      ctx.beginPath();
      R.pts.forEach((p, i) => {
        const s = toScreen(p);
        i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y);
      });
      if (R.pts.length >= 3) {
        ctx.closePath();
        ctx.fill();
      }
      ctx.stroke();
      R.pts.forEach((p) => {
        const s = toScreen(p);
        ctx.beginPath();
        ctx.arc(s.x, s.y, on ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = on ? '#fff' : R.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = R.color;
        ctx.stroke();
      });
    });
  }, []);

  const fitView = useCallback(() => {
    const img = imgRef.current, cv = canvasRef.current;
    if (!img || !cv) return;
    const s = baseScale();
    viewRef.current = {
      scale: s,
      ox: (cv.width - img.naturalWidth * s) / 2,
      oy: (cv.height - img.naturalHeight * s) / 2,
    };
    draw();
  }, [baseScale, draw]);

  const resize = useCallback(() => {
    const cv = canvasRef.current, stage = stageRef.current;
    if (!cv || !stage) return;
    cv.width = stage.clientWidth;
    cv.height = stage.clientHeight;
    draw();
  }, [draw]);

  // load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setReady(true);
      setStatus(`${img.naturalWidth}×${img.naturalHeight} px`);
      resize();
      fitView();
    };
    img.onerror = () => setStatus('Could not load image (check CORS).');
    img.src = imageSrc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc]);

  useEffect(() => {
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  useEffect(() => { draw(); }, [regions, active, draw]);

  // ---- hit testing
  const hitVertex = (sx: number, sy: number): { region: number; index: number } | null => {
    const rs = regionsRef.current;
    for (let ri = 0; ri < rs.length; ri++) {
      for (let i = 0; i < rs[ri].pts.length; i++) {
        const s = toScreen(rs[ri].pts[i]);
        if (Math.hypot(s.x - sx, s.y - sy) < 9) return { region: ri, index: i };
      }
    }
    return null;
  };

  // ---- mouse handlers
  const onMouseDown = (e: React.MouseEvent) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    if (e.button === 2 || spaceRef.current) {
      const v = viewRef.current;
      panRef.current = { x: e.clientX, y: e.clientY, ox: v.ox, oy: v.oy };
      return;
    }
    const h = hitVertex(sx, sy);
    if (h) {
      setActive(h.region);
      dragRef.current = h;
      return;
    }
    const p = toImage(sx, sy);
    setRegions((prev) => {
      const next = prev.map((R) => ({ ...R, pts: [...R.pts] }));
      next[activeRef.current].pts.push(p);
      return next;
    });
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (panRef.current) {
        const v = viewRef.current;
        v.ox = panRef.current.ox + (e.clientX - panRef.current.x);
        v.oy = panRef.current.oy + (e.clientY - panRef.current.y);
        draw();
        return;
      }
      if (dragRef.current) {
        const cv = canvasRef.current;
        if (!cv) return;
        const r = cv.getBoundingClientRect();
        const p = toImage(e.clientX - r.left, e.clientY - r.top);
        const d = dragRef.current;
        setRegions((prev) => {
          const next = prev.map((R) => ({ ...R, pts: [...R.pts] }));
          next[d.region].pts[d.index] = p;
          return next;
        });
      }
    };
    const onUp = () => { dragRef.current = null; panRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [draw]);

  const onDoubleClick = (e: React.MouseEvent) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const h = hitVertex(e.clientX - r.left, e.clientY - r.top);
    if (h) {
      setRegions((prev) => {
        const next = prev.map((R) => ({ ...R, pts: [...R.pts] }));
        next[h.region].pts.splice(h.index, 1);
        return next;
      });
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    const before = toImage(sx, sy);
    const v = viewRef.current;
    v.scale *= e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const after = toImage(sx, sy);
    v.ox += (after.x - before.x) * v.scale;
    v.oy += (after.y - before.y) * v.scale;
    draw();
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => { if (e.code === 'Space') spaceRef.current = true; };
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space') spaceRef.current = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  // ---- region ops
  const addRegion = () =>
    setRegions((prev) => {
      const c = COLORS[prev.length % COLORS.length];
      const next = [...prev, { name: `Parcel ${prev.length}`, color: c, pts: [] }];
      setActive(next.length - 1);
      return next;
    });
  const undoPoint = () =>
    setRegions((prev) => {
      const next = prev.map((R) => ({ ...R, pts: [...R.pts] }));
      next[activeRef.current].pts.pop();
      return next;
    });
  const clearRegion = () =>
    setRegions((prev) => {
      const next = prev.map((R) => ({ ...R, pts: [...R.pts] }));
      next[activeRef.current].pts = [];
      return next;
    });
  const renameRegion = (i: number, name: string) =>
    setRegions((prev) => prev.map((R, ri) => (ri === i ? { ...R, name } : R)));

  // ---- export
  const cropRegion = (R: Region): ExtractedRegion | null => {
    const img = imgRef.current;
    if (!img || R.pts.length < 3) return null;
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    R.pts.forEach((p) => {
      minx = Math.min(minx, p.x); miny = Math.min(miny, p.y);
      maxx = Math.max(maxx, p.x); maxy = Math.max(maxy, p.y);
    });
    minx = Math.max(0, Math.floor(minx)); miny = Math.max(0, Math.floor(miny));
    maxx = Math.min(img.naturalWidth, Math.ceil(maxx)); maxy = Math.min(img.naturalHeight, Math.ceil(maxy));
    const w = maxx - minx, h = maxy - miny;
    if (w <= 0 || h <= 0) return null;
    const oc = document.createElement('canvas');
    oc.width = w; oc.height = h;
    const o = oc.getContext('2d');
    if (!o) return null;
    o.beginPath();
    R.pts.forEach((p, i) => (i ? o.lineTo(p.x - minx, p.y - miny) : o.moveTo(p.x - minx, p.y - miny)));
    o.closePath();
    o.clip();
    o.drawImage(img, -minx, -miny);
    return {
      name: R.name,
      blob: new Blob(), // replaced below
      polygon: R.pts.map((p) => ({ ...p })),
      bbox: { x0: minx, y0: miny, x1: maxx, y1: maxy },
      _canvas: oc,
    } as ExtractedRegion & { _canvas: HTMLCanvasElement };
  };

  const emit = (R: Region) => {
    const res = cropRegion(R) as (ExtractedRegion & { _canvas?: HTMLCanvasElement }) | null;
    if (!res || !res._canvas) return;
    res._canvas.toBlob((b) => {
      if (b) onExportRegion({ name: res.name, blob: b, polygon: res.polygon, bbox: res.bbox });
    }, 'image/png');
  };
  const exportActive = () => emit(regionsRef.current[activeRef.current]);
  const exportAll = () => regionsRef.current.forEach((R) => R.pts.length >= 3 && emit(R));

  // ---- styles (CoreUI tokens)
  const panel: React.CSSProperties = {
    width: 270, flex: '0 0 270px', background: 'var(--cui-tertiary-bg, #1b2230)',
    borderRight: '1px solid var(--cui-border-color)', padding: 14, overflowY: 'auto', color: 'var(--cui-body-color)',
  };
  const btn = 'btn btn-sm';

  return (
    <div className="d-flex" style={{ height: '100%', background: 'var(--cui-body-bg)' }}>
      <div style={panel}>
        <div className="d-flex justify-content-between align-items-center mb-1">
          <strong>Extract region</strong>
          {onClose && <button className="btn btn-sm btn-ghost-secondary" onClick={onClose}>✕</button>}
        </div>
        <div className="text-medium-emphasis mb-3" style={{ fontSize: 12 }}>
          Click points around the area to keep. Drag a point to adjust, double-click to delete.
        </div>

        <div className="mb-2" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>Regions</div>
        <ul className="list-unstyled mb-2">
          {regions.map((R, ri) => (
            <li
              key={ri}
              onClick={() => setActive(ri)}
              className="d-flex align-items-center gap-2 p-2 mb-1"
              style={{
                border: `1px solid ${ri === active ? 'var(--cui-primary)' : 'var(--cui-border-color)'}`,
                borderRadius: 7, cursor: 'pointer',
              }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 3, background: R.color, flex: '0 0 12px' }} />
              <input
                value={R.name}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => renameRegion(ri, e.target.value)}
                className="flex-grow-1"
                style={{ background: 'transparent', border: 'none', color: 'var(--cui-body-color)', font: 'inherit', padding: 0 }}
              />
              <span className="text-medium-emphasis" style={{ fontSize: 12 }}>{R.pts.length}</span>
            </li>
          ))}
        </ul>
        <button className={`${btn} btn-secondary w-100 mb-3`} onClick={addRegion}>+ New region (parcel)</button>

        <div className="d-flex gap-2 mb-2">
          <button className={`${btn} btn-secondary`} onClick={undoPoint}>Undo point</button>
          <button className={`${btn} btn-secondary`} onClick={clearRegion}>Clear</button>
          <button className={`${btn} btn-secondary`} onClick={fitView}>Fit</button>
        </div>

        <button className={`${btn} btn-success w-100 mb-2`} onClick={exportActive} disabled={!ready}>
          Use this region →
        </button>
        <button className={`${btn} btn-ghost-secondary w-100`} onClick={exportAll} disabled={!ready}>
          Export all regions
        </button>
        <div className="text-medium-emphasis mt-3" style={{ fontSize: 11 }}>
          Scroll = zoom · Space-drag or right-drag = pan
        </div>
      </div>

      <div ref={stageRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0c0f15' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onDoubleClick={onDoubleClick}
          onWheel={onWheel}
          onContextMenu={(e) => e.preventDefault()}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
        <div style={{ position: 'absolute', top: 10, left: 10, padding: '4px 9px', borderRadius: 7, background: 'rgba(20,26,36,.85)', color: 'var(--cui-medium-emphasis-color, #9aa7ba)', fontSize: 12 }}>
          {status}
        </div>
      </div>
    </div>
  );
}
