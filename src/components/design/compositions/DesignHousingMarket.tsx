'use client';

/**
 * C4 · Market · Housing Market — Slice 1 reference composition (land).
 *
 * Left: SFD pricing from the live resale-comp search (the live SfCompsTile).
 * Right: the competitive map (live MarketMapView, same filters as the list)
 * over the competitive projects, grouped by master plan as the reference
 * draws them. The Landscaper analysis card of the live page moves to the
 * Landscaper column, which is the one conversational surface.
 *
 * Adding / editing competitors stays on the live editor, opened in place by
 * "Edit list" so no function is lost while the composition is read-mostly.
 */
import React, { useMemo, useState } from 'react';
import { useMarketCompetitors, type MarketCompetitiveProject } from '@/hooks/useMarketData';
import SfCompsTile from '@/components/analysis/SfCompsTile';
import MarketMapView from '@/app/components/Market/MarketMapView';
import MarketTab from '@/app/projects/[projectId]/components/tabs/MarketTab';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProject = Record<string, any>;

const k = (n?: number | null) => (n == null ? null : `$${Math.round(n / 1000).toLocaleString()}k`);
const range = (lo?: number | null, hi?: number | null) => {
  const a = k(lo); const b = k(hi);
  return a && b ? `${a}–${b}` : a || b || '';
};

interface Group { name: string; rows: MarketCompetitiveProject[]; units: number; lo?: number; hi?: number; abs: number }

function groupByPlan(list: MarketCompetitiveProject[]): Group[] {
  const map = new Map<string, MarketCompetitiveProject[]>();
  for (const c of list) {
    const key = c.master_plan_name || c.display_name || c.comp_name;
    map.set(key, [...(map.get(key) || []), c]);
  }
  return [...map.entries()].map(([name, rows]) => {
    const los = rows.map((r) => r.price_min).filter((v): v is number => v != null);
    const his = rows.map((r) => r.price_max).filter((v): v is number => v != null);
    return {
      name, rows,
      units: rows.reduce((s, r) => s + (r.total_units || 0), 0),
      lo: los.length ? Math.min(...los) : undefined,
      hi: his.length ? Math.max(...his) : undefined,
      abs: rows.reduce((s, r) => s + (r.absorption_rate_monthly || 0), 0),
    };
  }).sort((a, b) => b.units - a.units);
}

export function DesignHousingMarket({ project }: { project: AnyProject }) {
  const projectId = Number(project.project_id);
  const { data: competitors = [] } = useMarketCompetitors(projectId);
  const [filters, setFilters] = useState<{ radiusMiles: number; soldWithinDays: number; minYearBuilt?: number }>({
    radiusMiles: 3, soldWithinDays: 180, minYearBuilt: undefined,
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const groups = useMemo(() => groupByPlan(competitors), [competitors]);

  if (editing) {
    return (
      <div className="ds-page">
        <div className="ds-page-head">
          <button type="button" className="ds-ghost" onClick={() => setEditing(false)}>← Back to Housing Market</button>
          <span className="ds-muted">Editing competitive projects</span>
        </div>
        <MarketTab project={project as never} />
      </div>
    );
  }

  return (
    <div className="ds-page ds-split">
      <section className="ds-card ds-scroll">
        <SfCompsTile projectId={projectId} title="SFD pricing — resale comps" filters={filters} onFiltersChange={setFilters} />
      </section>
      <div className="ds-col">
        <section className="ds-card ds-map-card">
          <header className="ds-card-head">
            <span>Competitive map</span>
            <span className="ds-tag">projects {competitors.length}</span>
          </header>
          <MarketMapView
            projectId={projectId}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            competitors={competitors as any}
            height="300px"
            selectedCompetitorId={selected}
            onSelectCompetitor={setSelected}
            onClearSelection={() => setSelected(null)}
            recentSalesFilters={filters}
          />
        </section>
        <section className="ds-card ds-scroll">
          <header className="ds-card-head">
            <span>Competitive projects</span>
            <button type="button" className="ds-ghost ds-push" onClick={() => setEditing(true)}>+ Add / edit</button>
          </header>
          {groups.length === 0 ? (
            <div className="ds-card-note">No competitive projects saved yet.</div>
          ) : (
            <table className="ds-table">
              <thead>
                <tr><th>Project</th><th>Builder</th><th className="num">Units</th><th className="num">Price range</th><th className="num">Absorption</th></tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <React.Fragment key={g.name}>
                    {g.rows.length > 1 && (
                      <tr className="ds-group-row">
                        <td>▾ {g.name} ({g.rows.length})</td><td />
                        <td className="num">{g.units ? g.units.toLocaleString() : ''}</td>
                        <td className="num">{range(g.lo, g.hi)}</td>
                        <td className="num">{g.abs ? `${g.abs.toFixed(1)}/mo` : ''}</td>
                      </tr>
                    )}
                    {g.rows.map((c) => (
                      <tr
                        key={c.id ?? c.comp_name}
                        className={selected != null && c.id === selected ? 'is-selected' : undefined}
                        onClick={() => c.id != null && setSelected(c.id)}
                      >
                        <td className={g.rows.length > 1 ? 'ds-indent' : undefined}>{c.display_name || c.comp_name}</td>
                        <td>{c.builder_name || ''}</td>
                        <td className="num">{c.total_units != null ? c.total_units.toLocaleString() : ''}</td>
                        <td className="num">{range(c.price_min, c.price_max)}</td>
                        <td className="num">{c.absorption_rate_monthly != null ? `${c.absorption_rate_monthly.toFixed(2)}/mo` : ''}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

export default DesignHousingMarket;
