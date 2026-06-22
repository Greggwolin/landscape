/**
 * Same-origin proxy for Maricopa County parcel-outline raster tiles.
 *
 * The county ArcGIS tile endpoint
 * (`gis.mcassessor.maricopa.gov/.../ParcelOutline/MapServer/tile/{z}/{y}/{x}`)
 * sends no `Access-Control-Allow-Origin` header, so loading it directly as a
 * MapLibre raster source CORS-fails on every tile — the outline never renders
 * and the console floods with errors (whether the county is up or down). This
 * route fetches the tile bytes server-side and returns them same-origin so the
 * map can render the outline without CORS errors. When the county is down it
 * 502s quietly here instead of CORS-erroring in the browser.
 *
 * Note the axis order: MapLibre requests `{z}/{x}/{y}` but the county service
 * expects `{z}/{y}/{x}`, so we swap x/y when building the upstream URL.
 *
 * Host-whitelisted to `gis.mcassessor.maricopa.gov` to prevent open-proxy use.
 */
import { NextRequest, NextResponse } from 'next/server';

const COUNTY_HOST = 'gis.mcassessor.maricopa.gov';
const COUNTY_TILE_BASE =
  'https://gis.mcassessor.maricopa.gov/arcgis/rest/services/ParcelOutline/MapServer/tile';

type TileParams = { z: string; x: string; y: string };

// Tile indices grow with zoom: at zoom z, x/y range up to 2^z - 1 (5 digits
// by zoom 15, 7 by zoom ~23). Allow up to 7 digits; reject anything else so
// the proxy can't be pointed at arbitrary upstream paths.
const isTileCoord = (value: string) => /^\d{1,7}$/.test(value);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<TileParams> },
) {
  const { z, x, y } = await params;

  if (!isTileCoord(z) || !isTileCoord(x) || !isTileCoord(y)) {
    return NextResponse.json({ error: 'invalid tile coordinates' }, { status: 400 });
  }

  // County service is {z}/{y}/{x}; MapLibre gives us {z}/{x}/{y}.
  const target = `${COUNTY_TILE_BASE}/${z}/${y}/${x}`;

  // Defense-in-depth: confirm we only ever fetch the whitelisted host.
  try {
    if (new URL(target).hostname !== COUNTY_HOST) {
      return NextResponse.json({ error: 'host not allowed' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  try {
    const upstream = await fetch(target, {
      cache: 'no-store',
      // Match the backend fail-fast posture: don't hang the tile pipeline
      // when the county service is slow/down.
      signal: AbortSignal.timeout(6000),
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `upstream ${upstream.status}` },
        { status: 502 },
      );
    }
    const buf = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') || 'image/png';
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Tiles are immutable for a given z/x/y; cache briefly to cut load.
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'tile fetch failed' },
      { status: 502 },
    );
  }
}
