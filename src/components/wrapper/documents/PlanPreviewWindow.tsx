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
 * The sheet is drawn UNDERNEATH the recovered geometry, and that is the point
 * of the window: outlines floating on a dark field can only be checked against
 * a count, while outlines sitting on the plat they came from can be checked
 * against the drawing — a lot in the wrong place, a run that stops early, a
 * shape that is nothing like the block beneath it. An earlier revision dropped
 * the image on the reasoning that the check had been made once; that is not
 * what this window is for, and it goes back. Colour separates how each lot was
 * established, because "we traced this" and "we worked this one out from its
 * neighbours" are different claims and only one of them is the file speaking.
 *
 * The sheets are NOT joined into one plan, deliberately. Nothing in the drawing
 * fixes how they sit relative to one another, and a guessed offset produces a
 * plan that looks entirely plausible and is wrong by a street width.
 *
 * Draping is manual work — trace, pin, verify, once per sheet — so the Drape
 * button lives here, next to the evidence of whether this sheet is worth the
 * effort. It starts the shipped workflow and does not reimplement any of it.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/lib/authHeaders';
import { setPendingPlanExtract } from '@/lib/gis/planExtractBridge';

const DJANGO_API = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface PreviewLot {
  number: number;
  source: 'traced' | 'rebuilt' | 'positional';
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
  counts: { recovered: number; traced: number; rebuilt: number; positional: number; measured: number };
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
    scheduled: number; recovered: number; traced: number; rebuilt: number;
    positional: number; measured: number; no_outline: number; reconciles: boolean;
  };
  assembly: { established: boolean; reason: string };
  refusals: { lots: number[]; reason: string }[];
  refusal_summary?: {
    still_refused: number;
    recovered_after_refusal: number;
    never_attempted: number;
    never_attempted_lots: number[];
    attempts: number;
  };
  unplaced: { count: number; note: string; lot_numbers: number[] };
}

/** How a lot was established, said in words rather than in jargon. */
const LOT_SOURCE_LABEL: Record<string, string> = {
  traced: 'traced from the drawing',
  rebuilt: 'rebuilt from stated dimensions',
  positional: 'identified by position',
};

function ringToPoints(ring: [number, number][]): string {
  return ring.map(([x, y]) => `${x},${y}`).join(' ');
}

export function PlanPreviewWindow({ docId, onClose }: { docId: string; onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<PreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [imageError, setImageError] = useState<string | null>(null);
  const [sheetImage, setSheetImage] = useState<string | null>(null);
  const [draping, setDraping] = useState(false);
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

  // One sheet at a time, cached by page. The endpoint needs a bearer token so
  // the URL cannot go straight into an <img src>; the bytes are fetched and
  // handed over as an object URL. The same cache serves the Drape hand-off, so
  // pressing Drape after looking at a sheet costs no second download.
  const fetchSheetImage = useCallback(async (pdfPage: number): Promise<Blob | null> => {
    if (blobs.current[pdfPage]) return blobs.current[pdfPage];
    const target = data?.sheets.find((x) => x.pdf_page === pdfPage);
    if (!target) return null;
    const res = await fetch(`${DJANGO_API}${target.image_url}`, { headers: getAuthHeaders() });
    if (!res.ok) return null;
    const blob = await res.blob();
    blobs.current[pdfPage] = blob;
    return blob;
  }, [data]);

  useEffect(() => () => { objectUrls.current.forEach(URL.revokeObjectURL); }, []);

  // Load the picture of whichever sheet is on screen. Failure is not fatal —
  // the geometry still renders on its own, with a line saying the drawing
  // could not be fetched, because a preview that shows nothing at all when the
  // renderer hiccups is worse than one that shows the outlines unbacked.
  useEffect(() => {
    if (!sheet) return;
    let live = true;
    setSheetImage(null);
    setImageError(null);
    (async () => {
      const blob = await fetchSheetImage(sheet.pdf_page);
      if (!live) return;
      if (!blob) {
        setImageError('This sheet could not be rendered, so the outlines are shown on their own.');
        return;
      }
      const url = URL.createObjectURL(blob);
      objectUrls.current.push(url);
      setSheetImage(url);
    })();
    return () => { live = false; };
  }, [sheet, fetchSheetImage]);

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
    setDraping(true);
    const blob = await fetchSheetImage(sheet.pdf_page);
    setDraping(false);
    if (!blob) {
      setImageError('This sheet could not be rendered, so there is nothing to drape.');
      return;
    }
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
  }, [sheet, data, docId, onClose, router, fetchSheetImage]);

  const totals = data?.totals;


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
              <div
                className={`w-plan-preview-canvas${sheetImage ? ' has-image' : ''}`}
                style={{ width: `${zoom * 100}%` }}
              >
                {/* The sheet itself, beneath. Both layers are the same page, so
                    the image at its natural aspect and a viewBox in page points
                    line up with nothing scaled by hand — which is exactly why
                    the overlay can be trusted as a check: any misalignment on
                    screen is a misalignment in the geometry, not in the render. */}
                {sheetImage && (
                  // Not next/image: the source is an object URL for bytes this
                  // component fetched with a bearer token, which the optimizer
                  // cannot fetch for itself.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sheetImage} alt={`${sheet.sheet_label} of the drawing`} />
                )}
                <svg
                  className="w-plan-preview-geometry"
                  viewBox={`0 0 ${sheet.page_width_pts} ${sheet.page_height_pts}`}
                  role="img"
                  aria-label={`Recovered lot geometry for ${sheet.sheet_label}`}
                >
                  {sheet.lots.map((lot) => (
                    <polygon
                      key={lot.number}
                      points={ringToPoints(lot.ring)}
                      className={`w-plan-lot is-${lot.source}`}
                      vectorEffect="non-scaling-stroke"
                    >
                      <title>
                        {`Lot ${lot.number} — ${LOT_SOURCE_LABEL[lot.source]}`}
                        {lot.measured ? ', measured' : ', not measured'}
                      </title>
                    </polygon>
                  ))}
                </svg>
                {sheet.lots.length === 0 && (
                  <p className="w-plan-preview-loading">
                    No geometry was recovered from this sheet.
                  </p>
                )}
              </div>
            </div>

            <div className="w-plan-preview-legend">
              {(['traced', 'positional', 'rebuilt'] as const).map((k) => (
                <span key={k} className="w-plan-legend-item">
                  <i className={`w-plan-swatch is-${k}`} />
                  {LOT_SOURCE_LABEL[k]}
                  {sheet.counts[k] > 0 && <em> · {sheet.counts[k]}</em>}
                </span>
              ))}
            </div>

            <footer className="w-plan-preview-foot">
              <div className="w-plan-preview-counts">
                <p className="w-plan-preview-sheet-sum">
                  <strong>{sheet.counts.recovered}</strong> lots recovered from this sheet
                  {' — '}{sheet.counts.traced} traced from the drawing,{' '}
                  {sheet.counts.positional} identified by position,{' '}
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
                {!data.assembly.established && (
                  <p className="w-plan-preview-warn">{data.assembly.reason}</p>
                )}
                {(data.refusals.length > 0 || (data.refusal_summary?.never_attempted ?? 0) > 0) && (
                  <details className="w-plan-preview-excluded">
                    {/* The count here is the OUTCOME, not the number of times a
                        pass declined something. Summing the attempt log said 60
                        on this plat: the same lot is appended once per failed
                        try, and 23 of the lots in it were established later by
                        another pass. Neither is a missing lot, and a number
                        larger than the 38 without an outline sends the reader
                        looking for lots that are not lost. */}
                    <summary>
                      Of the {data.unplaced.count} with no outline,{' '}
                      {data.refusal_summary?.still_refused
                        ?? data.refusals.reduce((n, r) => n + r.lots.length, 0)}{' '}
                      were refused rather than guessed at
                      {(data.refusal_summary?.never_attempted ?? 0) > 0 && (
                        <> and {data.refusal_summary?.never_attempted} were never reached</>
                      )}
                    </summary>
                    {(data.refusal_summary?.recovered_after_refusal ?? 0) > 0 && (
                      <p>
                        A further {data.refusal_summary?.recovered_after_refusal} were declined by
                        one pass and established by a later one, so they are recovered and are not
                        counted here.
                      </p>
                    )}
                    <ul>
                      {/* Keyed by position, not by the lots named.
                          The same lot can legitimately be refused twice for
                          two different reasons — lot 435 is refused once by
                          the naming pass and once by the outline pass — so a
                          key built from the lot numbers collides, and React
                          drops one of the two rows. Losing a refusal is worse
                          than losing an ordinary row: this list is the record
                          of what the reader declined to guess at, and a reason
                          silently missing from it reads as a lot that was
                          never in question. */}
                      {data.refusals.slice(0, 40).map((r, i) => (
                        <li key={`${i}-${r.lots.join(',')}`}>
                          <strong>{r.lots.join(', ')}</strong> — {r.reason}
                        </li>
                      ))}
                      {(data.refusal_summary?.never_attempted_lots?.length ?? 0) > 0 && (
                        <li>
                          <strong>
                            {data.refusal_summary?.never_attempted_lots.slice(0, 40).join(', ')}
                          </strong>
                          {' — never reached: no pass declined these with a reason, so nothing has '}
                          an opinion about them yet.
                        </li>
                      )}
                    </ul>
                  </details>
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
                  disabled={draping}
                >
                  {draping ? 'Preparing…' : sheet.already_draped ? 'Re-drape' : 'Drape'}
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
