'use client';

/**
 * MarketTab Component
 *
 * Renders market research content based on project type:
 * - Land Development: Competitive housing research (Redfin, Zonda), SFD pricing, market map
 * - Income Properties (CRE): Delegates to PropertyTab for rental comps and market assumptions
 *
 * @version 1.0
 * @created 2026-02-02
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useMarketCompetitors, useCreateCompetitor, useUpdateCompetitor, useDeleteCompetitor, MarketCompetitiveProject } from '@/hooks/useMarketData';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';
import { LandscaperIcon } from '@/components/icons/LandscaperIcon';
import MarketMapView from '@/app/components/Market/MarketMapView';
import { isIncomeProperty } from '@/components/projects/tiles/tileConfig';
import PropertyTab from './PropertyTab';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
  project_type?: string;
  property_subtype?: string;
}

interface MarketTabProps {
  project: Project;
}

export default function MarketTab({ project }: MarketTabProps) {
  const projectId = project.project_id;

  // Determine project type using the same fallback chain as other components
  const effectiveProjectType = project.property_subtype
    || project.project_type
    || project.project_type_code;
  const isIncome = isIncomeProperty(effectiveProjectType);

  // For income properties, delegate to PropertyTab with market activeTab
  if (isIncome) {
    return <PropertyTab project={project} activeTab="market" />;
  }

  // For Land Development, render the competitive market research UI
  return <LandDevMarketContent projectId={projectId} />;
}

/**
 * Land Development Market Content
 * Competitive housing research with SFD pricing, market map, and competitor list
 */
function LandDevMarketContent({ projectId }: { projectId: number }) {
  // State
  const [showCompForm, setShowCompForm] = useState(false);
  const [editingComp, setEditingComp] = useState<MarketCompetitiveProject | null>(null);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<number | null>(null);

  // Queries
  const { data: competitors = [], isLoading: loadingComps } = useMarketCompetitors(projectId);

  // Mutations
  const createCompetitor = useCreateCompetitor();
  const updateCompetitor = useUpdateCompetitor();
  const deleteCompetitor = useDeleteCompetitor();

  // Form state for new/edit competitor
  const [compForm, setCompForm] = useState<Partial<MarketCompetitiveProject>>({
    comp_name: '',
    comp_address: '',
    latitude: undefined,
    longitude: undefined,
    total_units: undefined,
    price_min: undefined,
    price_max: undefined,
    absorption_rate_monthly: undefined,
    status: 'selling',
    data_source: 'manual',
    notes: ''
  });

  // Handle competitor form submission
  const handleSaveCompetitor = async () => {
    if (!compForm.comp_name) {
      alert('Project name is required');
      return;
    }

    try {
      if (editingComp?.id) {
        await updateCompetitor.mutateAsync({
          projectId,
          id: editingComp.id,
          data: compForm
        });
      } else {
        await createCompetitor.mutateAsync({
          projectId,
          data: { ...compForm, project: projectId } as MarketCompetitiveProject
        });
      }

      // Reset form
      setCompForm({
        comp_name: '',
        comp_address: '',
        status: 'selling',
        data_source: 'manual',
        notes: ''
      });
      setShowCompForm(false);
      setEditingComp(null);
    } catch (error) {
      console.error('Failed to save competitor:', error);
      alert('Failed to save competitor');
    }
  };

  // Handle competitor deletion
  const handleDeleteCompetitor = async (id: number) => {
    if (!confirm('Are you sure you want to delete this competitor?')) return;

    try {
      await deleteCompetitor.mutateAsync({ projectId, id });
    } catch (error) {
      console.error('Failed to delete competitor:', error);
      alert('Failed to delete competitor');
    }
  };

  // Start editing a competitor
  const handleEditCompetitor = (comp: MarketCompetitiveProject) => {
    setEditingComp(comp);
    setCompForm(comp);
    setShowCompForm(true);
  };

  const formatCurrency = (value: number | string | undefined | null) => {
    if (value === undefined || value === null || value === '') return '-';
    const numericValue = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(numericValue)) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(numericValue);
  };

  const formatShortCurrency = (value: number | string | undefined | null) => {
    if (value === undefined || value === null || value === '') return '-';
    const numericValue = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(numericValue)) return '-';
    if (numericValue >= 1_000_000) {
      return `$${Math.round(numericValue / 1000).toLocaleString()}k`;
    }
    if (numericValue >= 1_000) {
      return `$${Math.round(numericValue / 1000)}k`;
    }
    return `$${Math.round(numericValue)}`;
  };

  const groupedCompetitors = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      name: string;
      competitors: MarketCompetitiveProject[];
      totalUnits: number;
      priceMin: number | null;
      priceMax: number | null;
      totalAbsorption: number | null;
    }>();
    for (const comp of competitors) {
      const key = comp.master_plan_name || '__standalone__';
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          name: comp.master_plan_name || 'Standalone',
          competitors: [],
          totalUnits: 0,
          priceMin: null,
          priceMax: null,
          totalAbsorption: null,
        });
      }
      const group = groups.get(key)!;
      group.competitors.push(comp);
      if (Number.isFinite(Number(comp.total_units))) {
        group.totalUnits += Number(comp.total_units);
      }
      if (Number.isFinite(Number(comp.price_min))) {
        const value = Number(comp.price_min);
        group.priceMin = group.priceMin === null ? value : Math.min(group.priceMin, value);
      }
      if (Number.isFinite(Number(comp.price_max))) {
        const value = Number(comp.price_max);
        group.priceMax = group.priceMax === null ? value : Math.max(group.priceMax, value);
      }
    }
    for (const group of groups.values()) {
      const absorptions = group.competitors
        .map(c => Number(c.absorption_rate_monthly))
        .filter(v => Number.isFinite(v));
      if (absorptions.length > 0) {
        group.totalAbsorption = absorptions.reduce((sum, v) => sum + v, 0);
      }
    }
    return Array.from(groups.entries())
      .sort(([aKey, a], [bKey, b]) => {
        if (aKey === '__standalone__') return 1;
        if (bKey === '__standalone__') return -1;
        return a.name.localeCompare(b.name);
      })
      .map(([, value]) => value);
  }, [competitors]);

  const [expandedMasterPlans, setExpandedMasterPlans] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (expandedMasterPlans.size === 0 && groupedCompetitors.length > 0) {
      setExpandedMasterPlans(new Set(groupedCompetitors.map(group => group.key)));
    }
  }, [expandedMasterPlans.size, groupedCompetitors]);

  useEffect(() => {
    if (!selectedCompetitorId) return;
    const selectedComp = competitors.find(comp => comp.id === selectedCompetitorId);
    if (!selectedComp) return;
    const groupKey = selectedComp.master_plan_name || '__standalone__';
    setExpandedMasterPlans(prev => {
      if (prev.has(groupKey)) return prev;
      const next = new Set(prev);
      next.add(groupKey);
      return next;
    });
  }, [competitors, selectedCompetitorId]);

  const toggleMasterPlan = (key: string) => {
    setExpandedMasterPlans(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getSubdivisionName = (comp: MarketCompetitiveProject) => {
    const masterPlan = comp.master_plan_name;
    const compName = comp.comp_name || '';
    if (!masterPlan) return compName;
    if (compName.toLowerCase().startsWith(masterPlan.toLowerCase())) {
      const trimmed = compName.slice(masterPlan.length).trim();
      return trimmed.replace(/^[-/–—:]+/u, '').trim();
    }
    if (compName.includes('/')) {
      const parts = compName.split('/');
      return parts[parts.length - 1].trim() || compName;
    }
    return compName;
  };

  const getLotLabel = (comp: MarketCompetitiveProject) => {
    const product = comp.products?.find(p =>
      p.lot_dimensions || p.lot_width_ft || p.unit_size_avg_sf || p.unit_size_min_sf || p.unit_size_max_sf
    );
    if (!product) return '-';
    if (product.lot_dimensions) return product.lot_dimensions;
    if (Number.isFinite(Number(product.lot_width_ft))) {
      return `${Number(product.lot_width_ft)}'`;
    }
    if (Number.isFinite(Number(product.unit_size_avg_sf))) {
      return `${Number(product.unit_size_avg_sf).toLocaleString()} SF`;
    }
    const min = Number(product.unit_size_min_sf);
    const max = Number(product.unit_size_max_sf);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return `${min.toLocaleString()}-${max.toLocaleString()} SF`;
    }
    return '-';
  };

  const analysisStats = useMemo(() => {
    const validPrices = competitors.filter(c =>
      Number.isFinite(Number(c.price_min)) || Number.isFinite(Number(c.price_max))
    );
    const priceMinValues = validPrices
      .map(c => Number(c.price_min))
      .filter(v => Number.isFinite(v));
    const priceMaxValues = validPrices
      .map(c => Number(c.price_max))
      .filter(v => Number.isFinite(v));
    const priceLow = priceMinValues.length > 0 ? Math.min(...priceMinValues) : null;
    const priceHigh = priceMaxValues.length > 0 ? Math.max(...priceMaxValues) : null;
    const midpointPrices = validPrices
      .map(c => {
        const min = Number(c.price_min);
        const max = Number(c.price_max);
        if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
        return (min + max) / 2;
      })
      .filter((v): v is number => v !== null);
    const avgMidpoint = midpointPrices.length > 0
      ? Math.round(midpointPrices.reduce((sum, v) => sum + v, 0) / midpointPrices.length)
      : null;

    const absorptions = competitors
      .map(c => Number(c.absorption_rate_monthly))
      .filter(v => Number.isFinite(v));
    const avgAbsorption = absorptions.length > 0
      ? absorptions.reduce((sum, v) => sum + v, 0) / absorptions.length
      : null;

    const totalUnits = competitors
      .map(c => Number(c.total_units))
      .filter(v => Number.isFinite(v))
      .reduce((sum, v) => sum + v, 0);

    return {
      totalComps: competitors.length,
      totalUnits: totalUnits > 0 ? totalUnits : null,
      priceLow,
      priceHigh,
      avgMidpoint,
      avgAbsorption,
    };
  }, [competitors]);

  return (
    <div className="space-y-4">
      {/* Two Column Layout - 50/50 split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-market-row="pricing">
        {/* Left Column - SFD Pricing */}
        <div>
          <CCard>
            <CCardHeader>
              <div className="d-flex align-items-center gap-2">
                <LandscaperIcon size={18} />
                <span className="fw-semibold">SFD Pricing</span>
              </div>
            </CCardHeader>
            <CCardBody>
              <p className="mb-0" style={{ color: 'var(--cui-secondary-color)' }}>
                Napkin pricing has been retired. Use competitive project pricing and market map data below.
              </p>
            </CCardBody>
          </CCard>
        </div>

        {/* Right Column - Landscaper Analysis */}
        <div>
          <CCard className="h-100">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <LandscaperIcon
                  style={{
                    width: '32px',
                    height: '32px',
                    color: 'var(--landscaper-icon-color)',
                    flexShrink: 0
                  }}
                />
                <span className="fw-semibold">Landscaper Analysis</span>
              </div>
            </CCardHeader>
            <CCardBody>
              <div
                className="rounded p-3"
                style={{
                  backgroundColor: 'var(--cui-tertiary-bg)',
                  border: '1px solid var(--cui-border-color)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5" style={{ color: 'var(--cui-warning)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-2">
                      <h6 className="font-semibold m-0" style={{ color: 'var(--cui-body-color)' }}>Market Insights</h6>
                      <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                        {analysisStats.totalComps > 0
                          ? `Based on ${analysisStats.totalComps} competitive projects`
                          : 'No competitive projects available yet'}
                      </span>
                    </div>
                    {analysisStats.totalComps === 0 ? (
                      <p className="text-sm m-0" style={{ color: 'var(--cui-secondary-color)' }}>
                        Add competitors or sync Zonda data to generate market insights.
                      </p>
                    ) : (
                      <div className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                        <div>
                          Market Summary: {analysisStats.totalUnits ? `${analysisStats.totalUnits} total units` : 'Unit counts pending'}.
                          {analysisStats.priceLow !== null && analysisStats.priceHigh !== null
                            ? ` Price range ${formatCurrency(analysisStats.priceLow)} - ${formatCurrency(analysisStats.priceHigh)}.`
                            : ' Price range pending.'}
                          {analysisStats.avgMidpoint !== null
                            ? ` Average list price ${formatCurrency(analysisStats.avgMidpoint)}.`
                            : ''}
                        </div>
                        <div className="mt-2">
                          Absorption: {analysisStats.avgAbsorption !== null
                            ? `${analysisStats.avgAbsorption.toFixed(2)} units/month average`
                            : 'Absorption data pending.'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </div>
      </div>

      {/* Competitive Projects Map + List - 50/50 split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Map */}
        <CCard className="h-100 overflow-hidden">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Competitive Projects Map</span>
          </CCardHeader>
          <CCardBody className="p-3">
            <MarketMapView
              projectId={projectId}
              competitors={competitors}
              height="500px"
              selectedCompetitorId={selectedCompetitorId}
              onSelectCompetitor={setSelectedCompetitorId}
              onClearSelection={() => setSelectedCompetitorId(null)}
            />
          </CCardBody>
        </CCard>

        {/* Competitor List */}
        <CCard className="h-100 overflow-hidden">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Competitive Projects</span>
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 text-sm rounded"
                style={{ backgroundColor: 'var(--cui-primary)', color: 'var(--cui-white)' }}
                onClick={() => {
                  setShowCompForm(!showCompForm);
                  setEditingComp(null);
                  setCompForm({
                    comp_name: '',
                    comp_address: '',
                    status: 'selling',
                    data_source: 'manual',
                    notes: ''
                  });
                }}
              >
                + Add
              </button>
            </div>
          </CCardHeader>

          <CCardBody className="max-h-[500px] overflow-y-auto">
            {/* Competitor Form */}
            {showCompForm && (
              <div className="mb-4 p-4 rounded" style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)' }}>
                <h6 className="font-semibold mb-3" style={{ color: 'var(--cui-body-color)' }}>{editingComp ? 'Edit' : 'New'} Competitor</h6>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--cui-secondary-color)' }}>Project Name *</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded"
                      style={{ backgroundColor: 'var(--cui-input-bg)', border: '1px solid var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                      value={compForm.comp_name || ''}
                      onChange={(e) => setCompForm({ ...compForm, comp_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--cui-secondary-color)' }}>Address</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded"
                      style={{ backgroundColor: 'var(--cui-input-bg)', border: '1px solid var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                      value={compForm.comp_address || ''}
                      onChange={(e) => setCompForm({ ...compForm, comp_address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--cui-secondary-color)' }}>Total Units</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 text-sm rounded"
                        style={{ backgroundColor: 'var(--cui-input-bg)', border: '1px solid var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                        value={compForm.total_units || ''}
                        onChange={(e) => setCompForm({ ...compForm, total_units: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--cui-secondary-color)' }}>Absorption (units/mo)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full px-3 py-2 text-sm rounded"
                        style={{ backgroundColor: 'var(--cui-input-bg)', border: '1px solid var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                        value={compForm.absorption_rate_monthly || ''}
                        onChange={(e) => setCompForm({ ...compForm, absorption_rate_monthly: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--cui-secondary-color)' }}>Price Min</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 text-sm rounded"
                        style={{ backgroundColor: 'var(--cui-input-bg)', border: '1px solid var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                        value={compForm.price_min || ''}
                        onChange={(e) => setCompForm({ ...compForm, price_min: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--cui-secondary-color)' }}>Price Max</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 text-sm rounded"
                        style={{ backgroundColor: 'var(--cui-input-bg)', border: '1px solid var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                        value={compForm.price_max || ''}
                        onChange={(e) => setCompForm({ ...compForm, price_max: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      className="px-4 py-2 text-sm rounded"
                      style={{ backgroundColor: 'var(--cui-success)', color: 'var(--cui-white)' }}
                      onClick={handleSaveCompetitor}
                      disabled={createCompetitor.isPending || updateCompetitor.isPending}
                    >
                      Save
                    </button>
                    <button
                      className="px-4 py-2 text-sm rounded"
                      style={{ backgroundColor: 'var(--cui-tertiary-bg)', color: 'var(--cui-body-color)', border: '1px solid var(--cui-border-color)' }}
                      onClick={() => {
                        setShowCompForm(false);
                        setEditingComp(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Competitor List */}
            {loadingComps && (
              <div className="text-center py-8" style={{ color: 'var(--cui-secondary-color)' }}>
                Loading competitors...
              </div>
            )}

            {!loadingComps && competitors.length === 0 && (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                No competitors added yet. Click &quot;Add&quot; to create one or sync from Zonda.
              </div>
            )}

            {!loadingComps && competitors.length > 0 && (
              <div className="space-y-1">
                {/* Header */}
                <div
                  className="grid items-center px-3 py-2 text-xs font-semibold uppercase tracking-wide rounded"
                  style={{
                    gridTemplateColumns: '2fr 1fr 0.7fr 1fr 0.9fr auto',
                    gap: '0.75rem',
                    backgroundColor: 'var(--cui-tertiary-bg)',
                    color: 'var(--cui-secondary-color)',
                  }}
                >
                  <span>Project</span>
                  <span>Builder</span>
                  <span className="text-center">Units</span>
                  <span className="text-center">Price Range</span>
                  <span className="text-center">Absorption</span>
                  <span></span>
                </div>

                {groupedCompetitors.map((group) => {
                  const isExpanded = expandedMasterPlans.has(group.key);
                  return (
                    <div key={group.key}>
                      {/* Master Plan Header */}
                      <div
                        className="grid items-center px-3 py-2 cursor-pointer rounded"
                        style={{
                          gridTemplateColumns: '2fr 1fr 0.7fr 1fr 0.9fr auto',
                          gap: '0.75rem',
                          backgroundColor: 'var(--cui-secondary-bg)',
                        }}
                        onClick={() => toggleMasterPlan(group.key)}
                      >
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                          <span className="font-semibold truncate" style={{ color: 'var(--cui-body-color)' }}>{group.name}</span>
                          <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>({group.competitors.length})</span>
                        </div>
                        <span></span>
                        <span className="text-sm text-center" style={{ color: 'var(--cui-secondary-color)' }}>
                          {group.totalUnits ? group.totalUnits.toLocaleString() : '-'}
                        </span>
                        <span className="text-sm text-center" style={{ color: 'var(--cui-secondary-color)' }}>
                          {(group.priceMin || group.priceMax)
                            ? `${formatShortCurrency(group.priceMin)}-${formatShortCurrency(group.priceMax)}`
                            : '-'}
                        </span>
                        <span className="text-sm text-center" style={{ color: 'var(--cui-secondary-color)' }}>
                          {group.totalAbsorption !== null ? `${group.totalAbsorption.toFixed(2)}/Mo` : '-'}
                        </span>
                        <span></span>
                      </div>

                      {/* Expanded Competitors */}
                      {isExpanded && group.competitors.map((comp) => (
                        <div
                          key={comp.id}
                          className="grid items-center px-3 py-2 cursor-pointer rounded pl-4"
                          style={{
                            gridTemplateColumns: '2fr 1fr 0.7fr 1fr 0.9fr auto',
                            gap: '0.75rem',
                            backgroundColor: comp.id === selectedCompetitorId ? 'rgba(13, 110, 253, 0.1)' : 'transparent',
                          }}
                          onClick={() => comp.id && setSelectedCompetitorId(comp.id)}
                        >
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--cui-body-color)' }}>
                            {getSubdivisionName(comp)}
                          </span>
                          <span className="text-sm truncate" style={{ color: 'var(--cui-secondary-color)' }}>
                            {comp.builder_name || '-'}
                          </span>
                          <span className="text-sm text-center" style={{ color: 'var(--cui-secondary-color)' }}>
                            {comp.total_units ? `${comp.total_units}` : '-'}
                          </span>
                          <span className="text-sm text-center" style={{ color: 'var(--cui-secondary-color)' }}>
                            {(comp.price_min || comp.price_max)
                              ? `${formatShortCurrency(comp.price_min)}-${formatShortCurrency(comp.price_max)}`
                              : '-'}
                          </span>
                          <span className="text-sm text-center" style={{ color: 'var(--cui-secondary-color)' }}>
                            {comp.absorption_rate_monthly
                              ? `${Number(comp.absorption_rate_monthly).toFixed(2)}/Mo`
                              : '-'}
                          </span>
                          <div className="flex gap-1">
                            <button
                              className="p-1 text-sm rounded"
                              style={{ color: 'var(--cui-primary)' }}
                              onClick={(e) => { e.stopPropagation(); handleEditCompetitor(comp); }}
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              className="p-1 text-sm rounded"
                              style={{ color: 'var(--cui-danger)' }}
                              onClick={(e) => { e.stopPropagation(); comp.id && handleDeleteCompetitor(comp.id); }}
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </CCardBody>
        </CCard>
      </div>
    </div>
  );
}
