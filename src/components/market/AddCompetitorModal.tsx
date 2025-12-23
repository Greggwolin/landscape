'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  useZondaSearch,
  useImportZondaProject,
  useCreateCompetitor,
  ZondaProject,
  MarketCompetitiveProject,
} from '@/hooks/useMarketData';
import { useToast } from '@/components/ui/toast';

interface AddCompetitorModalProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
}

type AddMode = 'zonda' | 'manual';

export function AddCompetitorModal({ projectId, isOpen, onClose }: AddCompetitorModalProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<AddMode>('zonda');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZonda, setSelectedZonda] = useState<ZondaProject | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Manual form state
  const [manualForm, setManualForm] = useState<Partial<MarketCompetitiveProject>>({
    comp_name: '',
    builder_name: '',
    comp_address: '',
    city: '',
    zip_code: '',
    latitude: undefined,
    longitude: undefined,
    total_units: undefined,
    price_min: undefined,
    price_max: undefined,
    absorption_rate_monthly: undefined,
    status: 'selling',
    data_source: 'manual',
    notes: '',
  });

  // Hooks
  const zondaSearch = useZondaSearch(searchTerm);
  const importZonda = useImportZondaProject();
  const createCompetitor = useCreateCompetitor();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedZonda(null);
      setShowDropdown(false);
      setMode('zonda');
      setManualForm({
        comp_name: '',
        builder_name: '',
        comp_address: '',
        city: '',
        zip_code: '',
        latitude: undefined,
        longitude: undefined,
        total_units: undefined,
        price_min: undefined,
        price_max: undefined,
        absorption_rate_monthly: undefined,
        status: 'selling',
        data_source: 'manual',
        notes: '',
      });
    }
  }, [isOpen]);

  // Handle Zonda project selection
  const handleSelectZonda = (project: ZondaProject) => {
    setSelectedZonda(project);
    setSearchTerm(project.project_name);
    setShowDropdown(false);
  };

  // Handle import from Zonda
  const handleImportZonda = async () => {
    if (!selectedZonda) return;

    try {
      await importZonda.mutateAsync({
        projectId,
        sourceProjectId: selectedZonda.source_project_id,
      });
      showToast(`Imported "${selectedZonda.project_name}" from Zonda`, 'success');
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to import from Zonda', 'error');
    }
  };

  // Handle manual form submission
  const handleManualSubmit = async () => {
    if (!manualForm.comp_name) {
      showToast('Project name is required', 'error');
      return;
    }

    try {
      await createCompetitor.mutateAsync({
        projectId,
        data: {
          ...manualForm,
          project: projectId,
        } as MarketCompetitiveProject,
      });
      showToast('Competitor added successfully', 'success');
      onClose();
    } catch {
      showToast('Failed to add competitor', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop show"
        style={{ zIndex: 1040 }}
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div
        className="modal show d-block"
        style={{ zIndex: 1050 }}
        tabIndex={-1}
        role="dialog"
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add Competitive Project</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>

            <div className="modal-body">
              {/* Mode tabs */}
              <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                  <button
                    className={`nav-link ${mode === 'zonda' ? 'active' : ''}`}
                    onClick={() => setMode('zonda')}
                  >
                    <i className="bi bi-database me-1"></i>
                    Select from Zonda
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${mode === 'manual' ? 'active' : ''}`}
                    onClick={() => setMode('manual')}
                  >
                    <i className="bi bi-pencil me-1"></i>
                    Manual Entry
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className="nav-link disabled"
                    title="Coming soon"
                    disabled
                  >
                    <i className="bi bi-file-earmark-arrow-up me-1"></i>
                    Document Upload
                  </button>
                </li>
              </ul>

              {/* Zonda search mode */}
              {mode === 'zonda' && (
                <div>
                  <div className="mb-3 position-relative">
                    <label className="form-label">Search Zonda Database</label>
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="form-control"
                      placeholder="Search by project name, builder, or city..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setSelectedZonda(null);
                        setShowDropdown(true);
                      }}
                      onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
                    />

                    {/* Search results dropdown */}
                    {showDropdown && searchTerm.length >= 2 && (
                      <div
                        ref={dropdownRef}
                        className="dropdown-menu show w-100"
                        style={{
                          maxHeight: '300px',
                          overflowY: 'auto',
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 1060,
                        }}
                      >
                        {zondaSearch.isLoading && (
                          <div className="dropdown-item text-muted">
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Searching...
                          </div>
                        )}

                        {!zondaSearch.isLoading && zondaSearch.data?.results.length === 0 && (
                          <div className="dropdown-item text-muted">
                            No projects found. Try manual entry.
                          </div>
                        )}

                        {zondaSearch.data?.results.map((project) => (
                          <button
                            key={project.record_id}
                            className="dropdown-item"
                            onClick={() => handleSelectZonda(project)}
                          >
                            <div className="d-flex justify-content-between">
                              <div>
                                <div className="fw-semibold">{project.project_name}</div>
                                {project.master_plan_name && (
                                  <small className="text-muted d-block">
                                    MPC: {project.master_plan_name}
                                  </small>
                                )}
                                {project.builder_name && (
                                  <small className="text-muted d-block">
                                    {project.builder_name}
                                  </small>
                                )}
                              </div>
                              <div className="text-end small text-muted">
                                {project.city}
                                {project.lot_width_ft && (
                                  <div>{project.lot_width_ft}&apos; lots</div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected project preview */}
                  {selectedZonda && (
                    <div className="alert alert-info">
                      <h6 className="mb-2">
                        <i className="bi bi-check-circle me-1"></i>
                        Selected: {selectedZonda.project_name}
                      </h6>
                      <div className="row small">
                        {selectedZonda.master_plan_name && (
                          <div className="col-6 mb-1">
                            <strong>Master Plan:</strong> {selectedZonda.master_plan_name}
                          </div>
                        )}
                        {selectedZonda.builder_name && (
                          <div className="col-6 mb-1">
                            <strong>Builder:</strong> {selectedZonda.builder_name}
                          </div>
                        )}
                        {selectedZonda.city && (
                          <div className="col-6 mb-1">
                            <strong>City:</strong> {selectedZonda.city}
                          </div>
                        )}
                        {selectedZonda.lot_dimensions && (
                          <div className="col-6 mb-1">
                            <strong>Lot:</strong> {selectedZonda.lot_dimensions}
                          </div>
                        )}
                        {selectedZonda.status && (
                          <div className="col-6 mb-1">
                            <strong>Status:</strong> {selectedZonda.status}
                          </div>
                        )}
                        {selectedZonda.effective_date && (
                          <div className="col-6 mb-1">
                            <strong>Data Date:</strong>{' '}
                            {new Date(selectedZonda.effective_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual entry mode */}
              {mode === 'manual' && (
                <div>
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label small">Project Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={manualForm.comp_name || ''}
                        onChange={(e) => setManualForm({ ...manualForm, comp_name: e.target.value })}
                        placeholder="Subdivision or MPC name"
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small">Builder</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={manualForm.builder_name || ''}
                        onChange={(e) => setManualForm({ ...manualForm, builder_name: e.target.value })}
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small">Status</label>
                      <select
                        className="form-select form-select-sm"
                        value={manualForm.status || 'selling'}
                        onChange={(e) =>
                          setManualForm({
                            ...manualForm,
                            status: e.target.value as 'selling' | 'sold_out' | 'planned',
                          })
                        }
                      >
                        <option value="selling">Selling</option>
                        <option value="sold_out">Sold Out</option>
                        <option value="planned">Planned</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label small">Address</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={manualForm.comp_address || ''}
                        onChange={(e) => setManualForm({ ...manualForm, comp_address: e.target.value })}
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small">City</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={manualForm.city || ''}
                        onChange={(e) => setManualForm({ ...manualForm, city: e.target.value })}
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small">Zip Code</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={manualForm.zip_code || ''}
                        onChange={(e) => setManualForm({ ...manualForm, zip_code: e.target.value })}
                      />
                    </div>

                    <div className="col-4">
                      <label className="form-label small">Total Units</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={manualForm.total_units || ''}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, total_units: parseInt(e.target.value) || undefined })
                        }
                      />
                    </div>

                    <div className="col-4">
                      <label className="form-label small">Price Min</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={manualForm.price_min || ''}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, price_min: parseFloat(e.target.value) || undefined })
                        }
                      />
                    </div>

                    <div className="col-4">
                      <label className="form-label small">Price Max</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={manualForm.price_max || ''}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, price_max: parseFloat(e.target.value) || undefined })
                        }
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small">Absorption (units/mo)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control form-control-sm"
                        value={manualForm.absorption_rate_monthly || ''}
                        onChange={(e) =>
                          setManualForm({
                            ...manualForm,
                            absorption_rate_monthly: parseFloat(e.target.value) || undefined,
                          })
                        }
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small">Latitude / Longitude</label>
                      <div className="input-group input-group-sm">
                        <input
                          type="number"
                          step="0.000001"
                          className="form-control"
                          placeholder="Lat"
                          value={manualForm.latitude || ''}
                          onChange={(e) =>
                            setManualForm({ ...manualForm, latitude: parseFloat(e.target.value) || undefined })
                          }
                        />
                        <input
                          type="number"
                          step="0.000001"
                          className="form-control"
                          placeholder="Lng"
                          value={manualForm.longitude || ''}
                          onChange={(e) =>
                            setManualForm({ ...manualForm, longitude: parseFloat(e.target.value) || undefined })
                          }
                        />
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label small">Notes</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={manualForm.notes || ''}
                        onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>

              {mode === 'zonda' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleImportZonda}
                  disabled={!selectedZonda || importZonda.isPending}
                >
                  {importZonda.isPending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Importing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-download me-1"></i>
                      Import from Zonda
                    </>
                  )}
                </button>
              )}

              {mode === 'manual' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleManualSubmit}
                  disabled={createCompetitor.isPending}
                >
                  {createCompetitor.isPending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-lg me-1"></i>
                      Add Competitor
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
