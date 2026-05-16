/**
 * FilePreviewer — shared types and mime-type → renderer dispatch.
 *
 * Phase 1 of LSCMD-DMSPREV-IMPL-0516-DV. Renderers covered:
 *   - pdf     → PdfPreview      (Adobe PDF Embed)
 *   - xlsx    → XlsxPreview     (SheetJS, read-only)
 *   - image   → image renderer  (handled inline in FilePreviewer)
 *   - other   → UnsupportedPreview (download fallback card)
 *
 * Phases 2–4 will add docx, text, and a modal lightbox + Landscaper
 * source-citation jumping (which is why FilePreviewerProps already
 * carries initialPage + searchTerm even though Phase 1 ignores them).
 */

export type PreviewRenderer = 'pdf' | 'xlsx' | 'image' | 'unsupported';

export type PreviewVariant = 'inline' | 'modal';

export interface FilePreviewerProps {
  /** Public URL of the file. UploadThing URLs work directly with Adobe Embed and SheetJS fetch. */
  fileUrl: string;
  /** MIME type as reported by core_doc.mime_type. May be null/empty or a generic 'application/octet-stream' — extension fallback in resolveRenderer handles that. */
  mimeType?: string | null;
  /** Original filename — used for extension fallback when mimeType is missing or generic, and as a display label. */
  filename?: string | null;
  /** Layout variant. 'inline' = renders into parent container with parent-controlled sizing. 'modal' = reserved for Phase 4 lightbox; treated as inline in Phase 1. */
  variant?: PreviewVariant;
  /** Container height in pixels. Used for inline variant. PDF iframe + xlsx table both honor this. Defaults to 320 to match .w-doc-detail-preview-frame in wrapper.css. */
  height?: number;
  /** Phase 3 hook — page number to jump to on load. PDF only. Ignored if unsupported by the active renderer. */
  initialPage?: number;
  /** Phase 3 hook — term to search for on load. PDF only. */
  searchTerm?: string;
  /** Optional error callback — invoked when a renderer fails to load the file. Phase 1 surfaces errors visually via PreviewError; this callback lets the parent log or analytics. */
  onError?: (error: Error) => void;
  /** Optional close callback — reserved for modal variant. */
  onClose?: () => void;
}

/**
 * Resolve a mime type + filename to the active renderer.
 *
 * Heuristic: try mime type first (case-insensitive substring match).
 * If mime is missing / generic / unrecognized, fall back to filename
 * extension. Returns 'unsupported' when nothing matches — caller
 * routes to UnsupportedPreview which renders the download card.
 */
export function resolveRenderer(
  mimeType?: string | null,
  filename?: string | null
): PreviewRenderer {
  const mime = (mimeType || '').toLowerCase();
  const ext = (filename || '').toLowerCase().split('.').pop() || '';

  // PDF — most common alpha case
  if (mime.includes('pdf') || ext === 'pdf') return 'pdf';

  // Excel (xlsx / xlsm / xls / xltx). NOT csv — csv has its own future renderer; route to unsupported for Phase 1.
  if (
    mime.includes('spreadsheet') ||
    mime.includes('ms-excel') ||
    mime.includes('excel') ||
    ext === 'xlsx' ||
    ext === 'xlsm' ||
    ext === 'xls' ||
    ext === 'xltx'
  ) {
    return 'xlsx';
  }

  // Images — Phase 1 inherits the existing <img> renderer from DocumentDetailPanel,
  // routed through FilePreviewer for consistency.
  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(ext)
  ) {
    return 'image';
  }

  // Everything else falls back to UnsupportedPreview (download card).
  // Word docs, pptx, text, json, zip, etc. all land here for Phase 1.
  return 'unsupported';
}

/**
 * Human-readable label for the active renderer — used by UnsupportedPreview
 * and PreviewError to tell the user what's going on.
 */
export function rendererLabel(renderer: PreviewRenderer): string {
  switch (renderer) {
    case 'pdf':
      return 'PDF';
    case 'xlsx':
      return 'Excel spreadsheet';
    case 'image':
      return 'Image';
    case 'unsupported':
      return 'File';
  }
}
