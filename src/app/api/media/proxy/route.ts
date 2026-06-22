/**
 * Same-origin image proxy for extracted-media (R2) URLs.
 *
 * Extracted plan/media images are stored on a public Cloudflare R2 bucket
 * (`pub-*.r2.dev`). Those serve fine as <img> thumbnails, but a browser
 * `fetch()` of them (needed to build a CORS-clean data URL for the
 * click-to-extract canvas) is cross-origin and gets blocked → "failed to
 * fetch". This route fetches the bytes server-side and returns them
 * same-origin so the canvas can read them without taint.
 *
 * Host-whitelisted to `*.r2.dev` to prevent it being used as an open proxy.
 */
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOST_SUFFIX = '.r2.dev';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url');
  if (!raw) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  const hostOk =
    target.protocol === 'https:' &&
    (target.hostname === 'r2.dev' || target.hostname.endsWith(ALLOWED_HOST_SUFFIX));
  if (!hostOk) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), { cache: 'no-store' });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `upstream ${upstream.status}` },
        { status: 502 },
      );
    }
    const buf = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'fetch failed' },
      { status: 502 },
    );
  }
}
