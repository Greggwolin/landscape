'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMarketCompetitors, useMarketMacroData, useCreateCompetitor, useUpdateCompetitor, useDeleteCompetitor, useSaveMarketMacroData, MarketCompetitiveProject, MarketMacroData } from '@/hooks/useMarketData';

export default function MarketAnalysisPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  // State
  const [showCompForm, setShowCompForm] = useState(false);
  const [editingComp, setEditingComp] = useState<MarketCompetitiveProject | null>(null);
  const [showLandscaperAnalysis, setShowLandscaperAnalysis] = useState(false);

  // Queries
  const { data: competitors = [], isLoading: loadingComps } = useMarketCompetitors(projectId);
  const { data: macroData = [], isLoading: loadingMacro } = useMarketMacroData(projectId);

  // Mutations
  const createCompetitor = useCreateCompetitor();
  const updateCompetitor = useUpdateCompetitor();
  const deleteCompetitor = useDeleteCompetitor();
  const saveMacroData = useSaveMarketMacroData();

  // Get the most recent macro data entry
  const currentMacroData = macroData.length > 0 ? macroData[0] : null;

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

  // Form state for macro data
  const [macroForm, setMacroForm] = useState<Partial<MarketMacroData>>(
    currentMacroData || {
      population_growth_rate: undefined,
      employment_trend: 'stable',
      household_formation_rate: undefined,
      building_permits_annual: undefined,
      median_income: undefined,
      data_year: new Date().getFullYear(),
      data_source: 'manual',
      notes: ''
    }
  );

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

  // Handle macro data save
  const handleSaveMacroData = async () => {
    try {
      await saveMacroData.mutateAsync({
        projectId,
        id: currentMacroData?.id,
        data: { ...macroForm, project: projectId } as MarketMacroData
      });
      alert('Macro data saved successfully');
    } catch (error) {
      console.error('Failed to save macro data:', error);
      alert('Failed to save macro data');
    }
  };

  // Start editing a competitor
  const handleEditCompetitor = (comp: MarketCompetitiveProject) => {
    setEditingComp(comp);
    setCompForm(comp);
    setShowCompForm(true);
  };

  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'selling':
        return 'bg-success-subtle text-success-emphasis';
      case 'sold_out':
        return 'bg-secondary-subtle text-secondary-emphasis';
      case 'planned':
        return 'bg-info-subtle text-info-emphasis';
      default:
        return 'bg-secondary-subtle text-secondary-emphasis';
    }
  };

  return (
    <div className="row">
      {/* Left Panel - Data Entry */}
      <div className="col-md-4">
        {/* Competitive Projects Section */}
        <div className="card mb-3">
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
                    onChange={(e) => setCompForm({ ...compForm, status: e.target.value as any })}
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
                  No competitors added yet. Click "Add" to create one.
                </div>
              )}

              {competitors.map((comp) => (
                <div key={comp.id} className="list-group-item p-2">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="fw-semibold">{comp.comp_name}</div>
                      <div className="small text-muted">{comp.comp_address}</div>
                      <div className="d-flex gap-2 mt-1">
                        <span className={`badge ${getStatusBadgeClass(comp.status)}`}>
                          {comp.status.replace('_', ' ')}
                        </span>
                        {comp.data_source === 'landscaper_ai' && (
                          <span className="badge bg-info-subtle text-info-emphasis">
                            <i className="bi bi-robot"></i> AI
                          </span>
                        )}
                      </div>
                      {comp.total_units && (
                        <div className="small mt-1">{comp.total_units} units</div>
                      )}
                      {(comp.price_min && comp.price_max) && (
                        <div className="small">
                          ${comp.price_min.toLocaleString()} - ${comp.price_max.toLocaleString()}
                        </div>
                      )}
                      {comp.absorption_rate_monthly && (
                        <div className="small">{comp.absorption_rate_monthly} units/month</div>
                      )}
                    </div>
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
          </div>
        </div>

        {/* Market Macro Data Section */}
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Market Macro Data</h5>
            <button className="btn btn-sm btn-secondary" disabled>
              <i className="bi bi-robot me-1"></i>
              Import from Landscaper
            </button>
          </div>

          <div className="card-body">
            <div className="mb-2">
              <label className="form-label small">Data Year</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={macroForm.data_year || new Date().getFullYear()}
                onChange={(e) => setMacroForm({ ...macroForm, data_year: parseInt(e.target.value) })}
              />
            </div>

            <div className="mb-2">
              <label className="form-label small">Population Growth Rate (%)</label>
              <input
                type="number"
                step="0.1"
                className="form-control form-control-sm"
                value={macroForm.population_growth_rate || ''}
                onChange={(e) => setMacroForm({ ...macroForm, population_growth_rate: parseFloat(e.target.value) })}
              />
            </div>

            <div className="mb-2">
              <label className="form-label small">Employment Trend</label>
              <select
                className="form-select form-select-sm"
                value={macroForm.employment_trend || 'stable'}
                onChange={(e) => setMacroForm({ ...macroForm, employment_trend: e.target.value as any })}
              >
                <option value="growing">Growing</option>
                <option value="stable">Stable</option>
                <option value="declining">Declining</option>
              </select>
            </div>

            <div className="mb-2">
              <label className="form-label small">Household Formation Rate (%)</label>
              <input
                type="number"
                step="0.1"
                className="form-control form-control-sm"
                value={macroForm.household_formation_rate || ''}
                onChange={(e) => setMacroForm({ ...macroForm, household_formation_rate: parseFloat(e.target.value) })}
              />
            </div>

            <div className="mb-2">
              <label className="form-label small">Building Permits (Annual)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={macroForm.building_permits_annual || ''}
                onChange={(e) => setMacroForm({ ...macroForm, building_permits_annual: parseInt(e.target.value) })}
              />
            </div>

            <div className="mb-3">
              <label className="form-label small">Median Income</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={macroForm.median_income || ''}
                onChange={(e) => setMacroForm({ ...macroForm, median_income: parseFloat(e.target.value) })}
              />
            </div>

            <button
              className="btn btn-sm btn-success w-100"
              onClick={handleSaveMacroData}
              disabled={saveMacroData.isPending}
            >
              Save Macro Data
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Map */}
      <div className="col-md-8">
        <div className="card" style={{ height: '600px' }}>
          <div className="card-header">
            <h5 className="mb-0">Competitive Project Map</h5>
          </div>
          <div className="card-body d-flex align-items-center justify-content-center bg-light">
            <div className="text-center text-muted">
              <i className="bi bi-map" style={{ fontSize: '3rem' }}></i>
              <p className="mt-3">Map integration coming soon</p>
              <p className="small">Will display subject property and competitive projects</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel - Landscaper Analysis (Collapsible) */}
      <div className="col-12 mt-3">
        <div className="card">
          <div
            className="card-header d-flex justify-content-between align-items-center"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowLandscaperAnalysis(!showLandscaperAnalysis)}
          >
            <h5 className="mb-0">
              <i className="bi bi-robot me-2"></i>
              Landscaper Market Analysis
            </h5>
            <i className={`bi bi-chevron-${showLandscaperAnalysis ? 'up' : 'down'}`}></i>
          </div>

          {showLandscaperAnalysis && (
            <div className="card-body">
              <div className="alert alert-info">
                <strong>Placeholder:</strong> AI-generated market analysis will appear here.
                <ul className="mt-2 mb-0">
                  <li>Market summary based on competitive data</li>
                  <li>Recommended product mix</li>
                  <li>Estimated absorption rates by product type</li>
                  <li>Competitive positioning analysis</li>
                  <li>Risk flags and opportunity indicators</li>
                </ul>
              </div>

              <button className="btn btn-primary" disabled>
                <i className="bi bi-arrow-repeat me-2"></i>
                Refresh Analysis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
