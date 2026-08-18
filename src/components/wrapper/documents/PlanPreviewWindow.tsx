'use client';

/**
 * The preview window — what was recovered from a drawing, before anything is
 * placed on a map.
 *
 * A final plat is drawn across several sheets and the recovery succeeds
 * unevenly across them. Until this existed the only report of that was four
 * numbers in a sentence, which cannot say which sheet the unmeasured lots came
 * from or whether a whole sheet recovered nothing — and that stays hidden right
 * up until lots are drawn on a map, where a missing sheet looks like a hole in
 * the subdivision and gets diagnosed as a mapping fault.
 *
 * So: one sheet at a time, the drawing with its recovered lots shaded light
 * red over it, and each sheet's own arithmetic stated in plain language. The
 * shading is translucent on purpose — the entire point is comparing it against
 * the drawing's own lot lines underneath, and an opaque fill would hide the
 * thing you came to check.
 *
 * Draping is manual work — trace, pin, verify, once per sheet — so the Drape
 * button lives here, next to the evidence of whether this sheet is worth the
 * effort. It starts the shipped workflow and does not reimplement any of it.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/lib/authHeaders';
import { setPendingPlanExtract } from '@/lib/gis/planExtractBridge';

const DJANGO_API = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface PreviewLot {
  number: number;
  source: 'traced' | 'rebuilt';
  measured: boolean;
  ring: [number, number][];
}

interface PreviewSheet {
  page_index: number;
  pdf_page: number;
  sheet_number: number | null;
  sheet_label: string;
  numbering_known: boolean;
  numbering_disagrees: boolean;
  page_width_pts: number;
  page_height_pts: number;
  render_dpi: number;
  render_zoom: number;
  counts: { recovered: number; traced: number; rebuilt: number; measured: number };
  already_draped: boolean;
  overlay_id: number | null;
  lots: PreviewLot[];
  image_url: string;
}

interface PreviewPayload {
  doc_id: number;
  doc_name: string;
  project_id: number;
  page_count: number;
  render_dpi: number;
  scale_ft_per_inch: number;
  scale_is_round: boolean;
  sheets: PreviewSheet[];
  excluded_sheets: { pdf_page: number; sheet_label: string; reason: string }[];
  totals: {
    scheduled: number; recovered: number; traced: number;
    rebuilt: number; measured: number; no_outline: number; reconciles: boolean;
  };
  unplaced: { count: number; note: string; lot_numbers: number[] };
}

function ringToPoints(ring: [number, number][]): string {
  return ring.map(([x, y]) => `${x},${y}`).join(' ');
}

export function PlanPreviewWindow({ docId, onClose }: { docId: string; onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<PreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [images, setImages] = useState<Record<number, string>>({});
  const [imageError, setImageError] = useState<string | null>(null);
  // The fetched PNG per sheet, kept so the Drape hand-off reuses the bytes the
  // window already downloaded rather than fetching the same sheet twice.
  const blobs = useRef<Record<number, Blob>>({});
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(
          `${DJANGO_API}/api/knowledge/documents/${docId}/plan-preview/`,
          { headers: getAuthHeaders() },
        );
        const body = await res.json().catch(() => null);
        if (!live) return;
        if (!res.ok) {
          setError(body?.error ?? 'The drawing could not be read.');
          return;
        }
        setData(body);
      } catch {
        if (live) setError('The step that reads the drawing could not be reached.');
      }
    })();
    return () => { live = false; };
  }, [docId]);

  const sheet: PreviewSheet | undefined = data?.sheets[index];

  // Sheet images need the bearer token, and <img src> cannot carry one — so
  // each sheet is fetched, held as a blob, and shown from an object URL. One
  // sheet at a time, on demand: rendering all seven up front is what would
  // make this expensive.
  useEffect(() => {
    if (!sheet || images[sheet.pdf_page]) return;
    let live = true;
    (async () => {
      try {
        const res = await fetch(`${DJANGO_API}${sheet.image_url}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (!live) return;
        blobs.current[sheet.pdf_page] = blob;
        const url = URL.createObjectURL(blob);
        objectUrls.current.push(url);
        setImages((prev) => ({ ...prev, [sheet.pdf_page]: url }));
        setImageError(null);
      } catch {
        if (live) setImageError('This sheet could not be rendered.');
      }
    })();
    return () => { live = false; };
  }, [sheet, images]);

  useEffect(() => () => { objectUrls.current.forEach(URL.revokeObjectURL); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, (data?.sheets.length ?? 1) - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, data]);

  /** Hand this sheet to the drape workflow that already exists. */
  const handleDrape = useCallback(async () => {
    if (!sheet || !data) return;
    const blob = blobs.current[sheet.pdf_page];
    if (!blob) return;
    // MapTab fetches the payload URL with no Authorization header, so it
    // cannot be handed this endpoint's URL — it would 401. A data URL of the
    // bytes already downloaded needs no auth and no second request.
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.readAsDataURL(blob);
    });
    if (!dataUrl) return;
    // Latch, navigate, then fire — the same order the chat path uses, so this
    // works whether the map is already mounted (the event) or mounts after
    // navigation (the latch drains on mount).
    setPendingPlanExtract({
      kind: 'canvas',
      payload: { url: dataUrl, sourceDocId: Number(docId), sourcePage: sheet.pdf_page },
    });
    onClose();
    router.push(`/w/projects/${data.project_id}/map`);
    window.dispatchEvent(new CustomEvent('landscaper:extract_plan_canvas'));
  }, [sheet, data, docId, onClose, router]);

  const totals = data?.totals;
  const shading = useMemo(() => ({
    traced: { fill: 'rgba(220, 38, 38, 0.22)', stroke: 'rgba(190, 24, 24, 0.85)' },
    rebuilt: { fill: 'rgba(220, 38, 38, 0.10)', stroke: 'rgba(190, 24, 24, 0.55)' },
  }), []);

  return (
    <div className="w-plan-preview-scrim" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-plan-preview" onClick={(e) => e.stopPropagation()}>
        <header className="w-plan-preview-head">
          <div>
            <h2 className="w-plan-preview-title">Proposed geometry</h2>
            {data && <p className="w-plan-preview-sub">{data.doc_name}</p>}
          </div>
          <button className="w-plan-preview-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        {error && <p className="w-plan-preview-error">{error}</p>}
        {!data && !error && (
          <p className="w-plan-preview-loading">
            Reading the drawing… this takes about twenty seconds on a plat this size.
          </p>
        )}

        {data && data.sheets.length === 0 && (
          <p className="w-plan-preview-error">
            No sheet of this drawing carries lots, so there is no geometry to preview.
          </p>
        )}

        {data && sheet && (
          <>
            <nav className="w-plan-preview-nav">
              <button disabled={index === 0} onClick={() => setIndex(index - 1)}>‹</button>
              <span className="w-plan-preview-sheet-label">
                {sheet.sheet_label}
                {sheet.numbering_disagrees && (
                  <em className="w-plan-preview-warn">
                    {' '}— printed as {sheet.sheet_number}, but sits at position {sheet.pdf_page} in the file
                  </em>
                )}
                {!sheet.numbering_disagrees && sheet.numbering_known && (
                  <span className="w-plan-preview-dim"> (page {sheet.pdf_page} of {data.page_count})</span>
                )}
              </span>
              <button
                disabled={index === data.sheets.length - 1}
                onClick={() => setIndex(index + 1)}
              >›</button>
              <span className="w-plan-preview-dots">
                {data.sheets.map((s, i) => (
                  <button
                    key={s.pdf_page}
                    className={i === index ? 'is-current' : ''}
                    onClick={() => setIndex(i)}
                    aria-label={s.sheet_label}
                  />
                ))}
              </span>
              <span className="w-plan-preview-zoom">
                <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>−</button>
                <span>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>+</button>
              </span>
            </nav>

            <div className="w-plan-preview-stage">
              {imageError && <p className="w-plan-preview-error">{imageError}</p>}
              <div className="w-plan-preview-canvas" style={{ width: `${zoom * 100}%` }}>
                {images[sheet.pdf_page] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={images[sheet.pdf_page]} alt={sheet.sheet_label} />
                ) : (
                  !imageError && <p className="w-plan-preview-loading">Rendering this sheet…</p>
                )}
                {/* The overlay's viewBox IS page-point space, so the polygons
                    scale with the image no matter what zoom the sheet was
                    rendered at. Multiplying by a hard-coded factor is how the
                    shading ends up slightly off the lot lines and looks like a
                    bad recovery. The render dpi is stated in the response for a
                    client that does scale by hand. */}
                <svg
                  className="w-plan-preview-overlay"
                  viewBox={`0 0 ${sheet.page_width_pts} ${sheet.page_height_pts}`}
                  preserveAspectRatio="none"
                >
                  {sheet.lots.map((lot) => (
                    <polygon
                      key={lot.number}
                      points={ringToPoints(lot.ring)}
                      fill={shading[lot.source].fill}
                      stroke={shading[lot.source].stroke}
                      strokeWidth={1.2}
                      vectorEffect="non-scaling-stroke"
                    >
                      <title>{`Lot ${lot.number} — ${lot.source}${lot.measured ? ', measured' : ', not measured'}`}</title>
                    </polygon>
                  ))}
                </svg>
              </div>
            </div>

            <footer className="w-plan-preview-foot">
              <div className="w-plan-preview-counts">
                <p className="w-plan-preview-sheet-sum">
                  <strong>{sheet.counts.recovered}</strong> lots recovered from this sheet
                  {' — '}{sheet.counts.traced} traced from the drawing,{' '}
                  {sheet.counts.rebuilt} rebuilt from stated dimensions,{' '}
                  {sheet.counts.measured} measured.
                </p>
                {sheet.counts.recovered === 0 && (
                  <p className="w-plan-preview-warn">
                    Nothing was recovered from this sheet. It carries lot labels, so it is a lot
                    sheet — the geometry did not come back. Draping it will place nothing.
                  </p>
                )}
                {totals && (
                  <p className="w-plan-preview-total">
                    Across the plat: <strong>{totals.scheduled}</strong> lots in the schedule,{' '}
                    {totals.recovered} recovered, {totals.measured} measured.
                    {data.unplaced.count > 0 && (
                      <>
                        {' '}<span className="w-plan-preview-warn">
                          {data.unplaced.count} are {data.unplaced.note}.
                        </span>
                      </>
                    )}
                    {!totals.reconciles && (
                      <> <span className="w-plan-preview-warn">
                        These do not add up — {totals.recovered} recovered plus {totals.no_outline}{' '}
                        without an outline is not {totals.scheduled}. Treat every figure here as suspect.
                      </span></>
                    )}
                  </p>
                )}
                {!data.scale_is_round && (
                  <p className="w-plan-preview-warn">
                    The fitted scale is 1in = {data.scale_ft_per_inch}ft, which is not a scale an
                    engineer would have drawn at. That usually means the read found something
                    other than the lots.
                  </p>
                )}
                {data.excluded_sheets.length > 0 && (
                  <details className="w-plan-preview-excluded">
                    <summary>
                      {data.sheets.length} of this plat&apos;s {data.page_count} pages carry lots;{' '}
                      {data.excluded_sheets.length} were not examined
                    </summary>
                    <ul>
                      {data.excluded_sheets.map((e) => (
                        <li key={e.pdf_page}>
                          <strong>{e.sheet_label}</strong> — {e.reason}
                        </li>
                      ))}
                    </ul>
                    <p>If a sheet you expected is missing, that detection is why.</p>
                  </details>
                )}
              </div>
              <div className="w-plan-preview-actions">
                {sheet.already_draped && (
                  <span className="w-plan-preview-dim">This sheet has already been draped.</span>
                )}
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => void handleDrape()}
                  disabled={!images[sheet.pdf_page]}
                >
                  {sheet.already_draped ? 'Re-drape' : 'Drape'}
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
