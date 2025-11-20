'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useProjectContext } from '../ProjectProvider';

// Property type label mapping
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  'MPC': 'Master Planned Community',
  'MULTIFAMILY': 'Multifamily',
  'COMMERCIAL': 'Commercial',
  'OFFICE': 'Office',
  'RETAIL': 'Retail',
  'INDUSTRIAL': 'Industrial',
  'HOTEL': 'Hotel',
  'MIXED_USE': 'Mixed Use'
};

interface ProjectMetrics {
  areas: number;
  phases: number;
  parcels: number;
  totalUnits: number;
  activePhases: number;
  plannedAcreage: number;
}

interface DocumentCount {
  document_count: number;
  total_size_mb: string;
}

export default function HomeOverview() {
  const { activeProject, refreshProjects } = useProjectContext();
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [documentCount, setDocumentCount] = useState<DocumentCount | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    if (!activeProject) return;

    try {
      const response = await fetch(`/api/projects/${activeProject.project_id}/metrics`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Error loading metrics:', err);
    }
  }, [activeProject]);

  const loadDocumentCount = useCallback(async () => {
    if (!activeProject) return;

    try {
      const response = await fetch(`/api/documents/count?project_id=${activeProject.project_id}`);
      if (response.ok) {
        const data = await response.json();
        setDocumentCount(data);
      }
    } catch (err) {
      console.error('Error loading document count:', err);
    }
  }, [activeProject]);

  // Load metrics when active project changes
  useEffect(() => {
    if (activeProject) {
      loadMetrics();
      loadDocumentCount();
    }
  }, [activeProject, loadMetrics, loadDocumentCount]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProject({ ...activeProject });
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProject({});
    setError(null);
  };

  const handleSave = async () => {
    if (!activeProject) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${activeProject.project_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedProject)
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      await response.json();

      // Refresh projects to update context
      await refreshProjects();

      setIsEditing(false);
      setEditedProject({});
    } catch (err) {
      setError('Failed to save changes. Please try again.');
      console.error('Error saving project:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedProject((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No active project selected</p>
          <button
            onClick={refreshProjects}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Load Projects
          </button>
        </div>
      </div>
    );
  };

  const currentProject = isEditing ? editedProject : activeProject;
  const propertyTypeLabel = PROPERTY_TYPE_LABELS[currentProject.project_type_code] || currentProject.project_type_code || 'Unknown';

  return (
    <div className="space-y-6">
      {/* Active Project Tile - Enhanced with location, type, CRUD */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">Active Project</h2>

            {/* Project Name */}
            {isEditing ? (
              <input
                type="text"
                value={currentProject.project_name}
                onChange={(e) => handleFieldChange('project_name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-2xl font-bold mb-2"
              />
            ) : (
              <h3 className="text-2xl font-bold text-white mb-2">
                {currentProject.project_name}
              </h3>
            )}

            {/* Property Type and Template */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Type:</span>
                {isEditing ? (
                  <select
                    value={currentProject.project_type_code || ''}
                    onChange={(e) => handleFieldChange('project_type_code', e.target.value)}
                    className="px-3 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm font-medium focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Type</option>
                    <option value="MPC">Master Planned Community</option>
                    <option value="MULTIFAMILY">Multifamily</option>
                    <option value="COMMERCIAL">Commercial</option>
                    <option value="OFFICE">Office</option>
                    <option value="RETAIL">Retail</option>
                    <option value="INDUSTRIAL">Industrial</option>
                    <option value="HOTEL">Hotel</option>
                    <option value="MIXED_USE">Mixed Use</option>
                  </select>
                ) : (
                  <span className="px-3 py-1 bg-blue-900/30 border border-blue-700 rounded text-blue-300 text-sm font-medium">
                    {propertyTypeLabel}
                  </span>
                )}
              </div>

              {/* Template badge - clickable to open wizard */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Complexity:</span>
                {isEditing ? (
                  <select
                    value={currentProject.complexity_level || 'STANDARD'}
                    onChange={(e) => handleFieldChange('complexity_level', e.target.value)}
                    className="px-3 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm font-medium focus:border-blue-500 focus:outline-none"
                  >
                    <option value="BASIC">Basic</option>
                    <option value="STANDARD">Standard</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="PROFESSIONAL">Professional</option>
                  </select>
                ) : (
                  <button
                    onClick={() => {
                      // Navigate to planning wizard
                      window.dispatchEvent(new CustomEvent('navigateToView', { detail: { view: 'planning' } }));
                    }}
                    className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm hover:bg-gray-600 hover:border-gray-500 transition-colors cursor-pointer"
                    title="Click to change complexity level"
                  >
                    {currentProject.complexity_level || 'Standard'}
                  </button>
                )}
              </div>
            </div>

            {/* Location Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-400">City</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentProject.jurisdiction_city || ''}
                    onChange={(e) => handleFieldChange('jurisdiction_city', e.target.value)}
                    className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm"
                    placeholder="City"
                  />
                ) : (
                  <p className="text-white text-sm">{currentProject.jurisdiction_city || '—'}</p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-400">County</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentProject.jurisdiction_county || ''}
                    onChange={(e) => handleFieldChange('jurisdiction_county', e.target.value)}
                    className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm"
                    placeholder="County"
                  />
                ) : (
                  <p className="text-white text-sm">{currentProject.jurisdiction_county || '—'}</p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-400">State</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentProject.jurisdiction_state || ''}
                    onChange={(e) => handleFieldChange('jurisdiction_state', e.target.value)}
                    className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm"
                    placeholder="State"
                  />
                ) : (
                  <p className="text-white text-sm">{currentProject.jurisdiction_state || '—'}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-gray-400">Description</label>
              {isEditing ? (
                <textarea
                  value={currentProject.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-sm"
                  rows={2}
                  placeholder="Project description"
                />
              ) : (
                <p className="text-gray-300 text-sm">
                  {currentProject.description || 'No description provided'}
                </p>
              )}
            </div>

            {error && (
              <div className="mt-3 px-3 py-2 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Action Chips */}
          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metric Tiles - New Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document Summary Tile */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Documents</h3>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-blue-300 mb-1">
                {documentCount?.document_count || 0}
              </div>
              <div className="text-sm text-gray-400">
                {documentCount?.total_size_mb || '0'} MB total
              </div>
            </div>

            <button
              onClick={() => {
                // Navigate to DMS page Upload tab
                window.location.href = '/dms?tab=upload';
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              title="Upload documents to DMS"
            >
              <i className="ri-add-line mr-2"></i>
              Add Document
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400">
              <i className="ri-information-line mr-1"></i>
              Upload planning docs, market studies, and budgets for AI analysis
            </p>
          </div>
        </div>

        {/* Assumptions Progress Tile - Placeholder */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Analysis Progress</h3>

          {/* Triple Indicator Mockup */}
          <div className="space-y-4">
            {/* Indicator 1: Completion % */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Completion</span>
                <span className="text-2xl font-bold text-white">60%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">27 of 45 assumptions entered</p>
            </div>

            {/* Indicator 2: Confidence Level */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Confidence Level</span>
                <span className="px-2 py-1 bg-yellow-900/30 border border-yellow-700 rounded text-yellow-300 text-sm font-medium">
                  Medium
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">4 critical assumptions missing</p>
            </div>

            {/* Indicator 3: Available Analyses */}
            <div>
              <span className="text-sm text-gray-400">Available Analyses</span>
              <div className="flex items-center gap-4 mt-2">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">3</div>
                  <div className="text-xs text-gray-500">Ready</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-600">2</div>
                  <div className="text-xs text-gray-500">Locked</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400">
              <i className="ri-information-line mr-1"></i>
              Placeholder data - real calculation coming in Phase 2
            </p>
          </div>
        </div>
      </div>

      {/* Phase Snapshot and Top Use Families - Keep existing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phase Snapshot */}
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Phase Snapshot</h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900/60 border border-gray-700/60 rounded-lg p-4">
              <div className="text-3xl font-bold text-emerald-300 mb-1">
                {metrics?.activePhases || 0}
              </div>
              <div className="text-sm text-gray-400">Active Phases</div>
            </div>

            <div className="bg-gray-900/60 border border-gray-700/60 rounded-lg p-4">
              <div className="text-3xl font-bold text-sky-300 mb-1">
                {metrics?.totalUnits || 0}
              </div>
              <div className="text-sm text-gray-400">Total Units</div>
            </div>

            <div className="bg-gray-900/60 border border-gray-700/60 rounded-lg p-4">
              <div className="text-3xl font-bold text-amber-300 mb-1">
                {metrics?.plannedAcreage?.toFixed(1) || '0.0'}
              </div>
              <div className="text-sm text-gray-400">Planned Acres</div>
            </div>
          </div>
        </div>

        {/* Top Use Families */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Use Families</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Single Family</span>
              <span className="text-sm font-semibold text-white">45%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Townhomes</span>
              <span className="text-sm font-semibold text-white">30%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Multifamily</span>
              <span className="text-sm font-semibold text-white">25%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
