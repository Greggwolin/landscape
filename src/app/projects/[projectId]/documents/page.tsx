'use client';

import React from 'react';
import { useParams } from 'next/navigation';

/**
 * Project Documents Page
 *
 * Project-specific DMS (Document Management System) workspace.
 * Filters the global documents view to show only documents for this project.
 */
export default function ProjectDocumentsPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <div className="container-fluid px-4">
      {/* Page Header */}
      <div className="mb-4">
        <h4 className="mb-1">Project Documents</h4>
        <p className="text-muted mb-0">
          Document management for this project (filtered view of global DMS)
        </p>
      </div>

      {/* Info Alert */}
      <div className="alert alert-info">
        <h5><i className="bi bi-info-circle me-2"></i>Project Document Workspace</h5>
        <p className="mb-0">
          This page will display the DMS interface filtered to show only documents associated with this project.
          <br />
          <strong>Features to implement:</strong>
        </p>
        <ul className="mt-2 mb-0">
          <li>Document list filtered by project_id</li>
          <li>Upload, download, organize, and tag documents</li>
          <li>Filter by lifecycle stage (Acquisition, Planning, Development, etc.)</li>
          <li>Document preview panel</li>
          <li>Metadata editing and version history</li>
          <li>Integration with existing global DMS</li>
        </ul>
      </div>

      {/* DMS Interface Placeholder */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-folder2-open me-2"></i>
            Documents for Project #{projectId}
          </h5>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-primary" disabled>
              <i className="bi bi-upload me-2"></i>
              Upload
            </button>
            <button className="btn btn-sm btn-secondary" disabled>
              <i className="bi bi-folder-plus me-2"></i>
              New Folder
            </button>
          </div>
        </div>

        <div className="card-body">
          {/* Lifecycle Stage Filter */}
          <div className="mb-3">
            <label className="form-label small">Filter by Lifecycle Stage:</label>
            <div className="d-flex gap-2 flex-wrap">
              <button className="btn btn-sm btn-outline-primary active">All</button>
              <button className="btn btn-sm btn-outline-info">Acquisition</button>
              <button className="btn btn-sm btn-outline-success">Planning & Engineering</button>
              <button className="btn btn-sm btn-outline-warning">Development</button>
              <button className="btn btn-sm btn-outline-primary">Sales & Marketing</button>
              <button className="btn btn-sm btn-outline-secondary">Project Results</button>
            </div>
          </div>

          {/* Document List Placeholder */}
          <div className="border rounded p-4 text-center bg-light">
            <i className="bi bi-file-earmark-text" style={{ fontSize: '4rem', color: '#ccc' }}></i>
            <h5 className="mt-3 text-muted">Project DMS Coming Soon</h5>
            <p className="text-muted">
              Integration with existing DMS filtered for this project
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mt-4">
        <div className="col-md-4">
          <div className="card border-0 bg-light">
            <div className="card-body">
              <h6 className="card-title">
                <i className="bi bi-search me-2"></i>
                Search Documents
              </h6>
              <p className="small text-muted mb-0">
                Search across all project documents by name, content, or metadata
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 bg-light">
            <div className="card-body">
              <h6 className="card-title">
                <i className="bi bi-tags me-2"></i>
                Document Tags
              </h6>
              <p className="small text-muted mb-0">
                Organize documents with custom tags and categories
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 bg-light">
            <div className="card-body">
              <h6 className="card-title">
                <i className="bi bi-clock-history me-2"></i>
                Version History
              </h6>
              <p className="small text-muted mb-0">
                Track document versions and restore previous revisions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Link to Global DMS */}
      <div className="mt-4">
        <div className="alert alert-secondary">
          <i className="bi bi-box-arrow-up-right me-2"></i>
          <strong>Global Document Library:</strong> To access documents across all projects, visit the{' '}
          <a href="/documents">Global Documents page</a>.
        </div>
      </div>
    </div>
  );
}
