'use client';

import { useMemo, useState } from 'react';
import { ComparablesMap } from '../ComparablesMap';
import { AddComparableModal } from '@/components/valuation/AddComparableModal';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { buildSubjectLocationFromProject } from '@/lib/valuation/subjectLocation';
import type { LandComparable, SalesComparable } from '@/types/valuation';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

function buildMapComparables(comparables: LandComparable[]): SalesComparable[] {
  return comparables.map((comp) => ({
    comparable_id: comp.land_comparable_id,
    project_id: comp.project_id,
    comp_number: comp.comp_number ?? 0,
    property_name: comp.address,
    address: comp.address,
    city: comp.city,
    state: comp.state,
    zip: comp.zip,
    sale_date: comp.sale_date,
    sale_price: comp.sale_price,
    price_per_unit: comp.price_per_sf,
    price_per_sf: comp.price_per_sf,
    year_built: null,
    units: null,
    building_sf: comp.land_area_sf,
    cap_rate: null,
    grm: null,
    distance_from_subject: null,
    latitude: comp.latitude,
    longitude: comp.longitude,
    unit_mix: null,
    notes: comp.notes,
    adjustments: [],
    ai_suggestions: [],
    adjusted_price_per_unit: comp.price_per_sf,
    total_adjustment_pct: 0,
    created_at: comp.created_at,
    updated_at: comp.updated_at,
  }));
}

interface LandValueSectionProps {
  comparables: LandComparable[];
  loading: boolean;
  onRefresh?: () => void;
  projectId: number;
}

export function LandValueSection({ comparables, loading, onRefresh, projectId }: LandValueSectionProps) {
  const { activeProject } = useProjectContext();
  const subjectLocation = useMemo(
    () => buildSubjectLocationFromProject(activeProject),
    [activeProject]
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const mapComparables = buildMapComparables(comparables);
  const hasEntries = comparables.length > 0;
  const totalAcres = comparables.reduce((sum, comp) => sum + (comp.land_area_acres ?? 0), 0);
  const avgPricePerSf = comparables.length
    ? comparables.reduce((sum, comp) => sum + (comp.price_per_sf ?? 0), 0) / comparables.length
    : 0;
  const indicatedValue = Math.round(avgPricePerSf * (comparables.reduce((sum, comp) => sum + (comp.land_area_sf ?? 0), 0)));

  return (
    <section className="rounded-lg border p-5" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
            Land Value
          </h3>
          <p className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
            Use the newest land comps to derive the indicated land value.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1 rounded text-sm font-medium"
            style={{
              backgroundColor: 'var(--cui-primary)',
              border: '1px solid transparent',
              color: 'white',
            }}
          >
            Add Land Comparable
          </button>
          <button
            onClick={onRefresh}
            className="px-3 py-1 rounded text-sm"
            style={{
              backgroundColor: 'var(--cui-tertiary-bg)',
              border: '1px solid var(--cui-border-color)',
              color: 'var(--cui-body-color)',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && !hasEntries && (
        <div className="text-center py-10" style={{ color: 'var(--cui-secondary-color)' }}>
          Loading land comparables...
        </div>
      )}

      {!loading && !hasEntries && (
        <div className="text-center py-8" style={{ color: 'var(--cui-secondary-color)' }}>
          No land comparables yet.
        </div>
      )}

      {hasEntries && (
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="overflow-auto rounded border" style={{ borderColor: 'var(--cui-border-color)' }}>
              <table className="w-full text-sm" style={{ color: 'var(--cui-body-color)' }}>
                <thead>
                  <tr>
                    <th className="py-2 px-2 text-left">#</th>
                    <th className="py-2 px-2 text-left">Address</th>
                    <th className="py-2 px-2 text-left">City/State</th>
                    <th className="py-2 px-2 text-left">Sale Date</th>
                    <th className="py-2 px-2 text-right">Sale Price</th>
                    <th className="py-2 px-2 text-right">Land SF</th>
                    <th className="py-2 px-2 text-right">Acres</th>
                    <th className="py-2 px-2 text-right">$/SF</th>
                    <th className="py-2 px-2 text-right">$/Acre</th>
                    <th className="py-2 px-2 text-left">Zoning</th>
                    <th className="py-2 px-2 text-left">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {comparables.map((comp) => (
                    <tr key={comp.land_comparable_id}>
                      <td className="py-2 px-2 text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                        {comp.comp_number ?? comp.land_comparable_id}
                      </td>
                      <td className="py-2 px-2 text-sm">{comp.address}</td>
                      <td className="py-2 px-2 text-sm">
                        {[comp.city, comp.state].filter(Boolean).join(', ')}
                      </td>
                      <td className="py-2 px-2 text-sm">{comp.sale_date ?? '—'}</td>
                      <td className="py-2 px-2 text-right">{comp.sale_price ? currencyFormatter.format(comp.sale_price) : '—'}</td>
                      <td className="py-2 px-2 text-right">{comp.land_area_sf ? numberFormatter.format(comp.land_area_sf) : '—'}</td>
                      <td className="py-2 px-2 text-right">{comp.land_area_acres ? numberFormatter.format(comp.land_area_acres) : '—'}</td>
                      <td className="py-2 px-2 text-right">{comp.price_per_sf ? currencyFormatter.format(comp.price_per_sf) : '—'}</td>
                      <td className="py-2 px-2 text-right">{comp.price_per_acre ? currencyFormatter.format(comp.price_per_acre) : '—'}</td>
                      <td className="py-2 px-2 text-sm">{comp.zoning || '—'}</td>
                      <td className="py-2 px-2 text-sm">{comp.source || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="rounded border" style={{ borderColor: 'var(--cui-border-color)', minHeight: '340px' }}>
              <ComparablesMap
                comparables={mapComparables}
                height="360px"
                subjectProperty={
                  mapComparables[0] && mapComparables[0].latitude && mapComparables[0].longitude
                    ? {
                        latitude: mapComparables[0].latitude,
                        longitude: mapComparables[0].longitude,
                        name: mapComparables[0].property_name ?? 'Subject'
                      }
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      )}

      {hasEntries && (
        <div className="mt-4 rounded border p-4" style={{ borderColor: 'var(--cui-border-color)' }}>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase" style={{ color: 'var(--cui-secondary-color)' }}>
                Avg $/SF (adjusted)
              </div>
              <div className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                {currencyFormatter.format(avgPricePerSf)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase" style={{ color: 'var(--cui-secondary-color)' }}>
                Subject Land Acres
              </div>
              <div className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                {numberFormatter.format(totalAcres)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase" style={{ color: 'var(--cui-secondary-color)' }}>
                Indicated Value
              </div>
              <div className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                {currencyFormatter.format(indicatedValue)}
              </div>
            </div>
          </div>
        </div>
      )}
      <AddComparableModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={() => {
          onRefresh?.();
        }}
        projectId={projectId}
        compType="land"
        subjectLocation={subjectLocation}
      />
    </section>
  );
}
