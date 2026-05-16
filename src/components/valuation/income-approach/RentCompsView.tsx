'use client';

/**
 * RentCompsView Component
 *
 * Renders the Rent Comps pill view within Income Approach.
 * Layout mirrors the former Market Comps tab from PropertyTab:
 *   - LocationIntelligenceCard (collapsible map with demographics, rings, layers)
 *   - CCard with "Comparable Rentals" header, Expand All / Collapse All
 *     - Left panel: expandable property cards with unit-type detail tables
 *     - Right panel: CompetitiveMarketCharts scatter chart
 *   - Landscaper Analysis section below the card
 *
 * Session: QV17 — Income Approach Redesign
 * @created 2026-03-15
 * @updated 2026-03-16 — Restored LocationIntelligenceCard, tightened padding
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronRight, MapPin, Calendar, Building2, Plus, Pencil } from 'lucide-react';
import { CompetitiveMarketCharts, type PropertyColorMap } from '@/components/property/CompetitiveMarketCharts';
import { RentCompDetailModal } from './RentCompDetailModal';

import { getAuthHeaders } from '@/lib/authHeaders';
// Dynamic import to avoid SSR issues with MapLibre GL
const LocationIntelligenceCard = dynamic(
  () => import('@/app/projects/[projectId]/components/tabs/LocationIntelligenceCard'),
  { ssr: false }
);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RentalComparable {
  comparable_id: number;
  property_name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  year_built?: number;
  total_units?: number;
  unit_type?: string;
  bedrooms: number;
  bathrooms: number;
  avg_sqft: number;
  asking_rent: number;
  effective_rent?: number;
  distance_miles?: number;
  concessions?: string;
  amenities?: string;
  notes?: string;
}

interface FloorPlan {
  id: string;
  name: string;
  bedrooms: number;
  bathrooms?: number;
  sqft: number;
  marketRent: number;
}

interface PropertyGroup {
  propertyName: string;
  address?: string;
  distance?: number;
  yearBuilt?: number;
  totalUnits?: number;
  unitTypes: RentalComparable[];
  avgRent: number;
  rentRange: { min: number; max: number };
}

interface RentCompsViewProps {
  projectId: number;
  projectName?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatCurrency(val: number | string | undefined | null): string {
  if (val == null) return '—';
  const num = typeof val === 'string' ? Number(val) : val;
  if (!Number.isFinite(num) || num === 0) return '—';
  return `$${Math.round(num).toLocaleString()}`;
}

function formatNumber(val: number | string | undefined | null): string {
  if (val == null) return '—';
  const num = typeof val === 'string' ? Number(val) : val;
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function RentCompsView({ projectId, projectName, latitude, longitude }: RentCompsViewProps) {
  const [comparables, setComparables] = useState<RentalComparable[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [highlightedProperty, setHighlightedProperty] = useState<string | null>(null);
  const [propertyColors, setPropertyColors] = useState<PropertyColorMap>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompId, setEditingCompId] = useState<number | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Fetch data ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [compsRes, floorPlansRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/rental-comparables`, { headers: getAuthHeaders() }),
          fetch(`/api/projects/${projectId}/floor-plans`, { headers: getAuthHeaders() }).catch(() => null),
        ]);

        if (compsRes.ok) {
          const compsData = await compsRes.json();
          setComparables(compsData.data || []);
        }

        if (floorPlansRes?.ok) {
          const fpData = await floorPlansRes.json();
          setFloorPlans(
            (fpData.data || []).map((fp: any) => ({
              id: String(fp.unit_type_id || fp.id),
              name: fp.name || fp.unit_type_name,
              bedrooms: Number(fp.bedrooms) || 0,
              bathrooms: Number(fp.bathrooms) || 1,
              sqft: Number(fp.avg_sqft || fp.sqft) || 0,
              marketRent: Number(fp.market_rent || fp.asking_rent) || 0,
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching rent comps:', err);
        setError(err instanceof Error ? err.message : 'Failed to load rent comps');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [projectId, refreshKey]);

  // ── Group comparables by property ──────────────────────────────────────
  const comparablesByProperty = useMemo<PropertyGroup[]>(() => {
    const grouped = new Map<string, RentalComparable[]>();
    comparables.forEach((comp) => {
      const key = comp.property_name;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(comp);
    });
    // Sort each group by bedrooms
    grouped.forEach((comps) => comps.sort((a, b) => a.bedrooms - b.bedrooms));

    return Array.from(grouped.entries())
      .map(([name, comps]) => {
        const validRentComps = comps.filter((c) => {
          const rent = Number(c.asking_rent);
          return Number.isFinite(rent) && rent > 0;
        });
        const avgRent =
          validRentComps.length > 0
            ? Math.round(validRentComps.reduce((s, c) => s + Number(c.asking_rent), 0) / validRentComps.length)
            : 0;
        const rentRange =
          validRentComps.length > 0
            ? {
                min: Math.min(...validRentComps.map((c) => Number(c.asking_rent))),
                max: Math.max(...validRentComps.map((c) => Number(c.asking_rent))),
              }
            : { min: 0, max: 0 };

        return {
          propertyName: name,
          address: comps[0]?.address,
          distance: comps[0]?.distance_miles,
          yearBuilt: comps[0]?.year_built,
          totalUnits: comps[0]?.total_units,
          unitTypes: comps,
          avgRent,
          rentRange,
        };
      })
      .sort((a, b) => (a.distance || 999) - (b.distance || 999));
  }, [comparables]);

  // ── Interaction handlers ───────────────────────────────────────────────
  const handlePropertyClick = useCallback((propertyName: string) => {
    setHighlightedProperty((prev) => (prev === propertyName ? null : propertyName));
  }, []);

  const handleColorsAssigned = useCallback((colors: PropertyColorMap) => {
    setPropertyColors(colors);
  }, []);

  const toggleProperty = useCallback((propertyName: string) => {
    setExpandedProperties((prev) => {
      const next = new Set(prev);
      if (next.has(propertyName)) next.delete(propertyName);
      else next.add(propertyName);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedProperties(new Set(comparablesByProperty.map((p) => p.propertyName)));
  }, [comparablesByProperty]);

  const collapseAll = useCallback(() => {
    setExpandedProperties(new Set());
  }, []);

  const openAddModal = useCallback(() => {
    setEditingCompId(undefined);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((compId: number) => {
    setEditingCompId(compId);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingCompId(undefined);
  }, []);

  const handleModalSaved = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // ── Loading / Error ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--cui-secondary-color)' }}>
        <div
          style={{
            display: 'inline-block',
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '9999px',
            borderBottom: '2px solid var(--cui-primary)',
            animation: 'spin 1s linear infinite',
            marginBottom: '0.75rem',
          }}
        />
        <p style={{ fontSize: '0.875rem' }}>Loading rent comps...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cui-danger)' }}>
        <p>{error}</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {/* ── Location Intelligence Map (collapsible, matches Market Comps) ── */}
      <LocationIntelligenceCard
        projectId={projectId}
        projectName={projectName || 'Subject Property'}
        latitude={latitude}
        longitude={longitude}
        rentalComparables={comparables}
        comparableColors={propertyColors}
      />

      {/* ── Main CCard: Comparable Rentals ──────────────────────────────── */}
      <div
        style={{
          overflow: 'hidden',
          backgroundColor: 'var(--cui-card-bg)',
          border: '1px solid var(--cui-border-color)',
          borderRadius: 'var(--cui-border-radius, 0.375rem)',
        }}
      >
        {/* Card Header */}
        <div
          className="d-flex align-items-center justify-content-between"
          style={{
            padding: '0.375rem 0.75rem',
            backgroundColor: 'var(--surface-card-header)',
            borderBottom: '1px solid var(--cui-border-color)',
          }}
        >
          <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
            <h3 style={{ color: 'var(--cui-body-color)', fontSize: '0.9375rem', margin: 0, fontWeight: 600 }}>
              Comparable Rentals
            </h3>
            <span
              style={{
                fontSize: '0.6875rem',
                padding: '0.0625rem 0.375rem',
                borderRadius: '999px',
                backgroundColor: 'var(--cui-info-bg)',
                color: 'var(--cui-info)',
                border: '1px solid var(--cui-info)',
              }}
            >
              {comparablesByProperty.length} properties &bull; {comparables.length} unit types
            </span>
          </div>
          <div className="d-flex align-items-center" style={{ gap: '0.375rem' }}>
            <button
              onClick={openAddModal}
              style={{
                fontSize: '0.6875rem',
                padding: '0.1875rem 0.5rem',
                borderRadius: '0.25rem',
                color: 'var(--cui-white)',
                backgroundColor: 'var(--cui-primary)',
                border: '1px solid var(--cui-primary)',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Plus size={12} /> Add Comp
            </button>
            <button
              onClick={expandAll}
              style={{
                fontSize: '0.6875rem',
                padding: '0.1875rem 0.375rem',
                borderRadius: '0.25rem',
                color: 'var(--cui-secondary-color)',
                backgroundColor: 'transparent',
                border: '1px solid var(--cui-border-color)',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              style={{
                fontSize: '0.6875rem',
                padding: '0.1875rem 0.375rem',
                borderRadius: '0.25rem',
                color: 'var(--cui-secondary-color)',
                backgroundColor: 'transparent',
                border: '1px solid var(--cui-border-color)',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Card Body — tighter padding */}
        <div className="d-flex" style={{ backgroundColor: 'var(--cui-card-bg)', gap: '0.75rem', padding: '0.625rem', alignItems: 'stretch' }}>
          {/* ── Left: Collapsible Property Groups ───────────────────────── */}
          <div
            style={{
              display: 'grid',
              gap: '0.125rem',
              paddingRight: '0.25rem',
              flex: '0 0 50%',
              alignContent: 'start',
              maxHeight: '650px',
              overflowY: 'auto',
            }}
          >
            {comparablesByProperty.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2rem 0',
                  fontSize: '0.875rem',
                  color: 'var(--cui-secondary-color)',
                }}
              >
                <p>No rental comparables available.</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Ask Landscaper to extract comps from your OM.
                </p>
                <button
                  onClick={openAddModal}
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '0.5rem' }}
                >
                  <Plus size={14} style={{ marginRight: '0.25rem' }} /> Add Comparable
                </button>
              </div>
            ) : (
              comparablesByProperty.map((property) => {
                const isExpanded = expandedProperties.has(property.propertyName);
                const isHighlighted = highlightedProperty === property.propertyName;
                const color = propertyColors[property.propertyName];
                // Filter out blank/empty floorplan rows
                const unitTypeRows = property.unitTypes.filter((u) => {
                  const rent = Number(u.asking_rent);
                  const sqft = Number(u.avg_sqft);
                  const beds = Number(u.bedrooms);
                  // Keep row only if at least one meaningful data point exists
                  return (Number.isFinite(rent) && rent > 0) || (Number.isFinite(sqft) && sqft > 0) || (Number.isFinite(beds) && beds > 0);
                });
                // Skip property entirely if all rows filtered out
                if (unitTypeRows.length === 0) return null;

                return (
                  <div
                    key={property.propertyName}
                    style={{
                      border: `1px solid ${isHighlighted ? (color || 'var(--cui-primary)') : 'var(--cui-border-color)'}`,
                      borderRadius: '0.5rem',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      boxShadow: isHighlighted ? '0 0 0 2px rgba(var(--cui-primary-rgb), 0.25)' : 'none',
                    }}
                  >
                    {/* Property Header */}
                    <button
                      onClick={() => toggleProperty(property.propertyName)}
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        transition: 'background-color 0.15s ease',
                        textAlign: 'left',
                        backgroundColor: 'var(--cui-tertiary-bg)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <div className="d-flex align-items-center" style={{ gap: '0.5rem', minWidth: 0, flex: 1 }}>
                        {isExpanded ? (
                          <ChevronDown size={16} style={{ color: 'var(--cui-secondary-color)', flexShrink: 0 }} />
                        ) : (
                          <ChevronRight size={16} style={{ color: 'var(--cui-secondary-color)', flexShrink: 0 }} />
                        )}
                        {color && (
                          <span
                            style={{
                              width: '0.75rem',
                              height: '0.75rem',
                              borderRadius: '999px',
                              flexShrink: 0,
                              backgroundColor: color,
                            }}
                          />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                            <span
                              style={{
                                color: 'var(--cui-body-color)',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {property.propertyName}
                            </span>
                            <span style={{ color: 'var(--cui-tertiary-color)', fontSize: '0.75rem' }}>
                              ({unitTypeRows.length} types)
                            </span>
                          </div>
                          {property.address && (
                            <div
                              className="d-flex align-items-center"
                              style={{
                                gap: '0.25rem',
                                color: 'var(--cui-secondary-color)',
                                fontSize: '0.75rem',
                              }}
                            >
                              <MapPin size={12} style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {property.address}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        className="d-flex align-items-center"
                        style={{ gap: '0.75rem', flexShrink: 0, fontSize: '0.75rem' }}
                      >
                        {property.yearBuilt && (
                          <span
                            className="d-flex align-items-center"
                            style={{ gap: '0.25rem', color: 'var(--cui-secondary-color)' }}
                          >
                            <Calendar size={12} />
                            {property.yearBuilt}
                          </span>
                        )}
                        {property.totalUnits && (
                          <span
                            className="d-flex align-items-center"
                            style={{ gap: '0.25rem', color: 'var(--cui-secondary-color)' }}
                          >
                            <Building2 size={12} />
                            {property.totalUnits}
                          </span>
                        )}
                        <span style={{ color: 'var(--cui-success)', fontWeight: 500 }}>
                          {property.rentRange.min === property.rentRange.max
                            ? formatCurrency(property.rentRange.min)
                            : `${formatCurrency(property.rentRange.min)} - ${formatCurrency(property.rentRange.max)}`}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Unit Types Table */}
                    {isExpanded && (
                      <div style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderTop: '1px solid var(--cui-border-color)' }}>
                        <table style={{ width: '100%', fontSize: '0.75rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                              <th style={utTh}>Unit Type</th>
                              <th style={{ ...utTh, textAlign: 'center' }}>Bed</th>
                              <th style={{ ...utTh, textAlign: 'center' }}>Bath</th>
                              <th style={{ ...utTh, textAlign: 'center' }}>SF</th>
                              <th style={{ ...utTh, textAlign: 'right' }}>Rent</th>
                              <th style={{ ...utTh, textAlign: 'right' }}>$/SF</th>
                              <th style={{ ...utTh, width: '32px' }} />
                            </tr>
                          </thead>
                          <tbody>
                            {unitTypeRows.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  style={{
                                    padding: '0.5rem 0.75rem',
                                    textAlign: 'center',
                                    color: 'var(--cui-secondary-color)',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  No comparable floorplan rows available.
                                </td>
                              </tr>
                            ) : (
                              unitTypeRows.map((unit, idx) => {
                                const isLastRow = idx === unitTypeRows.length - 1;
                                const askingRent = Number(unit.asking_rent);
                                const avgSqft = Number(unit.avg_sqft);
                                const rentPerSf =
                                  avgSqft > 0 && Number.isFinite(askingRent)
                                    ? `$${(askingRent / avgSqft).toFixed(2)}`
                                    : '—';

                                return (
                                  <tr
                                    key={`${property.propertyName}-${unit.comparable_id}-${idx}`}
                                    style={{
                                      borderBottom: isLastRow ? 'none' : '1px solid var(--cui-border-color-translucent)',
                                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--cui-secondary-bg)',
                                    }}
                                  >
                                    <td style={{ padding: '0.375rem 0.75rem', color: 'var(--cui-body-color)' }}>
                                      {unit.unit_type || `${formatNumber(unit.bedrooms)}BR/${formatNumber(unit.bathrooms)}BA`}
                                    </td>
                                    <td style={utTdCenter}>{formatNumber(unit.bedrooms)}</td>
                                    <td style={utTdCenter}>{formatNumber(unit.bathrooms)}</td>
                                    <td style={utTdCenter}>{formatNumber(unit.avg_sqft)}</td>
                                    <td
                                      style={{
                                        padding: '0.375rem 0.75rem',
                                        textAlign: 'right',
                                        color: 'var(--cui-success)',
                                        fontWeight: 500,
                                      }}
                                    >
                                      {formatCurrency(unit.asking_rent)}
                                    </td>
                                    <td style={{ padding: '0.375rem 0.75rem', textAlign: 'right', color: 'var(--cui-secondary-color)' }}>
                                      {rentPerSf}
                                    </td>
                                    <td style={{ padding: '0.375rem 0.25rem', textAlign: 'center' }}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditModal(unit.comparable_id);
                                        }}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          cursor: 'pointer',
                                          color: 'var(--cui-secondary-color)',
                                          padding: '0.125rem',
                                          borderRadius: '0.25rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                        title="Edit this comp"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ── Right: Scatter Chart ───────────────────────────────────── */}
          <div style={{ flex: '1 1 50%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                flex: '1 1 100%',
                minHeight: '450px',
                backgroundColor: 'var(--cui-tertiary-bg)',
                border: '1px solid var(--cui-border-color)',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              {comparables.length > 0 ? (
                <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
                  <CompetitiveMarketCharts
                    comparables={comparables}
                    floorPlans={floorPlans}
                    subjectPropertyName={projectName || 'Subject Property'}
                    onPropertyClick={handlePropertyClick}
                    onColorsAssigned={handleColorsAssigned}
                    selectedProperty={highlightedProperty}
                  />
                </div>
              ) : (
                <div
                  className="h-100 d-flex align-items-center justify-content-center"
                  style={{ color: 'var(--cui-secondary-color)', width: '100%' }}
                >
                  No chart data available.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Rent Comp Modal ──────────────────────────────────────────────── */}
      <RentCompDetailModal
        projectId={projectId}
        comparableId={editingCompId}
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSaved={handleModalSaved}
      />

      {/* ── Landscaper Analysis ──────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: 'var(--cui-card-bg)',
          border: '1px solid var(--cui-border-color)',
          borderRadius: '0.5rem',
          padding: '0.625rem 0.75rem',
        }}
      >
        <div className="d-flex align-items-start" style={{ gap: '0.5rem' }}>
          <div style={{ flexShrink: 0 }}>
            <svg
              style={{ color: 'var(--cui-primary)', width: '1.25rem', height: '1.25rem' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div className="d-flex align-items-center" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
              <h4 style={{ color: 'var(--cui-body-color)', fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                Landscaper Analysis
              </h4>
              <span style={{ color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}>
                {comparables.length > 0 ? `Based on ${comparables.length} comp units` : ''}
              </span>
            </div>
            <LandscaperInsights comparables={comparables} comparablesByProperty={comparablesByProperty} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Landscaper Insights (self-contained — mirrors PropertyTab implementation)
// ─────────────────────────────────────────────────────────────────────────────

function LandscaperInsights({
  comparables,
  comparablesByProperty,
}: {
  comparables: RentalComparable[];
  comparablesByProperty: PropertyGroup[];
}) {
  const validComparables = comparables.filter((c) => {
    const rent = Number(c.asking_rent);
    return Number.isFinite(rent) && rent > 0;
  });

  if (validComparables.length === 0) {
    return (
      <p style={{ color: 'var(--cui-secondary-color)', fontSize: '0.875rem' }}>
        No rental comparables available. Use Landscaper to extract comp data from your OM or add comparables manually.
      </p>
    );
  }

  const avgCompRent = Math.round(
    validComparables.reduce((sum, c) => sum + Number(c.asking_rent), 0) / validComparables.length
  );
  const minRent = Math.min(...validComparables.map((c) => Number(c.asking_rent)));
  const maxRent = Math.max(...validComparables.map((c) => Number(c.asking_rent)));

  // Group by bedroom count
  const byBedroom = new Map<number, { count: number; avgRent: number }>();
  validComparables.forEach((c) => {
    const rent = Number(c.asking_rent);
    const existing = byBedroom.get(c.bedrooms);
    if (!existing) {
      byBedroom.set(c.bedrooms, { count: 1, avgRent: rent });
    } else {
      existing.avgRent = (existing.avgRent * existing.count + rent) / (existing.count + 1);
      existing.count += 1;
    }
  });

  // Avg $/SF
  const compsWithSqft = validComparables.filter((c) => Number(c.avg_sqft) > 0);
  const avgRentPerSqft =
    compsWithSqft.length > 0
      ? compsWithSqft.reduce((sum, c) => sum + Number(c.asking_rent) / Number(c.avg_sqft), 0) / compsWithSqft.length
      : 0;

  const nearestComp = comparablesByProperty.find((p) => p.distance && p.distance > 0);
  const maxBeds = Math.max(...Array.from(byBedroom.keys()));

  return (
    <div style={{ color: 'var(--cui-body-color)', fontSize: '0.875rem', display: 'grid', gap: '0.5rem' }}>
      <p>
        <span style={{ color: 'var(--cui-primary)', fontWeight: 600 }}>Market Summary:</span>{' '}
        Analyzed {validComparables.length} unit types across {comparablesByProperty.length} properties. Average asking
        rent is <span style={{ fontWeight: 600 }}>{formatCurrency(avgCompRent)}/mo</span> (range:{' '}
        {formatCurrency(minRent)}-{formatCurrency(maxRent)}).
        {avgRentPerSqft > 0 && (
          <>
            {' '}
            Average rent per SF: <span style={{ fontWeight: 600 }}>${avgRentPerSqft.toFixed(2)}/SF</span>.
          </>
        )}
      </p>

      <p>
        <span style={{ color: 'var(--cui-primary)', fontWeight: 600 }}>By Unit Type:</span>{' '}
        {Array.from(byBedroom.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([beds, data]) => (
            <span key={beds}>
              {beds === 0 ? 'Studio' : `${beds}BR`}: {formatCurrency(Math.round(data.avgRent))} avg ({data.count} units)
              {beds < maxBeds ? ' \u00b7 ' : ''}
            </span>
          ))}
      </p>

      {nearestComp && (
        <p>
          <span style={{ color: 'var(--cui-primary)', fontWeight: 600 }}>Nearest Comp:</span>{' '}
          {nearestComp.propertyName} ({nearestComp.distance} mi) —{' '}
          {formatCurrency(nearestComp.rentRange.min)}-{formatCurrency(nearestComp.rentRange.max)}/mo
          {nearestComp.yearBuilt && `, built ${nearestComp.yearBuilt}`}
          {nearestComp.totalUnits && `, ${nearestComp.totalUnits} units`}.
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared styles
// ─────────────────────────────────────────────────────────────────────────────

const utTh: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.375rem 0.75rem',
  fontWeight: 500,
  color: 'var(--cui-secondary-color)',
  minWidth: '80px',
};

const utTdCenter: React.CSSProperties = {
  padding: '0.375rem 0.5rem',
  textAlign: 'center',
  color: 'var(--cui-secondary-color)',
};

export default RentCompsView;
