/**
 * overlayImageStore — durable storage + CORS-clean rendering for site-plan drapes.
 *
 * Background (LSCMD-OVERLAY-DURABLE-0622-ot4): draped plan images used to be
 * re-uploaded through the UploadThing `documentUploader` and the overlay's
 * `source_uri` was set to that UploadThing file URL. Those files are not tied to
 * a retained `core_doc`, so the orphan-cleanup sweep deleted them shortly after —
 * leaving saved overlays pointing at a 404 (the "drape vanished" bug). Extracted
 * MEDIA, by contrast, lives durably on Cloudflare R2 and never disappears.
 *
 * This module routes drapes through that SAME durable R2 store (via the Django
 * `overlays/upload-image/` endpoint, which writes to `default_storage`) and wraps
 * R2 URLs through the same-origin proxy for rendering (R2's public bucket is not
 * CORS-enabled, and MapLibre's image source fetches the bytes).
 */

const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// Cloudflare R2 public bucket host (e.g. https://pub-xxxx.r2.dev/...). Matches the
// allow-list in src/app/api/media/proxy/route.ts.
const R2_PUBLIC_URL_RE = /^https:\/\/[^/]*\.r2\.dev\//i;

/**
 * Persist a draped site-plan image to durable media storage (R2) via Django and
 * return its public URL. Replaces the UploadThing document-uploader path whose
 * files were orphan-swept. `authHeaders` is the caller's auth header bag; only
 * the Authorization token is forwarded (the browser sets the multipart boundary,
 * so no Content-Type is sent).
 */
export async function uploadOverlayImageDurable(
  projectId: number | string,
  file: File,
  authHeaders: Record<string, string>,
): Promise<string> {
  const form = new FormData();
  form.append('file', file);

  const headers: Record<string, string> = {};
  if (authHeaders.Authorization) headers.Authorization = authHeaders.Authorization;

  const res = await fetch(
    `${API_BASE}/api/projects/${projectId}/overlays/upload-image/`,
    { method: 'POST', headers, body: form },
  );
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) detail = body.error;
    } catch {
      // non-JSON error body — keep the status code
    }
    throw new Error(`Durable upload failed: ${detail}`);
  }
  const data = await res.json();
  if (!data?.url) throw new Error('Durable upload returned no URL');
  return data.url as string;
}

/**
 * Wrap an overlay image URL for in-browser rendering. R2 public-bucket URLs
 * (`*.r2.dev`) are not CORS-enabled, so MapLibre's image source (which fetches
 * the bytes) is blocked loading them directly — route those through the
 * same-origin `/api/media/proxy`. Non-R2 URLs (legacy UploadThing source_uris on
 * already-saved overlays, dev `/media` paths) pass through unchanged.
 */
export function toRenderableOverlayUrl(url: string): string {
  if (R2_PUBLIC_URL_RE.test(url)) {
    return `/api/media/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}
