'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMarketCompetitors, useCreateCompetitor, useUpdateCompetitor, useDeleteCompetitor, MarketCompetitiveProject } from '@/hooks/useMarketData';
import { NapkinSfdPricing } from '@/components/napkin/NapkinSfdPricing';
import MarketMapView from '@/app/components/Market/MarketMapView';

export default function MarketAnalysisPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

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
  const analysisStats = React.useMemo(() => {
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
    <div className="app-content">
      {/* Two Column Layout - 50/50 split */}
      <div className="row g-3">
        {/* Left Column - 50% - SFD Pricing */}
        <div className="col-12 col-lg-6">
          <NapkinSfdPricing projectId={projectId} showCompDetails={true} />
        </div>

        {/* Right Column - 50% - Landscaper Analysis */}
        <div className="col-12 col-lg-6">
          <div
            className="position-lg-sticky"
            style={{ top: 'calc(58px + 105px + 2rem)' }}
          >
            <div className="card h-100">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Landscaper Analysis</h5>
              </div>
              <div className="card-body">
                <div
                  className="rounded p-3"
                  style={{
                    backgroundColor: 'var(--cui-tertiary-bg)',
                    border: '1px solid var(--cui-border-color)',
                  }}
                >
                  <div className="d-flex align-items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="bi" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <h6 className="mb-0">Landscaper Analysis</h6>
                        <span className="small text-muted">
                          {analysisStats.totalComps > 0
                            ? `Based on ${analysisStats.totalComps} competitive projects`
                            : 'No competitive projects available yet'}
                        </span>
                      </div>
                      {analysisStats.totalComps === 0 ? (
                        <p className="small text-muted mb-0">
                          Add competitors or sync Zonda data to generate market insights.
                        </p>
                      ) : (
                        <div className="small text-muted">
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Competitive Projects Map + List - 50/50 split */}
      <div className="row g-3 mt-1">
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Competitive Projects Map</h5>
            </div>
            <div className="card-body p-0">
              <MarketMapView
                projectId={projectId}
                competitors={competitors}
                height="640px"
                selectedCompetitorId={selectedCompetitorId}
                onSelectCompetitor={setSelectedCompetitorId}
                onClearSelection={() => setSelectedCompetitorId(null)}
              />
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Competitive Projects</h5>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-primary"
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
                  <i className="bi bi-plus-lg me-1"></i>
                  Add
                </button>
                <button className="btn btn-sm btn-secondary" disabled>
                  <i className="bi bi-robot me-1"></i>
                  Import from Landscaper
                </button>
              </div>
            </div>

            <div className="card-body">
              {/* Competitor Form */}
              {showCompForm && (
                <div className="mb-3 p-3 border rounded">
                  <h6 className="mb-3">{editingComp ? 'Edit' : 'New'} Competitor</h6>

                  <div className="mb-2">
                    <label className="form-label small">Project Name *</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={compForm.comp_name || ''}
                      onChange={(e) => setCompForm({ ...compForm, comp_name: e.target.value })}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label small">Address</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={compForm.comp_address || ''}
                      onChange={(e) => setCompForm({ ...compForm, comp_address: e.target.value })}
                    />
                  </div>

                  <div className="row mb-2">
                    <div className="col-6">
                      <label className="form-label small">Latitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        className="form-control form-control-sm"
                        value={compForm.latitude || ''}
                        onChange={(e) => setCompForm({ ...compForm, latitude: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small">Longitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        className="form-control form-control-sm"
                        value={compForm.longitude || ''}
                        onChange={(e) => setCompForm({ ...compForm, longitude: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small">Total Units</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={compForm.total_units || ''}
                      onChange={(e) => setCompForm({ ...compForm, total_units: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="row mb-2">
                    <div className="col-6">
                      <label className="form-label small">Price Min</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={compForm.price_min || ''}
                        onChange={(e) => setCompForm({ ...compForm, price_min: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small">Price Max</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={compForm.price_max || ''}
                        onChange={(e) => setCompForm({ ...compForm, price_max: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small">Absorption Rate (units/month)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control form-control-sm"
                      value={compForm.absorption_rate_monthly || ''}
                      onChange={(e) => setCompForm({ ...compForm, absorption_rate_monthly: parseFloat(e.target.value) })}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label small">Status</label>
                    <select
                      className="form-select form-select-sm"
                      value={compForm.status || 'selling'}
                      onChange={(e) => setCompForm({ ...compForm, status: e.target.value as 'selling' | 'sold_out' | 'planned' })}
                    >
                      <option value="selling">Selling</option>
                      <option value="sold_out">Sold Out</option>
                      <option value="planned">Planned</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small">Notes</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={compForm.notes || ''}
                      onChange={(e) => setCompForm({ ...compForm, notes: e.target.value })}
                    />
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-success"
                      onClick={handleSaveCompetitor}
                      disabled={createCompetitor.isPending || updateCompetitor.isPending}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        setShowCompForm(false);
                        setEditingComp(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Competitor List */}
              <div className="list-group list-group-flush">
                {loadingComps && <div className="text-center py-3">Loading competitors...</div>}

                {!loadingComps && competitors.length === 0 && (
                  <div className="text-center text-muted py-3 small">
                    No competitors added yet. Click &quot;Add&quot; to create one.
                  </div>
                )}

                {!loadingComps && competitors.length > 0 && (
                  <div
                    className="list-group-item bg-light"
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div
                      className="d-grid align-items-center"
                      style={{
                        gridTemplateColumns: '2fr 1fr 0.9fr 0.7fr 1fr 0.9fr auto',
                        gap: '0.75rem',
                      }}
                    >
                      <span>Project</span>
                      <span>Builder</span>
                      <span>Lot</span>
                      <span className="text-center">Units</span>
                      <span className="text-center">Price Range</span>
                      <span className="text-center">Absorption</span>
                      <span></span>
                    </div>
                  </div>
                )}

                {groupedCompetitors.map((group) => {
                  const isExpanded = expandedMasterPlans.has(group.key);
                  return (
                    <div key={group.key}>
                      <div
                        className="list-group-item py-2 px-2 d-grid align-items-center"
                        style={{
                          gridTemplateColumns: '2fr 1fr 0.9fr 0.7fr 1fr 0.9fr auto',
                          gap: '0.75rem',
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          backgroundColor: 'var(--bs-tertiary-bg)',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleMasterPlan(group.key)}
                      >
                        <div className="d-flex align-items-center gap-2 overflow-hidden" style={{ minWidth: 0 }}>
                          <span className="text-truncate">{group.name}</span>
                          <span className="text-muted fw-normal">({group.competitors.length})</span>
                        </div>
                        <span className="small text-muted text-truncate"></span>
                        <span className="small text-muted text-truncate"></span>
                        <span className="small text-muted text-center">
                          {group.totalUnits ? group.totalUnits.toLocaleString() : '-'}
                        </span>
                        <span className="small text-muted text-center">
                          {(group.priceMin || group.priceMax)
                            ? `${formatShortCurrency(group.priceMin)}-${formatShortCurrency(group.priceMax)}`
                            : '-'}
                        </span>
                        <span className="small text-muted text-center">
                          {group.totalAbsorption !== null ? `${group.totalAbsorption.toFixed(2)}/Mo` : '-'}
                        </span>
                        <span></span>
                      </div>
                      {isExpanded && group.competitors.map((comp) => (
                        <div
                          key={comp.id}
                          className="list-group-item p-2"
                          style={{
                            backgroundColor: comp.id && comp.id === selectedCompetitorId
                              ? 'rgba(13, 110, 253, 0.08)'
                              : undefined
                          }}
                          onClick={() => comp.id && setSelectedCompetitorId(comp.id)}
                        >
                          <div
                            className="d-grid align-items-center"
                            style={{
                              gridTemplateColumns: '2fr 1fr 0.9fr 0.7fr 1fr 0.9fr auto',
                              gap: '0.75rem',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <div
                              className="d-flex align-items-center gap-2 overflow-hidden"
                              style={{ minWidth: 0, paddingLeft: '1rem' }}
                            >
                              <span className="fw-semibold text-truncate small">
                                {getSubdivisionName(comp)}
                              </span>
                            </div>
                            <span className="small text-muted text-truncate">
                              {comp.builder_name || '-'}
                            </span>
                            <span className="small text-muted text-truncate">
                              {getLotLabel(comp)}
                            </span>
                            <span className="small text-muted text-center">
                              {comp.total_units ? `${comp.total_units}` : '-'}
                            </span>
                            <span className="small text-muted text-center">
                              {(comp.price_min || comp.price_max)
                                ? `${formatShortCurrency(comp.price_min)}-${formatShortCurrency(comp.price_max)}`
                                : '-'}
                            </span>
                            <span className="small text-muted text-center">
                              {comp.absorption_rate_monthly
                                ? `${Number(comp.absorption_rate_monthly).toFixed(2)}/Mo`
                                : '-'}
                            </span>
                            <div className="d-flex gap-1">
                              <button
                                className="btn btn-sm btn-link p-0"
                                onClick={() => handleEditCompetitor(comp)}
                                title="Edit"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-link p-0 text-danger"
                                onClick={() => comp.id && handleDeleteCompetitor(comp.id)}
                                title="Delete"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
