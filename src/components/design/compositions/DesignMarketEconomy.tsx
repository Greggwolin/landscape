'use client';

/**
 * C3 · Market · Economy — Slice 1 reference composition (2026-10-14).
 *
 * The live Location screen's data, laid out as the reference draws it: six
 * indicator tiles (population, 1-unit building permits, house price index,
 * employment, unemployment, median household income), each listing every
 * geography tier resolved from the project with the latest value and its
 * year-over-year change; then the project's competitive projects.
 *
 * Data and arithmetic are the live screen's own — same endpoints, same
 * geography resolution and YoY helper (imported from LocationSubTab). A tile
 * whose series is missing for a tier simply omits that tier; a tile with no
 * series at all says so rather than showing dashes.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { getAuthHeaders } from '@/lib/authHeaders';
import { useMarketCompetitors } from '@/hooks/useMarketData';
import {
  GEO_LEVEL_ORDER,
  INDICATOR_CONFIG,
  computeYoYChange,
  formatIndicatorValue,
  scaleByUnits,
  type GeoResponse,
  type MarketSeries,
} from '@/app/projects/[projectId]/components/tabs/LocationSubTab';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProject = Record<string, any>;

type Fmt = 'number' | 'currency' | 'percent';
interface TileDef { id: string; label: string; codes: string[]; format: Fmt; badge?: string }

const byId = (id: string) => INDICATOR_CONFIG.find((c) => c.id === id)!;

/** Reference order: Population · Permits · HPI / Employment · Unemployment · Income. */
const TILES: TileDef[] = [
  { ...byId('population') },
  {
    id: 'permits', label: 'Building Permits · 1-unit', format: 'number',
    codes: ['PERMIT1', 'STATE_PERMITS_1U_NSA', 'PERMIT_MSA_1UNIT', 'BPS_ONEUNIT', 'PERMIT_'],
  },
  {
    id: 'hpi', label: 'House Price Index', format: 'number', badge: 'FHFA',
    codes: ['FHFA_HPI_US_SA', 'FHFA_HPI_STATE_SA', 'FHFA_HPI_MSA_SA', 'HPI_MSA', 'FHFA_HPI_'],
  },
  { ...byId('employment') },
  { ...byId('unemployment') },
  { ...byId('income') },
];

/**
 * A rate (unemployment) changes in percentage POINTS year over year — the
 * reference shows "+0.3 pt". The live screen's helper gives the percent change
 * of the rate instead, so the point change is worked out here from the same
 * series: latest value minus the value nearest one year earlier.
 */
function pointChange(data: MarketSeries['data']): { value: number | null; change: string; direction: 'up' | 'down' | 'flat' } {
  const pts = data.filter((d) => d.value != null && Number.isFinite(parseFloat(d.value)));
  if (pts.length === 0) return { value: null, change: '—', direction: 'flat' };
  const last = pts[pts.length - 1];
  const latest = parseFloat(last.value as string);
  const target = new Date(last.date);
  target.setFullYear(target.getFullYear() - 1);
  let prior = pts[0];
  let best = Infinity;
  for (const p of pts) {
    const d = Math.abs(new Date(p.date).getTime() - target.getTime());
    if (d < best) { best = d; prior = p; }
  }
  if (prior === last) return { value: latest, change: '—', direction: 'flat' };
  const diff = latest - parseFloat(prior.value as string);
  const direction = diff > 0.05 ? 'up' : diff < -0.05 ? 'down' : 'flat';
  return { value: latest, change: `${diff > 0 ? '+' : ''}${diff.toFixed(1)} pt`, direction };
}

interface Row { geoName: string; value: string; change: string; direction: 'up' | 'down' | 'flat' }

function buildRows(tile: TileDef, geo: GeoResponse, series: MarketSeries[]): Row[] {
  const rows: Row[] = [];
  // A series already shown at a higher tier is the national/state series
  // attached to a lower geography (seen 2026-10-14: Peoria city carries
  // PAYEMS and FHFA_HPI_US). Showing it again under the city would state the
  // national figure as the city's, so each series code is shown once.
  const used = new Set<string>();
  for (const level of GEO_LEVEL_ORDER) {
    const target = geo.targets.find((t) => t.geo_level === level);
    if (!target) continue;
    let match: MarketSeries | undefined;
    for (const prefix of tile.codes) {
      match = series.find(
        (s) => s.geo_id === target.geo_id && s.data.length > 0 &&
          s.series_code.toUpperCase().startsWith(prefix.toUpperCase()),
      );
      if (match) break;
    }
    if (!match || used.has(match.series_code)) continue;
    used.add(match.series_code);
    // Trailing empty periods (a release not yet filled) would read as "no
    // value"; measure from the latest period that has one.
    const filled = match.data.filter((d) => d.value != null && d.value !== '');
    if (filled.length === 0) continue;
    const yoy = tile.format === 'percent' ? pointChange(filled) : computeYoYChange(filled);
    const scaled = yoy.value !== null ? scaleByUnits(yoy.value, match.units) : null;
    rows.push({
      geoName: target.geo_name,
      value: formatIndicatorValue(scaled, tile.format),
      change: yoy.change,
      direction: yoy.direction,
    });
  }
  return rows;
}

/** The API returns decimals as strings; never trust the declared number type. */
const num = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};
const money = (v: unknown) => {
  const n = num(v);
  return n == null ? '' : n >= 1000 ? `$${Math.round(n / 1000).toLocaleString()}k` : `$${n.toLocaleString()}`;
};

export function DesignMarketEconomy({ project }: { project: AnyProject }) {
  const projectId = Number(project.project_id);
  const city = (project.jurisdiction_city as string) || (project.city as string) || '';
  const state = (project.jurisdiction_state as string) || (project.state as string) || '';
  const [geo, setGeo] = useState<GeoResponse | null>(null);
  const [series, setSeries] = useState<MarketSeries[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: competitors = [] } = useMarketCompetitors(projectId);

  useEffect(() => {
    if (!city || !state) {
      setError('This project has no city and state set, so no geography could be resolved.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const g = await fetch(
          `/api/market/geos?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`,
          { headers: getAuthHeaders() },
        );
        if (!g.ok) throw new Error(g.status === 404 ? `No market geography found for ${city}, ${state}.` : `Geography lookup failed (${g.status}).`);
        const gj: GeoResponse = await g.json();
        if (cancelled) return;
        setGeo(gj);
        const ids = gj.targets.map((t) => t.geo_id).join(',');
        const s = await fetch(`/api/market/series?geo_ids=${encodeURIComponent(ids)}`, { headers: getAuthHeaders() });
        if (s.ok && !cancelled) setSeries(((await s.json()).series || []) as MarketSeries[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Market data failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [city, state]);

  const tiles = useMemo(
    () => (geo ? TILES.map((t) => ({ tile: t, rows: buildRows(t, geo, series) })) : []),
    [geo, series],
  );
  const chain = geo ? GEO_LEVEL_ORDER.map((l) => geo.targets.find((t) => t.geo_level === l)?.geo_name).filter(Boolean).reverse().join(' → ') : '';

  return (
    <div className="ds-page">
      <div className="ds-page-head">
        <span className="ds-tag">geographies resolved from the project — each indicator lists all tiers</span>
        {chain && <span className="ds-muted">{chain}</span>}
        <span className="ds-tag ds-tag-neutral ds-push">Automated · Census / BLS / FRED / FHFA</span>
      </div>

      {loading && <div className="ds-empty">Loading market data…</div>}
      {error && <div className="ds-empty">{error}</div>}

      {!loading && !error && (
        <div className="ds-tile-grid">
          {tiles.map(({ tile, rows }) => (
            <section key={tile.id} className="ds-card">
              <header className="ds-card-head">
                <span>{tile.label}</span>
                {tile.badge && <span className="ds-tag">{tile.badge}</span>}
              </header>
              {rows.length === 0 ? (
                <div className="ds-card-note">No series loaded for this project&apos;s geographies.</div>
              ) : (
                <table className="ds-kv">
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.geoName}>
                        <td>{r.geoName}</td>
                        <td className="num">{r.value}</td>
                        <td className={`num chg chg-${r.direction}`}>{r.change}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ))}
        </div>
      )}

      <section className="ds-card ds-card-wide">
        <header className="ds-card-head">
          <span>Housing &amp; construction · competitive projects</span>
          <span className="ds-muted ds-push">{competitors.length} on this project</span>
        </header>
        {competitors.length === 0 ? (
          <div className="ds-card-note">No competitive projects saved on this project yet. Add them on Housing Market.</div>
        ) : (
          <table className="ds-table">
            <thead>
              <tr>
                <th>Project</th><th>Builder</th><th>Status</th>
                <th className="num">Units</th><th className="num">Price range</th><th className="num">Absorption</th><th>Source</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((c) => (
                <tr key={c.id ?? c.comp_name}>
                  <td>{c.display_name || c.comp_name}</td>
                  <td>{c.builder_name || ''}</td>
                  <td>{c.status === 'sold_out' ? 'Sold out' : c.status === 'planned' ? 'Planned' : 'Selling'}</td>
                  <td className="num">{num(c.total_units)?.toLocaleString() ?? ''}</td>
                  <td className="num">{[money(c.price_min), money(c.price_max)].filter(Boolean).join('–')}</td>
                  <td className="num">{num(c.absorption_rate_monthly) != null ? `${num(c.absorption_rate_monthly)!.toFixed(1)}/mo` : ''}</td>
                  <td><span className="ds-tag">{c.data_source.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default DesignMarketEconomy;
